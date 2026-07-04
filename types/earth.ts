export type LayerId =
  | 'crust'
  | 'upperMantle'
  | 'transitionZone'
  | 'lowerMantle'
  | 'outerCore'
  | 'innerCore';

export type LayerState = 'solid' | 'liquid';

/**
 * 地球内部の1つの層の離散メタデータ。
 * 単位: 距離 = km、密度 = g/cm³、温度 = K、速度 = km/s。
 * 物性値のタプルは [層の上端(浅い側), 層の下端(深い側)] の代表値。
 */
export interface EarthLayer {
  id: LayerId;
  nameJa: string;
  nameEn: string;
  /** 地球中心からの外側半径 (km) */
  radiusOuterKm: number;
  /** 地球中心からの内側半径 (km) */
  radiusInnerKm: number;
  /** 地表からの上端深度 (km) */
  depthTopKm: number;
  /** 地表からの下端深度 (km) */
  depthBottomKm: number;
  /** 固体/液体。S波は液体を伝播しない */
  state: LayerState;
  /** 表示色 (hex) */
  color: string;
  densityGCm3: [number, number];
  tempK: [number, number];
  vpKmS: [number, number];
  /** 液体層は [0, 0] */
  vsKmS: [number, number];
}

/**
 * 深度に対する連続プロファイル。
 * PREM の多項式を層内線形補間で近似したもの(FR-012 の注記対象)。
 */
export interface EarthProfile {
  earthRadiusKm: number;
  layers: readonly EarthLayer[];
  /** P波速度 (km/s) */
  vpAt(depthKm: number): number;
  /** S波速度 (km/s)。液体層では 0 */
  vsAt(depthKm: number): number;
  /** P波速度の深度勾配 (km/s / km)。層内線形補間なので層ごとに一定 */
  vpGradientAt(depthKm: number): number;
  /** S波速度の深度勾配 (km/s / km) */
  vsGradientAt(depthKm: number): number;
  densityAt(depthKm: number): number;
  tempAt(depthKm: number): number;
  layerAt(depthKm: number): EarthLayer;
}
