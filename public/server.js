const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");

app.use(express.static("public"));
app.use(express.json());

// TEMP database (in-memory)
let users = {};
let groups = ["general"];

// --- Auth Routes ---
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, error: "Missing fields" });
  }
  if (users[username]) {
    return res.json({ success: false, error: "User already exists" });
  }
  users[username] = { password };
  res.json({ success: true });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.json({ success: false, error: "Missing fields" });
  }
  if (!users[username] || users[username].password !== password) {
    return res.json({ success: false, error: "Invalid username or password" });
  }
  res.json({ success: true, username });
});

// --- Groups ---
app.get("/groups", (req, res) => {
  res.json(groups);
});

app.post("/groups", (req, res) => {
  const { name } = req.body;
  if (!name) return res.json({ success: false, error: "Missing group name" });
  if (groups.includes(name)) return res.json({ success: false, error: "Group already exists" });
  groups.push(name);
  res.json({ success: true });
});

// --- Users ---
app.get("/users", (req, res) => {
  res.json(Object.keys(users));
});

// --- Sockets ---
io.on("connection", (socket) => {
  console.log("User connected");

  socket.on("join group", ({ username, group }) => {
    socket.join(group);
  });

  socket.on("join dm", ({ me, other }) => {
    const room = [me, other].sort().join("-");
    socket.join(room);
  });

  socket.on("chat message", (msg) => {
    if (msg.kind === "group") {
      io.to(msg.to).emit("chat message", msg);
    } else if (msg.kind === "dm") {
      const room = [msg.from, msg.to].sort().join("-");
      io.to(room).emit("chat message", msg);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// --- Run ---
const PORT = 3000;
http.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


