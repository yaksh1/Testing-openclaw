// MoodRing Daily Insights
// End-of-day summary and pattern visualization

class DailyInsights {
  constructor() {
    this.storageKey = 'moodring_daily_data';
    this.insightsPanel = null;
  }

  async generateDailyReport() {
    const today = new Date().toISOString().split('T')[0];
    const data = await this.getDayData(today);
    
    return {
      date: today,
      summary: this.generateSummary(data),
      moodBreakdown: this.calculateMoodBreakdown(data),
      productivityScore: this.calculateProductivity(data),
      recommendations: this.generateRecommendations(data),
      patterns: this.detectPatterns(data)
    };
  }

  async getDayData(date) {
    return new Promise((resolve) => {
      chrome.storage.local.get([
        `events_${date}`,
        `mood_history_${date}`,
        `focus_time_${date}`
      ], (result) => {
        resolve({
          events: result[`events_${date}`] || [],
          moodHistory: result[`mood_history_${date}`] || [],
          focusTime: result[`focus_time_${date}`] || 0
        });
      });
    });
  }

  generateSummary(data) {
    const totalEvents = data.events.length;
    const tabSwitches = data.events.filter(e => e.type === 'tab_switch').length;
    const pageLoads = data.events.filter(e => e.type === 'page_load').length;
    const uniqueSites = new Set(data.events.map(e => {
      try {
        return new URL(e.url || e.data?.url).hostname;
      } catch {
        return null;
      }
    }).filter(Boolean)).size;

    return {
      totalEvents,
      tabSwitches,
      pageLoads,
      uniqueSites,
      focusTime: data.focusTime
    };
  }

  calculateMoodBreakdown(data) {
    const moodCounts = {};
    const moodDurations = {};
    
    data.moodHistory.forEach((entry, index) => {
      const mood = entry.mood;
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
      
      // Calculate duration until next mood change
      if (index < data.moodHistory.length - 1) {
        const duration = data.moodHistory[index + 1].timestamp - entry.timestamp;
        moodDurations[mood] = (moodDurations[mood] || 0) + duration;
      }
    });

    // Convert to percentages
    const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
    const breakdown = {};
    
    for (const [mood, count] of Object.entries(moodCounts)) {
      breakdown[mood] = {
        count,
        percentage: Math.round((count / total) * 100),
        duration: moodDurations[mood] || 0
      };
    }

    return breakdown;
  }

  calculateProductivity(data) {
    // Simple productivity score based on:
    // - Time in FOCUSED mood (good)
    // - Time in CALM mood (good)
    // - Time in DOOMSCROLLING (bad)
    // - Tab switches per hour (lower is better)
    
    const moodBreakdown = this.calculateMoodBreakdown(data);
    const focusedTime = moodBreakdown.FOCUSED?.duration || 0;
    const calmTime = moodBreakdown.CALM?.duration || 0;
    const doomTime = moodBreakdown.DOOMSCROLLING?.duration || 0;
    const anxiousTime = moodBreakdown.ANXIOUS?.duration || 0;
    
    const totalTime = focusedTime + calmTime + doomTime + anxiousTime;
    if (totalTime === 0) return 50;

    const goodTime = focusedTime + calmTime;
    const badTime = doomTime + anxiousTime;
    
    let score = Math.round((goodTime / (goodTime + badTime)) * 100);
    
    // Penalty for excessive tab switching
    const tabSwitches = data.events.filter(e => e.type === 'tab_switch').length;
    const hoursActive = totalTime / (1000 * 60 * 60);
    const switchesPerHour = hoursActive > 0 ? tabSwitches / hoursActive : 0;
    
    if (switchesPerHour > 30) score -= 10;
    if (switchesPerHour > 50) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  generateRecommendations(data) {
    const recommendations = [];
    const moodBreakdown = this.calculateMoodBreakdown(data);
    const summary = this.generateSummary(data);

    // Check for doomscrolling
    if (moodBreakdown.DOOMSCROLLING?.percentage > 20) {
      recommendations.push({
        type: 'warning',
        icon: '📱',
        title: 'Doomscrolling Detected',
        message: 'You spent over 20% of your time in scroll-heavy sessions. Consider setting app time limits.'
      });
    }

    // Check for anxiety
    if (moodBreakdown.ANXIOUS?.percentage > 15) {
      recommendations.push({
        type: 'suggestion',
        icon: '🧘',
        title: 'Practice Mindfulness',
        message: 'Elevated anxiety detected. Try the breathing exercises when you notice rapid tab switching.'
      });
    }

    // Check for focus
    if (moodBreakdown.FOCUSED?.percentage > 40) {
      recommendations.push({
        type: 'positive',
        icon: '🎯',
        title: 'Great Focus Today',
        message: 'You maintained focused states for a significant portion of your browsing. Keep it up!'
      });
    }

    // Check tab switching
    if (summary.tabSwitches > 100) {
      recommendations.push({
        type: 'suggestion',
        icon: '🗂️',
        title: 'Tab Management',
        message: `You switched tabs ${summary.tabSwitches} times today. Try the "Close 5 Tabs" feature to reduce cognitive load.`
      });
    }

    return recommendations;
  }

  detectPatterns(data) {
    const patterns = [];
    
    // Time of day patterns
    const hourlyMoods = {};
    data.moodHistory.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (!hourlyMoods[hour]) hourlyMoods[hour] = [];
      hourlyMoods[hour].push(entry.mood);
    });

