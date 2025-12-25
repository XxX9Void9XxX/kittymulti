const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const socket = io();
let state, myId;

const keys = {};
let mouse = { x: 0, y: 0, down: false };

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);
addEventListener("mousemove", e => mouse = e);
addEventListener("mousedown", () => mouse.down = true);
addEventListener("mouseup", () => mouse.down = false);

const imgPlayer = new Image();
imgPlayer.src = "kiitygame.png";
const imgMouse = new Image();
imgMouse.src = "mouse.png";
const imgBird = new Image();
imgBird.src = "birds.png";

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);

setInterval(() => {
  if (!state || !state.players[myId]) return;

  const angle = Math.atan2(
    mouse.y - canvas.height / 2,
    mouse.x - canvas.width / 2
  );

  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp,
    shoot: mouse.down,
    angle,
    color: `hsl(${Math.random() * 360},100%,50%)`
  });
}, 1000 / 60);

socket.on("chat", msg => {
  const box = document.getElementById("chat");
  box.innerHTML += msg + "<br>";
  box.scrollTop = box.scrollHeight;
});

function drawHealth(x, y, w, hp, max) {
  ctx.fillStyle = "red";
  ctx.fillRect(x, y - 8, w, 5);
  ctx.fillStyle = "lime";
  ctx.fillRect(x, y - 8, w * (hp / max), 5);
}

function loop() {
  requestAnimationFrame(loop);
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state || !state.players[myId]) return;

  const me = state.players[myId];
  const camX = me.x - canvas.width / 2;
  const camY = me.y - canvas.height / 2;

  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x - camX, p.y - camY, p.w, p.h);
  }

  for (const y of state.yarns) {
    ctx.fillStyle = y.color;
    ctx.beginPath();
    ctx.arc(y.x - camX, y.y - camY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const m of state.mice) {
    ctx.drawImage(imgMouse, m.x - camX, m.y - camY, 40, 40);
    drawHealth(m.x - camX, m.y - camY, 40, m.hp, m.maxHp);
  }

  for (const b of state.birds) {
    ctx.drawImage(imgBird, b.x - camX, b.y - camY, 60, 40);
    drawHealth(b.x - camX, b.y - camY, 60, b.hp, b.maxHp);
  }

  ctx.drawImage(imgPlayer, me.x - camX, me.y - camY, 48, 48);
  drawHealth(me.x - camX, me.y - camY, 48, me.hp, me.maxHp);
}
loop();
