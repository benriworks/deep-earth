'use client';

import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useLayerStore } from '@/stores/useLayerStore';
import { useVolcanoStore } from '@/stores/useVolcanoStore';

export default function VolcanoPanel() {
  const showVolcanoes = useLayerStore((s) => s.showVolcanoes);
  const setShowVolcanoes = useLayerStore((s) => s.setShowVolcanoes);
  const volcanoDebugIntensity = useVolcanoStore((s) => s.volcanoDebugIntensity);
  const setVolcanoDebugIntensity = useVolcanoStore((s) => s.setVolcanoDebugIntensity);
  const heightExaggeration = useVolcanoStore((s) => s.heightExaggeration);
  const setHeightExaggeration = useVolcanoStore((s) => s.setHeightExaggeration);
  const radiusExaggeration = useVolcanoStore((s) => s.radiusExaggeration);
  const setRadiusExaggeration = useVolcanoStore((s) => s.setRadiusExaggeration);
  const showVolcanoLabels = useVolcanoStore((s) => s.showVolcanoLabels);
  const setShowVolcanoLabels = useVolcanoStore((s) => s.setShowVolcanoLabels);

  const isAuto = volcanoDebugIntensity === null;
  const sliderValue = isAuto ? 0 : Math.round(volcanoDebugIntensity * 100);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">火山表示</span>
        <Switch
          aria-label="火山表示"
          checked={showVolcanoes}
          onCheckedChange={setShowVolcanoes}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">火山名ラベル</span>
          <Switch
            aria-label="火山名ラベル表示"
            checked={showVolcanoLabels}
            onCheckedChange={setShowVolcanoLabels}
          />
        </div>
        <p className="text-xs text-muted-foreground">火山に近づくと名前を表示します</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">自動(マントル連動)</span>
        <Switch
          aria-label="自動(マントル連動)"
          checked={isAuto}
          onCheckedChange={(checked) => setVolcanoDebugIntensity(checked ? null : 0)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>噴火強度(デバッグ)</span>
          <span className="tabular-nums">{isAuto ? '—' : `${sliderValue}%`}</span>
        </div>
        <Slider
          aria-label="噴火強度(デバッグ)"
          value={sliderValue}
          min={0}
          max={100}
          step={1}
          disabled={isAuto}
          onValueChange={(value) => setVolcanoDebugIntensity((value as number) / 100)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>高さ誇張</span>
          <span className="tabular-nums">{`×${heightExaggeration}`}</span>
        </div>
        <Slider
          aria-label="火山の高さ誇張率"
          value={heightExaggeration}
          min={1}
          max={30}
          step={0.5}
          onValueChange={(value) => setHeightExaggeration(value as number)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>広がり誇張</span>
          <span className="tabular-nums">{`×${radiusExaggeration}`}</span>
        </div>
        <Slider
          aria-label="火山の広がり誇張率"
          value={radiusExaggeration}
          min={1}
          max={14}
          step={0.5}
          onValueChange={(value) => setRadiusExaggeration(value as number)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        ×1 が実スケールです(実際の火山は地球に対して小さすぎて、ほぼ見えなくなります)。高さと広がりを別々に誇張できます。
      </p>

      <p className="text-xs leading-relaxed text-muted-foreground">
        火山とマントル対流の連動は教育用の簡略化です。断面のマントル対流(2D)の上昇流を火山の位置で読み取り、噴火の強さに変換しています。実際の火山活動はプレート運動・マグマの化学組成など多くの要因で決まります。火山のサイズは視認性のため誇張しています(既定: 高さ×14・広がり×4.5。スライダーで調整可能)。
      </p>
    </div>
  );
}
