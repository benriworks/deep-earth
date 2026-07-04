import type { EarthProfile } from '@/types/earth';

/**
 * 地震波の波線追跡と波面事前計算。
 *
 * カット断面(2D、単位 km、地球中心が原点)上で、震源から放射した多数の
 * レイを波線方程式で積分する。球対称媒質の波線はデカルト座標で
 *
 *   d(dir)/ds = -(v'(r)/v) · (r̂ - (r̂·dir)·dir)
 *
 * に従って曲がる(速度勾配による屈折。転回点の特異性がないためデカルトで積分する)。
 * 層境界の速度不連続ではスネルの法則 sinθ₂ = (v₂/v₁)·sinθ₁ を適用し、
 * 全反射条件では反射して継続する。レイパラメータ p = r·sinθ/v は
 * 勾配屈折・境界屈折の両方で保存される(テストで検証)。
 *
 * 簡略化(UI で注記すること):
 * - S 波は液体の外核に入れず境界で消滅(SKS 等の波種変換は扱わない)
 * - 地表に達したレイはそこで終了(表面反射 PP 等は扱わない)
 * - 速度は PREM 境界値の層内線形補間
 */

export type WaveType = 'P' | 'S';

export interface SeismicSource {
  /** 震源の深さ (km) */
  depthKm: number;
  /** 断面円周上の角度位置 (rad)。0 = 真上(+Y)、時計回り */
  angleRad: number;
}

/** レイが地表に到達したイベント(走時データの源) */
export interface Surfacing {
  /** 震央距離 (度、0〜180) */
  distDeg: number;
  /** 到達時刻 (秒) */
  timeSec: number;
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
   * 消滅・地表到達後は NaN。step=0 は全レイ震源位置。
   */
  positionsKm: Float32Array;
  /** 震源位置 (km) */
  sourceKm: [number, number];
  /** 地表到達イベント一覧(観測点の走時計算に使う) */
  surfacings: Surfacing[];
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
  marchStepKm: 15,
};

interface RayPoint {
  x: number;
  y: number;
  tSec: number;
}

export interface RayTrace {
  points: RayPoint[];
  exit: 'surface' | 'absorbed' | 'timeout';
  /** exit === 'surface' のときのみ */
  surfacing?: Surfacing;
}

/** |pos + f·ds·dir| = targetR を満たす f ∈ (0, 1] の最小解(なければ null) */
function crossingFraction(
  px: number,
  py: number,
  dx: number,
  dy: number,
  ds: number,
  targetR: number,
): number | null {
  // (px + f·ds·dx)² + (py + f·ds·dy)² = targetR²
  const a = ds * ds;
  const b = 2 * ds * (px * dx + py * dy);
  const c = px * px + py * py - targetR * targetR;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const f1 = (-b - sqrtDisc) / (2 * a);
  const f2 = (-b + sqrtDisc) / (2 * a);
  const eps = 1e-9;
  if (f1 > eps && f1 <= 1) return f1;
  if (f2 > eps && f2 <= 1) return f2;
  return null;
}

/** 角度位置 (rad, atan2(x, y)) から震源との震央距離 (度) を求める */
function distFromSourceDeg(x: number, y: number, srcAngleRad: number): number {
  const angle = Math.atan2(x, y);
  let diff = angle - srcAngleRad;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) * (180 / Math.PI);
}

/**
 * 1本のレイを波線方程式で追跡する。
 * takeoffAngleRad は射出方向の絶対角(0 = +Y、時計回りに sin/cos で展開)。
 */
