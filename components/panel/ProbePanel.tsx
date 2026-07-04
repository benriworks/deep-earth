'use client';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { earthProfile } from '@/lib/earthData';
import { useProbeStore, type ProbeStatus } from '@/stores/useProbeStore';

const STATUS_LABEL: Record<ProbeStatus, string> = {
  idle: '待機中',
  descending: '降下中',
  paused: '一時停止',
  arrived: '中心到達',
};

export default function ProbePanel() {
  const armed = useProbeStore((s) => s.armed);
  const status = useProbeStore((s) => s.status);
  const depthKm = useProbeStore((s) => s.depthKm);
  const speedKmPerSec = useProbeStore((s) => s.speedKmPerSec);
  const setArmed = useProbeStore((s) => s.setArmed);
  const pause = useProbeStore((s) => s.pause);
  const resume = useProbeStore((s) => s.resume);
  const reset = useProbeStore((s) => s.reset);
  const setSpeed = useProbeStore((s) => s.setSpeed);

  const layer = earthProfile.layerAt(depthKm);
  const density = earthProfile.densityAt(depthKm);
  const temp = earthProfile.tempAt(depthKm);
  const vp = earthProfile.vpAt(depthKm);
  const vs = earthProfile.vsAt(depthKm);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <div className="flex flex-col gap-0.5">
          <span>投入モード</span>
          <span className="text-muted-foreground">
            ONにすると地球表面をクリックしてプローブを投入できます
          </span>
        </div>
        <Switch checked={armed} onCheckedChange={setArmed} />
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
        <span className="text-muted-foreground">状態</span>
        <span className="text-right">{STATUS_LABEL[status]}</span>

        <span className="text-muted-foreground">現在深度</span>
        <span className="text-right tabular-nums">{Math.round(depthKm).toLocaleString()} km</span>

        <span className="text-muted-foreground">現在の層</span>
        <span className="text-right">{layer.nameJa}</span>

        <span className="text-muted-foreground">密度</span>
        <span className="text-right tabular-nums">{density.toFixed(2)} g/cm³</span>

        <span className="text-muted-foreground">温度</span>
        <span className="text-right tabular-nums">{Math.round(temp).toLocaleString()} K</span>

        <span className="text-muted-foreground">P波速度</span>
        <span className="text-right tabular-nums">{vp.toFixed(2)} km/s</span>

        <span className="text-muted-foreground">S波速度</span>
        <span className="text-right tabular-nums">{vs.toFixed(2)} km/s</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>降下速度</span>
          <span className="tabular-nums">{speedKmPerSec.toLocaleString()} km/s</span>
        </div>
        <Slider
          value={speedKmPerSec}
          min={50}
          max={2000}
          step={10}
          onValueChange={(value) => setSpeed(value as number)}
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={status !== 'descending'}
          onClick={pause}
        >
          一時停止
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={status !== 'paused'}
          onClick={resume}
        >
          再開
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          disabled={status === 'idle'}
          onClick={reset}
        >
          リセット
        </Button>
      </div>
    </div>
  );
}
