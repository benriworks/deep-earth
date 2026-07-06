# 00. 全体要件・アーキテクチャ / v3 repository aligned

## 1. 目的

`deep-earth` の既存 3D 地球地下シミュレータに、地表火山を追加する。MVPでは成層火山風の単体モデルを地球表面に配置し、火口発光・噴煙・溶岩流を `eruptionIntensity` で制御する。Phase C 以降では既存のマントル対流場を読み、マントル上昇流に応じて火山活動が強まる表現を追加する。

## 2. 既存リポジトリに合わせた前提

v3 では以下を確定前提とする。

```txt
app/
  simulator/
    page.tsx                    # 既存シミュレータ画面。SceneCanvas / SimulatorOverlay / TourOverlay を配置
components/
  three/
    SceneCanvas.tsx             # client component。SceneRoot を dynamic import(ssr:false)
    SceneRoot.tsx               # Canvas の実体。ここに VolcanoLayer を追加
    EarthLayers.tsx
    MantleConvection.tsx
    SeismicWaves.tsx
    Probe.tsx
    Observers.tsx
    ShadowArcs.tsx
    useCutPlanes.ts
    cutPlane.ts
  panel/
    SimulatorOverlay.tsx
    SimulatorPanel.tsx
    CutControls.tsx
    LayerList.tsx
    ...
lib/
  earthData.ts                  # EARTH_RADIUS_KM, toSceneRadius, PREM近似データ
  convection.ts                 # 2D極座標のマントル対流速度場
stores/
  useLayerStore.ts              # レイヤー表示、cutMode、showConvection など
  useSimStore.ts                # 地震波シミュレーション用。火山状態は混ぜない
  ...
types/
  earth.ts
public/
  *.svg                         # 現状。models/volcano は新規作成
```

## 3. 追加するファイル構成

Phase A〜C で以下を追加する。

```txt
public/
  models/
    volcano/
      volcano_v001.glb
      volcano_v001_low.glb      # Phase D
      volcano_v001_mid.glb      # Phase D
      volcano_v001_high.glb     # Phase D
  textures/
    volcano/
      lava_emissive.png         # 任意。GLBに同梱してもよい
      ash_albedo.png
      rock_normal.png

components/
  three/
    VolcanoLayer.tsx
    VolcanoModel.tsx
    VolcanoFallback.tsx
    EruptionParticles.tsx
    LavaFlowMaterial.tsx

lib/
  volcanoData.ts
  eruptionModel.ts
  mantleSampler.ts

stores/
  useVolcanoStore.ts            # 火山のデバッグ制御や強度override用

types/
  volcano.ts
```

`components/three/` 直下に置く理由は、既存の `EarthLayers.tsx`, `MantleConvection.tsx`, `SeismicWaves.tsx` と同じ Canvas 内レイヤーとして扱うためである。最初から `components/three/volcano/` にサブディレクトリ化してもよいが、既存構成がフラットなので Phase A ではフラット配置を推奨する。

## 4. データフロー

```txt
lib/volcanoData.ts
  ↓ VolcanoFeature[]
components/three/SceneRoot.tsx
  ↓ Canvas内に <VolcanoLayer /> を配置
components/three/VolcanoLayer.tsx
  ↓ lat/lon/height/baseRadius を scene transform へ変換
components/three/VolcanoModel.tsx または VolcanoFallback.tsx
  ↓ eruptionIntensity を見た目へ反映
components/three/EruptionParticles.tsx / LavaFlowMaterial.tsx

Phase C:
lib/convection.ts
  ↓ convectionVelocity(r, theta)
lib/mantleSampler.ts
  ↓ MantleSample
lib/eruptionModel.ts
  ↓ eruptionIntensity
VolcanoLayer / VolcanoModel / EruptionParticles
```

## 5. SceneRoot への接続

既存の `app/simulator/page.tsx` が `SceneCanvas` を読み、`SceneCanvas` が `SceneRoot` を dynamic import しているため、火山レイヤーは新規 Canvas を作らず `SceneRoot.tsx` に追加する。

