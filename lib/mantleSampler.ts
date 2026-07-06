import { convectionVelocity } from '@/lib/convection';
import { EARTH_RADIUS_KM, toSceneRadius } from '@/lib/earthData';
import type { VolcanoFeature } from '@/types/volcano';

export type MantleSample = {
  upwelling: number;
  temperature: number;
  tangentialFlow: number;
  rawVr: number;
  rawVtheta: number;
  thetaRad: number;
  radiusScene: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const clampSigned = (value: number) => Math.min(1, Math.max(-1, value));

export function sampleMantleForVolcano(volcano: VolcanoFeature): MantleSample {
  const depthKm = Math.min(Math.max(volcano.mantleSampleDepthKm, 0), EARTH_RADIUS_KM);
  const radiusKm = EARTH_RADIUS_KM - depthKm;
  const radiusScene = toSceneRadius(radiusKm);

  // Phase C MVP: 既存 convection.ts は2D極座標なので、lon または mantleThetaDeg を demo theta として使う。
  const thetaDeg = volcano.mantleThetaDeg ?? volcano.lon;
  const thetaRad = (thetaDeg * Math.PI) / 180;

  const [rawVr, rawVtheta] = convectionVelocity(radiusScene, thetaRad);

  // MantleConvection.tsx の色付けと同系統のスケール。vr > 0 を上昇流として扱う。
  const upwelling = clamp01(rawVr * 40 + 0.5);
  const temperature = clamp01(rawVr * 34 + volcano.activity.heat);
  const tangentialFlow = clampSigned(rawVtheta * 20);

  return {
    upwelling,
    temperature,
    tangentialFlow,
    rawVr,
    rawVtheta,
    thetaRad,
    radiusScene,
  };
}
