const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from "public" folder
app.use(express.static(path.join(__dirname, "public")));

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

