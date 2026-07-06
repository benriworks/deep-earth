# 07. GitHub / 既存リポジトリ照合結果 v3

更新日: 2026-07-06  
対象: `benriworks/deep-earth` / `main`

## 1. 結論

`benriworks/deep-earth` は GitHub Public リポジトリとして確認できた。v2 で残していた「private / 未取得 / 抽象パス」前提は、v3 では不要になった。

火山機能は、新規の独立ページではなく既存 `/simulator` 画面の 3D Canvas に layer として追加する。

## 2. 確認済み構成

| 項目 | 確認結果 |
|---|---|
| Repository | `benriworks/deep-earth` |
| Visibility | Public |
| Branch | `main` |
| Commits | GitHub UI上で 21 commits 表示 |
| Root folders | `.claude`, `app`, `components`, `lib`, `public`, `stores`, `types` |
| App route | `app/simulator/page.tsx` |
| 3D root | `components/three/` |
| Panel root | `components/panel/` |
| Lib root | `lib/` |
| Store root | `stores/` |
| Type root | `types/` |
| Asset root | `public/` |

## 3. package / framework

`package.json` から確認した前提:

| 項目 | 内容 |
|---|---|
| `name` | `deep-earth` |
| `version` | `0.1.0` |
| `private` | `true`。これは npm publish 防止の意味で、GitHub repository visibility とは別 |
| Next.js | `15.5.20` |
| React | `19.1.0` |
| Three | `three ^0.185.1` |
| R3F | `@react-three/fiber ^9.6.1` |
| Drei | `@react-three/drei ^10.7.7` |
| Zustand | `^5.0.14` |
| Vitest | `^4.1.9` |
| TypeScript | `^5` |
| scripts | `dev`, `build`, `start`, `lint`, `test`, `format` |

追加 install は基本不要。既存バージョンを尊重する。

## 4. tsconfig / alias

`tsconfig.json` は `strict: true` で、`@/*` が `./*` に解決される。したがって v3 のコード例は以下の import を使う。

```ts
import { demoVolcanoes } from '@/lib/volcanoData';
import type { VolcanoFeature } from '@/types/volcano';
import { useLayerStore } from '@/stores/useLayerStore';
```

## 5. 実パス対応表

| v2 抽象名 | v3 実パス | 備考 |
|---|---|---|
| `APP_ROOT` | `app/` | App Router |
| `SIMULATOR_ROUTE` | `app/simulator/page.tsx` | 既存画面へ統合 |
| `THREE_COMPONENT_ROOT` | `components/three/` | 火山コンポーネント追加先 |
| `PANEL_COMPONENT_ROOT` | `components/panel/` | UI追加先 |
| `VOLCANO_COMPONENT_ROOT` | `components/three/` | 既存がフラットなのでPhase Aでは直下 |
| `VOLCANO_LIB_ROOT` | `lib/` | `eruptionModel.ts`, `mantleSampler.ts` |
| `STORE_ROOT` | `stores/` | `useVolcanoStore.ts` 新設 |
| `TYPE_ROOT` | `types/` | `volcano.ts` 新設 |
| `ASSET_ROOT` | `public/models/volcano/` | 新規作成 |
| `TEXTURE_ROOT` | `public/textures/volcano/` | 必要時に新規作成 |

## 6. 既存 3D 実装

`components/three/` には以下が確認できた。

```txt
EarthLayers.tsx
MantleConvection.tsx
Observers.tsx
Probe.tsx
SceneCanvas.tsx
SceneRoot.tsx
SeismicWaves.tsx
ShadowArcs.tsx
cutPlane.ts
useCutPlanes.ts
```

`SceneCanvas.tsx` は client component で、`SceneRoot` を `dynamic(() => import('./SceneRoot'), { ssr: false })` で読み込む。`SceneRoot.tsx` は Canvas の本体で、既存の地球レイヤー、プローブ、地震波、観測点、シャドウゾーン、マントル対流を配置する。

火山は以下のように追加する。

```tsx
import { VolcanoLayer } from './VolcanoLayer';

// Canvas内
<EarthLayers />
<VolcanoLayer />
<Probe />
<SeismicWaves />
<Observers />
<ShadowArcs />
<MantleConvection />
```

## 7. マントル連動の接続先

`lib/convection.ts` には以下がある。

```ts
export const CELL_PAIRS = 5;
export const MANTLE_INNER = toSceneRadius(getLayer('lowerMantle').radiusInnerKm);
export const MANTLE_OUTER = toSceneRadius(getLayer('upperMantle').radiusOuterKm);
export function convectionVelocity(r: number, theta: number): [number, number];
export function randomMantleParticle(rng?: () => number): [number, number];
```

この速度場は「カット断面の2D極座標」なので、火山の完全3D地理位置と直接一致するものではない。v3 では `lib/mantleSampler.ts` を adapter として置き、`mantleThetaDeg ?? lon` をデモ用 `theta` に変換して使う。

## 8. Store の接続方針

`stores/` には以下が確認できた。

```txt
useLayerStore.ts
useProbeStore.ts
useQuizStore.ts
useSimStore.ts
useTourStore.ts
useUIStore.ts
```

- `useLayerStore.ts` に `showVolcanoes` を追加する。
- `useSimStore.ts` は地震波シミュレーション用なので、火山状態を追加しない。
- 火山固有の debug / selected state は `useVolcanoStore.ts` を新設する。

## 9. public assets

`public/` は存在するが、確認時点では default SVG が中心で `models/volcano/` は存在しない。Phase A で以下を追加する。

```txt
public/models/volcano/volcano_v001.glb
```

Phase D で以下を追加する。

```txt
public/models/volcano/volcano_v001_low.glb
public/models/volcano/volcano_v001_mid.glb
public/models/volcano/volcano_v001_high.glb
```

## 10. v2から反映した変更

| 資料 | v3での反映 |
|---|---|
| `README.md` | private / 未取得記述を削除し、実パス・実技術スタックに置換 |
| `00` | 実リポジトリ構成、`SceneRoot.tsx` 接続、store責務分担を明記 |
| `01` | GLB配置先を `public/models/volcano/volcano_v001.glb` に確定 |
| `02` | 既存R3F構成に合わせ、追加依存なしの particle 方針へ整理 |
| `03` | `lib/convection.ts` adapter 方針に確定 |
| `04` | 既存 `Stats` / 60FPS方針に合わせ性能目標を更新 |
| `05` | `PR-0 Repository Audit` を完了扱いにし、PR-1から開始できるよう変更 |
| `06` | import path を `@/` alias と実パスに統一 |
| `08` | 独立ページ案ではなく、既存 `SceneRoot.tsx` への fallback差し込み案に変更 |

## 11. 未確認 / 実装時に再確認すること

GitHub Web UI と raw file で主要構成は確認済みだが、実装前にローカルで以下を再確認する。

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```

また、`SceneRoot.tsx` の JSX は raw 表示では1行化されて見えるため、実ローカルファイルで挿入位置を確認してから patch する。
