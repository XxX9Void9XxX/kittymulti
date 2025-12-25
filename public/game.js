console.log("game.js running");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

// SOCKET
const socket = io();
let state = null;
let myId = null;

// CAMERA
const camera = { x: 0, y: 0 };

// PLAYER IMAGE
const playerImg = new Image();
playerImg.src = "kiitygame.png";

// INPUT
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// SOCKET EVENTS
socket.on("connect", () => {
  myId = socket.id;
  console.log("Connected as", myId);
});

socket.on("state", s => {
  state = s;
});

// SEND INPUT
setInterval(() => {
  if (!state || !myId) return;

  socket.emit("input", {
    left: keys.a || keys.ArrowLeft,
    right: keys.d || keys.ArrowRight,
    jump: keys.w || keys[" "] || keys.ArrowUp
  });
}, 1000 / 60);

// DRAW LOOP (ALWAYS DRAWS)
function loop() {
  requestAnimationFrame(loop);

  // SKY
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // DEBUG TEXT (should always show)
  ctx.fillStyle = "black";
  ctx.font = "20px Arial";
  ctx.fillText("Game running", 20, 30);

  if (!state || !state.players || !state.players[myId]) {
    ctx.fillText("Waiting for server...", 20, 60);
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
