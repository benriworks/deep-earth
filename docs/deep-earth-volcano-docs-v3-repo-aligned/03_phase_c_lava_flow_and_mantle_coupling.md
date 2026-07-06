# 03. Phase C: 溶岩流アニメーション + マントル場連動

## 1. Phase C の目的

Phase C では、火山の見た目を `volcano.activity` の固定値から、既存マントル対流場に応じて変化する値へ近づける。

- `lib/convection.ts` の `convectionVelocity(r, theta)` を adapter 経由で読む。
- マントル上昇流、温度相当値、火山固有の圧力・ガス・閾値から `eruptionIntensity` を計算する。
- 溶岩流 material に時間変化を追加する。

## 2. 重要な前提

既存の `lib/convection.ts` はカット断面の2D極座標モデルである。これは実際の3Dマントル場ではない。Phase C の初期実装では、教育用の「マントル上昇流に近い場所では火山活動が強まる」デモとして扱う。

そのため、adapter の名前は `sampleMantleForVolcano` とするが、内部では次のように簡略化する。

```txt
VolcanoFeature.lat/lon/mantleThetaDeg
  ↓ demo theta
mantleSampleDepthKm
  ↓ scene radius r
convectionVelocity(r, theta)
  ↓ vr, vtheta
MantleSample.upwelling / heat
  ↓ computeEruptionIntensity
```

## 3. adapter: lib/mantleSampler.ts

入力:

```ts
export type MantleSample = {
  upwelling: number;       // 0..1
  temperature: number;     // 0..1, 教育用の相対値
  tangentialFlow: number;  // -1..1
  rawVr: number;
  rawVtheta: number;
  thetaRad: number;
  radiusScene: number;
};
```

方針:

- `mantleSampleDepthKm` から `radiusKm = EARTH_RADIUS_KM - depth` を作る。
- `toSceneRadius(radiusKm)` でシーン半径へ変換する。
- `theta` は `mantleThetaDeg ?? lon` をラジアン化する。
- 既存 `MantleConvection.tsx` と同様に `vr * 40 + 0.5` を 0..1 に clamp して上昇流/熱指標へ変換する。

## 4. eruption model: lib/eruptionModel.ts

噴火強度は以下を合成する。

| 入力 | 意味 |
|---|---|
| `mantleUpwelling` | 上昇流。`convectionVelocity` の `vr` から算出 |
| `mantleTemperature` | 現時点では上昇流に近い相対値 |
| `crustStress` | Phase C MVPでは固定値または火山タイプ別値 |
| `magmaPressure` | `volcano.activity.pressure` |
| `gas` | `volcano.activity.gas` |
| `threshold` | `volcano.eruptionThreshold` |

計算例:

```ts
const source =
  mantleUpwelling * 0.32 +
  mantleTemperature * 0.26 +
  magmaPressure * 0.22 +
  gas * 0.12 +
  crustStress * 0.08;

const x = clamp01((source - threshold) / 0.25);
return smoothstep(x);
```

## 5. 時間変化と安定化

マントル場の粒子表示は `useFrame` で連続移流しているが、火山の噴火強度は毎フレーム大きく変えない。見た目がちらつかないように `THREE.MathUtils.damp` で滑らかにする。

```ts
intensityRef.current = THREE.MathUtils.damp(
  intensityRef.current,
  targetIntensity,
  1.8,
  delta,
);
```

UIに数値を出す場合は、毎フレームではなく 10Hz 程度に間引く。

## 6. 溶岩流アニメーション

`LavaFlowMaterial.tsx` では以下を行う。

- `uTime` uniform を増やす。
- `uIntensity` を `eruptionIntensity` に合わせる。
- emissive を強度に応じて上げる。
- MVPでは shader を簡単にし、ノイズテクスチャは Phase D へ送ってよい。

GLBの `Volcano_LavaFlow_01` に material を差し替える場合は、`VolcanoModel.tsx` で object name を探して material を付ける。

## 7. Store 連携

`useVolcanoStore` は、以下のような軽い状態だけを持つ。

```ts
selectedVolcanoId: string | null;
volcanoDebugIntensity: number | null;
showMantleCouplingDebug: boolean;
```

火山ごとの毎フレーム強度は component ref に持ち、UIに出すサマリーだけ store に載せる。

## 8. テスト

`lib/eruptionModel.ts` は Vitest でテストする。

テスト例:

- 入力がすべて0なら0に近い。
- 上昇流・温度・圧力・ガスが高いと閾値を超える。
- 出力は常に 0..1。
- threshold が高いほど出力は下がる。
- smoothstep により閾値直後が滑らか。

`lib/mantleSampler.ts` は、戻り値が 0..1 範囲に収まることをテストする。既存 `convectionVelocity` の物理正確性は既存側の責務とする。

## 9. UI注記

Phase C のマントル連動は、必ず教育用の簡略化として表示する。

推奨文:

> 火山活動は、既存の2D断面マントル対流モデルを使った教育用の簡略表現です。実際の噴火予測や実在火山の活動評価ではありません。

## 10. Phase C Definition of Done

- `lib/mantleSampler.ts` が `lib/convection.ts` の `convectionVelocity` を利用する。
- `lib/eruptionModel.ts` が 0..1 の `eruptionIntensity` を返す。
- `eruptionIntensity` が火口発光・煙・溶岩流へ反映される。
- Vitest で eruption model の基本テストが通る。
- UIまたは資料に、マントル連動が教育用簡略化であることが明記されている。
