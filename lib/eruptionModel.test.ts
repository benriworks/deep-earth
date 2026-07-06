import { describe, expect, it } from 'vitest';
import { computeEruptionIntensity } from '@/lib/eruptionModel';
import { sampleMantleForVolcano } from '@/lib/mantleSampler';
import { EARTH_RADIUS_KM } from '@/lib/earthData';
import { demoVolcanoes } from '@/lib/volcanoData';

describe('computeEruptionIntensity', () => {
  it('returns a value in 0..1', () => {
    const value = computeEruptionIntensity({
      mantleUpwelling: 10,
      mantleTemperature: 10,
      crustStress: 10,
      magmaPressure: 10,
      gas: 10,
      threshold: -1,
    });
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('stays low below threshold', () => {
    const value = computeEruptionIntensity({
      mantleUpwelling: 0,
      mantleTemperature: 0,
      crustStress: 0,
      magmaPressure: 0,
      gas: 0,
      threshold: 0.6,
    });
    expect(value).toBe(0);
  });

  it('increases when mantle and pressure are high', () => {
    const value = computeEruptionIntensity({
      mantleUpwelling: 1,
      mantleTemperature: 1,
      crustStress: 0.6,
      magmaPressure: 0.9,
      gas: 0.8,
      threshold: 0.45,
    });
    expect(value).toBeGreaterThan(0.5);
  });

  it('decreases with higher threshold', () => {
    const lowThreshold = computeEruptionIntensity({
      mantleUpwelling: 0.8,
      mantleTemperature: 0.8,
      crustStress: 0.4,
      magmaPressure: 0.6,
      gas: 0.6,
      threshold: 0.3,
    });
    const highThreshold = computeEruptionIntensity({
      mantleUpwelling: 0.8,
      mantleTemperature: 0.8,
      crustStress: 0.4,
      magmaPressure: 0.6,
      gas: 0.6,
      threshold: 0.7,
    });
    expect(lowThreshold).toBeGreaterThan(highThreshold);
  });

  it('smoothstep 遷移が滑らか(threshold 近傍で急峻なジャンプがない)', () => {
    const threshold = 0.5;
    let prev: number | null = null;
    for (let source = 0; source <= 1.0001; source += 0.01) {
      const value = computeEruptionIntensity({
        mantleUpwelling: source,
        mantleTemperature: 0,
        crustStress: 0,
        magmaPressure: 0,
        gas: 0,
        threshold,
      });
      if (prev !== null) {
        expect(Math.abs(value - prev)).toBeLessThan(0.15);
      }
      prev = value;
    }
  });
});

describe('sampleMantleForVolcano', () => {
  const baseVolcano = demoVolcanoes[0];

  it('upwelling/temperature は 0..1、tangentialFlow は -1..1', () => {
    const sample = sampleMantleForVolcano(baseVolcano);
    expect(sample.upwelling).toBeGreaterThanOrEqual(0);
    expect(sample.upwelling).toBeLessThanOrEqual(1);
    expect(sample.temperature).toBeGreaterThanOrEqual(0);
    expect(sample.temperature).toBeLessThanOrEqual(1);
    expect(sample.tangentialFlow).toBeGreaterThanOrEqual(-1);
    expect(sample.tangentialFlow).toBeLessThanOrEqual(1);
  });

  it('mantleSampleDepthKm に地球半径超を渡してもクラッシュしない', () => {
    const deepVolcano = {
      ...baseVolcano,
      mantleSampleDepthKm: EARTH_RADIUS_KM * 5,
    };
    expect(() => sampleMantleForVolcano(deepVolcano)).not.toThrow();
    const sample = sampleMantleForVolcano(deepVolcano);
    expect(sample.upwelling).toBeGreaterThanOrEqual(0);
    expect(sample.upwelling).toBeLessThanOrEqual(1);
    expect(sample.temperature).toBeGreaterThanOrEqual(0);
    expect(sample.temperature).toBeLessThanOrEqual(1);
    expect(sample.tangentialFlow).toBeGreaterThanOrEqual(-1);
    expect(sample.tangentialFlow).toBeLessThanOrEqual(1);
  });

  it('mantleSampleDepthKm が負でもクラッシュしない', () => {
    const shallowVolcano = { ...baseVolcano, mantleSampleDepthKm: -100 };
    expect(() => sampleMantleForVolcano(shallowVolcano)).not.toThrow();
  });
});
