import type { Metadata } from 'next';
import SceneCanvas from '@/components/three/SceneCanvas';

export const metadata: Metadata = {
  title: 'シミュレータ | 地球地下シミュレータ',
};

export default function SimulatorPage() {
  return <SceneCanvas />;
}
