'use client';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLayerStore, type ConvectionMode, type CutMode } from '@/stores/useLayerStore';

const CUT_MODE_OPTIONS: { value: CutMode; label: string }[] = [
  { value: 'none', label: 'なし' },
  { value: 'half', label: 'ハーフ' },
  { value: 'quarter', label: 'クォーター' },
];

const CONVECTION_OPTIONS: { value: ConvectionMode; label: string }[] = [
  { value: 'heatmap', label: '物理シミュ' },
  { value: 'particles', label: '粒子(軽量)' },
  { value: 'off', label: 'OFF' },
];

export default function CutControls() {
  const cutMode = useLayerStore((s) => s.cutMode);
  const cutAngleDeg = useLayerStore((s) => s.cutAngleDeg);
  const showLabels = useLayerStore((s) => s.showLabels);
  const convectionMode = useLayerStore((s) => s.convectionMode);
  const exaggerateThinLayers = useLayerStore((s) => s.exaggerateThinLayers);
  const setCutMode = useLayerStore((s) => s.setCutMode);
  const setCutAngle = useLayerStore((s) => s.setCutAngle);
  const setShowLabels = useLayerStore((s) => s.setShowLabels);
  const setConvectionMode = useLayerStore((s) => s.setConvectionMode);
  const setExaggerateThinLayers = useLayerStore((s) => s.setExaggerateThinLayers);

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
        <span className="text-xs text-muted-foreground">マントル対流(マグマの動き)</span>
        <Tabs
          value={convectionMode}
          onValueChange={(value) => setConvectionMode(value as ConvectionMode)}
        >
          <TabsList className="w-full" aria-label="マントル対流の表示モード">
            {CONVECTION_OPTIONS.map((opt) => (
              <TabsTrigger key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="text-xs leading-relaxed text-muted-foreground">
          物理シミュ(推奨)は簡略化した2Dブシネスク対流をリアルタイム計算し、プルームの発生・移動を断面に表示します(速度は大幅に誇張)。動作が重い場合は「粒子(軽量)」か OFF に切り替えてください。火山との連動は別の簡易モデルで計算しています。
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">地殻を誇張表示</span>
          <Switch
            aria-label="地殻を誇張表示"
            checked={exaggerateThinLayers}
            onCheckedChange={setExaggerateThinLayers}
          />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          実際の地殻(厚さ35km、半径比0.5%)は細すぎて見えないため、見かけの厚さを誇張します。物性値・地震波・プローブの位置は実スケールのままです。
        </p>
      </div>
    </div>
  );
}
