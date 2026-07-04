'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { EARTH_RADIUS_KM, toSceneRadius } from '@/lib/earthData';
import { useProbeStore } from '@/stores/useProbeStore';

/** HUD へ深度を反映する間隔(秒)。毎フレーム setState すると FPS が落ちる */
const HUD_UPDATE_INTERVAL = 0.1;

/**
 * 仮想プローブ。投入方向に沿って地心まで降下する。
 * 正確な深度は ref で保持し、ストアへは間引いて書き込む(60FPS 維持のため)。
 */
export function Probe() {
  const status = useProbeStore((s) => s.status);
  const targetDirection = useProbeStore((s) => s.targetDirection);

  const markerRef = useRef<THREE.Mesh>(null);
  const depthRef = useRef(0);
  const hudTimerRef = useRef(0);

  // 新しい投入・リセットで内部深度を初期化する
  useEffect(() => {
    if (status === 'idle' || status === 'descending') {
      if (useProbeStore.getState().depthKm === 0) depthRef.current = 0;
    }
  }, [status, targetDirection]);

  useFrame((_, delta) => {
    if (!targetDirection || !markerRef.current) return;
    const { status: st, speedKmPerSec, _setDepth, _arrive } = useProbeStore.getState();

    if (st === 'descending') {
      depthRef.current = Math.min(
        depthRef.current + speedKmPerSec * delta,
        EARTH_RADIUS_KM,
      );
      hudTimerRef.current += delta;
      if (depthRef.current >= EARTH_RADIUS_KM) {
        _arrive();
      } else if (hudTimerRef.current >= HUD_UPDATE_INTERVAL) {
        hudTimerRef.current = 0;
        _setDepth(depthRef.current);
      }
    }

    const r = toSceneRadius(EARTH_RADIUS_KM - depthRef.current);
    markerRef.current.position.set(
      targetDirection[0] * r,
      targetDirection[1] * r,
      targetDirection[2] * r,
    );
  });

  if (!targetDirection) return null;

  const surface = new THREE.Vector3(...targetDirection);

  return (
    <group>
      {/* 降下経路(地表→地心) */}
      <Line
        points={[surface.toArray(), [0, 0, 0]]}
        color="#7dd3fc"
        lineWidth={1.5}
        dashed
        dashScale={30}
        transparent
        opacity={0.7}
      />
      {/* プローブ本体 */}
      <mesh ref={markerRef} position={surface.toArray()}>
        <sphereGeometry args={[0.022, 16, 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0ea5e9"
          emissiveIntensity={1.5}
        />
      </mesh>
    </group>
  );
}
