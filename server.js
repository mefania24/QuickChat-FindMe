const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for Render / cloud monitoring
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// In-memory data structures (ephemeral - nothing persisted)
// Queue of socket IDs waiting for a match
let waitingQueue = [];

// activeRooms map: roomId -> { u1: socketId, u2: socketId, startTime: timestamp }
const activeRooms = new Map();

// userToRoom map: socketId -> roomId
const userToRoom = new Map();

// Helper to remove a socket from the waiting queue
function removeFromQueue(socketId) {
  const index = waitingQueue.indexOf(socketId);
  if (index !== -1) {
    waitingQueue.splice(index, 1);
    return true;
  }
  return false;
}

// Helper to broadcast online statistics
function broadcastStats() {
  const onlineCount = io.engine.clientsCount;
  const inChatCount = activeRooms.size * 2;
  const inQueueCount = waitingQueue.length;
  io.emit('stats_update', {
    online: onlineCount,
    inChat: inChatCount,
    waiting: inQueueCount
  });
}

io.on('connection', (socket) => {
  broadcastStats();

  // Find match request
  socket.on('find_match', () => {
    // If user is already in a room, prevent queueing
    if (userToRoom.has(socket.id)) {
      socket.emit('error_notice', { message: 'You are already in a chat.' });
      return;
    }

    // If already in queue, ignore
    if (waitingQueue.includes(socket.id)) {
      return;
    }

    // Filter out disconnected or stale sockets from waiting queue
    while (waitingQueue.length > 0) {
      const candidateId = waitingQueue.shift();
      const candidateSocket = io.sockets.sockets.get(candidateId);

      // Verify candidate is still connected and not the same user
      if (candidateSocket && candidateId !== socket.id && !userToRoom.has(candidateId)) {
        // MATCH FOUND!
        const roomId = 'room_' + crypto.randomUUID();

        // Join both sockets to room
        socket.join(roomId);
        candidateSocket.join(roomId);

        // Map users to room
        userToRoom.set(socket.id, roomId);
        userToRoom.set(candidateId, roomId);

        // Store active room
        activeRooms.set(roomId, {
          u1: socket.id,
          u2: candidateId,
          startTime: Date.now()
        });

        // Notify both parties
        socket.emit('match_found', { roomId });
        candidateSocket.emit('match_found', { roomId });

        broadcastStats();
        return;
      }
    }

    // No valid match found, add to waiting queue
    waitingQueue.push(socket.id);
    socket.emit('waiting_for_match');
    broadcastStats();
  });

  // Cancel search
  socket.on('cancel_find', () => {
    removeFromQueue(socket.id);
    socket.emit('search_cancelled');
    broadcastStats();
  });

  // Send message
  socket.on('send_message', (data) => {
    const roomId = userToRoom.get(socket.id);
    if (!roomId) return;

    const text = (data && data.text ? String(data.text).trim() : '');
    if (!text || text.length > 2000) return;

    // Send only to the other user in the room (do not save on server)
    socket.to(roomId).emit('receive_message', {
      text,
      timestamp: Date.now()
    });
  });

  // Typing indicator
  socket.on('typing_status', (data) => {
    const roomId = userToRoom.get(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit('partner_typing', {
      isTyping: !!data.isTyping
    });
  });

  // User voluntarily clicks "End" button
  socket.on('end_chat', () => {
    const roomId = userToRoom.get(socket.id);
    if (!roomId) {
      socket.emit('chat_ended_self');
      return;
    }

    const room = activeRooms.get(roomId);
    if (room) {
      const partnerId = room.u1 === socket.id ? room.u2 : room.u1;
      const partnerSocket = io.sockets.sockets.get(partnerId);

      // Inform partner that the other person left
      if (partnerSocket) {
        partnerSocket.emit('partner_left');
        partnerSocket.leave(roomId);
      }
      userToRoom.delete(partnerId);
      activeRooms.delete(roomId);
    }

    // Clean up current user
    socket.leave(roomId);
    userToRoom.delete(socket.id);

    // Notify user who clicked end so they immediately return to main page
    socket.emit('chat_ended_self');
    broadcastStats();
  });

  // User who saw "person leave" clicks "Leave"
  socket.on('leave_room', () => {
    const roomId = userToRoom.get(socket.id);
    if (roomId) {
      socket.leave(roomId);
      userToRoom.delete(socket.id);
      activeRooms.delete(roomId);
    }
    socket.emit('left_room_confirmed');
    broadcastStats();
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    removeFromQueue(socket.id);

    const roomId = userToRoom.get(socket.id);
    if (roomId) {
      const room = activeRooms.get(roomId);
      if (room) {
        const partnerId = room.u1 === socket.id ? room.u2 : room.u1;
        const partnerSocket = io.sockets.sockets.get(partnerId);

        if (partnerSocket) {
          partnerSocket.emit('partner_left');
          partnerSocket.leave(roomId);
        }
        userToRoom.delete(partnerId);
        activeRooms.delete(roomId);
      }
      userToRoom.delete(socket.id);
    }

    broadcastStats();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`QuickChat server running on port ${PORT}`);
});
