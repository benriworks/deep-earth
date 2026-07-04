'use client';

import { create } from 'zustand';
import { useLayerStore } from '@/stores/useLayerStore';
import { useProbeStore } from '@/stores/useProbeStore';
import { useSimStore } from '@/stores/useSimStore';
import { useUIStore } from '@/stores/useUIStore';

/**
 * ガイド付き解説ツアー。各ステップの apply() は既存ストアの setter を
 * 呼んでプリセット状態を再現するだけで、新しい 3D 実装を持たない。
 * 文面の年代・角度は教科書レベルの史実(実装モデルとの差は本文中で明示)。
 */
export interface TourStep {
  id: string;
  title: string;
  /** 本文。改行は whitespace-pre-line で表示する想定 */
  body: string;
  apply: () => void;
}

/** 地震を有効化して指定時刻で一時停止する(未開始なら開始してから) */
function ensureQuakeAt(timeSec: number | null) {
  const sim = useSimStore.getState();
  if (!sim.active) {
    sim.setSource(0, 0);
    sim.start();
  }
  if (timeSec !== null) {
    sim.scrubTo(timeSec);
    sim.pause();
  }
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'layers',
    title: '① 地球の中をのぞく',
    body: '地球は玉ねぎのような同心の層でできています。断面の色分けが、地殻・マントル(上部/遷移層/下部)・外核・内核の6つの層です。ドラッグで回して、断面をいろいろな角度から見てみましょう。',
    apply: () => {
      const layer = useLayerStore.getState();
      layer.setCutMode('quarter');
      layer.setShowLabels(true);
      layer.setShowConvection(false);
      layer.setExaggerateThinLayers(false);
      useSimStore.getState().stop();
      useProbeStore.getState().reset();
      useUIStore.getState().setSelectedLayer(null);
    },
  },
  {
    id: 'crust',
    title: '② 地殻はりんごの皮より薄い',
    body: '私たちが立っている地殻は、厚さ約35km。地球の半径6371kmに対してわずか0.5%で、この図ではほとんど見えない細い線です(パネルの「地殻を誇張表示」で見やすくできます)。人類が掘った最も深い穴(約12km)でも、地殻すら貫通していません。\n\nでは、誰も行けない地球の中身を、人類はどうやって知ったのでしょうか?',
    apply: () => {
      useUIStore.getState().setSelectedLayer('crust');
    },
  },
  {
    id: 'probe',
    title: '③ 仮想プローブで深部への旅',
    body: '仮想プローブで地心まで潜ってみましょう。深くなるほど密度と温度が上がっていきます。「深度プロファイル」のグラフでは、層の境界で値が急に飛ぶ(不連続になる)ことに注目してください。この「飛び」こそが層の境界の実体です。',
    apply: () => {
      const d = [0.55, 0.35, 0.55];
      const len = Math.hypot(d[0], d[1], d[2]);
      const probe = useProbeStore.getState();
      probe.reset();
      probe.setSpeed(400);
      probe.launch([d[0] / len, d[1] / len, d[2] / len]);
    },
  },
  {
    id: 'quake',
    title: '④ 地震を起こす — P波とS波',
    body: '地球深部の情報を運んでくれるのは地震波です。地震を発生させました。速いP波(シアン)と遅いS波(ローズ)が地球内部へ広がっていきます。P波は押し引きの波でどんな物質も通れますが、S波はねじれの波で、液体の中を伝われません。この性質があとで効いてきます。',
    apply: () => {
      useLayerStore.getState().setCutMode('half');
      const sim = useSimStore.getState();
      sim.setSource(0, 0);
      sim.setTimeScale(200);
      sim.start();
    },
  },
  {
    id: 'observers',
    title: '⑤ 観測点の記録 — 科学の一次データ',
    body: '円周に並ぶ点は地震観測点です。波が届くと色が変わります(P波のみ=シアン、P波+S波=白)。「観測記録」セクションの走時表と走時曲線が、まさに地震学者が実際に使う一次データです。震央距離が遠いほど到達が遅い——この曲線の形から内部の速度構造が逆算できます。',
    apply: () => {
      useSimStore.getState().setShowObservers(true);
      ensureQuakeAt(600);
    },
  },
  {
    id: 'shadow',
    title: '⑥ S波が消えた — 液体外核の発見',
    body: 'シミュレーションを最後まで進めると、震源から約93°より遠い観測点にはS波が永遠に届きません(S波シャドウゾーン)。\n\n「S波は液体を伝われない」——つまり、S波が届かない領域があるという観測事実から、「地球の中心部には液体の層(外核)がある」と逆算できたのです。シャドウの始まる角度から外核の大きさまで計算できました。誰も見たことのない外核の存在は、こうして「届かなかった波」が教えてくれました。\n\n(実際の地球ではシャドウは約103°から。本モデルは6層線形近似のため少し小さめに出ます)',
    apply: () => {
      ensureQuakeAt(2200);
    },
  },
  {
    id: 'refraction',
    title: '⑦ 波は曲がる — P波シャドウ',
    body: '波面をよく見ると、波はまっすぐ進んでいません。深いほど速度が上がるため波線は上向きに曲がり(屈折)、核との境界では速度が急に落ちるため大きく折れ曲がります。\n\nその結果、P波にも届きにくい帯(P波シャドウ、本モデルで約91〜118°、実際は約103〜143°)ができます。この帯の存在と幅が、核の深さを教えてくれました。',
    apply: () => {
      ensureQuakeAt(900);
    },
  },
  {
    id: 'history',
    title: '⑧ 発見の歴史 — 波が描いた地球の解剖図',
    body: 'この地図は、すべて地震波の観測記録から描かれました。\n\n・1906年 オルドハム: 走時の異常から地球に核があることを示す\n・1909年 モホロビチッチ: 地殻とマントルの境界(モホ面)を発見\n・1913年 グーテンベルク: 核の深さ約2900kmを決定(グーテンベルク面)\n・1936年 インゲ・レーマン: P波シャドウの中に届くかすかな波から、固体の内核を発見(レーマン面)\n\n地球に一度も潜らずに、人類は「届いた波」と「届かなかった波」だけで地球の中身を解剖してみせたのです。あなたが今見た走時表は、その推論の出発点そのものです。',
    apply: () => {
      ensureQuakeAt(null);
    },
  },
];

interface TourStore {
  /** null = ツアー非表示 */
  currentStepIndex: number | null;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  exitTour: () => void;
}

export const useTourStore = create<TourStore>((set, get) => ({
  currentStepIndex: null,
  startTour: () => {
    TOUR_STEPS[0].apply();
    set({ currentStepIndex: 0 });
  },
  nextStep: () => {
    const i = get().currentStepIndex;
    if (i === null || i >= TOUR_STEPS.length - 1) return;
    TOUR_STEPS[i + 1].apply();
    set({ currentStepIndex: i + 1 });
  },
  prevStep: () => {
    const i = get().currentStepIndex;
    if (i === null || i <= 0) return;
    TOUR_STEPS[i - 1].apply();
    set({ currentStepIndex: i - 1 });
  },
  exitTour: () => set({ currentStepIndex: null }),
}));
