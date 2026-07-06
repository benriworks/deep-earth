'use client';

import { useFrame } from '@react-three/fiber';
import { type RefObject, useRef } from 'react';
import * as THREE from 'three';
import type { VolcanoVisualState } from '@/types/volcano';

export function VolcanoFallback({
  visualRef,
  height,
  radius,
}: {
  visualRef: RefObject<VolcanoVisualState>;
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
