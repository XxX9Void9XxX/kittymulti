const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

// ---------------- CONSTANTS ----------------
const GRAVITY = 0.5;
const SPEED = 4;
const JUMP = 10;

// 🌍 WORLD IS ~10× BIGGER
const WORLD = {
  width: 30000,
  height: 3000,
  groundY: 2600
};

// ---------------- PLATFORMS ----------------
const platforms = [];

// Ground
platforms.push({
  x: 0,
  y: WORLD.groundY,
  w: WORLD.width,
  h: 200
});

// Repeating platform sections
for (let i = 0; i < 30; i++) {
  const baseX = i * 1000;

  // Stair steps
  for (let j = 0; j < 5; j++) {
    platforms.push({
      x: baseX + j * 120,
      y: WORLD.groundY - 150 - j * 80,
      w: 100,
      h: 20
    });
  }

  // Floating islands
  platforms.push(
    { x: baseX + 400, y: 1700, w: 250, h: 20 },
    { x: baseX + 700, y: 1400, w: 200, h: 20 },
    { x: baseX + 900, y: 1100, w: 300, h: 20 }
  );

  // Tall tower
  platforms.push({
    x: baseX + 1200,
    y: 1800,
    w: 80,
    h: 800
  });

  // Long bridge
  platforms.push({
    x: baseX + 1500,
    y: 2000,
    w: 500,
    h: 20
  });
}

// ---------------- GAME OBJECTS ----------------
const players = {};
const mice = [];
const birds = [];
const projectiles = [];
let teamScore = 0;

// ---------------- HELPERS ----------------
function collide(obj, plat, h = 48) {
  if (
    obj.x < plat.x + plat.w &&
    obj.x + 48 > plat.x &&
    obj.y + h > plat.y &&
    obj.y + h < plat.y + plat.h &&
    obj.vy >= 0
  ) {
    obj.y = plat.y - h;
    obj.vy = 0;
    return true;
  }
  return false;
}

