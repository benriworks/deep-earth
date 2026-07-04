'use client';

import { create } from 'zustand';

/**
 * クイズモード。シミュレータで体験した内容の能動想起で理解を定着させる。
 * 設問はアプリ内で実際に観察できる事実に対応させる(解説で該当機能へ誘導)。
 */
export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  /** choices 内の正解インデックス */
  correctIndex: number;
  /** 回答後に表示する解説 */
  explanation: string;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'sw-shadow-why',
    question: '震源の反対側の観測点に S波が届かないのはなぜ?',
    choices: [
      '距離が遠すぎて減衰するから',
      '外核が液体で、S波は液体を伝われないから',
      '内核が固体だから',
    ],
    correctIndex: 1,
    explanation:
      'S波はねじれの波で、液体の中を伝わることができません。届かない領域(S波シャドウゾーン)の存在こそが、外核が液体である証拠になりました。地震を発生させて観測記録パネルで確かめられます。',
  },
  {
    id: 'thinnest-layer',
    question: '地球の層のうち、最も薄いのは?',
    choices: ['地殻', 'マントル遷移層', '内核'],
    correctIndex: 0,
    explanation:
      '地殻は厚さ約35kmで、半径6371kmのわずか0.5%。実スケールの断面ではほぼ見えない薄さです(「地殻を誇張表示」で見やすくできます)。マントル遷移層は250km、内核は半径1221kmあります。',
  },
  {
    id: 'p-vs-s-speed',
    question: 'P波とS波、先に観測点に届くのは?',
    choices: ['P波', 'S波', '同時に届く'],
    correctIndex: 0,
    explanation:
      'P(Primary)波はマントル上部で約8km/s、S(Secondary)波は約4.5km/sで、P波が先に届きます。走時曲線の2本の系列の差が、震源までの距離の推定にも使われます。',
  },
  {
    id: 'density-trend',
    question: '地球内部の密度は、深くなるほどどうなる?',
    choices: ['浅い所と変わらない', '軽い物質が浮くので減る', '増える(中心で約13g/cm³)'],
    correctIndex: 2,
    explanation:
      '深部ほど圧力が高く、また重い鉄が中心に沈んでいるため、密度は地殻の約2.7g/cm³から中心の約13g/cm³まで増加します。深度プロファイルのグラフとプローブのHUDで確認できます。',
  },
  {
    id: 'core-size-inference',
    question: '誰も行けない外核の大きさを、人類はどうやって知った?',
    choices: [
      '超深度掘削で直接調べた',
      'シャドウゾーンの始まる角度から逆算した',
      '火山から噴出した核の物質を分析した',
    ],
    correctIndex: 1,
    explanation:
      '最深の掘削でも約12kmで、地殻すら貫けません。S波シャドウが始まる震央距離(実際の地球で約103°)から、幾何学的に外核の半径が計算されました。「届かなかった波」が地球の中身を教えてくれたのです。',
  },
  {
    id: 'why-bend',
    question: '地震波の進む道筋(波線)が曲がるのはなぜ?',
    choices: [
      '地球の重力に引かれるから',
      '深さによって波の速度が変わるから',
      'マントル対流に流されるから',
    ],
    correctIndex: 1,
    explanation:
      '深いほど速度が上がるため波線は上向きに曲がり(屈折)、核との境界のように速度が急に変わる場所では大きく折れ曲がります(スネルの法則)。この屈折がP波シャドウゾーンを作ります。',
  },
  {
    id: 'inner-core-discovery',
    question: '固体の内核を1936年に発見したのは?',
    choices: ['アンドリヤ・モホロビチッチ', 'ベノー・グーテンベルク', 'インゲ・レーマン'],
    correctIndex: 2,
    explanation:
      'デンマークの地震学者インゲ・レーマンは、P波シャドウゾーンの中にかすかに届く波を説明するには「核の中にさらに固体の芯がある」と考えるしかないことを示しました。内核と外核の境界は「レーマン面」と呼ばれます。',
  },
];

interface QuizStore {
  /** クイズモードが開いているか */
  active: boolean;
  currentIndex: number;
  /** 現在の設問で選択した選択肢(null = 未回答) */
  selectedIndex: number | null;
  correctCount: number;
  /** 最終問題まで回答し終えて結果表示中か */
  finished: boolean;
  startQuiz: () => void;
  answer: (choiceIndex: number) => void;
  nextQuestion: () => void;
  exitQuiz: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
  active: false,
  currentIndex: 0,
  selectedIndex: null,
  correctCount: 0,
  finished: false,
  startQuiz: () =>
    set({ active: true, currentIndex: 0, selectedIndex: null, correctCount: 0, finished: false }),
  answer: (choiceIndex) => {
    const { selectedIndex, currentIndex, correctCount } = get();
    if (selectedIndex !== null) return; // 回答済みは変更不可
    const correct = QUIZ_QUESTIONS[currentIndex].correctIndex === choiceIndex;
    set({ selectedIndex: choiceIndex, correctCount: correctCount + (correct ? 1 : 0) });
  },
  nextQuestion: () => {
    const { currentIndex, selectedIndex } = get();
    if (selectedIndex === null) return; // 未回答では進めない
    if (currentIndex >= QUIZ_QUESTIONS.length - 1) {
      set({ finished: true });
    } else {
      set({ currentIndex: currentIndex + 1, selectedIndex: null });
    }
  },
  exitQuiz: () => set({ active: false }),
}));
