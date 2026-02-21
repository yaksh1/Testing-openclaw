// MoodRing Content Script - Mood Detector
// Runs on every page to detect browsing patterns

class MoodDetector {
  constructor() {
    this.scrollData = {
      lastScrollY: 0,
      lastScrollTime: Date.now(),
      velocity: 0,
      direction: 'none',
      continuousScrollStart: null,
      totalScrollDistance: 0
    };
    
    this.interactionData = {
      clicks: 0,
      keypresses: 0,
      mouseMoves: 0,
      lastActivity: Date.now()
    };

    this.init();
  }

  init() {
    this.setupScrollTracking();
    this.setupInteractionTracking();
    this.setupVisibilityTracking();
    this.startReportingLoop();
  }

  setupScrollTracking() {
    let scrollTimeout;
    let lastScrollY = window.scrollY;
    let scrollStartTime = null;

    window.addEventListener('scroll', () => {
      const now = Date.now();
      const currentY = window.scrollY;
      const deltaY = currentY - lastScrollY;
      
      // Calculate velocity (pixels per second)
      const timeDelta = now - this.scrollData.lastScrollTime;
      if (timeDelta > 0) {
        this.scrollData.velocity = Math.abs(deltaY) / (timeDelta / 1000);
      }

      // Determine direction
      this.scrollData.direction = deltaY > 0 ? 'down' : deltaY < 0 ? 'up' : 'none';

      // Track continuous scrolling
      if (!scrollStartTime) {
        scrollStartTime = now;
      }

      this.scrollData.totalScrollDistance += Math.abs(deltaY);

      // Clear previous timeout
      clearTimeout(scrollTimeout);
      
      // Report scroll pattern after scroll stops
      scrollTimeout = setTimeout(() => {
        const scrollDuration = now - scrollStartTime;
        
        if (scrollDuration > 3000) { // Scrolled for more than 3 seconds
          this.reportScrollPattern({
            velocity: this.scrollData.velocity,
            direction: this.scrollData.direction,
            duration: scrollDuration,
            distance: this.scrollData.totalScrollDistance
          });
        }

        // Reset
        scrollStartTime = null;
        this.scrollData.totalScrollDistance = 0;
      }, 500);

      lastScrollY = currentY;
      this.scrollData.lastScrollTime = now;
      this.scrollData.lastScrollY = currentY;
    }, { passive: true });
  }

  setupInteractionTracking() {
    // Track clicks
    document.addEventListener('click', () => {
      this.interactionData.clicks++;
      this.interactionData.lastActivity = Date.now();
    });

    // Track keypresses
    document.addEventListener('keypress', () => {
      this.interactionData.keypresses++;
      this.interactionData.lastActivity = Date.now();
    });

    // Track mouse movement (throttled)
    let mouseTimeout;
    document.addEventListener('mousemove', () => {
      clearTimeout(mouseTimeout);
      mouseTimeout = setTimeout(() => {
        this.interactionData.mouseMoves++;
        this.interactionData.lastActivity = Date.now();
      }, 100);
    });
  }

  setupVisibilityTracking() {
    // Track dwell time on page
    let dwellStart = Date.now();
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        const dwellTime = Date.now() - dwellStart;
        this.reportDwellTime(dwellTime);
      } else {
        dwellStart = Date.now();
      }
    });
  }

  startReportingLoop() {
    // Report patterns every 30 seconds
    setInterval(() => {
      this.reportCurrentState();
    }, 30000);
  }

  reportScrollPattern(data) {
    chrome.runtime.sendMessage({
      type: 'SCROLL_PATTERN',
      data: data
    }).catch(() => {});
  }

  reportDwellTime(duration) {
    chrome.runtime.sendMessage({
      type: 'DWELL_TIME',
      data: { duration, url: window.location.href }
    }).catch(() => {});
  }

  reportCurrentState() {
    chrome.runtime.sendMessage({
      type: 'CURRENT_STATE',
      data: {
        scrollVelocity: this.scrollData.velocity,
        interactions: this.interactionData,
        url: window.location.href,
        title: document.title
      }
    }).catch(() => {});
  }
}

// Initialize
detector = new MoodDetector();
