import { describe, expect, it } from 'vitest';
import { earthProfile, EARTH_RADIUS_KM, getLayer } from '@/lib/earthData';
import {
  computeArrivals,
  computeWavefrontTable,
  findShadowZones,
  traceRay,
  wavefrontAt,
} from '@/lib/seismic';

const surfaceSource = { depthKm: 0, angleRad: 0 }; // 真上(北極相当)の地表

const tableP = computeWavefrontTable(earthProfile, surfaceSource, 'P');
const tableS = computeWavefrontTable(earthProfile, surfaceSource, 'S');

describe('computeWavefrontTable(屈折あり)', () => {
  it('step=0 の波面は震源位置に一致する', () => {
    expect(tableP.sourceKm[0]).toBeCloseTo(0, 5);
    expect(tableP.sourceKm[1]).toBeCloseTo(EARTH_RADIUS_KM, 5);
    const front = wavefrontAt(tableP, 0);
    expect(front.length).toBe(tableP.rayCount * 2);
    for (let i = 0; i < front.length; i += 2) {
      expect(front[i]).toBeCloseTo(tableP.sourceKm[0], 3);
      expect(front[i + 1]).toBeCloseTo(tableP.sourceKm[1], 3);
    }
  });

  it('P 波の波面は時間とともに震源から遠ざかる', () => {
    const distAt = (sec: number) => {
      const front = wavefrontAt(tableP, sec);
      let sum = 0;
      for (let i = 0; i < front.length; i += 2) {
        sum += Math.hypot(front[i] - tableP.sourceKm[0], front[i + 1] - tableP.sourceKm[1]);
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
    const front = wavefrontAt(tableP, 100);
    let maxDist = 0;
    for (let i = 0; i < front.length; i += 2) {
      const d = Math.hypot(front[i] - tableP.sourceKm[0], front[i + 1] - tableP.sourceKm[1]);
      maxDist = Math.max(maxDist, d);
    }
    expect(maxDist).toBeGreaterThan(500);
    expect(maxDist).toBeLessThan(1200);
  });

  it('S 波は外核(液体)に入らない', () => {
    const coreRadius = getLayer('outerCore').radiusOuterKm; // 3480
    for (let step = 0; step < tableS.stepCount; step++) {
      for (let ray = 0; ray < tableS.rayCount; ray++) {
        const x = tableS.positionsKm[(step * tableS.rayCount + ray) * 2];
        const y = tableS.positionsKm[(step * tableS.rayCount + ray) * 2 + 1];
        if (Number.isNaN(x)) continue;
        expect(Math.hypot(x, y)).toBeGreaterThan(coreRadius - 5);
      }
    }
  });

  it('P 波は核を通過して対蹠点付近に 1100〜1350 秒で到達する', () => {
    const antipodal = tableP.surfacings.filter((s) => s.distDeg > 172);
    expect(antipodal.length).toBeGreaterThan(0);
    const earliest = Math.min(...antipodal.map((s) => s.timeSec));
    expect(earliest).toBeGreaterThan(1050);
    expect(earliest).toBeLessThan(1350);
  });

  it('震源に深さを指定できる', () => {
    const table = computeWavefrontTable(earthProfile, { depthKm: 500, angleRad: 0 }, 'P');
    expect(Math.hypot(table.sourceKm[0], table.sourceKm[1])).toBeCloseTo(
      EARTH_RADIUS_KM - 500,
      3,
    );
  });

  it('事前計算が十分に軽い(2波種で500ms未満)', () => {
    const start = performance.now();
    computeWavefrontTable(earthProfile, { depthKm: 100, angleRad: 1 }, 'P');
    computeWavefrontTable(earthProfile, { depthKm: 100, angleRad: 1 }, 'S');
    expect(performance.now() - start).toBeLessThan(500);
  });
});

describe('traceRay(波線の物理)', () => {
  it('レイパラメータ p = r·sinθ/v が波線に沿って保存される', () => {
    // 斜め下 40° に射出したレイ(マントル内を屈折しながら進む)
    const trace = traceRay(earthProfile, surfaceSource, 'P', (140 * Math.PI) / 180);
    const pts = trace.points;
    const pAt = (i: number): number => {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const dirX = (b.x - a.x) / len;
      const dirY = (b.y - a.y) / len;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const r = Math.hypot(mx, my);
      const v = earthProfile.vpAt(EARTH_RADIUS_KM - r);
      // 2D の r·sinθ = |pos × dir|
      return Math.abs(mx * dirY - my * dirX) / v;
    };
    const p0 = pAt(5);
    for (const i of [50, 120, 250, Math.max(pts.length - 10, 6)]) {
      if (i < pts.length - 1) {
        expect(pAt(i)).toBeCloseTo(p0, -Math.log10(p0 * 0.03)); // 3% 以内
      }
    }
  });

  it('真下に射出したレイは中心を通って対蹠点へ抜ける', () => {
    const trace = traceRay(earthProfile, surfaceSource, 'P', Math.PI);
    expect(trace.exit).toBe('surface');
    expect(trace.surfacing!.distDeg).toBeGreaterThan(176);
  });

  it('S 波の急角度レイは CMB で吸収される', () => {
    const trace = traceRay(earthProfile, surfaceSource, 'S', Math.PI * 0.95);
    expect(trace.exit).toBe('absorbed');
    const last = trace.points[trace.points.length - 1];
    expect(Math.hypot(last.x, last.y)).toBeCloseTo(getLayer('outerCore').radiusOuterKm, -1);
  });
});

describe('シャドウゾーン(観測データからの推論の核心)', () => {
  const zones = findShadowZones(tableP, tableS);

  it('S 波シャドウは約93°から始まる(本モデルの値。実地球は約103°)', () => {
    // 6層線形近似は実PREMと違い最下部マントル(D"領域)の勾配平坦化がなく、
    // 波線が早く曲がり戻るため実際の103°より小さい値になる。UI で注記する。
    expect(zones.sShadowStartDeg).not.toBeNull();
    expect(zones.sShadowStartDeg!).toBeGreaterThan(85);
    expect(zones.sShadowStartDeg!).toBeLessThan(100);
  });

  it('P 波シャドウ帯(直接波と核通過波の間の隙間)が存在する', () => {
    expect(zones.pShadow).not.toBeNull();
    const [from, to] = zones.pShadow!;
    expect(from).toBeGreaterThan(85);
    expect(from).toBeLessThan(125);
    expect(to - from).toBeGreaterThan(10);
    expect(to).toBeLessThan(175);
  });
});

describe('computeArrivals(観測点の走時)', () => {
  it('近い観測点には P も S も届き、P が先に着く', () => {
    const [near] = computeArrivals(tableP, tableS, [30]);
    expect(near.pArrivalSec).not.toBeNull();
    expect(near.sArrivalSec).not.toBeNull();
    expect(near.pArrivalSec!).toBeLessThan(near.sArrivalSec!);
  });

  it('遠い観測点(150°・175°)には S が届かない = S波シャドウ', () => {
    const arrivals = computeArrivals(tableP, tableS, [150, 175]);
    for (const a of arrivals) {
      expect(a.sArrivalSec).toBeNull();
    }
  });

  it('対蹠点側(165°・180°)には核通過 P 波が届く', () => {
    const arrivals = computeArrivals(tableP, tableS, [165, 180]);
    for (const a of arrivals) {
      expect(a.pArrivalSec).not.toBeNull();
    }
  });

  it('震央距離が遠いほど P 初動は遅い(走時曲線の単調性)', () => {
    const arrivals = computeArrivals(tableP, tableS, [20, 40, 60, 80]);
    for (let i = 1; i < arrivals.length; i++) {
      expect(arrivals[i].pArrivalSec!).toBeGreaterThan(arrivals[i - 1].pArrivalSec!);
    }
  });
});
