// SyncSpace - Background Script
// Handles WebRTC connection with Socket.io signaling

const SIGNALING_SERVER = 'https://syncspace-signaling.onrender.com'; // Change this to your server

class SyncSpacePeer {
  constructor() {
    this.socket = null;
    this.connection = null;
    this.dataChannel = null;
    this.myId = null;
    this.partnerId = null;
    this.isOnline = false;
    this.streak = 0;
    this.lastSeen = null;
    this.reconnectAttempts = 0;
  }

  async init() {
    const stored = await chrome.storage.local.get(['myId', 'partnerId', 'streak', 'lastSeen']);
    this.myId = stored.myId || this.generateId();
    this.partnerId = stored.partnerId || null;
    this.streak = stored.streak || 0;
    this.lastSeen = stored.lastSeen || null;
    
    if (!stored.myId) {
      await chrome.storage.local.set({ myId: this.myId });
    }

    // If we have a partner, try to reconnect
    if (this.partnerId) {
      this.connectSocket();
    }
  }

  generateId() {
    return Math.random().toString(36).substring(2, 10);
  }

  connectSocket() {
    // Load Socket.io client dynamically
    importScripts('https://cdn.socket.io/4.5.4/socket.io.min.js');
    
    this.socket = io(SIGNALING_SERVER);

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      this.reconnectAttempts = 0;
      
      // If we have a partner, we need to rejoin
      if (this.partnerId) {
        // For reconnection, we'd need to store the code
        // For now, just mark as disconnected
        this.broadcastToTabs({ type: 'connectionStatus', status: 'connected' });
      }
    });

    this.socket.on('peer-joined', (peerId) => {
      console.log('Peer joined:', peerId);
      this.partnerId = peerId;
      this.initiateWebRTC();
    });

    this.socket.on('offer', async (offer, peerId) => {
      console.log('Received offer from:', peerId);
      await this.handleOffer(offer, peerId);
    });

    this.socket.on('answer', async (answer, peerId) => {
      console.log('Received answer from:', peerId);
      if (this.connection) {
        await this.connection.setRemoteDescription(answer);
      }
    });

    this.socket.on('ice-candidate', async (candidate, peerId) => {
      console.log('Received ICE candidate from:', peerId);
      if (this.connection) {
        await this.connection.addIceCandidate(candidate);
      }
    });

    this.socket.on('peer-disconnected', () => {
      console.log('Peer disconnected');
      this.handleDisconnect();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from signaling server');
      this.handleDisconnect();
    });
  }

  async createPairing() {
    if (!this.socket || !this.socket.connected) {
      this.connectSocket();
      await this.waitForConnection();
    }

    return new Promise((resolve) => {
      this.socket.emit('create-pairing', this.myId, (response) => {
        if (response.success) {
          // Store code for potential reconnection
          chrome.storage.local.set({ 
            pairingCode: response.code,
            isHost: true 
          });
        }
        resolve(response);
      });
    });
  }

  async joinPairing(code) {
    if (!this.socket || !this.socket.connected) {
      this.connectSocket();
      await this.waitForConnection();
    }

    return new Promise((resolve) => {
      this.socket.emit('join-pairing', code, this.myId, async (response) => {
        if (response.success) {
          this.partnerId = response.peerId;
          await chrome.storage.local.set({ 
            partnerId: this.partnerId,
            pairingCode: code,
            isHost: false 
          });
          this.initiateWebRTC();
        }
        resolve(response);
      });
    });
  }

  waitForConnection() {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (this.socket?.connected) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(check); resolve(); }, 5000);
    });
  }

  async initiateWebRTC() {
    console.log('Initiating WebRTC...');
    
    this.connection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Create data channel
    this.dataChannel = this.connection.createDataChannel('presence', {
      ordered: true
    });
    this.setupDataChannel();

    // Handle ICE candidates
    this.connection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', event.candidate, this.partnerId);
      }
    };

    // Handle incoming data channel
    this.connection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    // Create and send offer
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);
    
    if (this.socket) {
      this.socket.emit('offer', offer, this.partnerId);
    }
  }

  async handleOffer(offer, peerId) {
    this.partnerId = peerId;
    
    this.connection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    this.connection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
    };

    this.connection.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit('ice-candidate', event.candidate, this.partnerId);
      }
    };

    await this.connection.setRemoteDescription(offer);
    const answer = await this.connection.createAnswer();
    await this.connection.setLocalDescription(answer);
    
    if (this.socket) {
      this.socket.emit('answer', answer, this.partnerId);
    }
  }

  setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened!');
      this.isOnline = true;
      this.broadcastPresence(true);
      this.updateStreak();
      this.broadcastToTabs({ type: 'partnerPresence', online: true });
    };

    this.dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.handleDisconnect();
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };
  }

  handleMessage(data) {
    switch(data.type) {
      case 'presence':
        this.broadcastToTabs({ type: 'partnerPresence', online: data.online });
        break;
      case 'nudge':
        this.broadcastToTabs({ type: 'nudgeReceived', timestamp: data.timestamp });
        break;
      case 'timer':
        this.broadcastToTabs({ type: 'partnerTimerUpdate', state: data.state });
        break;
      case 'typing':
        this.broadcastToTabs({ type: 'partnerTyping', typing: data.typing });
        break;
      case 'playlist':
        this.broadcastToTabs({ type: 'partnerPlaylistUpdate', state: data.state });
        break;
      case 'customNudge':
        this.broadcastToTabs({ type: 'customNudgeReceived', nudge: data.nudge });
        break;
      case 'mood':
        this.broadcastToTabs({ type: 'partnerMood', mood: data.mood });
        break;
    }
  }

  broadcastPresence(online) {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type: 'presence', online }));
    }
  }

  sendNudge() {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ 
        type: 'nudge', 
        timestamp: Date.now() 
      }));
      return true;
    }
    return false;
  }

  handleDisconnect() {
    this.isOnline = false;
    this.broadcastToTabs({ type: 'partnerPresence', online: false });
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }

  async updateStreak() {
    const today = new Date().toDateString();
    const stored = await chrome.storage.local.get(['lastStreakDate', 'streak']);
    
    if (stored.lastStreakDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      if (stored.lastStreakDate === yesterday) {
        this.streak = (stored.streak || 0) + 1;
      } else {
        this.streak = 1;
      }
      
      await chrome.storage.local.set({
        streak: this.streak,
        lastStreakDate: today
      });
    }
  }

  broadcastToTabs(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      });
    });
  }

  async disconnect() {
    this.handleDisconnect();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.partnerId = null;
    await chrome.storage.local.remove(['partnerId', 'pairingCode', 'isHost']);
  }
}

