const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const TICK = 1000 / 60;
const GRAVITY = 0.8;

const WORLD = { width: 8000, height: 2000, groundY: 1700 };

const players = {};
const platforms = [];
const mice = [];
const birds = [];
const yarns = [];

/* ---------- PLATFORMS ---------- */
platforms.push({ x: 0, y: WORLD.groundY, w: WORLD.width, h: 100 });
for (let i = 0; i < 40; i++) {
  platforms.push({
    x: 300 + i * 180,
    y: WORLD.groundY - 200 - (i % 3) * 120,
    w: 160,
    h: 20
  });
}

/* ---------- ENEMIES ---------- */
function spawnMice() {
  mice.length = 0;
  for (let i = 0; i < 6; i++) {
    mice.push({
      x: 500 + Math.random() * (WORLD.width - 1000),
      y: WORLD.groundY - 40,
      vx: Math.random() > 0.5 ? 2 : -2,
      vy: 0,
      hp: 120,
      maxHp: 120,
      onGround: false,
      jumps: 0
    });
  }
}
spawnMice();

function spawnBirds() {
  birds.length = 0;
  for (let i = 0; i < 8; i++) {
    birds.push({
      x: 500 + Math.random() * (WORLD.width - 1000),
      y: WORLD.groundY - 300 - Math.random() * 200,
      vx: Math.random() > 0.5 ? 3 : -3,
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
      e.jumps = 0;
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
    jumps: 0,
    onGround: false,
    lastJump: false,
    lastShot: 0
  };

  socket.on("setName", n => players[socket.id].name = n);

  socket.on("input", i => {
    const p = players[socket.id];
    if (!p) return;

    p.vx = i.left ? -5 : i.right ? 5 : 0;

    if (i.jump && !p.lastJump && (p.onGround || p.jumps < 2)) {
      p.vy = -14;
      p.jumps++;
    }
    p.lastJump = i.jump;

    const now = Date.now();
    if (i.shoot && now - p.lastShot > 250) {
      p.lastShot = now;
      yarns.push({
        x: p.x + 24,
        y: p.y + 24,
        vx: Math.cos(i.angle) * 10,
        vy: Math.sin(i.angle) * 10,
        color: i.color,
        dead: false
      });
    }
  });

  socket.on("chat", msg => io.emit("chat", `${players[socket.id].name}: ${msg}`));
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
    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
    if (p.y > WORLD.groundY + 300) {
      p.x = 100;
      p.y = WORLD.groundY - 48;
      p.hp = p.maxHp;
    }
  }

  // Mice
  for (const m of mice) {
    m.vy += GRAVITY;
    m.x += m.vx;
    m.y += m.vy;
    collide(m);
    if (Math.random() < 0.01 && m.jumps < 2) { m.vy = -12; m.jumps++; }
    if (m.x < 0 || m.x > WORLD.width - 40) m.vx *= -1;
    if (m.hp <= 0) {
      m.x = 500 + Math.random() * (WORLD.width - 1000);
      m.y = WORLD.groundY - 40;
      m.hp = m.maxHp;
    }
  }

  // Birds
  for (const b of birds) {
    b.x += b.vx;
    if (b.x < 0 || b.x > WORLD.width - 60) b.vx *= -1;
    if (b.hp <= 0) {
      b.x = 500 + Math.random() * (WORLD.width - 1000);
      b.y = WORLD.groundY - 300 - Math.random() * 200;
      b.hp = b.maxHp;
    }
  }

  // Yarns
  for (const y of yarns) {
    y.x += y.vx;
    y.y += y.vy;
    if (y.x < -100 || y.x > WORLD.width + 100 || y.y < -100 || y.y > WORLD.height + 100) y.dead = true;

    for (const e of [...mice, ...birds]) {
      if (e.hp <= 0) continue;
      if (y.x > e.x && y.x < e.x + 40 && y.y > e.y && y.y < e.y + 40) {
        e.hp -= 20;
        y.dead = true;
        break;
      }
    }
  }

  // Clean yarns
  for (let i = yarns.length - 1; i >= 0; i--) if (yarns[i].dead) yarns.splice(i, 1);

  io.emit("state", { players, platforms, mice, birds, yarns, world: WORLD });
}, TICK);

server.listen(3000);
