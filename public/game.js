const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let gameState = null;

socket.on("state", state => {
  gameState = state;
  console.log("Mice received:", state.mice);
});

function draw() {
  requestAnimationFrame(draw);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "skyblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (gameState && gameState.mice) {
    gameState.mice.forEach(m => {
      ctx.fillStyle = "gray";
      ctx.fillRect(m.x, m.y, 32, 32);
      ctx.fillStyle = "red";
      ctx.fillRect(m.x, m.y - 6, 32, 4); // health bar example
    });
  }
}

draw();
