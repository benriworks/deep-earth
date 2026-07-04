'use client';

import { create } from 'zustand';
import type { LayerId } from '@/types/earth';
import { EARTH_LAYERS } from '@/lib/earthData';

export type CutMode = 'none' | 'half' | 'quarter';

export interface LayerView {
  visible: boolean;
  opacity: number;
}

interface LayerStore {
  cutMode: CutMode;
  /** カット面の向き(Y軸まわりの回転角、度) */
  cutAngleDeg: number;
  showLabels: boolean;
  layerView: Record<LayerId, LayerView>;
  setCutMode: (mode: CutMode) => void;
  setCutAngle: (deg: number) => void;
  setShowLabels: (show: boolean) => void;
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
}

const initialLayerView = Object.fromEntries(
  EARTH_LAYERS.map((l) => [l.id, { visible: true, opacity: 1 }]),
) as Record<LayerId, LayerView>;

export const useLayerStore = create<LayerStore>((set) => ({
  cutMode: 'quarter',
  cutAngleDeg: 0,
  showLabels: true,
  layerView: initialLayerView,
  setCutMode: (cutMode) => set({ cutMode }),
  setCutAngle: (cutAngleDeg) => set({ cutAngleDeg }),
  setShowLabels: (showLabels) => set({ showLabels }),
  setLayerVisible: (id, visible) =>
    set((s) => ({
      layerView: { ...s.layerView, [id]: { ...s.layerView[id], visible } },
    })),
  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layerView: { ...s.layerView, [id]: { ...s.layerView[id], opacity } },
    })),
}));
