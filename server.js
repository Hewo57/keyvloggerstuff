const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(bodyParser.json());

const USERS_FILE = "users.json";
const CHATS_FILE = "chats.json";

// --- load or init storage ---
let users = fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : {};
let chats = fs.existsSync(CHATS_FILE)
  ? JSON.parse(fs.readFileSync(CHATS_FILE))
  : { groups: { general: [] }, private: {} };

function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function saveChats() {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
}
function dmKey(a, b) {
  return [a, b].sort((x, y) => x.localeCompare(y)).join(":");
}

// --- auth ---
app.post("/signup", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.json({ success: false, error: "Missing fields" });
  if (users[username]) return res.json({ success: false, error: "Username already exists" });
  const hash = await bcrypt.hash(password, 10);
  users[username] = { password: hash };
  saveUsers();
  res.json({ success: true });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = users[username];
  if (!user) return res.json({ success: false, error: "User not found" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.json({ success: false, error: "Wrong password" });
  res.json({ success: true, username });
});

// --- simple lists for UI ---
app.get("/users", (req, res) => {
  res.json(Object.keys(users));
});

app.get("/groups", (req, res) => {
  res.json(Object.keys(chats.groups));
});

app.post("/groups", (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.json({ success: false, error: "No name" });
  const key = name.trim().toLowerCase();
  if (chats.groups[key]) return res.json({ success: false, error: "Group exists" });
  chats.groups[key] = [];
  saveChats();
  res.json({ success: true, name: key });
});

// --- socket.io ---
io.on("connection", (socket) => {
  let currentRoom = null;

  socket.on("join group", ({ username, group }) => {
    const room = `group:${group}`;
    if (currentRoom) socket.leave(currentRoom);
    socket.join(room);
    currentRoom = room;

    const history = chats.groups[group] || [];
    history.forEach((m) => socket.emit("chat message", m));
  });

  socket.on("join dm", ({ me, other }) => {
    const key = dmKey(me, other);
    const room = `dm:${key}`;
    if (currentRoom) socket.leave(currentRoom);
    socket.join(room);
    currentRoom = room;

    const history = chats.private[key] || [];
    history.forEach((m) => socket.emit("chat message", m));
  });

  socket.on("chat message", (data) => {
    // data: { kind: 'group'|'dm', to: groupName|otherUser, from: username, text: string }
    if (!data || !data.text) return;

    let payload = {
      kind: data.kind,
      room: null,
      from: data.from,
      to: data.to,
      text: data.text,
      ts: Date.now(),
    };

    if (data.kind === "group") {
      const group = data.to;
      payload.room = `group:${group}`;
      if (!chats.groups[group]) chats.groups[group] = [];
      chats.groups[group].push(payload);
      io.to(payload.room).emit("chat message", payload);
    } else {
      const key = dmKey(data.from, data.to);
      payload.room = `dm:${key}`;
      if (!chats.private[key]) chats.private[key] = [];
      chats.private[key].push(payload);
      io.to(payload.room).emit("chat message", payload);
    }
    saveChats();
  });

  socket.on("disconnect", () => {
    // nothing special
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
