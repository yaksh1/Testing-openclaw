// SyncSpace - Presence Glow
// Injects ambient UI when partner is online

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.syncSpaceInjected) return;
  window.syncSpaceInjected = true;

  let elements = {};
  let partnerOnline = false;
  let syncMode = false;

  function createElements() {
    // Top glow bar
    elements.glowTop = document.createElement('div');
    elements.glowTop.className = 'syncspace-glow syncspace-glow-top';
    
    // Corner orbs
    elements.orbTopRight = document.createElement('div');
    elements.orbTopRight.className = 'syncspace-glow syncspace-orb top-right';
    
    elements.orbBottomLeft = document.createElement('div');
    elements.orbBottomLeft.className = 'syncspace-glow syncspace-orb bottom-left';
    
    // Nudge overlay
    elements.nudge = document.createElement('div');
    elements.nudge.className = 'syncspace-nudge';
    elements.nudge.innerHTML = `
      <div class="syncspace-nudge-ring"></div>
      <div class="syncspace-nudge-heart">💜</div>
    `;
    
    // Sync mode overlay
    elements.syncMode = document.createElement('div');
    elements.syncMode.className = 'syncspace-sync-mode';
    
    // Status dot
    elements.status = document.createElement('div');
    elements.status.className = 'syncspace-status';

    // Append all
    document.body.appendChild(elements.glowTop);
    document.body.appendChild(elements.orbTopRight);
    document.body.appendChild(elements.orbBottomLeft);
    document.body.appendChild(elements.nudge);
    document.body.appendChild(elements.syncMode);
    document.body.appendChild(elements.status);
  }

  function setPartnerOnline(online) {
    partnerOnline = online;
    
    if (online) {
      elements.glowTop.classList.add('active');
      elements.orbTopRight.classList.add('active');
      elements.orbBottomLeft.classList.add('active');
      elements.status.classList.add('online');
    } else {
      elements.glowTop.classList.remove('active');
      elements.orbTopRight.classList.remove('active');
      elements.orbBottomLeft.classList.remove('active');
      elements.status.classList.remove('online');
      elements.syncMode.classList.remove('active');
      syncMode = false;
    }
  }

  function triggerNudge() {
    elements.nudge.classList.remove('active');
    // Force reflow
    void elements.nudge.offsetWidth;
    elements.nudge.classList.add('active');
    
    // Remove after animation
    setTimeout(() => {
      elements.nudge.classList.remove('active');
    }, 2000);
  }

  function toggleSyncMode() {
    syncMode = !syncMode;
    if (syncMode && partnerOnline) {
      elements.syncMode.classList.add('active');
    } else {
      elements.syncMode.classList.remove('active');
    }
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch(request.type) {
      case 'partnerPresence':
        setPartnerOnline(request.online);
        break;
      case 'nudgeReceived':
        triggerNudge();
        break;
      case 'toggleSyncMode':
        toggleSyncMode();
        break;
    }
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createElements);
  } else {
    createElements();
  }

  // Check initial status
  chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
    if (response?.isOnline) {
      setPartnerOnline(true);
    }
  });
})();
