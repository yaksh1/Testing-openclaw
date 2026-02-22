// SyncSpace - Shared Focus Timer
// Pomodoro timer that syncs between partners

(function() {
  'use strict';

  if (window.syncSpaceFocusTimer) return;
  window.syncSpaceFocusTimer = true;

  let timerState = {
    isActive: false,
    isPaused: false,
    timeRemaining: 25 * 60, // 25 minutes default
    mode: 'work', // work, shortBreak, longBreak
    partnerSync: false
  };

  let timerInterval = null;
  let elements = {};

  function createTimerUI() {
    // Main container
    elements.container = document.createElement('div');
    elements.container.className = 'syncspace-timer';
    elements.container.innerHTML = `
      <div class="syncspace-timer-header">
        <span class="syncspace-timer-icon">🍅</span>
        <span class="syncspace-timer-title">Focus Together</span>
        <button class="syncspace-timer-close">×</button>
      </div>
      <div class="syncspace-timer-display">
        <span class="syncspace-timer-time">25:00</span>
        <span class="syncspace-timer-mode">Work</span>
      </div>
      <div class="syncspace-timer-progress">
        <div class="syncspace-timer-bar"></div>
      </div>
      <div class="syncspace-timer-sync-status">
        <span class="syncspace-timer-sync-dot"></span>
        <span class="syncspace-timer-sync-text">Solo focus</span>
      </div>
      <div class="syncspace-timer-controls">
        <button class="syncspace-timer-btn syncspace-timer-start">Start</button>
        <button class="syncspace-timer-btn syncspace-timer-pause hidden">Pause</button>
        <button class="syncspace-timer-btn syncspace-timer-reset">Reset</button>
      </div>
      <div class="syncspace-timer-presets">
        <button data-time="25" data-mode="work" class="active">25m</button>
        <button data-time="5" data-mode="shortBreak">5m break</button>
        <button data-time="15" data-mode="longBreak">15m break</button>
      </div>
      <div class="syncspace-timer-partner">
        <div class="syncspace-timer-partner-status"></div>
      </div>
    `;

    document.body.appendChild(elements.container);

    // Cache elements
    elements.time = elements.container.querySelector('.syncspace-timer-time');
    elements.mode = elements.container.querySelector('.syncspace-timer-mode');
    elements.bar = elements.container.querySelector('.syncspace-timer-bar');
    elements.startBtn = elements.container.querySelector('.syncspace-timer-start');
    elements.pauseBtn = elements.container.querySelector('.syncspace-timer-pause');
    elements.resetBtn = elements.container.querySelector('.syncspace-timer-reset');
    elements.closeBtn = elements.container.querySelector('.syncspace-timer-close');
    elements.syncDot = elements.container.querySelector('.syncspace-timer-sync-dot');
    elements.syncText = elements.container.querySelector('.syncspace-timer-sync-text');
    elements.presets = elements.container.querySelectorAll('.syncspace-timer-presets button');
    elements.partnerStatus = elements.container.querySelector('.syncspace-timer-partner-status');

    // Event listeners
    elements.startBtn.addEventListener('click', startTimer);
    elements.pauseBtn.addEventListener('click', pauseTimer);
    elements.resetBtn.addEventListener('click', resetTimer);
    elements.closeBtn.addEventListener('click', hideTimer);
    
    elements.presets.forEach(btn => {
      btn.addEventListener('click', () => setPreset(btn));
    });

    // Make draggable
    makeDraggable(elements.container);
  }

  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const header = element.querySelector('.syncspace-timer-header');
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialX = element.offsetLeft;
      initialY = element.offsetTop;
      element.style.transition = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      element.style.left = `${initialX + dx}px`;
      element.style.top = `${initialY + dy}px`;
      element.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      element.style.transition = '';
    });
  }

  function setPreset(btn) {
    if (timerState.isActive) return;
    
    elements.presets.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const minutes = parseInt(btn.dataset.time);
    timerState.timeRemaining = minutes * 60;
    timerState.mode = btn.dataset.mode;
    
    updateDisplay();
    updateModeLabel();
  }

  function updateModeLabel() {
    const labels = {
      work: 'Work',
      shortBreak: 'Short Break',
      longBreak: 'Long Break'
    };
    elements.mode.textContent = labels[timerState.mode];
    elements.container.className = `syncspace-timer mode-${timerState.mode}`;
  }

  function startTimer() {
    if (timerState.isActive && !timerState.isPaused) return;
    
    timerState.isActive = true;
    timerState.isPaused = false;
    
    elements.startBtn.classList.add('hidden');
    elements.pauseBtn.classList.remove('hidden');
    
    // Sync with partner
    broadcastTimerState();
    
    timerInterval = setInterval(() => {
      if (timerState.timeRemaining > 0) {
        timerState.timeRemaining--;
        updateDisplay();
        updateProgress();
      } else {
        completeTimer();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!timerState.isActive) return;
    
    timerState.isPaused = true;
    clearInterval(timerInterval);
    
    elements.startBtn.classList.remove('hidden');
    elements.startBtn.textContent = 'Resume';
    elements.pauseBtn.classList.add('hidden');
    
    broadcastTimerState();
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerState.isActive = false;
    timerState.isPaused = false;
    
    // Get preset time
    const activePreset = document.querySelector('.syncspace-timer-presets button.active');
    const minutes = parseInt(activePreset?.dataset.time || '25');
    timerState.timeRemaining = minutes * 60;
    
    elements.startBtn.classList.remove('hidden');
    elements.startBtn.textContent = 'Start';
    elements.pauseBtn.classList.add('hidden');
    
    updateDisplay();
    updateProgress();
    broadcastTimerState();
  }

  function completeTimer() {
    clearInterval(timerInterval);
    timerState.isActive = false;
    timerState.isPaused = false;
    
    // Play notification sound
    playNotificationSound();
    
    // Show notification
    showCompletionNotification();
    
    elements.startBtn.classList.remove('hidden');
    elements.startBtn.textContent = 'Start';
    elements.pauseBtn.classList.add('hidden');
    
    broadcastTimerState();
  }

  function updateDisplay() {
    const minutes = Math.floor(timerState.timeRemaining / 60);
    const seconds = timerState.timeRemaining % 60;
    elements.time.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Update tab title
    if (timerState.isActive && !timerState.isPaused) {
      document.title = `(${minutes}:${seconds.toString().padStart(2, '0')}) ${document.title.replace(/^\(\d+:\d+\)\s*/, '')}`;
    }
  }

  function updateProgress() {
    const activePreset = document.querySelector('.syncspace-timer-presets button.active');
    const totalTime = parseInt(activePreset?.dataset.time || '25') * 60;
    const progress = ((totalTime - timerState.timeRemaining) / totalTime) * 100;
    elements.bar.style.width = `${progress}%`;
  }

  function playNotificationSound() {
    const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  }

  function showCompletionNotification() {
    const notification = document.createElement('div');
    notification.className = 'syncspace-timer-notification';
    notification.innerHTML = `
      <div class="syncspace-timer-notification-content">
        <span class="syncspace-timer-notification-icon">🎉</span>
        <span>${timerState.mode === 'work' ? 'Focus session complete!' : 'Break time over!'}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 5000);
  }

  function broadcastTimerState() {
    chrome.runtime.sendMessage({
      action: 'broadcastTimer',
      state: {
        isActive: timerState.isActive,
        isPaused: timerState.isPaused,
        timeRemaining: timerState.timeRemaining,
        mode: timerState.mode
      }
    });
  }

  function updatePartnerTimer(partnerState) {
    if (!elements.partnerStatus) return;
    
    if (partnerState.isActive) {
      const minutes = Math.floor(partnerState.timeRemaining / 60);
      const seconds = partnerState.timeRemaining % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      elements.partnerStatus.innerHTML = `
        <div class="syncspace-timer-partner-active">
          <span class="syncspace-timer-partner-dot"></span>
          <span>Partner focusing: ${timeStr}</span>
        </div>
      `;
      
      // Update sync status
      elements.syncDot.classList.add('synced');
      elements.syncText.textContent = 'Synced with partner';
      timerState.partnerSync = true;
    } else {
      elements.partnerStatus.innerHTML = `
        <div class="syncspace-timer-partner-idle">
          <span>Partner not focusing</span>
        </div>
      `;
      elements.syncDot.classList.remove('synced');
      elements.syncText.textContent = 'Solo focus';
      timerState.partnerSync = false;
    }
  }

  function showTimer() {
    if (!elements.container) {
      createTimerUI();
    }
    elements.container.classList.add('visible');
  }

  function hideTimer() {
    if (elements.container) {
      elements.container.classList.remove('visible');
    }
  }

  function toggleTimer() {
    if (elements.container?.classList.contains('visible')) {
      hideTimer();
    } else {
      showTimer();
    }
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'partnerTimerUpdate') {
      updatePartnerTimer(request.state);
    }
    if (request.type === 'toggleFocusTimer') {
      toggleTimer();
    }
  });

  // Keyboard shortcut: Ctrl+Shift+F to toggle timer
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      toggleTimer();
    }
  });

  // Initialize styles
  const style = document.createElement('style');
  style.textContent = `
    .syncspace-timer {
      position: fixed;
      top: 100px;
      right: 20px;
      width: 280px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transform: translateX(320px);
      opacity: 0;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    .syncspace-timer.visible {
      transform: translateX(0);
      opacity: 1;
    }
    
    .syncspace-timer.mode-work { border-top: 4px solid #ef4444; }
    .syncspace-timer.mode-shortBreak { border-top: 4px solid #10b981; }
    .syncspace-timer.mode-longBreak { border-top: 4px solid #3b82f6; }
    
    .syncspace-timer-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      cursor: move;
    }
    
    .syncspace-timer-icon { font-size: 20px; }
    .syncspace-timer-title { 
      flex: 1; 
      font-weight: 600; 
      font-size: 14px;
      color: #1f2937;
    }
    
    .syncspace-timer-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #9ca3af;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }
    
    .syncspace-timer-close:hover {
      background: #f3f4f6;
      color: #4b5563;
    }
    
    .syncspace-timer-display {
      text-align: center;
      padding: 24px 16px;
    }
    
    .syncspace-timer-time {
      display: block;
      font-size: 48px;
      font-weight: 700;
      color: #1f2937;
      font-variant-numeric: tabular-nums;
      line-height: 1;
    }
    
    .syncspace-timer-mode {
      display: block;
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .syncspace-timer-progress {
      height: 4px;
      background: #f3f4f6;
      margin: 0 16px;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .syncspace-timer-bar {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      width: 0%;
      transition: width 1s linear;
    }
    
    .syncspace-timer-sync-status {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 16px;
      font-size: 12px;
      color: #6b7280;
    }
    
    .syncspace-timer-sync-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #d1d5db;
    }
    
    .syncspace-timer-sync-dot.synced {
      background: #10b981;
      animation: pulse 2s infinite;
    }
    
    .syncspace-timer-controls {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
    }
    
    .syncspace-timer-btn {
      flex: 1;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .syncspace-timer-start {
      background: #1f2937;
      color: white;
    }
    
    .syncspace-timer-start:hover {
      background: #374151;
    }
    
    .syncspace-timer-pause {
      background: #f59e0b;
      color: white;
    }
    
    .syncspace-timer-reset {
      background: #f3f4f6;
      color: #4b5563;
    }
    
    .syncspace-timer-reset:hover {
      background: #e5e7eb;
    }
    
    .syncspace-timer-presets {
      display: flex;
      gap: 8px;
      padding: 0 16px 16px;
    }
    
    .syncspace-timer-presets button {
      flex: 1;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: white;
      font-size: 12px;
      color: #6b7280;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .syncspace-timer-presets button.active {
      background: #1f2937;
      color: white;
      border-color: #1f2937;
    }
    
    .syncspace-timer-presets button:hover:not(.active) {
      background: #f9fafb;
    }
    
    .syncspace-timer-partner {
      padding: 12px 16px;
      background: #f9fafb;
      border-top: 1px solid #f3f4f6;
    }
    
    .syncspace-timer-partner-active {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #059669;
    }
    
    .syncspace-timer-partner-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #10b981;
      animation: pulse 2s infinite;
    }
    
    .syncspace-timer-partner-idle {
      font-size: 12px;
      color: #9ca3af;
    }
    
    .syncspace-timer-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 2147483647;
      animation: slideIn 0.3s ease;
    }
    
    .syncspace-timer-notification-content {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: #1f2937;
    }
    
    .syncspace-timer-notification-icon {
      font-size: 24px;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);
})();
