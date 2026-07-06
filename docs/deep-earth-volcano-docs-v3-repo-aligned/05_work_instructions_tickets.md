# 05. 作業指示・PRチケット / v3 repository aligned

## 1. ブランチ方針

推奨ブランチ:

```bash
git checkout -b feature/volcano-layer
```

作業は小さなPRに分ける。GLB制作とWeb実装を同時に進めると待ちが発生しやすいため、まず fallback geometry で `/simulator` への接続を通す。

## 2. 検証コマンド

既存 `package.json` に合わせ、以下を使う。

```bash
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
pnpm format
```

`package.json` の scripts は以下の想定である。

```txt
dev    = next dev --turbopack
build  = next build --turbopack
start  = next start
lint   = eslint
test   = vitest run --passWithNoTests
format = prettier --write .
```

## 3. PR-0: Repository Audit / 完了扱い

v2 では未完了だったが、v3 では公開リポジトリを確認済みのため完了扱いとする。

確認済み:

- `app/` root。
- `app/simulator/page.tsx` が既存シミュレータ画面。
- `components/three/SceneCanvas.tsx` が `SceneRoot` を dynamic import。
- `components/three/SceneRoot.tsx` が Canvas の本体。
- `components/three/MantleConvection.tsx` と `lib/convection.ts` が既存マントル対流可視化。
- R3F / Drei / Three / Zustand / Vitest は導入済み。
- `public/models/volcano` は未作成。

## 4. PR-1: 火山データ・型・fallback表示

目的: GLBなしで `/simulator` 上に火山を表示する。

作成/変更:

```txt
types/volcano.ts
lib/volcanoData.ts
components/three/VolcanoFallback.tsx
components/three/VolcanoLayer.tsx
components/three/SceneRoot.tsx
stores/useLayerStore.ts
```

作業:

1. `types/volcano.ts` を作る。
2. `lib/volcanoData.ts` に `demoVolcanoes` を作る。
3. `VolcanoFallback.tsx` を作る。
4. `VolcanoLayer.tsx` で lat/lon から地表配置する。
5. `SceneRoot.tsx` に `<VolcanoLayer />` を追加する。
6. `useLayerStore.ts` に `showVolcanoes` と setter を追加する。

DoD:

- `/simulator` に火山が表示される。
- `showVolcanoes` false で非表示にできる。
- GLBファイルがなくても build が落ちない。
- `pnpm lint`, `pnpm test`, `pnpm build` が通る。

## 5. PR-2: Blender GLB 読み込み

目的: fallback から GLB 読み込みへ切り替えられるようにする。

作成/変更:

```txt
public/models/volcano/volcano_v001.glb
components/three/VolcanoModel.tsx
components/three/VolcanoLayer.tsx
```

作業:

1. Blender で `volcano_v001.glb` を出力する。
2. `VolcanoModel.tsx` で `useGLTF('/models/volcano/volcano_v001.glb')` を使う。
3. GLB scene / material clone を行う。
4. `modelUrl` 指定時だけ GLB を表示し、開発時は fallback に戻せるようにする。
5. `useGLTF.preload()` を追加する。

DoD:

- `public/models/volcano/volcano_v001.glb` を配置すると GLB が表示される。
- material clone が行われている。
- GLB未配置時の fallback 方針が残っている。

## 6. PR-3: 火口発光・煙・溶岩FX

目的: `eruptionIntensity` に応じた見た目を実装する。

作成/変更:

```txt
components/three/EruptionParticles.tsx
components/three/LavaFlowMaterial.tsx
components/three/VolcanoModel.tsx
components/three/VolcanoFallback.tsx
stores/useVolcanoStore.ts
```

作業:

1. `useVolcanoStore.ts` を作り、debug intensity override を持たせる。
2. 火口 / 溶岩 material の emissive を `useFrame` で更新する。
3. `EruptionParticles.tsx` を作る。
4. 粒子数・速度・opacity を `eruptionIntensity` で変える。
5. 高強度時の lava flow 発光を追加する。

DoD:

- intensity 0/0.4/0.8/1.0 の差が視覚的に分かる。
- 毎フレーム React state 更新をしていない。
- material clone により複数火山でも独立して発光できる。

## 7. PR-4: マントル連動・噴火モデル

目的: 既存 `lib/convection.ts` を adapter で読み、噴火強度へ変換する。

作成/変更:

```txt
lib/mantleSampler.ts
lib/eruptionModel.ts
lib/eruptionModel.test.ts
components/three/VolcanoLayer.tsx
```

作業:

1. `sampleMantleForVolcano` を実装する。
2. `computeEruptionIntensity` を実装する。
3. `VolcanoLayer` で target intensity を計算する。
4. `THREE.MathUtils.damp` で表示強度を滑らかにする。
5. Vitest を追加する。
6. UIまたは資料に教育用簡略化の注記を入れる。

DoD:

- `convectionVelocity` から噴火強度が変わる。
- `pnpm test` で eruption model のテストが通る。
- `useSimStore` に火山状態を混ぜていない。

## 8. PR-5: UIパネル統合

目的: ユーザーが火山表示・強度デバッグを操作できるようにする。

候補変更:

```txt
components/panel/VolcanoPanel.tsx
components/panel/SimulatorPanel.tsx
stores/useLayerStore.ts
stores/useVolcanoStore.ts
```

作業:

1. `SimulatorPanel.tsx` に火山セクションを追加する。
2. `showVolcanoes` toggle を置く。
3. debug intensity slider を置く。
4. マントル連動の説明文を表示する。

DoD:

- パネルから火山ON/OFFができる。
- debug slider で見た目を調整できる。
- mobile overlay でも操作できる。

## 9. PR-6: LOD・複数火山・最適化

目的: Phase D の土台を作る。

作業:

1. low/mid GLB を配置する。
2. カメラ距離で LOD を切り替える。
3. `demoVolcanoes` を複数にする。
4. FX 表示をカメラ距離で制限する。
5. `Stats` と Performance panel で測定する。

DoD:

- 複数火山でもFPSが極端に落ちない。
- 遠景で低LODが使われる。
- 透明粒子の数を調整できる。

## 10. レビュー観点

- `SceneRoot.tsx` に新しい Canvas を増やしていないか。
- `useSimStore` に火山固有状態を入れていないか。
- `public/` から参照するURLが `/models/...` になっているか。
- `@/*` alias を既存設定通り使っているか。
- `use client` が必要な component に付いているか。
- 毎フレーム `setState` していないか。
- material が共有されていないか。
- 教育用簡略化の注記があるか。
