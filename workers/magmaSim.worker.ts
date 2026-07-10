/// <reference lib="webworker" />

import { MagmaSim, type MagmaSimParams } from '@/lib/magmaSim';

/**
 * マグマ対流シミュレーションの Worker。
 * フィールドを所有して約 30Hz で自走し、温度場(全解像度)と
 * 速度場(低解像度)を約 10Hz でメインへ送る(構造化クローン)。
 * pause 中も場は保持し、resume で暖まった対流を継続する。
 */

type IncomingMessage =
  | { type: 'init'; params?: Partial<MagmaSimParams> }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'reset' }
  | { type: 'setParams'; params: Partial<MagmaSimParams> };

export type MagmaFrameMessage = {
  type: 'frame';
  temperature: Float32Array;
  velocity: Float32Array;
  nTheta: number;
  nR: number;
  velocityTheta: number;
  velocityR: number;
  maxVelocity: number;
  step: number;
};

const TICK_MS = 33; // ≈30Hz
const SUBSTEPS_PER_TICK = 6;
const SEND_EVERY_TICKS = 3; // ≈10Hz
const VELOCITY_THETA = 64;
const VELOCITY_R = 24;

let sim: MagmaSim | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let tickCount = 0;
let totalSteps = 0;

function sendFrame(): void {
  if (!sim) return;
  const message: MagmaFrameMessage = {
    type: 'frame',
    temperature: sim.getTemperatureFloat32(),
    velocity: sim.getVelocityCoarse(VELOCITY_THETA, VELOCITY_R),
    nTheta: sim.nTheta,
    nR: sim.nR,
    velocityTheta: VELOCITY_THETA,
    velocityR: VELOCITY_R,
    maxVelocity: sim.maxVelocity(),
    step: totalSteps,
  };
  postMessage(message);
}

function tick(): void {
  if (!sim) return;
  sim.stepMany(SUBSTEPS_PER_TICK);
  totalSteps += SUBSTEPS_PER_TICK;
  tickCount++;
  if (tickCount % SEND_EVERY_TICKS === 0) {
    sendFrame();
  }
  timer = setTimeout(tick, TICK_MS);
}

function start(): void {
  if (timer === null && sim) {
    timer = setTimeout(tick, TICK_MS);
  }
}

function stop(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  switch (message.type) {
    case 'init':
      stop();
      sim = new MagmaSim(message.params);
      totalSteps = 0;
      tickCount = 0;
      postMessage({ type: 'ready' });
      sendFrame(); // 初期場を即時に一枚
      start();
      break;
    case 'pause':
      stop();
      break;
    case 'resume':
      start();
      break;
    case 'reset':
      sim?.reset();
      totalSteps = 0;
      sendFrame();
      break;
    case 'setParams':
      if (sim) {
        stop();
        sim = new MagmaSim({ ...sim.params, ...message.params });
        sendFrame();
        start();
      }
      break;
  }
};
