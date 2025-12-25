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
let gameStarted = false;

const camera = { x: 0, y: 0 };
const keys = {};
let mouse = { x: 0, y: 0 };

const playerImg = new Image();
playerImg.src = "kiitygame.png";
const mouseImg = new Image();
mouseImg.src = "mouse.png";
const birdImg = new Image();
birdImg.src = "birds.png";

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);
addEventListener("mousemove", e => mouse = e);

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);

setInterval(() => {
  if (!gameStarted || !state) return;
  const me = state.players[myId];
  if (!me) return;

  const angle = Math.atan2(
    mouse.y - canvas.height / 2,
    mouse.x - canvas.width / 2
  );

  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp,
    shoot: keys.Mouse0,
    angle,
    color: `hsl(${Math.random() * 360},100%,50%)`
  });
}, 1000 / 60);

addEventListener("mousedown", () => keys.Mouse0 = true);
addEventListener("mouseup", () => keys.Mouse0 = false);

function draw() {
  requestAnimationFrame(draw);
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state || !state.players[myId]) return;

  const me = state.players[myId];
  camera.x = me.x - canvas.width / 2;
  camera.y = me.y - canvas.height / 2;

  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
  }

  for (const y of state.yarns) {
    ctx.fillStyle = y.color;
    ctx.beginPath();
    ctx.arc(y.x - camera.x, y.y - camera.y, 6, 0, Math.PI * 2);
    ctx.fill();
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

  ctx.drawImage(
    playerImg,
    me.x - camera.x,
    me.y - camera.y,
    48,
    48
  );
}
draw();
