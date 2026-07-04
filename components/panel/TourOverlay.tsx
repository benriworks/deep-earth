'use client';

import { Button } from '@/components/ui/button';
import { TOUR_STEPS, useTourStore } from '@/stores/useTourStore';

export default function TourOverlay() {
  const currentStepIndex = useTourStore((s) => s.currentStepIndex);
  const startTour = useTourStore((s) => s.startTour);
  const nextStep = useTourStore((s) => s.nextStep);
  const prevStep = useTourStore((s) => s.prevStep);
  const exitTour = useTourStore((s) => s.exitTour);

  if (currentStepIndex === null) {
    return (
      <div className="pointer-events-none absolute inset-0 z-50">
        <div className="pointer-events-auto absolute bottom-4 left-4">
          <Button size="sm" variant="secondary" onClick={startTour}>
            🧭 ガイドツアー
          </Button>
        </div>
      </div>
    );
  }

  const step = TOUR_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <div
        role="dialog"
        aria-label="ガイドツアー"
        className="pointer-events-auto absolute bottom-4 left-4 w-full max-w-[calc(100vw-1.5rem)] rounded-lg bg-slate-900/90 backdrop-blur p-4 shadow-lg md:max-w-md"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            ステップ {currentStepIndex + 1} / {TOUR_STEPS.length}
          </p>
          <Button size="icon-xs" variant="ghost" onClick={exitTour} aria-label="ツアーを閉じる">
            ✕
          </Button>
        </div>
        <h2 className="mt-1 text-sm font-semibold">{step.title}</h2>
        <p
          aria-live="polite"
          className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line text-xs leading-relaxed"
        >
          {step.body}
        </p>
        <div className="mt-3 flex justify-between gap-2">
          <Button size="sm" variant="secondary" onClick={prevStep} disabled={isFirst}>
            ← 戻る
          </Button>
          <Button size="sm" variant="secondary" onClick={isLast ? exitTour : nextStep}>
            {isLast ? 'ツアーを終える' : '次へ →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
