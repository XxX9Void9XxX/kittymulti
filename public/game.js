const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

const sprite = new Image();
sprite.src = "kiitygame.png";

let players = {};

function sendInput() {
  socket.emit("input", {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    jump: keys["w"] || keys["ArrowUp"] || keys[" "]
  });
}
setInterval(sendInput, 1000 / 60);

socket.on("state", serverPlayers => {
  players = serverPlayers;
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ground
  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, 350, 800, 50);

  for (const id in players) {
    const p = players[id];
    ctx.drawImage(sprite, p.x, p.y, 48, 48);
  }

  requestAnimationFrame(draw);
}

draw();
