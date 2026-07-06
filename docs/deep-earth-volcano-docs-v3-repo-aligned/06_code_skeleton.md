# 06. 実装開始用コード骨子 / v3 repository aligned

このファイルは、`deep-earth` の実リポジトリ構成に合わせたコード骨子である。必要な順にコピーし、PRごとに小さく導入する。

## 1. `types/volcano.ts`

```ts
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
};

export type VolcanoVisualState = {
  eruptionIntensity: number;
  heat: number;
  pressure: number;
  gas: number;
};
```

## 2. `lib/volcanoData.ts`

```ts
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
    modelUrl: '/models/volcano/volcano_v001.glb',
    activity: {
      heat: 0.25,
      pressure: 0.2,
      gas: 0.25,
      eruption: 0,
    },
  },
];
```

## 3. `lib/eruptionModel.ts`

```ts
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
```

## 4. `lib/mantleSampler.ts`

```ts
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
```

## 5. `stores/useVolcanoStore.ts`

```ts
'use client';

import { create } from 'zustand';

interface VolcanoStore {
  selectedVolcanoId: string | null;
  volcanoDebugIntensity: number | null;
  showMantleCouplingDebug: boolean;
  setSelectedVolcano: (id: string | null) => void;
  setVolcanoDebugIntensity: (value: number | null) => void;
  setShowMantleCouplingDebug: (show: boolean) => void;
}

export const useVolcanoStore = create<VolcanoStore>((set) => ({
  selectedVolcanoId: null,
  volcanoDebugIntensity: null,
  showMantleCouplingDebug: false,
  setSelectedVolcano: (selectedVolcanoId) => set({ selectedVolcanoId }),
  setVolcanoDebugIntensity: (volcanoDebugIntensity) => set({ volcanoDebugIntensity }),
  setShowMantleCouplingDebug: (showMantleCouplingDebug) =>
    set({ showMantleCouplingDebug }),
}));
```

## 6. `stores/useLayerStore.ts` 変更差分

既存 interface に追加する。

```ts
showVolcanoes: boolean;
setShowVolcanoes: (show: boolean) => void;
```

初期値と setter を追加する。

```ts
showVolcanoes: true,
setShowVolcanoes: (showVolcanoes) => set({ showVolcanoes }),
```

## 7. `components/three/VolcanoFallback.tsx`

```tsx
'use client';

import { useFrame } from '@react-three/fiber';
import { type MutableRefObject, useRef } from 'react';
import * as THREE from 'three';
import type { VolcanoVisualState } from '@/types/volcano';

export function VolcanoFallback({
  visualRef,
  height,
  radius,
}: {
  visualRef: MutableRefObject<VolcanoVisualState>;
  height: number;
  radius: number;
}) {
  const lavaRef = useRef<THREE.Mesh>(null);
  const craterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const intensity = visualRef.current.eruptionIntensity;
    const pulse = 0.12 * Math.sin(clock.elapsedTime * 4);
    const emissiveIntensity = 0.4 + intensity * 3.2 + pulse;

    const craterMaterial = craterRef.current?.material;
    if (craterMaterial instanceof THREE.MeshStandardMaterial) {
      craterMaterial.emissive.set('#ff3b12');
      craterMaterial.emissiveIntensity = emissiveIntensity;
    }

    if (lavaRef.current) {
      lavaRef.current.scale.y = 0.35 + intensity * 1.5;
      const lavaMaterial = lavaRef.current.material;
      if (lavaMaterial instanceof THREE.MeshStandardMaterial) {
        lavaMaterial.emissive.set('#ff2a00');
        lavaMaterial.emissiveIntensity = 0.2 + intensity * 2.8;
      }
    }
  });

  return (
    <group>
      <mesh position={[0, height * 0.5, 0]}>
        <coneGeometry args={[radius, height, 48, 1, false]} />
        <meshStandardMaterial color="#403027" roughness={0.9} />
      </mesh>

      <mesh position={[0, height + 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.18, radius * 0.035, 12, 48]} />
        <meshStandardMaterial color="#1c1411" roughness={0.8} />
      </mesh>

      <mesh ref={craterRef} position={[0, height + 0.003, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.16, 48]} />
        <meshStandardMaterial color="#ff3b12" emissive="#ff3b12" emissiveIntensity={0.5} />
      </mesh>

      <mesh
        ref={lavaRef}
        position={[radius * 0.16, height * 0.34, radius * 0.45]}
        rotation={[0.9, 0.15, -0.2]}
      >
        <cylinderGeometry args={[radius * 0.035, radius * 0.07, height * 0.7, 16]} />
        <meshStandardMaterial color="#ff4a12" emissive="#ff2a00" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}
```

