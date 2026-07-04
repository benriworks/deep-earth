import { EARTH_RADIUS_KM } from '@/lib/earthData';

/** カット面からの浮かせ量(キャップとの z-fighting 回避) */
export const PLANE_OFFSET = 0.004;

/**
 * 断面 2D 座標 (km) をカット面上の 3D シーン座標へ変換する。
 * quarter は z=0 キャップ面、half は x=0 キャップ面に描く。
 * (SeismicWaves / Observers / ShadowArcs で共有する規約)
 */
export function to3D(
  xKm: number,
  yKm: number,
  cutMode: 'half' | 'quarter',
  offset: number = PLANE_OFFSET,
): [number, number, number] {
  const x = xKm / EARTH_RADIUS_KM;
  const y = yKm / EARTH_RADIUS_KM;
  if (cutMode === 'quarter') return [x, y, offset]; // z=0 面
  return [offset, y, x]; // x=0 面
}
