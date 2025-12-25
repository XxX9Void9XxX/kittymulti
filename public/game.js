const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 🔥 FIX: real fullscreen + DPI
function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
addEventListener("resize", resize);

const socket = io();
let state = null;
let myId = null;

const camera = { x: 0, y: 0 };
const keys = {};

const playerImg = new Image();
playerImg.src = "kiitygame.png";

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);

setInterval(() => {
  if (!window.gameStarted) return;
  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp
  });
}, 1000 / 60);

function loop() {
  requestAnimationFrame(loop);

  // FULLSCREEN SKY (no gray possible now)
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!window.gameStarted) {
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("Click Play to Start", 40, 60);
    return;
  }

  if (!state || !state.players || !state.players[myId]) {
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("Loading world...", 40, 60);
    return;
  }

  const me = state.players[myId];
  camera.x = me.x - innerWidth / 2;
  camera.y = me.y - innerHeight / 2;

  // Platforms
  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(
      p.x - camera.x,
      p.y - camera.y,
      p.w,
      p.h
    );
  }

  // Player
  ctx.drawImage(
    playerImg,
    me.x - camera.x,
    me.y - camera.y,
    48,
    48
  );
}

loop();
