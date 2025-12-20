const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

let gameState = null;
let myId = null;
let cameraX = 0, cameraY = 0;

socket.on("connect", () => myId = socket.id);
socket.on("state", state => gameState = state);

// Input
setInterval(() => {
  if (!gameState || !gameState.players[myId]) return;
  socket.emit("input", {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    jump: keys["w"] || keys["ArrowUp"] || keys[" "]
  });
}, 1000 / 60);

// Draw
function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameState) return;

  const { players, mice, platforms, world } = gameState;
  const me = players[myId];

  if (me) {
    cameraX = Math.max(0, Math.min(world.width - canvas.width, me.x - canvas.width / 2));
    cameraY = Math.max(0, Math.min(world.height - canvas.height, me.y - canvas.height / 2));
  }

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Platforms
  ctx.fillStyle = "#654321";
  platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

  // Players
  ctx.fillStyle = "orange";
  for (const id in players) {
    const p = players[id];
    ctx.fillRect(p.x, p.y, 48, 48);
  }

  // Mice
  ctx.fillStyle = "gray";
  mice.forEach(m => ctx.fillRect(m.x, m.y, 32, 32));

  ctx.restore();
}

draw();
