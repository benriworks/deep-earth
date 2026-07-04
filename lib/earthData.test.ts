import { describe, expect, it } from 'vitest';
import {
  EARTH_LAYERS,
  EARTH_RADIUS_KM,
  earthProfile,
  getLayer,
  radiusToDepth,
  toSceneRadius,
} from '@/lib/earthData';

describe('EARTH_LAYERS 構造の整合性', () => {
  it('地表(深度0)から中心(6371km)まで隙間なく連続している', () => {
    expect(EARTH_LAYERS[0].depthTopKm).toBe(0);
    expect(EARTH_LAYERS[EARTH_LAYERS.length - 1].depthBottomKm).toBe(EARTH_RADIUS_KM);
    for (let i = 1; i < EARTH_LAYERS.length; i++) {
      expect(EARTH_LAYERS[i].depthTopKm).toBe(EARTH_LAYERS[i - 1].depthBottomKm);
    }
  });

  it('半径と深度が一貫している (radius = R - depth)', () => {
    for (const layer of EARTH_LAYERS) {
      expect(layer.radiusOuterKm).toBe(EARTH_RADIUS_KM - layer.depthTopKm);
      expect(layer.radiusInnerKm).toBe(EARTH_RADIUS_KM - layer.depthBottomKm);
    }
  });

  it('液体層(外核)のみ S 波速度が 0', () => {
    for (const layer of EARTH_LAYERS) {
      if (layer.state === 'liquid') {
        expect(layer.vsKmS).toEqual([0, 0]);
      } else {
        expect(layer.vsKmS[0]).toBeGreaterThan(0);
      }
    }
    expect(getLayer('outerCore').state).toBe('liquid');
  });

  it('密度は深くなるほど増加する(境界の代表値レベルで)', () => {
    for (let i = 1; i < EARTH_LAYERS.length; i++) {
      expect(EARTH_LAYERS[i].densityGCm3[0]).toBeGreaterThan(
        EARTH_LAYERS[i - 1].densityGCm3[0],
      );
    }
  });
});

describe('earthProfile.layerAt', () => {
  it('代表深度で正しい層を返す', () => {
    expect(earthProfile.layerAt(0).id).toBe('crust');
    expect(earthProfile.layerAt(100).id).toBe('upperMantle');
    expect(earthProfile.layerAt(500).id).toBe('transitionZone');
    expect(earthProfile.layerAt(1500).id).toBe('lowerMantle');
    expect(earthProfile.layerAt(3000).id).toBe('outerCore');
    expect(earthProfile.layerAt(6000).id).toBe('innerCore');
  });

  it('境界深度は深い側の層に属する', () => {
    expect(earthProfile.layerAt(35).id).toBe('crust');
    expect(earthProfile.layerAt(35.001).id).toBe('upperMantle');
    expect(earthProfile.layerAt(2891).id).toBe('lowerMantle');
    expect(earthProfile.layerAt(2891.001).id).toBe('outerCore');
  });

  it('範囲外の深度はクランプされる', () => {
    expect(earthProfile.layerAt(-100).id).toBe('crust');
    expect(earthProfile.layerAt(99999).id).toBe('innerCore');
  });
});

describe('earthProfile の連続プロファイル', () => {
  it('層の上端・下端で境界値と一致する(線形補間)', () => {
    const lower = getLayer('lowerMantle');
    expect(earthProfile.vpAt(lower.depthTopKm + 0.001)).toBeCloseTo(lower.vpKmS[0], 1);
    expect(earthProfile.vpAt(lower.depthBottomKm)).toBeCloseTo(lower.vpKmS[1], 5);
  });

  it('層の中央で上端と下端の中間値を返す', () => {
    const upper = getLayer('upperMantle');
    const mid = (upper.depthTopKm + upper.depthBottomKm) / 2;
    const expected = (upper.vpKmS[0] + upper.vpKmS[1]) / 2;
    expect(earthProfile.vpAt(mid)).toBeCloseTo(expected, 5);
  });

  it('外核内の任意の深度で S 波速度は 0', () => {
    expect(earthProfile.vsAt(3000)).toBe(0);
    expect(earthProfile.vsAt(4500)).toBe(0);
    expect(earthProfile.vsAt(5000)).toBe(0);
  });

  it('温度・密度は地表から中心へ向かって単調増加する', () => {
    const samples = [0, 30, 200, 500, 1000, 2500, 3500, 5000, 6371];
    for (let i = 1; i < samples.length; i++) {
      expect(earthProfile.tempAt(samples[i])).toBeGreaterThanOrEqual(
        earthProfile.tempAt(samples[i - 1]),
      );
      expect(earthProfile.densityAt(samples[i])).toBeGreaterThanOrEqual(
        earthProfile.densityAt(samples[i - 1]),
      );
    }
  });

  it('P 波速度は外核上端で急減する(液体核による屈折の元)', () => {
    const justAbove = earthProfile.vpAt(2890);
    const justBelow = earthProfile.vpAt(2892);
    expect(justBelow).toBeLessThan(justAbove);
  });
});

describe('座標ヘルパー', () => {
  it('radiusToDepth / toSceneRadius', () => {
    expect(radiusToDepth(EARTH_RADIUS_KM)).toBe(0);
    expect(radiusToDepth(0)).toBe(EARTH_RADIUS_KM);
    expect(toSceneRadius(EARTH_RADIUS_KM)).toBe(1);
    expect(toSceneRadius(3480)).toBeCloseTo(0.5462, 3);
  });
});
