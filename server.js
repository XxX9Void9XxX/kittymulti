const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const GRAVITY = 0.5;
const SPEED = 4;
const JUMP = 11;

const WORLD = {
  width: 3000,
  height: 800,
  groundY: 700
};

const platforms = [
  { x: 300, y: 580, w: 120, h: 20 },
  { x: 600, y: 500, w: 120, h: 20 },
  { x: 900, y: 420, w: 120, h: 20 },
  { x: 1300, y: 520, w: 160, h: 20 },
  { x: 1700, y: 450, w: 120, h: 20 }
];

const players = {};

io.on("connection", socket => {
  players[socket.id] = {
    x: 100,
    y: WORLD.groundY - 48,
    vx: 0,
    vy: 0,
    onGround: false
  };

  socket.on("input", input => {
    const p = players[socket.id];
    if (!p) return;

    if (input.left) p.vx = -SPEED;
    else if (input.right) p.vx = SPEED;
    else p.vx = 0;

    if (input.jump && p.onGround) {
      p.vy = -JUMP;
      p.onGround = false;
    }
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

function collidePlatform(p, plat) {
  if (
    p.x < plat.x + plat.w &&
    p.x + 48 > plat.x &&
    p.y + 48 > plat.y &&
    p.y + 48 < plat.y + plat.h &&
    p.vy >= 0
  ) {
    p.y = plat.y - 48;
    p.vy = 0;
    p.onGround = true;
  }
}

function gameLoop() {
  for (const id in players) {
    const p = players[id];

    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    p.onGround = false;

    // Ground collision
    if (p.y > WORLD.groundY - 48) {
      p.y = WORLD.groundY - 48;
      p.vy = 0;
      p.onGround = true;
    }

    // Platform collisions
    platforms.forEach(plat => collidePlatform(p, plat));

    // World borders
    p.x = Math.max(0, Math.min(WORLD.width - 48, p.x));
    if (p.y > WORLD.height) {
      p.x = 100;
      p.y = WORLD.groundY - 48;
      p.vy = 0;
    }
  }

  io.emit("state", {
    players,
    platforms,
    world: WORLD
  });
}

setInterval(gameLoop, 1000 / 60);

server.listen(process.env.PORT || 3000);