推奨順序:

```tsx
<EarthLayers />
<VolcanoLayer />
<Probe />
<SeismicWaves />
<Observers />
<ShadowArcs />
<MantleConvection />
```

火山は地表に乗るオブジェクトなので、`EarthLayers` の後に置く。`SeismicWaves` や `MantleConvection` は断面・地下表現なので、火山より後でも問題ない。透明度や depth の見え方に問題が出る場合のみ順序を調整する。

## 6. 座標系

`deep-earth` は `lib/earthData.ts` の `toSceneRadius(radiusKm)` で地球半径を 1 に正規化している。火山の高さ・半径も同じ規則でシーン単位へ変換する。

- 地球半径: `EARTH_RADIUS_KM = 6371`
- シーン地表半径: `1`
- `heightScene = heightKm / EARTH_RADIUS_KM`
- `baseRadiusScene = baseRadiusKm / EARTH_RADIUS_KM`

緯度経度から地表法線を作る関数:

```ts
function latLonToUnitVector(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(
    Math.cos(lat) * Math.sin(lon),
    Math.sin(lat),
    Math.cos(lat) * Math.cos(lon),
  ).normalize();
}
```

モデル側は Blender で `+Y` を上方向として作り、Web側で `Quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal)` を使って地表法線へ合わせる。

## 7. 既存状態管理との責務分担

| Store | 既存責務 | 火山での扱い |
|---|---|---|
| `useLayerStore` | layer表示、cutMode、showConvection、labelなど | `showVolcanoes` のような表示トグルだけ追加する |
| `useSimStore` | 地震波再生、震源、P/S波、観測点、シャドウゾーン | 火山状態を混ぜない |
| `useVolcanoStore` | 新規 | debug intensity override、選択火山、将来の火山UI制御を持つ |

毎フレーム変化する値は、既存READMEの方針に合わせて React state に載せすぎない。`useFrame` 内では ref または Zustand の `getState()` を使い、UI反映が必要な値は 10Hz 程度に間引く。

## 8. マントル連動の扱い

既存 `lib/convection.ts` は「カット断面の2D極座標」の速度場である。したがって Phase C の初期実装では、これを完全な3D地球物理モデルとして扱わず、教育用デモ連動として利用する。

初期 adapter 方針:

1. `VolcanoFeature.mantleSampleDepthKm` からサンプル半径 `r` を計算する。
2. `VolcanoFeature.mantleThetaDeg` があればそれを使う。なければ `lon` をデモ用の `theta` に変換する。
3. `convectionVelocity(r, theta)` の `vr` を上昇流指標に変換する。
4. `eruptionModel.ts` で `heat`, `pressure`, `gas`, `threshold` と合成して `eruptionIntensity` を出す。

## 9. 非ゴール

MVPでは以下を実装しない。

- 実在火山データベースとの連携
- プレートテクトニクスや沈み込み帯の厳密なモデル
- 地表全体の海・陸テクスチャ生成
- 物理的に正確な噴煙流体シミュレーション
- Web Worker / GPU compute による本格噴火シミュレーション

## 10. Acceptance Criteria

Phase A 完了条件:

- `/simulator` の既存 Canvas 上に、少なくとも1つの火山が地表法線に沿って配置される。
- GLB がない状態でも `VolcanoFallback.tsx` で表示確認できる。
- `pnpm lint`, `pnpm test`, `pnpm build` が通る。
- 火山関連コードが `useSimStore` に混在していない。
- `public/models/volcano/volcano_v001.glb` を配置すれば `VolcanoModel.tsx` に切り替えられる。

Phase C 完了条件:

- `lib/convection.ts` の `convectionVelocity` から `eruptionIntensity` を算出できる。
- `eruptionIntensity` が火口発光、煙、溶岩流に反映される。
- マントル連動が教育用デモである旨を資料・UIで注記できる。
