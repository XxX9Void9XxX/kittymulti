const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/", (_, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

// ---------------- CONSTANTS ----------------
const GRAVITY = 0.6;
const SPEED = 4;
const JUMP = 11;

const WORLD = {
  width: 30000,
  height: 2200,
  groundY: 2000
};

// ---------------- PLATFORMS ----------------
const platforms = [
  { x: 0, y: WORLD.groundY, w: WORLD.width, h: 200 }
];

for (let i = 0; i < 60; i++) {
  platforms.push({
    x: 300 + i * 450,
    y: WORLD.groundY - 150 - (i % 3) * 120,
    w: 260,
    h: 20
  });
}

// ---------------- GAME STATE ----------------
const players = {};
const mice = [];
const birds = [];
const projectiles = [];

// ---------------- HELPERS ----------------
function land(obj, h) {
  if (obj.y >= WORLD.groundY - h) {
    obj.y = WORLD.groundY - h;
    obj.vy = 0;
    obj.onGround = true;
    obj.jumpCount = 0;
  }
}

function platformCollide(obj, h) {
  for (const p of platforms) {
    if (
      obj.x < p.x + p.w &&
      obj.x + h > p.x &&
      obj.y + h > p.y &&
      obj.y + h < p.y + p.h &&
      obj.vy >= 0
    ) {
      obj.y = p.y - h;
      obj.vy = 0;
      obj.onGround = true;
      obj.jumpCount = 0;
      return;
    }
  }
}

// ---------------- SPAWN ENEMIES (SAFE) ----------------
function spawnMouse(m) {
  m.x = Math.random() * (WORLD.width - 32);
  m.y = WORLD.groundY - 32;
  m.hp = m.maxHp;
  m.dead = false;
}

function spawnBird(b) {
  b.x = Math.random() * (WORLD.width - 48);
  b.y = 400 + Math.random() * 400;
  b.hp = b.maxHp;
  b.dead = false;
  b.vy = 0;
}

// Mice
for (let i = 0; i < 25; i++) {
  mice.push({
    id: "m" + i,
    x: 0, y: 0,
    vx: Math.random() > 0.5 ? 2 : -2,
    vy: 0,
    hp: 70,
    maxHp: 70,
    dead: false,
    onGround: false,
    jumpCount: 0
  });
  spawnMouse(mice[i]);
}

// Birds
for (let i = 0; i < 30; i++) {
  birds.push({
    id: "b" + i,
    x: 0, y: 0,
    vx: Math.random() > 0.5 ? 2.5 : -2.5,
    vy: 0,
    hp: 50,
    maxHp: 50,
    swoop: 0,
    dead: false
  });
  spawnBird(birds[i]);
}

// ---------------- GAME LOOP ----------------
function update() {

  // PLAYERS
  for (const id in players) {
    const p = players[id];
    if (p.dead) continue;

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.onGround = false;

    platformCollide(p, 48);
    land(p, 48);

    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
  }

  // MICE
  mice.forEach(m => {
    if (m.dead) return;

    m.vy += GRAVITY;
    m.x += m.vx;
    m.y += m.vy;
    m.onGround = false;

    platformCollide(m, 32);
    land(m, 32);

    const target = Object.values(players)[0];
    if (target) {
      m.vx = target.x > m.x ? 2 : -2;
      if ((m.onGround || m.jumpCount < 2) && Math.random() < 0.02) {
        m.vy = -9;
        m.jumpCount++;
      }
    }
  });

  // BIRDS
  birds.forEach(b => {
    if (b.dead) return;

    b.x += b.vx;
    if (b.swoop-- <= 0) {
      const target = Object.values(players)[0];
      if (target) {
        b.vy = (target.y - b.y) * 0.03;
        b.swoop = 120;
      }
    }
    b.y += b.vy;
    b.vy *= 0.98;
  });

  // PROJECTILES
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;

    let hit = false;
    [...mice, ...birds].forEach(e => {
      if (e.dead) return;
      if (
        pr.x > e.x &&
        pr.x < e.x + 48 &&
        pr.y > e.y &&
        pr.y < e.y + 48
      ) {
        e.hp -= 12;
        hit = true;
        if (e.hp <= 0) {
          e.dead = true;
          setTimeout(() => e.id.startsWith("m") ? spawnMouse(e) : spawnBird(e), 3000);
        }
      }
    });

    if (hit || pr.life <= 0) projectiles.splice(i, 1);
  }

  io.emit("state", { players, mice, birds, platforms, projectiles, world: WORLD });
}

setInterval(update, 1000 / 60);

// ---------------- SOCKETS ----------------
io.on("connection", socket => {
  players[socket.id] = {
    id: socket.id,
    name: "Player",
    x: 50,
    y: WORLD.groundY - 48,
    vx: 0,
    vy: 0,
    hp: 100,
    dead: false,
    onGround: false,
    jumpCount: 0,
    lastJump: false
  };

  socket.on("setName", n => players[socket.id].name = n.slice(0, 16));

  socket.on("input", i => {
    const p = players[socket.id];
    if (!p) return;

    p.vx = i.left ? -SPEED : i.right ? SPEED : 0;

    if (i.jump && !p.lastJump && (p.onGround || p.jumpCount < 2)) {
      p.vy = -JUMP;
      p.jumpCount++;
    }
    p.lastJump = i.jump;
  });

  socket.on("shoot", d => {
    const p = players[socket.id];
    projectiles.push({
      x: p.x + 24,
      y: p.y + 24,
      vx: d.dx * 8,
      vy: d.dy * 8,
      life: 120,
      color: d.color
    });
  });

  socket.on("chat", msg =>
    io.emit("chat", `${players[socket.id].name}: ${msg}`)
  );

  socket.on("disconnect", () => delete players[socket.id]);
});

server.listen(3000, () => console.log("Server running"));