## 8. `components/three/EruptionParticles.tsx`

```tsx
'use client';

import { useFrame } from '@react-three/fiber';
import { type MutableRefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { VolcanoVisualState } from '@/types/volcano';

const PARTICLE_COUNT = 120;

type ParticleState = {
  seed: Float32Array;
  age: Float32Array;
};

export function EruptionParticles({
  visualRef,
  height,
  radius,
}: {
  visualRef: MutableRefObject<VolcanoVisualState>;
  height: number;
  radius: number;
}) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.PointsMaterial>(null);
  const stateRef = useRef<ParticleState | null>(null);

  const positions = useMemo(() => {
    const seed = new Float32Array(PARTICLE_COUNT * 3);
    const age = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      seed[i * 3] = Math.random() * Math.PI * 2;
      seed[i * 3 + 1] = Math.random();
      seed[i * 3 + 2] = Math.random();
      age[i] = Math.random();
    }
    stateRef.current = { seed, age };
    return new Float32Array(PARTICLE_COUNT * 3);
  }, []);

  useFrame((_, delta) => {
    const geometry = geometryRef.current;
    const material = materialRef.current;
    const state = stateRef.current;
    const intensity = visualRef.current.eruptionIntensity;

    if (!geometry || !material || !state) return;

    material.opacity = Math.min(0.65, Math.max(0, 0.08 + intensity * 0.55));
    material.size = 0.006 + intensity * 0.018;
    material.visible = intensity > 0.03;
    if (intensity <= 0.03) return;

    const speed = 0.12 + intensity * 0.35;
    for (let i = 0; i < PARTICLE_COUNT; i += 1) {
      let age = state.age[i] + delta * speed * (0.7 + state.seed[i * 3 + 2]);
      if (age > 1) age -= 1;
      state.age[i] = age;

      const angle = state.seed[i * 3];
      const spread = radius * (0.12 + age * (0.35 + intensity * 0.65));
      const swirl = angle + age * 2.2;
      positions[i * 3] = Math.cos(swirl) * spread;
      positions[i * 3 + 1] = height + age * height * (0.8 + intensity * 2.5);
      positions[i * 3 + 2] = Math.sin(swirl) * spread;
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={materialRef} color="#777777" transparent opacity={0} depthWrite={false} />
    </points>
  );
}
```

## 9. `components/three/VolcanoModel.tsx`

```tsx
'use client';

import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type MutableRefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { VolcanoVisualState } from '@/types/volcano';

type VolcanoModelProps = {
  url: string;
  visualRef: MutableRefObject<VolcanoVisualState>;
  height: number;
  radius: number;
};

type ControlledMaterial = {
  material: THREE.MeshStandardMaterial;
  role: 'crater' | 'lava';
};

export function VolcanoModel({ url, visualRef, height, radius }: VolcanoModelProps) {
  const gltf = useGLTF(url);
  const controlledMaterialsRef = useRef<ControlledMaterial[]>([]);

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const controlled: ControlledMaterial[] = [];

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      object.geometry = object.geometry.clone();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const clonedMaterials = materials.map((material) => {
        const clonedMaterial = material.clone();
        const label = `${object.name} ${clonedMaterial.name}`.toLowerCase();
        if (clonedMaterial instanceof THREE.MeshStandardMaterial) {
          if (label.includes('crater') || label.includes('inner')) {
            controlled.push({ material: clonedMaterial, role: 'crater' });
          }
          if (label.includes('lava')) {
            controlled.push({ material: clonedMaterial, role: 'lava' });
          }
        }
        return clonedMaterial;
      });

      object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
    });

    controlledMaterialsRef.current = controlled;
    return cloned;
  }, [gltf.scene]);

  useFrame(({ clock }) => {
    const intensity = visualRef.current.eruptionIntensity;
    const pulse = 0.15 * Math.sin(clock.elapsedTime * 5);
    for (const item of controlledMaterialsRef.current) {
      if (item.role === 'crater') {
        item.material.emissive.set('#ff3b12');
        item.material.emissiveIntensity = 0.25 + intensity * 3.8 + pulse;
      } else {
        item.material.emissive.set('#ff2600');
        item.material.emissiveIntensity = 0.2 + intensity * 3.0 + pulse;
      }
    }
  });

  return <primitive object={scene} scale={[radius, height, radius]} />;
}

useGLTF.preload('/models/volcano/volcano_v001.glb');
```

