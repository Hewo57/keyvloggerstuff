const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// In-memory stores (replace with DB later if needed)
const users = {};   // username -> { passwordHash }
const groups = ["general"]; // default group
const bans = new Set(); // usernames that are banned

// --- Auth routes ---
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, error: "Missing fields" });
  }
  if (users[username]) {
    return res.json({ success: false, error: "User exists" });
  }
  const hash = await bcrypt.hash(password, 10);
  users[username] = { passwordHash: hash };
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (bans.has(username)) {
    return res.json({ success: false, error: "You are banned" });
  }
  const user = users[username];
  if (!user) {
    return res.json({ success: false, error: "No such user" });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.json({ success: false, error: "Wrong password" });
  }
  res.json({ success: true, username });
});

// --- Data routes ---
app.get("/users", (req, res) => {
  res.json(Object.keys(users));
});

app.get("/groups", (req, res) => {
  res.json(groups);
});

app.post("/groups", (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: false, error: "Missing name" });
  if (groups.includes(name)) {
    return res.json({ success: false, error: "Group exists" });
  }
  groups.push(name);
  res.json({ success: true });
});

// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join dm", ({ me, other }) => {
    const room = dmRoom(me, other);
    socket.join(room);
  });

  socket.on("join group", ({ username, group }) => {
    if (groups.includes(group)) {
      socket.join(group);
    }
  });

  socket.on("chat message", (msg) => {
    if (msg.kind === "dm") {
      const room = dmRoom(msg.from, msg.to);
      io.to(room).emit("chat message", msg);
    } else if (msg.kind === "group") {
      io.to(msg.to).emit("chat message", msg);
    }
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

// Helper: stable DM room id
function dmRoom(a, b) {
  return [a, b].sort().join("#");
}

// Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

