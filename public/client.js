const socket = io();

socket.on('chat message', (msg) => {
  console.log('Message:', msg);
  // You can add code to display the message in the chat UI here
});

function sendMessage(message) {
  socket.emit('chat message', message);
}
