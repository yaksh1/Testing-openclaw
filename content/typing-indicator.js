// SyncSpace - Typing Indicator
// Shows when partner is actively typing/browsing

(function() {
  'use strict';

  if (window.syncSpaceTypingIndicator) return;
  window.syncSpaceTypingIndicator = true;

  let typingTimeout = null;
  let isTyping = false;
  const TYPING_DELAY = 2000; // Stop typing after 2s of inactivity
  const BURST_THRESHOLD = 5; // Key presses in quick succession
  let keyPressCount = 0;
  let burstTimeout = null;

  function initTypingDetection() {
    // Track typing on input fields
    document.addEventListener('input', handleInput, { passive: true });
    document.addEventListener('keydown', handleKeydown, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
  }

  function handleInput() {
    startTyping();
  }

  function handleKeydown() {
    keyPressCount++;
    
    // Clear burst timeout
    clearTimeout(burstTimeout);
    burstTimeout = setTimeout(() => {
      keyPressCount = 0;
    }, 500);
    
    // If typing burst detected, send typing indicator
    if (keyPressCount >= BURST_THRESHOLD) {
      startTyping();
    }
  }

  function handleClick() {
    // Brief activity indicator on clicks
    startTyping();
    setTimeout(stopTyping, 500);
  }

  function handleScroll() {
    // Scroll indicates active reading
    startTyping();
  }

  function startTyping() {
    if (!isTyping) {
      isTyping = true;
      broadcastTypingState(true);
    }
    
    // Reset timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(stopTyping, TYPING_DELAY);
  }

  function stopTyping() {
    if (isTyping) {
      isTyping = false;
      broadcastTypingState(false);
    }
  }

  function broadcastTypingState(typing) {
    chrome.runtime.sendMessage({
      action: 'broadcastTyping',
      typing: typing,
      timestamp: Date.now()
    });
  }

  // Listen for partner typing
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'partnerTyping') {
      showPartnerTypingIndicator(request.typing);
    }
  });

  function showPartnerTypingIndicator(typing) {
    let indicator = document.querySelector('.syncspace-typing-indicator');
    
    if (typing) {
      if (!indicator) {
        indicator = createTypingIndicator();
      }
      indicator.classList.add('active');
    } else {
      if (indicator) {
        indicator.classList.remove('active');
        setTimeout(() => indicator.remove(), 300);
      }
    }
  }

  function createTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'syncspace-typing-indicator';
    indicator.innerHTML = `
      <div class="syncspace-typing-bubble">
        <span class="syncspace-typing-text">Partner is typing...</span>
        <span class="syncspace-typing-dots">
          <span></span>
          <span></span>
          <span></span>
        </span>
      </div>
    `;
    document.body.appendChild(indicator);
    return indicator;
  }

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .syncspace-typing-indicator {
      position: fixed;
      bottom: 80px;
      right: 20px;
      z-index: 2147483646;
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    
    .syncspace-typing-indicator.active {
      opacity: 1;
      transform: translateY(0);
    }
    
    .syncspace-typing-bubble {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      padding: 10px 16px;
      border-radius: 20px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      font-size: 13px;
      color: #6b7280;
    }
    
    .syncspace-typing-dots {
      display: flex;
      gap: 3px;
    }
    
    .syncspace-typing-dots span {
      width: 5px;
      height: 5px;
      background: #a855f7;
      border-radius: 50%;
      animation: typingBounce 1.4s infinite ease-in-out both;
    }
    
    .syncspace-typing-dots span:nth-child(1) { animation-delay: -0.32s; }
    .syncspace-typing-dots span:nth-child(2) { animation-delay: -0.16s; }
    
    @keyframes typingBounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  // Initialize
  initTypingDetection();
})();
