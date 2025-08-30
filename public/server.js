const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // serve static files from "public"

// Home route (index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let bannedUsers = [];

// Login route
app.post("/login", (req, res) => {
  const { username } = req.body;

  if (username === "prabhavdaboi") {
    return res.json({ success: true });
  }

  if (bannedUsers.includes(username)) {
    return res.json({ success: false, message: "You are banned!" });
  }

  res.json({ success: true });
});

// Admin panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "adminpanel.html"));
});

// Ban a user
app.post("/ban", (req, res) => {
  const { username } = req.body;

  if (username === "prabhavdaboi") {
    return res.json({ success: false, message: "You cannot ban the owner!" });
  }

  if (!bannedUsers.includes(username)) {
    bannedUsers.push(username);
  }
  res.json({ success: true });
});

// Unban a user
app.post("/unban", (req, res) => {
  const { username } = req.body;
  bannedUsers = bannedUsers.filter(u => u !== username);
  res.json({ success: true });
});

// Socket.io
io.on("connection", socket => {
  socket.on("chat message", msg => {
    io.emit("chat message", msg);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
