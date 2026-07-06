# 04. Phase D: 火山タイプ拡張・LOD・性能最適化

## 1. Phase D の目的

Phase D では、MVPの単体成層火山を、複数火山・複数タイプ・LOD・軽量化に拡張する。

## 2. 火山タイプ

`VolcanoType` は Phase A で定義済みの以下を使う。

```ts
export type VolcanoType =
  | 'stratovolcano'
  | 'shield'
  | 'cinder_cone'
  | 'caldera'
  | 'submarine';
```

| Type | 見た目 | 噴火傾向の初期値 |
|---|---|---|
| `stratovolcano` | 高く急峻、火口あり | 粘性・爆発寄り |
| `shield` | 低く広い、なだらか | 溶岩流寄り |
| `cinder_cone` | 小型、単純な円錐 | 短期噴火・火山弾 |
| `caldera` | 広い凹地、低い外輪 | 大規模履歴表現 |
| `submarine` | 海底・水相互作用 | 将来の海モデル後に本格化 |

Phase D の最初は `stratovolcano` と `shield` の2種だけでよい。

## 3. LOD アセット

配置先:

```txt
public/models/volcano/
  volcano_stratovolcano_low.glb
  volcano_stratovolcano_mid.glb
  volcano_stratovolcano_high.glb
  volcano_shield_low.glb
  volcano_shield_mid.glb
  volcano_shield_high.glb
```

推奨ポリゴン目安:

| LOD | 用途 | 目安 |
|---|---|---:|
| low | 遠景・複数配置 | 500〜1,500 tris |
| mid | 通常表示 | 3,000〜8,000 tris |
| high | 接近・スクリーンショット | 10,000〜25,000 tris |

実装は Drei の `Detailed` または自前の距離判定で行う。まずは `low/mid` の2段階で十分。

## 4. Texture / Material 最適化

- 1K texture を基本にする。
- 火山1個だけの接近表示が必要な場合のみ 2K を使う。
- emissive map は必要箇所に限定する。
- 法線マップは Phase D まで遅らせてもよい。
- 透明パーティクルは overdraw が増えるので、粒子数とサイズを抑える。

KTX2 / Draco などの圧縮は、導入コストがあるため最初から必須にしない。GLBサイズや読み込み時間が問題になった時点で検討する。

## 5. 複数火山配置

複数火山を置く場合、以下に注意する。

- GLBの scene / material を火山ごとに clone する。
- `useGLTF.preload()` で共通モデルを事前読み込みする。
- 同一タイプが多数ある場合は、将来的に InstancedMesh 化を検討する。
- 粒子FXはすべての火山で常時出さない。カメラ距離・強度・選択状態で制限する。

## 6. 性能目標

既存 `SceneRoot.tsx` は開発時に `Stats` を表示する構成である。Phase D では Stats とブラウザ Performance panel で以下を確認する。

| 項目 | 目標 |
|---|---:|
| Desktop FPS | 55〜60 FPS |
| Mobile FPS | 30 FPS以上 |
| 初期 GLB 合計 | 5MB未満を目標 |
| 煙粒子 | 火山1個あたり 200 個以下から開始 |
| draw calls | 既存シーンへの増加を最小化 |
| React state更新 | 毎フレーム更新しない |

## 7. Progressive Enhancement

1. GLBなし fallback で配置確認。
2. mid GLB 1個を配置。
3. smoke / lava を追加。
4. LOD low/mid を追加。
5. 複数火山を追加。
6. 遠景では FX を停止または軽量化。
7. 必要なら圧縮形式を検討。

## 8. Phase D Definition of Done

- `stratovolcano` 以外の1タイプを追加できる。
- low/mid 以上の LOD 切り替えができる。
- 複数火山配置で material 発光が共有されない。
- 開発時 `Stats` で性能劣化を確認できる。
- `pnpm build` が通る。
