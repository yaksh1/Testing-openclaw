// MoodRing Focus Mode
// Gentle site blocking based on mood state - not punitive, just mindful

class FocusMode {
  constructor() {
    this.isActive = false;
    this.blockedSites = [
      'twitter.com',
      'x.com',
      'reddit.com',
      'youtube.com',
      'tiktok.com',
      'instagram.com',
      'facebook.com',
      'news.ycombinator.com'
    ];
    this.gracePeriod = 5000; // 5 seconds to change mind
    this.dailyLimits = new Map();
    this.init();
  }

  init() {
    this.setupNavigationListener();
    this.loadDailyLimits();
  }

  setupNavigationListener() {
    // Check every navigation
    chrome.webNavigation?.onBeforeNavigate.addListener((details) => {
      if (details.frameId !== 0) return; // Only main frame
      
      const url = new URL(details.url);
      const hostname = url.hostname.replace('www.', '');
      
      if (this.shouldBlock(hostname)) {
        this.handleBlockedNavigation(details.tabId, hostname);
      }
    });

    // Also check in content script for SPA navigation
    if (typeof window !== 'undefined') {
      this.setupContentScriptListener();
    }
  }

  setupContentScriptListener() {
    // Watch for URL changes in SPAs
    let lastUrl = location.href;
    new MutationObserver(() => {
      const url = location.href;
      if (url !== lastUrl) {
        lastUrl = url;
        const hostname = location.hostname.replace('www.', '');
        if (this.shouldBlock(hostname)) {
          this.showFocusIntervention(hostname);
        }
      }
    }).observe(document, { subtree: true, childList: true });

    // Check current page on load
    const hostname = location.hostname.replace('www.', '');
    if (this.shouldBlock(hostname)) {
      this.showFocusIntervention(hostname);
    }
  }

  shouldBlock(hostname) {
    // Only block when in certain mood states
    const blockMoods = ['ANXIOUS', 'OVERWHELMED', 'DOOMSCROLLING'];
    const currentMood = window.moodringAmbient?.currentMood || 'CALM';
    
    if (!blockMoods.includes(currentMood)) return false;
    
    return this.blockedSites.some(site => hostname.includes(site));
  }

  handleBlockedNavigation(tabId, hostname) {
    // Show gentle intervention page instead of blocking
    const interventionHTML = this.getInterventionPage(hostname);
    
    chrome.tabs.executeScript(tabId, {
      code: `
        document.open();
        document.write(${JSON.stringify(interventionHTML)});
        document.close();
      `
    });
  }

