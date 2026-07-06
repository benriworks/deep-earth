# 実在火山データ 調査指示書

| 項目 | 内容 |
|---|---|
| 目的 | deep-earth シミュレータに実在火山 20〜30 基を配置するためのデータセット作成 |
| 成果物 | `lib/realVolcanoes.ts` に貼り付け可能な TypeScript 配列(本書 §5 の仕様) |
| 前提 | 本書のみで作業可能(リポジトリへのアクセス不要)。§5 のテンプレートに従えばそのまま組み込める |
| 作成日 | 2026-07-05 |

---

## 1. 調査方法

### 1.1 推奨データソース(主案)

**Smithsonian GVP (Global Volcanism Program) — Holocene Volcano List**
https://volcano.si.edu/volcanolist_holocene.cfm

- 完新世(約1.1万年前以降)に活動した全火山のリスト。CSV/Excel でダウンロード可能
- 使用するフィールド: `Volcano Name` / `Latitude` / `Longitude` / `Elevation (m)` / `Primary Volcano Type` / `Last Known Eruption`
- **ライセンス**: Smithsonian の利用規約により教育・非商用利用は許可(商用不可・出典表記必須)。本アプリは教育用途のため適合。データ利用時は以下のクレジットを成果物のコメントに含めること:
  > Global Volcanism Program, Smithsonian Institution. Volcanoes of the World. https://volcano.si.edu/
- 補助ソース(数値の裏取り用): USGS Volcano Hazards Program、各火山の Wikipedia(カルデラ径など GVP にない数値)

### 1.2 選定基準(20〜30 基)

地域と成因のバランスを取りつつ、教育的知名度を優先する:

| 区分 | 目安数 | 例 |
|---|---|---|
| 環太平洋(島弧・沈み込み帯) | 10〜14 | 富士山、桜島、セント・ヘレンズ、ピナツボ、メラピ |
| ホットスポット | 4〜6 | キラウエア、マウナ・ロア、アイスランド系 |
| 地中海・大陸 | 3〜5 | ベスビオ、エトナ、ニーラゴンゴ |
| カルデラ | 2〜4 | イエローストーン、阿蘇、サントリーニ |
| 砕屑丘 | 1〜2 | パリクティン |
| 海底火山 | 1〜3 | ロイヒ(カマエフアカナロア)、福徳岡ノ場 |

- 日本の火山を 4〜6 基含める(想定ユーザーが日本語話者のため)
- 同一地域に密集させない(3D 上で重なって見えるため、近接する場合は代表 1 基)

---

## 2. パターン化ロジック(必ずこの規則で変換する)

### 2.1 形態 → タイプ決定表

GVP の `Primary Volcano Type` を次の 5 タイプへ割り当てる:

| GVP Primary Volcano Type | `type` |
|---|---|
| Stratovolcano(es), Compound, Complex volcano, Volcanic complex | `stratovolcano` |
| Shield(s), Pyroclastic shield | `shield` |
| Lava dome(s) | `stratovolcano`(専用タイプなし。小型・急峻で代替) |
| Caldera(s) | `caldera` |
| Cinder cone(s), Scoria cone(s), Pyroclastic cone(s), Tuff cone(s)/ring(s), Maar(s) | `cinder_cone` |
| Submarine volcano(es) | `submarine` |
| Fissure vent(s), Volcanic field, Crater rows | `shield`(玄武岩質・低比高で代替) |
| Subglacial / 上記に該当なし | `stratovolcano`(フォールバック) |

曖昧なケースの優先規則(上から順に適用):
1. `Elevation < 0` → 強制的に `submarine`
2. 名称・形態に "Caldera" を含む → `caldera`
3. 形態が不明・未分類 → `stratovolcano`
4. `baseRadiusKm > 30` かつ `heightKm < 2` に落ちる場合 → `shield` に補正

### 2.2 活動度 → パラメータ変換表

`yearsSince = 2026 − 最終噴火年` として 4 段階に分類:

| 段階 | 条件 | heat | pressure | gas | eruptionThreshold | activity.eruption |
|---|---|---|---|---|---|---|
| 現在噴火中 | 噴火進行中 or yearsSince ≤ 2 | 0.85 | 0.75 | 0.70 | 0.45 | 0.6 |
| 歴史時代に噴火 | 2 < yearsSince ≤ 300 | 0.55 | 0.45 | 0.45 | 0.55 | 0.0 |
| 休眠 | 300 < yearsSince ≤ 10000 | 0.30 | 0.25 | 0.25 | 0.62 | 0.0 |
| 長期静穏 | yearsSince > 10000 / 不明 | 0.12 | 0.10 | 0.10 | 0.70 | 0.0 |

タイプ補正(変換表の値に加算後、0〜1 に丸める):
- `caldera`: gas +0.1、pressure +0.1(爆発的傾向)
- `shield`: gas −0.1、eruptionThreshold −0.05(溢流的傾向)

