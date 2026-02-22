// SyncSpace - Shared Playlist & Ambient Sounds
// Background sounds that sync between partners

(function() {
  'use strict';

  if (window.syncSpacePlaylist) return;
  window.syncSpacePlaylist = true;

  // Free ambient sound URLs (from freesound.org or similar free sources)
  const SOUND_PRESETS = {
    rain: {
      name: 'Rain',
      icon: '🌧️',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3'
    },
    fireplace: {
      name: 'Fireplace',
      icon: '🔥',
      url: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3'
    },
    cafe: {
      name: 'Coffee Shop',
      icon: '☕',
      url: 'https://cdn.pixabay.com/download/audio/2022/03/09/audio_97e2dcb6fc.mp3'
    },
    forest: {
      name: 'Forest',
      icon: '🌲',
      url: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_2786fcda3d.mp3'
    },
    waves: {
      name: 'Ocean Waves',
      icon: '🌊',
      url: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_88447e769f.mp3'
    },
    lofi: {
      name: 'Lo-Fi Beats',
      icon: '🎵',
      // Using a reliable lo-fi stream
      url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3'
    }
  };

  let audio = null;
  let currentTrack = null;
  let isPlaying = false;
  let volume = 0.5;
  let elements = {};

  function createPlaylistUI() {
    elements.container = document.createElement('div');
    elements.container.className = 'syncspace-playlist';
    elements.container.innerHTML = `
      <div class="syncspace-playlist-header">
        <span class="syncspace-playlist-icon">🎵</span>
        <span class="syncspace-playlist-title">Shared Sounds</span>
        <button class="syncspace-playlist-close">×</button>
      </div>
      
      <div class="syncspace-playlist-tracks">
        ${Object.entries(SOUND_PRESETS).map(([key, track]) => `
          <button class="syncspace-playlist-track" data-track="${key}">
            <span class="syncspace-playlist-track-icon">${track.icon}</span>
            <span class="syncspace-playlist-track-name">${track.name}</span>
            <span class="syncspace-playlist-track-status"></span>
          </button>
        `).join('')}
      </div>
      
      <div class="syncspace-playlist-controls">
        <button class="syncspace-playlist-btn syncspace-playlist-prev">⏮</button>
        <button class="syncspace-playlist-btn syncspace-playlist-play">▶️</button>
        <button class="syncspace-playlist-btn syncspace-playlist-next">⏭</button>
      </div>
      
      <div class="syncspace-playlist-volume">
        <span>🔈</span>
        <input type="range" min="0" max="100" value="50" class="syncspace-playlist-slider">
        <span>🔊</span>
      </div>
      
      <div class="syncspace-playlist-sync">
        <label class="syncspace-playlist-sync-label">
          <input type="checkbox" class="syncspace-playlist-sync-checkbox">
          <span>Sync with partner</span>
        </label>
      </div>
      
      <div class="syncspace-playlist-partner">
        <div class="syncspace-playlist-partner-status">Partner not listening</div>
      </div>
    `;

    document.body.appendChild(elements.container);

    // Cache elements
    elements.tracks = elements.container.querySelectorAll('.syncspace-playlist-track');
    elements.playBtn = elements.container.querySelector('.syncspace-playlist-play');
    elements.prevBtn = elements.container.querySelector('.syncspace-playlist-prev');
    elements.nextBtn = elements.container.querySelector('.syncspace-playlist-next');
    elements.volumeSlider = elements.container.querySelector('.syncspace-playlist-slider');
    elements.syncCheckbox = elements.container.querySelector('.syncspace-playlist-sync-checkbox');
    elements.partnerStatus = elements.container.querySelector('.syncspace-playlist-partner-status');
    elements.closeBtn = elements.container.querySelector('.syncspace-playlist-close');

    // Event listeners
    elements.tracks.forEach(track => {
      track.addEventListener('click', () => selectTrack(track.dataset.track));
    });

    elements.playBtn.addEventListener('click', togglePlay);
    elements.prevBtn.addEventListener('click', playPrevious);
    elements.nextBtn.addEventListener('click', playNext);
    elements.volumeSlider.addEventListener('input', (e) => setVolume(e.target.value));
    elements.syncCheckbox.addEventListener('change', (e) => toggleSync(e.target.checked));
    elements.closeBtn.addEventListener('click', hidePlaylist);

    // Make draggable
    makeDraggable(elements.container);
  }

  function makeDraggable(element) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    const header = element.querySelector('.syncspace-playlist-header');
    
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

  async function selectTrack(trackKey) {
    const track = SOUND_PRESETS[trackKey];
    if (!track) return;

    // Stop current
    if (audio) {
      audio.pause();
      audio = null;
    }

    currentTrack = trackKey;

    // Update UI
    elements.tracks.forEach(t => {
      t.classList.toggle('active', t.dataset.track === trackKey);
    });

    // Create new audio
    audio = new Audio(track.url);
    audio.loop = true;
    audio.volume = volume;

    // Auto-play if was playing
    if (isPlaying) {
      try {
        await audio.play();
      } catch (e) {
        console.log('Autoplay blocked, waiting for user interaction');
        isPlaying = false;
        updatePlayButton();
      }
    }

    // Broadcast to partner if sync enabled
    if (elements.syncCheckbox.checked) {
      broadcastPlaylistState();
    }
  }

  async function togglePlay() {
    if (!audio) {
      // Select first track if none selected
      if (!currentTrack) {
        await selectTrack('rain');
      }
    }

    if (isPlaying) {
      audio?.pause();
      isPlaying = false;
    } else {
      try {
        await audio?.play();
        isPlaying = true;
      } catch (e) {
        console.error('Play failed:', e);
      }
    }

    updatePlayButton();
    broadcastPlaylistState();
  }

  function updatePlayButton() {
    elements.playBtn.textContent = isPlaying ? '⏸' : '▶️';
  }

  function playPrevious() {
    const keys = Object.keys(SOUND_PRESETS);
    const currentIndex = keys.indexOf(currentTrack);
    const prevIndex = currentIndex <= 0 ? keys.length - 1 : currentIndex - 1;
    selectTrack(keys[prevIndex]);
  }

  function playNext() {
    const keys = Object.keys(SOUND_PRESETS);
    const currentIndex = keys.indexOf(currentTrack);
    const nextIndex = currentIndex >= keys.length - 1 ? 0 : currentIndex + 1;
    selectTrack(keys[nextIndex]);
  }

  function setVolume(value) {
    volume = value / 100;
    if (audio) {
      audio.volume = volume;
    }
  }

  function toggleSync(enabled) {
    if (enabled) {
      broadcastPlaylistState();
    }
  }

  function broadcastPlaylistState() {
    chrome.runtime.sendMessage({
      action: 'broadcastPlaylist',
      state: {
        track: currentTrack,
        isPlaying: isPlaying,
        volume: volume,
        sync: elements.syncCheckbox.checked
      }
    });
  }

  function updatePartnerPlaylist(partnerState) {
    if (!partnerState.sync) {
      elements.partnerStatus.textContent = 'Partner not sharing';
      return;
    }

    const track = SOUND_PRESETS[partnerState.track];
    if (track) {
      elements.partnerStatus.innerHTML = `
        <div class="syncspace-playlist-partner-active">
          <span>Partner listening: ${track.icon} ${track.name}</span>
          ${partnerState.isPlaying ? '<span class="syncspace-playlist-playing">▶️</span>' : ''}
        </div>
      `;
    }

    // Auto-sync if enabled
    if (elements.syncCheckbox.checked && partnerState.track !== currentTrack) {
      selectTrack(partnerState.track);
      if (partnerState.isPlaying && !isPlaying) {
        togglePlay();
      }
    }
  }

  function showPlaylist() {
    if (!elements.container) {
      createPlaylistUI();
    }
    elements.container.classList.add('visible');
  }

  function hidePlaylist() {
    if (elements.container) {
      elements.container.classList.remove('visible');
    }
  }

  function togglePlaylist() {
    if (elements.container?.classList.contains('visible')) {
      hidePlaylist();
    } else {
      showPlaylist();
    }
  }

  // Listen for messages
  chrome.runtime.onMessage.addListener((request) => {
    if (request.type === 'partnerPlaylistUpdate') {
      updatePartnerPlaylist(request.state);
    }
    if (request.type === 'togglePlaylist') {
      togglePlaylist();
    }
  });

  // Keyboard shortcut: Ctrl+Shift+M for music
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      togglePlaylist();
    }
  });

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .syncspace-playlist {
      position: fixed;
      top: 100px;
      right: 20px;
      width: 260px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transform: translateX(300px);
      opacity: 0;
      transition: all 0.3s ease;
      overflow: hidden;
    }
    
    .syncspace-playlist.visible {
      transform: translateX(0);
      opacity: 1;
    }
    
    .syncspace-playlist-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px;
      border-bottom: 1px solid #f3f4f6;
      cursor: move;
    }
    
    .syncspace-playlist-icon { font-size: 18px; }
    .syncspace-playlist-title { 
      flex: 1; 
      font-weight: 600; 
      font-size: 14px;
      color: #1f2937;
    }
    
    .syncspace-playlist-close {
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
    
    .syncspace-playlist-close:hover {
      background: #f3f4f6;
      color: #4b5563;
    }
    
    .syncspace-playlist-tracks {
      padding: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .syncspace-playlist-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 12px 8px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .syncspace-playlist-track:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }
    
    .syncspace-playlist-track.active {
      background: #1f2937;
      border-color: #1f2937;
      color: white;
    }
    
    .syncspace-playlist-track-icon { font-size: 24px; }
    .syncspace-playlist-track-name { 
      font-size: 11px; 
      font-weight: 500;
      color: inherit;
    }
    
    .syncspace-playlist-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
      padding: 12px;
    }
    
    .syncspace-playlist-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #f3f4f6;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .syncspace-playlist-btn:hover {
      background: #e5e7eb;
      transform: scale(1.05);
    }
    
    .syncspace-playlist-volume {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 16px 12px;
    }
    
    .syncspace-playlist-slider {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      background: #e5e7eb;
      border-radius: 2px;
      outline: none;
    }
    
    .syncspace-playlist-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: #1f2937;
      border-radius: 50%;
      cursor: pointer;
    }
    
    .syncspace-playlist-sync {
      padding: 0 16px 12px;
    }
    
    .syncspace-playlist-sync-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #6b7280;
      cursor: pointer;
    }
    
    .syncspace-playlist-partner {
      padding: 12px 16px;
      background: #f9fafb;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    
    .syncspace-playlist-partner-active {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      color: #059669;
    }
    
    .syncspace-playlist-playing {
      animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);
})();
