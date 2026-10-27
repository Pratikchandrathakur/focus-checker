import { describe, it, expect, beforeEach } from 'vitest';
import { SoundscapeEngine } from '../../src/app/services/audioEngine';

// A tiny fake Web Audio graph that records what the engine builds.
class Param { value = 0; setValueAtTime(v: number) { this.value = v; } }
class FakeNode {
  gain = new Param(); frequency = new Param(); Q = new Param(); type = ''; buffer: unknown = null; loop = false;
  started = false; stopped = false; disconnected = false; connections: FakeNode[] = [];
  constructor(public kind: string) {}
  connect(n: FakeNode) { this.connections.push(n); return n; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}
class FakeCtx {
  static last: FakeCtx;
  currentTime = 0; sampleRate = 8000; state = 'running'; destination = new FakeNode('destination'); nodes: FakeNode[] = [];
  constructor() { FakeCtx.last = this; }
  make(kind: string) { const n = new FakeNode(kind); this.nodes.push(n); return n; }
  createGain() { return this.make('gain'); }
  createOscillator() { return this.make('osc'); }
  createBufferSource() { return this.make('buffer'); }
  createBiquadFilter() { return this.make('filter'); }
  createChannelMerger() { return this.make('merger'); }
  createBuffer(_c: number, len: number) { const d = new Float32Array(len); return { getChannelData: () => d }; }
  resume() {}
  of(kind: string) { return this.nodes.filter((n) => n.kind === kind); }
}

let engine: SoundscapeEngine;
beforeEach(() => {
  (window as any).AudioContext = FakeCtx;
  engine = new SoundscapeEngine();
});

describe('SoundscapeEngine', () => {
  it('plays a single preset through a master gain and stops everything cleanly', () => {
    engine.playPreset('rain', 0.5);
    const ctx = FakeCtx.last;
    expect(ctx.of('buffer').every((n) => n.started)).toBe(true);
    expect(engine.getStatus()).toEqual({ isPlaying: true, preset: 'rain' });
    engine.stop();
    expect(ctx.of('buffer').every((n) => n.stopped && n.disconnected)).toBe(true);
    expect(engine.getStatus()).toEqual({ isPlaying: false, preset: 'none' });
    expect(() => engine.stop()).not.toThrow();
  });

  it('layers several sounds in a mix', () => {
    engine.playMix([{ preset: 'rain', volume: 0.5 }, { preset: 'brown', volume: 0.4 }, { preset: 'gamma', volume: 0.3 }], 0.8);
    const ctx = FakeCtx.last;
    expect(engine.getStatus()).toEqual({ isPlaying: true, preset: 'mix' });
    expect(ctx.of('buffer').length).toBeGreaterThanOrEqual(3); // rain, brown, and the gamma bed
    expect(ctx.of('osc').length).toBeGreaterThanOrEqual(2); // binaural pair
    engine.stop();
    expect([...ctx.of('buffer'), ...ctx.of('osc')].every((n) => n.stopped)).toBe(true);
  });

  it('keeps the combined loudness within the master volume however many layers are stacked', () => {
    engine.playMix([{ preset: 'rain', volume: 1 }, { preset: 'brown', volume: 1 }, { preset: 'pink', volume: 1 }, { preset: 'waves', volume: 1 }], 1);
    const ctx = FakeCtx.last;
    const master = ctx.of('gain')[0];
    const layerGains = ctx.of('gain').filter((g) => g.connections.includes(master));
    expect(layerGains).toHaveLength(4);
    const total = layerGains.reduce((a, g) => a + g.gain.value, 0);
    expect(total).toBeLessThanOrEqual(1.0001);
  });

  it('clamps hostile volumes and ignores unknown sounds', () => {
    engine.playMix([{ preset: 'rain', volume: 99 }, { preset: 'pink', volume: -5 }, { preset: 'brown', volume: NaN }, { preset: 'rm -rf' as any, volume: 0.5 }], 99);
    const ctx = FakeCtx.last;
    for (const g of ctx.of('gain')) {
      expect(Number.isFinite(g.gain.value)).toBe(true);
      expect(g.gain.value).toBeGreaterThanOrEqual(0);
      expect(g.gain.value).toBeLessThanOrEqual(1);
    }
  });

  it('never builds more than 6 layers', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ preset: (['rain', 'pink', 'brown', 'waves', 'gamma', 'alpha'] as const)[i % 6], volume: 0.1 }));
    engine.playMix(many, 0.5);
    const ctx = FakeCtx.last;
    expect(ctx.of('buffer').length + ctx.of('osc').length).toBeLessThan(40);
  });

  it('waves are modulated by a slow oscillator', () => {
    engine.playPreset('waves', 0.5);
    const osc = FakeCtx.last.of('osc');
    expect(osc).toHaveLength(1);
    expect(osc[0].frequency.value).toBeLessThan(1);
  });

  it('replaces whatever was playing when a new sound starts', () => {
    engine.playPreset('rain', 0.5);
    const first = FakeCtx.last.of('buffer').slice();
    engine.playPreset('brown', 0.5);
    expect(first.every((n) => n.stopped)).toBe(true);
    expect(engine.getStatus().preset).toBe('brown');
  });

  it('setVolume clamps to 0..1', () => {
    engine.playPreset('pink', 0.5);
    const master = FakeCtx.last.of('gain')[0];
    engine.setVolume(5);
    expect(master.gain.value).toBe(1);
    engine.setVolume(-2);
    expect(master.gain.value).toBe(0);
  });
});