### 2.3 サイズ正規化(実測値ベース。表示上の誇張はアプリ側の可変誇張——既定: 高さ×14・広がり×4.5——が行う)

入力は GVP の `Elevation (m)`。山体規模の実測値がある場合はそちらを優先する:

| `type` | heightKm | baseRadiusKm | craterRadiusKm |
|---|---|---|---|
| stratovolcano | max(elev, 500) / 1000 | height × 6 | height × 0.35 |
| shield | max(elev, 300) / 1000 | height × 20 | height × 1.0 |
| cinder_cone | clamp(elev/1000, 0.1, 0.6) | height × 4 | height × 0.5 |
| caldera | clamp(elev/1000, 0.2, 1.5) | 8〜20(実カルデラ径があれば優先) | baseRadius × 0.4 |
| submarine | max(比高/1000, 0.3)(海面下でも正値) | height × 8 | height × 0.4 |

注意: `craterRadiusKm < baseRadiusKm` を必ず満たすこと(検証で弾かれる)。

### 2.4 mantleThetaDeg の割り当て(重要: 経度をそのまま使わない)

アプリのマントル対流は教育用の 2D デモ場(対流セル 5 対)であり、`mantleThetaDeg` は「この火山をデモ場のどこに接続するか」を決める演出パラメータ。**必ず成因ベースで選ぶ**:

| 成因 | mantleThetaDeg | mantleSampleDepthKm | 結果 |
|---|---|---|---|
| ホットスポット(キラウエア、アイスランド等) | 54, 126, 198, 270, 342 のいずれか(上昇流中心) | 120 | 活動的に見える |
| 海嶺・リフト帯 | 36〜72 の帯から選ぶ | 60 | やや活動的 |
| 沈み込み帯・島弧(環太平洋の大半) | 90, 100, 110, 160, 200 など(中間帯) | 80 | 中庸 |
| 休眠・長期静穏 | 18, 90, 162, 234, 306 のいずれか(下降流) | 80 | 静穏に見える |

- 同じ帯に複数割り当てる場合は 3〜8 度ずつずらして重複を避ける
- この割当は物理的事実ではなく教育演出である旨、成果物のコメントに明記すること

---

## 3. 最終データ仕様

### 3.1 形式

TypeScript の配列リテラル。以下のテンプレートの形で 1 火山 = 1 オブジェクト:

```ts
{
  id: 'volcano-fuji',              // 'volcano-' + 英小文字ケバブケース(一意)
  name: 'Mount Fuji',              // GVP 準拠の英語名
  nameJa: '富士山',                 // 日本語名(必須で埋める)
  type: 'stratovolcano',           // §2.1 の5値のいずれか
  lat: 35.36,                      // 十進度、小数2桁
  lon: 138.73,                     // 東経+/西経-、十进度
  heightKm: 3.78,                  // §2.3
  baseRadiusKm: 22.7,              // §2.3
  craterRadiusKm: 1.3,             // §2.3
  mantleSampleDepthKm: 80,         // §2.4
  eruptionThreshold: 0.55,         // §2.2
  mantleThetaDeg: 100,             // §2.4(必須)
  activity: {                      // §2.2
    heat: 0.55,
    pressure: 0.45,
    gas: 0.45,
    eruption: 0,
  },
},
```

- `modelUrl` / `lodUrls` は**書かない**(アプリ側が `type` から自動解決する)
- 配列全体の先頭コメントに GVP クレジット(§1.1)と「mantleThetaDeg は教育演出」の注記を入れる

### 3.2 検証ルール(アプリ側で自動検証される。違反データは警告つきで除外)

| フィールド | 制約 |
|---|---|
| id | `/^volcano-[a-z0-9-]+$/`、全体で一意 |
| type | 5値のいずれか |
| lat / lon | [-90, 90] / [-180, 180] |
| heightKm | [-6, 9](submarine のみ負値可だが §2.3 では正値推奨) |
| baseRadiusKm | (0, 120] |
| craterRadiusKm | [0, baseRadiusKm) |
| mantleSampleDepthKm | (0, 700] |
| eruptionThreshold | [0, 1] |
| mantleThetaDeg | [0, 360] |
| activity.* | 各 [0, 1] |

### 3.3 納品形態

`lib/realVolcanoes.ts` の `realVolcanoes` 配列の中身として貼り付け可能な `.ts` 断片、または同構造の JSON。

---

## 4. 品質チェックリスト(納品前に確認)

- [ ] 20〜30 基、§1.2 の地域バランスを満たす
- [ ] 全火山が §2 の変換規則で機械的に導出されている(恣意的な値がない)
- [ ] id の重複なし、§3.2 の全制約を満たす
- [ ] lat/lon を地図で目視確認(特に東経/西経の符号ミス)
- [ ] 日本語名(nameJa)が全件埋まっている
- [ ] GVP クレジットと教育演出注記のコメントがある
- [ ] 出典(GVP のバージョン・取得日)を記録している
