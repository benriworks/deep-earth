'use client';

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '@/lib/earthData';
import { computeEruptionIntensity } from '@/lib/eruptionModel';
import { sampleMantleForVolcano } from '@/lib/mantleSampler';
import { loadVolcanoes } from '@/lib/volcanoCatalog';
import { SUBMARINE_TINT } from '@/lib/volcanoData';
import { useLayerStore } from '@/stores/useLayerStore';
import { useVolcanoStore } from '@/stores/useVolcanoStore';
import type { VolcanoFeature, VolcanoVisualState } from '@/types/volcano';
import { EruptionParticles } from './EruptionParticles';
import { VolcanoFallback } from './VolcanoFallback';
import { VolcanoModel } from './VolcanoModel';

const UP = new THREE.Vector3(0, 1, 0);
const volcanoes = loadVolcanoes();

function latLonToUnitVector(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ).normalize();
}

function useVolcanoTransform(
  volcano: VolcanoFeature,
  heightExaggeration: number,
  radiusExaggeration: number,
) {
  return useMemo(() => {
    const normal = latLonToUnitVector(volcano.lat, volcano.lon);
    // 高さと広がりの誇張率は独立(既定: 高さ×14・広がり×4.5)。×1 = 実スケール
    const height = (Math.abs(volcano.heightKm) / EARTH_RADIUS_KM) * heightExaggeration;
    const radius = (volcano.baseRadiusKm / EARTH_RADIUS_KM) * radiusExaggeration;
    // submarine は海上に飛び出さないよう押し出しなし(deep-reasoner 指摘の既知問題)
    const surfaceScale = volcano.type === 'submarine' ? 1.0 : 1 + height * 0.03;
    const position = normal.clone().multiplyScalar(surfaceScale);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal);
    return { height, radius, position, quaternion };
  }, [volcano, heightExaggeration, radiusExaggeration]);
}

function VolcanoInstance({ volcano }: { volcano: VolcanoFeature }) {
  // スライダー操作は離散イベントなので reactive 購読でよい(毎フレーム値ではない)
  const heightExaggeration = useVolcanoStore((s) => s.heightExaggeration);
  const radiusExaggeration = useVolcanoStore((s) => s.radiusExaggeration);
  const transform = useVolcanoTransform(volcano, heightExaggeration, radiusExaggeration);
  const visualRef = useRef<VolcanoVisualState>({
    eruptionIntensity: volcano.activity.eruption,
    heat: volcano.activity.heat,
    pressure: volcano.activity.pressure,
    gas: volcano.activity.gas,
  });

  // debug override(パネルのスライダー)> マントル連動の計算値と activity.eruption の大きい方。
  // sampleMantleForVolcano で断面マントル対流(2D)の上昇流・温度を火山位置で読み取り、
  // computeEruptionIntensity で噴火強度に変換する(教育用の簡略化)。
  useFrame((_, delta) => {
    const debugIntensity = useVolcanoStore.getState().volcanoDebugIntensity;
    const sample = sampleMantleForVolcano(volcano);
    const computed = computeEruptionIntensity({
      mantleUpwelling: sample.upwelling,
      mantleTemperature: sample.temperature,
      crustStress: 0.35,
      magmaPressure: volcano.activity.pressure,
      gas: volcano.activity.gas,
      threshold: volcano.eruptionThreshold,
    });
    const target = debugIntensity ?? Math.max(volcano.activity.eruption, computed);
    visualRef.current.eruptionIntensity = THREE.MathUtils.damp(
      visualRef.current.eruptionIntensity,
      target,
      1.8,
      delta,
    );
  });

  return (
    <group position={transform.position} quaternion={transform.quaternion}>
      <Suspense
        fallback={
          <VolcanoFallback
            visualRef={visualRef}
            height={transform.height}
            radius={transform.radius}
          />
        }
      >
        {volcano.modelUrl ? (
          <VolcanoModel
            url={volcano.modelUrl}
            lodUrls={volcano.lodUrls}
            visualRef={visualRef}
            height={transform.height}
            radius={transform.radius}
            tint={volcano.type === 'submarine' ? SUBMARINE_TINT : undefined}
          />
        ) : (
          <VolcanoFallback
            visualRef={visualRef}
            height={transform.height}
            radius={transform.radius}
          />
        )}
      </Suspense>
      <EruptionParticles
        visualRef={visualRef}
        height={transform.height}
        radius={transform.radius}
      />
    </group>
  );
}

export function VolcanoLayer() {
  const showVolcanoes = useLayerStore((s) => s.showVolcanoes);
  if (!showVolcanoes) return null;

  return (
    <group name="VolcanoLayer">
      {volcanoes.map((volcano) => (
        <VolcanoInstance key={volcano.id} volcano={volcano} />
      ))}
    </group>
  );
}
