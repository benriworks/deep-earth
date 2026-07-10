import type { MultiPolygon, Ring } from '@/lib/topojsonLite';

/**
 * 陸・海テクスチャの生成。
 *
 * 座標整合(deep-reasoner 導出、二重反転に注意):
 * three の SphereGeometry UV と latLonToUnitVector(x=cos·sin, y=sin, z=cos·cos)を
 * 連立すると、equirectangular canvas への描画式は
 *   x_px = mod(lon + 90, 360) / 360 * W
 *   y_px = (lat + 90) / 180 * H   (lat=+90 が canvas 下端)
 * となり、テクスチャ側は flipY=false で貼る(呼び出し側の責務)。
 */

export const LAND_TEXTURE_COLORS = {
  ocean: '#16324f',
  land: '#8a7a63', // 現行の地殻色。map 使用時は material.color を白にする
};

/** roughnessMap 用の値(白=粗い)。海はなめらか=光沢、陸はマット */
export const ROUGHNESS_COLORS = {
  ocean: '#595959', // roughness ≈ 0.35
  land: '#f2f2f2', // roughness ≈ 0.95
};

/**
 * シード付きの決定論的な値ノイズ(0..1)。格子点ハッシュ + スムーズ補間。
 * テクスチャの色むら用(依存追加なし・テスト可能)。
 */
export function valueNoise2D(x: number, y: number, seed = 1): number {
  const hash = (ix: number, iy: number): number => {
    let h = (ix * 374761393 + iy * 668265263 + seed * 144269) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967295;
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = hash(ix, iy) + (hash(ix + 1, iy) - hash(ix, iy)) * sx;
  const bottom = hash(ix, iy + 1) + (hash(ix + 1, iy + 1) - hash(ix, iy + 1)) * sx;
  return top + (bottom - top) * sy;
}

/**
 * 描画済みのカラーマップに 2 オクターブの明度むらを乗せる(陸 ±8%、海 ±5%)。
 * 陸/海の判定は R チャンネルのしきい値(land #8a=138 / ocean #16=22)。
 */
export function applyTerrainNoise(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const isLand = data[i] > 80;
      const n =
        0.65 * valueNoise2D(x / 48, y / 48, 7) + 0.35 * valueNoise2D(x / 12, y / 12, 13);
      const amp = isLand ? 0.16 : 0.1; // ±8% / ±5%
      const factor = 1 + amp * (n - 0.5);
      data[i] = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
  }
  ctx.putImageData(image, 0, 0);
}

/** 経緯度 → canvas ピクセル座標 */
export function projectToPixel(
  lonDeg: number,
  latDeg: number,
  width: number,
  height: number,
): [number, number] {
  const wrapped = ((((lonDeg + 90) % 360) + 360) % 360) / 360;
  const x = wrapped * width;
  const y = ((latDeg + 90) / 180) * height;
  return [x, y];
}

/**
 * リングの経度を連続化する(±180 跨ぎで canvas 上を飛ばないように、
 * 隣接点との差が 180 を超えたら ±360 補正)。
 */
function unwrapRing(ring: Ring): Ring {
  const out: Ring = [];
  let prevLon = ring[0]?.[0] ?? 0;
  let offset = 0;
  for (const [lon, lat] of ring) {
    let adjusted = lon + offset;
    while (adjusted - prevLon > 180) {
      offset -= 360;
      adjusted -= 360;
    }
    while (adjusted - prevLon < -180) {
      offset += 360;
      adjusted += 360;
    }
    out.push([adjusted, lat]);
    prevLon = adjusted;
  }
  return out;
}

interface DrawOptions {
  width: number;
  height: number;
  oceanColor?: string;
  landColor?: string;
}

/** 2D コンテキストに海を塗り、陸の MultiPolygon を描画する(継ぎ目は3重描画で吸収) */
export function drawLandMask(
  ctx: CanvasRenderingContext2D,
  land: MultiPolygon,
  options: DrawOptions,
): void {
  const { width, height } = options;
  const ocean = options.oceanColor ?? LAND_TEXTURE_COLORS.ocean;
  const landColor = options.landColor ?? LAND_TEXTURE_COLORS.land;

  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = landColor;
  for (const polygon of land) {
    const path = new Path2D();
    for (const ring of polygon) {
      const unwrapped = unwrapRing(ring);
      unwrapped.forEach(([lon, lat], i) => {
        // unwrap を保持するため x は mod なしで直接計算(projectToPixel と同式の非 wrap 版)
        const x = ((lon + 90) / 360) * width;
        const y = ((lat + 90) / 180) * height;
        if (i === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
      path.closePath();
    }
    // 継ぎ目(x=0/W)を跨ぐポリゴンは ±W ずらした複製で覆う
    for (const shift of [-width, 0, width]) {
      ctx.save();
      ctx.translate(shift, 0);
      ctx.fill(path, 'evenodd');
      ctx.restore();
    }
  }
}

/** 点が陸に含まれるか(偶奇判定。テスト・データ検証用) */
export function pointInLand(land: MultiPolygon, lonDeg: number, latDeg: number): boolean {
  let inside = false;
  for (const polygon of land) {
    for (const ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        const intersects =
          yi > latDeg !== yj > latDeg &&
          lonDeg < ((xj - xi) * (latDeg - yi)) / (yj - yi) + xi;
        if (intersects) inside = !inside;
      }
    }
  }
  return inside;
}
