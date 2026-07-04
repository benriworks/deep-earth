'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { earthProfile, toSceneRadius, EARTH_RADIUS_KM } from '@/lib/earthData';
import {
  computeArrivals,
  computeWavefrontTable,
  findShadowZones,
  type WavefrontTable,
} from '@/lib/seismic';
import { useLayerStore } from '@/stores/useLayerStore';
import { useSimStore } from '@/stores/useSimStore';
import { to3D } from './cutPlane';

const HUD_UPDATE_INTERVAL = 0.1;

/**
 * P/S 波面をカット断面上の点群として描画する。
 * 波面テーブルは震源変更時のみ再計算(初期化コストは2波種で150ms未満)。
 * 再生時刻は ref が持ち、ストアへは間引き書き込みする。
 */
export function SeismicWaves() {
  const active = useSimStore((s) => s.active);
  const sourceDepthKm = useSimStore((s) => s.sourceDepthKm);
  const sourceAngleDeg = useSimStore((s) => s.sourceAngleDeg);
  const showP = useSimStore((s) => s.showP);
  const showS = useSimStore((s) => s.showS);
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);

  const source = useMemo(
    () => ({ depthKm: sourceDepthKm, angleRad: (sourceAngleDeg * Math.PI) / 180 }),
    [sourceDepthKm, sourceAngleDeg],
  );
  const tables = useMemo(() => {
    if (!active) return null;
    return {
      P: computeWavefrontTable(earthProfile, source, 'P'),
      S: computeWavefrontTable(earthProfile, source, 'S'),
    };
  }, [active, source]);

  // 走時解析(観測点の初動・シャドウゾーン)をパネル用にストアへ共有する
  useEffect(() => {
    const { observerDistsDeg, _setAnalysis } = useSimStore.getState();
    if (!tables) {
      _setAnalysis(null, null);
      return;
    }
    _setAnalysis(
      computeArrivals(tables.P, tables.S, observerDistsDeg),
      findShadowZones(tables.P, tables.S),
    );
  }, [tables]);

  const timeRef = useRef(0);
  const hudTimerRef = useRef(0);

  // スクラブ・リセット時に ref 時刻をストアへ同期する
  useEffect(() => {
    return useSimStore.subscribe((state, prev) => {
      if (state.scrubVersion !== prev.scrubVersion) {
        timeRef.current = state.simTimeSec;
      }
    });
  }, []);

  useFrame((_, delta) => {
    const { playing, timeScale, maxTimeSec, pause, _setSimTime } =
      useSimStore.getState();
    if (!playing) return;
    timeRef.current = Math.min(timeRef.current + delta * timeScale, maxTimeSec);
    hudTimerRef.current += delta;
    if (timeRef.current >= maxTimeSec) {
      _setSimTime(maxTimeSec);
      pause();
    } else if (hudTimerRef.current >= HUD_UPDATE_INTERVAL) {
      hudTimerRef.current = 0;
      _setSimTime(timeRef.current);
    }
  });

  if (!tables || cutMode === 'none') return null;

  // 断面 2D 座標 → 3D: quarter は z=0 キャップ面、half は x=0 キャップ面に描く
  const cutAngleRad = (cutAngleDeg * Math.PI) / 180;

  return (
    <group rotation={[0, cutAngleRad, 0]}>
      {showP && (
        <WavefrontPoints table={tables.P} color="#38bdf8" cutMode={cutMode} timeRef={timeRef} />
      )}
      {showS && (
        <WavefrontPoints table={tables.S} color="#fb7185" cutMode={cutMode} timeRef={timeRef} />
      )}
      <SourceMarker source={source} cutMode={cutMode} />
    </group>
  );
}

function WavefrontPoints({
  table,
  color,
  cutMode,
  timeRef,
}: {
  table: WavefrontTable;
  color: string;
  cutMode: 'half' | 'quarter';
  timeRef: React.RefObject<number>;
}) {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(table.rayCount * 3);
    arr.fill(1e6); // 画面外に置いて非表示扱い
    return arr;
  }, [table.rayCount]);

  useFrame(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;
    const t = timeRef.current;
    const stepFloat = t / table.timeStepSec;
    const k0 = Math.min(Math.floor(stepFloat), table.stepCount - 1);
    const k1 = Math.min(k0 + 1, table.stepCount - 1);
    const frac = Math.min(stepFloat - k0, 1);

    for (let ray = 0; ray < table.rayCount; ray++) {
      const x0 = table.positionsKm[(k0 * table.rayCount + ray) * 2];
      const y0 = table.positionsKm[(k0 * table.rayCount + ray) * 2 + 1];
      const x1 = table.positionsKm[(k1 * table.rayCount + ray) * 2];
      const y1 = table.positionsKm[(k1 * table.rayCount + ray) * 2 + 1];
      let px: number;
      let py: number;
      if (Number.isNaN(x0)) {
        // このレイは消滅済み(S波シャドウ・地表脱出)
        positions[ray * 3] = 1e6;
        positions[ray * 3 + 1] = 1e6;
        positions[ray * 3 + 2] = 1e6;
        continue;
      } else if (Number.isNaN(x1)) {
        px = x0;
        py = y0;
      } else {
        px = x0 + (x1 - x0) * frac;
        py = y0 + (y1 - y0) * frac;
      }
      const [sx, sy, sz] = to3D(px, py, cutMode);
      positions[ray * 3] = sx;
      positions[ray * 3 + 1] = sy;
      positions[ray * 3 + 2] = sz;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={color} size={0.018} sizeAttenuation transparent opacity={0.9} />
    </points>
  );
}

function SourceMarker({
  source,
  cutMode,
}: {
  source: { depthKm: number; angleRad: number };
  cutMode: 'half' | 'quarter';
}) {
  const r = toSceneRadius(EARTH_RADIUS_KM - source.depthKm) * EARTH_RADIUS_KM;
  const pos = to3D(r * Math.sin(source.angleRad), r * Math.cos(source.angleRad), cutMode);
  return (
    <mesh position={pos}>
      <sphereGeometry args={[0.025, 16, 16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={2} />
    </mesh>
  );
}
