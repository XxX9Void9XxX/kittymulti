const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

let gameState = null;

// Input send
setInterval(() => {
  if (!gameState || !gameState.players) return;
  socket.emit("input", {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    jump: keys["w"] || keys["ArrowUp"] || keys[" "]
  });
}, 1000 / 60);

// Receive state
socket.on("state", state => gameState = state);

// Draw loop
function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameState) return;

  const { players, mice, platforms } = gameState;

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
}

draw();
