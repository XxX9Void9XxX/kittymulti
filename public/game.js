const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = innerWidth;
canvas.height = innerHeight;

const socket = io();

let myId = null;
let state = null;
let started = false;

// ---------------- MENU ----------------
document.getElementById("playBtn").onclick = () => {
  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Enter a username!");

  document.getElementById("menu").style.display = "none";
  document.getElementById("chatInput").style.display = "block";

  socket.emit("setName", name);
  started = true;
};

// ---------------- INPUT ----------------
const keys = {};
addEventListener("keydown", e => {
  keys[e.key] = true;

  if (e.key === "Enter") {
    const chat = document.getElementById("chatInput");
    if (chat === document.activeElement) {
      if (chat.value.trim()) {
        socket.emit("chat", chat.value);
        chat.value = "";
      }
      chat.blur();
    } else {
      chat.focus();
    }
  }
});

addEventListener("keyup", e => keys[e.key] = false);

addEventListener("mousedown", e => {
  if (!started) return;
  socket.emit("shoot", {
    x: e.clientX + camera.x,
    y: e.clientY + camera.y
  });
});

// ---------------- CAMERA ----------------
const camera = { x: 0, y: 0 };

// ---------------- NETWORK ----------------
socket.on("connect", () => myId = socket.id);

socket.on("state", s => state = s);

socket.on("chat", msg => {
  const box = document.getElementById("chatMessages");
  const div = document.createElement("div");
  div.textContent = msg;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
});

// ---------------- GAME LOOP ----------------
function loop() {
  requestAnimationFrame(loop);
  if (!state || !state.players[myId]) return;

  const me = state.players[myId];

  camera.x = me.x - canvas.width / 2;
  camera.y = me.y - canvas.height / 2;

  socket.emit("input", {
    left: keys.a,
    right: keys.d,
    jump: keys.w
  });

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Platforms
  ctx.fillStyle = "#444";
  state.platforms.forEach(p =>
    ctx.fillRect(p.x, p.y, p.w, p.h)
  );

  // Players
  for (const id in state.players) {
    const p = state.players[id];
    if (p.dead) continue;

    ctx.fillStyle = id === myId ? "#00ffcc" : "#fff";
    ctx.drawImage(kiity, p.x, p.y, 48, 48);

    // Name
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x + 24, p.y - 10);

    // HP
    ctx.fillStyle = "red";
    ctx.fillRect(p.x, p.y - 5, 48 * (p.hp / 100), 4);
  }

  // Mice
  state.mice.forEach(m => {
    if (m.dead) return;
    ctx.save();
    ctx.translate(m.x + 16, m.y);
    ctx.scale(m.vx < 0 ? -1 : 1, 1);
    ctx.drawImage(mouseImg, -16, 0, 32, 32);
    ctx.restore();

    ctx.fillStyle = "red";
    ctx.fillRect(m.x, m.y - 4, 32 * (m.hp / m.maxHp), 3);
  });

  // Birds
  state.birds.forEach(b => {
    if (b.dead) return;
    ctx.save();
    ctx.translate(b.x + 24, b.y);
    ctx.scale(b.vx < 0 ? -1 : 1, 1);
    ctx.drawImage(birdImg, -24, 0, 48, 48);
    ctx.restore();
  });

  // Yarn
  state.projectiles.forEach(pr => {
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

const kiity = new Image();
kiity.src = "kiitygame.png";

const mouseImg = new Image();
mouseImg.src = "mouse.png";

const birdImg = new Image();
birdImg.src = "birds.png";

loop();
