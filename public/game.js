const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// FORCE REAL FULLSCREEN
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

const socket = io();
let state = null;
let myId = null;

const camera = { x: 0, y: 0 };
const keys = {};

// IMAGES
const playerImg = new Image();
playerImg.src = "kiitygame.png";

// INPUT
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

socket.on("connect", () => {
  myId = socket.id;
  console.log("Connected:", myId);
});

socket.on("state", s => {
  state = s;
});

// SEND INPUT
setInterval(() => {
  if (!window.gameStarted) return;

  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp
  });
}, 1000 / 60);

// MAIN LOOP
function loop() {
  requestAnimationFrame(loop);

  // ALWAYS DRAW SKY
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // DEBUG RECT (YOU SHOULD SEE THIS NO MATTER WHAT)
  ctx.fillStyle = "red";
  ctx.fillRect(20, 20, 50, 50);

  if (!window.gameStarted) {
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("Click Play to Start", 40, 120);
    return;
  }

  if (!state || !state.players || !state.players[myId]) {
    ctx.fillStyle = "black";
    ctx.font = "32px Arial";
    ctx.fillText("Loading world...", 40, 120);
    return;
  }

  const me = state.players[myId];
  camera.x = me.x - canvas.width / 2;
  camera.y = me.y - canvas.height / 2;

  // PLATFORMS
  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(
      p.x - camera.x,
      p.y - camera.y,
      p.w,
      p.h
    );
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
