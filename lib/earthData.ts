import type { EarthLayer, EarthProfile, LayerId } from '@/types/earth';

export const EARTH_RADIUS_KM = 6371;

/**
 * PREM (Preliminary Reference Earth Model) 近似の層データ。
 * 各物性値は層境界での代表値であり、層内は線形補間で近似する。
 * 教育用の簡略化であり、実際の PREM は深度の多項式で定義される(UI 上で注記すること)。
 * 地表から中心への順で並べる。
 */
export const EARTH_LAYERS: readonly EarthLayer[] = [
  {
    id: 'crust',
    nameJa: '地殻',
    nameEn: 'Crust',
    radiusOuterKm: 6371,
    radiusInnerKm: 6336,
    depthTopKm: 0,
    depthBottomKm: 35,
    state: 'solid',
    color: '#8a7a63',
    densityGCm3: [2.6, 2.9],
    tempK: [288, 900],
    vpKmS: [5.8, 7.0],
    vsKmS: [3.4, 3.9],
  },
  {
    id: 'upperMantle',
    nameJa: '上部マントル',
    nameEn: 'Upper Mantle',
    radiusOuterKm: 6336,
    radiusInnerKm: 5961,
    depthTopKm: 35,
    depthBottomKm: 410,
    state: 'solid',
    color: '#e2703a',
    densityGCm3: [3.38, 3.54],
    tempK: [900, 1750],
    vpKmS: [8.1, 9.0],
    vsKmS: [4.5, 4.9],
  },
  {
    id: 'transitionZone',
    nameJa: 'マントル遷移層',
    nameEn: 'Transition Zone',
    radiusOuterKm: 5961,
    radiusInnerKm: 5711,
    depthTopKm: 410,
    depthBottomKm: 660,
    state: 'solid',
    color: '#d95d39',
    densityGCm3: [3.72, 3.99],
    tempK: [1750, 1900],
    vpKmS: [9.1, 10.3],
    vsKmS: [4.9, 5.6],
  },
  {
    id: 'lowerMantle',
    nameJa: '下部マントル',
    nameEn: 'Lower Mantle',
    radiusOuterKm: 5711,
    radiusInnerKm: 3480,
    depthTopKm: 660,
    depthBottomKm: 2891,
    state: 'solid',
    color: '#c23b22',
    densityGCm3: [4.38, 5.57],
    tempK: [1900, 3700],
    vpKmS: [10.7, 13.7],
    vsKmS: [5.9, 7.3],
  },
  {
    id: 'outerCore',
    nameJa: '外核',
    nameEn: 'Outer Core',
    radiusOuterKm: 3480,
    radiusInnerKm: 1221,
    depthTopKm: 2891,
    depthBottomKm: 5150,
    state: 'liquid',
    color: '#f2a541',
    densityGCm3: [9.9, 12.17],
    tempK: [3700, 5300],
    vpKmS: [8.06, 10.36],
    vsKmS: [0, 0],
  },
  {
    id: 'innerCore',
    nameJa: '内核',
    nameEn: 'Inner Core',
    radiusOuterKm: 1221,
    radiusInnerKm: 0,
    depthTopKm: 5150,
    depthBottomKm: 6371,
    state: 'solid',
    color: '#f9d276',
    densityGCm3: [12.76, 13.09],
    tempK: [5300, 5800],
    vpKmS: [11.03, 11.26],
    vsKmS: [3.5, 3.67],
  },
];

const LAYER_BY_ID = new Map<LayerId, EarthLayer>(EARTH_LAYERS.map((l) => [l.id, l]));

export function getLayer(id: LayerId): EarthLayer {
  const layer = LAYER_BY_ID.get(id);
  if (!layer) throw new Error(`unknown layer id: ${id}`);
  return layer;
}

function clampDepth(depthKm: number): number {
  return Math.min(Math.max(depthKm, 0), EARTH_RADIUS_KM);
}

function layerAt(depthKm: number): EarthLayer {
  const d = clampDepth(depthKm);
  // 境界深度ちょうどは深い側の層に属させる(depthTop < d <= depthBottom)。d=0 のみ地殻
  const found = EARTH_LAYERS.find((l) => d <= l.depthBottomKm);
  return found ?? EARTH_LAYERS[EARTH_LAYERS.length - 1];
}

/** 層内の [上端値, 下端値] を深度で線形補間する */
function interpolate(depthKm: number, pick: (l: EarthLayer) => [number, number]): number {
  const d = clampDepth(depthKm);
  const layer = layerAt(d);
  const [top, bottom] = pick(layer);
  const span = layer.depthBottomKm - layer.depthTopKm;
  if (span <= 0) return top;
  const t = (d - layer.depthTopKm) / span;
  return top + (bottom - top) * t;
}

/** 深度に対する勾配 (値/km)。層内線形なので層ごとに一定 */
function gradient(depthKm: number, pick: (l: EarthLayer) => [number, number]): number {
  const layer = layerAt(clampDepth(depthKm));
  const [top, bottom] = pick(layer);
  const span = layer.depthBottomKm - layer.depthTopKm;
  return span > 0 ? (bottom - top) / span : 0;
}

export const earthProfile: EarthProfile = {
  earthRadiusKm: EARTH_RADIUS_KM,
  layers: EARTH_LAYERS,
  vpAt: (d) => interpolate(d, (l) => l.vpKmS),
  vsAt: (d) => interpolate(d, (l) => l.vsKmS),
  vpGradientAt: (d) => gradient(d, (l) => l.vpKmS),
  vsGradientAt: (d) => gradient(d, (l) => l.vsKmS),
  densityAt: (d) => interpolate(d, (l) => l.densityGCm3),
  tempAt: (d) => interpolate(d, (l) => l.tempK),
  layerAt,
};

/** 半径 (km) → 深度 (km) */
export function radiusToDepth(radiusKm: number): number {
  return EARTH_RADIUS_KM - radiusKm;
}

/** 3D シーンでは地球半径を 1 に正規化する */
export function toSceneRadius(radiusKm: number): number {
  return radiusKm / EARTH_RADIUS_KM;
}
