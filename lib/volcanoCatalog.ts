import { demoVolcanoes } from '@/lib/volcanoData';
import { realVolcanoes } from '@/lib/realVolcanoes';
import type { VolcanoFeature, VolcanoType } from '@/types/volcano';

const VALID_TYPES: VolcanoType[] = [
  'stratovolcano',
  'shield',
  'cinder_cone',
  'caldera',
  'submarine',
];

const ID_PATTERN = /^volcano-[a-z0-9-]+$/;

/**
 * VolcanoFeature が満たすべきルールを検証し、違反メッセージの配列を返す。
 * 違反がなければ空配列を返す。
 */
export function validateVolcanoFeature(v: VolcanoFeature): string[] {
  const errors: string[] = [];

  if (!ID_PATTERN.test(v.id)) {
    errors.push(`id "${v.id}" は /^volcano-[a-z0-9-]+$/ に一致しません`);
  }

  if (!VALID_TYPES.includes(v.type)) {
    errors.push(`type "${v.type}" は有効な火山タイプではありません`);
  }

  if (!(v.lat >= -90 && v.lat <= 90)) {
    errors.push(`lat ${v.lat} は [-90, 90] の範囲外です`);
  }

  if (!(v.lon >= -180 && v.lon <= 180)) {
    errors.push(`lon ${v.lon} は [-180, 180] の範囲外です`);
  }

  if (!(v.heightKm >= -6 && v.heightKm <= 9)) {
    errors.push(`heightKm ${v.heightKm} は [-6, 9] の範囲外です`);
  }

  if (!(v.baseRadiusKm > 0 && v.baseRadiusKm <= 120)) {
    errors.push(`baseRadiusKm ${v.baseRadiusKm} は (0, 120] の範囲外です`);
  }

  if (!(v.craterRadiusKm >= 0 && v.craterRadiusKm < v.baseRadiusKm)) {
    errors.push(
      `craterRadiusKm ${v.craterRadiusKm} は [0, baseRadiusKm=${v.baseRadiusKm}) の範囲外です`,
    );
  }

  if (!(v.mantleSampleDepthKm > 0 && v.mantleSampleDepthKm <= 700)) {
    errors.push(`mantleSampleDepthKm ${v.mantleSampleDepthKm} は (0, 700] の範囲外です`);
  }

  if (!(v.eruptionThreshold >= 0 && v.eruptionThreshold <= 1)) {
    errors.push(`eruptionThreshold ${v.eruptionThreshold} は [0, 1] の範囲外です`);
  }

  if (v.mantleThetaDeg !== undefined && !(v.mantleThetaDeg >= 0 && v.mantleThetaDeg <= 360)) {
    errors.push(`mantleThetaDeg ${v.mantleThetaDeg} は [0, 360] の範囲外です`);
  }

  const { heat, pressure, gas, eruption } = v.activity;
  if (!(heat >= 0 && heat <= 1)) {
    errors.push(`activity.heat ${heat} は [0, 1] の範囲外です`);
  }
  if (!(pressure >= 0 && pressure <= 1)) {
    errors.push(`activity.pressure ${pressure} は [0, 1] の範囲外です`);
  }
  if (!(gas >= 0 && gas <= 1)) {
    errors.push(`activity.gas ${gas} は [0, 1] の範囲外です`);
  }
  if (!(eruption >= 0 && eruption <= 1)) {
    errors.push(`activity.eruption ${eruption} は [0, 1] の範囲外です`);
  }

  return errors;
}

/**
 * demoVolcanoes と realVolcanoes を連結し、検証を通過したものだけを返す。
 * 違反があるデータは console.warn で理由を出力して除外する(fail-soft)。
 * id が重複する場合も警告のうえ、後から現れたものを除外する(先勝ち)。
 */
export function loadVolcanoes(): VolcanoFeature[] {
  const all = [...demoVolcanoes, ...realVolcanoes];
  const seenIds = new Set<string>();
  const result: VolcanoFeature[] = [];

  for (const volcano of all) {
    const errors = validateVolcanoFeature(volcano);
    if (errors.length > 0) {
      console.warn(
        `[volcanoCatalog] volcano "${volcano.id}" is invalid and was excluded:`,
        errors,
      );
      continue;
    }

    if (seenIds.has(volcano.id)) {
      console.warn(
        `[volcanoCatalog] duplicate volcano id "${volcano.id}" was excluded (first occurrence kept)`,
      );
      continue;
    }

    seenIds.add(volcano.id);
    result.push(volcano);
  }

  return result;
}
