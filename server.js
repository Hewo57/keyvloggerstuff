const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public" folder
const path = require("path");
console.log("Serving static files from:", path.join(__dirname, "public"));
app.use(express.static("public"));

// Default route → load index.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("🟢 A user connected");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg); // broadcast to everyone
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected");
  });
});

// IMPORTANT: use Render's port or fallback to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});



