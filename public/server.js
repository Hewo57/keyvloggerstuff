const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");

// Example: Sequelize DB
// Replace with your actual DB setup
const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize("sqlite:./db.sqlite");

// Define user model
const User = sequelize.define("User", {
  username: { type: DataTypes.STRING, unique: true },
  banned: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    secret: "supersecret", // change this
    resave: false,
    saveUninitialized: true
  })
);

app.use(express.static(path.join(__dirname, "public")));

// --- Middleware to check if logged-in user is you (admin) ---
function requireAdmin(req, res, next) {
  if (req.user && req.user.username === "prabhavdaboi") {
    return next();
  }
  return res.status(403).send("Not authorized");
}

// --- Example middleware to mock login ---
// Replace with real auth system
app.use(async (req, res, next) => {
  if (!req.user && req.session.username) {
    req.user = await User.findOne({ where: { username: req.session.username } });
  }
  next();
});

// --- Route: fake login for testing ---
app.post("/login", async (req, res) => {
  const { username } = req.body;
  let user = await User.findOne({ where: { username } });
  if (!user) {
    user = await User.create({ username });
  }
  req.session.username = username;
  req.user = user;
  res.json({ message: "Logged in", user });
});

// --- Route: get current user ---
app.get("/me", (req, res) => {
  if (!req.user) return res.json(null);
  res.json({ username: req.user.username, banned: req.user.banned });
});

// --- Protect admin.html ---
app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// --- Admin APIs ---
app.get("/admin/users", requireAdmin, async (req, res) => {
  const users = await User.findAll();
  res.json(users);
});

app.post("/admin/ban/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await User.update({ banned: true }, { where: { id } });
  res.json({ success: true, message: "User banned" });
});

app.post("/admin/unban/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  await User.update({ banned: false }, { where: { id } });
  res.json({ success: true, message: "User unbanned" });
});

// --- Middleware to block banned users ---
app.use((req, res, next) => {
  if (req.user && req.user.banned) {
    return res.status(403).json({ message: "You are banned." });
  }
  next();
});

// --- Home route ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Sync DB and start server ---
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});

