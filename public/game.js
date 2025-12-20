const socket = io();
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Input
const keys = {};
document.addEventListener("keydown", e=>keys[e.key]=true);
document.addEventListener("keyup", e=>keys[e.key]=false);

let mouseX=0, mouseY=0;
canvas.addEventListener("mousemove", e=>{ mouseX=e.offsetX; mouseY=e.offsetY; });
canvas.addEventListener("click", e=>{
  socket.emit("shoot",{ x: mouseX+cameraX, y: mouseY+cameraY });
});

// Sprites
const playerSprite = new Image(); playerSprite.src="kiitygame.png";
const mouseSprite = new Image(); mouseSprite.src="mouse.png";
let playerReady=false, mouseReady=false;
playerSprite.onload=()=>playerReady=true;
mouseSprite.onload=()=>mouseReady=true;

let gameState=null, myId=null;
let cameraX=0,cameraY=0;
socket.on("connect",()=>myId=socket.id);
socket.on("state",state=>gameState=state);

// Send input
setInterval(()=>{
  if(!gameState||!gameState.players[myId]) return;
  socket.emit("input",{
    left: keys["a"]||keys["ArrowLeft"],
    right: keys["d"]||keys["ArrowRight"],
    jump: keys["w"]||keys["ArrowUp"]||keys[" "]
  });
},1000/60);

// Draw
function draw(){
  requestAnimationFrame(draw);
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#5c94fc"; ctx.fillRect(0,0,canvas.width,canvas.height);

  if(!gameState) return;
  const { players, mice, platforms, world, projectiles, score }=gameState;
  const me = players[myId];

  if(me){ 
    cameraX=Math.max(0,Math.min(world.width-canvas.width,me.x-canvas.width/2));
    cameraY=Math.max(0,Math.min(world.height-canvas.height,me.y-canvas.height/2)); 
  }

  ctx.save(); ctx.translate(-cameraX,-cameraY);

  // Platforms
  ctx.fillStyle="#654321"; platforms.forEach(p=>ctx.fillRect(p.x,p.y,p.w,p.h));

  // Projectiles
  ctx.fillStyle="#ff69b4"; projectiles.forEach(p=>{ ctx.beginPath(); ctx.arc(p.x,p.y,6,0,Math.PI*2); ctx.fill(); });

  // Mice
  mice.forEach(m=>{
    if(mouseReady) ctx.drawImage(mouseSprite,m.x,m.y,32,32);
    else ctx.fillStyle="gray", ctx.fillRect(m.x,m.y,32,32);

    // Mouse health bar
    ctx.fillStyle="red"; ctx.fillRect(m.x,m.y-6,32,4);
    ctx.fillStyle="lime"; ctx.fillRect(m.x,m.y-6,32*(m.hp/m.maxHp),4);
  });

  // Players
  for(const id in players){
    const p=players[id];

    ctx.save();
    let flip = false;
    if (id === myId) flip = (mouseX + cameraX) < (p.x + 24);
    if(flip){
      ctx.translate(p.x+48,p.y);
      ctx.scale(-1,1);
      if(playerReady) ctx.drawImage(playerSprite,0,0,48,48);
      else ctx.fillStyle="orange", ctx.fillRect(0,0,48,48);
    } else {
      if(playerReady) ctx.drawImage(playerSprite,p.x,p.y,48,48);
      else ctx.fillStyle="orange", ctx.fillRect(p.x,p.y,48,48);
    }

    // Health bar
    ctx.fillStyle="red"; ctx.fillRect(p.x,p.y-10,48,6);
    ctx.fillStyle="lime"; ctx.fillRect(p.x,p.y-10,48*(p.hp/100),6);

    // Name tag
    ctx.fillStyle="white"; ctx.font="12px Arial"; ctx.textAlign="center";
    ctx.fillText(p.name,p.x+24,p.y-15);

    ctx.restore();
  }

  // Team Score
  ctx.fillStyle="white"; ctx.font="20px Arial"; ctx.fillText("Team Score: "+score,20,30);

  ctx.restore();
}

draw();
