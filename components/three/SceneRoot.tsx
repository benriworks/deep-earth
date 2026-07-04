'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export default function SceneRoot() {
  return (
    <div style={{ height: '100dvh' }}>
      <Canvas
        gl={{ localClippingEnabled: true, antialias: true }}
        camera={{ position: [0, 2, 5], fov: 50 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} />
        <mesh>
          <sphereGeometry args={[1, 64, 32]} />
          <meshStandardMaterial color="#4a7abc" />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  );
}
