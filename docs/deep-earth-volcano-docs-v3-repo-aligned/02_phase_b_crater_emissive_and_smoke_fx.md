# 02. Phase B: 火口・溶岩発光 + 煙 / 噴煙パーティクル

## 1. Phase B の目的

Phase B では、Phase A で配置した火山に対して、`eruptionIntensity` に応じた見た目の変化を追加する。

- 火口内部が赤熱する。
- 溶岩流 material が発光する。
- 火口から軽い煙・噴煙が出る。
- 高強度時に火山弾または粒子の勢いを上げる。

## 2. 入力値

`VolcanoModel`, `VolcanoFallback`, `EruptionParticles`, `LavaFlowMaterial` は、最終的に以下を受け取る。

```ts
type VolcanoVisualState = {
  eruptionIntensity: number; // 0..1
  heat: number;              // 0..1
  pressure: number;          // 0..1
  gas: number;               // 0..1
};
```

Phase B の時点では `volcano.activity.eruption` または `useVolcanoStore` の debug override を使ってよい。Phase C で `eruptionModel.ts` と接続する。

## 3. 表現段階

| `eruptionIntensity` | 表現 |
|---:|---|
| 0.0 | 休止。暗い火口、煙なし |
| 0.2 | 火口がうっすら赤い |
| 0.4 | 噴気・薄い煙 |
| 0.6 | 溶岩流が発光し始める |
| 0.8 | 噴煙が太く高くなる |
| 1.0 | 強い発光、火山弾、カメラ演出候補 |

## 4. material clone ルール

GLBを複数配置する場合、`scene.clone()` だけでは material が共有されることがある。火山ごとに発光強度を変えるため、読み込み後に mesh と material を clone する。

```ts
scene.traverse((object) => {
  if (object instanceof THREE.Mesh) {
    object.geometry = object.geometry.clone();
    if (Array.isArray(object.material)) {
      object.material = object.material.map((m) => m.clone());
    } else {
      object.material = object.material.clone();
    }
  }
});
```

発光制御対象は material 名または object 名で判定する。

```ts
const name = `${object.name} ${material.name}`.toLowerCase();
const isCrater = name.includes('crater') || name.includes('inner');
const isLava = name.includes('lava');
```

## 5. 火口・溶岩発光

`useFrame` 内で material の emissiveIntensity を更新する。React state を毎フレーム更新しない。

```ts
const pulse = 0.15 * Math.sin(clock.elapsedTime * 5);
material.emissive.set('#ff3b12');
material.emissiveIntensity = 0.4 + eruptionIntensity * 3.5 + pulse;
```

`MeshStandardMaterial` 以外の場合は、最初に `MeshStandardMaterial` へ置き換えるか、対応する property がある場合のみ更新する。

## 6. 煙 / 噴煙

MVPでは Drei や外部 particle ライブラリを追加せず、`points` と `bufferGeometry` を使う。既存プロジェクトは Three.js と R3F が入っているため追加依存は不要。

基本方針:

- 粒子数は 80〜200 個から開始。
- `Emitter_CraterSmoke` が GLB 内にあればその world position を使う。
- なければ火山ローカル座標の `[0, height, 0]` を使う。
- 上昇速度、広がり、opacity を `eruptionIntensity` で変える。
- `showVolcanoes` が false のときは描画しない。

## 7. 火山弾 MVP

火山弾は Phase B の任意タスクとする。

- `eruptionIntensity >= 0.75` で表示。
- 低ポリゴン sphere を数個 reuse する。
- `useFrame` で放物線移動。
- 初期実装では衝突判定なし。
- 数が増える場合は InstancedMesh 化する。

## 8. UI デバッグ

Phase B では、`useVolcanoStore` に以下を入れると調整しやすい。

```ts
volcanoDebugIntensity: number | null;
setVolcanoDebugIntensity: (value: number | null) => void;
```

`null` の場合は `volcano.activity.eruption` または Phase C の計算値を使う。数値の場合は強制的にその強度で見た目を確認する。

## 9. 既存性能方針との整合

`deep-earth` の既存READMEには、60FPS維持のため毎フレーム変化する値を React state に載せず、`useFrame` 内や ref で処理する方針がある。火山FXも同じ方針に合わせる。

避けること:

- 粒子1個ごとに React component を作る。
- 毎フレーム `setState` する。
- 毎フレーム `new THREE.Vector3()` を大量生成する。
- GLB全体を毎フレーム traverse する。

## 10. Phase B Definition of Done

- `eruptionIntensity` で火口発光が変化する。
- `eruptionIntensity` で煙 / 噴煙の量と高さが変化する。
- 複数火山を置いても material 発光が共有されない。
- `pnpm lint`, `pnpm test`, `pnpm build` が通る。
- 低スペック端末を想定し、粒子数を簡単に下げられる。
