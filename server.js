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
const mice = [];
const birds = [];
const platforms = [];

function makePlatforms() {
  platforms.length = 0;

  platforms.push({ x: 0, y: WORLD.groundY, w: WORLD.width, h: 100 });

  for (let i = 0; i < 60; i++) {
    platforms.push({
      x: i * 160 + 200,
      y: WORLD.groundY - 200 - (i % 5) * 80,
      w: 140,
      h: 20
    });
  }
}
makePlatforms();

function spawnMice() {
  mice.length = 0;
  for (let i = 0; i < 12; i++) {
    mice.push({
      id: i,
      x: Math.random() * (WORLD.width - 40),
      y: WORLD.groundY - 40,
      vx: Math.random() > 0.5 ? 2 : -2,
      vy: 0,
      hp: 80,
      maxHp: 80,
      jumpCount: 0,
      onGround: false
    });
  }
}
spawnMice();

function spawnBirds() {
  birds.length = 0;
  for (let i = 0; i < 10; i++) {
    birds.push({
      id: i,
      x: Math.random() * (WORLD.width - 60),
      y: WORLD.groundY - 400 - Math.random() * 200,
      vx: Math.random() > 0.5 ? 3 : -3,
      vy: 0,
      hp: 60,
      maxHp: 60
    });
  }
}
spawnBirds();

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
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

function collide(e) {
  e.onGround = false;
  for (const p of platforms) {
    if (
      e.x < p.x + p.w &&
      e.x + 40 > p.x &&
      e.y < p.y + p.h &&
      e.y + 40 > p.y &&
      e.vy >= 0
    ) {
      e.y = p.y - 40;
      e.vy = 0;
      e.onGround = true;
      e.jumpCount = 0;
    }
  }
}

setInterval(() => {
  for (const p of Object.values(players)) {
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;
    collide(p);
    if (p.y > WORLD.groundY + 500) {
      p.x = 100;
      p.y = WORLD.groundY - 48;
      p.hp = p.maxHp;
    }
  }

  for (const m of mice) {
    m.vy += GRAVITY;
    m.x += m.vx;
    m.y += m.vy;

    if (Math.random() < 0.01 && m.jumpCount < 2) {
      m.vy = -12;
      m.jumpCount++;
    }

    collide(m);
  }

  for (const b of birds) {
    b.x += b.vx;
    if (Math.random() < 0.01) b.vy = 6;
    b.y += b.vy * 0.1;
  }

  io.emit("state", {
    players,
    mice,
    birds,
    platforms,
    world: WORLD
  });
}, TICK);

server.listen(3000, () => console.log("Running on port 3000"));
