const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Fullscreen canvas
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

let mouseX = 0, mouseY = 0;
canvas.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});
canvas.addEventListener("click", () => {
  socket.emit("shoot", { x: mouseX + camX, y: mouseY + camY });
});

const playerImg = new Image();
playerImg.src = "kiitygame.png";
const mouseImg = new Image();
mouseImg.src = "mouse.png";

let state = null, myId = null;
let camX = 0, camY = 0;

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);

setInterval(() => {
  if (!state || !state.players[myId]) return;
  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp
  });
}, 1000 / 60);

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#5c94fc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state) return;

  const me = state.players[myId];
  if (me) {
    camX = Math.max(0, Math.min(state.world.width - canvas.width, me.x - canvas.width / 2));
    camY = Math.max(0, Math.min(state.world.height - canvas.height, me.y - canvas.height / 2));
  }

  ctx.save();
  ctx.translate(-camX, -camY);

  // Platforms
  ctx.fillStyle = "#654321";
  state.platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

  // Yarn balls (colored)
  state.projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Mice
  state.mice.forEach(m => {
    if (m.dead) return;
    ctx.drawImage(mouseImg, m.x, m.y, 32, 32);
    ctx.fillStyle = "red";
    ctx.fillRect(m.x, m.y - 6, 32, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(m.x, m.y - 6, 32 * (m.hp / m.maxHp), 4);
  });

  // Players
  for (const id in state.players) {
    const p = state.players[id];
    const flip = id === myId && mouseX + camX < p.x + 24;

    ctx.save();
    if (flip) {
      ctx.translate(p.x + 48, p.y);
      ctx.scale(-1, 1);
      ctx.drawImage(playerImg, 0, 0, 48, 48);
    } else {
      ctx.drawImage(playerImg, p.x, p.y, 48, 48);
    }
    ctx.restore();

    ctx.fillStyle = "red";
    ctx.fillRect(p.x, p.y - 10, 48, 6);
    ctx.fillStyle = "lime";
    ctx.fillRect(p.x, p.y - 10, 48 * (p.hp / 100), 6);

    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 15);
  }

  ctx.restore();

  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText("Team Score: " + state.score, 20, 30);
}

draw();
