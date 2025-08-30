const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const bcrypt = require("bcrypt"); // for secure passwords
const bodyParser = require("body-parser");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(bodyParser.json());

const USERS_FILE = "users.json";
const CHATS_FILE = "chats.json";

// ✅ Load or init users
let users = fs.existsSync(USERS_FILE)
  ? JSON.parse(fs.readFileSync(USERS_FILE))
  : {};
// ✅ Load or init chats
let chats = fs.existsSync(CHATS_FILE)
  ? JSON.parse(fs.readFileSync(CHATS_FILE))
  : {};

// --- AUTH ENDPOINTS ---
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) {
    return res.json({ success: false, error: "Username already exists!" });
  }
  const hash = await bcrypt.hash(password, 10);
  users[username] = { password: hash };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = users[username];
  if (!user) return res.json({ success: false, error: "User not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.json({ success: false, error: "Wrong password" });

  res.json({ success: true, username });
});

// --- SOCKET.IO CHAT ---
io.on("connection", (socket) => {
  console.log("🔗 User connected");

  socket.on("join room", (room) => {
    socket.join(room);
    console.log(`User joined ${room}`);

    // send old messages from file
    if (chats[room]) {
      chats[room].forEach((msg) => {
        socket.emit("chat message", msg);
      });
    }
  });

  socket.on("leave room", (room) => {
    socket.leave(room);
    console.log(`User left ${room}`);
  });

  socket.on("chat message", (data) => {
    // save chat to memory
    if (!chats[data.room]) chats[data.room] = [];
    chats[data.room].push(data);

    // write to file
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));

    // broadcast
    io.to(data.room).emit("chat message", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected");
  });
});

// ✅ Use Render’s port
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
