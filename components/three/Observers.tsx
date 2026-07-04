'use client';

import { EARTH_RADIUS_KM } from '@/lib/earthData';
import { useLayerStore } from '@/stores/useLayerStore';
import { useSimStore } from '@/stores/useSimStore';
import { to3D } from './cutPlane';

/** 観測点マーカーを地表のわずかに外側に置く(シェルとの重なり回避) */
const OBSERVER_RADIUS_KM = EARTH_RADIUS_KM * 1.015;

const COLOR_NONE = '#64748b'; // 未受信
const COLOR_P_ONLY = '#38bdf8'; // P波のみ受信
const COLOR_BOTH = '#f8fafc'; // P波+S波受信

/**
 * カット断面の円周上に置いた観測点。震源からの震央距離ごとに配置し、
 * シミュレーション時刻の進行に応じて「未受信→P受信→P+S受信」で色が変わる。
 * S波が永遠に来ない観測点(シャドウゾーン)は P のみの色で残る。
 * simTimeSec は 10Hz 間引き済みのため、この再レンダリングは軽い。
 */
export function Observers() {
  const active = useSimStore((s) => s.active);
  const showObservers = useSimStore((s) => s.showObservers);
  const observerDistsDeg = useSimStore((s) => s.observerDistsDeg);
  const arrivals = useSimStore((s) => s.arrivals);
  const simTimeSec = useSimStore((s) => s.simTimeSec);
  const sourceAngleDeg = useSimStore((s) => s.sourceAngleDeg);
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);

  if (!active || !showObservers || cutMode === 'none') return null;

  const cutAngleRad = (cutAngleDeg * Math.PI) / 180;

  return (
    <group rotation={[0, cutAngleRad, 0]}>
      {observerDistsDeg.map((distDeg, i) => {
        const phi = ((sourceAngleDeg + distDeg) * Math.PI) / 180;
        const pos = to3D(
          OBSERVER_RADIUS_KM * Math.sin(phi),
          OBSERVER_RADIUS_KM * Math.cos(phi),
          cutMode,
        );
        const arrival = arrivals?.[i];
        const pArrived = arrival?.pArrivalSec != null && simTimeSec >= arrival.pArrivalSec;
        const sArrived = arrival?.sArrivalSec != null && simTimeSec >= arrival.sArrivalSec;
        const color = sArrived ? COLOR_BOTH : pArrived ? COLOR_P_ONLY : COLOR_NONE;
        return (
          <mesh key={distDeg} position={pos}>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={pArrived || sArrived ? 1.2 : 0.1}
            />
          </mesh>
        );
      })}
    </group>
  );
}
