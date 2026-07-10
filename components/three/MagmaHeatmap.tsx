'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { MANTLE_INNER, MANTLE_OUTER } from '@/lib/convection';
import { useLayerStore } from '@/stores/useLayerStore';
import type { MagmaFrameMessage } from '@/workers/magmaSim.worker';

/**
 * マグマ対流の温度ヒートマップ。Worker の簡易ブシネスク対流(lib/magmaSim.ts)から
 * 約10Hzで届く温度場を、断面キャップ上の環状メッシュに描く。
 * - テクスチャは 8bit(R8/RG8)エンコード: Float テクスチャの LINEAR 補間は
 *   拡張依存のため、公開物では互換性を優先する
 * - quarter は2面(z=0 と x=0)に θ を分割し、面の合わせ目(±Y軸)で
 *   シミュ場が連続するようにマッピングする(face1: θ=φ、face2: θ=2π−φ)
 * - 毎フレームの setState はしない(テクスチャ更新は受信時、uTime は uniform 直接更新)
 */

const TEMP_W = 192; // = magmaSim nTheta
const TEMP_H = 48; // = magmaSim nR
const VEL_W = 64;
const VEL_H = 24;
const PLANE_OFFSET = 0.0012; // キャップ(0)と粒子(0.002)・波面(0.004)の間

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uTemp;
  uniform sampler2D uVel;
  uniform sampler2D uLut;
  uniform sampler2D uNoise;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    // 速度(0..1 エンコード)→ -1..1
    vec2 vel = texture2D(uVel, vUv).rg * 2.0 - 1.0;

    // Blender 製シームレスノイズを流れ方向へ2位相スクロール(フローマップ方式)
    vec2 flowOffset = vel * 0.18;
    float phase1 = fract(uTime * 0.06);
    float phase2 = fract(uTime * 0.06 + 0.5);
    vec2 noiseUv = vUv * vec2(6.0, 1.5);
    float n1 = texture2D(uNoise, noiseUv - flowOffset * phase1 * 2.0).r;
    float n2 = texture2D(uNoise, noiseUv - flowOffset * phase2 * 2.0 + vec2(0.37, 0.19)).r;
    float blend = abs(phase1 * 2.0 - 1.0);
    float grain = mix(n1, n2, blend);

    float temperature = texture2D(uTemp, vUv).r;
    float shade = clamp(temperature + (grain - 0.5) * 0.18, 0.0, 1.0);
    vec3 color = texture2D(uLut, vec2(shade, 0.5)).rgb;
    // 高温部は白熱側へブースト(プルームの芯が光る)
    color *= 1.0 + 0.7 * smoothstep(0.75, 1.0, shade);
    gl_FragColor = vec4(color, 0.92);
  }
