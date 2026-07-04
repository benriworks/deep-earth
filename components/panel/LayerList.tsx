'use client';

import { cn } from '@/lib/utils';
import { EARTH_LAYERS } from '@/lib/earthData';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { useLayerStore } from '@/stores/useLayerStore';
import { useUIStore } from '@/stores/useUIStore';

export default function LayerList() {
  const layerView = useLayerStore((s) => s.layerView);
  const setLayerVisible = useLayerStore((s) => s.setLayerVisible);
  const setLayerOpacity = useLayerStore((s) => s.setLayerOpacity);
  const selectedLayerId = useUIStore((s) => s.selectedLayerId);
  const setSelectedLayer = useUIStore((s) => s.setSelectedLayer);

  return (
    <div className="flex flex-col gap-1">
      {EARTH_LAYERS.map((layer) => {
        const view = layerView[layer.id];
        const isSelected = selectedLayerId === layer.id;
        return (
          <div
            key={layer.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedLayer(layer.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedLayer(layer.id);
              }
            }}
            className={cn(
              'flex cursor-pointer flex-col gap-1.5 rounded-md px-2 py-1.5 transition-colors',
              isSelected ? 'bg-white/10' : 'hover:bg-white/5',
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: layer.color }}
              />
              <span className="flex-1 truncate text-sm">{layer.nameJa}</span>
              <Switch
                size="sm"
                checked={view.visible}
                onCheckedChange={(visible) => setLayerVisible(layer.id, visible)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div
              className="flex items-center gap-2 pl-5"
              onClick={(e) => e.stopPropagation()}
            >
              <Slider
                className="flex-1"
                value={Math.round(view.opacity * 100)}
                min={0}
                max={100}
                step={1}
                disabled={!view.visible}
                onValueChange={(value) => setLayerOpacity(layer.id, (value as number) / 100)}
              />
              <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {Math.round(view.opacity * 100)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
