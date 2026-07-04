'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EARTH_LAYERS, EARTH_RADIUS_KM, earthProfile } from '@/lib/earthData';
import { useProbeStore } from '@/stores/useProbeStore';

type Metric = 'density' | 'temp' | 'velocity';

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: 'density', label: '密度 g/cm³' },
  { value: 'temp', label: '温度 K' },
  { value: 'velocity', label: '地震波速度 km/s' },
];

const BOUNDARY_LABELS: { depthKm: number; label: string | null }[] = [
  { depthKm: 35, label: 'モホ面' },
  { depthKm: 410, label: null },
  { depthKm: 660, label: null },
  { depthKm: 2891, label: 'グーテンベルク面(CMB)' },
  { depthKm: 5150, label: 'レーマン面(ICB)' },
];

const SVG_WIDTH = 300;
const SVG_HEIGHT = 220;
const MARGIN = { top: 6, right: 8, bottom: 8, left: 34 };
const PLOT_W = SVG_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

function yForDepth(depthKm: number): number {
  return MARGIN.top + (depthKm / EARTH_RADIUS_KM) * PLOT_H;
}

/** 深度方向のサンプル点(約80点)+層境界の直前直後を追加して不連続をシャープに描く */
function sampleDepths(): number[] {
  const n = 80;
  const depths: number[] = [];
  for (let i = 0; i <= n; i++) {
    depths.push((i / n) * EARTH_RADIUS_KM);
  }
  const eps = 0.5;
  for (const b of BOUNDARY_LABELS) {
    depths.push(Math.max(0, b.depthKm - eps));
    depths.push(Math.min(EARTH_RADIUS_KM, b.depthKm + eps));
  }
  return Array.from(new Set(depths)).sort((a, b) => a - b);
}

const DEPTHS = sampleDepths();

function buildPath(values: number[], maxValue: number): string {
  const points = DEPTHS.map((d, i) => {
    const x = MARGIN.left + (values[i] / maxValue) * PLOT_W;
    const y = yForDepth(d);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  return `M${points.join(' L')}`;
}

export default function ProfileGraph() {
  const [metric, setMetric] = useState<Metric>('density');
  const status = useProbeStore((s) => s.status);
  const depthKm = useProbeStore((s) => s.depthKm);

  const densityValues = DEPTHS.map((d) => earthProfile.densityAt(d));
  const tempValues = DEPTHS.map((d) => earthProfile.tempAt(d));
  const vpValues = DEPTHS.map((d) => earthProfile.vpAt(d));
  const vsValues = DEPTHS.map((d) => earthProfile.vsAt(d));

  let maxValue = 1;
  if (metric === 'density') maxValue = Math.max(...densityValues) * 1.05;
  if (metric === 'temp') maxValue = Math.max(...tempValues) * 1.05;
  if (metric === 'velocity') maxValue = Math.max(...vpValues, ...vsValues) * 1.05;

  const probeVisible = status !== 'idle';
  const probeY = yForDepth(Math.min(Math.max(depthKm, 0), EARTH_RADIUS_KM));

  return (
    <div className="flex flex-col gap-2">
      <Tabs value={metric} onValueChange={(v) => setMetric(v as Metric)}>
        <TabsList className="w-full">
          {METRIC_OPTIONS.map((opt) => (
            <TabsTrigger key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className="h-56 w-full"
        role="img"
        aria-label="深度と物性値のプロファイル"
      >
        {/* 層の帯色 */}
        {EARTH_LAYERS.map((layer) => (
          <rect
            key={layer.id}
            x={MARGIN.left}
            y={yForDepth(layer.depthTopKm)}
            width={PLOT_W}
            height={yForDepth(layer.depthBottomKm) - yForDepth(layer.depthTopKm)}
            fill={layer.color}
            opacity={0.1}
          />
        ))}

        {/* 軸 */}
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={SVG_HEIGHT - MARGIN.bottom}
          stroke="currentColor"
          strokeOpacity={0.3}
        />

        {/* 層境界の破線 + ラベル */}
        {BOUNDARY_LABELS.map((b) => (
          <g key={b.depthKm}>
            <line
              x1={MARGIN.left}
              y1={yForDepth(b.depthKm)}
              x2={SVG_WIDTH - MARGIN.right}
              y2={yForDepth(b.depthKm)}
              stroke="currentColor"
              strokeOpacity={0.25}
              strokeDasharray="3 3"
            />
            {b.label && (
              <text
                x={SVG_WIDTH - MARGIN.right}
                y={yForDepth(b.depthKm) - 2}
                textAnchor="end"
                fontSize={7}
                fill="currentColor"
                opacity={0.6}
              >
                {b.depthKm.toLocaleString()}km {b.label}
              </text>
            )}
          </g>
        ))}

        {/* データ折れ線 */}
        {metric === 'density' && (
          <path d={buildPath(densityValues, maxValue)} fill="none" stroke="#a78bfa" strokeWidth={1.5} />
        )}
        {metric === 'temp' && (
          <path d={buildPath(tempValues, maxValue)} fill="none" stroke="#fbbf24" strokeWidth={1.5} />
        )}
        {metric === 'velocity' && (
          <>
            <path d={buildPath(vpValues, maxValue)} fill="none" stroke="#38bdf8" strokeWidth={1.5} />
            <path d={buildPath(vsValues, maxValue)} fill="none" stroke="#fb7185" strokeWidth={1.5} />
          </>
        )}

        {/* プローブ現在深度マーカー */}
        {probeVisible && (
          <line
            x1={MARGIN.left}
            y1={probeY}
            x2={SVG_WIDTH - MARGIN.right}
            y2={probeY}
            stroke="#38bdf8"
            strokeWidth={1.5}
          />
        )}
      </svg>

      {metric === 'velocity' && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#38bdf8' }} />
            Vp(P波)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: '#fb7185' }} />
            Vs(S波)
          </span>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        縦軸は深度(上が地表、下が中心)。外核(2891〜5150km)では Vs が0になります — S波は液体を伝われないためです。
      </p>
    </div>
  );
}
