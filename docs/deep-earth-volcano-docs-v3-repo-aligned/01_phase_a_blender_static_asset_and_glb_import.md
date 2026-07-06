# 01. Phase A: Blender 静的火山アセット制作 + GLB読み込み・地表配置

## 1. Phase A の目的

Phase A では、静的な成層火山アセットを Blender で作り、`deep-earth` の既存 `/simulator` Canvas に1個以上配置できる状態にする。噴煙やマントル連動は後続 Phase B/C で実装するが、Phase A の時点で `eruptionIntensity` を受け取れる設計にしておく。

## 2. 成果物

```txt
public/models/volcano/volcano_v001.glb
components/three/VolcanoLayer.tsx
components/three/VolcanoModel.tsx
components/three/VolcanoFallback.tsx
lib/volcanoData.ts
types/volcano.ts
```

`public/models/volcano/` は現リポジトリには未作成なので、この Phase で新規作成する。

## 3. Blender 側の命名規約

Web側で制御する部位を分けるため、1つの巨大メッシュにまとめない。

| Object名 | 必須 | 用途 |
|---|---:|---|
| `Volcano_BaseTerrain` | yes | 地表と接する土台。円形/楕円形パッチ |
| `Volcano_Cone` | yes | 火山本体 |
| `Volcano_CraterRim` | yes | 火口の縁 |
| `Volcano_CraterInner` | yes | 火口内部。発光対象 |
| `Volcano_LavaFlow_01` | no | 山腹の溶岩流。Phase B/Cで発光・流速制御 |
| `Volcano_AshLayer` | no | 火山灰、黒い筋、古い溶岩 |
| `Volcano_Rocks` | no | 散乱岩、火山弾 |
| `Volcano_MagmaConduit` | no | 断面表示・将来の地下連動用 |
| `Volcano_MagmaChamber` | no | 将来の地下表示用 |
| `Emitter_CraterSmoke` | yes | 空オブジェクト可。噴煙発生位置 |
| `Emitter_LavaBombs` | no | 火山弾発生位置 |
| `Anchor_SurfaceNormal` | yes | Blender上で +Y を上方向にする基準 |

## 4. Blender モデル制作指針

- 原点は火山の土台中心に置く。
- `+Y` を火山の上方向にする。
- モデル全体の実スケールは任意だが、Web側では `VolcanoFeature.heightKm`, `baseRadiusKm` で最終スケールする。
- 火口内部と溶岩は別 material にする。
- 発光させたい material 名は分かりやすくする。
  - `MAT_Crater_Emissive`
  - `MAT_Lava_Emissive`
  - `MAT_Rock_Dark`
  - `MAT_Ash`
- Web側で material を clone するため、同じ GLB を複数配置しても発光強度が共有されないようにする。

## 5. GLB Export 設定

Blender の glTF 2.0 exporter で以下を推奨する。

| 項目 | 推奨 |
|---|---|
| Format | `glTF Binary (.glb)` |
| Include | Selected Objects |
| Transform | +Y up のモデルとして作る。Web側で法線に回転 |
| Materials | Export |
| Images | GLBに埋め込み、または `public/textures/volcano/` に分離 |
| Compression | Phase Aでは不要。Phase Dで検討 |
| Animation | Phase Aでは不要 |

出力先:

```txt
public/models/volcano/volcano_v001.glb
```

ブラウザからの読み込みURL:

```txt
/models/volcano/volcano_v001.glb
```

Next.js では `public/` 配下のファイルがルート相対URLで配信されるため、コード内では `/models/volcano/volcano_v001.glb` を使う。

## 6. Web側データモデル

`types/volcano.ts` に置く。

```ts
export type VolcanoType =
  | 'stratovolcano'
  | 'shield'
  | 'cinder_cone'
  | 'caldera'
  | 'submarine';

export type VolcanoActivity = {
  heat: number;
  pressure: number;
  gas: number;
  eruption: number;
};

export type VolcanoFeature = {
  id: string;
  name: string;
  type: VolcanoType;
  lat: number;
  lon: number;
  heightKm: number;
  baseRadiusKm: number;
  craterRadiusKm: number;
  mantleSampleDepthKm: number;
  eruptionThreshold: number;
  mantleThetaDeg?: number;
  activity: VolcanoActivity;
  modelUrl?: string;
};
```

`mantleThetaDeg` は既存の `lib/convection.ts` が2D断面の `theta` を使うためのデモ連動パラメータである。将来の完全3D mantle field では廃止または変換する。

## 7. デモデータ

`lib/volcanoData.ts` に置く。

```ts
import type { VolcanoFeature } from '@/types/volcano';

export const demoVolcanoes: VolcanoFeature[] = [
  {
    id: 'volcano-demo-001',
    name: 'Demo Stratovolcano',
    type: 'stratovolcano',
    lat: 32.0,
    lon: 140.0,
    heightKm: 3.2,
    baseRadiusKm: 18,
    craterRadiusKm: 1.2,
    mantleSampleDepthKm: 80,
    eruptionThreshold: 0.58,
    mantleThetaDeg: 140,
    modelUrl: '/models/volcano/volcano_v001.glb',
    activity: {
      heat: 0.25,
      pressure: 0.2,
      gas: 0.25,
      eruption: 0,
    },
  },
];
```

## 8. 地表配置の考え方

火山の土台中心を地球表面の法線方向に置き、Blender の `+Y` を地表法線へ合わせる。

```ts
const up = new THREE.Vector3(0, 1, 0);
const normal = latLonToUnitVector(volcano.lat, volcano.lon);
const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normal);
const position = normal.clone().multiplyScalar(1 + heightScene * 0.03);
```

地球半径を1としたシーンでは、火山の実スケールはかなり小さい。教育表示では見やすくするため `visualScale` を別途設けてよい。

```ts
const VISUAL_EXAGGERATION = 14;
const heightScene = (volcano.heightKm / EARTH_RADIUS_KM) * VISUAL_EXAGGERATION;
const baseScene = (volcano.baseRadiusKm / EARTH_RADIUS_KM) * VISUAL_EXAGGERATION;
```

資料・UIでは「火山の高さ・地殻厚さは視認性のため誇張」と注記する。

## 9. SceneRoot への差し込み

`components/three/SceneRoot.tsx` に以下を追加する。

```tsx
import { VolcanoLayer } from './VolcanoLayer';
```

Canvas内の `EarthLayers` 後に配置する。

```tsx
<EarthLayers />
<VolcanoLayer />
<Probe />
<SeismicWaves />
<Observers />
<ShadowArcs />
<MantleConvection />
```

## 10. GLB 未完成時のフォールバック

Phase A の開発を GLB 待ちで止めないため、`VolcanoFallback.tsx` を用意する。`VolcanoLayer.tsx` では `modelUrl` があり、GLB配置済みなら `VolcanoModel`、未配置・開発中は `VolcanoFallback` を表示する。

実装初期はまず fallback を常時表示し、GLB が完成してから `VolcanoModel` に切り替えると安全である。

## 11. Phase A Definition of Done

- `types/volcano.ts` と `lib/volcanoData.ts` が追加されている。
- `components/three/VolcanoLayer.tsx` が `SceneRoot.tsx` から呼ばれている。
- `VolcanoFallback.tsx` で、GLBなしでも地表火山が表示される。
- `public/models/volcano/volcano_v001.glb` を置いた場合の読み込み設計がある。
- `pnpm lint`, `pnpm test`, `pnpm build` が通る。
