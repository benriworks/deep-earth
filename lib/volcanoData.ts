import type { VolcanoFeature } from '@/types/volcano';

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
    activity: {
      heat: 0.25,
      pressure: 0.2,
      gas: 0.25,
      eruption: 0,
    },
  },
];
