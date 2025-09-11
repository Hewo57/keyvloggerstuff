// server.js (updated)
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http);
const path = require("path");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// TEMP in-memory DB (replace with real DB later)
let users = {};        // { username: { password } }
let groups = ["general"];

// --- Auth Routes ---
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Missing fields" });
  if (users[username]) return res.json({ success: false, error: "User already exists" });
  users[username] = { password };
  return res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, error: "Missing fields" });
  if (!users[username] || users[username].password !== password) {
    return res.json({ success: false, error: "Invalid username or password" });
  }
  return res.json({ success: true, username });
});

// Groups & users
app.get("/groups", (req, res) => res.json(groups));
app.post("/groups", (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: false, error: "Missing group name" });
  if (groups.includes(name)) return res.json({ success: false, error: "Group already exists" });
  groups.push(name);
  return res.json({ success: true });
});
app.get("/users", (req, res) => res.json(Object.keys(users)));

// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  //
  // --- VIDEO ROOM / WebRTC SIGNALING ---
  //
  // join-room: payload { room, user } -> joins socket to the room, and returns other socket ids
  socket.on("join-room", ({ room, user }) => {
    if (!room) return;
    socket.join(room);
    // gather other socket ids in that room (excluding self)
    const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);
    const otherIds = clients.filter(id => id !== socket.id);
    // send back existing peer ids so client can create offers to each
    socket.emit("joined", { otherIds });
    // notify others optionally (could be used to show presence)
    socket.to(room).emit("peer-joined", { id: socket.id, user });
    console.log(`Socket ${socket.id} joined room ${room} (user=${user})`);
  });

  socket.on("leave-room", ({ room }) => {
    if (!room) return;
    socket.leave(room);
    socket.to(room).emit("peer-left", { id: socket.id });
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  // targeted signaling: each message must include `to` (socket id of target)
  socket.on("offer", (data) => {
    // data: { to, sdp }
    if (data && data.to) {
      io.to(data.to).emit("offer", { from: socket.id, sdp: data.sdp });
    }
  });

  socket.on("answer", (data) => {
    // data: { to, sdp }
    if (data && data.to) {
      io.to(data.to).emit("answer", { from: socket.id, sdp: data.sdp });
    }
  });

  socket.on("candidate", (data) => {
    // data: { to, candidate }
    if (data && data.to) {
      io.to(data.to).emit("candidate", { from: socket.id, candidate: data.candidate });
    }
  });

  //
  // --- CHAT (groups + dms) ---
  //
  socket.on("join group", ({ username, group }) => {
    if (!group) return;
    socket.join(group);
    console.log(`Socket ${socket.id} (${username}) joined group ${group}`);
  });

  socket.on("join dm", ({ me, other }) => {
    if (!me || !other) return;
    const room = [me, other].sort().join("-");
    socket.join(room);
    console.log(`Socket ${socket.id} joined DM room ${room}`);
  });

  socket.on("chat message", (msg) => {
    if (!msg || !msg.kind) return;
    if (msg.kind === "group") {
      io.to(msg.to).emit("chat message", msg);
    } else if (msg.kind === "dm") {
      const room = [msg.from, msg.to].sort().join("-");
      io.to(room).emit("chat message", msg);
    }
  });

  //
  // --- DISCONNECT ---
  //
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    // optionally broadcast leave events for any rooms (not implemented)
  });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));




