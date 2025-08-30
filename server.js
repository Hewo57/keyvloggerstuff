const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(bodyParser.json());

let bannedUsers = [];

// login route
app.post("/login", (req, res) => {
  const { username } = req.body;
  if (bannedUsers.includes(username)) {
    return res.json({ success: false, message: "You are banned." });
  }
  return res.json({ success: true });
});

// socket.io chat
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