  showFocusIntervention(hostname) {
    // Don't show multiple times
    if (document.getElementById('moodring-focus-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'moodring-focus-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f2027 100%);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      animation: moodring-focus-fade-in 0.5s ease;
    `;

    const siteName = this.getSiteDisplayName(hostname);
    const timeSpent = this.getTimeSpentToday(hostname);

    overlay.innerHTML = `
      <div style="text-align: center; max-width: 500px; padding: 40px;">
        <div style="font-size: 64px; margin-bottom: 24px;">🌊</div>
        
        <h2 style="font-size: 32px; margin-bottom: 16px; font-weight: 700;">A Gentle Pause</h2>
        
        <p style="font-size: 18px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6;">
          We noticed you're heading to ${siteName}. <br>
          Your browsing patterns suggest you might be ${this.getMoodDescription()}.
        </p>
        
        ${timeSpent > 0 ? `
        <div style="background: rgba(255,255,255,0.05); padding: 16px 24px; border-radius: 12px; margin-bottom: 32px;">
          <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Time on ${siteName} today</div>
          <div style="font-size: 28px; font-weight: 700; color: #fbbf24;">${this.formatDuration(timeSpent)}</div>
        </div>
        ` : ''}
        
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button id="moodring-focus-continue" style="
            padding: 16px 32px;
            border-radius: 12px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">
            Continue to ${siteName}
            <span style="display: block; font-size: 12px; font-weight: 400; opacity: 0.8; margin-top: 4px;">I'll be mindful of my time</span>
          </button>
          
          <button id="moodring-focus-breathe" style="
            padding: 16px 32px;
            border-radius: 12px;
            border: 1px solid rgba(255,255,255,0.3);
            background: transparent;
            color: white;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
          ">
            Take a Breathing Break First
          </button>
          
          <button id="moodring-focus-back" style="
            padding: 12px 24px;
            border-radius: 12px;
            border: none;
            background: transparent;
            color: #64748b;
            font-size: 14px;
            cursor: pointer;
            margin-top: 8px;
          ">
            ← Go Back
          </button>
        </div>
        
        <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.1);">
          <p style="font-size: 13px; color: #64748b; font-style: italic;">
            "The ability to concentrate is a superpower in the 21st century."
          </p>
        </div>
      </div>
      
      <style>
        @keyframes moodring-focus-fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        #moodring-focus-continue:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
        }
        #moodring-focus-breathe:hover {
          background: rgba(255,255,255,0.1);
        }
      </style>
    `;

    document.body.appendChild(overlay);

    // Event listeners
    overlay.querySelector('#moodring-focus-continue').addEventListener('click', () => {
      this.recordVisit(hostname);
      overlay.style.animation = 'moodring-focus-fade-in 0.3s ease reverse';
      setTimeout(() => overlay.remove(), 300);
    });

    overlay.querySelector('#moodring-focus-breathe').addEventListener('click', () => {
      overlay.remove();
      if (window.moodringAmbient) {
        window.moodringAmbient.startBreathingExercise();
      }
    });

    overlay.querySelector('#moodring-focus-back').addEventListener('click', () => {
      history.back();
      overlay.remove();
    });
  }

  getInterventionPage(hostname) {
    // Simplified version for background script
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>MoodRing Focus</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1e3a5f 0%, #0f2027 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            text-align: center;
          }
          .container { max-width: 500px; padding: 40px; }
          h1 { font-size: 32px; margin-bottom: 16px; }
          p { font-size: 18px; color: #94a3b8; margin-bottom: 32px; }
          button {
            padding: 16px 32px;
            border-radius: 12px;
            border: none;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-size: 16px;
            cursor: pointer;
            margin: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🌊 A Gentle Pause</h1>
          <p>Your browsing patterns suggest you might be feeling overwhelmed. Take a moment before continuing to ${hostname}.</p>
          <button onclick="history.back()">Go Back</button>
          <button onclick="location.reload()">Continue Anyway</button>
        </div>
      </body>
      </html>
    `;
  }

  getSiteDisplayName(hostname) {
    const names = {
      'twitter.com': 'Twitter',
      'x.com': 'X',
      'reddit.com': 'Reddit',
      'youtube.com': 'YouTube',
      'tiktok.com': 'TikTok',
      'instagram.com': 'Instagram',
      'facebook.com': 'Facebook',
      'news.ycombinator.com': 'Hacker News'
    };
    return names[hostname] || hostname;
  }

  getMoodDescription() {
    const mood = window.moodringAmbient?.currentMood || 'ANXIOUS';
    const descriptions = {
      'ANXIOUS': 'feeling a bit anxious',
      'OVERWHELMED': 'feeling overwhelmed',
      'DOOMSCROLLING': 'caught in a scroll loop',
      'TIRED': 'tired and need rest'
    };
    return descriptions[mood] || 'need a moment';
  }

  getTimeSpentToday(hostname) {
    const today = new Date().toISOString().split('T')[0];
    const key = `focus_time_${hostname}_${today}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored) : 0;
  }

  recordVisit(hostname) {
    const today = new Date().toISOString().split('T')[0];
    const key = `focus_visits_${hostname}_${today}`;
    const visits = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, visits.toString());
  }

  formatDuration(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  loadDailyLimits() {
    // Load any saved daily time limits
    chrome.storage?.local.get(['focusLimits'], (result) => {
      if (result.focusLimits) {
        this.dailyLimits = new Map(Object.entries(result.focusLimits));
      }
    });
  }

  setDailyLimit(site, minutes) {
    this.dailyLimits.set(site, minutes);
    chrome.storage?.local.set({
      focusLimits: Object.fromEntries(this.dailyLimits)
    });
  }
}

// Initialize
window.moodringFocus = new FocusMode();
