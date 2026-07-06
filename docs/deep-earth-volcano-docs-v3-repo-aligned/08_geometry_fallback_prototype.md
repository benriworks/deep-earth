# 08. GLBなしで動く仮ジオメトリ火山プロトタイプ / v3

## 1. 目的

Blender GLB の完成を待たずに、既存 `/simulator` 画面上で火山の位置・スケール・噴火強度・煙を検証する。

v2 では独立ページ `app/volcano/page.tsx` も候補だったが、v3 では実リポジトリ構成に合わせ、既存 `components/three/SceneRoot.tsx` へ `VolcanoLayer` として差し込む。

## 2. 最小構成

```txt
types/volcano.ts
lib/volcanoData.ts
components/three/VolcanoFallback.tsx
components/three/EruptionParticles.tsx
components/three/VolcanoLayer.tsx
stores/useLayerStore.ts  # showVolcanoes 追加
components/three/SceneRoot.tsx  # VolcanoLayer 追加
```

この段階では `VolcanoModel.tsx` と GLB は不要。

## 3. 表示仕様

`VolcanoFallback.tsx` は以下の簡易ジオメトリで構成する。

- `coneGeometry`: 火山本体
- `torusGeometry`: 火口縁
- `circleGeometry`: 火口内部の発光面
- `cylinderGeometry`: 溶岩流
- `points`: 噴煙粒子

`eruptionIntensity` で以下を変える。

- 火口 emissiveIntensity
- 溶岩流の高さ / 発光
- 噴煙粒子の高さ / 広がり / opacity

## 4. SceneRoot 差し込み

`components/three/SceneRoot.tsx` に追加する。

```tsx
import { VolcanoLayer } from './VolcanoLayer';
```

Canvas内:

```tsx
<EarthLayers />
<VolcanoLayer />
<Probe />
<SeismicWaves />
<Observers />
<ShadowArcs />
<MantleConvection />
```

## 5. 動作確認手順

```bash
pnpm dev
```

ブラウザで `/simulator` を開き、以下を確認する。

- 地表に火山が1つ表示される。
- OrbitControls で回転しても地表に貼り付いて見える。
- 火口が赤く発光する。
- 強度を上げると煙が増える。
- `showVolcanoes` を false にすると非表示になる。

## 6. GLB へ差し替える時の条件

以下ができたら `VolcanoFallback` から `VolcanoModel` へ移行する。

- `public/models/volcano/volcano_v001.glb` が配置済み。
- GLB内 object / material 名が命名規約に沿っている。
- `VolcanoModel.tsx` が scene / material clone を行っている。
- `useGLTF.preload('/models/volcano/volcano_v001.glb')` が404にならない。

## 7. プロトタイプの完了条件

- GLBなしで `/simulator` に火山が見える。
- `VolcanoFeature` の lat/lon を変えると配置位置が変わる。
- `heightKm` / `baseRadiusKm` を変えると見た目のサイズが変わる。
- build が通る。
