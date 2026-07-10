'use client';

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Stats } from '@react-three/drei';
import { Atmosphere } from './Atmosphere';
import { EarthLayers } from './EarthLayers';
import { VolcanoLayer } from './VolcanoLayer';
import { Probe } from './Probe';
import { SeismicWaves } from './SeismicWaves';
import { MagmaHeatmap } from './MagmaHeatmap';
import { MantleConvection } from './MantleConvection';
import { Observers } from './Observers';
import { ShadowArcs } from './ShadowArcs';
import { useLayerStore } from '@/stores/useLayerStore';
import { useProbeStore } from '@/stores/useProbeStore';
import { useSimStore } from '@/stores/useSimStore';
import { useUIStore } from '@/stores/useUIStore';

export default function SceneRoot() {
  // 開発時のみ、コンソールからの動作確認用にストアを公開する
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      Object.assign(window, {
        __stores: {
          sim: useSimStore,
          layer: useLayerStore,
          probe: useProbeStore,
          ui: useUIStore,
        },
      });
    }
  }, []);

  return (
    <div className="h-dvh w-full bg-slate-950">
      <Canvas
        gl={{ localClippingEnabled: true, antialias: true }}
        camera={{ position: [1.9, 1.2, 1.9], fov: 45 }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <directionalLight position={[-4, -2, -4]} intensity={0.3} />
        <Stars radius={50} depth={20} count={2500} factor={3} fade speed={0} />
        <EarthLayers />
        <Atmosphere />
        <VolcanoLayer />
        <Probe />
        <SeismicWaves />
        <Observers />
        <ShadowArcs />
        <MagmaHeatmap />
        <MantleConvection />
        <OrbitControls makeDefault enableDamping minDistance={1.3} maxDistance={6} />
        {process.env.NODE_ENV === 'development' && <Stats />}
      </Canvas>
    </div>
  );
}
