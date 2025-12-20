const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const players = {};

io.on("connection", socket => {
  players[socket.id] = {
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    onGround: false
  };

  socket.on("input", input => {
    const p = players[socket.id];
    if (!p) return;

    const speed = 4;
    if (input.left) p.vx = -speed;
    else if (input.right) p.vx = speed;
    else p.vx = 0;

    if (input.jump && p.onGround) {
      p.vy = -10;
      p.onGround = false;
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

function gameLoop() {
  for (const id in players) {
    const p = players[id];

    p.vy += 0.5; // gravity
    p.x += p.vx;
    p.y += p.vy;

    // floor
    if (p.y > 300) {
      p.y = 300;
      p.vy = 0;
      p.onGround = true;
    }
  }

  io.emit("state", players);
}

setInterval(gameLoop, 1000 / 60);

server.listen(process.env.PORT || 3000, () =>
  console.log("Server running")
);
