import type { VolcanoFeature, VolcanoType } from '@/types/volcano';

const STRATO_LODS = {
  low: '/models/volcano/volcano_stratovolcano_low.glb',
  mid: '/models/volcano/volcano_stratovolcano_mid.glb',
  high: '/models/volcano/volcano_stratovolcano_high.glb',
};

const SHIELD_LODS = {
  low: '/models/volcano/volcano_shield_low.glb',
  mid: '/models/volcano/volcano_shield_mid.glb',
  high: '/models/volcano/volcano_shield_mid.glb', // shield は mid を最高品質として使う
};

const CINDER_LODS = {
  low: '/models/volcano/volcano_cinder_cone_low.glb',
  mid: '/models/volcano/volcano_cinder_cone_mid.glb',
  high: '/models/volcano/volcano_cinder_cone_mid.glb',
};

const CALDERA_LODS = {
  low: '/models/volcano/volcano_caldera_low.glb',
  mid: '/models/volcano/volcano_caldera_mid.glb',
  high: '/models/volcano/volcano_caldera_mid.glb',
};

/**
 * タイプ → GLB のマッピング。調査データ(realVolcanoes)は modelUrl/lodUrls を
 * 持たなくてよく、type からここで解決する。submarine は成層火山モデルを
 * 寒色 tint で流用する(専用モデルなし)。
 */
export function modelForType(type: VolcanoType): {
  modelUrl: string;
  lodUrls: { low: string; mid: string; high: string };
} {
  switch (type) {
    case 'shield':
      return { modelUrl: SHIELD_LODS.mid, lodUrls: SHIELD_LODS };
    case 'cinder_cone':
      return { modelUrl: CINDER_LODS.mid, lodUrls: CINDER_LODS };
    case 'caldera':
      return { modelUrl: CALDERA_LODS.mid, lodUrls: CALDERA_LODS };
    case 'submarine':
    case 'stratovolcano':
    default:
      return { modelUrl: '/models/volcano/volcano_v001.glb', lodUrls: STRATO_LODS };
  }
}

/** submarine の寒色 tint(海中の玄武岩) */
export const SUBMARINE_TINT = '#5f7f96';

/**
 * デモ火山。mantleThetaDeg は断面マントル対流(2D、セル対5)のどこを読むかの
 * デモ用パラメータで、上昇流域(θ=36〜72°等)に置いた火山は活動的になり、
 * 下降流域に置いた火山は静穏になる(教育用の簡略化)。
 */
export const demoVolcanoes: VolcanoFeature[] = [
  {
    id: 'volcano-demo-001',
    name: 'Demo Stratovolcano',
    type: 'stratovolcano',
    lat: 32.0,
    lon: 140.0,
    heightKm: 3.2,
    baseRadiusKm: 18,
    craterRadiusKm: 1.2,
    mantleSampleDepthKm: 80,
    eruptionThreshold: 0.58,
    mantleThetaDeg: 140,
    modelUrl: '/models/volcano/volcano_v001.glb',
    lodUrls: STRATO_LODS,
    activity: {
      heat: 0.25,
      pressure: 0.2,
      gas: 0.25,
      eruption: 0,
    },
  },
  {
    id: 'volcano-demo-002',
    name: 'Demo Shield Volcano',
    type: 'shield',
    lat: -8.0,
    lon: 115.0,
    heightKm: 1.8,
    baseRadiusKm: 45,
    craterRadiusKm: 2.4,
    mantleSampleDepthKm: 120,
    eruptionThreshold: 0.5,
    mantleThetaDeg: 54, // 上昇流の中心付近 → 活動的
    modelUrl: '/models/volcano/volcano_shield_mid.glb',
    lodUrls: SHIELD_LODS,
    activity: {
      heat: 0.35,
      pressure: 0.3,
      gas: 0.2,
      eruption: 0,
    },
  },
  {
    id: 'volcano-demo-003',
    name: 'Demo Dormant Stratovolcano',
    type: 'stratovolcano',
    lat: 46.0,
    lon: -122.0,
    heightKm: 2.6,
    baseRadiusKm: 14,
    craterRadiusKm: 0.9,
    mantleSampleDepthKm: 80,
    eruptionThreshold: 0.62,
    mantleThetaDeg: 100, // 下降流域 → 静穏
    modelUrl: '/models/volcano/volcano_v001.glb',
    lodUrls: STRATO_LODS,
    activity: {
      heat: 0.12,
      pressure: 0.1,
      gas: 0.1,
      eruption: 0,
    },
  },
  {
    id: 'volcano-demo-004',
    name: 'Demo Cinder Cone',
    type: 'cinder_cone',
    lat: 19.5,
    lon: -102.25,
    heightKm: 0.4,
    baseRadiusKm: 2.0,
    craterRadiusKm: 0.25,
    mantleSampleDepthKm: 60,
    eruptionThreshold: 0.55,
    mantleThetaDeg: 60, // 上昇流寄り → やや活動的
    ...modelForType('cinder_cone'),
    activity: {
      heat: 0.3,
      pressure: 0.25,
      gas: 0.3,
      eruption: 0,
    },
  },
  {
    id: 'volcano-demo-005',
    name: 'Demo Caldera',
    type: 'caldera',
    lat: 44.4,
    lon: -110.6,
    heightKm: 0.8,
    baseRadiusKm: 30,
    craterRadiusKm: 12,
    mantleSampleDepthKm: 120,
    eruptionThreshold: 0.68,
    mantleThetaDeg: 126, // ホットスポット(上昇流中心)だが閾値が高く通常は静穏
    ...modelForType('caldera'),
    activity: {
      heat: 0.4,
      pressure: 0.2,
      gas: 0.35,
      eruption: 0,
    },
  },
];
