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

describe('realVolcanoes(納品データの受け入れ検証)', () => {
  it('全件が検証ルールを警告ゼロで通過する', async () => {
    const { realVolcanoes } = await import('@/lib/realVolcanoes');
    const { validateVolcanoFeature } = await import('@/lib/volcanoCatalog');
    expect(realVolcanoes.length).toBeGreaterThanOrEqual(20);
    expect(realVolcanoes.length).toBeLessThanOrEqual(30);
    for (const volcano of realVolcanoes) {
      expect(validateVolcanoFeature(volcano), volcano.id).toEqual([]);
    }
  });

  it('id が一意で、日本語名が全件埋まっている', async () => {
    const { realVolcanoes } = await import('@/lib/realVolcanoes');
    const ids = realVolcanoes.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const volcano of realVolcanoes) {
      expect(volcano.nameJa, volcano.id).toBeTruthy();
    }
  });
});

describe('loadVolcanoes', () => {
  const modelForTypeMock = (type: string) => ({
    modelUrl: `/models/volcano/mock_${type}.glb`,
    lodUrls: {
      low: `/models/volcano/mock_${type}_low.glb`,
      mid: `/models/volcano/mock_${type}_mid.glb`,
      high: `/models/volcano/mock_${type}_high.glb`,
    },
  });

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@/lib/volcanoData');
    vi.doUnmock('@/lib/realVolcanoes');
  });

  it('real データがあるときは demo を含まず、modelUrl を type から補完する', async () => {
    const demo = makeVolcano({ id: 'volcano-demo-x' });
    const real = makeVolcano({ id: 'volcano-real-x', type: 'shield' });

    vi.doMock('@/lib/volcanoData', () => ({
      demoVolcanoes: [demo],
      modelForType: modelForTypeMock,
    }));
    vi.doMock('@/lib/realVolcanoes', () => ({ realVolcanoes: [real] }));

    const { loadVolcanoes } = await import('@/lib/volcanoCatalog');
    const result = loadVolcanoes();

    expect(result.map((v) => v.id)).toEqual(['volcano-real-x']);
    expect(result[0].modelUrl).toBe('/models/volcano/mock_shield.glb');
    expect(result[0].lodUrls?.low).toBe('/models/volcano/mock_shield_low.glb');
  });

  it('real データが空のときは demo にフォールバックする', async () => {
    const demo = makeVolcano({ id: 'volcano-demo-x' });

    vi.doMock('@/lib/volcanoData', () => ({
      demoVolcanoes: [demo],
      modelForType: modelForTypeMock,
    }));
    vi.doMock('@/lib/realVolcanoes', () => ({ realVolcanoes: [] }));

    const { loadVolcanoes } = await import('@/lib/volcanoCatalog');
    expect(loadVolcanoes().map((v) => v.id)).toEqual(['volcano-demo-x']);
  });

  it('不正データを除外して警告する', async () => {
    const valid = makeVolcano({ id: 'volcano-valid-001' });
    const invalid = makeVolcano({ id: 'volcano-invalid-001', lat: 999 });

    vi.doMock('@/lib/volcanoData', () => ({
      demoVolcanoes: [],
      modelForType: modelForTypeMock,
    }));
    vi.doMock('@/lib/realVolcanoes', () => ({ realVolcanoes: [valid, invalid] }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadVolcanoes } = await import('@/lib/volcanoCatalog');

    const result = loadVolcanoes();

    expect(result.map((v) => v.id)).toEqual(['volcano-valid-001']);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('id 重複は先勝ちで除外する', async () => {
    const first = makeVolcano({ id: 'volcano-dup-001', name: 'First' });
    const second = makeVolcano({ id: 'volcano-dup-001', name: 'Second' });

    vi.doMock('@/lib/volcanoData', () => ({
      demoVolcanoes: [],
      modelForType: modelForTypeMock,
    }));
    vi.doMock('@/lib/realVolcanoes', () => ({ realVolcanoes: [first, second] }));

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { loadVolcanoes } = await import('@/lib/volcanoCatalog');

    const result = loadVolcanoes();

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('First');
    expect(warnSpy).toHaveBeenCalled();
  });
});
