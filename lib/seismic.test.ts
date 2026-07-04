import { describe, expect, it } from 'vitest';
import { earthProfile, EARTH_RADIUS_KM, getLayer } from '@/lib/earthData';
import { computeWavefrontTable, wavefrontAt } from '@/lib/seismic';

const surfaceSource = { depthKm: 0, angleRad: 0 }; // 真上(北極相当)の地表

describe('computeWavefrontTable', () => {
  it('step=0 の波面は震源位置に一致する', () => {
    const table = computeWavefrontTable(earthProfile, surfaceSource, 'P');
    expect(table.sourceKm[0]).toBeCloseTo(0, 5);
    expect(table.sourceKm[1]).toBeCloseTo(EARTH_RADIUS_KM, 5);
    const front = wavefrontAt(table, 0);
    expect(front.length).toBe(table.rayCount * 2);
    for (let i = 0; i < front.length; i += 2) {
      expect(front[i]).toBeCloseTo(table.sourceKm[0], 3);
      expect(front[i + 1]).toBeCloseTo(table.sourceKm[1], 3);
    }
  });

  it('P 波の波面は時間とともに震源から遠ざかる', () => {
    const table = computeWavefrontTable(earthProfile, surfaceSource, 'P');
    const distAt = (sec: number) => {
      const front = wavefrontAt(table, sec);
      let sum = 0;
      for (let i = 0; i < front.length; i += 2) {
        sum += Math.hypot(front[i] - table.sourceKm[0], front[i + 1] - table.sourceKm[1]);
      }
      return front.length > 0 ? sum / (front.length / 2) : 0;
    };
    const d100 = distAt(100);
    const d300 = distAt(300);
    const d600 = distAt(600);
    expect(d100).toBeGreaterThan(0);
    expect(d300).toBeGreaterThan(d100);
    expect(d600).toBeGreaterThan(d300);
  });

  it('P 波はおおよそ妥当な速度で伝播する(100秒で 580〜1100km 程度)', () => {
    // 地殻〜上部マントルの Vp は 5.8〜9 km/s
    const table = computeWavefrontTable(earthProfile, surfaceSource, 'P');
    const front = wavefrontAt(table, 100);
    let maxDist = 0;
    for (let i = 0; i < front.length; i += 2) {
      const d = Math.hypot(front[i] - table.sourceKm[0], front[i + 1] - table.sourceKm[1]);
      maxDist = Math.max(maxDist, d);
    }
    expect(maxDist).toBeGreaterThan(500);
    expect(maxDist).toBeLessThan(1200);
  });

  it('S 波は外核(液体)に入らない = S 波シャドウ', () => {
    const table = computeWavefrontTable(earthProfile, surfaceSource, 'S');
    const coreRadius = getLayer('outerCore').radiusOuterKm; // 3480
    for (let step = 0; step < table.stepCount; step++) {
      for (let ray = 0; ray < table.rayCount; ray++) {
        const x = table.positionsKm[(step * table.rayCount + ray) * 2];
        const y = table.positionsKm[(step * table.rayCount + ray) * 2 + 1];
        if (Number.isNaN(x)) continue;
        const r = Math.hypot(x, y);
        // マーチ1ステップ分の食い込みは許容
        expect(r).toBeGreaterThan(coreRadius - 25);
      }
    }
  });

  it('P 波は外核を通過して対蹠点付近に到達できる', () => {
    const table = computeWavefrontTable(earthProfile, surfaceSource, 'P');
    // 対蹠点 = (0, -R)。全期間で最も近づいた距離を調べる
    let minDistToAntipode = Infinity;
    for (let step = 0; step < table.stepCount; step++) {
      for (let ray = 0; ray < table.rayCount; ray++) {
        const x = table.positionsKm[(step * table.rayCount + ray) * 2];
        const y = table.positionsKm[(step * table.rayCount + ray) * 2 + 1];
        if (Number.isNaN(x)) continue;
        minDistToAntipode = Math.min(
          minDistToAntipode,
          Math.hypot(x - 0, y - -EARTH_RADIUS_KM),
        );
      }
    }
    expect(minDistToAntipode).toBeLessThan(100);
  });

  it('震源に深さを指定できる', () => {
    const table = computeWavefrontTable(earthProfile, { depthKm: 500, angleRad: 0 }, 'P');
    expect(Math.hypot(table.sourceKm[0], table.sourceKm[1])).toBeCloseTo(
      EARTH_RADIUS_KM - 500,
      3,
    );
  });

  it('事前計算が十分に軽い(200ms 未満)', () => {
    const start = performance.now();
    computeWavefrontTable(earthProfile, surfaceSource, 'P');
    computeWavefrontTable(earthProfile, surfaceSource, 'S');
    expect(performance.now() - start).toBeLessThan(200);
  });
});
