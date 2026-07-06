'use client';

import { useGLTF } from '@react-three/drei';
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
};

type ControlledMaterial = {
  material: THREE.MeshStandardMaterial;
  role: 'crater' | 'lava';
};

/**
 * Blender 製 GLB 火山(public/models/volcano/volcano_v001.glb)。
 * scene / geometry / material をすべて clone し、同じ GLB を複数配置しても
 * 発光強度が共有されないようにする(docs 05 レビュー観点)。
 * 発光対象は material / object 名の 'crater' / 'inner' / 'lava' で検出する。
 */
export function VolcanoModel({ url, visualRef, height, radius }: VolcanoModelProps) {
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
