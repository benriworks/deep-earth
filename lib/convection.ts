import { getLayer, toSceneRadius } from '@/lib/earthData';

/**
 * マントル対流の解析的な流れ場(カット断面の2D極座標)。
 *
 * ストリーム関数 ψ(r, θ) = A・sin(π u)・cos(Nθ)(u は マントル内の正規化半径)
 * から速度を導出する。ストリーム関数由来なので非圧縮(発散ゼロ)であり、
 * 規則的な対流セル(上昇流と下降流の対)が N 対できる。
 *
 * 実際のマントル対流は年間数 cm と極めて遅く、ここでは教育目的で
 * 大幅に誇張した速度で表示する(UI で注記すること)。
 */

/** 対流セルの対の数 */
export const CELL_PAIRS = 5;

/** マントル領域(シーン正規化半径) */
export const MANTLE_INNER = toSceneRadius(getLayer('lowerMantle').radiusInnerKm); // 核マントル境界
export const MANTLE_OUTER = toSceneRadius(getLayer('upperMantle').radiusOuterKm); // 地殻直下

const AMPLITUDE = 0.05;

/**
 * 正規化シーン座標 (r, θ) における対流速度 [vr, vθ] を返す。
 * マントル領域外では [0, 0]。
 */
export function convectionVelocity(r: number, theta: number): [number, number] {
  if (r <= MANTLE_INNER || r >= MANTLE_OUTER) return [0, 0];
  const span = MANTLE_OUTER - MANTLE_INNER;
  const u = (r - MANTLE_INNER) / span;
  // ψ = A sin(πu) cos(Nθ)
  const vr = (-(AMPLITUDE * CELL_PAIRS) / r) * Math.sin(Math.PI * u) * Math.sin(CELL_PAIRS * theta);
  const vtheta = -((AMPLITUDE * Math.PI) / span) * Math.cos(Math.PI * u) * Math.cos(CELL_PAIRS * theta);
  return [vr, vtheta];
}

/** マントル領域内の一様ランダムな粒子初期位置 (r, θ) を生成する */
export function randomMantleParticle(rng: () => number = Math.random): [number, number] {
  // 面積が半径に比例するため sqrt サンプリングで一様化
  const t = rng();
  const r = Math.sqrt(
    MANTLE_INNER * MANTLE_INNER + t * (MANTLE_OUTER * MANTLE_OUTER - MANTLE_INNER * MANTLE_INNER),
  );
  return [r, rng() * Math.PI * 2];
}
