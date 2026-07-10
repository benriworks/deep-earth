'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { useLayerStore } from '@/stores/useLayerStore';
import { useCutPlanes } from './useCutPlanes';

const VERTEX = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  #include <common>
  #include <clipping_planes_pars_vertex>
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vPositionW = (modelMatrix * vec4(position, 1.0)).xyz;
    #include <clipping_planes_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vPositionW;
  uniform vec3 uColor;
  uniform float uIntensity;
  #include <common>
  #include <clipping_planes_pars_fragment>
  void main() {
    #include <clipping_planes_fragment>
    vec3 viewDir = normalize(cameraPosition - vPositionW);
    float rim = pow(1.0 - abs(dot(viewDir, normalize(vNormalW))), 3.0);
    gl_FragColor = vec4(uColor * rim * uIntensity, rim);
  }
`;

/**
 * 大気のリムグロー。BackSide + 加算合成のフレネルシェーダで、
 * 地球の縁だけが淡く青く光る。断面カット時は既存の clippingPlanes を
 * 共有して大気も一緒に開く(ShaderMaterial の clipping 対応チャンクを使用)。
 */
export function Atmosphere() {
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);
  const { planes, clipIntersection } = useCutPlanes(cutMode, cutAngleDeg);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#5a9be0') },
      uIntensity: { value: 0.9 },
    }),
    [],
  );

  return (
    <mesh>
      <sphereGeometry args={[1.035, 64, 32]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        clipping
        clippingPlanes={planes}
        clipIntersection={clipIntersection}
      />
    </mesh>
  );
}
