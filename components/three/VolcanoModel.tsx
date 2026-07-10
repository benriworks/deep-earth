'use client';

import { Detailed, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { type RefObject, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { VolcanoVisualState } from '@/types/volcano';
import { prepareLavaMaterial, updateLavaMaterial } from './LavaFlowMaterial';

type VolcanoModelProps = {
  url: string;
  visualRef: RefObject<VolcanoVisualState>;
  height: number;
  radius: number;
  /** 指定時はカメラ距離で low/mid/high を切り替える(Phase D) */
  lodUrls?: { low: string; mid: string; high: string };
  /** 岩肌マテリアルの色に乗算する tint(submarine の寒色化に使用) */
  tint?: string;
};

type ControlledMaterial = {
  material: THREE.MeshStandardMaterial;
  role: 'crater' | 'lava';
};

/**
 * Blender 製 GLB 火山。lodUrls 指定時は drei の Detailed でカメラ距離に応じて
 * low/mid/high を切り替える(Phase D)。
 */
export function VolcanoModel({ url, visualRef, height, radius, lodUrls, tint }: VolcanoModelProps) {
  if (lodUrls) {
    return (
      <Detailed distances={[0, 2.4, 4.5]}>
        <VolcanoGLTF url={lodUrls.high} visualRef={visualRef} height={height} radius={radius} tint={tint} />
        <VolcanoGLTF url={lodUrls.mid} visualRef={visualRef} height={height} radius={radius} tint={tint} />
        <VolcanoGLTF url={lodUrls.low} visualRef={visualRef} height={height} radius={radius} tint={tint} />
      </Detailed>
    );
  }
  return <VolcanoGLTF url={url} visualRef={visualRef} height={height} radius={radius} tint={tint} />;
}

/**
 * 単一 GLB の読み込みと発光制御。
 * scene / geometry / material をすべて clone し、同じ GLB を複数配置しても
 * 発光強度が共有されないようにする(docs 05 レビュー観点)。
 * 発光対象は material / object 名の 'crater' / 'inner' / 'lava' で検出する。
 */
function VolcanoGLTF({
  url,
  visualRef,
  height,
  radius,
  tint,
}: Omit<VolcanoModelProps, 'lodUrls'>) {
  const gltf = useGLTF(url);
  const controlledMaterialsRef = useRef<ControlledMaterial[]>([]);

  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const controlled: ControlledMaterial[] = [];
    const tintColor = tint ? new THREE.Color(tint) : null;

    cloned.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      // 台座の円形パッチは地球面と馴染まないため非表示(山体を地表に直接載せる)
      if (object.name.includes('BaseTerrain')) {
        object.visible = false;
        return;
      }

      object.geometry = object.geometry.clone();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const clonedMaterials = materials.map((material) => {
        const clonedMaterial = material.clone();
        const label = `${object.name} ${clonedMaterial.name}`.toLowerCase();
        if (clonedMaterial instanceof THREE.MeshStandardMaterial) {
          const isCrater = label.includes('crater') || label.includes('inner');
          const isLava = label.includes('lava');
          if (isCrater) {
            controlled.push({ material: clonedMaterial, role: 'crater' });
          }
          if (isLava) {
            prepareLavaMaterial(clonedMaterial);
            controlled.push({ material: clonedMaterial, role: 'lava' });
          }
          // 発光部以外の岩肌に tint を乗算(submarine の寒色化)
          if (tintColor && !isCrater && !isLava) {
            clonedMaterial.color.multiply(tintColor);
          }
        }
        return clonedMaterial;
      });

      object.material = Array.isArray(object.material) ? clonedMaterials : clonedMaterials[0];
    });

    controlledMaterialsRef.current = controlled;
    return cloned;
  }, [gltf.scene, tint]);

  useFrame(({ clock }, delta) => {
    const intensity = visualRef.current.eruptionIntensity;
    const pulse = 0.15 * Math.sin(clock.elapsedTime * 5);
    for (const item of controlledMaterialsRef.current) {
      if (item.role === 'crater') {
        item.material.emissiveIntensity = 0.25 + intensity * 3.8 + pulse;
      } else {
        updateLavaMaterial(item.material, intensity, delta, pulse);
      }
    }
  });

  return <primitive object={scene} scale={[radius, height, radius]} />;
}

useGLTF.preload('/models/volcano/volcano_v001.glb');
useGLTF.preload('/models/volcano/volcano_stratovolcano_low.glb');
useGLTF.preload('/models/volcano/volcano_stratovolcano_mid.glb');
useGLTF.preload('/models/volcano/volcano_stratovolcano_high.glb');
useGLTF.preload('/models/volcano/volcano_shield_low.glb');
useGLTF.preload('/models/volcano/volcano_shield_mid.glb');
useGLTF.preload('/models/volcano/volcano_cinder_cone_low.glb');
useGLTF.preload('/models/volcano/volcano_cinder_cone_mid.glb');
useGLTF.preload('/models/volcano/volcano_caldera_low.glb');
useGLTF.preload('/models/volcano/volcano_caldera_mid.glb');
