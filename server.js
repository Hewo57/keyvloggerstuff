// server.js
const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcrypt');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// (your existing chat data routes / auth should remain here - keep previous Rekkit server code)
// For brevity I'm focusing on Socket.IO video signaling additions below.
// Make sure to keep the rest of your chat server routes from your prior server.js.

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // ---------- VIDEO ROOM SIGNALING ----------
  socket.on('join', ({ room, user }) => {
    socket.join(room);
    // list other socket ids in the room except self
    const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);
    const otherIds = clients.filter(id => id !== socket.id);

    // Tell the joining client who else is in the room
    socket.emit('joined', { otherIds });

    // notify others that this socket joined (optional)
    // socket.to(room).emit('user-joined', { id: socket.id, user });
  });

  socket.on('leave', ({ room }) => {
    socket.leave(room);
    socket.to(room).emit('left', { id: socket.id });
  });

  // direct relay to specific target
  socket.on('offer', ({ to, sdp, room }) => {
    io.to(to).emit('offer', { from: socket.id, sdp });
  });

  socket.on('answer', ({ to, sdp, room }) => {
    io.to(to).emit('answer', { from: socket.id, sdp });
  });

  socket.on('candidate', ({ to, candidate, room }) => {
    io.to(to).emit('candidate', { from: socket.id, candidate });
  });

  // ---------- (keep your chat events below) ----------
  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log('Server listening on', PORT));


