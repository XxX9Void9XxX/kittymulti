const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Input handling
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

let mouseX = 0;
canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
});

canvas.addEventListener("click", e => {
  const rect = canvas.getBoundingClientRect();
  socket.emit("shoot", {
    x: e.clientX - rect.left + cameraX,
    y: e.clientY - rect.top + cameraY
  });
});

// Load sprites
const playerSprite = new Image();
playerSprite.src = "kiitygame.png";
const mouseSprite = new Image();
mouseSprite.src = "mouse.png";

let playerReady = false;
let mouseReady = false;
playerSprite.onload = () => playerReady = true;
mouseSprite.onload = () => mouseReady = true;

// Game state
let gameState = null;
let myId = null;
let cameraX = 0;
let cameraY = 0;

socket.on("connect", () => myId = socket.id);

// Send input to server
setInterval(() => {
  if (!gameState || !gameState.players[myId]) return;

  socket.emit("input", {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    jump: keys["w"] || keys["ArrowUp"] || keys[" "],
    facingLeft: mouseX < canvas.width / 2
  });
}, 1000 / 60);

// Receive state
socket.on("state", state => gameState = state);

// Draw loop
function draw() {
  requestAnimationFrame(draw);
  if (!gameState) return;

  const { players, platforms, projectiles, mice, world, score } = gameState;
  const me = players[myId];

  // Camera follows player
  if (me) {
    cameraX = Math.max(0, Math.min(world.width - canvas.width, me.x - canvas.width / 2));
    cameraY = Math.max(0, Math.min(world.height - canvas.height, me.y - canvas.height / 2));
  }

  // Clear screen
  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-cameraX, -cameraY);

  // Ground
  ctx.fillStyle = "#228B22";
  ctx.fillRect(0, world.groundY, world.width, world.height);

  // Platforms
  ctx.fillStyle = "#654321";
  platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

  // Projectiles
  ctx.fillStyle = "#ff69b4";
  projectiles.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mice
  mice.forEach(m => {
    if (m.dead) return;

    // Draw mouse sprite if ready, otherwise fallback rectangle
    if (mouseReady) ctx.drawImage(mouseSprite, m.x, m.y, 32, 32);
    else {
      ctx.fillStyle = "gray";
      ctx.fillRect(m.x, m.y, 32, 32);
    }

    // Mouse health bar
    ctx.fillStyle = "red";
    ctx.fillRect(m.x, m.y - 6, 32, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(m.x, m.y - 6, 32 * (m.hp / 20), 4);
  });

  // Players
  for (const id in players) {
    const p = players[id];

    if (!p.dead) {
      ctx.save();
      ctx.translate(p.x + 24, p.y);
      ctx.scale(p.facingLeft ? -1 : 1, 1);
      if (playerReady) ctx.drawImage(playerSprite, -24, 0, 48, 48);
      else {
        ctx.fillStyle = "orange";
        ctx.fillRect(-24, 0, 48, 48);
      }
      ctx.restore();
    } else {
      // Death animation
      ctx.save();
      ctx.translate(p.x + 24, p.y + 24);
      ctx.rotate(Math.PI / 2);
      if (playerReady) ctx.drawImage(playerSprite, -24, -24, 48, 48);
      else ctx.fillStyle = "orange";
      ctx.fillRect(-24, -24, 48, 48);
      ctx.restore();
    }

    // Name tag
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 18);

    // Health bar
    ctx.fillStyle = "red";
    ctx.fillRect(p.x, p.y - 12, 48, 6);
    ctx.fillStyle = "lime";
    ctx.fillRect(p.x, p.y - 12, 48 * (p.hp / 100), 6);
  }

  ctx.restore();

  // Display team score
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Team Score: " + score, 20, 30);
}

draw();
