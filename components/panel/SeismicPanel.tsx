'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useLayerStore } from '@/stores/useLayerStore';
import { useSimStore } from '@/stores/useSimStore';

function formatElapsed(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}分${s}秒`;
}

export default function SeismicPanel() {
  const active = useSimStore((s) => s.active);
  const playing = useSimStore((s) => s.playing);
  const simTimeSec = useSimStore((s) => s.simTimeSec);
  const timeScale = useSimStore((s) => s.timeScale);
  const maxTimeSec = useSimStore((s) => s.maxTimeSec);
  const sourceDepthKm = useSimStore((s) => s.sourceDepthKm);
  const sourceAngleDeg = useSimStore((s) => s.sourceAngleDeg);
  const showP = useSimStore((s) => s.showP);
  const showS = useSimStore((s) => s.showS);
  const start = useSimStore((s) => s.start);
  const play = useSimStore((s) => s.play);
  const pause = useSimStore((s) => s.pause);
  const stop = useSimStore((s) => s.stop);
  const scrubTo = useSimStore((s) => s.scrubTo);
  const setTimeScale = useSimStore((s) => s.setTimeScale);
  const setSource = useSimStore((s) => s.setSource);
  const setShowP = useSimStore((s) => s.setShowP);
  const setShowS = useSimStore((s) => s.setShowS);

  const cutMode = useLayerStore((s) => s.cutMode);
  const setCutMode = useLayerStore((s) => s.setCutMode);

  const handleTrigger = () => {
    setSource(sourceDepthKm, sourceAngleDeg);
    if (cutMode === 'none') {
      setCutMode('half');
    }
    start();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>震源の深さ</span>
          <span className="tabular-nums">{Math.round(sourceDepthKm).toLocaleString()} km</span>
        </div>
        <Slider
          value={sourceDepthKm}
          min={0}
          max={700}
          step={10}
          onValueChange={(value) => setSource(value as number, sourceAngleDeg)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>震源の位置</span>
          <span className="tabular-nums">{Math.round(sourceAngleDeg)}°</span>
        </div>
        <Slider
          value={sourceAngleDeg}
          min={0}
          max={360}
          step={5}
          onValueChange={(value) => setSource(sourceDepthKm, value as number)}
        />
      </div>

      <Button size="sm" className="w-full" onClick={handleTrigger}>
        地震を発生させる
      </Button>

      {active && (
        <>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">経過時間</span>
            <span className="tabular-nums">{formatElapsed(simTimeSec)}</span>
          </div>

          <Slider
            value={simTimeSec}
            min={0}
            max={maxTimeSec}
            step={1}
            onValueChange={(value) => scrubTo(value as number)}
          />

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => (playing ? pause() : play())}
            >
              {playing ? '一時停止' : '再生'}
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={stop}>
              停止
            </Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>再生速度</span>
              <span className="tabular-nums">{Math.round(timeScale).toLocaleString()}倍</span>
            </div>
            <Slider
              value={timeScale}
              min={30}
              max={600}
              step={10}
              onValueChange={(value) => setTimeScale(value as number)}
            />
          </div>
        </>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#38bdf8' }} />
          P波表示
        </span>
        <Switch checked={showP} onCheckedChange={setShowP} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#fb7185' }} />
          S波表示
        </span>
        <Switch checked={showS} onCheckedChange={setShowS} />
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
        震源
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        S波は液体の外核を通れないため、震源の反対側には届きません(S波シャドウゾーン)。波面は断面上に表示されます。
      </p>
    </div>
  );
}
