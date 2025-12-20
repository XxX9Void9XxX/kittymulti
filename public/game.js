const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

const sprite = new Image();
sprite.src = "kiitygame.png";

let gameState = null;
let myId = null;
let cameraX = 0;
let cameraY = 0;

socket.on("connect", () => myId = socket.id);

setInterval(() => {
  socket.emit("input", {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    jump: keys["w"] || keys["ArrowUp"] || keys[" "]
  });
}, 1000 / 60);

socket.on("state", state => gameState = state);

function draw() {
  if (!gameState) return requestAnimationFrame(draw);

  const { players, platforms, world } = gameState;
  const me = players[myId];

  if (me) {
    cameraX = me.x - canvas.width / 2 + 24;
    cameraY = me.y - canvas.height / 2 + 24;

    cameraX = Math.max(0, Math.min(world.width - canvas.width, cameraX));
    cameraY = Math.max(0, Math.min(world.height - canvas.height, cameraY));
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Ground
  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, world.groundY, world.width, world.height - world.groundY);

  // Platforms
  ctx.fillStyle = "#654321";
  platforms.forEach(p =>
    ctx.fillRect(p.x, p.y, p.w, p.h)
  );

  // Players
  for (const id in players) {
    const p = players[id];
    ctx.drawImage(sprite, p.x, p.y, 48, 48);
  }

  ctx.restore();
  requestAnimationFrame(draw);
}

draw();
