const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

const socket = io();
let state, myId;

const playerImg = new Image();
playerImg.src = "kiitygame.png";
const mouseImg = new Image();
mouseImg.src = "mouse.png";
const birdImg = new Image();
birdImg.src = "birds.png";

// INPUT
const keys = {};
let jumpPressed = false;
let mouse = { x: 0, y: 0 };

addEventListener("keydown", e => {
  keys[e.key] = true;
  if (e.key === "w") jumpPressed = true;
});
addEventListener("keyup", e => {
  keys[e.key] = false;
  if (e.key === "w") jumpPressed = false;
});
addEventListener("mousemove", e => mouse = { x: e.clientX, y: e.clientY });
addEventListener("mousedown", () => {
  const dx = mouse.x - canvas.width / 2;
  const dy = mouse.y - canvas.height / 2;
  const len = Math.hypot(dx, dy) || 1;
  socket.emit("shoot", {
    dx: dx / len,
    dy: dy / len,
    color: `hsl(${Math.random()*360},100%,60%)`
  });
});

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);
socket.on("chat", msg => {
  const d = document.createElement("div");
  d.textContent = msg;
  chatMessages.appendChild(d);
});

function draw() {
  requestAnimationFrame(draw);
  if (!state || !state.players[myId]) return;

  const me = state.players[myId];
  socket.emit("input", {
    left: keys.a,
    right: keys.d,
    jump: jumpPressed
  });

  const camX = me.x - canvas.width / 2;
  const camY = me.y - canvas.height / 2;

  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(-camX, -camY);

  state.platforms.forEach(p => {
    ctx.fillStyle = "#444";
    ctx.fillRect(p.x,p.y,p.w,p.h);
  });

  for (const id in state.players) {
    const p = state.players[id];
    ctx.save();
    ctx.translate(p.x + 24, p.y);
    ctx.scale(mouse.x + camX < p.x ? -1 : 1, 1);
    ctx.drawImage(playerImg, -24, 0, 48, 48);
    ctx.restore();
  }

  state.mice.forEach(m => {
    if (m.dead) return;
    ctx.save();
    ctx.translate(m.x + 16, m.y);
    ctx.scale(m.vx < 0 ? -1 : 1, 1);
    ctx.drawImage(mouseImg, -16, 0, 32, 32);
    ctx.restore();
  });

  state.birds.forEach(b => {
    if (b.dead) return;
    ctx.save();
    ctx.translate(b.x + 24, b.y);
    ctx.scale(b.vx < 0 ? -1 : 1, 1);
    ctx.drawImage(birdImg, -24, 0, 48, 48);
    ctx.restore();
  });

  state.projectiles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI*2);
    ctx.fill();
  });

  ctx.restore();
}

draw();
