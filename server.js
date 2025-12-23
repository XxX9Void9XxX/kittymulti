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

const GRAVITY = 0.5;
const SPEED = 4;
const JUMP = 10;
const WORLD = { width: 3000, height: 900, groundY: 800 };

const platforms = [
  { x: 0, y: WORLD.groundY, w: WORLD.width, h: 100 },
  { x: 300, y: 650, w: 200, h: 20 },
  { x: 700, y: 550, w: 200, h: 20 },
  { x: 1100, y: 450, w: 200, h: 20 },
  { x: 1500, y: 350, w: 200, h: 20 },
  { x: 1900, y: 550, w: 200, h: 20 },
  { x: 2300, y: 450, w: 200, h: 20 }
];

const players = {};
const mice = [];
const projectiles = [];
let teamScore = 0;

// --------- HELPERS ----------
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

// --------- SPAWN MICE ----------
for (let i = 0; i < 12; i++) {
  mice.push({
    id: "m" + i,
    x: 200 + i * 220,
    y: WORLD.groundY - 32,
    vx: Math.random() > 0.5 ? 1.5 : -1.5,
    vy: 0,
    hp: 40,
    maxHp: 40,
    dead: false
  });
}

// --------- GAME LOOP ----------
function gameLoop() {
  // Players
  for (const id in players) {
    const p = players[id];
    if (p.dead) continue;

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    let onGround = false;
    platforms.forEach(pl => { if (collide(p, pl)) onGround = true; });

    if (p.y > WORLD.groundY - 48) {
      p.y = WORLD.groundY - 48;
      p.vy = 0;
      onGround = true;
    }

    if (onGround) p.jumpCount = 0;
    p.onGround = onGround;
    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
  }

  // Mice
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

    let nearest = null, dMin = 9999;
    for (const id in players) {
      const p = players[id];
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < dMin) { dMin = d; nearest = p; }
    }

    if (nearest && dMin < 300)
      m.vx = nearest.x > m.x ? 1.6 : -1.6;
    else if (Math.random() < 0.01)
      m.vx *= -1;

    for (const id in players) {
      const p = players[id];
      if (p.dead) continue;
      if (
        m.x < p.x + 48 &&
        m.x + 32 > p.x &&
        m.y < p.y + 48 &&
        m.y + 32 > p.y
      ) {
        p.hp -= 0.5;
        if (p.hp <= 0) p.dead = true;
      }
    }
  });

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life--;

    for (const m of mice) {
      if (m.dead) continue;
      if (
        pr.x > m.x &&
        pr.x < m.x + 32 &&
        pr.y > m.y &&
        pr.y < m.y + 32
      ) {
        m.hp -= 10;
        if (m.hp <= 0) {
          m.dead = true;
          teamScore++;
          setTimeout(() => {
            m.dead = false;
            m.hp = m.maxHp;
            m.x = Math.random() * (WORLD.width - 32);
            m.y = WORLD.groundY - 32;
          }, 3000);
        }
        projectiles.splice(i, 1);
        break;
      }
    }

    if (pr.life <= 0) projectiles.splice(i, 1);
  }

  // Respawn players instantly
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

  io.emit("state", { players, mice, platforms, world: WORLD, projectiles, score: teamScore });
}

setInterval(gameLoop, 1000 / 60);

// --------- SOCKETS ----------
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
