'use client';

import { Switch } from '@/components/ui/switch';
import { useSimStore } from '@/stores/useSimStore';

const SVG_WIDTH = 300;
const SVG_HEIGHT = 140;
const MARGIN = { top: 6, right: 8, bottom: 18, left: 30 };
const MAX_DIST_DEG = 180;
const MAX_TRAVEL_SEC = 1400;

function formatArrival(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}分${s}秒`;
}

function xForDist(distDeg: number): number {
  const plotW = SVG_WIDTH - MARGIN.left - MARGIN.right;
  return MARGIN.left + (distDeg / MAX_DIST_DEG) * plotW;
}

function yForTime(sec: number): number {
  const plotH = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;
  return MARGIN.top + (sec / MAX_TRAVEL_SEC) * plotH;
}

export default function ObserverPanel() {
  const active = useSimStore((s) => s.active);
  const showObservers = useSimStore((s) => s.showObservers);
  const setShowObservers = useSimStore((s) => s.setShowObservers);
  const arrivals = useSimStore((s) => s.arrivals);
  const shadowZones = useSimStore((s) => s.shadowZones);
  const simTimeSec = useSimStore((s) => s.simTimeSec);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">観測点を表示</span>
        <Switch aria-label="観測点を表示" checked={showObservers} onCheckedChange={setShowObservers} />
      </div>

      {!active && (
        <p className="text-xs text-muted-foreground">
          地震を発生させると観測記録が表示されます。
        </p>
      )}

      {active && arrivals && (
        <>
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-3 gap-x-2 text-xs text-muted-foreground">
              <span>震央距離</span>
              <span className="text-right">P初動</span>
              <span className="text-right">S初動</span>
            </div>
            <div className="flex max-h-48 flex-col gap-0.5 overflow-y-auto">
              {arrivals.map((a) => {
                const pFuture = a.pArrivalSec !== null && a.pArrivalSec > simTimeSec;
                const sFuture = a.sArrivalSec !== null && a.sArrivalSec > simTimeSec;
                return (
                  <div
                    key={a.distDeg}
                    className="grid grid-cols-3 gap-x-2 text-xs tabular-nums"
                  >
                    <span className="text-muted-foreground">{a.distDeg}°</span>
                    <span
                      className={`text-right ${pFuture ? 'text-muted-foreground/50' : ''}`}
                    >
                      {a.pArrivalSec === null
                        ? '—'
                        : pFuture
                          ? '(未到達)'
                          : formatArrival(a.pArrivalSec)}
                    </span>
                    <span
                      className={`text-right ${sFuture ? 'text-muted-foreground/50' : ''}`}
                    >
                      {a.sArrivalSec === null
                        ? '—'
                        : sFuture
                          ? '(未到達)'
                          : formatArrival(a.sArrivalSec)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">走時曲線</span>
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              className="h-40 w-full"
              role="img"
              aria-label="震央距離と到達時刻の散布図"
            >
              {/* 軸 */}
              <line
                x1={MARGIN.left}
                y1={MARGIN.top}
                x2={MARGIN.left}
                y2={SVG_HEIGHT - MARGIN.bottom}
                stroke="currentColor"
                strokeOpacity={0.3}
              />
              <line
                x1={MARGIN.left}
                y1={SVG_HEIGHT - MARGIN.bottom}
                x2={SVG_WIDTH - MARGIN.right}
                y2={SVG_HEIGHT - MARGIN.bottom}
                stroke="currentColor"
                strokeOpacity={0.3}
              />
              <text
                x={SVG_WIDTH / 2}
                y={SVG_HEIGHT - 4}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                opacity={0.6}
              >
                震央距離(°)
              </text>
              <text
                x={4}
                y={MARGIN.top + 8}
                textAnchor="start"
                fontSize={8}
                fill="currentColor"
                opacity={0.6}
              >
                走時
              </text>

              {arrivals.flatMap((a) => {
                const points: React.ReactNode[] = [];
                if (a.pArrivalSec !== null && a.pArrivalSec <= simTimeSec) {
                  points.push(
                    <circle
                      key={`p-${a.distDeg}`}
                      cx={xForDist(a.distDeg)}
                      cy={yForTime(a.pArrivalSec)}
                      r={2.5}
                      fill="#38bdf8"
                    />,
                  );
                }
                if (a.sArrivalSec !== null && a.sArrivalSec <= simTimeSec) {
                  points.push(
                    <circle
                      key={`s-${a.distDeg}`}
                      cx={xForDist(a.distDeg)}
                      cy={yForTime(a.sArrivalSec)}
                      r={2.5}
                      fill="#fb7185"
                    />,
                  );
                }
                return points;
              })}
            </svg>
          </div>

          {shadowZones && (
            <div className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
              {shadowZones.sShadowStartDeg !== null && (
                <p>
                  S波は約{Math.round(shadowZones.sShadowStartDeg)}
                  °より遠くに届いていません。S波は液体を伝われないため、これは外核が液体である証拠です。歴史上、この角度から外核の大きさが逆算されました(実際の地球では約103°。本モデルは6層線形近似のため少し小さめに出ます)。
                </p>
              )}
              {shadowZones.pShadow && (
                <p>
                  P波も約{Math.round(shadowZones.pShadow[0])}〜
                  {Math.round(shadowZones.pShadow[1])}
                  °の帯に届きません(核で急に折れ曲がるため)。実際の地球では約103〜143°です。
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
