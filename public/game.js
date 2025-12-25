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

const playerImg = new Image();
playerImg.src = "kiitygame.png";

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);

socket.on("connect", () => myId = socket.id);
socket.on("state", s => state = s);

// INPUT LOOP
setInterval(() => {
  if (!gameStarted) return;

  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp
  });
}, 1000 / 60);

// MAIN DRAW LOOP
function loop() {
  requestAnimationFrame(loop);

  // ALWAYS DRAW BACKGROUND
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!gameStarted) {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("Click Play to Start", 40, 60);
    return;
  }

  if (!state || !state.players || !state.players[myId]) {
    ctx.fillStyle = "black";
    ctx.font = "30px Arial";
    ctx.fillText("Loading world...", 40, 60);
    return;
  }

  const me = state.players[myId];
  camera.x = me.x - canvas.width / 2;
  camera.y = me.y - canvas.height / 2;

  // PLATFORMS
  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x - camera.x, p.y - camera.y, p.w, p.h);
  }

  // PLAYER
  ctx.drawImage(
    playerImg,
    me.x - camera.x,
    me.y - camera.y,
    48,
    48
  );
}

loop();
