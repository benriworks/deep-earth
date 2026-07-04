import { describe, expect, it } from 'vitest';
import {
  convectionVelocity,
  randomMantleParticle,
  MANTLE_INNER,
  MANTLE_OUTER,
  CELL_PAIRS,
} from '@/lib/convection';

describe('convectionVelocity', () => {
  it('マントル領域外では速度ゼロ', () => {
    expect(convectionVelocity(MANTLE_INNER - 0.01, 1)).toEqual([0, 0]);
    expect(convectionVelocity(MANTLE_OUTER + 0.01, 1)).toEqual([0, 0]);
    expect(convectionVelocity(0.1, 0)).toEqual([0, 0]); // 核内
  });

  it('マントル中央では流れがある', () => {
    const mid = (MANTLE_INNER + MANTLE_OUTER) / 2;
    let maxSpeed = 0;
    for (let i = 0; i < 32; i++) {
      const [vr, vt] = convectionVelocity(mid, (i / 32) * Math.PI * 2);
      maxSpeed = Math.max(maxSpeed, Math.hypot(vr, vt));
    }
    expect(maxSpeed).toBeGreaterThan(0.01);
  });

  it('境界近くでは半径方向速度がほぼゼロ(粒子が漏れない)', () => {
    for (let i = 0; i < 16; i++) {
      const theta = (i / 16) * Math.PI * 2;
      const [vrIn] = convectionVelocity(MANTLE_INNER + 1e-4, theta);
      const [vrOut] = convectionVelocity(MANTLE_OUTER - 1e-4, theta);
      expect(Math.abs(vrIn)).toBeLessThan(0.01);
      expect(Math.abs(vrOut)).toBeLessThan(0.01);
    }
  });

  it('上昇流と下降流が対で存在する', () => {
    const mid = (MANTLE_INNER + MANTLE_OUTER) / 2;
    let rising = 0;
    let sinking = 0;
    for (let i = 0; i < 360; i++) {
      const [vr] = convectionVelocity(mid, (i / 360) * Math.PI * 2);
      if (vr > 0.001) rising++;
      if (vr < -0.001) sinking++;
    }
    expect(rising).toBeGreaterThan(0);
    expect(sinking).toBeGreaterThan(0);
    // セル対の数だけ上昇・下降の領域が交互に現れる
    expect(CELL_PAIRS).toBeGreaterThanOrEqual(4);
    expect(CELL_PAIRS).toBeLessThanOrEqual(6);
  });
});

describe('randomMantleParticle', () => {
  it('生成された粒子はマントル領域内にある', () => {
    for (let i = 0; i < 200; i++) {
      const [r, theta] = randomMantleParticle();
      expect(r).toBeGreaterThanOrEqual(MANTLE_INNER);
      expect(r).toBeLessThanOrEqual(MANTLE_OUTER);
      expect(theta).toBeGreaterThanOrEqual(0);
      expect(theta).toBeLessThanOrEqual(Math.PI * 2);
    }
  });
});
