// SyncSpace - Theme Manager (Dark Mode)
// Handles dark/light mode switching

(function() {
  'use strict';

  if (window.syncSpaceTheme) return;
  window.syncSpaceTheme = true;

  let currentTheme = 'light';
  let elements = {};

  async function initTheme() {
    const stored = await chrome.storage.local.get('theme');
    currentTheme = stored.theme || 'light';
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-syncspace-theme', theme);
    
    // Update all SyncSpace elements
    const containers = document.querySelectorAll([
      '.syncspace-timer',
      '.syncspace-playlist',
      '.syncspace-nudge-picker',
      '.syncspace-settings'
    ].join(','));
    
    containers.forEach(el => {
      el.setAttribute('data-theme', theme);
    });

    // Save preference
    chrome.storage.local.set({ theme });
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    
    // Show notification
    showThemeNotification(newTheme);
  }

  function showThemeNotification(theme) {
    const notification = document.createElement('div');
    notification.className = 'syncspace-theme-notification';
    notification.innerHTML = `
      <span>${theme === 'dark' ? '🌙' : '☀️'} ${theme === 'dark' ? 'Dark' : 'Light'} mode enabled</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  // Add global styles for theming
  const style = document.createElement('style');
  style.textContent = `
    /* Light theme (default) */
    :root {
      --ss-bg: white;
      --ss-bg-secondary: #f9fafb;
      --ss-text: #1f2937;
      --ss-text-secondary: #6b7280;
      --ss-border: #e5e7eb;
      --ss-accent: #a855f7;
      --ss-accent-hover: #9333ea;
      --ss-shadow: rgba(0,0,0,0.1);
      --ss-overlay: rgba(0,0,0,0.5);
    }

    /* Dark theme */
    [data-syncspace-theme="dark"] {
      --ss-bg: #1f2937;
      --ss-bg-secondary: #111827;
      --ss-text: #f9fafb;
      --ss-text-secondary: #9ca3af;
      --ss-border: #374151;
      --ss-accent: #c084fc;
      --ss-accent-hover: #a855f7;
      --ss-shadow: rgba(0,0,0,0.3);
      --ss-overlay: rgba(0,0,0,0.7);
    }

    /* Apply to all SyncSpace components */
    .syncspace-timer,
    .syncspace-playlist,
    .syncspace-nudge-picker,
    .syncspace-settings {
      background: var(--ss-bg) !important;
      color: var(--ss-text) !important;
    }

    .syncspace-timer-header,
    .syncspace-playlist-header,
    .syncspace-nudge-picker-header,
    .syncspace-settings-header {
      border-color: var(--ss-border) !important;
    }

    .syncspace-timer-time,
    .syncspace-playlist-title,
    .syncspace-nudge-picker-title {
      color: var(--ss-text) !important;
    }

    .syncspace-timer-mode,
    .syncspace-playlist-track-name,
    .syncspace-nudge-picker-text {
      color: var(--ss-text-secondary) !important;
    }

    .syncspace-timer-presets button,
    .syncspace-playlist-track,
    .syncspace-nudge-picker-item {
      background: var(--ss-bg) !important;
      border-color: var(--ss-border) !important;
      color: var(--ss-text) !important;
    }

    .syncspace-timer-presets button:hover,
    .syncspace-playlist-track:hover,
    .syncspace-nudge-picker-item:hover {
      background: var(--ss-bg-secondary) !important;
    }

    .syncspace-timer-presets button.active,
    .syncspace-playlist-track.active {
      background: var(--ss-accent) !important;
      border-color: var(--ss-accent) !important;
      color: white !important;
    }

    .syncspace-timer-btn,
    .syncspace-playlist-btn {
      background: var(--ss-bg-secondary) !important;
      color: var(--ss-text) !important;
    }

    .syncspace-timer-btn:hover,
    .syncspace-playlist-btn:hover {
      background: var(--ss-border) !important;
    }

    .syncspace-timer-partner,
    .syncspace-playlist-partner,
    .syncspace-nudge-picker-custom {
      background: var(--ss-bg-secondary) !important;
      border-color: var(--ss-border) !important;
    }

    .syncspace-timer input,
    .syncspace-playlist input,
    .syncspace-nudge-picker input {
      background: var(--ss-bg-secondary) !important;
      border-color: var(--ss-border) !important;
      color: var(--ss-text) !important;
    }

    .syncspace-theme-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--ss-accent);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      animation: slideIn 0.3s ease;
    }

    @keyframes fadeOut {
      to { opacity: 0; transform: translateY(-10px); }
    }
  `;
  document.head.appendChild(style);

  // Listen for theme toggle command
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'toggleTheme') {
      toggleTheme();
    }
    if (request.type === 'getTheme') {
      return currentTheme;
    }
  });

  // Keyboard shortcut: Ctrl+Shift+D for dark mode
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Initialize
  initTheme();
})();
