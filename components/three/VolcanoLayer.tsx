'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '@/lib/earthData';
import { demoVolcanoes } from '@/lib/volcanoData';
import { useLayerStore } from '@/stores/useLayerStore';
import type { VolcanoFeature, VolcanoVisualState } from '@/types/volcano';
import { VolcanoFallback } from './VolcanoFallback';

const UP = new THREE.Vector3(0, 1, 0);
const VISUAL_EXAGGERATION = 14;

function latLonToUnitVector(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ).normalize();
}

function useVolcanoTransform(volcano: VolcanoFeature) {
  return useMemo(() => {
    const normal = latLonToUnitVector(volcano.lat, volcano.lon);
    const height = (volcano.heightKm / EARTH_RADIUS_KM) * VISUAL_EXAGGERATION;
    const radius = (volcano.baseRadiusKm / EARTH_RADIUS_KM) * VISUAL_EXAGGERATION;
    const position = normal.clone().multiplyScalar(1 + height * 0.03);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal);
    return { height, radius, position, quaternion };
  }, [volcano]);
}

function VolcanoInstance({ volcano }: { volcano: VolcanoFeature }) {
  const transform = useVolcanoTransform(volcano);
  const visualRef = useRef<VolcanoVisualState>({
    eruptionIntensity: volcano.activity.eruption,
    heat: volcano.activity.heat,
    pressure: volcano.activity.pressure,
    gas: volcano.activity.gas,
  });

  // PR-1 の簡易版: マントル連動・噴火モデルは未実装のため、
  // activity.eruption へ damp するだけ。PR-3/PR-4 で computeEruptionIntensity /
  // sampleMantleForVolcano を使った本実装に差し替える。
  useFrame((_, delta) => {
    visualRef.current.eruptionIntensity = THREE.MathUtils.damp(
      visualRef.current.eruptionIntensity,
      volcano.activity.eruption,
      1.8,
      delta,
    );
  });

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <VolcanoFallback visualRef={visualRef} height={transform.height} radius={transform.radius} />
    </group>
  );
}

export function VolcanoLayer() {
  const showVolcanoes = useLayerStore((s) => s.showVolcanoes);
  if (!showVolcanoes) return null;

  return (
    <group name="VolcanoLayer">
      {demoVolcanoes.map((volcano) => (
        <VolcanoInstance key={volcano.id} volcano={volcano} />
      ))}
    </group>
  );
}
