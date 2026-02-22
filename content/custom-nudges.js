// SyncSpace - Custom Nudge Messages
// Let users create and send custom nudge messages

(function() {
  'use strict';

  if (window.syncSpaceCustomNudges) return;
  window.syncSpaceCustomNudges = true;

  const DEFAULT_NUDGES = [
    { emoji: '💜', text: 'Thinking of you' },
    { emoji: '👋', text: 'Hey there!' },
    { emoji: '☕', text: 'Coffee break?' },
    { emoji: '😊', text: 'How are you?' },
    { emoji: '❤️', text: 'Love you' },
    { emoji: '✨', text: 'You got this!' }
  ];

  let customNudges = [];
  let elements = {};

  async function loadCustomNudges() {
    const stored = await chrome.storage.local.get('customNudges');
    customNudges = stored.customNudges || [];
  }

  function createNudgePicker() {
    elements.overlay = document.createElement('div');
    elements.overlay.className = 'syncspace-nudge-picker-overlay';
    
    elements.container = document.createElement('div');
    elements.container.className = 'syncspace-nudge-picker';
    elements.container.innerHTML = `
      <div class="syncspace-nudge-picker-header">
        <span>Send a nudge</span>
        <button class="syncspace-nudge-picker-close">×</button>
      </div>
      
      <div class="syncspace-nudge-picker-grid">
        ${[...DEFAULT_NUDGES, ...customNudges].map((nudge, i) => `
          <button class="syncspace-nudge-picker-item" data-index="${i}">
            <span class="syncspace-nudge-picker-emoji">${nudge.emoji}</span>
            <span class="syncspace-nudge-picker-text">${nudge.text}</span>
          </button>
        `).join('')}
        <button class="syncspace-nudge-picker-item syncspace-nudge-picker-add">
          <span class="syncspace-nudge-picker-emoji">➕</span>
          <span class="syncspace-nudge-picker-text">Custom...</span>
        </button>
      </div>
      
      <div class="syncspace-nudge-picker-custom hidden">
        <input type="text" class="syncspace-nudge-picker-emoji-input" placeholder="Emoji" maxlength="2">
        <input type="text" class="syncspace-nudge-picker-text-input" placeholder="Your message" maxlength="50">
        <div class="syncspace-nudge-picker-custom-actions">
          <button class="syncspace-nudge-picker-cancel">Cancel</button>
          <button class="syncspace-nudge-picker-save">Save & Send</button>
        </div>
      </div>
    `;

    elements.overlay.appendChild(elements.container);
    document.body.appendChild(elements.overlay);

    // Cache elements
    elements.grid = elements.container.querySelector('.syncspace-nudge-picker-grid');
    elements.customForm = elements.container.querySelector('.syncspace-nudge-picker-custom');
    elements.emojiInput = elements.container.querySelector('.syncspace-nudge-picker-emoji-input');
    elements.textInput = elements.container.querySelector('.syncspace-nudge-picker-text-input');

    // Event listeners
    elements.container.querySelectorAll('.syncspace-nudge-picker-item:not(.syncspace-nudge-picker-add)').forEach(btn => {
      btn.addEventListener('click', () => sendNudge(parseInt(btn.dataset.index)));
    });

    elements.container.querySelector('.syncspace-nudge-picker-add').addEventListener('click', showCustomForm);
    elements.container.querySelector('.syncspace-nudge-picker-close').addEventListener('click', hidePicker);
    elements.container.querySelector('.syncspace-nudge-picker-cancel').addEventListener('click', hideCustomForm);
    elements.container.querySelector('.syncspace-nudge-picker-save').addEventListener('click', saveAndSendCustom);
    elements.overlay.addEventListener('click', (e) => {
      if (e.target === elements.overlay) hidePicker();
    });
  }

  function showPicker() {
    if (!elements.container) {
      loadCustomNudges().then(createNudgePicker);
    }
    elements.overlay?.classList.add('visible');
  }

  function hidePicker() {
    elements.overlay?.classList.remove('visible');
    hideCustomForm();
  }

  function showCustomForm() {
    elements.grid.classList.add('hidden');
    elements.customForm.classList.remove('hidden');
    elements.emojiInput.focus();
  }

  function hideCustomForm() {
    elements.grid.classList.remove('hidden');
    elements.customForm.classList.add('hidden');
    elements.emojiInput.value = '';
    elements.textInput.value = '';
  }

  async function saveAndSendCustom() {
    const emoji = elements.emojiInput.value.trim() || '💬';
    const text = elements.textInput.value.trim();
    
    if (!text) return;

    const nudge = { emoji, text };
    customNudges.push(nudge);
    
    // Save to storage
    await chrome.storage.local.set({ customNudges });
    
    // Send
    sendCustomNudge(nudge);
    
    // Refresh picker
    elements.overlay.remove();
    elements = {};
    loadCustomNudges().then(createNudgePicker);
    showPicker();
  }

  function sendNudge(index) {
    const allNudges = [...DEFAULT_NUDGES, ...customNudges];
    const nudge = allNudges[index];
    
    if (nudge) {
      sendCustomNudge(nudge);
      hidePicker();
    }
  }

  function sendCustomNudge(nudge) {
    chrome.runtime.sendMessage({
      action: 'sendCustomNudge',
      nudge: nudge
    });

    // Show confirmation
    showConfirmation(nudge);
  }

  function showConfirmation(nudge) {
    const confirmation = document.createElement('div');
    confirmation.className = 'syncspace-nudge-confirmation';
    confirmation.innerHTML = `
      <span>${nudge.emoji} Sent!</span>
    `;
    document.body.appendChild(confirmation);
    
    setTimeout(() => confirmation.remove(), 2000);
  }

  function showReceivedNudge(nudge) {
    const notification = document.createElement('div');
    notification.className = 'syncspace-nudge-received';
    notification.innerHTML = `
      <div class="syncspace-nudge-received-content">
        <span class="syncspace-nudge-received-emoji">${nudge.emoji}</span>
        <div class="syncspace-nudge-received-text">
          <div class="syncspace-nudge-received-label">Nudge from partner</div>
          <div class="syncspace-nudge-received-message">${nudge.text}</div>
        </div>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'customNudgeReceived') {
      showReceivedNudge(request.nudge);
    }
    if (request.type === 'showNudgePicker') {
      showPicker();
    }
  });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .syncspace-nudge-picker-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    
    .syncspace-nudge-picker-overlay.visible {
      opacity: 1;
      pointer-events: auto;
    }
    
    .syncspace-nudge-picker {
      background: white;
      border-radius: 20px;
      width: 320px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: scaleIn 0.3s ease;
    }
    
    @keyframes scaleIn {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .syncspace-nudge-picker-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #f3f4f6;
      font-weight: 600;
      font-size: 16px;
    }
    
    .syncspace-nudge-picker-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #9ca3af;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      transition: all 0.2s;
    }
    
    .syncspace-nudge-picker-close:hover {
      background: #f3f4f6;
      color: #4b5563;
    }
    
    .syncspace-nudge-picker-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      padding: 20px;
      max-height: 300px;
      overflow-y: auto;
    }
    
    .syncspace-nudge-picker-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .syncspace-nudge-picker-item:hover {
      background: #f9fafb;
      border-color: #a855f7;
      transform: translateY(-2px);
    }
    
    .syncspace-nudge-picker-emoji {
      font-size: 28px;
    }
    
    .syncspace-nudge-picker-text {
      font-size: 12px;
      color: #4b5563;
      text-align: center;
    }
    
    .syncspace-nudge-picker-custom {
      padding: 20px;
    }
    
    .syncspace-nudge-picker-custom input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .syncspace-nudge-picker-custom input:focus {
      outline: none;
      border-color: #a855f7;
    }
    
    .syncspace-nudge-picker-emoji-input {
      font-size: 20px;
      text-align: center;
    }
    
    .syncspace-nudge-picker-custom-actions {
      display: flex;
      gap: 12px;
    }
    
    .syncspace-nudge-picker-custom-actions button {
      flex: 1;
      padding: 12px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .syncspace-nudge-picker-cancel {
      background: #f3f4f6;
      border: none;
      color: #4b5563;
    }
    
    .syncspace-nudge-picker-save {
      background: #a855f7;
      border: none;
      color: white;
    }
    
    .syncspace-nudge-picker-save:hover {
      background: #9333ea;
    }
    
    .syncspace-nudge-confirmation {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      animation: slideIn 0.3s ease;
    }
    
    .syncspace-nudge-received {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px 20px;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 2147483647;
      animation: slideIn 0.3s ease;
      max-width: 280px;
    }
    
    .syncspace-nudge-received-content {
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    
    .syncspace-nudge-received-emoji {
      font-size: 32px;
    }
    
    .syncspace-nudge-received-label {
      font-size: 11px;
      color: #a855f7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    
    .syncspace-nudge-received-message {
      font-size: 14px;
      color: #1f2937;
      font-weight: 500;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100px); opacity: 0; }
    }
    
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);

  // Initialize
  loadCustomNudges();
})();
