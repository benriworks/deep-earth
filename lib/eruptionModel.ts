export type EruptionInput = {
  mantleUpwelling: number;
  mantleTemperature: number;
  crustStress: number;
  magmaPressure: number;
  gas: number;
  threshold: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const smoothstep01 = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

export function computeEruptionIntensity(input: EruptionInput): number {
  const source =
    clamp01(input.mantleUpwelling) * 0.32 +
    clamp01(input.mantleTemperature) * 0.26 +
    clamp01(input.magmaPressure) * 0.22 +
    clamp01(input.gas) * 0.12 +
    clamp01(input.crustStress) * 0.08;

  const threshold = clamp01(input.threshold);
  return smoothstep01((source - threshold) / 0.25);
}
