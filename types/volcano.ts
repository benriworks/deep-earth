export type VolcanoType =
  | 'stratovolcano'
  | 'shield'
  | 'cinder_cone'
  | 'caldera'
  | 'submarine';

export type VolcanoActivity = {
  /** 熱源の強さ。0..1 */
  heat: number;
  /** マグマ圧。0..1 */
  pressure: number;
  /** 揮発性ガス量。0..1 */
  gas: number;
  /** 手動または前回計算された噴火強度。0..1 */
  eruption: number;
};

export type VolcanoFeature = {
  id: string;
  name: string;
  type: VolcanoType;
  lat: number;
  lon: number;
  heightKm: number;
  baseRadiusKm: number;
  craterRadiusKm: number;
  mantleSampleDepthKm: number;
  eruptionThreshold: number;
  /** 既存 convection.ts は2D断面モデルなので、Phase C のデモ連動用に明示指定できる */
  mantleThetaDeg?: number;
  activity: VolcanoActivity;
  modelUrl?: string;
  /** LOD 用 GLB。指定時はカメラ距離で low/mid/high を切り替える(Phase D) */
  lodUrls?: {
    low: string;
    mid: string;
    high: string;
  };
};

export type VolcanoVisualState = {
  eruptionIntensity: number;
  heat: number;
  pressure: number;
  gas: number;
};
