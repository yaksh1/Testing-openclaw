// MoodRing Settings Manager
// User preferences and customization

class SettingsManager {
  constructor() {
    this.defaults = {
      // Mood Detection Sensitivity
      moodSensitivity: 'medium', // low, medium, high
      
      // Interventions
      interventionsEnabled: true,
      interventionFrequency: 'medium', // low, medium, high
      
      // Smart Breaks
      breaksEnabled: true,
      microBreakInterval: 20, // minutes
      fullBreakInterval: 60, // minutes
      eyeStrainAlerts: true,
      
      // Focus Mode
      focusModeEnabled: true,
      blockedSites: [
        'twitter.com',
        'x.com',
        'reddit.com',
        'youtube.com',
        'tiktok.com',
        'instagram.com'
      ],
      
      // Soundscapes
      soundscapesEnabled: false,
      soundscapeVolume: 0.3,
      
      // Visual
      overlayOpacity: 0.1,
      showMoodIndicator: true,
      
      // Privacy
      dataRetentionDays: 30,
      analyticsEnabled: false
    };
    
    this.settings = { ...this.defaults };
    this.init();
  }

  async init() {
    await this.loadSettings();
  }

  async loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['moodring_settings'], (result) => {
        if (result.moodring_settings) {
          this.settings = { ...this.defaults, ...result.moodring_settings };
        }
        resolve(this.settings);
      });
    });
  }

  async saveSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.set({ moodring_settings: this.settings }, resolve);
    });
  }

  get(key) {
    return this.settings[key];
  }

  async set(key, value) {
    this.settings[key] = value;
    await this.saveSettings();
  }

  async reset() {
    this.settings = { ...this.defaults };
    await this.saveSettings();
  }

  renderSettingsPanel(container) {
    container.innerHTML = `
      <div style="padding: 24px; max-width: 400px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: white;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 32px; margin-bottom: 8px;">⚙️</div>
          <h2 style="font-size: 20px; margin: 0;">Settings</h2>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Mood Detection</h3>
          
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; margin-bottom: 8px;">Sensitivity</label>
            <select id="setting-sensitivity" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: white;">
              <option value="low" ${this.settings.moodSensitivity === 'low' ? 'selected' : ''}>Low - Only major changes</option>
              <option value="medium" ${this.settings.moodSensitivity === 'medium' ? 'selected' : ''}>Medium - Balanced</option>
              <option value="high" ${this.settings.moodSensitivity === 'high' ? 'selected' : ''}>High - Detect subtle shifts</option>
            </select>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Smart Breaks</h3>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <span style="font-size: 14px;">Enable Breaks</span>
            <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
              <input type="checkbox" id="setting-breaks" ${this.settings.breaksEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; cursor: pointer; inset: 0; background: ${this.settings.breaksEnabled ? '#4ade80' : 'rgba(255,255,255,0.2)'}; border-radius: 24px; transition: 0.3s;"></span>
              <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; transform: ${this.settings.breaksEnabled ? 'translateX(20px)' : 'translateX(0)'};"></span>
            </label>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; margin-bottom: 8px;">Micro Break Interval (minutes)</label>
            <input type="range" id="setting-micro-break" min="10" max="60" value="${this.settings.microBreakInterval}" style="width: 100%;">
            <div style="text-align: center; font-size: 13px; color: #64748b; margin-top: 4px;" id="micro-break-value">${this.settings.microBreakInterval} min</div>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Focus Mode</h3>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <span style="font-size: 14px;">Enable Focus Mode</span>
            <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
              <input type="checkbox" id="setting-focus" ${this.settings.focusModeEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; cursor: pointer; inset: 0; background: ${this.settings.focusModeEnabled ? '#4ade80' : 'rgba(255,255,255,0.2)'}; border-radius: 24px; transition: 0.3s;"></span>
              <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; transform: ${this.settings.focusModeEnabled ? 'translateX(20px)' : 'translateX(0)'};"></span>
            </label>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Soundscapes</h3>
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px;">
            <span style="font-size: 14px;">Enable Ambient Audio</span>
            <label style="position: relative; display: inline-block; width: 44px; height: 24px;">
              <input type="checkbox" id="setting-soundscapes" ${this.settings.soundscapesEnabled ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span style="position: absolute; cursor: pointer; inset: 0; background: ${this.settings.soundscapesEnabled ? '#4ade80' : 'rgba(255,255,255,0.2)'}; border-radius: 24px; transition: 0.3s;"></span>
              <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; transform: ${this.settings.soundscapesEnabled ? 'translateX(20px)' : 'translateX(0)'};"></span>
            </label>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 14px; margin-bottom: 8px;">Volume</label>
            <input type="range" id="setting-volume" min="0" max="100" value="${this.settings.soundscapeVolume * 100}" style="width: 100%;">
            <div style="text-align: center; font-size: 13px; color: #64748b; margin-top: 4px;" id="volume-value">${Math.round(this.settings.soundscapeVolume * 100)}%</div>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 16px;">Data & Privacy</h3>
          
          <button id="export-data" style="width: 100%; padding: 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; cursor: pointer; margin-bottom: 12px;">
            📥 Export All Data
          </button>
          
          <button id="clear-data" style="width: 100%; padding: 12px; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); border-radius: 8px; color: #f87171; cursor: pointer;">
            🗑️ Clear All Data
          </button>
        </div>

        <div style="padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
          <button id="save-settings" style="padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">
            Save Changes
          </button>        
        </div>
      </div>
    `;

    this.attachEventListeners(container);
  }

  attachEventListeners(container) {
    // Sensitivity
    container.querySelector('#setting-sensitivity')?.addEventListener('change', (e) => {
      this.set('moodSensitivity', e.target.value);
    });

    // Toggles
    container.querySelector('#setting-breaks')?.addEventListener('change', (e) => {
      this.set('breaksEnabled', e.target.checked);
    });

    container.querySelector('#setting-focus')?.addEventListener('change', (e) => {
      this.set('focusModeEnabled', e.target.checked);
    });

    container.querySelector('#setting-soundscapes')?.addEventListener('change', (e) => {
      this.set('soundscapesEnabled', e.target.checked);
    });

    // Sliders
    container.querySelector('#setting-micro-break')?.addEventListener('input', (e) => {
      container.querySelector('#micro-break-value').textContent = e.target.value + ' min';
    });

    container.querySelector('#setting-micro-break')?.addEventListener('change', (e) => {
      this.set('microBreakInterval', parseInt(e.target.value));
    });

    container.querySelector('#setting-volume')?.addEventListener('input', (e) => {
      container.querySelector('#volume-value').textContent = e.target.value + '%';
    });

    container.querySelector('#setting-volume')?.addEventListener('change', (e) => {
      this.set('soundscapeVolume', parseInt(e.target.value) / 100);
    });

    // Export/Clear
    container.querySelector('#export-data')?.addEventListener('click', () => {
      if (window.dailyInsights) {
        window.dailyInsights.exportData();
      }
    });

    container.querySelector('#clear-data')?.addEventListener('click', () => {
      if (confirm('Are you sure? This will delete all your MoodRing data.')) {
        chrome.storage.local.clear();
        location.reload();
      }
    });

    // Save
    container.querySelector('#save-settings')?.addEventListener('click', () => {
      this.saveSettings().then(() => {
        const btn = container.querySelector('#save-settings');
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = 'Save Changes', 2000);
      });
    });
  }
}

// Export
window.SettingsManager = SettingsManager;