function randomColor() {
  const colors = ["#ff69b4", "#00ffff", "#ffff00", "#ffa500", "#00ff00", "#ff4444"];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ---------------- SPAWN MICE (~5×) ----------------
for (let i = 0; i < 60; i++) {
  mice.push({
    id: "m" + i,
    x: Math.random() * (WORLD.width - 100),
    y: WORLD.groundY - 32,
    vx: Math.random() > 0.5 ? 1.5 : -1.5,
    vy: 0,
    hp: 60,
    maxHp: 60,
    dead: false
  });
}

// ---------------- SPAWN BIRDS (~5×) ----------------
for (let i = 0; i < 30; i++) {
  birds.push({
    id: "b" + i,
    x: Math.random() * (WORLD.width - 100),
    y: 300 + Math.random() * 1000,
    vx: Math.random() > 0.5 ? 2 : -2,
    vy: 0,
    hp: 45,
    maxHp: 45,
    swoopCooldown: 0,
    dead: false
  });
}

// ---------------- GAME LOOP ----------------
function gameLoop() {
  // ---- PLAYERS ----
  for (const id in players) {
    const p = players[id];
    if (p.dead) continue;

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    let onGround = false;
    platforms.forEach(pl => {
      if (collide(p, pl)) onGround = true;
    });

    if (p.y > WORLD.groundY - 48) {
      p.y = WORLD.groundY - 48;
      p.vy = 0;
      onGround = true;
    }

    if (onGround) p.jumpCount = 0;
    p.onGround = onGround;

    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
  }

  // ---- MICE ----
  mice.forEach(m => {
    if (m.dead) return;

    m.vy += GRAVITY;
    m.y += m.vy;
    m.x += m.vx;

    platforms.forEach(pl => collide(m, pl, 32));

    if (m.y > WORLD.groundY - 32) {
      m.y = WORLD.groundY - 32;
      m.vy = 0;
    }

    let nearest = null, dist = Infinity;
    for (const id in players) {
      const p = players[id];
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < dist) { dist = d; nearest = p; }
    }

    if (nearest && dist < 350)
      m.vx = nearest.x > m.x ? 2 : -2;

    for (const id in players) {
      const p = players[id];
      if (p.dead) continue;
      if (
        m.x < p.x + 48 &&
        m.x + 32 > p.x &&
        m.y < p.y + 48 &&
        m.y + 32 > p.y
      ) {
        p.hp -= 0.4;
        if (p.hp <= 0) p.dead = true;
      }
    }
  });

  // ---- BIRDS ----
  birds.forEach(b => {
    if (b.dead) return;

    b.x += b.vx;
    if (b.x < 0 || b.x > WORLD.width - 48) b.vx *= -1;

    if (b.swoopCooldown > 0) b.swoopCooldown--;

    let target = null, dist = Infinity;
    for (const id in players) {
      const p = players[id];
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      if (d < dist) { dist = d; target = p; }
    }

    if (target && dist < 400 && b.swoopCooldown === 0) {
      const dx = target.x - b.x;
      const dy = target.y - b.y;
      const len = Math.hypot(dx, dy) || 1;
      b.vx = (dx / len) * 5;
      b.vy = (dy / len) * 5;
      b.swoopCooldown = 120;
    }

    b.y += b.vy;
    b.vy *= 0.96;

    for (const id in players) {
      const p = players[id];
      if (p.dead) continue;
      if (
        b.x < p.x + 48 &&
        b.x + 48 > p.x &&
        b.y < p.y + 48 &&
        b.y + 48 > p.y
      ) {
        p.hp -= 0.8;
        if (p.hp <= 0) p.dead = true;
      }
    }
  });

  // ---- PROJECTILES ----
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;

    [...mice, ...birds].forEach(e => {
      if (e.dead) return;
      if (
        pr.x > e.x &&
        pr.x < e.x + 48 &&
        pr.y > e.y &&
        pr.y < e.y + 48
      ) {
        e.hp -= 12;
        if (e.hp <= 0) {
          e.dead = true;
          teamScore++;
          setTimeout(() => {
            e.dead = false;
            e.hp = e.maxHp;
            e.x = Math.random() * (WORLD.width - 100);
            e.y = e.id.startsWith("b") ? 300 : WORLD.groundY - 32;
          }, 4000);
        }
        projectiles.splice(i, 1);
      }
    });

    if (pr.life <= 0) projectiles.splice(i, 1);
  }

  // ---- RESPAWN PLAYERS ----
  for (const id in players) {
    const p = players[id];
    if (p.dead) {
      p.dead = false;
      p.hp = 100;
      p.x = 50;
      p.y = WORLD.groundY - 48;
      p.vx = p.vy = 0;
      p.jumpCount = 0;
    }
  }

  io.emit("state", {
    players,
    mice,
    birds,
    platforms,
    world: WORLD,
    projectiles,
    score: teamScore
  });
}

setInterval(gameLoop, 1000 / 60);

// ---------------- SOCKETS ----------------
io.on("connection", socket => {
  players[socket.id] = {
    id: socket.id,
    name: "Player" + socket.id.slice(0, 4),
    x: 50,
    y: WORLD.groundY - 48,
    vx: 0,
    vy: 0,
    hp: 100,
    dead: false,
    onGround: false,
    jumpCount: 0
  };

  socket.on("input", i => {
    const p = players[socket.id];
    if (!p) return;
    p.vx = i.left ? -SPEED : i.right ? SPEED : 0;
    if (i.jump && (p.onGround || p.jumpCount < 2)) {
      p.vy = -JUMP;
      p.jumpCount++;
    }
  });

  socket.on("shoot", data => {
    const p = players[socket.id];
    if (!p) return;
    const dx = data.x - (p.x + 24);
    const dy = data.y - (p.y + 24);
    const len = Math.hypot(dx, dy) || 1;
    projectiles.push({
      x: p.x + 24,
      y: p.y + 24,
      vx: (dx / len) * 8,
      vy: (dy / len) * 8,
      life: 120,
      color: randomColor()
    });
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

server.listen(3000, () => console.log("Server running"));
