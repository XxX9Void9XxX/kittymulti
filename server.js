const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

const GRAVITY = 0.5;
const SPEED = 4;
const JUMP = 11;

const WORLD = { width: 3000, height: 800, groundY: 700 };

// Platforms
const platforms = [
  { x: 300, y: 580, w: 120, h: 20 },
  { x: 600, y: 500, w: 120, h: 20 },
  { x: 900, y: 420, w: 120, h: 20 },
  { x: 1300, y: 520, w: 160, h: 20 },
  { x: 1700, y: 450, w: 120, h: 20 }
];

const players = {};
const projectiles = [];
const mice = [];
let teamScore = 0;

// Spawn 5 mice at random positions
for (let i = 0; i < 5; i++) {
  mice.push({
    id: "mouse" + i,
    x: 200 + i * 300,
    y: WORLD.groundY - 48,
    vx: Math.random() > 0.5 ? 1.5 : -1.5,
    vy: 0,
    hp: 20,
    dead: false
  });
}

// Handle player connections
io.on("connection", socket => {
  players[socket.id] = {
    id: socket.id,
    name: "Player" + socket.id.slice(0, 4),
    x: 100,
    y: WORLD.groundY - 48,
    vx: 0,
    vy: 0,
    onGround: false,
    hp: 100,
    dead: false,
    facingLeft: false,
    deathTimer: 0
  };

  socket.on("input", input => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    p.vx = input.left ? -SPEED : input.right ? SPEED : 0;
    if (input.jump && p.onGround) { p.vy = -JUMP; p.onGround = false; }
    p.facingLeft = input.facingLeft;
  });

  socket.on("shoot", data => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    const dx = data.x - (p.x + 24);
    const dy = data.y - (p.y + 24);
    const len = Math.hypot(dx, dy) || 1;
    projectiles.push({ x: p.x + 24, y: p.y + 24, vx: (dx / len) * 8, vy: (dy / len) * 8, owner: socket.id, life: 120 });
  });

  socket.on("disconnect", () => { delete players[socket.id]; });
});

// Physics helper
function collidePlatform(obj, plat) {
  if (obj.x < plat.x + plat.w && obj.x + 48 > plat.x && obj.y + 48 > plat.y && obj.y + 48 < plat.y + plat.h && obj.vy >= 0) {
    obj.y = plat.y - 48; obj.vy = 0; obj.onGround = true;
  }
}

// Game loop
function gameLoop() {
  // Player physics
  for (const id in players) {
    const p = players[id];
    if (p.dead) {
      p.vy += GRAVITY; p.y += p.vy; p.deathTimer++;
      if (p.deathTimer >= 120) { p.dead = false; p.hp = 100; p.x = 100; p.y = WORLD.groundY - 48; p.vx = 0; p.vy = 0; p.deathTimer = 0; }
      continue;
    }
    p.vy += GRAVITY; p.x += p.vx; p.y += p.vy; p.onGround = false;
    if (p.y > WORLD.groundY - 48) { p.y = WORLD.groundY - 48; p.vy = 0; p.onGround = true; }
    platforms.forEach(plat => collidePlatform(p, plat));
    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
  }

  // Mouse AI
  mice.forEach(mouse => {
    if (mouse.dead) return;
    mouse.vy += GRAVITY; mouse.y += mouse.vy; mouse.onGround = false;
    platforms.forEach(plat => collidePlatform(mouse, plat));
    // Chase nearest player within 300px
    let nearest = null, dist = Infinity;
    for (const id in players) {
      const p = players[id]; if (p.dead) continue;
      const d = Math.hypot(p.x - mouse.x, p.y - mouse.y);
      if (d < dist) { dist = d; nearest = p; }
    }
    if (nearest && dist < 300) mouse.vx = nearest.x > mouse.x ? 1.5 : -1.5;
    else if (Math.random() < 0.01) mouse.vx *= -1;
    mouse.x += mouse.vx;
    if (mouse.x < 0 || mouse.x > WORLD.width - 48) mouse.vx *= -1;

    // Damage player if touching
    for (const id in players) {
      const p = players[id]; if (p.dead) continue;
      if (mouse.x < p.x + 48 && mouse.x + 32 > p.x && mouse.y < p.y + 48 && mouse.y + 32 > p.y) {
        p.hp -= 1;
        if (p.hp <= 0 && !p.dead) { p.dead = true; p.vx = 0; p.vy = -5; p.deathTimer = 0; }
      }
    }
  });

  // Projectiles hit mice
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i]; pr.x += pr.vx; pr.y += pr.vy; pr.life--;
    for (const m of mice) {
      if (m.dead) continue;
      if (pr.x > m.x && pr.x < m.x + 32 && pr.y > m.y && pr.y < m.y + 32) {
        m.hp -= 10;
        if (m.hp <= 0) {
          m.dead = true; teamScore++;
          setTimeout(() => { m.dead = false; m.hp = 20; m.x = Math.random() * (WORLD.width - 48); m.y = WORLD.groundY - 48; m.vx = Math.random() > 0.5 ? 1.5 : -1.5; }, 3000);
        }
        projectiles.splice(i, 1); break;
      }
    }
    if (pr.life <= 0) projectiles.splice(i, 1);
  }

  io.emit("state", { players, platforms, projectiles, mice, world: WORLD, score: teamScore });
}

setInterval(gameLoop, 1000 / 60);
server.listen(process.env.PORT || 3000);
