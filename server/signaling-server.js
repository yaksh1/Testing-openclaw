// SyncSpace - Simple Signaling Server (Node.js)
// This can run on free tiers: Render, Railway, Fly.io, or Glitch

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory store (resets on deploy, but that's fine for MVP)
const pairings = new Map(); // code -> { peer1, peer2, created }
const sockets = new Map(); // socket.id -> { code, peerId }

// Cleanup old pairings every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [code, data] of pairings) {
    if (now - data.created > 10 * 60 * 1000) { // 10 min expiry
      pairings.delete(code);
    }
  }
}, 5 * 60 * 1000);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Create a pairing
  socket.on('create-pairing', (peerId, callback) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    pairings.set(code, {
      peer1: peerId,
      peer2: null,
      socket1: socket.id,
      socket2: null,
      created: Date.now()
    });
    sockets.set(socket.id, { code, peerId, role: 'peer1' });
    callback({ success: true, code });
    console.log('Pairing created:', code, 'by', peerId);
  });

  // Join a pairing
  socket.on('join-pairing', (code, peerId, callback) => {
    const pairing = pairings.get(code);
    
    if (!pairing) {
      callback({ success: false, error: 'Code not found' });
      return;
    }
    
    if (pairing.peer2) {
      callback({ success: false, error: 'Code already used' });
      return;
    }
    
    pairing.peer2 = peerId;
    pairing.socket2 = socket.id;
    sockets.set(socket.id, { code, peerId, role: 'peer2' });
    
    // Notify peer1 that peer2 joined
    io.to(pairing.socket1).emit('peer-joined', peerId);
    
    callback({ success: true, peerId: pairing.peer1 });
    console.log('Peer joined:', code, peerId);
  });

  // WebRTC signaling
  socket.on('offer', (offer, targetPeerId) => {
    const myData = sockets.get(socket.id);
    if (!myData) return;
    
    const pairing = pairings.get(myData.code);
    if (!pairing) return;
    
    const targetSocket = myData.role === 'peer1' ? pairing.socket2 : pairing.socket1;
    if (targetSocket) {
      io.to(targetSocket).emit('offer', offer, myData.peerId);
    }
  });

  socket.on('answer', (answer, targetPeerId) => {
    const myData = sockets.get(socket.id);
    if (!myData) return;
    
    const pairing = pairings.get(myData.code);
    if (!pairing) return;
    
    const targetSocket = myData.role === 'peer1' ? pairing.socket2 : pairing.socket1;
    if (targetSocket) {
      io.to(targetSocket).emit('answer', answer, myData.peerId);
    }
  });

  socket.on('ice-candidate', (candidate, targetPeerId) => {
    const myData = sockets.get(socket.id);
    if (!myData) return;
    
    const pairing = pairings.get(myData.code);
    if (!pairing) return;
    
    const targetSocket = myData.role === 'peer1' ? pairing.socket2 : pairing.socket1;
    if (targetSocket) {
      io.to(targetSocket).emit('ice-candidate', candidate, myData.peerId);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    const myData = sockets.get(socket.id);
    if (myData) {
      const pairing = pairings.get(myData.code);
      if (pairing) {
        const targetSocket = myData.role === 'peer1' ? pairing.socket2 : pairing.socket1;
        if (targetSocket) {
          io.to(targetSocket).emit('peer-disconnected');
        }
      }
      sockets.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`SyncSpace signaling server running on port ${PORT}`);
});
