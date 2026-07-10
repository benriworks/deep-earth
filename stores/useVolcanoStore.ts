'use client';

import { create } from 'zustand';

/**
 * 火山固有の状態。地震波用 useSimStore とは混ぜない(docs 00 §7)。
 * debug intensity は null のとき通常計算(activity / マントル連動)に従う。
 */
interface VolcanoStore {
  selectedVolcanoId: string | null;
  /** デバッグ用の噴火強度 override(0..1)。null = 自動計算 */
  volcanoDebugIntensity: number | null;
  showMantleCouplingDebug: boolean;
  /** 高さの誇張率(×1 = 実スケール) */
  heightExaggeration: number;
  /** 広がり(フットプリント)の誇張率。高さと分けて重なりを抑える */
  radiusExaggeration: number;
  /** 近接時の火山名ラベル表示 */
  showVolcanoLabels: boolean;
  setSelectedVolcano: (id: string | null) => void;
  setVolcanoDebugIntensity: (value: number | null) => void;
  setShowMantleCouplingDebug: (show: boolean) => void;
  setHeightExaggeration: (value: number) => void;
  setRadiusExaggeration: (value: number) => void;
  setShowVolcanoLabels: (show: boolean) => void;
}

export const useVolcanoStore = create<VolcanoStore>((set) => ({
  selectedVolcanoId: null,
  volcanoDebugIntensity: null,
  showMantleCouplingDebug: false,
  heightExaggeration: 14,
  radiusExaggeration: 4.5,
  showVolcanoLabels: true,
  setSelectedVolcano: (selectedVolcanoId) => set({ selectedVolcanoId }),
  setVolcanoDebugIntensity: (volcanoDebugIntensity) => set({ volcanoDebugIntensity }),
  setShowMantleCouplingDebug: (showMantleCouplingDebug) =>
    set({ showMantleCouplingDebug }),
  setHeightExaggeration: (heightExaggeration) => set({ heightExaggeration }),
  setRadiusExaggeration: (radiusExaggeration) => set({ radiusExaggeration }),
  setShowVolcanoLabels: (showVolcanoLabels) => set({ showVolcanoLabels }),
}));
