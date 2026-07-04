'use client';

import { create } from 'zustand';
import type { LayerId } from '@/types/earth';

interface UIStore {
  selectedLayerId: LayerId | null;
  setSelectedLayer: (id: LayerId | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedLayerId: null,
  setSelectedLayer: (selectedLayerId) => set({ selectedLayerId }),
}));
