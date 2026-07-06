# 99. v3 更新サマリー

更新日: 2026-07-06

## 1. 更新の目的

ユーザーが `benriworks/deep-earth` を公開リポジトリに変更したため、v2 の「private / 未取得」前提を廃止し、GitHub上で確認できた実構成に合わせて改修資料を更新した。

## 2. 反映した主な実構成

- `app/` root の Next.js App Router 構成。
- 既存シミュレータ画面は `app/simulator/page.tsx`。
- 3D実装は `components/three/` に集約。
- `SceneCanvas.tsx` が `SceneRoot.tsx` を dynamic import する。
- `SceneRoot.tsx` が Canvas 本体。
- マントル対流は `components/three/MantleConvection.tsx` と `lib/convection.ts`。
- 地球半径正規化は `lib/earthData.ts`。
- 状態管理は `stores/` の Zustand。
- 静的assetは `public/`。

## 3. v2からの主な差分

| 項目 | v2 | v3 |
|---|---|---|
| GitHub取得 | 未取得前提 | Public確認済み |
| パス | 抽象パス併記 | 実パスに確定 |
| 実装入口 | 独立ページも候補 | 既存 `/simulator` へ統合 |
| Canvas | 未確定 | `components/three/SceneRoot.tsx` |
| 依存 | 追加install候補あり | R3F/Drei/Three導入済みのため追加不要 |
| マントル | adapter候補 | `lib/convection.ts` adapterに確定 |
| Store | 未確定 | `useLayerStore` + `useVolcanoStore` 方針 |
| Fallback | 汎用独立ページ案 | 既存 SceneRoot 差し込み案 |

## 4. 次にやること

1. `PR-1` として、`types/volcano.ts`, `lib/volcanoData.ts`, `VolcanoFallback.tsx`, `VolcanoLayer.tsx` を追加する。
2. `SceneRoot.tsx` に `<VolcanoLayer />` を差し込む。
3. `useLayerStore.ts` に `showVolcanoes` を追加する。
4. `/simulator` で fallback 火山を表示確認する。
5. Blender GLB を `public/models/volcano/volcano_v001.glb` に置いて `VolcanoModel.tsx` へ移行する。
6. `lib/convection.ts` 連動を `lib/mantleSampler.ts` 経由で実装する。

## 5. 注意点

- `package.json` の `private: true` は npm publish 防止であり、GitHub repository visibility とは別。
- `lib/convection.ts` は2D断面モデルなので、Phase C のマントル連動は教育用デモとして注記する。
- 既存READMEの性能方針に合わせ、毎フレームの React state 更新を避ける。
- GLB material は必ず clone して、複数火山間で発光強度が共有されないようにする。
