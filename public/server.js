const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

let bannedUsers = new Set();

// Serve index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Serve admin panel
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/adminpanel.html"));
});

// API to ban a user
app.post("/ban", (req, res) => {
  const { username } = req.body;
  if (username) {
    bannedUsers.add(username);
    res.json({ success: true, message: `${username} has been banned.` });
  } else {
    res.json({ success: false, message: "No username provided." });
  }
});

io.on("connection", (socket) => {
  socket.on("setUsername", (username) => {
    if (bannedUsers.has(username)) {
      socket.emit("banned");
      socket.disconnect(true);
    } else {
      socket.username = username;
    }
  });

  socket.on("chat message", (msg) => {
    if (socket.username && !bannedUsers.has(socket.username)) {
      io.emit("chat message", { user: socket.username, text: msg });
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
