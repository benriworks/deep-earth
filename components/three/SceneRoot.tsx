'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stats } from '@react-three/drei';
import { EarthLayers } from './EarthLayers';

export default function SceneRoot() {
  return (
    <div className="h-dvh w-full bg-slate-950">
      <Canvas
        gl={{ localClippingEnabled: true, antialias: true }}
        camera={{ position: [1.9, 1.2, 1.9], fov: 45 }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <directionalLight position={[-4, -2, -4]} intensity={0.3} />
        <EarthLayers />
        <OrbitControls makeDefault enableDamping minDistance={1.3} maxDistance={6} />
        {process.env.NODE_ENV === 'development' && <Stats />}
      </Canvas>
    </div>
  );
}
