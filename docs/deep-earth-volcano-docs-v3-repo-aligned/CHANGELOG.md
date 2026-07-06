# CHANGELOG

## v3.0.0 - 2026-07-06

### Added

- Public化された `benriworks/deep-earth` の実構成に合わせた repository aligned 版を作成。
- `SceneRoot.tsx` への `VolcanoLayer` 差し込み方針を明記。
- `lib/convection.ts` を読む `lib/mantleSampler.ts` adapter 方針を確定。
- `useLayerStore.showVolcanoes` と `useVolcanoStore` 新設方針を追加。
- GLBなし fallback を既存 `/simulator` Canvas へ入れる手順に更新。

### Changed

- v2 の `private / 404 / 未取得` 前提を削除。
- 抽象パスを実パスへ置換。
- 追加依存インストール前提を削除し、既存 R3F / Drei / Three / Zustand / Vitest を利用する方針へ変更。
- `PR-0 Repository Audit` を完了扱いに変更。

### Fixed

- 新規 Canvas や独立ページへ逸れないよう、既存 `/simulator` 統合を標準化。
- `useSimStore` に火山状態を混ぜない責務分離を明確化。
- material clone と毎フレーム state 更新回避を全資料に反映。

## v2.0.0 - 2026-07-06

- GitHub取得不可前提で、監査手順・抽象パス・fallback prototype を追加。

## v1.0.0 - 2026-07-06

- 火山モデリング機能の初期要件書・設計書・作業指示書を作成。
