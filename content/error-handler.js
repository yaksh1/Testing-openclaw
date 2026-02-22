// SyncSpace - Error Handler & Logger
// Comprehensive error handling and debugging

(function() {
  'use strict';

  if (window.syncSpaceErrorHandler) return;
  window.syncSpaceErrorHandler = true;

  const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };

  let currentLogLevel = LOG_LEVELS.INFO;
  let logs = [];
  const MAX_LOGS = 100;

  function log(level, message, data = null) {
    if (level < currentLogLevel) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level: Object.keys(LOG_LEVELS)[level],
      message,
      data,
      url: window.location.href
    };

    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.shift();

    // Console output
    const prefix = '[SyncSpace]';
    switch(level) {
      case LOG_LEVELS.DEBUG:
        console.debug(prefix, message, data || '');
        break;
      case LOG_LEVELS.INFO:
        console.info(prefix, message, data || '');
        break;
      case LOG_LEVELS.WARN:
        console.warn(prefix, message, data || '');
        break;
      case LOG_LEVELS.ERROR:
        console.error(prefix, message, data || '');
        break;
    }

    // Store for debugging
    chrome.storage.local.set({ syncSpaceLogs: logs.slice(-50) });
  }

  // Global error handler
  window.addEventListener('error', (e) => {
    log(LOG_LEVELS.ERROR, 'JavaScript Error', {
      message: e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      error: e.error?.toString()
    });
    showErrorNotification('Something went wrong. Please try again.');
  });

  window.addEventListener('unhandledrejection', (e) => {
    log(LOG_LEVELS.ERROR, 'Unhandled Promise Rejection', {
      reason: e.reason?.toString?.() || e.reason
    });
  });

  // Connection error handler
  function handleConnectionError(error, context) {
    log(LOG_LEVELS.ERROR, `Connection error in ${context}`, error);
    
    const errorMessages = {
      'failed-to-connect': 'Could not connect to partner. Please try again.',
      'connection-lost': 'Connection lost. Attempting to reconnect...',
      'signaling-failed': 'Signaling server unavailable. Please try later.',
      'webrtc-failed': 'Direct connection failed. Check your network.',
      'timeout': 'Connection timed out. Please try again.'
    };

    const message = errorMessages[error.code] || 'Connection error. Please try again.';
    showErrorNotification(message);
  }

  function showErrorNotification(message) {
    // Remove existing error notifications
    document.querySelectorAll('.syncspace-error-notification').forEach(el => el.remove());

    const notification = document.createElement('div');
    notification.className = 'syncspace-error-notification';
    notification.innerHTML = `
      <span class="syncspace-error-icon">⚠️</span>
      <span class="syncspace-error-message">${message}</span>
      <button class="syncspace-error-close">×</button>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.syncspace-error-close').addEventListener('click', () => {
      notification.remove();
    });

    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 8000);
  }

  function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'syncspace-success-notification';
    notification.innerHTML = `
      <span class="syncspace-success-icon">✅</span>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
  }

  // Network status monitoring
  function initNetworkMonitoring() {
    window.addEventListener('online', () => {
      log(LOG_LEVELS.INFO, 'Network connection restored');
      showSuccessNotification('Back online!');
    });

    window.addEventListener('offline', () => {
      log(LOG_LEVELS.WARN, 'Network connection lost');
      showErrorNotification('You are offline. Some features may not work.');
    });
  }

  // Test connection flow
  async function testConnection() {
    log(LOG_LEVELS.INFO, 'Starting connection test');
    
    const tests = [
      { name: 'Storage', test: testStorage },
      { name: 'Network', test: testNetwork },
      { name: 'Signaling', test: testSignaling },
      { name: 'WebRTC', test: testWebRTC }
    ];

    const results = [];
    
    for (const { name, test } of tests) {
      try {
        const result = await test();
        results.push({ name, status: result ? '✅' : '❌', passed: result });
        log(LOG_LEVELS.INFO, `Test ${name}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (e) {
        results.push({ name, status: '❌', passed: false, error: e.message });
        log(LOG_LEVELS.ERROR, `Test ${name} error`, e);
      }
    }

    return results;
  }

  async function testStorage() {
    try {
      await chrome.storage.local.set({ test: 'value' });
      const result = await chrome.storage.local.get('test');
      await chrome.storage.local.remove('test');
      return result.test === 'value';
    } catch (e) {
      return false;
    }
  }

  async function testNetwork() {
    return navigator.onLine;
  }

  async function testSignaling() {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      
      // Try to connect to signaling server
      const testSocket = io('https://syncspace-signaling.onrender.com', {
        timeout: 5000,
        reconnection: false
      });

      testSocket.on('connect', () => {
        clearTimeout(timeout);
        testSocket.disconnect();
        resolve(true);
      });

      testSocket.on('connect_error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  async function testWebRTC() {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      
      // Create data channel to test
      const dc = pc.createDataChannel('test');
      
      // Try to create offer
      await pc.createOffer();
      
      pc.close();
      return true;
    } catch (e) {
      return false;
    }
  }

  // Debug panel
  function createDebugPanel() {
    const panel = document.createElement('div');
    panel.className = 'syncspace-debug-panel';
    panel.innerHTML = `
      <div class="syncspace-debug-header">
        <span>🐛 SyncSpace Debug</span>
        <button class="syncspace-debug-close">×</button>
      </div>
      <div class="syncspace-debug-content">
        <div class="syncspace-debug-section">
          <button class="syncspace-debug-btn" id="test-connection">Test Connection</button>
          <button class="syncspace-debug-btn" id="view-logs">View Logs</button>
          <button class="syncspace-debug-btn" id="clear-logs">Clear Logs</button>
        </div>
        <div class="syncspace-debug-section">
          <div class="syncspace-debug-info"></div>
        </div>
        <div class="syncspace-debug-logs hidden"></div>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('.syncspace-debug-close').addEventListener('click', () => panel.remove());
    
    panel.querySelector('#test-connection').addEventListener('click', async () => {
      const info = panel.querySelector('.syncspace-debug-info');
      info.innerHTML = 'Testing...';
      
      const results = await testConnection();
      info.innerHTML = results.map(r => `
        <div class="syncspace-debug-result ${r.passed ? 'pass' : 'fail'}">
          ${r.status} ${r.name}
        </div>
      `).join('');
    });

    panel.querySelector('#view-logs').addEventListener('click', async () => {
      const logsDiv = panel.querySelector('.syncspace-debug-logs');
      const stored = await chrome.storage.local.get('syncSpaceLogs');
      
      logsDiv.innerHTML = (stored.syncSpaceLogs || []).map(log => `
        <div class="syncspace-debug-log ${log.level.toLowerCase()}">
          <span class="syncspace-debug-log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
          <span class="syncspace-debug-log-level">${log.level}</span>
          <span class="syncspace-debug-log-msg">${log.message}</span>
        </div>
      `).join('') || 'No logs available';
      
      logsDiv.classList.toggle('hidden');
    });

    panel.querySelector('#clear-logs').addEventListener('click', async () => {
      await chrome.storage.local.remove('syncSpaceLogs');
      logs = [];
      panel.querySelector('.syncspace-debug-logs').innerHTML = '';
    });
  }

  // Expose to global for debugging
  window.SyncSpaceDebug = {
    log: (msg, data) => log(LOG_LEVELS.DEBUG, msg, data),
    testConnection,
    showPanel: createDebugPanel,
    getLogs: () => logs
  };

  // Keyboard shortcut: Ctrl+Shift+0 for debug panel
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === '0') {
      e.preventDefault();
      createDebugPanel();
    }
  });

  // Initialize
  initNetworkMonitoring();
  log(LOG_LEVELS.INFO, 'SyncSpace error handler initialized');

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .syncspace-error-notification,
    .syncspace-success-notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 14px 18px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 2147483647;
      animation: slideIn 0.3s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 320px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .syncspace-error-notification {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    
    .syncspace-success-notification {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }
    
    .syncspace-error-icon,
    .syncspace-success-icon {
      font-size: 18px;
      flex-shrink: 0;
    }
    
    .syncspace-error-close {
      background: none;
      border: none;
      font-size: 18px;
      color: inherit;
      opacity: 0.5;
      cursor: pointer;
      padding: 0;
      margin-left: 8px;
    }
    
    .syncspace-error-close:hover {
      opacity: 1;
    }
    
    .syncspace-debug-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 400px;
      max-height: 80vh;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      z-index: 2147483647;
      overflow: hidden;
      font-family: monospace;
      font-size: 12px;
    }
    
    .syncspace-debug-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background: #1f2937;
      color: white;
      font-weight: 600;
    }
    
    .syncspace-debug-close {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    }
    
    .syncspace-debug-content {
      padding: 16px;
      max-height: 60vh;
      overflow-y: auto;
    }
    
    .syncspace-debug-section {
      margin-bottom: 16px;
    }
    
    .syncspace-debug-btn {
      background: #f3f4f6;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      margin-right: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .syncspace-debug-btn:hover {
      background: #e5e7eb;
    }
    
    .syncspace-debug-result {
      padding: 8px;
      border-radius: 6px;
      margin-bottom: 4px;
    }
    
    .syncspace-debug-result.pass {
      background: #dcfce7;
      color: #166534;
    }
    
    .syncspace-debug-result.fail {
      background: #fee2e2;
      color: #dc2626;
    }
    
    .syncspace-debug-log {
      padding: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .syncspace-debug-log.error { color: #dc2626; }
    .syncspace-debug-log.warn { color: #d97706; }
    .syncspace-debug-log.debug { color: #6b7280; }
    
    .syncspace-debug-log-time {
      color: #9ca3af;
      margin-right: 8px;
    }
    
    .syncspace-debug-log-level {
      font-weight: bold;
      margin-right: 8px;
    }
    
    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);
})();
