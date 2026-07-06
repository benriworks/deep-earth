# deep-earth 火山実装ドキュメント v3 / Repository Aligned

更新日: 2026-07-06  
対象: `benriworks/deep-earth` に地表火山・噴火表現・マントル連動を追加するための要件書・設計書・作業指示書

## このZIPの位置づけ

この v3 は、以前の `deep-earth-volcano-docs-updated.zip` を、公開化された GitHub リポジトリ `benriworks/deep-earth` の実構成に合わせて更新したものです。

v2 では `deep-earth` の実体を取得できなかったため、`APP_ROOT`, `THREE_COMPONENT_ROOT`, `ASSET_ROOT` などの抽象パスを残していました。v3 ではそれらを実パスへ置き換え、既存の `/simulator` 画面と `components/three/SceneRoot.tsx` に火山レイヤーを追加する前提に変更しています。

## 確認済みのリポジトリ前提

| 項目 | v3 で採用する前提 |
|---|---|
| Repository | `benriworks/deep-earth` / GitHub Public |
| Branch | `main` |
| Framework | Next.js 15 App Router + TypeScript strict |
| Package manager | `pnpm` |
| 3D stack | `three`, `@react-three/fiber`, `@react-three/drei` は導入済み |
| State | Zustand 導入済み |
| Test | Vitest 導入済み |
| App root | `app/` |
| Simulator route | `app/simulator/page.tsx` |
| 3D components | `components/three/` |
| Panel components | `components/panel/` |
| Domain libraries | `lib/` |
| Stores | `stores/` |
| Types | `types/` |
| Static assets | `public/` |
| GLB 配置先 | `public/models/volcano/volcano_v001.glb` |
| 火山レイヤー接続先 | `components/three/SceneRoot.tsx` の Canvas 内 |
| マントル連動の入口 | `lib/convection.ts` の `convectionVelocity` を adapter 経由で利用 |

## v3 の主な変更点

| 区分 | 更新内容 |
|---|---|
| GitHub 前提 | 「private / 未取得」前提を削除し、公開リポジトリ確認済みの資料に変更 |
| パス | 抽象パスを `app/`, `components/three/`, `lib/`, `stores/`, `types/`, `public/` に確定 |
| 実装先 | 新規 `/volcano` ページではなく、既存 `/simulator` の `SceneRoot.tsx` に `VolcanoLayer` を追加する方針へ変更 |
| 依存関係 | R3F / Drei / Three / Zustand / Vitest は追加不要。既存バージョンを使う前提へ変更 |
| マントル連動 | `lib/convection.ts` の 2D 極座標 velocity field を `lib/mantleSampler.ts` で読む adapter 方針に確定 |
| 状態管理 | 地震波用 `useSimStore` へ混ぜず、表示トグルは `useLayerStore`、火山固有状態は `useVolcanoStore` 新設方針に変更 |
| GLBなし開発 | `08_geometry_fallback_prototype.md` を実リポジトリ用に更新し、Phase A の先行検証として利用可能にした |

## 実装フェーズ

| フェーズ | 内容 | 主な成果物 |
|---|---|---|
| Phase A | Blender 静的火山アセット制作 + GLB 読み込み + 地表配置 | `public/models/volcano/volcano_v001.glb`, `VolcanoModel.tsx`, `VolcanoLayer.tsx`, `types/volcano.ts`, `lib/volcanoData.ts` |
| Phase B | 火口・溶岩発光 + 煙 / 噴煙パーティクル | `EruptionParticles.tsx`, material clone, emissive制御 |
| Phase C | 溶岩流アニメーション + マントル場連動 | `LavaFlowMaterial.tsx`, `lib/eruptionModel.ts`, `lib/mantleSampler.ts` |
| Phase D | 火山タイプ拡張、LOD、性能最適化 | `volcano_v001_low/mid/high.glb`, 複数火山、LOD、性能チェック |

## ファイル一覧

| ファイル | 役割 |
|---|---|
| `00_overall_requirements_and_architecture.md` | 全体要件、実リポジトリ前提、データフロー、実ディレクトリ構成 |
| `01_phase_a_blender_static_asset_and_glb_import.md` | Phase A: Blender静的火山アセット、GLB出力、R3F読み込み、地表配置 |
| `02_phase_b_crater_emissive_and_smoke_fx.md` | Phase B: 火口・溶岩発光、噴煙 / 煙、火山弾MVP |
| `03_phase_c_lava_flow_and_mantle_coupling.md` | Phase C: 溶岩流アニメーション、既存 `lib/convection.ts` 連動 |
| `04_phase_d_variants_lod_performance.md` | Phase D: 火山タイプ拡張、LOD、Web性能基準 |
| `05_work_instructions_tickets.md` | 作業チケット、ブランチ、PR分割、Definition of Done |
| `06_code_skeleton.md` | 実装開始用の TypeScript / React Three Fiber コード骨子 |
| `07_repository_alignment.md` | GitHub実構成の確認結果、パス対応表、反映済み事項 |
| `08_geometry_fallback_prototype.md` | GLBなしで動く仮ジオメトリ火山を既存Sceneへ差し込む手順 |
| `99_update_summary.md` | v3 更新内容、v2との差分、次に着手する順番 |
| `CHANGELOG.md` | 変更履歴 |
| `manifest.json` | ZIP内ファイル一覧とハッシュ |
| `reference/deep-earth_conversation_log.md` | 添付会話ログのコピー |

## 最初に読む順番

1. `07_repository_alignment.md` で、実リポジトリに合わせた確定パスを確認する。
2. `00_overall_requirements_and_architecture.md` で、`SceneRoot.tsx` へ入れる全体設計を確認する。
3. GLB 制作を先に進める場合は `01`、GLB なしで実装検証する場合は `08` を読む。
4. `05_work_instructions_tickets.md` の PR 順に進める。
5. コードを書き始めるときは `06_code_skeleton.md` を参照する。

## v3 での推奨実装ルート

```txt
PR-1: types / data / fallback geometry / SceneRoot差し込み
PR-2: Blender GLB配置 / VolcanoModel.tsxで読み込み
PR-3: emissive / smoke / lava visual FX
PR-4: lib/convection.ts adapter / eruption model / tests
PR-5: panel controls / showVolcanoes toggle
PR-6: LOD / variants / multiple volcanoes
```

最初の動作確認は GLB 完成を待たず、`VolcanoFallback.tsx` を `VolcanoLayer.tsx` から表示する形で始めます。GLB が完成したら同じ `VolcanoFeature` と `eruptionIntensity` を保ったまま `VolcanoModel.tsx` へ差し替えます。
