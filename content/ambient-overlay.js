// MoodRing Content Script - Ambient Overlay
// Visual interventions that respond to mood

class AmbientOverlay {
  constructor() {
    this.currentMood = 'CALM';
    this.overlay = null;
    this.breathingActive = false;
    this.init();
  }

  init() {
    this.createOverlay();
    this.setupMessageListener();
    this.injectAmbientStyles();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'moodring-ambient-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 2147483646;
      transition: all 2s ease;
      opacity: 0;
    `;
    document.body.appendChild(this.overlay);
  }

  injectAmbientStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes moodring-breathe {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.5); opacity: 0.6; }
      }
      
      @keyframes moodring-pulse {
        0%, 100% { opacity: 0.1; }
        50% { opacity: 0.3; }
      }
      
      .moodring-breathing-circle {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
        z-index: 2147483645;
        animation: moodring-breathe 4s ease-in-out infinite;
      }
      
      .moodring-intervention {
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 20px 25px;
        border-radius: 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        color: white;
        max-width: 320px;
        backdrop-filter: blur(20px);
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 2147483647;
        animation: moodring-slide-in 0.5s ease;
        pointer-events: auto;
      }
      
      @keyframes moodring-slide-in {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .moodring-intervention button {
        margin-top: 12px;
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: rgba(255,255,255,0.2);
        color: white;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      }
      
      .moodring-intervention button:hover {
        background: rgba(255,255,255,0.3);
      }
      
      .moodring-breathing-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: radial-gradient(circle at center, var(--mood-color) 0%, transparent 70%);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        pointer-events: auto;
      }
      
      .moodring-breathing-text {
        color: white;
        font-size: 24px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
        text-shadow: 0 2px 10px rgba(0,0,0,0.3);
      }
      
      .moodring-breathing-circle-large {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        border: 3px solid rgba(255,255,255,0.5);
        animation: moodring-breathe 4s ease-in-out infinite;
        margin-bottom: 30px;
      }
    `;
    document.head.appendChild(style);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'MOOD_CHANGE') {
        this.handleMoodChange(msg.mood, msg.color, msg.name);
      } else if (msg.type === 'INTERVENTION') {
        this.showIntervention(msg.type, msg.message);
      } else if (msg.type === 'BREATHING_EXERCISE') {
        this.startBreathingExercise();
      }
      return true;
    });
  }

  handleMoodChange(mood, color, name) {
    this.currentMood = mood;
    
    // Apply subtle ambient tint
    const opacity = this.getMoodOpacity(mood);
    this.overlay.style.background = `radial-gradient(ellipse at 50% 0%, ${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`;
    this.overlay.style.opacity = '1';

    // Special handling for specific moods
    switch(mood) {
      case 'ANXIOUS':
        this.addCalmingGradient(color);
        break;
      case 'TIRED':
        this.addWarmOverlay(color);
        break;
      case 'DOOMSCROLLING':
        this.showPatternBreakSuggestion();
        break;
    }
  }

  getMoodOpacity(mood) {
    const opacities = {
      'CALM': 0.05,
      'FOCUSED': 0.08,
      'ANXIOUS': 0.15,
      'OVERWHELMED': 0.12,
      'TIRED': 0.10,
      'DOOMSCROLLING': 0.20
    };
    return opacities[mood] || 0.05;
  }

  addCalmingGradient(color) {
    // Subtle pulsing animation for anxious state
    this.overlay.style.animation = 'moodring-pulse 3s ease-in-out infinite';
  }

  addWarmOverlay(color) {
    // Warm, sleep-friendly overlay for tired state
    this.overlay.style.background = `radial-gradient(ellipse at 50% 100%, ${color}30 0%, transparent 60%)`;
  }

  showIntervention(type, message) {
    // Remove existing interventions
    const existing = document.querySelectorAll('.moodring-intervention');
    existing.forEach(el => el.remove());

    const intervention = document.createElement('div');
    intervention.className = 'moodring-intervention';
    intervention.style.background = this.getMoodGradient(this.currentMood);
    
    intervention.innerHTML = `
      <div style="font-weight: 500; margin-bottom: 4px;">MoodRing</div>
      <div>${message}</div>
      ${this.getInterventionButton(type)}
    `;

    document.body.appendChild(intervention);

    // Auto-remove after 10 seconds unless hovered
    let removeTimeout = setTimeout(() => {
      intervention.style.animation = 'moodring-slide-in 0.5s ease reverse';
      setTimeout(() => intervention.remove(), 500);
    }, 10000);

    intervention.addEventListener('mouseenter', () => clearTimeout(removeTimeout));
    intervention.addEventListener('mouseleave', () => {
      removeTimeout = setTimeout(() => {
        intervention.style.animation = 'moodring-slide-in 0.5s ease reverse';
        setTimeout(() => intervention.remove(), 500);
      }, 3000);
    });
  }

  getInterventionButton(type) {
    const buttons = {
      'breathing': '<button onclick="this.closest(\'.moodring-intervention\').remove(); window.moodringAmbient.startBreathingExercise();">Breathe with me →</button>',
      'tab-suggest': '<button onclick="this.closest(\'.moodring-intervention\').remove();">Close 5 tabs →</button>',
      'sleep-nudge': '<button onclick="this.closest(\'.moodring-intervention\').remove();">Maybe tomorrow →</button>',
      'pattern-break': '<button onclick="this.closest(\'.moodring-intervention\').remove();">Take a walk →</button>'
    };
    return buttons[type] || '';
  }

  getMoodGradient(mood) {
    const gradients = {
      'CALM': 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)',
      'FOCUSED': 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
      'ANXIOUS': 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
      'OVERWHELMED': 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
      'TIRED': 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
      'DOOMSCROLLING': 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'
    };
    return gradients[mood] || gradients['CALM'];
  }

  startBreathingExercise() {
    if (this.breathingActive) return;
    this.breathingActive = true;

    const overlay = document.createElement('div');
    overlay.className = 'moodring-breathing-overlay';
    overlay.style.setProperty('--mood-color', this.getMoodColor(this.currentMood));
    overlay.innerHTML = `
      <div class="moodring-breathing-circle-large"></div>
      <div class="moodring-breathing-text">Breathe in... Breathe out...</div>
      <button onclick="this.closest('.moodring-breathing-overlay').remove(); window.moodringAmbient.breathingActive = false;"
              style="margin-top: 30px; padding: 12px 24px; border: 2px solid white; border-radius: 8px; background: transparent; color: white; cursor: pointer; font-size: 16px;">I'm calm now</button>
    `;

    document.body.appendChild(overlay);

    // Auto-close after 2 minutes
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1s';
        setTimeout(() => {
          overlay.remove();
          this.breathingActive = false;
        }, 1000);
      }
    }, 120000);
  }

  getMoodColor(mood) {
    const colors = {
      'CALM': '#4ade80',
      'FOCUSED': '#60a5fa',
      'ANXIOUS': '#fbbf24',
      'OVERWHELMED': '#f87171',
      'TIRED': '#a78bfa',
      'DOOMSCROLLING': '#fb923c'
    };
    return colors[mood] || colors['CALM'];
  }

  showPatternBreakSuggestion() {
    // Subtle hint for doomscrolling
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: rgba(251, 146, 60, 0.9);
      color: white;
      border-radius: 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      animation: moodring-slide-in 0.5s ease;
      pointer-events: auto;
      cursor: pointer;
    `;
    hint.textContent = 'Endless scroll detected. Take a break?';
    hint.onclick = () => {
      hint.remove();
      this.startBreathingExercise();
    };
    document.body.appendChild(hint);

    setTimeout(() => {
      if (hint.parentNode) hint.remove();
    }, 8000);
  }
}

// Initialize and expose globally for button callbacks
window.moodringAmbient = new AmbientOverlay();
