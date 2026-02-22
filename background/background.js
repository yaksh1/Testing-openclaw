// SyncSpace - Background Script
// Handles WebRTC signaling and connection state

const SYNCSPACE_CONFIG = {
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ],
  SIGNALING_SERVER: null // P2P only, no server needed for MVP
};

class SyncSpacePeer {
  constructor() {
    this.connection = null;
    this.dataChannel = null;
    this.partnerId = null;
    this.isOnline = false;
    this.streak = 0;
    this.lastSeen = null;
  }

  async init() {
    const stored = await chrome.storage.local.get(['partnerId', 'myId', 'streak', 'lastSeen']);
    this.partnerId = stored.partnerId || null;
    this.myId = stored.myId || this.generateId();
    this.streak = stored.streak || 0;
    this.lastSeen = stored.lastSeen || null;
    
    if (!stored.myId) {
      await chrome.storage.local.set({ myId: this.myId });
    }

    // Check if partner was recently online
    if (this.lastSeen) {
      const hoursSince = (Date.now() - this.lastSeen) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        this.attemptReconnect();
      }
    }
  }

  generateId() {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  generatePairingCode() {
    // Simple 6-digit code for MVP
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async createPairing() {
    const code = this.generatePairingCode();
    await chrome.storage.local.set({ 
      pairingCode: code, 
      pairingCreated: Date.now(),
      myId: this.myId 
    });
    return code;
  }

  async joinPairing(code) {
    // In real implementation, this would use a signaling server
    // For MVP with zero cost, we'll use a simple approach:
    // Store code -> ID mapping in chrome.storage.sync (limited but free)
    // Both parties poll for connection
    
    await chrome.storage.sync.set({
      [`pairing_${code}`]: {
        peerId: this.myId,
        timestamp: Date.now()
      }
    });

    // Start polling for partner
    this.startPairingPoll(code);
    return true;
  }

  async startPairingPoll(code) {
    const pollInterval = setInterval(async () => {
      const result = await chrome.storage.sync.get([`pairing_${code}`]);
      const pairing = result[`pairing_${code}`];
      
      if (pairing && pairing.peerId !== this.myId) {
        // Found partner!
        clearInterval(pollInterval);
        this.partnerId = pairing.peerId;
        await chrome.storage.local.set({ partnerId: this.partnerId });
        await chrome.storage.sync.remove(`pairing_${code}`);
        this.initiateConnection();
      }
    }, 2000);

    // Timeout after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000);
  }

  async initiateConnection() {
    // Create WebRTC connection
    this.connection = new RTCPeerConnection({
      iceServers: SYNCSPACE_CONFIG.ICE_SERVERS
    });

    // Create data channel for presence
    this.dataChannel = this.connection.createDataChannel('presence', {
      ordered: true
    });

    this.setupDataChannel();
    this.setupConnectionHandlers();

    // Create offer
    const offer = await this.connection.createOffer();
    await this.connection.setLocalDescription(offer);

    // Store offer for partner to find (using sync storage as signaling)
    await chrome.storage.sync.set({
      [`offer_${this.myId}`]: {
        offer: offer,
        timestamp: Date.now()
      }
    });

    // Poll for answer
    this.pollForAnswer();
  }

  setupDataChannel() {
    this.dataChannel.onopen = () => {
      this.isOnline = true;
      this.broadcastPresence(true);
      this.updateStreak();
    };

    this.dataChannel.onclose = () => {
      this.isOnline = false;
      this.broadcastPresence(false);
    };

    this.dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };
  }

  setupConnectionHandlers() {
    this.connection.onicecandidate = async (event) => {
      if (event.candidate) {
        await chrome.storage.sync.set({
          [`ice_${this.myId}`]: event.candidate
        });
      }
    };

    this.connection.ondatachannel = (event) => {
      this.dataChannel = event.channel;
      this.setupDataChannel();
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

  broadcastToTabs(message) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {});
      });
    });
  }

  async updateStreak() {
    const today = new Date().toDateString();
    const lastStreakDate = await chrome.storage.local.get('lastStreakDate');
    
    if (lastStreakDate.lastStreakDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      
      if (lastStreakDate.lastStreakDate === yesterday) {
        this.streak++;
      } else {
        this.streak = 1;
      }
      
      await chrome.storage.local.set({
        streak: this.streak,
        lastStreakDate: today
      });
    }
  }

  async attemptReconnect() {
    // Simple reconnection logic
    if (this.partnerId) {
      // Try to find partner's offer
      const result = await chrome.storage.sync.get([`offer_${this.partnerId}`]);
      if (result[`offer_${this.partnerId}`]) {
        // Partner is trying to connect, join them
        this.acceptConnection(result[`offer_${this.partnerId}`]);
      }
    }
  }

  async disconnect() {
    if (this.dataChannel) this.dataChannel.close();
    if (this.connection) this.connection.close();
    this.isOnline = false;
    this.partnerId = null;
    await chrome.storage.local.remove(['partnerId']);
  }
}

// Initialize
const syncSpace = new SyncSpacePeer();
syncSpace.init();

// Listen for messages from popup/content
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch(request.action) {
    case 'getStatus':
      sendResponse({
        myId: syncSpace.myId,
        partnerId: syncSpace.partnerId,
        isOnline: syncSpace.isOnline,
        streak: syncSpace.streak
      });
      break;
    case 'createPairing':
      syncSpace.createPairing().then(code => sendResponse({ code }));
      return true;
    case 'joinPairing':
      syncSpace.joinPairing(request.code).then(success => sendResponse({ success }));
      return true;
    case 'sendNudge':
      const sent = syncSpace.sendNudge();
      sendResponse({ sent });
      break;
    case 'disconnect':
      syncSpace.disconnect().then(() => sendResponse({ success: true }));
      return true;
  }
});
