import type { EarthProfile } from '@/types/earth';

/**
 * 地震波の波面事前計算。
 *
 * カット断面(2D 円盤、単位 km、地球中心が原点)上で、震源から放射した
 * 多数のレイを直線経路で進め、半径依存速度 v(r) による通過時間を区分積分する。
 * 時刻 t の波面 = 各レイ上で走時が t に達した点を結んだ曲線。
 *
 * 簡略化(UI で注記すること):
 * - レイ経路は直線(スネルの法則による屈曲は近似しない)
 * - S 波は液体の外核に入った時点で消滅(S 波シャドウの表現)
 * - P 波は外核で減速して通過する(波面のくぼみとして現れる)
 */

export type WaveType = 'P' | 'S';

export interface SeismicSource {
  /** 震源の深さ (km) */
  depthKm: number;
  /** 断面円周上の角度位置 (rad)。0 = 真上(+Y)、時計回り */
  angleRad: number;
}

export interface WavefrontTable {
  waveType: WaveType;
  rayCount: number;
  timeStepSec: number;
  stepCount: number;
  /** 総シミュレーション時間 (秒) */
  maxTimeSec: number;
  /**
   * positionsKm[(step * rayCount + ray) * 2 + 0..1] = その時刻のレイ先端 (x, y) km。
   * 未到達・消滅・地表脱出は NaN。step=0 は全レイ震源位置。
   */
  positionsKm: Float32Array;
  /** 震源位置 (km) */
  sourceKm: [number, number];
}

export interface WavefrontOptions {
  rayCount?: number;
  timeStepSec?: number;
  maxTimeSec?: number;
  /** レイの積分ステップ長 (km) */
  marchStepKm?: number;
}

// rayCount は偶数にする(震源の真反対方向へ向かうレイを含めるため)
const DEFAULTS: Required<WavefrontOptions> = {
  rayCount: 180,
  timeStepSec: 5,
  maxTimeSec: 2600,
  marchStepKm: 20,
};

export function computeWavefrontTable(
  profile: EarthProfile,
  source: SeismicSource,
  waveType: WaveType,
  options?: WavefrontOptions,
): WavefrontTable {
  const { rayCount, timeStepSec, maxTimeSec, marchStepKm } = {
    ...DEFAULTS,
    ...options,
  };
  const R = profile.earthRadiusKm;
  const stepCount = Math.floor(maxTimeSec / timeStepSec) + 1;

  const srcRadius = R - Math.min(Math.max(source.depthKm, 0), R);
  const srcX = srcRadius * Math.sin(source.angleRad);
  const srcY = srcRadius * Math.cos(source.angleRad);

  const positions = new Float32Array(stepCount * rayCount * 2).fill(NaN);

  const velocityAt = (depthKm: number) =>
    waveType === 'P' ? profile.vpAt(depthKm) : profile.vsAt(depthKm);

  for (let ray = 0; ray < rayCount; ray++) {
    // レイ方向は全周に等間隔。地表方向へ出るレイはすぐ円盤外に出て終わる
    const phi = (ray / rayCount) * Math.PI * 2;
    const dirX = Math.sin(phi);
    const dirY = Math.cos(phi);

    let x = srcX;
    let y = srcY;
    let t = 0;
    let k = 0;

    // step=0 は震源
    positions[(0 * rayCount + ray) * 2] = srcX;
    positions[(0 * rayCount + ray) * 2 + 1] = srcY;
    k = 1;

    while (t < maxTimeSec && k < stepCount) {
      const r = Math.hypot(x, y);
      if (r > R + 1) break; // 地表から脱出

      const depth = Math.max(R - r, 0);
      const v = velocityAt(depth);
      if (v <= 0.01) break; // S 波が液体外核に入った(シャドウ)

      const dt = marchStepKm / v;
      // このマーチ区間内に出力時刻が含まれれば線形補間で記録
      while (k < stepCount && k * timeStepSec <= t + dt) {
        const frac = (k * timeStepSec - t) / dt;
        positions[(k * rayCount + ray) * 2] = x + dirX * marchStepKm * frac;
        positions[(k * rayCount + ray) * 2 + 1] = y + dirY * marchStepKm * frac;
        k++;
      }
      x += dirX * marchStepKm;
      y += dirY * marchStepKm;
      t += dt;
    }
  }

  return {
    waveType,
    rayCount,
    timeStepSec,
    stepCount,
    maxTimeSec,
    positionsKm: positions,
    sourceKm: [srcX, srcY],
  };
}

/** 指定時刻の波面座標 (km) を [x0,y0, x1,y1, ...] で返す。NaN のレイは除外 */
export function wavefrontAt(table: WavefrontTable, timeSec: number): Float32Array {
  const step = Math.min(
    Math.max(Math.round(timeSec / table.timeStepSec), 0),
    table.stepCount - 1,
  );
  const pts: number[] = [];
  for (let ray = 0; ray < table.rayCount; ray++) {
    const x = table.positionsKm[(step * table.rayCount + ray) * 2];
    const y = table.positionsKm[(step * table.rayCount + ray) * 2 + 1];
    if (!Number.isNaN(x) && !Number.isNaN(y)) pts.push(x, y);
  }
  return new Float32Array(pts);
}
