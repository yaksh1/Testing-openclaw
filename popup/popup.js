// SyncSpace Popup
// Handles UI interactions and state management

document.addEventListener('DOMContentLoaded', async () => {
  // State
  let currentState = 'not-connected'; // not-connected, creating-code, entering-code, connected
  let partnerOnline = false;

  // Elements
  const views = {
    notConnected: document.getElementById('not-connected'),
    creatingCode: document.getElementById('creating-code'),
    enteringCode: document.getElementById('entering-code'),
    connected: document.getElementById('connected')
  };

  const buttons = {
    create: document.getElementById('btn-create'),
    join: document.getElementById('btn-join'),
    cancelCreate: document.getElementById('btn-cancel-create'),
    cancelJoin: document.getElementById('btn-cancel-join'),
    connect: document.getElementById('btn-connect'),
    nudge: document.getElementById('btn-nudge'),
    disconnect: document.getElementById('btn-disconnect')
  };

  const displays = {
    pairingCode: document.getElementById('pairing-code'),
    codeInput: document.getElementById('code-input'),
    partnerDot: document.getElementById('partner-dot'),
    partnerStatus: document.getElementById('partner-status'),
    streak: document.getElementById('streak-display'),
    streakLabel: document.getElementById('streak-label')
  };

  // Initialize
  await loadStatus();

  // Event Listeners
  buttons.create.addEventListener('click', createPairing);
  buttons.join.addEventListener('click', () => switchView('entering-code'));
  buttons.cancelCreate.addEventListener('click', () => switchView('not-connected'));
  buttons.cancelJoin.addEventListener('click', () => switchView('not-connected'));
  buttons.connect.addEventListener('click', joinPairing);
  buttons.nudge.addEventListener('click', sendNudge);
  buttons.disconnect.addEventListener('click', disconnect);

  displays.codeInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
  });

  // Functions
  async function loadStatus() {
    const response = await chrome.runtime.sendMessage({ action: 'getStatus' });
    
    if (response.partnerId) {
      currentState = 'connected';
      partnerOnline = response.isOnline;
      updateConnectedView(response);
    } else {
      currentState = 'not-connected';
    }
    
    switchView(currentState);
  }

  function switchView(viewName) {
    Object.values(views).forEach(el => el.classList.add('hidden'));
    views[viewName === 'creating-code' ? 'creatingCode' : 
          viewName === 'entering-code' ? 'enteringCode' : 
          viewName === 'connected' ? 'connected' : 'notConnected'].classList.remove('hidden');
    currentState = viewName;
  }

  async function createPairing() {
    switchView('creating-code');
    
    const response = await chrome.runtime.sendMessage({ action: 'createPairing' });
    displays.pairingCode.textContent = response.code;

    // Poll for connection
    pollForConnection();
  }

  async function joinPairing() {
    const code = displays.codeInput.value;
    if (code.length !== 6) {
      alert('Please enter a 6-digit code');
      return;
    }

    buttons.connect.disabled = true;
    buttons.connect.textContent = 'Connecting...';

    const response = await chrome.runtime.sendMessage({ action: 'joinPairing', code });

    if (response.success) {
      switchView('connected');
      pollForConnection();
    } else {
      alert('Could not connect. Please check the code and try again.');
      buttons.connect.disabled = false;
      buttons.connect.textContent = 'Connect';
    }
  }

  function pollForConnection() {
    const interval = setInterval(async () => {
      const status = await chrome.runtime.sendMessage({ action: 'getStatus' });
      
      if (status.isOnline) {
        clearInterval(interval);
        partnerOnline = true;
        updateConnectedView(status);
        switchView('connected');
      }
    }, 1000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(interval), 5 * 60 * 1000);
  }

  function updateConnectedView(status) {
    if (status.isOnline) {
      displays.partnerDot.classList.remove('offline');
      displays.partnerStatus.textContent = 'Partner online';
      buttons.nudge.disabled = false;
    } else {
      displays.partnerDot.classList.add('offline');
      displays.partnerStatus.textContent = 'Partner offline';
      buttons.nudge.disabled = true;
    }

    if (status.streak > 0) {
      displays.streak.textContent = status.streak;
      displays.streak.classList.remove('hidden');
      displays.streakLabel.classList.remove('hidden');
    }
  }

  async function sendNudge() {
    const response = await chrome.runtime.sendMessage({ action: 'sendNudge' });
    
    if (response.sent) {
      buttons.nudge.textContent = '💜 Sent!';
      setTimeout(() => {
        buttons.nudge.textContent = '💜 Send Nudge';
      }, 2000);
    } else {
      buttons.nudge.textContent = '❌ Failed';
      setTimeout(() => {
        buttons.nudge.textContent = '💜 Send Nudge';
      }, 2000);
    }
  }

  async function disconnect() {
    if (confirm('Disconnect from your partner?')) {
      await chrome.runtime.sendMessage({ action: 'disconnect' });
      switchView('not-connected');
    }
  }

  // Listen for status updates
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'partnerPresence') {
      partnerOnline = request.online;
      if (currentState === 'connected') {
        chrome.runtime.sendMessage({ action: 'getStatus' }, updateConnectedView);
      }
    }
  });
});
