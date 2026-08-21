import type { Metadata } from 'next';
import SceneCanvas from '@/components/three/SceneCanvas';
import SimulatorOverlay from '@/components/panel/SimulatorOverlay';
import TourOverlay from '@/components/panel/TourOverlay';

const siteUrl = 'https://deep-earth.benriwork.jp';
const pageTitle = 'シミュレータ';
const pageDescription =
  '地表から地球の中心まで3Dで潜り、地殻・マントル・外核・内核の層構造や地震波の伝播、マントル対流を操作しながら観察できます。';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: '/simulator' },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: '/simulator',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'ホーム', item: `${siteUrl}/` },
    { '@type': 'ListItem', position: 2, name: 'シミュレータ', item: `${siteUrl}/simulator` },
  ],
};

const learningResourceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LearningResource',
  name: '地球地下シミュレータ',
  url: `${siteUrl}/simulator`,
  description: pageDescription,
  learningResourceType: 'シミュレーション教材',
  educationalLevel: '中学校・高等学校・一般',
  inLanguage: 'ja',
  isAccessibleForFree: true,
  about: ['地球の内部構造', '地震波', 'マントル対流'],
};

export default function SimulatorPage() {
  return (
    <div className="relative h-dvh w-full overflow-hidden bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(learningResourceJsonLd) }}
      />
      <SceneCanvas />
      <SimulatorOverlay />
      <TourOverlay />
    </div>
  );
}
