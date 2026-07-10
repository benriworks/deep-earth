'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { VolcanoVisualState } from '@/types/volcano';

const PARTICLE_COUNT = 120;
/** これよりカメラが遠いと噴煙を省略する(Phase D の性能対策) */
const FX_MAX_CAMERA_DISTANCE = 3.5;

/**
 * 噴煙用の丸いソフトスプライト(放射グラデーション)。
 * PointsMaterial は map なしだと四角い点になるため、Canvas で生成して共有する。
 */
let smokeSprite: THREE.CanvasTexture | null = null;
function getSmokeSprite(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  if (!smokeSprite) {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    smokeSprite = new THREE.CanvasTexture(canvas);
    smokeSprite.needsUpdate = true;
  }
  return smokeSprite;
}

type ParticleState = {
  seed: Float32Array;
  age: Float32Array;
};

/**
 * 火口からの噴煙パーティクル(docs 02)。
 * eruptionIntensity で不透明度・粒径・上昇速度・広がりが変わる。
 * 低スペック対応は PARTICLE_COUNT を下げるだけでよい。
 */
export function EruptionParticles({
  visualRef,
  height,
  radius,
  color = '#777777',
}: {
  visualRef: RefObject<VolcanoVisualState>;
  height: number;
  radius: number;
  /** 噴煙色。海底火山は蒸気らしい白系を渡す */
  color?: string;
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

  const pointsRef = useRef<THREE.Points>(null);
  const worldPos = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    const geometry = geometryRef.current;
    const material = materialRef.current;
    const state = stateRef.current;
    const intensity = visualRef.current.eruptionIntensity;

    if (!geometry || !material || !state) return;

    // 遠景では噴煙を省略(透明パーティクルの描画コスト削減)
    let cameraDist = Infinity;
    if (pointsRef.current) {
      pointsRef.current.getWorldPosition(worldPos.current);
      cameraDist = camera.position.distanceTo(worldPos.current);
    }

    material.opacity = Math.min(0.65, Math.max(0, 0.08 + intensity * 0.55));
    material.size = 0.006 + intensity * 0.018;
    material.visible = intensity > 0.03 && cameraDist < FX_MAX_CAMERA_DISTANCE;
    if (!material.visible) return;

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
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        map={getSmokeSprite() ?? undefined}
        alphaTest={0.01}
      />
    </points>
  );
}
