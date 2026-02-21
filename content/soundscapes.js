// MoodRing Soundscape Manager
// Ambient audio that responds to detected mood

class SoundscapeManager {
  constructor() {
    this.audioContext = null;
    this.currentSource = null;
    this.gainNode = null;
    this.isPlaying = false;
    this.currentMood = 'CALM';
  }

  async init() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
    this.gainNode.gain.value = 0.3; // Start quiet
  }

  getSoundscapeForMood(mood) {
    const soundscapes = {
      'CALM': {
        type: 'rain',
        frequency: 0.5,
        description: 'Gentle rain on a window'
      },
      'FOCUSED': {
        type: 'whitenoise',
        frequency: 1.0,
        description: 'White noise for concentration'
      },
      'ANXIOUS': {
        type: 'brownnoise',
        frequency: 0.3,
        description: 'Deep brown noise to calm nerves'
      },
      'TIRED': {
        type: 'pinknoise',
        frequency: 0.4,
        description: 'Soft pink noise for relaxation'
      },
      'OVERWHELMED': {
        type: 'ocean',
        frequency: 0.4,
        description: 'Ocean waves, slow and steady'
      },
      'DOOMSCROLLING': {
        type: 'birds',
        frequency: 0.6,
        description: 'Morning birds, fresh air'
      }
    };
    return soundscapes[mood] || soundscapes['CALM'];
  }

  async playMoodSoundscape(mood) {
    if (!this.audioContext) await this.init();
    if (this.currentMood === mood && this.isPlaying) return;

    this.currentMood = mood;
    const soundscape = this.getSoundscapeForMood(mood);

    // Fade out current
    if (this.isPlaying) {
      await this.fadeOut();
    }

    // Generate new soundscape
    await this.generateSoundscape(soundscape);
  }

  async generateSoundscape(soundscape) {
    const bufferSize = 2 * this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);

    switch(soundscape.type) {
      case 'whitenoise':
        this.generateWhiteNoise(data);
        break;
      case 'pinknoise':
        this.generatePinkNoise(data);
        break;
      case 'brownnoise':
        this.generateBrownNoise(data);
        break;
      case 'rain':
        this.generateRain(data);
        break;
      case 'ocean':
        this.generateOcean(data);
        break;
      case 'birds':
        this.generateBirds(data);
        break;
    }

    this.currentSource = this.audioContext.createBufferSource();
    this.currentSource.buffer = buffer;
    this.currentSource.loop = true;
    this.currentSource.connect(this.gainNode);
    
    this.currentSource.start();
    this.isPlaying = true;
    
    // Fade in
    this.gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 2);
  }

  generateWhiteNoise(data) {
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  generatePinkNoise(data) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
  }

  generateBrownNoise(data) {
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }
  }

  generateRain(data) {
    // Brown noise with high-frequency bursts for rain drops
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      const drop = Math.random() > 0.99 ? Math.random() * 0.5 : 0;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] = data[i] * 2 + drop;
    }
  }

  generateOcean(data) {
    // Modulated brown noise for waves
    let lastOut = 0;
    let wavePhase = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      
      // Add wave modulation
      wavePhase += 0.0001;
      const wave = Math.sin(wavePhase) * 0.5 + 0.5;
      data[i] *= (1 + wave * 2);
    }
  }

  generateBirds(data) {
    // Sparse high-frequency chirps
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 0.1 - 0.05;
      
      // Occasional bird chirp
      if (Math.random() > 0.9995) {
        const chirpLength = Math.floor(Math.random() * 1000) + 500;
        const freq = 2000 + Math.random() * 2000;
        for (let j = 0; j < chirpLength && i + j < data.length; j++) {
          data[i + j] += Math.sin(j * freq / this.audioContext.sampleRate) * 
                         Math.exp(-j / 200) * 0.3;
        }
        i += chirpLength;
      }
    }
  }

  async fadeOut() {
    if (!this.gainNode) return;
    
    const currentGain = this.gainNode.gain.value;
    this.gainNode.gain.setValueAtTime(currentGain, this.audioContext.currentTime);
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 2);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  stop() {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource.disconnect();
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  setVolume(volume) {
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    }
  }
}

// Export for use in other scripts
window.SoundscapeManager = SoundscapeManager;
