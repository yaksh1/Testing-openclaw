// SyncSpace - Nudge Handler
// Handles double-click on extension icon to send nudges

(function() {
  'use strict';

  let lastClickTime = 0;
  const DOUBLE_CLICK_DELAY = 300;

  // Listen for nudge commands from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'nudgeReceived') {
      showNudgeNotification();
    }
  });

  function showNudgeNotification() {
    // Create a subtle notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #1f2937;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
      <span style="font-size: 20px;">💜</span>
      <span>Your partner is thinking of you</span>
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Handle keyboard shortcut (Ctrl+Shift+S for sync toggle)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      chrome.runtime.sendMessage({ action: 'toggleSyncMode' });
    }
  });
})();
