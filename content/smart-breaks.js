// MoodRing Smart Breaks
// Detects work patterns and suggests micro-breaks with stretch animations

class SmartBreaks {
  constructor() {
    this.workStartTime = Date.now();
    this.lastBreakTime = Date.now();
    this.continuousWorkTime = 0;
    this.eyeStrainScore = 0;
    this.postureReminderTime = null;
    this.isBreakActive = false;
    this.breakInterval = 20 * 60 * 1000; // 20 minutes default
    this.microBreakInterval = 20 * 60 * 1000; // 20-20-20 rule
    
    this.init();
  }

  init() {
    this.setupActivityTracking();
    this.startBreakScheduler();
    this.setupEyeStrainDetection();
  }

  setupActivityTracking() {
    // Track continuous work time
    setInterval(() => {
      if (!this.isBreakActive) {
        this.continuousWorkTime += 1000;
        this.checkBreakNeeded();
      }
    }, 1000);

    // Reset on user activity after break
    document.addEventListener('click', () => this.recordActivity());
    document.addEventListener('keypress', () => this.recordActivity());
  }

  recordActivity() {
    if (this.isBreakActive) {
      this.endBreak();
    }
  }

  setupEyeStrainDetection() {
    // 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds
    setInterval(() => {
      this.eyeStrainScore += 1;
      if (this.eyeStrainScore >= 20) {
        this.suggestEyeBreak();
      }
    }, 60000); // Every minute
  }

  startBreakScheduler() {
    // Check every minute if break is needed
    setInterval(() => {
      this.checkBreakNeeded();
    }, 60000);
  }

  checkBreakNeeded() {
    const workDuration = Date.now() - this.lastBreakTime;
    
    // Micro break every 20 minutes
    if (workDuration > this.microBreakInterval && !this.isBreakActive) {
      this.triggerMicroBreak();
    }
    
    // Full break every hour
    if (workDuration > 60 * 60 * 1000 && !this.isBreakActive) {
      this.triggerFullBreak();
    }
  }

  triggerMicroBreak() {
    if (this.isBreakActive) return;
    
    this.showBreakOverlay({
      type: 'micro',
      duration: 20000, // 20 seconds
      title: '20-20-20 Eye Break',
      message: 'Look at something 20 feet away for 20 seconds',
      animation: 'breathing-circle',
      skippable: true
    });
  }

  triggerFullBreak() {
    if (this.isBreakActive) return;
    
    this.showBreakOverlay({
      type: 'full',
      duration: 300000, // 5 minutes
      title: 'Time for a Break',
      message: 'You\'ve been working for an hour. Take 5 minutes to recharge.',
      animation: 'stretch-routine',
      skippable: false
    });
  }

  suggestEyeBreak() {
    this.showGentleNotification({
      title: '👁️ Eye Strain Alert',
      message: 'Look away from your screen for 20 seconds',
      duration: 10000
    });
    this.eyeStrainScore = 0;
  }

