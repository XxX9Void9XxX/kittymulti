const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const socket = io();
let state = null;
let myId = null;
const camera = { x: 0, y: 0 };
const keys = {};
let mouseX = 0;

const playerImg = new Image();
playerImg.src = "kiitygame.png";
const mouseImg = new Image();
mouseImg.src = "mouse.png";
const birdImg = new Image();
birdImg.src = "birds.png";

addEventListener("mousemove", e => mouseX = e.clientX);
addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);

setInterval(() => {
  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp
  });
}, 1000 / 60);

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);

function draw() {
  requestAnimationFrame(draw);
  if (!state || !state.players[myId]) return;

  const me = state.players[myId];
  camera.x = Math.max(0, me.x - canvas.width / 2);
  camera.y = Math.max(0, me.y - canvas.height / 2);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
  }

  for (const p of Object.values(state.players)) {
    const flip = mouseX + camera.x < p.x + 24;
    ctx.save();
    ctx.translate(p.x - camera.x + 24, p.y - camera.y);
    ctx.scale(flip ? -1 : 1, 1);
    ctx.drawImage(playerImg, -24, 0, 48, 48);
    ctx.restore();
  }

  for (const m of state.mice) {
    ctx.save();
    ctx.translate(m.x - camera.x + 20, m.y - camera.y);
    ctx.scale(m.vx < 0 ? -1 : 1, 1);
    ctx.drawImage(mouseImg, -20, 0, 40, 40);
    ctx.restore();
  }

  for (const b of state.birds) {
    ctx.save();
    ctx.translate(b.x - camera.x + 30, b.y - camera.y);
    ctx.scale(b.vx < 0 ? -1 : 1, 1);
    ctx.drawImage(birdImg, -30, 0, 60, 40);
    ctx.restore();
  }
}
draw();
