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
const WORLD = { width: 1200, height: 600, groundY: 500 };

const platforms = [
  { x: 0, y: WORLD.groundY, w: 1200, h: 100 }, // ground
  { x: 200, y: 400, w: 200, h: 20 },
  { x: 500, y: 300, w: 200, h: 20 },
  { x: 800, y: 200, w: 200, h: 20 }
];

const players = {};
const mice = [
  { id: "m1", x: 250, y: WORLD.groundY - 48, vx: 1, vy: 0 },
  { id: "m2", x: 600, y: WORLD.groundY - 48, vx: -1, vy: 0 }
];

// Helper
function collidePlatform(obj, plat) {
  if (obj.x < plat.x + plat.w && obj.x + 48 > plat.x && obj.y + 48 > plat.y && obj.y + 48 < plat.y + plat.h && obj.vy >= 0) {
    obj.y = plat.y - 48;
    obj.vy = 0;
  }
}

// Game loop
function gameLoop() {
  // Update players
  for (const id in players) {
    const p = players[id];
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    platforms.forEach(plat => collidePlatform(p, plat));

    // Stay in bounds
    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
    if (p.y > WORLD.groundY - 48) { p.y = WORLD.groundY - 48; p.vy = 0; }
  }

  // Update mice (gravity + simple movement)
  mice.forEach(m => {
    m.vy += GRAVITY;
    m.y += m.vy;
    m.x += m.vx;

    platforms.forEach(plat => collidePlatform(m, plat));

    // Bounce off walls
    if (m.x < 0 || m.x > WORLD.width - 32) m.vx *= -1;
  });

  io.emit("state", { players, mice, platforms, world: WORLD });
}

setInterval(gameLoop, 1000 / 60);

// Player input
io.on("connection", socket => {
  console.log("Player connected:", socket.id);
  players[socket.id] = { id: socket.id, x: 50, y: WORLD.groundY - 48, vx: 0, vy: 0 };

  socket.on("input", input => {
    const p = players[socket.id];
    if (!p) return;
    p.vx = input.left ? -SPEED : input.right ? SPEED : 0;
    if (input.jump && p.vy === 0) p.vy = -JUMP;
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
