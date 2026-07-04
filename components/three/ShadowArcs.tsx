'use client';

import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { EARTH_RADIUS_KM } from '@/lib/earthData';
import { useLayerStore } from '@/stores/useLayerStore';
import { useSimStore } from '@/stores/useSimStore';
import { to3D } from './cutPlane';

const S_COLOR = '#fb7185';
const P_COLOR = '#38bdf8';

/**
 * シャドウゾーンを断面円周の外側に円弧バンドとして表示する。
 * S波シャドウ: 届く最大震央距離から先(対蹠点を挟んだ1本の弧)。
 * P波シャドウ: 直接波と核通過波の間の隙間(震源の両側に2本の弧)。
 */
export function ShadowArcs() {
  const active = useSimStore((s) => s.active);
  const zones = useSimStore((s) => s.shadowZones);
  const sourceAngleDeg = useSimStore((s) => s.sourceAngleDeg);
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);

  if (!active || !zones || cutMode === 'none') return null;

  const cutAngleRad = (cutAngleDeg * Math.PI) / 180;
  const s = zones.sShadowStartDeg;
  const p = zones.pShadow;

  return (
    <group rotation={[0, cutAngleRad, 0]}>
      {s !== null && (
        <>
          <ArcBand
            fromDeg={sourceAngleDeg + s}
            toDeg={sourceAngleDeg + 360 - s}
            rInner={1.025}
            rOuter={1.055}
            color={S_COLOR}
            cutMode={cutMode}
          />
          <ArcLabel
            atDeg={sourceAngleDeg + 180}
            radius={1.16}
            cutMode={cutMode}
            text={`S波シャドウ(約${Math.round(s)}°以遠)`}
            color={S_COLOR}
          />
        </>
      )}
      {p !== null && (
        <>
          <ArcBand
            fromDeg={sourceAngleDeg + p[0]}
            toDeg={sourceAngleDeg + p[1]}
            rInner={1.065}
            rOuter={1.095}
            color={P_COLOR}
            cutMode={cutMode}
          />
          <ArcBand
            fromDeg={sourceAngleDeg + 360 - p[1]}
            toDeg={sourceAngleDeg + 360 - p[0]}
            rInner={1.065}
            rOuter={1.095}
            color={P_COLOR}
            cutMode={cutMode}
          />
          <ArcLabel
            atDeg={sourceAngleDeg + (p[0] + p[1]) / 2}
            radius={1.22}
            cutMode={cutMode}
            text={`P波シャドウ(約${Math.round(p[0])}〜${Math.round(p[1])}°)`}
            color={P_COLOR}
          />
        </>
      )}
    </group>
  );
}

/**
 * 円周角 φ(0=+Y、時計回り、度)の区間 [fromDeg, toDeg] を覆う円弧バンド。
 * RingGeometry の θ は +X から反時計回りのため θ = π/2 − φ で変換する。
 */
function ArcBand({
  fromDeg,
  toDeg,
  rInner,
  rOuter,
  color,
  cutMode,
}: {
  fromDeg: number;
  toDeg: number;
  rInner: number;
  rOuter: number;
  color: string;
  cutMode: 'half' | 'quarter';
}) {
  const fromRad = (fromDeg * Math.PI) / 180;
  const toRad = (toDeg * Math.PI) / 180;
  const thetaStart = Math.PI / 2 - toRad;
  const thetaLength = toRad - fromRad;
  const rotation: [number, number, number] =
    cutMode === 'quarter' ? [0, 0, 0] : [0, -Math.PI / 2, 0];
  const position: [number, number, number] =
    cutMode === 'quarter' ? [0, 0, 0.004] : [0.004, 0, 0];
  return (
    <mesh rotation={rotation} position={position}>
      <ringGeometry args={[rInner, rOuter, 64, 1, thetaStart, thetaLength]} />
      <meshBasicMaterial color={color} transparent opacity={0.35} side={THREE.DoubleSide} />
    </mesh>
  );
}

function ArcLabel({
  atDeg,
  radius,
  cutMode,
  text,
  color,
}: {
  atDeg: number;
  radius: number;
  cutMode: 'half' | 'quarter';
  text: string;
  color: string;
}) {
  const phi = (atDeg * Math.PI) / 180;
  const pos = to3D(
    radius * EARTH_RADIUS_KM * Math.sin(phi),
    radius * EARTH_RADIUS_KM * Math.cos(phi),
    cutMode,
    0.01,
  );
  return (
    <Html
      position={pos}
      center
      distanceFactor={3.2}
      zIndexRange={[40, 0]}
      className="pointer-events-none select-none"
    >
      <div
        className="whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-xs"
        style={{ color }}
      >
        {text}
      </div>
    </Html>
  );
}
