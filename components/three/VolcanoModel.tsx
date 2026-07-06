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
};

type ControlledMaterial = {
  material: THREE.MeshStandardMaterial;
  role: 'crater' | 'lava';
};

/**
 * Blender 製 GLB 火山。lodUrls 指定時は drei の Detailed でカメラ距離に応じて
 * low/mid/high を切り替える(Phase D)。
 */
export function VolcanoModel({ url, visualRef, height, radius, lodUrls }: VolcanoModelProps) {
  if (lodUrls) {
    return (
      <Detailed distances={[0, 2.4, 4.5]}>
        <VolcanoGLTF url={lodUrls.high} visualRef={visualRef} height={height} radius={radius} />
        <VolcanoGLTF url={lodUrls.mid} visualRef={visualRef} height={height} radius={radius} />
        <VolcanoGLTF url={lodUrls.low} visualRef={visualRef} height={height} radius={radius} />
      </Detailed>
    );
  }
  return <VolcanoGLTF url={url} visualRef={visualRef} height={height} radius={radius} />;
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
}: Omit<VolcanoModelProps, 'lodUrls'>) {
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
            prepareLavaMaterial(clonedMaterial);
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