## 10. `components/three/VolcanoLayer.tsx`

```tsx
'use client';

import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS_KM } from '@/lib/earthData';
import { computeEruptionIntensity } from '@/lib/eruptionModel';
import { sampleMantleForVolcano } from '@/lib/mantleSampler';
import { demoVolcanoes } from '@/lib/volcanoData';
import { useLayerStore } from '@/stores/useLayerStore';
import { useVolcanoStore } from '@/stores/useVolcanoStore';
import type { VolcanoFeature, VolcanoVisualState } from '@/types/volcano';
import { EruptionParticles } from './EruptionParticles';
import { VolcanoFallback } from './VolcanoFallback';
import { VolcanoModel } from './VolcanoModel';

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
  const debugIntensity = useVolcanoStore((s) => s.volcanoDebugIntensity);
  const transform = useVolcanoTransform(volcano);
  const visualRef = useRef<VolcanoVisualState>({
    eruptionIntensity: volcano.activity.eruption,
    heat: volcano.activity.heat,
    pressure: volcano.activity.pressure,
    gas: volcano.activity.gas,
  });

  useFrame((_, delta) => {
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
          <VolcanoFallback visualRef={visualRef} height={transform.height} radius={transform.radius} />
        }
      >
        {volcano.modelUrl ? (
          <VolcanoModel
            url={volcano.modelUrl}
            visualRef={visualRef}
            height={transform.height}
            radius={transform.radius}
          />
        ) : (
          <VolcanoFallback visualRef={visualRef} height={transform.height} radius={transform.radius} />
        )}
      </Suspense>
      <EruptionParticles visualRef={visualRef} height={transform.height} radius={transform.radius} />
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
```

注意: PR-1 では GLB ファイルがまだ無い可能性が高い。`VolcanoModel.tsx` と `modelUrl` は PR-2 で入れるか、PR-1では `VolcanoFallback` のみ表示する。

## 11. `components/three/SceneRoot.tsx` 変更差分

import を追加する。

```tsx
import { VolcanoLayer } from './VolcanoLayer';
```

Canvas内に追加する。

```tsx
<EarthLayers />
<VolcanoLayer />
<Probe />
<SeismicWaves />
<Observers />
<ShadowArcs />
<MantleConvection />
```

## 12. `lib/eruptionModel.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { computeEruptionIntensity } from '@/lib/eruptionModel';

describe('computeEruptionIntensity', () => {
  it('returns a value in 0..1', () => {
    const value = computeEruptionIntensity({
      mantleUpwelling: 10,
      mantleTemperature: 10,
      crustStress: 10,
      magmaPressure: 10,
      gas: 10,
      threshold: -1,
    });
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  });

  it('stays low below threshold', () => {
    const value = computeEruptionIntensity({
      mantleUpwelling: 0,
      mantleTemperature: 0,
      crustStress: 0,
      magmaPressure: 0,
      gas: 0,
      threshold: 0.6,
    });
    expect(value).toBe(0);
  });

  it('increases when mantle and pressure are high', () => {
    const value = computeEruptionIntensity({
      mantleUpwelling: 1,
      mantleTemperature: 1,
      crustStress: 0.6,
      magmaPressure: 0.9,
      gas: 0.8,
      threshold: 0.45,
    });
    expect(value).toBeGreaterThan(0.5);
  });

  it('decreases with higher threshold', () => {
    const lowThreshold = computeEruptionIntensity({
      mantleUpwelling: 0.8,
      mantleTemperature: 0.8,
      crustStress: 0.4,
      magmaPressure: 0.6,
      gas: 0.6,
      threshold: 0.3,
    });
    const highThreshold = computeEruptionIntensity({
      mantleUpwelling: 0.8,
      mantleTemperature: 0.8,
      crustStress: 0.4,
      magmaPressure: 0.6,
      gas: 0.6,
      threshold: 0.7,
    });
    expect(lowThreshold).toBeGreaterThan(highThreshold);
  });
});
```

## 13. 実装時の注意

- `showVolcanoes` を `useLayerStore.ts` に追加し忘れると `VolcanoLayer` が型エラーになる。
- GLB がまだ無い場合は `demoVolcanoes[0].modelUrl` を一時的に外すか、fallback 専用にする。
- `useGLTF.preload('/models/volcano/volcano_v001.glb')` はファイル未配置時に開発コンソールで404になる可能性がある。PR-1では `VolcanoModel.tsx` を入れず、PR-2でGLBと同時に入れると安全。
- 毎フレーム更新値を UI に出したい場合は、10Hz程度に間引く。