export function traceRay(
  profile: EarthProfile,
  source: SeismicSource,
  waveType: WaveType,
  takeoffAngleRad: number,
  options?: Pick<WavefrontOptions, 'maxTimeSec' | 'marchStepKm'>,
): RayTrace {
  const R = profile.earthRadiusKm;
  const maxTime = options?.maxTimeSec ?? DEFAULTS.maxTimeSec;
  const ds = options?.marchStepKm ?? DEFAULTS.marchStepKm;

  const velocityAt = (depthKm: number) =>
    waveType === 'P' ? profile.vpAt(depthKm) : profile.vsAt(depthKm);
  const gradientAt = (depthKm: number) =>
    waveType === 'P' ? profile.vpGradientAt(depthKm) : profile.vsGradientAt(depthKm);

  // 地表ちょうどの震源は半径方向の判定が不安定なため僅かに沈める
  const srcRadius = Math.min(R - Math.max(source.depthKm, 0.5), R - 0.5);
  let x = srcRadius * Math.sin(source.angleRad);
  let y = srcRadius * Math.cos(source.angleRad);
  let dx = Math.sin(takeoffAngleRad);
  let dy = Math.cos(takeoffAngleRad);
  let t = 0;

  const points: RayPoint[] = [{ x, y, tSec: 0 }];

  while (t < maxTime) {
    const r = Math.hypot(x, y);
    const depth = Math.max(R - r, 0);
    const layer = profile.layerAt(depth);
    const v = velocityAt(depth);
    if (v <= 0.01) return { points, exit: 'absorbed' };

    // 速度勾配による屈折(波線方程式)。中点法で評価して p の保存精度を上げる。
    // 中心近傍は r̂ が不定なので直進させる
    if (r > 5) {
      const bend = (px: number, py: number, bx: number, by: number, len: number) => {
        const pr = Math.hypot(px, py);
        if (pr <= 5) return [bx, by] as const;
        const pDepth = Math.max(R - pr, 0);
        const pv = velocityAt(pDepth);
        if (pv <= 0.01) return [bx, by] as const;
        const dvdr = -gradientAt(pDepth); // 深度勾配 → 半径勾配
        const rhx = px / pr;
        const rhy = py / pr;
        const dot = rhx * bx + rhy * by;
        const coeff = (-dvdr / pv) * len;
        const ox = bx + coeff * (rhx - dot * bx);
        const oy = by + coeff * (rhy - dot * by);
        const norm = Math.hypot(ox, oy);
        return [ox / norm, oy / norm] as const;
      };
      // 中点の位置・方向で1ステップ分の曲げを評価する
      const [hdx, hdy] = bend(x, y, dx, dy, ds / 2);
      const midX = x + hdx * (ds / 2);
      const midY = y + hdy * (ds / 2);
      [dx, dy] = bend(midX, midY, dx, dy, ds);
    }

    const nx = x + dx * ds;
    const ny = y + dy * ds;
    const newR = Math.hypot(nx, ny);

    // 地表到達
    if (newR >= R) {
      const f = crossingFraction(x, y, dx, dy, ds, R) ?? 1;
      const ex = x + dx * ds * f;
      const ey = y + dy * ds * f;
      const et = t + (ds * f) / v;
      points.push({ x: ex, y: ey, tSec: et });
      return {
        points,
        exit: 'surface',
        surfacing: { distDeg: distFromSourceDeg(ex, ey, source.angleRad), timeSec: et },
      };
    }

    // 層境界の横断(速度不連続)
    const newLayer = profile.layerAt(Math.max(R - newR, 0));
    if (newLayer.id !== layer.id) {
      const inward = newR < r;
      const boundaryR = inward ? layer.radiusInnerKm : layer.radiusOuterKm;
      const f = crossingFraction(x, y, dx, dy, ds, boundaryR);
      if (f !== null) {
        const bx = x + dx * ds * f;
        const by = y + dy * ds * f;
        t += (ds * f) / v;
        points.push({ x: bx, y: by, tSec: t });

        const boundaryDepth = R - boundaryR;
        const v1 = velocityAt(boundaryDepth + (inward ? -0.01 : 0.01));
        const v2 = velocityAt(boundaryDepth + (inward ? 0.01 : -0.01));
        if (v2 <= 0.01) return { points, exit: 'absorbed' }; // S波が液体外核へ

        // スネルの法則(ベクトル形式)。n は入射側を向く単位法線
        const br = Math.hypot(bx, by);
        let nxv = bx / br;
        let nyv = by / br;
        if (nxv * dx + nyv * dy > 0) {
          nxv = -nxv;
          nyv = -nyv;
        }
        const cos1 = -(nxv * dx + nyv * dy);
        const eta = v2 / v1;
        const k = 1 - eta * eta * (1 - cos1 * cos1);
        if (k < 0) {
          // 全反射
          dx += 2 * cos1 * nxv;
          dy += 2 * cos1 * nyv;
        } else {
          const coeff = eta * cos1 - Math.sqrt(k);
          dx = eta * dx + coeff * nxv;
          dy = eta * dy + coeff * nyv;
        }
        const norm = Math.hypot(dx, dy);
        dx /= norm;
        dy /= norm;
        // 境界の新しい側へ僅かに進めて再分類を確実にする
        x = bx + dx * 0.05;
        y = by + dy * 0.05;
        continue;
      }
    }

    x = nx;
    y = ny;
    t += ds / v;
    points.push({ x, y, tSec: t });
  }

  return { points, exit: 'timeout' };
}

