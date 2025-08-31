const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json());

// In-memory store
let users = {};     // { username: passwordHash }
let groups = ["general"];
let messages = {};  // { "dm:alice:bob": [...], "group:general": [...] }

// --- Auth ---
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  if (users[username]) return res.json({ success: false, error: "User exists" });
  const hash = await bcrypt.hash(password, 10);
  users[username] = hash;
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const hash = users[username];
  if (!hash) return res.json({ success: false, error: "No such user" });
  const match = await bcrypt.compare(password, hash);
  if (!match) return res.json({ success: false, error: "Wrong password" });
  res.json({ success: true, username });
});

app.get("/users", (req, res) => {
  res.json(Object.keys(users));
});

app.get("/groups", (req, res) => {
  res.json(groups);
});

app.post("/groups", (req, res) => {
  const { name } = req.body;
  if (groups.includes(name)) return res.json({ success: false, error: "Group exists" });
  groups.push(name);
  res.json({ success: true });
});

// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join dm", ({ me, other }) => {
    const room = `dm:${[me, other].sort().join(":")}`;
    socket.join(room);
    if (!messages[room]) messages[room] = [];
    socket.emit("chat history", messages[room]);
  });

  socket.on("join group", ({ username, group }) => {
    const room = `group:${group}`;
    socket.join(room);
    if (!messages[room]) messages[room] = [];
    socket.emit("chat history", messages[room]);
  });

  socket.on("chat message", (m) => {
    const room =
      m.kind === "dm"
        ? `dm:${[m.from, m.to].sort().join(":")}`
        : `group:${m.to}`;
    if (!messages[room]) messages[room] = [];
    messages[room].push(m);
    io.to(room).emit("chat message", m);
  });

  // --- Video Chat Signaling ---
  socket.on("video-offer", (offer) => {
    socket.broadcast.emit("video-offer", offer);
  });

  socket.on("video-answer", (answer) => {
    socket.broadcast.emit("video-answer", answer);
  });

  socket.on("ice-candidate", (candidate) => {
    socket.broadcast.emit("ice-candidate", candidate);
  });

  socket.on("disconnect", () => {
    console.log("a user disconnected");
  });
});

const PORT = process.env.PORT || 10000;
http.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