  showBreakOverlay(config) {
    this.isBreakActive = true;
    
    const overlay = document.createElement('div');
    overlay.id = 'moodring-break-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: white;
      animation: moodring-fade-in 0.5s ease;
    `;

    const content = config.type === 'micro' 
      ? this.getMicroBreakContent(config)
      : this.getFullBreakContent(config);

    overlay.innerHTML = content;
    document.body.appendChild(overlay);

    // Start countdown
    this.startBreakCountdown(overlay, config.duration, config.skippable);

    // Auto-close after duration
    setTimeout(() => {
      if (overlay.parentNode) {
        this.endBreak();
      }
    }, config.duration);
  }

  getMicroBreakContent(config) {
    return `
      <div style="text-align: center; max-width: 500px; padding: 40px;">
        <div style="font-size: 48px; margin-bottom: 20px;">👁️</div>
        <h2 style="font-size: 28px; margin-bottom: 16px; font-weight: 600;">${config.title}</h2>
        <p style="font-size: 18px; color: #94a3b8; margin-bottom: 40px;">${config.message}</p>
        
        <div class="moodring-break-timer" style="margin-bottom: 40px;">
          <div style="width: 200px; height: 200px; border-radius: 50%; border: 4px solid rgba(255,255,255,0.1); position: relative; margin: 0 auto;">
            <div class="moodring-timer-progress" style="position: absolute; inset: -4px; border-radius: 50%; border: 4px solid #60a5fa; clip-path: polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 50% 0%); animation: moodring-timer-spin 20s linear;"></div>
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 48px; font-weight: 700;" id="breakTimer">20</div>
          </div>
        </div>
        
        <button onclick="window.moodringSmartBreaks.skipBreak()" style="padding: 12px 24px; border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; background: transparent; color: white; cursor: pointer; font-size: 14px;">Skip this break</button>
      </div>
      
      <style>
        @keyframes moodring-timer-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes moodring-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      </style>
    `;
  }

  getFullBreakContent(config) {
    const stretches = [
      { name: 'Neck Rolls', emoji: '🙆', duration: 60 },
      { name: 'Shoulder Shrugs', emoji: '🤷', duration: 60 },
      { name: 'Wrist Circles', emoji: '✋', duration: 60 },
      { name: 'Back Stretch', emoji: '🧘', duration: 60 },
      { name: 'Eye Palming', emoji: '👁️', duration: 60 }
    ];

    const stretchHTML = stretches.map((s, i) => `
      <div class="moodring-stretch-item" data-index="${i}" style="padding: 16px; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 12px; opacity: 0.3; transition: all 0.3s;">
        <div style="font-size: 24px; margin-bottom: 4px;">${s.emoji}</div>
        <div style="font-weight: 500;">${s.name}</div>
        <div style="font-size: 12px; color: #64748b;">${s.duration}s</div>
      </div>
    `).join('');

    return `
      <div style="display: flex; width: 100%; height: 100%;">
        <div style="flex: 1; padding: 60px; display: flex; flex-direction: column; justify-content: center;">
          <div style="font-size: 64px; margin-bottom: 24px;">🧘</div>
          <h2 style="font-size: 36px; margin-bottom: 16px; font-weight: 700;">${config.title}</h2>
          <p style="font-size: 18px; color: #94a3b8; margin-bottom: 40px; line-height: 1.6;">${config.message}</p>
          
          <div style="display: flex; gap: 20px; align-items: center;">
            <div style="font-size: 48px; font-weight: 700; font-variant-numeric: tabular-nums;" id="fullBreakTimer">05:00</div>
            <div style="color: #64748b;">remaining</div>
          </div>
          
          <div style="margin-top: 40px; color: #64748b; font-size: 14px;">
            💡 Tip: Stand up and move around during this break
          </div>
        </div>
        
        <div style="width: 400px; background: rgba(0,0,0,0.2); padding: 40px; overflow-y: auto;">
          <h3 style="margin-bottom: 20px; font-size: 16px; text-transform: uppercase; letter-spacing: 1px; color: #64748b;">Quick Stretches</h3>
          ${stretchHTML}
        </div>
      </div>
      
      <style>
        @keyframes moodring-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .moodring-stretch-item.active {
          opacity: 1 !important;
          background: rgba(96, 165, 250, 0.2) !important;
          border-left: 3px solid #60a5fa;
        }
      </style>
    `;
  }

  startBreakCountdown(overlay, duration, skippable) {
    const timerEl = overlay.querySelector('#breakTimer') || overlay.querySelector('#fullBreakTimer');
    if (!timerEl) return;

    let remaining = duration / 1000;
    
    const interval = setInterval(() => {
      remaining--;
      
      if (timerEl.id === 'breakTimer') {
        timerEl.textContent = remaining;
      } else {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      }

      // Highlight current stretch exercise
      const stretchItems = overlay.querySelectorAll('.moodring-stretch-item');
      const currentStretch = Math.floor((duration / 1000 - remaining) / 60);
      stretchItems.forEach((item, i) => {
        if (i === currentStretch) item.classList.add('active');
      });

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    overlay.dataset.intervalId = interval;
  }

  showGentleNotification(config) {
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      background: rgba(251, 146, 60, 0.95);
      color: white;
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      animation: moodring-slide-in 0.3s ease;
      max-width: 300px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;
    notif.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${config.title}</div>
      <div style="opacity: 0.9;">${config.message}</div>
    `;
    
    document.body.appendChild(notif);
    setTimeout(() => {
      notif.style.animation = 'moodring-slide-in 0.3s ease reverse';
      setTimeout(() => notif.remove(), 300);
    }, config.duration);
  }

  skipBreak() {
    this.endBreak();
    // Penalty: reset timer but add to skip count
    this.lastBreakTime = Date.now();
    this.continuousWorkTime = 0;
  }

  endBreak() {
    const overlay = document.getElementById('moodring-break-overlay');
    if (overlay) {
      const intervalId = overlay.dataset.intervalId;
      if (intervalId) clearInterval(parseInt(intervalId));
      
      overlay.style.animation = 'moodring-fade-in 0.3s ease reverse';
      setTimeout(() => overlay.remove(), 300);
    }
    
    this.isBreakActive = false;
    this.lastBreakTime = Date.now();
    this.continuousWorkTime = 0;
    this.eyeStrainScore = 0;
  }
}

// Initialize and expose globally
window.moodringSmartBreaks = new SmartBreaks();
