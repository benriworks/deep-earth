'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import {
  convectionVelocity,
  randomMantleParticle,
  MANTLE_INNER,
  MANTLE_OUTER,
} from '@/lib/convection';
import { useLayerStore } from '@/stores/useLayerStore';

const PARTICLE_COUNT = 1200;
/** カット面からの浮かせ量(波面より少し下げてキャップより上) */
const PLANE_OFFSET = 0.002;
/** 表示用の速度誇張係数 */
const SPEED = 0.9;

const RISING = new THREE.Color('#f87171'); // 上昇流(高温)
const SINKING = new THREE.Color('#60a5fa'); // 下降流(低温)

/**
 * マントル対流のパーティクル表示。解析的な流れ場に沿って粒子を移流し、
 * 上昇流を赤、下降流を青で着色する。カット断面上にのみ表示する。
 */
export function MantleConvection() {
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);
  const convectionMode = useLayerStore((s) => s.convectionMode);
  const mantleVisible = useLayerStore(
    (s) => s.layerView.upperMantle.visible || s.layerView.lowerMantle.visible,
  );

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  // 粒子の極座標状態(r, θ)
  const particlesRef = useRef<Float32Array | null>(null);

  const { positions, colors } = useMemo(() => {
    const particles = new Float32Array(PARTICLE_COUNT * 2);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const [r, theta] = randomMantleParticle();
      particles[i * 2] = r;
      particles[i * 2 + 1] = theta;
    }
    particlesRef.current = particles;
    return {
      positions: new Float32Array(PARTICLE_COUNT * 3),
      colors: new Float32Array(PARTICLE_COUNT * 3).fill(0.7),
    };
  }, []);

  useFrame((_, delta) => {
    const geometry = geometryRef.current;
    const particles = particlesRef.current;
    if (!geometry || !particles) return;
    const dt = Math.min(delta, 0.05) * SPEED;
    const quarter = cutMode === 'quarter';

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      let r = particles[i * 2];
      let theta = particles[i * 2 + 1];
      const [vr, vtheta] = convectionVelocity(r, theta);
      r += vr * dt;
      theta += (vtheta / r) * dt;

      // 境界に達したら少し内側へ戻す(流れ場の境界では速度が接線方向になる)
      if (r < MANTLE_INNER + 0.005) r = MANTLE_INNER + 0.005;
      if (r > MANTLE_OUTER - 0.005) r = MANTLE_OUTER - 0.005;
      particles[i * 2] = r;
      particles[i * 2 + 1] = theta;

      // 2D 断面座標(x=右, y=上)→ 3D カット面
      const x2 = r * Math.sin(theta);
      const y2 = r * Math.cos(theta);
      if (quarter) {
        positions[i * 3] = x2;
        positions[i * 3 + 1] = y2;
        positions[i * 3 + 2] = PLANE_OFFSET;
      } else {
        positions[i * 3] = PLANE_OFFSET;
        positions[i * 3 + 1] = y2;
        positions[i * 3 + 2] = x2;
      }

      // 上昇流=赤、下降流=青(移流の遅い場所は中間色)。毎フレームなのでアロケーションしない
      const heat = THREE.MathUtils.clamp(vr * 40 + 0.5, 0, 1);
      colors[i * 3] = SINKING.r + (RISING.r - SINKING.r) * heat;
      colors[i * 3 + 1] = SINKING.g + (RISING.g - SINKING.g) * heat;
      colors[i * 3 + 2] = SINKING.b + (RISING.b - SINKING.b) * heat;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  });

  // 'particles' = 旧解析場の粒子表示(軽量フォールバック)。heatmap とは相互排他
  if (convectionMode !== 'particles' || cutMode === 'none' || !mantleVisible) return null;

  const cutAngleRad = (cutAngleDeg * Math.PI) / 180;
  return (
    <group rotation={[0, cutAngleRad, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry ref={geometryRef}>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial vertexColors size={0.01} sizeAttenuation transparent opacity={0.85} />
      </points>
    </group>
  );
}
