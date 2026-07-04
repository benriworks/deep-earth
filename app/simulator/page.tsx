import type { Metadata } from 'next';
import SceneCanvas from '@/components/three/SceneCanvas';
import SimulatorOverlay from '@/components/panel/SimulatorOverlay';

export const metadata: Metadata = {
  title: 'シミュレータ | 地球地下シミュレータ',
};

export default function SimulatorPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <SceneCanvas />
      <SimulatorOverlay />
    </div>
  );
}
