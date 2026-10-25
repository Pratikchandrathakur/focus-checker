// Web Audio Engine for Real Neuroscience-based Focus Soundscapes & Stress Relief Chimes
// Uses pure browser Web Audio API — zero external files, 100% offline, zero latency.

class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentPreset: 'gamma' | 'alpha' | 'pink' | 'rain' | 'none' = 'none';

  // Audio nodes
  private masterGain: GainNode | null = null;
  private leftOsc: OscillatorNode | null = null;
  private rightOsc: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      const clamped = Math.max(0, Math.min(1, volume));
      this.masterGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public stop() {
    if (!this.ctx) return;

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }

    setTimeout(() => {
      try {
        this.leftOsc?.stop();
        this.leftOsc?.disconnect();
      } catch {}
      try {
        this.rightOsc?.stop();
        this.rightOsc?.disconnect();
      } catch {}
      try {
        this.noiseNode?.stop();
        this.noiseNode?.disconnect();
      } catch {}

      this.leftOsc = null;
      this.rightOsc = null;
      this.noiseNode = null;
      this.isPlaying = false;
      this.currentPreset = 'none';
    }, 150);
  }

  public playPreset(preset: 'gamma' | 'alpha' | 'pink' | 'rain', volume = 0.5) {
    this.initContext();
    if (!this.ctx) return;

    this.stop();

    setTimeout(() => {
      if (!this.ctx) return;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.02, volume), this.ctx.currentTime + 0.8);
      this.masterGain.connect(this.ctx.destination);

      if (preset === 'gamma' || preset === 'alpha') {
        this.playBinaural(preset);
      } else if (preset === 'pink' || preset === 'rain') {
        this.playFilteredNoise(preset);
      }

      this.isPlaying = true;
      this.currentPreset = preset;
    }, 180);
  }

  private playBinaural(type: 'gamma' | 'alpha') {
    if (!this.ctx || !this.masterGain) return;

    // Carrier frequency in Hz
    const carrier = 220;
    // Difference: Gamma = 40Hz (cognitive focus), Alpha = 10Hz (relaxed flow)
    const diff = type === 'gamma' ? 40 : 10;

    const merger = this.ctx.createChannelMerger(2);

    // Left Ear
    this.leftOsc = this.ctx.createOscillator();
    this.leftOsc.type = 'sine';
    this.leftOsc.frequency.setValueAtTime(carrier, this.ctx.currentTime);

    const leftGain = this.ctx.createGain();
    leftGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    // Right Ear
    this.rightOsc = this.ctx.createOscillator();
    this.rightOsc.type = 'sine';
    this.rightOsc.frequency.setValueAtTime(carrier + diff, this.ctx.currentTime);

    const rightGain = this.ctx.createGain();
    rightGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    this.rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    // Also blend subtle pink noise for smooth soothing depth
    const subNoise = this.createNoiseBuffer(true);
    const subNoiseSrc = this.ctx.createBufferSource();
    subNoiseSrc.buffer = subNoise;
    subNoiseSrc.loop = true;
    const subNoiseGain = this.ctx.createGain();
    subNoiseGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    subNoiseSrc.connect(subNoiseGain);
    subNoiseGain.connect(this.masterGain);
    subNoiseSrc.start();

    merger.connect(this.masterGain);
    this.leftOsc.start();
    this.rightOsc.start();
  }

  private playFilteredNoise(type: 'pink' | 'rain') {
    if (!this.ctx || !this.masterGain) return;

    const buffer = this.createNoiseBuffer(type === 'pink');
    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    this.filterNode = this.ctx.createBiquadFilter();
    if (type === 'rain') {
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(750, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);
    } else {
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(1200, this.ctx.currentTime);
    }

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    this.noiseNode.connect(this.filterNode);
    this.filterNode.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    this.noiseNode.start();
  }

  private createNoiseBuffer(isPink: boolean): AudioBuffer {
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (isPink) {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }
    } else {
      // White noise
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.18;
      }
    }

    return buffer;
  }

  // Play a soft Tibetan singing bowl / calming mindfulness chime
  public playBreathChime(type: 'inhale' | 'exhale' | 'hold') {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = type === 'inhale' ? 432 : type === 'hold' ? 528 : 396;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.01, this.ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, this.ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.85);
    } catch {
      // Ignore audio policy issues
    }
  }

  public getStatus() {
    return {
      isPlaying: this.isPlaying,
      preset: this.currentPreset,
    };
  }
}

export const audioEngine = new SoundscapeEngine();
