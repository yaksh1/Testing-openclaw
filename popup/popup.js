// MoodRing Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const moodIndicator = document.getElementById('moodIndicator');
  const moodLabel = document.getElementById('moodLabel');
  const moodSublabel = document.getElementById('moodSublabel');
  const tabCount = document.getElementById('tabCount');
  const sessionTime = document.getElementById('sessionTime');
  const switches = document.getElementById('switches');
  const insightText = document.getElementById('insightText');
  const breatheBtn = document.getElementById('breatheBtn');
  const tabsBtn = document.getElementById('tabsBtn');

  const MOOD_DATA = {
    'CALM': { color: '#4ade80', label: 'Calm', sublabel: 'You\'re browsing peacefully' },
    'FOCUSED': { color: '#60a5fa', label: 'Focused', sublabel: 'Deep work mode activated' },
    'ANXIOUS': { color: '#fbbf24', label: 'Anxious', sublabel: 'Rapid tab switching detected' },
    'OVERWHELMED': { color: '#f87171', label: 'Overwhelmed', sublabel: 'Many tabs, scattered attention' },
    'TIRED': { color: '#a78bfa', label: 'Tired', sublabel: 'Late night browsing' },
    'DOOMSCROLLING': { color: '#fb923c', label: 'Doomscrolling', sublabel: 'Endless feed consumption' }
  };

  const INSIGHTS = {
    'CALM': 'You\'re in a good flow. This is a great time for deep work.',
    'FOCUSED': 'You\'ve been on this page for a while. You\'re in deep focus.',
    'ANXIOUS': 'Try the breathing exercise. Close your eyes for 30 seconds.',
    'OVERWHELMED': 'Consider closing some tabs. Focus on one thing at a time.',
    'TIRED': 'It\'s getting late. Your brain needs rest to process information.',
    'DOOMSCROLLING': 'You\'ve been scrolling for a while. Try standing up and stretching.'
  };

  // Get current mood from background
  chrome.runtime.sendMessage({ type: 'GET_MOOD' }, (response) => {
    if (response) {
      updateMoodDisplay(response.mood);
    }
  });

  // Get tab count
  chrome.tabs.query({}, (tabs) => {
    tabCount.textContent = tabs.length;
  });

  // Update display
  function updateMoodDisplay(mood) {
    const data = MOOD_DATA[mood] || MOOD_DATA['CALM'];
    moodIndicator.style.background = data.color;
    moodIndicator.style.boxShadow = `0 0 30px ${data.color}`;
    moodLabel.textContent = data.label;
    moodSublabel.textContent = data.sublabel;
    insightText.textContent = INSIGHTS[mood] || INSIGHTS['CALM'];
  }

  // Breathing button
  breatheBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'MANUAL_BREATHING' });
    window.close();
  });

  // Close tabs button
  tabsBtn.addEventListener('click', () => {
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > 5) {
        // Close 5 random non-active tabs
        const nonActiveTabs = tabs.filter(t => !t.active);
        const toClose = nonActiveTabs
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);
        
        toClose.forEach(tab => {
          chrome.tabs.remove(tab.id);
        });

        tabCount.textContent = tabs.length - toClose.length;
        tabsBtn.innerHTML = '<span>✅</span> Closed 5 tabs';
        setTimeout(() => {
          tabsBtn.innerHTML = '<span>🗂️</span> Close 5 Random Tabs';
        }, 2000);
      } else {
        tabsBtn.innerHTML = '<span>ℹ️</span> Not enough tabs';
        setTimeout(() => {
          tabsBtn.innerHTML = '<span>🗂️</span> Close 5 Random Tabs';
        }, 2000);
      }
    });
  });

  // Update session time
  chrome.storage.local.get(['sessionStart'], (result) => {
    const start = result.sessionStart || Date.now();
    const elapsed = Math.floor((Date.now() - start) / 60000);
    
    if (elapsed < 60) {
      sessionTime.textContent = `${elapsed}m`;
    } else {
      const hours = Math.floor(elapsed / 60);
      const mins = elapsed % 60;
      sessionTime.textContent = `${hours}h ${mins}m`;
    }
  });
});
