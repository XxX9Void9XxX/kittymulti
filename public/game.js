const socket = io();

// ---------------- CANVAS ----------------
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// ---------------- IMAGES ----------------
const playerImg = new Image();
playerImg.src = "kiitygame.png";

const mouseImg = new Image();
mouseImg.src = "mouse.png";

const birdImg = new Image();
birdImg.src = "birds.png";

// ---------------- INPUT ----------------
const keys = {};
let mouse = { x: 0, y: 0 };
let lastJumpPressed = false;

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("click", () => {
  if (!state || !state.players[myId]) return;
  const camX = camera.x;
  const camY = camera.y;
  socket.emit("shoot", {
    x: mouse.x + camX,
    y: mouse.y + camY
  });
});

// ---------------- GAME STATE ----------------
let state = null;
let myId = null;

socket.on("connect", () => {
  myId = socket.id;
});

socket.on("state", s => state = s);

// ---------------- SEND INPUT ----------------
setInterval(() => {
  if (!state || !state.players[myId]) return;

  const jumpPressed =
    keys["w"] || keys[" "] || keys["ArrowUp"];

  socket.emit("input", {
    left: keys["a"] || keys["ArrowLeft"],
    right: keys["d"] || keys["ArrowRight"],
    jump: jumpPressed && !lastJumpPressed
  });

  lastJumpPressed = jumpPressed;
}, 1000 / 60);

// ---------------- CAMERA ----------------
const camera = { x: 0, y: 0 };

// ---------------- DRAW LOOP ----------------
function draw() {
  requestAnimationFrame(draw);
  if (!state || !state.players[myId]) return;

  const me = state.players[myId];

  // Camera follow
  camera.x = me.x - canvas.width / 2 + 24;
  camera.y = me.y - canvas.height / 2 + 24;
  camera.x = Math.max(0, Math.min(state.world.width - canvas.width, camera.x));
  camera.y = Math.max(0, Math.min(state.world.height - canvas.height, camera.y));

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // ---------------- PLATFORMS ----------------
  ctx.fillStyle = "#5a3d1e";
  state.platforms.forEach(p =>
    ctx.fillRect(p.x, p.y, p.w, p.h)
  );

  // ---------------- PLAYERS ----------------
  for (const id in state.players) {
    const p = state.players[id];
    if (p.dead) continue;

    const screenMouseX = mouse.x + camera.x;
    const facingLeft = screenMouseX < p.x + 24;

    ctx.save();
    ctx.translate(p.x + 24, p.y);
    ctx.scale(facingLeft ? -1 : 1, 1);
    ctx.drawImage(playerImg, -24, 0, 48, 48);
    ctx.restore();

    // Name
    ctx.fillStyle = "white";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 18);

    // Health bar
    ctx.fillStyle = "red";
    ctx.fillRect(p.x, p.y - 10, 48, 5);
    ctx.fillStyle = "lime";
    ctx.fillRect(p.x, p.y - 10, 48 * (p.hp / 100), 5);
  }

  // ---------------- MICE ----------------
  state.mice.forEach(m => {
    if (m.dead) return;
    ctx.drawImage(mouseImg, m.x, m.y, 32, 32);

    ctx.fillStyle = "red";
    ctx.fillRect(m.x, m.y - 6, 32, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(m.x, m.y - 6, 32 * (m.hp / m.maxHp), 4);
  });

  // ---------------- BIRDS ----------------
  state.birds.forEach(b => {
    if (b.dead) return;
    ctx.drawImage(birdImg, b.x, b.y, 48, 48);

    ctx.fillStyle = "red";
    ctx.fillRect(b.x, b.y - 6, 48, 4);
    ctx.fillStyle = "lime";
    ctx.fillRect(b.x, b.y - 6, 48 * (b.hp / b.maxHp), 4);
  });

  // ---------------- PROJECTILES ----------------
  state.projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();

  // ---------------- UI ----------------
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("Team Score: " + state.score, 20, 30);
}

draw();
