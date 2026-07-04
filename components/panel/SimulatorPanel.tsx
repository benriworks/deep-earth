'use client';

import CutControls from '@/components/panel/CutControls';
import LayerList from '@/components/panel/LayerList';
import LayerInfo from '@/components/panel/LayerInfo';
import ProbePanel from '@/components/panel/ProbePanel';
import ProfileGraph from '@/components/panel/ProfileGraph';
import SeismicPanel from '@/components/panel/SeismicPanel';
import ObserverPanel from '@/components/panel/ObserverPanel';
import ScienceNote from '@/components/panel/ScienceNote';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-white/10 pt-3 first:border-t-0 first:pt-0">
      <h2 className="text-xs font-semibold tracking-wide text-white/70 uppercase">{title}</h2>
      {children}
    </section>
  );
}

export default function SimulatorPanel() {
  return (
    <div className="flex flex-col gap-3 p-3 text-slate-100">
      <Section title="断面カット">
        <CutControls />
      </Section>
      <Section title="レイヤー">
        <LayerList />
      </Section>
      <Section title="レイヤー詳細">
        <LayerInfo />
      </Section>
      <Section title="プローブ">
        <ProbePanel />
      </Section>
      <Section title="深度プロファイル">
        <ProfileGraph />
      </Section>
      <Section title="地震波">
        <SeismicPanel />
      </Section>
      <Section title="観測記録">
        <ObserverPanel />
      </Section>
      <Section title="注記">
        <ScienceNote />
      </Section>
    </div>
  );
}
