'use client';

import { getLayer } from '@/lib/earthData';
import { useUIStore } from '@/stores/useUIStore';

export default function LayerInfo() {
  const selectedLayerId = useUIStore((s) => s.selectedLayerId);

  if (!selectedLayerId) {
    return <p className="text-xs text-muted-foreground">レイヤーを選択してください</p>;
  }

  const layer = getLayer(selectedLayerId);

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-2">
        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: layer.color }} />
        <span className="text-sm font-medium">{layer.nameJa}</span>
        <span className="text-muted-foreground">{layer.nameEn}</span>
      </div>
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1">
        <dt className="text-muted-foreground">深度範囲</dt>
        <dd className="text-right tabular-nums">
          {layer.depthTopKm.toLocaleString()}〜{layer.depthBottomKm.toLocaleString()} km
        </dd>

        <dt className="text-muted-foreground">状態</dt>
        <dd className="text-right">{layer.state === 'solid' ? '固体' : '液体'}</dd>

        <dt className="text-muted-foreground">密度</dt>
        <dd className="text-right tabular-nums">
          {layer.densityGCm3[0]}〜{layer.densityGCm3[1]} g/cm³
        </dd>

        <dt className="text-muted-foreground">温度</dt>
        <dd className="text-right tabular-nums">
          {layer.tempK[0].toLocaleString()}〜{layer.tempK[1].toLocaleString()} K
        </dd>

        <dt className="text-muted-foreground">P波速度</dt>
        <dd className="text-right tabular-nums">
          {layer.vpKmS[0]}〜{layer.vpKmS[1]} km/s
        </dd>

        <dt className="text-muted-foreground">S波速度</dt>
        <dd className="text-right tabular-nums">
          {layer.vsKmS[0]}〜{layer.vsKmS[1]} km/s
        </dd>
      </dl>
    </div>
  );
}
