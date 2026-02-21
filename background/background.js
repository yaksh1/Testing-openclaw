// MoodRing Background Service Worker
// Handles pattern tracking, mood inference, and ambient interventions

const MOOD_STATES = {
  CALM: { color: '#4ade80', name: 'Calm' },
  FOCUSED: { color: '#60a5fa', name: 'Focused' },
  ANXIOUS: { color: '#fbbf24', name: 'Anxious' },
  OVERWHELMED: { color: '#f87171', name: 'Overwhelmed' },
  TIRED: { color: '#a78bfa', name: 'Tired' },
  DOOMSCROLLING: { color: '#fb923c', name: 'Doomscrolling' }
};

class MoodTracker {
  constructor() {
    this.patterns = new Map();
    this.currentMood = 'CALM';
    this.init();
  }

  init() {
    // Set up periodic mood analysis
    chrome.alarms.create('mood-analysis', { periodInMinutes: 1 });
    chrome.alarms.create('gentle-check-in', { periodInMinutes: 15 });
    
    this.setupEventListeners();
    this.loadStoredPatterns();
  }

  setupEventListeners() {
    // Track tab switches
    chrome.tabs.onActivated.addListener((info) => {
      this.recordEvent('tab_switch', { tabId: info.tabId });
    });

    // Track navigation
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) {
        this.recordEvent('page_load', { 
          url: details.url,
          timestamp: Date.now()
        });
      }
    });

    // Alarm-based interventions
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'mood-analysis') {
        this.analyzeMood();
      } else if (alarm.name === 'gentle-check-in') {
        this.sendIntervention();
      }
    });

    // Messages from content/popup
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'SCROLL_PATTERN') {
        this.recordScrollPattern(msg.data);
      } else if (msg.type === 'GET_MOOD') {
        sendResponse({ mood: this.currentMood, patterns: this.getRecentPatterns() });
      } else if (msg.type === 'MANUAL_BREATHING') {
        this.triggerBreathingExercise();
      }
      return true;
    });
  }

  recordEvent(type, data) {
    const event = {
      type,
      timestamp: Date.now(),
      ...data
    };
    
    // Store in local patterns (last 100 events)
    const key = `events_${new Date().toISOString().split('T')[0]}`;
    chrome.storage.local.get([key], (result) => {
      const events = result[key] || [];
      events.push(event);
      if (events.length > 100) events.shift();
      chrome.storage.local.set({ [key]: events });
    });

    this.detectRapidSwitching();
  }

  recordScrollPattern(data) {
    const { velocity, direction, duration } = data;
    
    // Detect doom scrolling: fast, continuous, downward
    if (velocity > 1000 && direction === 'down' && duration > 30000) {
      this.updateMood('DOOMSCROLLING');
    }
  }

  detectRapidSwitching() {
    const now = Date.now();
    const recentSwitches = this.getRecentEvents('tab_switch', 5000); // Last 5 seconds
    
    if (recentSwitches.length > 5) {
      this.updateMood('ANXIOUS');
    }
  }

  analyzeMood() {
    const patterns = this.getRecentPatterns();
    const now = new Date();
    
    // Late night detection (11 PM - 5 AM)
    if (now.getHours() >= 23 || now.getHours() <= 5) {
      if (patterns.activityLevel > 0.7) {
        this.updateMood('TIRED');
      }
    }

    // Overwhelmed: many tabs, rapid context switching
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > 15 && this.getRecentEvents('tab_switch', 60000).length > 10) {
        this.updateMood('OVERWHELMED');
      }
    });

    // Focused: single tab, steady scrolling, long dwell time
    const pageLoads = this.getRecentEvents('page_load', 300000); // 5 min
    if (pageLoads.length === 1 && patterns.scrollVelocity < 200) {
      this.updateMood('FOCUSED');
    }
  }

  updateMood(newMood) {
    if (this.currentMood === newMood) return;
    
    this.currentMood = newMood;
    const moodData = MOOD_STATES[newMood];
    
    // Broadcast to all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          type: 'MOOD_CHANGE',
          mood: newMood,
          color: moodData.color,
          name: moodData.name
        }).catch(() => {}); // Ignore errors for inactive tabs
      });
    });

    // Update extension icon
    this.updateIcon(moodData.color);
  }

  updateIcon(color) {
    // Create colored circle icon
    const canvas = new OffscreenCanvas(128, 128);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, 2 * Math.PI);
    ctx.fill();
    
    chrome.action.setIcon({ imageData: ctx.getImageData(0, 0, 128, 128) });
  }

  sendIntervention() {
    const interventions = {
      'ANXIOUS': { type: 'breathing', message: 'Take a moment. Breathe with me.' },
      'OVERWHELMED': { type: 'tab-suggest', message: 'Close 5 tabs. Feel lighter.' },
      'TIRED': { type: 'sleep-nudge', message: 'It\'s late. Your mind needs rest.' },
      'DOOMSCROLLING': { type: 'pattern-break', message: 'Endless scroll detected. Try a walk?' }
    };

    const intervention = interventions[this.currentMood];
    if (intervention) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'INTERVENTION',
            ...intervention
          }).catch(() => {});
        }
      });
    }
  }

  triggerBreathingExercise() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'BREATHING_EXERCISE'
        }).catch(() => {});
      }
    });
  }

  loadStoredPatterns() {
    chrome.storage.local.get(['currentMood'], (result) => {
      if (result.currentMood) {
        this.currentMood = result.currentMood;
      }
    });
  }

  getRecentPatterns() {
    // Placeholder - would calculate from stored events
    return {
      activityLevel: 0.5,
      scrollVelocity: 300,
      tabCount: 0
    };
  }

  getRecentEvents(type, timeWindow) {
    // Placeholder - would filter from storage
    return [];
  }
}

// Initialize
const moodTracker = new MoodTracker();

// Store mood state for persistence
chrome.storage.local.set({ 
  version: '0.1.0',
  installDate: Date.now()
});
