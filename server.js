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
const JUMP = 10;

// Big map
const WORLD = { width: 3000, height: 800, groundY: 700 };

// Platforms
const platforms = [
  { x: 0, y: WORLD.groundY, w: WORLD.width, h: 100 },
  { x: 400, y: 600, w: 200, h: 20 },
  { x: 800, y: 500, w: 200, h: 20 },
  { x: 1200, y: 400, w: 200, h: 20 },
  { x: 1600, y: 550, w: 200, h: 20 },
  { x: 2000, y: 450, w: 200, h: 20 },
  { x: 2400, y: 350, w: 200, h: 20 }
];

const players = {};
const mice = [];
const projectiles = [];
let teamScore = 0;

// Spawn mice
for (let i = 0; i < 5; i++) {
  mice.push({
    id: "m" + i,
    x: 200 + i * 400,
    y: WORLD.groundY - 48,
    vx: Math.random() > 0.5 ? 1.5 : -1.5,
    vy: 0,
    hp: 20,
    dead: false
  });
}

// Helper: collision with platforms
function collidePlatform(obj, plat) {
  if (obj.x < plat.x + plat.w && obj.x + 48 > plat.x && obj.y + 48 > plat.y && obj.y + 48 < plat.y + plat.h && obj.vy >= 0) {
    obj.y = plat.y - (obj.h || 48);
    obj.vy = 0;
    return true;
  }
  return false;
}

// Game loop
function gameLoop() {
  // Update players
  for (const id in players) {
    const p = players[id];
    if (p.dead) continue;

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    let onGround = false;

    platforms.forEach(plat => { if (collidePlatform(p, plat)) onGround = true; });
    if (p.y > WORLD.groundY - 48) { p.y = WORLD.groundY - 48; p.vy = 0; onGround = true; }

    p.onGround = onGround;
    // Keep in bounds
    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
  }

  // Update mice
  mice.forEach(m => {
    if (m.dead) return;

    m.vy += GRAVITY;
    m.y += m.vy;
    m.x += m.vx;
    let onGround = false;

    platforms.forEach(plat => { if (collidePlatform(m, plat)) onGround = true; });
    if (m.y > WORLD.groundY - 32) { m.y = WORLD.groundY - 32; m.vy = 0; onGround = true; }

    // Simple AI: chase nearest player within 300px
    let nearest = null, dist = Infinity;
    for (const id in players) {
      const p = players[id];
      const d = Math.hypot(p.x - m.x, p.y - m.y);
      if (d < dist) { dist = d; nearest = p; }
    }
    if (nearest && dist < 300) m.vx = nearest.x > m.x ? 1.5 : -1.5;
    else if (Math.random() < 0.01) m.vx *= -1;

    // Bounce off walls
    if (m.x < 0 || m.x > WORLD.width - 32) m.vx *= -1;
  });

  io.emit("state", { players, mice, platforms, world: WORLD, score: teamScore });
}

setInterval(gameLoop, 1000 / 60);

// Player input
io.on("connection", socket => {
  console.log("Player connected:", socket.id);
  players[socket.id] = { id: socket.id, x: 50, y: WORLD.groundY - 48, vx: 0, vy: 0, onGround: false, dead: false };

  socket.on("input", input => {
    const p = players[socket.id];
    if (!p || p.dead) return;
    p.vx = input.left ? -SPEED : input.right ? SPEED : 0;
    if (input.jump && p.onGround) p.vy = -JUMP;
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
