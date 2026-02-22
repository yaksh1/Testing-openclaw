// SyncSpace - Settings Panel
// Customization options for users

(function() {
  'use strict';

  if (window.syncSpaceSettings) return;
  window.syncSpaceSettings = true;

  let settings = {
    theme: 'light',
    glowIntensity: 'medium',
    nudgeSound: true,
    autoSync: true,
    showTyping: true,
    showNotifications: true
  };

  let elements = {};

  async function loadSettings() {
    const stored = await chrome.storage.local.get('syncSpaceSettings');
    settings = { ...settings, ...stored.syncSpaceSettings };
    applySettings();
  }

  async function saveSettings() {
    await chrome.storage.local.set({ syncSpaceSettings: settings });
  }

  function createSettingsPanel() {
    elements.overlay = document.createElement('div');
    elements.overlay.className = 'syncspace-settings-overlay';
    
    elements.container = document.createElement('div');
    elements.container.className = 'syncspace-settings';
    elements.container.innerHTML = `
      <div class="syncspace-settings-header">
        <span class="syncspace-settings-icon">⚙️</span>
        <span class="syncspace-settings-title">Settings</span>
        <button class="syncspace-settings-close">×</button>
      </div>
      
      <div class="syncspace-settings-content">
        <div class="syncspace-settings-section">
          <div class="syncspace-settings-section-title">Appearance</div>
          
          <div class="syncspace-settings-item">
            <label>Theme</label>
            <div class="syncspace-settings-options">
              <button class="syncspace-settings-option" data-setting="theme" data-value="light">☀️ Light</button>
              <button class="syncspace-settings-option" data-setting="theme" data-value="dark">🌙 Dark</button>
              <button class="syncspace-settings-option" data-setting="theme" data-value="auto">🔄 Auto</button>
            </div>
          </div>
          
          <div class="syncspace-settings-item">
            <label>Glow Intensity</label>
            <div class="syncspace-settings-options">
              <button class="syncspace-settings-option" data-setting="glowIntensity" data-value="subtle">Subtle</button>
              <button class="syncspace-settings-option" data-setting="glowIntensity" data-value="medium">Medium</button>
              <button class="syncspace-settings-option" data-setting="glowIntensity" data-value="strong">Strong</button>
            </div>
          </div>
        </div>
        
        <div class="syncspace-settings-section">
          <div class="syncspace-settings-section-title">Notifications</div>
          
          <div class="syncspace-settings-item syncspace-settings-toggle">
            <label>Nudge Sound</label>
            <label class="syncspace-settings-switch">
              <input type="checkbox" data-setting="nudgeSound">
              <span class="syncspace-settings-slider"></span>
            </label>
          </div>
          
          <div class="syncspace-settings-item syncspace-settings-toggle">
            <label>Show Typing Indicator</label>
            <label class="syncspace-settings-switch">
              <input type="checkbox" data-setting="showTyping">
              <span class="syncspace-settings-slider"></span>
            </label>
          </div>
          
          <div class="syncspace-settings-item syncspace-settings-toggle">
            <label>Desktop Notifications</label>
            <label class="syncspace-settings-switch">
              <input type="checkbox" data-setting="showNotifications">
              <span class="syncspace-settings-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="syncspace-settings-section">
          <div class="syncspace-settings-section-title">Sync</div>
          
          <div class="syncspace-settings-item syncspace-settings-toggle">
            <label>Auto-sync with partner</label>
            <label class="syncspace-settings-switch">
              <input type="checkbox" data-setting="autoSync">
              <span class="syncspace-settings-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="syncspace-settings-section">
          <div class="syncspace-settings-section-title">Keyboard Shortcuts</div>
          <div class="syncspace-settings-shortcuts">
            <div class="syncspace-settings-shortcut">
              <span>Ctrl+Shift+F</span>
              <span>Focus Timer</span>
            </div>
            <div class="syncspace-settings-shortcut">
              <span>Ctrl+Shift+M</span>
              <span>Music Playlist</span>
            </div>
            <div class="syncspace-settings-shortcut">
              <span>Ctrl+Shift+D</span>
              <span>Toggle Dark Mode</span>
            </div>
            <div class="syncspace-settings-shortcut">
              <span>Ctrl+Shift+S</span>
              <span>Open Settings</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="syncspace-settings-footer">
        <button class="syncspace-settings-reset">Reset to Defaults</button>
        <span class="syncspace-settings-version">SyncSpace v0.1.0</span>
      </div>
    `;

    elements.overlay.appendChild(elements.container);
    document.body.appendChild(elements.overlay);

    // Event listeners
    elements.container.querySelector('.syncspace-settings-close').addEventListener('click', hideSettings);
    elements.overlay.addEventListener('click', (e) => {
      if (e.target === elements.overlay) hideSettings();
    });

    // Option buttons
    elements.container.querySelectorAll('.syncspace-settings-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const setting = btn.dataset.setting;
        const value = btn.dataset.value;
        updateSetting(setting, value);
        updateUI();
      });
    });

    // Toggle switches
    elements.container.querySelectorAll('.syncspace-settings-switch input').forEach(input => {
      input.addEventListener('change', () => {
        const setting = input.dataset.setting;
        updateSetting(setting, input.checked);
      });
    });

    // Reset button
    elements.container.querySelector('.syncspace-settings-reset').addEventListener('click', resetSettings);

    updateUI();
  }

  function updateSetting(key, value) {
    settings[key] = value;
    saveSettings();
    applySettings();
  }

  function applySettings() {
    // Apply theme
    if (settings.theme === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-syncspace-theme', prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-syncspace-theme', settings.theme);
    }

    // Apply glow intensity
    const glowOpacity = {
      subtle: '0.3',
      medium: '0.5',
      strong: '0.8'
    };
    document.documentElement.style.setProperty('--ss-glow-opacity', glowOpacity[settings.glowIntensity] || '0.5');

    // Broadcast to other components
    window.dispatchEvent(new CustomEvent('syncspace-settings-changed', { detail: settings }));
  }

  function updateUI() {
    // Update option buttons
    elements.container.querySelectorAll('.syncspace-settings-option').forEach(btn => {
      const isActive = settings[btn.dataset.setting] === btn.dataset.value;
      btn.classList.toggle('active', isActive);
    });

    // Update toggles
    elements.container.querySelectorAll('.syncspace-settings-switch input').forEach(input => {
      input.checked = settings[input.dataset.setting];
    });
  }

  async function resetSettings() {
    if (confirm('Reset all settings to defaults?')) {
      settings = {
        theme: 'light',
        glowIntensity: 'medium',
        nudgeSound: true,
        autoSync: true,
        showTyping: true,
        showNotifications: true
      };
      await saveSettings();
      applySettings();
      updateUI();
    }
  }

  function showSettings() {
    if (!elements.container) {
      loadSettings().then(createSettingsPanel);
    } else {
      updateUI();
    }
    elements.overlay?.classList.add('visible');
  }

  function hideSettings() {
    elements.overlay?.classList.remove('visible');
  }

  function toggleSettings() {
    if (elements.overlay?.classList.contains('visible')) {
      hideSettings();
    } else {
      showSettings();
    }
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'toggleSettings') {
      toggleSettings();
    }
    if (request.type === 'getSettings') {
      return settings;
    }
  });

  // Keyboard shortcut: Ctrl+Shift+S for settings
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      toggleSettings();
    }
  });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .syncspace-settings-overlay {
      position: fixed;
      inset: 0;
      background: var(--ss-overlay, rgba(0,0,0,0.5));
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .syncspace-settings-overlay.visible {
      opacity: 1;
      pointer-events: auto;
    }
    
    .syncspace-settings {
      background: var(--ss-bg, white);
      border-radius: 20px;
      width: 380px;
      max-height: 85vh;
      overflow: hidden;
      box-shadow: 0 20px 60px var(--ss-shadow, rgba(0,0,0,0.3));
      animation: scaleIn 0.3s ease;
      display: flex;
      flex-direction: column;
    }
    
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .syncspace-settings-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px;
      border-bottom: 1px solid var(--ss-border, #e5e7eb);
    }
    
    .syncspace-settings-icon { font-size: 22px; }
    .syncspace-settings-title { 
      flex: 1; 
      font-weight: 600; 
      font-size: 18px;
      color: var(--ss-text, #1f2937);
    }
    
    .syncspace-settings-close {
      background: none;
      border: none;
      font-size: 28px;
      color: var(--ss-text-secondary, #9ca3af);
      cursor: pointer;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      transition: all 0.2s;
    }
    
    .syncspace-settings-close:hover {
      background: var(--ss-bg-secondary, #f3f4f6);
      color: var(--ss-text, #1f2937);
    }
    
    .syncspace-settings-content {
      overflow-y: auto;
      padding: 20px;
      flex: 1;
    }
    
    .syncspace-settings-section {
      margin-bottom: 24px;
    }
    
    .syncspace-settings-section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--ss-accent, #a855f7);
      margin-bottom: 12px;
    }
    
    .syncspace-settings-item {
      margin-bottom: 16px;
    }
    
    .syncspace-settings-item > label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: var(--ss-text, #1f2937);
      margin-bottom: 8px;
    }
    
    .syncspace-settings-options {
      display: flex;
      gap: 8px;
    }
    
    .syncspace-settings-option {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--ss-border, #e5e7eb);
      border-radius: 10px;
      background: var(--ss-bg, white);
      font-size: 13px;
      color: var(--ss-text-secondary, #6b7280);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .syncspace-settings-option:hover {
      border-color: var(--ss-accent, #a855f7);
    }
    
    .syncspace-settings-option.active {
      background: var(--ss-accent, #a855f7);
      border-color: var(--ss-accent, #a855f7);
      color: white;
    }
    
    .syncspace-settings-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .syncspace-settings-toggle label:first-child {
      margin-bottom: 0;
    }
    
    .syncspace-settings-switch {
      position: relative;
      display: inline-block;
      width: 48px;
      height: 26px;
    }
    
    .syncspace-settings-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .syncspace-settings-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: var(--ss-border, #e5e7eb);
      border-radius: 26px;
      transition: 0.3s;
    }
    
    .syncspace-settings-slider:before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .syncspace-settings-switch input:checked + .syncspace-settings-slider {
      background: var(--ss-accent, #a855f7);
    }
    
    .syncspace-settings-switch input:checked + .syncspace-settings-slider:before {
      transform: translateX(22px);
    }
    
    .syncspace-settings-shortcuts {
      background: var(--ss-bg-secondary, #f9fafb);
      border-radius: 12px;
      padding: 12px;
    }
    
    .syncspace-settings-shortcut {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
      border-bottom: 1px solid var(--ss-border, #e5e7eb);
    }
    
    .syncspace-settings-shortcut:last-child {
      border-bottom: none;
    }
    
    .syncspace-settings-shortcut span:first-child {
      font-family: monospace;
      background: var(--ss-bg, white);
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 12px;
      color: var(--ss-text-secondary, #6b7280);
    }
    
    .syncspace-settings-shortcut span:last-child {
      color: var(--ss-text, #1f2937);
    }
    
    .syncspace-settings-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-top: 1px solid var(--ss-border, #e5e7eb);
      background: var(--ss-bg-secondary, #f9fafb);
    }
    
    .syncspace-settings-reset {
      background: none;
      border: none;
      color: var(--ss-text-secondary, #6b7280);
      font-size: 13px;
      cursor: pointer;
      text-decoration: underline;
    }
    
    .syncspace-settings-reset:hover {
      color: #ef4444;
    }
    
    .syncspace-settings-version {
      font-size: 12px;
      color: var(--ss-text-secondary, #9ca3af);
    }
  `;
  document.head.appendChild(style);

  // Initialize
  loadSettings();
})();
