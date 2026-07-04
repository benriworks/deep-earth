'use client';

import dynamic from 'next/dynamic';

const SceneRoot = dynamic(() => import('./SceneRoot'), { ssr: false });

export default function SceneCanvas() {
  return <SceneRoot />;
}
