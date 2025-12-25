const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
resize(); addEventListener("resize", resize);

const socket = io();
let state, myId;

const keys = {};
let mouse = { x: 0, y: 0, down: false };

addEventListener("keydown", e => keys[e.key] = true);
addEventListener("keyup", e => keys[e.key] = false);
addEventListener("mousemove", e => mouse = e);
addEventListener("mousedown", () => mouse.down = true);
addEventListener("mouseup", () => mouse.down = false);

const imgPlayer = new Image(); imgPlayer.src = "kiitygame.png";
const imgMouse = new Image(); imgMouse.src = "mouse.png";
const imgBird = new Image(); imgBird.src = "birds.png";

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
    color: `hsl(${Math.random()*360},100%,50%)`
  });
}, 1000/60);

/* ---------- CHAT ---------- */
const chatInput = document.createElement("input");
chatInput.placeholder = "Type message...";
chatInput.style.position = "absolute";
chatInput.style.bottom = "0";
chatInput.style.left = "310px";
chatInput.style.width = "200px";
document.body.appendChild(chatInput);

chatInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && chatInput.value.trim() !== "") {
    socket.emit("chat", chatInput.value);
    chatInput.value = "";
  }
});

socket.on("chat", msg => {
  let box = document.getElementById("chat");
  if (!box) {
    box = document.createElement("div");
    box.id = "chat";
    box.style.position = "absolute";
    box.style.bottom = "0";
    box.style.left = "0";
    box.style.width = "300px";
    box.style.maxHeight = "200px";
    box.style.overflowY = "auto";
    box.style.background = "rgba(0,0,0,0.5)";
    box.style.color = "white";
    box.style.fontFamily = "monospace";
    document.body.appendChild(box);
  }
  box.innerHTML += msg + "<br>";
  box.scrollTop = box.scrollHeight;
});

/* ---------- DRAW ---------- */
function drawHealth(x, y, w, hp, max) {
  ctx.fillStyle = "red";
  ctx.fillRect(x, y-8, w, 5);
  ctx.fillStyle = "lime";
  ctx.fillRect(x, y-8, w*(hp/max), 5);
}

function loop() {
  requestAnimationFrame(loop);
  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!state || !state.players[myId]) return;

  const me = state.players[myId];
  const camX = me.x - canvas.width/2;
  const camY = me.y - canvas.height/2;

  // Platforms
  for (const p of state.platforms) {
    ctx.fillStyle = "#654321";
    ctx.fillRect(p.x-camX, p.y-camY, p.w, p.h);
  }

  // Yarn
  for (const y of state.yarns) {
    ctx.fillStyle = y.color;
    ctx.beginPath();
    ctx.arc(y.x-camX, y.y-camY, 6, 0, Math.PI*2);
    ctx.fill();
  }

  // Mice
  for (const m of state.mice) {
    ctx.save();
    ctx.translate(m.x-camX+20, m.y-camY);
    ctx.scale(m.vx<0?-1:1,1);
    ctx.drawImage(imgMouse,-20,0,40,40);
    ctx.restore();
    drawHealth(m.x-camX, m.y-camY, 40, m.hp, m.maxHp);
  }

  // Birds
  for (const b of state.birds) {
    ctx.save();
    ctx.translate(b.x-camX+30, b.y-camY);
    ctx.scale(b.vx<0?-1:1,1);
    ctx.drawImage(imgBird,-30,0,60,40);
    ctx.restore();
    drawHealth(b.x-camX, b.y-camY, 60, b.hp, b.maxHp);
  }

  // Other players
  for (const p of Object.values(state.players)) {
    if (p.id === myId) continue;
    ctx.save();
    ctx.translate(p.x-camX+24, p.y-camY+24);
    ctx.scale(mouse.x < canvas.width/2?-1:1,1);
    ctx.drawImage(imgPlayer,-24,-24,48,48);
    ctx.restore();
    drawHealth(p.x-camX, p.y-camY, 48, p.hp, p.maxHp);
  }

  // Player
  ctx.save();
  ctx.translate(me.x-camX+24, me.y-camY+24);
  ctx.scale(mouse.x < canvas.width/2?-1:1,1);
  ctx.drawImage(imgPlayer,-24,-24,48,48);
  ctx.restore();
  drawHealth(me.x-camX, me.y-camY, 48, me.hp, me.maxHp);
}
loop();
