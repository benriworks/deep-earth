import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAGMA_PARAMS,
  MAGMA_INNER_RADIUS,
  MAGMA_OUTER_RADIUS,
  MagmaSim,
} from '@/lib/magmaSim';

/** テストは軽量グリッドで回す(数値性質は解像度に依らない) */
const TEST_PARAMS = { nTheta: 96, nR: 24, seed: 7 };

describe('MagmaSim(ブシネスク対流の簡易物理)', () => {
  it('静止状態から対流が立ち上がる(浮力→流れの診断が機能)', () => {
    const sim = new MagmaSim(TEST_PARAMS);
    expect(sim.maxVelocity()).toBe(0);
    sim.stepMany(50);
    expect(sim.maxVelocity()).toBeGreaterThan(1);
    // さらに進めると発達する
    const early = sim.maxVelocity();
    sim.stepMany(200);
    expect(sim.maxVelocity()).toBeGreaterThan(early * 0.5); // 減衰し続けない
  });

  it('1000 ステップで NaN が出ず温度が有界に保たれる', () => {
    const sim = new MagmaSim(TEST_PARAMS);
    sim.stepMany(1000);
    expect(sim.hasNaN()).toBe(false);
    for (let k = 0; k < sim.T.length; k++) {
      expect(sim.T[k]).toBeGreaterThanOrEqual(-0.06);
      expect(sim.T[k]).toBeLessThanOrEqual(1.06);
    }
  });

  it('境界条件が維持される(底=1、上面=0)', () => {
    const sim = new MagmaSim(TEST_PARAMS);
    sim.stepMany(300);
    for (let i = 0; i < sim.nTheta; i++) {
      expect(sim.T[i]).toBe(1); // j=0 行
      expect(sim.T[(sim.nR - 1) * sim.nTheta + i]).toBe(0);
    }
  });

  it('θ 周期境界に継ぎ目がない(i=0 と i=n-1 の差が近傍差と同程度)', () => {
    const sim = new MagmaSim(TEST_PARAMS);
    sim.stepMany(400);
    const jMid = Math.floor(sim.nR / 2);
    const row = jMid * sim.nTheta;
    let seamDiff = 0;
    let interiorDiff = 0;
    seamDiff = Math.abs(sim.T[row + 0] - sim.T[row + sim.nTheta - 1]);
    for (let i = 40; i < 50; i++) {
      interiorDiff += Math.abs(sim.T[row + i] - sim.T[row + i + 1]);
    }
    interiorDiff /= 10;
    // 継ぎ目の飛びが内部の典型変化量の10倍以内(周期処理が壊れていれば桁違いになる)
    expect(seamDiff).toBeLessThan(Math.max(interiorDiff * 10, 0.05));
  });

  it('同じ seed で決定論的に再現される', () => {
    const a = new MagmaSim(TEST_PARAMS);
    const b = new MagmaSim(TEST_PARAMS);
    a.stepMany(120);
    b.stepMany(120);
    expect(Array.from(a.T)).toEqual(Array.from(b.T));
  });

  it('seed が違えば場が異なる', () => {
    const a = new MagmaSim({ ...TEST_PARAMS, seed: 1 });
    const b = new MagmaSim({ ...TEST_PARAMS, seed: 2 });
    a.stepMany(120);
    b.stepMany(120);
    let diff = 0;
    for (let k = 0; k < a.T.length; k++) diff += Math.abs(a.T[k] - b.T[k]);
    expect(diff).toBeGreaterThan(0.1);
  });

  it('本番解像度(192×48)で 8 サブステップが実時間予算内(<150ms)', () => {
    const sim = new MagmaSim({ seed: 3 });
    sim.stepMany(20); // JIT ウォームアップ
    const start = performance.now();
    sim.stepMany(8);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(150);
  });

  it('転送用の温度/速度サンプリングが正しい形状を返す', () => {
    const sim = new MagmaSim(TEST_PARAMS);
    sim.stepMany(10);
    expect(sim.getTemperatureFloat32().length).toBe(sim.nTheta * sim.nR);
    expect(sim.getVelocityCoarse(64, 24).length).toBe(64 * 24 * 2);
  });

  it('dt と SOR 緩和係数が安全上限にクランプされる', () => {
    const sim = new MagmaSim({ dt: 99, sorRelaxation: 5 });
    expect(sim.params.dt).toBeLessThanOrEqual(5e-4);
    expect(sim.params.sorRelaxation).toBeLessThanOrEqual(1.8);
  });

  it('環状領域の定義が既存マントル層と整合する比率', () => {
    // 実比 3480/6336 = 0.549 ≈ r_i/r_o
    expect(MAGMA_INNER_RADIUS / MAGMA_OUTER_RADIUS).toBeCloseTo(3480 / 6336, 2);
    expect(DEFAULT_MAGMA_PARAMS.nTheta).toBeGreaterThan(DEFAULT_MAGMA_PARAMS.nR);
  });
});
