const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

const mice = [
  { id: "m1", x: 100, y: 100 },
  { id: "m2", x: 200, y: 150 },
  { id: "m3", x: 300, y: 200 }
];

io.on("connection", socket => {
  console.log("New client connected:", socket.id);
  // Send mice every second
  setInterval(() => {
    socket.emit("state", { mice });
  }, 1000);
});

server.listen(3000, () => console.log("Server running on http://localhost:3000"));