    // Find peak productivity hour
    let bestHour = null;
    let bestHourScore = 0;
    
    for (const [hour, moods] of Object.entries(hourlyMoods)) {
      const focusedCount = moods.filter(m => m === 'FOCUSED').length;
      if (focusedCount > bestHourScore) {
        bestHourScore = focusedCount;
        bestHour = hour;
      }
    }

    if (bestHour !== null) {
      patterns.push({
        type: 'productivity_peak',
        hour: parseInt(bestHour),
        description: `Your peak focus time is around ${bestHour}:00`
      });
    }

    return patterns;
  }

  renderInsightsPanel(container) {
    this.generateDailyReport().then(report => {
      const html = this.generateInsightsHTML(report);
      container.innerHTML = html;
    });
  }

  generateInsightsHTML(report) {
    const moodColors = {
      CALM: '#4ade80',
      FOCUSED: '#60a5fa',
      ANXIOUS: '#fbbf24',
      OVERWHELMED: '#f87171',
      TIRED: '#a78bfa',
      DOOMSCROLLING: '#fb923c'
    };

    const moodBars = Object.entries(report.moodBreakdown)
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .map(([mood, data]) => `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 13px; text-transform: capitalize;">${mood.toLowerCase()}</span>
            <span style="font-size: 13px; color: #64748b;">${data.percentage}%</span>
          </div>
          <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; width: ${data.percentage}%; background: ${moodColors[mood]}; border-radius: 4px; transition: width 0.5s ease;"></div>
          </div>
        </div>
      `).join('');

    const recommendations = report.recommendations.map(rec => `
      <div style="
        padding: 16px;
        background: ${rec.type === 'warning' ? 'rgba(251, 146, 60, 0.1)' : rec.type === 'positive' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)'};
        border-radius: 12px;
        margin-bottom: 12px;
        border-left: 3px solid ${rec.type === 'warning' ? '#fb923c' : rec.type === 'positive' ? '#4ade80' : '#60a5fa'};
      ">
        <div style="font-size: 20px; margin-bottom: 4px;">${rec.icon}</div>
        <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${rec.title}</div>
        <div style="font-size: 13px; color: #94a3b8; line-height: 1.5;">${rec.message}</div>
      </div>
    `).join('');

    return `
      <div style="padding: 24px; max-width: 400px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 48px; margin-bottom: 8px;">📊</div>
          <h2 style="font-size: 24px; margin-bottom: 4px;">Today's Insights</h2>
          <div style="color: #64748b; font-size: 14px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        </div>

        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
            <div style="
              width: 100px; height: 100px; border-radius: 50%;
              background: conic-gradient(#4ade80 ${report.productivityScore}%, rgba(255,255,255,0.1) 0);
              display: flex; align-items: center; justify-content: center;
            ">
              <div style="width: 80px; height: 80px; background: #1a1a2e; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700;">
                ${report.productivityScore}
              </div>
            </div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 14px; font-weight: 600;">Productivity Score</div>
            <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Based on your mood patterns today</div>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">Mood Breakdown</h3>
          ${moodBars}
        </div>

        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 16px; margin-bottom: 16px;">Recommendations</h3>
          ${recommendations}
        </div>

        <div style="background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px;">
          <div style="font-size: 13px; color: #64748b;">
            <strong>📈 Stats Today:</strong> ${report.summary.tabSwitches} tab switches • ${report.summary.uniqueSites} unique sites • ${Math.round(report.summary.focusTime / 60000)}m focused time
          </div>
        </div>
      </div>
    `;
  }

  exportData() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (data) => {
        const exportBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(exportBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `moodring-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        resolve();
      });
    });
  }
}

// Export for use
window.DailyInsights = DailyInsights;