// Initialize
const syncSpace = new SyncSpacePeer();
syncSpace.init();

// Listen for messages from popup/content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handleAsync = async () => {
    switch(request.action) {
      case 'getStatus':
        return {
          myId: syncSpace.myId,
          partnerId: syncSpace.partnerId,
          isOnline: syncSpace.isOnline,
          streak: syncSpace.streak
        };
      case 'createPairing':
        return await syncSpace.createPairing();
      case 'joinPairing':
        return await syncSpace.joinPairing(request.code);
      case 'sendNudge':
        return { sent: syncSpace.sendNudge() };
      case 'broadcastTimer':
        if (syncSpace.dataChannel?.readyState === 'open') {
          syncSpace.dataChannel.send(JSON.stringify({ type: 'timer', state: request.state }));
        }
        return { sent: true };
      case 'broadcastTyping':
        if (syncSpace.dataChannel?.readyState === 'open') {
          syncSpace.dataChannel.send(JSON.stringify({ type: 'typing', typing: request.typing }));
        }
        return { sent: true };
      case 'broadcastPlaylist':
        if (syncSpace.dataChannel?.readyState === 'open') {
          syncSpace.dataChannel.send(JSON.stringify({ type: 'playlist', state: request.state }));
        }
        return { sent: true };
      case 'sendCustomNudge':
        if (syncSpace.dataChannel?.readyState === 'open') {
          syncSpace.dataChannel.send(JSON.stringify({ type: 'customNudge', nudge: request.nudge }));
          return { sent: true };
        }
        return { sent: false };
      case 'toggleFocusTimer':
        syncSpace.broadcastToTabs({ type: 'toggleFocusTimer' });
        return { success: true };
      case 'togglePlaylist':
        syncSpace.broadcastToTabs({ type: 'togglePlaylist' });
        return { success: true };
      case 'toggleSettings':
        syncSpace.broadcastToTabs({ type: 'toggleSettings' });
        return { success: true };
      case 'disconnect':
        await syncSpace.disconnect();
        return { success: true };
      default:
        return { error: 'Unknown action' };
    }
  };

  handleAsync().then(sendResponse);
  return true; // Keep channel open for async
});