/**
 * CMB(核マントル境界)をかすめる臨界射出角の近傍にレイを追加する。
 * シャドウゾーンの境界付近は射出角に対して震央距離が急伸するため、
 * 一様サンプリングだけでは「境界ぎりぎりまで届くレイ」を取りこぼす。
 */
function criticalExtraTakeoffs(
  profile: EarthProfile,
  source: SeismicSource,
  waveType: WaveType,
): number[] {
  const R = profile.earthRadiusKm;
  const cmb = profile.layers.find((l) => l.state === 'liquid');
  if (!cmb) return [];
  const velocityAt = (d: number) =>
    waveType === 'P' ? profile.vpAt(d) : profile.vsAt(d);
  const vAboveCmb = velocityAt(R - cmb.radiusOuterKm - 0.01);
  if (vAboveCmb <= 0.01) return [];
  const pCrit = cmb.radiusOuterKm / vAboveCmb;

  const srcDepth = Math.max(source.depthKm, 0.5);
  const srcRadius = R - srcDepth;
  const vSrc = velocityAt(srcDepth);
  const sinICrit = (pCrit * vSrc) / srcRadius;
  if (sinICrit >= 1) return [];
  const iCrit = Math.asin(sinICrit);

  // 臨界のわずかに上(かすめて遠くへ届く)とわずかに下(核へ入る)の両側
  const factors = [0.97, 0.99, 0.997, 1.001, 1.003, 1.01, 1.03, 1.1];
  const down = source.angleRad + Math.PI;
  const takeoffs: number[] = [];
  for (const f of factors) {
    const i = iCrit * f;
    if (i > 0 && i < Math.PI / 2) {
      takeoffs.push(down + i, down - i);
    }
  }
  return takeoffs;
}

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

  const takeoffs: number[] = [];
  for (let ray = 0; ray < rayCount; ray++) {
    takeoffs.push((ray / rayCount) * Math.PI * 2);
  }
  takeoffs.push(...criticalExtraTakeoffs(profile, source, waveType));
  const totalRays = takeoffs.length;

  const positions = new Float32Array(stepCount * totalRays * 2).fill(NaN);
  const surfacings: Surfacing[] = [];

  for (let ray = 0; ray < totalRays; ray++) {
    const takeoff = takeoffs[ray];
    const trace = traceRay(profile, source, waveType, takeoff, {
      maxTimeSec,
      marchStepKm,
    });
    if (trace.surfacing) surfacings.push(trace.surfacing);

    // 波線サンプルを出力時刻グリッドへ再サンプリング(線形補間)
    positions[(0 * totalRays + ray) * 2] = srcX;
    positions[(0 * totalRays + ray) * 2 + 1] = srcY;
    let seg = 0;
    const pts = trace.points;
    for (let k = 1; k < stepCount; k++) {
      const tk = k * timeStepSec;
      while (seg < pts.length - 1 && pts[seg + 1].tSec < tk) seg++;
      if (seg >= pts.length - 1) break; // レイ終了(以降 NaN のまま)
      const a = pts[seg];
      const b = pts[seg + 1];
      const span = b.tSec - a.tSec;
      const frac = span > 0 ? (tk - a.tSec) / span : 0;
      positions[(k * totalRays + ray) * 2] = a.x + (b.x - a.x) * frac;
      positions[(k * totalRays + ray) * 2 + 1] = a.y + (b.y - a.y) * frac;
    }
  }

  return {
    waveType,
    rayCount: totalRays,
    timeStepSec,
    stepCount,
    maxTimeSec,
    positionsKm: positions,
    sourceKm: [srcX, srcY],
    surfacings,
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

// ---------------------------------------------------------------------------
// 観測点の走時とシャドウゾーン(観測データからの推論を可視化する基盤)
// ---------------------------------------------------------------------------

export interface ObserverArrival {
  /** 観測点の震央距離 (度) */
  distDeg: number;
  /** P波初動到達時刻 (秒)。届かなければ null */
  pArrivalSec: number | null;
  /** S波初動到達時刻 (秒)。届かなければ null(シャドウゾーン) */
  sArrivalSec: number | null;
}

/**
 * 各観測点(震央距離)の P/S 初動到達時刻を surfacings から抽出する。
 * 観測点の許容幅内に到達したレイの最早時刻を初動とみなす。
 */
export function computeArrivals(
  tableP: WavefrontTable,
  tableS: WavefrontTable,
  observerDistsDeg: number[],
  toleranceDeg = 4,
): ObserverArrival[] {
  const firstArrival = (surfacings: Surfacing[], distDeg: number): number | null => {
    let best: number | null = null;
    for (const s of surfacings) {
      if (Math.abs(s.distDeg - distDeg) <= toleranceDeg) {
        if (best === null || s.timeSec < best) best = s.timeSec;
      }
    }
    return best;
  };
  return observerDistsDeg.map((distDeg) => ({
    distDeg,
    pArrivalSec: firstArrival(tableP.surfacings, distDeg),
    sArrivalSec: firstArrival(tableS.surfacings, distDeg),
  }));
}

export interface ShadowZones {
  /** S波が届く最大震央距離 (度)。これ以遠が S波シャドウ */
  sShadowStartDeg: number | null;
  /** P波シャドウ帯 [開始, 終了] (度)。検出できなければ null */
  pShadow: [number, number] | null;
}

/**
 * surfacings からシャドウゾーンを検出する。
 * S: 到達した最大震央距離より先がシャドウ。
 * P: 震央距離の被覆に生じる最大の隙間(直接波と核通過波の間)。
 */
export function findShadowZones(
  tableP: WavefrontTable,
  tableS: WavefrontTable,
  minGapDeg = 10,
): ShadowZones {
  const sDists = tableS.surfacings.map((s) => s.distDeg);
  const sShadowStartDeg = sDists.length > 0 ? Math.max(...sDists) : null;

  const pDists = tableP.surfacings
    .map((s) => s.distDeg)
    .filter((d) => d > 5)
    .sort((a, b) => a - b);
  let pShadow: [number, number] | null = null;
  for (let i = 1; i < pDists.length; i++) {
    const gap = pDists[i] - pDists[i - 1];
    const start = pDists[i - 1];
    if (gap >= minGapDeg && start > 40 && start < 170) {
      if (!pShadow || gap > pShadow[1] - pShadow[0]) {
        pShadow = [pDists[i - 1], pDists[i]];
      }
    }
  }
  return { sShadowStartDeg, pShadow };
}
