'use client';

import { create } from 'zustand';

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
  start: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  scrubTo: (sec: number) => void;
  setTimeScale: (scale: number) => void;
  setSource: (depthKm: number, angleDeg: number) => void;
  setShowP: (show: boolean) => void;
  setShowS: (show: boolean) => void;
  /** 3D 側からの間引き時刻更新(UI から呼ばない) */
  _setSimTime: (sec: number) => void;
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
  _setSimTime: (simTimeSec) => set({ simTimeSec }),
}));
