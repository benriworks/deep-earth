'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SimulatorPanel from '@/components/panel/SimulatorPanel';

export default function SimulatorOverlay() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* デスクトップ: 右上固定オーバーレイ(z-50: 3Dラベルより前面) */}
      <div className="pointer-events-none absolute inset-0 z-50 hidden md:block">
        <div className="pointer-events-auto absolute right-4 top-4 max-h-[calc(100dvh-2rem)] w-80 overflow-y-auto rounded-lg bg-slate-900/80 backdrop-blur">
          <SimulatorPanel />
        </div>
      </div>

      {/* モバイル: 下部固定、開閉トグル(z-50: 3Dラベルより前面) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 md:hidden">
        <div className="pointer-events-auto flex justify-end p-3">
          <Button size="sm" variant="secondary" onClick={() => setMobileOpen((v) => !v)}>
            {mobileOpen ? 'パネルを閉じる' : 'パネルを開く'}
          </Button>
        </div>
        {mobileOpen && (
          <div className="pointer-events-auto max-h-[60dvh] overflow-y-auto rounded-t-lg bg-slate-900/80 backdrop-blur">
            <SimulatorPanel />
          </div>
        )}
      </div>
    </>
  );
}
