const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const TICK = 1000 / 60;
const GRAVITY = 0.8;
const SPEED = 4;
const JUMP = 14;

const WORLD = {
  width: 10000,
  height: 2000,
  groundY: 1700
};

const players = {};
const platforms = [];
const mice = [];
const birds = [];
const yarns = [];

/* ---------- PLATFORMS ---------- */
function makePlatforms() {
  platforms.length = 0;
  platforms.push({ x: 0, y: WORLD.groundY, w: WORLD.width, h: 100 });

  for (let i = 0; i < 50; i++) {
    platforms.push({
      x: 300 + i * 180,
      y: WORLD.groundY - 200 - (i % 4) * 120,
      w: 160,
      h: 20
    });
  }
}
makePlatforms();

/* ---------- ENEMIES ---------- */
function spawnMice() {
  mice.length = 0;
  for (let i = 0; i < 8; i++) {
    mice.push({
      id: i,
      x: 400 + Math.random() * (WORLD.width - 800),
      y: WORLD.groundY - 40,
      vx: Math.random() > 0.5 ? 2 : -2,
      vy: 0,
      hp: 120,
      maxHp: 120,
      onGround: false,
      jumpCount: 0
    });
  }
}
spawnMice();

function spawnBirds() {
  birds.length = 0;
  for (let i = 0; i < 10; i++) {
    birds.push({
      id: i,
      x: 400 + Math.random() * (WORLD.width - 800),
      y: WORLD.groundY - 300 - Math.random() * 200,
      vx: Math.random() > 0.5 ? 3 : -3,
      vy: 0,
      hp: 90,
      maxHp: 90
    });
  }
}
spawnBirds();

/* ---------- COLLISION ---------- */
function collide(e, size = 40) {
  e.onGround = false;
  for (const p of platforms) {
    if (
      e.x < p.x + p.w &&
      e.x + size > p.x &&
      e.y < p.y + p.h &&
      e.y + size > p.y &&
      e.vy >= 0
    ) {
      e.y = p.y - size;
      e.vy = 0;
      e.onGround = true;
      e.jumpCount = 0;
    }
  }
}

/* ---------- SOCKET ---------- */
io.on("connection", socket => {
  players[socket.id] = {
    id: socket.id,
    name: "Player",
    x: 100,
    y: WORLD.groundY - 48,
    vx: 0,
    vy: 0,
    hp: 100,
    maxHp: 100,
    jumpCount: 0,
    onGround: false,
    lastJump: false
  };

  socket.on("setName", n => {
    if (players[socket.id]) players[socket.id].name = n;
  });

  socket.on("input", i => {
    const p = players[socket.id];
    if (!p) return;

    p.vx = i.left ? -SPEED : i.right ? SPEED : 0;

    if (i.jump && !p.lastJump && (p.onGround || p.jumpCount < 2)) {
      p.vy = -JUMP;
      p.jumpCount++;
    }
    p.lastJump = i.jump;

    if (i.shoot) {
      yarns.push({
        x: p.x + 24,
        y: p.y + 24,
        vx: Math.cos(i.angle) * 10,
        vy: Math.sin(i.angle) * 10,
        color: i.color,
        owner: socket.id
      });
    }
  });

  socket.on("chat", msg => {
    const p = players[socket.id];
    if (p) io.emit("chat", `${p.name}: ${msg}`);
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

/* ---------- GAME LOOP ---------- */
setInterval(() => {
  // Players
  for (const p of Object.values(players)) {
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    collide(p, 48);

    if (p.hp <= 0 || p.y > WORLD.groundY + 500) {
      p.x = 100;
      p.y = WORLD.groundY - 48;
      p.hp = p.maxHp;
      p.vy = 0;
    }
  }

  // Mice
  for (const m of mice) {
    m.vy += GRAVITY;
    m.x += m.vx;
    m.y += m.vy;

    if (Math.random() < 0.01 && m.jumpCount < 2) {
      m.vy = -12;
      m.jumpCount++;
    }

    collide(m);

    if (m.hp <= 0) {
      m.x = 400 + Math.random() * (WORLD.width - 800);
      m.y = WORLD.groundY - 40;
      m.hp = m.maxHp;
    }
  }

  // Birds
  for (const b of birds) {
    b.x += b.vx;
    if (Math.random() < 0.02) b.vy = 6;
    b.y += b.vy * 0.1;

    if (b.hp <= 0) {
      b.x = 400 + Math.random() * (WORLD.width - 800);
      b.y = WORLD.groundY - 300;
      b.hp = b.maxHp;
    }
  }

  // Yarns
  for (let i = yarns.length - 1; i >= 0; i--) {
    const y = yarns[i];
    y.x += y.vx;
    y.y += y.vy;

    for (const m of mice) {
      if (
        y.x > m.x && y.x < m.x + 40 &&
        y.y > m.y && y.y < m.y + 40
      ) {
        m.hp -= 20;
        yarns.splice(i, 1);
        break;
      }
    }
  }

  io.emit("state", { players, platforms, mice, birds, yarns, world: WORLD });
}, TICK);

server.listen(3000, () => console.log("Server running"));
