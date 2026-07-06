import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VolcanoFeature } from '@/types/volcano';

function makeVolcano(overrides: Partial<VolcanoFeature> = {}): VolcanoFeature {
  return {
    id: 'volcano-test-001',
    name: 'Test Volcano',
    type: 'stratovolcano',
    lat: 10,
    lon: 20,
    heightKm: 2,
    baseRadiusKm: 10,
    craterRadiusKm: 1,
    mantleSampleDepthKm: 80,
    eruptionThreshold: 0.5,
    activity: {
      heat: 0.2,
      pressure: 0.2,
      gas: 0.2,
      eruption: 0,
    },
    ...overrides,
  };
}

describe('validateVolcanoFeature', () => {
  it('正常データは違反なしで通る', async () => {
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    const errors = validateVolcanoFeature(makeVolcano());
    expect(errors).toEqual([]);
  });

  it('lat=90 は通り、90.1 は落ちる', async () => {
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    expect(validateVolcanoFeature(makeVolcano({ lat: 90 }))).toEqual([]);
    expect(validateVolcanoFeature(makeVolcano({ lat: 90.1 }))).not.toEqual([]);
  });

  it('craterRadiusKm ≧ baseRadiusKm は落ちる', async () => {
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    const errors = validateVolcanoFeature(
      makeVolcano({ baseRadiusKm: 10, craterRadiusKm: 10 }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('type 不正は落ちる', async () => {
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    const errors = validateVolcanoFeature(
      makeVolcano({ type: 'volcano' as VolcanoFeature['type'] }),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it('id 形式違反は落ちる', async () => {
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    const errors = validateVolcanoFeature(makeVolcano({ id: 'Volcano_Bad!' }));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('heightKm=-3 の submarine は通る', async () => {
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    const errors = validateVolcanoFeature(
      makeVolcano({ type: 'submarine', heightKm: -3 }),
    );
    expect(errors).toEqual([]);
  });
});

describe('loadVolcanoes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@/lib/volcanoData');
    vi.doUnmock('@/lib/realVolcanoes');
  });

  it('不正データを除外して警告する', async () => {
    const valid = makeVolcano({ id: 'volcano-valid-001' });
    const invalid = makeVolcano({ id: 'volcano-invalid-001', lat: 999 });

    vi.doMock('@/lib/volcanoData', () => ({ demoVolcanoes: [valid] }));
    vi.doMock('@/lib/realVolcanoes', () => ({ realVolcanoes: [invalid] }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadVolcanoes } = await import('@/lib/volcanoCatalog');

    const result = loadVolcanoes();

    expect(result).toEqual([valid]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('id 重複は先勝ちで除外する', async () => {
    const first = makeVolcano({ id: 'volcano-dup-001', name: 'First' });
    const second = makeVolcano({ id: 'volcano-dup-001', name: 'Second' });

    vi.doMock('@/lib/volcanoData', () => ({ demoVolcanoes: [first] }));
    vi.doMock('@/lib/realVolcanoes', () => ({ realVolcanoes: [second] }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadVolcanoes } = await import('@/lib/volcanoCatalog');

    const result = loadVolcanoes();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('First');
    expect(warnSpy).toHaveBeenCalled();
  });
});
