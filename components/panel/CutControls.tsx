'use client';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLayerStore, type CutMode } from '@/stores/useLayerStore';

const CUT_MODE_OPTIONS: { value: CutMode; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'half', label: 'ハーフ' },
  { value: 'quarter', label: 'クォーター' },
];

export default function CutControls() {
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);
  const showLabels = useLayerStore((s) => s.showLabels);
  const showConvection = useLayerStore((s) => s.showConvection);
  const setCutMode = useLayerStore((s) => s.setCutMode);
  const setCutAngle = useLayerStore((s) => s.setCutAngle);
  const setShowLabels = useLayerStore((s) => s.setShowLabels);
  const setShowConvection = useLayerStore((s) => s.setShowConvection);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">断面カット</span>
        <Tabs
          value={cutMode}
          onValueChange={(value) => setCutMode(value as CutMode)}
        >
          <TabsList className="w-full">
            {CUT_MODE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>カット角度</span>
          <span className="tabular-nums">{Math.round(cutAngleDeg)}°</span>
        </div>
        <Slider
          aria-label="カット角度"
          value={cutAngleDeg}
          min={0}
          max={360}
          step={1}
          disabled={cutMode === 'none'}
          onValueChange={(value) => setCutAngle(value as number)}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">ラベル表示</span>
        <Switch aria-label="ラベル表示" checked={showLabels} onCheckedChange={setShowLabels} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">マントル対流</span>
          <Switch aria-label="マントル対流" checked={showConvection} onCheckedChange={setShowConvection} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          断面にマントル対流の流れを表示します(速度は大幅に誇張)。上昇流=赤、下降流=青。
        </p>
      </div>
    </div>
  );
}
