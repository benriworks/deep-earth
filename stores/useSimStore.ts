'use client';

import { create } from 'zustand';
import type { ObserverArrival, ShadowZones } from '@/lib/seismic';

/**
 * 地震波シミュレーションの再生制御。
 * 正確な再生時刻は SeismicWaves コンポーネント内の ref が持ち、
 * simTimeSec は UI 表示用に約10Hzで間引き更新される。
 * スクラブは scrubVersion をインクリメントして 3D 側に通知する。
 */
interface SimStore {
  /** 地震波シミュレーションが有効か(震源設定済みか) */
  active: boolean;
  playing: boolean;
  /** シミュレーション時刻 (秒)。UI 表示・スクラブ用 */
  simTimeSec: number;
  /** 実時間1秒あたりのシミュレーション秒数 */
  timeScale: number;
  /** シミュレーション最大時刻 (秒)。波面テーブルと合わせる */
  maxTimeSec: number;
  /** 震源: 深さ (km) と断面円周上の角度 (度、0=真上・時計回り) */
  sourceDepthKm: number;
  sourceAngleDeg: number;
  showP: boolean;
  showS: boolean;
  /** スクラブ操作の通知カウンタ(3D 側が subscribe する) */
  scrubVersion: number;
  /** 観測点の震央距離 (度)。断面円周上に配置される */
  observerDistsDeg: number[];
  /** 観測点表示の ON/OFF */
  showObservers: boolean;
  /** 各観測点の P/S 初動走時(震源設定時に事前計算テーブルから導出) */
  arrivals: ObserverArrival[] | null;
  /** シャドウゾーン(観測データから求めた値) */
  shadowZones: ShadowZones | null;
  start: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  scrubTo: (sec: number) => void;
  setTimeScale: (scale: number) => void;
  setSource: (depthKm: number, angleDeg: number) => void;
  setShowP: (show: boolean) => void;
  setShowS: (show: boolean) => void;
  setShowObservers: (show: boolean) => void;
  /** 3D 側からの間引き時刻更新(UI から呼ばない) */
  _setSimTime: (sec: number) => void;
  /** 3D 側が波面テーブル計算時に走時解析結果を共有する(UI から呼ばない) */
  _setAnalysis: (arrivals: ObserverArrival[] | null, shadowZones: ShadowZones | null) => void;
}

export const useSimStore = create<SimStore>((set) => ({
  active: false,
  playing: false,
  simTimeSec: 0,
  timeScale: 120,
  maxTimeSec: 2600,
  sourceDepthKm: 0,
  sourceAngleDeg: 0,
  showP: true,
  showS: true,
  scrubVersion: 0,
  observerDistsDeg: [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180],
  showObservers: true,
  arrivals: null,
  shadowZones: null,
  start: () =>
    set((s) => ({
      active: true,
      playing: true,
      simTimeSec: 0,
      scrubVersion: s.scrubVersion + 1,
    })),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  stop: () =>
    set((s) => ({
      active: false,
      playing: false,
      simTimeSec: 0,
      scrubVersion: s.scrubVersion + 1,
    })),
  scrubTo: (sec) =>
    set((s) => ({
      simTimeSec: Math.min(Math.max(sec, 0), s.maxTimeSec),
      scrubVersion: s.scrubVersion + 1,
    })),
  setTimeScale: (timeScale) => set({ timeScale }),
  setSource: (sourceDepthKm, sourceAngleDeg) => set({ sourceDepthKm, sourceAngleDeg }),
  setShowP: (showP) => set({ showP }),
  setShowS: (showS) => set({ showS }),
  setShowObservers: (showObservers) => set({ showObservers }),
  _setSimTime: (simTimeSec) => set({ simTimeSec }),
  _setAnalysis: (arrivals, shadowZones) => set({ arrivals, shadowZones }),
}));
