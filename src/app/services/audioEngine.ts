// Web Audio Engine for Real Neuroscience-based Focus Soundscapes & Stress Relief Chimes
// Uses pure browser Web Audio API — zero external files, 100% offline, zero latency.

export type SoundPreset = 'gamma' | 'alpha' | 'pink' | 'rain' | 'brown' | 'waves';
const PRESETS: SoundPreset[] = ['gamma', 'alpha', 'pink', 'rain', 'brown', 'waves'];
export const MAX_MIX_LAYERS = 6;

export class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private currentPreset: SoundPreset | 'mix' | 'none' = 'none';

  // Audio nodes
  private masterGain: GainNode | null = null;
  private activeSources: { stop: () => void; disconnect: () => void }[] = [];

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
      this.masterGain.gain.setValueAtTime(clamped, this.ctx.currentTime);
    }
  }

  public stop() {
    if (this.masterGain && this.ctx) {
      // Immediate silence
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      try {
        this.masterGain.disconnect();
      } catch {}
      this.masterGain = null;
    }

    // Stop and disconnect every active oscillator and buffer source immediately
    for (const src of this.activeSources) {
      try {
        src.stop();
      } catch {}
      try {
        src.disconnect();
      } catch {}
    }
    this.activeSources = [];
    this.isPlaying = false;
    this.currentPreset = 'none';
  }

  public playPreset(preset: SoundPreset, volume = 0.5) {
    this.playMix([{ preset, volume: 1 }], volume, preset);
  }

  /**
   * Plays several sounds at once. Layer volumes are scaled so that stacking sounds never gets louder
   * than the master volume, and every value is clamped (this input can come from saved cloud data).
   */
  public playMix(layers: { preset: SoundPreset; volume: number }[], masterVolume = 0.5, label: SoundPreset | 'mix' = 'mix') {
    this.initContext();
    if (!this.ctx) return;
    this.stop();

    const clean = layers
      .filter((l) => l && PRESETS.includes(l.preset))
      .slice(0, MAX_MIX_LAYERS)
      .map((l) => ({ preset: l.preset, volume: Number.isFinite(l.volume) ? Math.min(1, Math.max(0, l.volume)) : 0 }));
    const sum = clean.reduce((a, l) => a + l.volume, 0);
    const scale = 1 / Math.max(1, sum);

    this.masterGain = this.ctx.createGain();
    const master = Number.isFinite(masterVolume) ? Math.min(1, Math.max(0.05, masterVolume)) : 0.5;
    this.masterGain.gain.setValueAtTime(master, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    for (const l of clean) {
      const layerGain = this.ctx.createGain();
      layerGain.gain.setValueAtTime(l.volume * scale, this.ctx.currentTime);
      layerGain.connect(this.masterGain);
      if (l.preset === 'gamma' || l.preset === 'alpha') this.playBinaural(l.preset, layerGain);
      else this.playFilteredNoise(l.preset, layerGain);
    }

    this.isPlaying = true;
    this.currentPreset = label;
  }

  private playBinaural(type: 'gamma' | 'alpha', out: AudioNode) {
    if (!this.ctx) return;

    // Carrier frequency in Hz
    const carrier = 220;
    // Difference: Gamma = 40Hz (cognitive focus), Alpha = 10Hz (relaxed flow)
    const diff = type === 'gamma' ? 40 : 10;

    const merger = this.ctx.createChannelMerger(2);

    // Left Ear Oscillator
    const leftOsc = this.ctx.createOscillator();
    leftOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(carrier, this.ctx.currentTime);

    const leftGain = this.ctx.createGain();
    leftGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    leftOsc.connect(leftGain);
    leftGain.connect(merger, 0, 0);

    // Right Ear Oscillator
    const rightOsc = this.ctx.createOscillator();
    rightOsc.type = 'sine';
    rightOsc.frequency.setValueAtTime(carrier + diff, this.ctx.currentTime);

    const rightGain = this.ctx.createGain();
    rightGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    rightOsc.connect(rightGain);
    rightGain.connect(merger, 0, 1);

    // Subtle background pink noise to smooth out pure tone
    const subNoise = this.createNoiseBuffer('pink');
    const subNoiseSrc = this.ctx.createBufferSource();
    subNoiseSrc.buffer = subNoise;
    subNoiseSrc.loop = true;

    const subNoiseGain = this.ctx.createGain();
    subNoiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    subNoiseSrc.connect(subNoiseGain);
    subNoiseGain.connect(out);

    merger.connect(out);

    // Track all active sources so they stop immediately when stop() is called!
    this.activeSources.push(leftOsc, rightOsc, subNoiseSrc);

    leftOsc.start();
    rightOsc.start();
    subNoiseSrc.start();
  }

  private playFilteredNoise(type: 'pink' | 'rain' | 'brown' | 'waves', out: AudioNode) {
    if (!this.ctx) return;

    const buffer = this.createNoiseBuffer(type === 'pink' || type === 'waves' ? 'pink' : type === 'brown' ? 'brown' : 'white');
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    noiseNode.loop = true;

    const filterNode = this.ctx.createBiquadFilter();
    if (type === 'rain') {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(700, this.ctx.currentTime);
      filterNode.Q.setValueAtTime(1.1, this.ctx.currentTime);
    } else if (type === 'brown') {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(900, this.ctx.currentTime);
    } else if (type === 'waves') {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(600, this.ctx.currentTime);
    } else {
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(1100, this.ctx.currentTime);
    }

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    noiseNode.connect(filterNode);
    filterNode.connect(noiseGain);
    noiseGain.connect(out);

    this.activeSources.push(noiseNode);
    noiseNode.start();

    if (type === 'waves') {
      // A very slow swell (about one wave every 9 seconds) modulates the noise level.
      noiseGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.11, this.ctx.currentTime);
      const depth = this.ctx.createGain();
      depth.gain.setValueAtTime(0.22, this.ctx.currentTime);
      lfo.connect(depth);
      depth.connect(noiseGain.gain);
      this.activeSources.push(lfo);
      lfo.start();
    }
  }

  private createNoiseBuffer(kind: 'pink' | 'white' | 'brown'): AudioBuffer {
    const isPink = kind === 'pink';
    if (!this.ctx) throw new Error('No audio context');
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
    } else if (isPink) {
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
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.16;
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