`;

type Face = 'full' | 'quarterZ' | 'quarterX';

/**
 * 断面マントル帯の環状メッシュ。UV.x = シミュの θ/2π、UV.y = 深さ方向 s。
 * 座標規約は cutPlane.to3D と同一(quarterZ: [x,y,ε] / quarterX,full: [ε,y,x])。
 */
function buildAnnulusGeometry(face: Face): THREE.BufferGeometry {
  const phiSteps = face === 'full' ? 192 : 96;
  const sSteps = 24;
  const phiMax = face === 'full' ? Math.PI * 2 : Math.PI;

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let sj = 0; sj <= sSteps; sj++) {
    const s = sj / sSteps;
    const rho = MANTLE_INNER + (MANTLE_OUTER - MANTLE_INNER) * s;
    for (let pi = 0; pi <= phiSteps; pi++) {
      const phi = (pi / phiSteps) * phiMax;
      const x2 = rho * Math.sin(phi);
      const y2 = rho * Math.cos(phi);
      if (face === 'quarterZ') {
        positions.push(x2, y2, PLANE_OFFSET);
      } else {
        positions.push(PLANE_OFFSET, y2, x2);
      }
      // シミュ θ へのマッピング(面の合わせ目 ±Y 軸で連続)
      const thetaSim = face === 'quarterX' ? 2 * Math.PI - phi : phi;
      uvs.push(thetaSim / (2 * Math.PI), s);
    }
  }
  const stride = phiSteps + 1;
  for (let sj = 0; sj < sSteps; sj++) {
    for (let pi = 0; pi < phiSteps; pi++) {
      const a = sj * stride + pi;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

export function MagmaHeatmap() {
  const convectionMode = useLayerStore((s) => s.convectionMode);
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);
  const mantleVisible = useLayerStore(
    (s) => s.layerView.upperMantle.visible || s.layerView.lowerMantle.visible,
  );
  const active = convectionMode === 'heatmap' && cutMode !== 'none' && mantleVisible;

  const workerRef = useRef<Worker | null>(null);
  const startedRef = useRef(false);

  // 8bit エンコードの動的テクスチャ(受信時に書き換え。React 再レンダリング不要)
  const { tempTexture, velTexture, tempData, velData } = useMemo(() => {
    const tempArray = new Uint8Array(TEMP_W * TEMP_H);
    const velArray = new Uint8Array(VEL_W * VEL_H * 2).fill(128);
    const temp = new THREE.DataTexture(tempArray, TEMP_W, TEMP_H, THREE.RedFormat);
    const vel = new THREE.DataTexture(velArray, VEL_W, VEL_H, THREE.RGFormat);
    for (const texture of [temp, vel]) {
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearFilter;
      texture.wrapS = THREE.RepeatWrapping; // θ 周期
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.needsUpdate = true;
    }
    return { tempTexture: temp, velTexture: vel, tempData: tempArray, velData: velArray };
  }, []);

  const staticTextures = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const lut = loader.load('/textures/magma/magma_ramp.png');
    lut.wrapS = THREE.ClampToEdgeWrapping;
    lut.colorSpace = THREE.SRGBColorSpace;
    const noise = loader.load('/textures/magma/magma_noise.png');
    noise.wrapS = THREE.RepeatWrapping;
    noise.wrapT = THREE.RepeatWrapping;
    return { lut, noise };
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTemp: { value: tempTexture },
          uVel: { value: velTexture },
          uLut: { value: staticTextures.lut },
          uNoise: { value: staticTextures.noise },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [tempTexture, velTexture, staticTextures],
  );

  const geometries = useMemo(
    () => ({
      full: buildAnnulusGeometry('full'),
      quarterZ: buildAnnulusGeometry('quarterZ'),
      quarterX: buildAnnulusGeometry('quarterX'),
    }),
    [],
  );

  // Worker のライフサイクル(生成は初回 active 時。失敗時は粒子表示へ自動降格)
  useEffect(() => {
    if (!active) {
      workerRef.current?.postMessage({ type: 'pause' });
      return;
    }
    if (!workerRef.current) {
      try {
        const worker = new Worker(new URL('../../workers/magmaSim.worker.ts', import.meta.url));
        worker.onmessage = (event: MessageEvent<MagmaFrameMessage | { type: 'ready' }>) => {
          const message = event.data;
          if (message.type !== 'frame') return;
          const { temperature, velocity, maxVelocity } = message;
          for (let k = 0; k < temperature.length && k < tempData.length; k++) {
            tempData[k] = Math.max(0, Math.min(255, temperature[k] * 255)) | 0;
          }
          const scale = maxVelocity > 1e-6 ? 1 / maxVelocity : 0;
          for (let k = 0; k < velocity.length && k < velData.length; k++) {
            velData[k] = Math.max(0, Math.min(255, (velocity[k] * scale * 0.5 + 0.5) * 255)) | 0;
          }
          tempTexture.needsUpdate = true;
          velTexture.needsUpdate = true;
        };
        worker.onerror = (event) => {
          console.warn('[MagmaHeatmap] worker error; falling back to particles', event.message);
          worker.terminate();
          workerRef.current = null;
          useLayerStore.getState().setConvectionMode('particles');
        };
        worker.postMessage({ type: 'init' });
        workerRef.current = worker;
        startedRef.current = true;
      } catch (error) {
        console.warn('[MagmaHeatmap] worker unavailable; falling back to particles', error);
        useLayerStore.getState().setConvectionMode('particles');
        return;
      }
    } else {
      workerRef.current.postMessage({ type: 'resume' });
    }
  }, [active, tempData, velData, tempTexture, velTexture]);

  // タブ非表示で pause(場は保持)
  useEffect(() => {
    const onVisibility = () => {
      const worker = workerRef.current;
      if (!worker) return;
      if (document.hidden) worker.postMessage({ type: 'pause' });
      else if (active) worker.postMessage({ type: 'resume' });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [active]);

  // アンマウント時に完全停止
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useFrame((_, delta) => {
    material.uniforms.uTime.value += delta;
  });

  if (!active) return null;

  const cutAngleRad = (cutAngleDeg * Math.PI) / 180;
  return (
    <group rotation={[0, cutAngleRad, 0]}>
      {cutMode === 'half' ? (
        <mesh geometry={geometries.full} material={material} />
      ) : (
        <>
          <mesh geometry={geometries.quarterZ} material={material} />
          <mesh geometry={geometries.quarterX} material={material} />
        </>
      )}
    </group>
  );
}
