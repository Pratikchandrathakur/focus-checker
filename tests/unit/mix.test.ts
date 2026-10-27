import { describe, it, expect } from 'vitest';
import { sanitizeMix, parseMixRows, MIX_LIMITS } from '../../src/app/services/mix';

describe('sanitizeMix', () => {
  it('accepts a valid mix and trims the name', () => {
    const r = sanitizeMix({ name: '  Rainy focus ', layers: [{ preset: 'rain', volume: 0.6 }, { preset: 'brown', volume: 0.25 }] });
    expect(r).toEqual({ ok: true, mix: { name: 'Rainy focus', layers: [{ preset: 'rain', volume: 0.6 }, { preset: 'brown', volume: 0.25 }] } });
  });
  it('rounds and clamps volumes into 0..1', () => {
    const r = sanitizeMix({ name: 'x', layers: [{ preset: 'rain', volume: 0.123456 }] });
    expect(r.ok && r.mix.layers[0].volume).toBe(0.12);
    expect(sanitizeMix({ name: 'x', layers: [{ preset: 'rain', volume: 5 }] }).ok && 1).toBeTruthy();
  });
  it.each([
    ['empty name', { name: '', layers: [{ preset: 'rain', volume: 0.5 }] }],
    ['blank name', { name: '   ', layers: [{ preset: 'rain', volume: 0.5 }] }],
    ['long name', { name: 'x'.repeat(41), layers: [{ preset: 'rain', volume: 0.5 }] }],
    ['no layers', { name: 'x', layers: [] }],
    ['too many layers', { name: 'x', layers: Array.from({ length: 7 }, () => ({ preset: 'rain', volume: 0.5 })) }],
    ['unknown sound', { name: 'x', layers: [{ preset: 'exec', volume: 0.5 }] }],
    ['repeated sound', { name: 'x', layers: [{ preset: 'rain', volume: 0.5 }, { preset: 'rain', volume: 0.2 }] }],
    ['volume not a number', { name: 'x', layers: [{ preset: 'rain', volume: '0.5' }] }],
    ['volume NaN', { name: 'x', layers: [{ preset: 'rain', volume: NaN }] }],
    ['not an object', 'mix'],
    ['null', null],
    ['name not a string', { name: 5, layers: [{ preset: 'rain', volume: 0.5 }] }],
    ['control characters in name', { name: 'a\u0000b', layers: [{ preset: 'rain', volume: 0.5 }] }],
  ])('rejects %s', (_n, input) => {
    expect(sanitizeMix(input).ok).toBe(false);
  });
  it('drops unexpected properties (the server rejects extras)', () => {
    const r = sanitizeMix({ name: 'x', admin: true, layers: [{ preset: 'rain', volume: 0.5, evil: '<script>' }] });
    expect(r.ok && Object.keys(r.mix).sort()).toEqual(['layers', 'name']);
    expect(r.ok && Object.keys(r.mix.layers[0]).sort()).toEqual(['preset', 'volume']);
  });
  it('exposes the same limits the database enforces', () => {
    expect(MIX_LIMITS).toMatchObject({ maxName: 40, maxLayers: 6, maxMixes: 20 });
  });
});

describe('parseMixRows', () => {
  it('keeps valid rows and drops corrupt ones', () => {
    const rows = [
      { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301', name: 'A', layers: [{ preset: 'pink', volume: 0.4 }] },
      { id: 'not-a-uuid', name: 'B', layers: [{ preset: 'pink', volume: 0.4 }] },
      { id: '3f2504e0-4f89-41d3-9a0c-0305e82c3302', name: '', layers: [] },
      null, 5,
    ];
    const out = parseMixRows(rows);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('A');
  });
  it('returns [] for non-arrays', () => {
    expect(parseMixRows(null)).toEqual([]);
    expect(parseMixRows({})).toEqual([]);
  });
});
