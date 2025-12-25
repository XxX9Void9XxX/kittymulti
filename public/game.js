console.log("GAME.JS LOADED");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

ctx.fillStyle = "red";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = "white";
ctx.font = "40px Arial";
ctx.fillText("IF YOU SEE THIS, CANVAS WORKS", 50, 100);
