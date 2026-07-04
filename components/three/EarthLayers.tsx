'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { EARTH_LAYERS, displayRadiiKm, toSceneRadius } from '@/lib/earthData';
import { useLayerStore } from '@/stores/useLayerStore';
import { useProbeStore } from '@/stores/useProbeStore';
import { useUIStore } from '@/stores/useUIStore';
import { useCutPlanes } from './useCutPlanes';
import type { EarthLayer } from '@/types/earth';

/**
 * 地球の層構造。各層は外側半径の球面シェルとして描画し、
 * 断面カット時はクリッピングで開いた切り口を層ごとの円環キャップで塞ぐ。
 * キャップが層の断面(塗り分けられた同心円環)として見える。
 */
export function EarthLayers() {
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);
  const showLabels = useLayerStore((s) => s.showLabels);
  const layerView = useLayerStore((s) => s.layerView);
  const exaggerate = useLayerStore((s) => s.exaggerateThinLayers);

  const { planes, clipIntersection, openDirection } = useCutPlanes(cutMode, cutAngleDeg);
  const cutAngleRad = (cutAngleDeg * Math.PI) / 180;

  return (
    <group>
      {EARTH_LAYERS.map((layer) => {
        const view = layerView[layer.id];
        if (!view.visible) return null;
        return (
          <LayerShell
            key={layer.id}
            layer={layer}
            opacity={view.opacity}
            planes={planes}
            clipIntersection={clipIntersection}
            exaggerate={exaggerate}
          />
        );
      })}

      {cutMode !== 'none' && (
        <group rotation={[0, cutAngleRad, 0]}>
          {EARTH_LAYERS.map((layer) => {
            const view = layerView[layer.id];
            if (!view.visible) return null;
            return (
              <LayerCaps
                key={layer.id}
                layer={layer}
                opacity={view.opacity}
                quarter={cutMode === 'quarter'}
                exaggerate={exaggerate}
              />
            );
          })}
        </group>
      )}

      {showLabels && cutMode !== 'none' && (
        <LayerLabels openDirection={openDirection} exaggerate={exaggerate} />
      )}
    </group>
  );
}

function LayerShell({
  layer,
  opacity,
  planes,
  clipIntersection,
  exaggerate,
}: {
  layer: EarthLayer;
  opacity: number;
  planes: THREE.Plane[];
  clipIntersection: boolean;
  exaggerate: boolean;
}) {
  const radius = toSceneRadius(displayRadiiKm(layer, exaggerate).outerKm);
  const transparent = opacity < 1;

  // 投入モード中は地表クリックでプローブ投入、通常時は層の選択。
  // クリッピングで消えた部分もレイキャストに当たる制限があるため、
  // 層選択の主導線は UI パネル側とし、3D クリックは補助とする。
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const probe = useProbeStore.getState();
    if (probe.armed) {
      const dir = e.point.clone().normalize();
      probe.launch([dir.x, dir.y, dir.z]);
    } else {
      useUIStore.getState().setSelectedLayer(layer.id);
    }
  };

  return (
    <mesh onClick={handleClick}>
      <sphereGeometry args={[radius, 64, 32]} />
      <meshStandardMaterial
        color={layer.color}
        roughness={0.85}
        metalness={0.05}
        side={THREE.DoubleSide}
        clippingPlanes={planes}
        clipIntersection={clipIntersection}
        transparent={transparent}
        opacity={opacity}
        depthWrite={!transparent}
      />
    </mesh>
  );
}

/**
 * 切り口のキャップ(円環)。断面色はシェルより少し暗くして立体感を出す。
 * - half: x=0 平面に全円環1枚
 * - quarter: x=0 平面(z>0側)と z=0 平面(x>0側)に半円環2枚
 */
function LayerCaps({
  layer,
  opacity,
  quarter,
  exaggerate,
}: {
  layer: EarthLayer;
  opacity: number;
  quarter: boolean;
  exaggerate: boolean;
}) {
  const radii = displayRadiiKm(layer, exaggerate);
  const inner = toSceneRadius(radii.innerKm);
  const outer = toSceneRadius(radii.outerKm);
  const capColor = useMemo(
    () => new THREE.Color(layer.color).multiplyScalar(0.8),
    [layer.color],
  );
  const transparent = opacity < 1;

  const material = (
    <meshStandardMaterial
      color={capColor}
      roughness={0.95}
      metalness={0}
      side={THREE.DoubleSide}
      transparent={transparent}
      opacity={opacity}
      depthWrite={!transparent}
    />
  );

  if (!quarter) {
    return (
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[inner, outer, 96, 1]} />
        {material}
      </mesh>
    );
  }
  return (
    <>
      {/* x=0 平面、z>0 側(rotation.y=π/2 でローカル+X→ワールド-Z のため θ=π/2〜3π/2) */}
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[inner, outer, 48, 1, Math.PI / 2, Math.PI]} />
        {material}
      </mesh>
      {/* z=0 平面、x>0 側 */}
      <mesh>
        <ringGeometry args={[inner, outer, 48, 1, -Math.PI / 2, Math.PI]} />
        {material}
      </mesh>
    </>
  );
}

/** 外側の薄い3層はラベルが重なるため、開口方向と直交する向きに互い違いにずらす */
const LABEL_PERP_OFFSET: Partial<Record<EarthLayer['id'], number>> = {
  crust: 0.14,
  upperMantle: 0,
  transitionZone: -0.14,
};

const UP = new THREE.Vector3(0, 1, 0);

/** 除去された空間に、各層の中間半径位置でラベルを浮かべる */
function LayerLabels({
  openDirection,
  exaggerate,
}: {
  openDirection: THREE.Vector3;
  exaggerate: boolean;
}) {
  // カット面は鉛直なので openDirection は水平。UP との外積で水平な直交方向を得る
  const perp = new THREE.Vector3().crossVectors(openDirection, UP).normalize();
  return (
    <>
      {EARTH_LAYERS.map((layer) => {
        const radii = displayRadiiKm(layer, exaggerate);
        const midRadius =
          (toSceneRadius(radii.innerKm) + toSceneRadius(radii.outerKm)) / 2;
        const pos = openDirection
          .clone()
          .multiplyScalar(Math.max(midRadius, 0.08))
          .addScaledVector(perp, LABEL_PERP_OFFSET[layer.id] ?? 0);
        return (
          <Html
            key={layer.id}
            position={[pos.x, pos.y, pos.z]}
            center
            distanceFactor={3.2}
            zIndexRange={[40, 0]}
            className="pointer-events-none select-none"
          >
            <div className="whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-xs text-white">
              {layer.nameJa}
            </div>
          </Html>
        );
      })}
    </>
  );
}
