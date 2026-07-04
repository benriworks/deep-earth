'use client';

import { create } from 'zustand';
import { EARTH_RADIUS_KM } from '@/lib/earthData';

export type ProbeStatus = 'idle' | 'descending' | 'paused' | 'arrived';

interface ProbeStore {
  /** 投入モード: ON のとき地表クリックでプローブを投入する */
  armed: boolean;
  status: ProbeStatus;
  /** 投入地点の方向(地心からの単位ベクトル)。未投入時は null */
  targetDirection: [number, number, number] | null;
  /**
   * 現在深度 (km)。HUD 表示用に約10Hzへ間引いて更新される。
   * 毎フレームの正確な値は Probe コンポーネント内の ref が持つ。
   */
  depthKm: number;
  /** 降下速度 (km/秒)。教育用に大きく誇張した値 */
  speedKmPerSec: number;
  setArmed: (armed: boolean) => void;
  launch: (direction: [number, number, number]) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (speedKmPerSec: number) => void;
  /** Probe コンポーネントからの間引き更新用(UI から呼ばない) */
  _setDepth: (depthKm: number) => void;
  _arrive: () => void;
}

export const useProbeStore = create<ProbeStore>((set) => ({
  armed: false,
  status: 'idle',
  targetDirection: null,
  depthKm: 0,
  speedKmPerSec: 300,
  setArmed: (armed) => set({ armed }),
  launch: (targetDirection) =>
    set({ targetDirection, status: 'descending', depthKm: 0, armed: false }),
  pause: () => set((s) => (s.status === 'descending' ? { status: 'paused' } : {})),
  resume: () => set((s) => (s.status === 'paused' ? { status: 'descending' } : {})),
  reset: () => set({ status: 'idle', targetDirection: null, depthKm: 0 }),
  setSpeed: (speedKmPerSec) => set({ speedKmPerSec }),
  _setDepth: (depthKm) => set({ depthKm: Math.min(depthKm, EARTH_RADIUS_KM) }),
  _arrive: () => set({ status: 'arrived', depthKm: EARTH_RADIUS_KM }),
}));
