# RFC-001: 鳥獣被害報告データ 全国標準フォーマット

- **ステータス**: Draft
- **著者**: 合同会社コツモ（kotsumo LLC）
- **作成日**: 2026-11-18
- **対象**: 自治体、猟友会、鳥獣害対策SaaS開発者
- **著作権**: © 2026 合同会社コツモ（kotsumo LLC）

---

## 概要（Abstract）

本RFCは、鳥獣被害の報告・目撃・捕獲に関するデータを全国で相互運用可能にするための標準フォーマット「サトノメ標準フォーマット v1.0」を提案する。現状、農林水産省・環境省・各自治体がそれぞれ独自のフォーマットでデータを収集しており、広域的な分析や自治体間のデータ連携が困難である。本フォーマットは既存の行政フォーマットとの互換性を維持しつつ、民間SaaSを含むシステム間でのデータ交換を可能にすることを目指す。

## 背景（Background）

- **自治体ごとにバラバラなフォーマット**: 被害報告の書式は市町村ごとに異なり、紙ベースの運用が残る自治体も多い。都道府県への集計時にデータの再入力が発生し、集計の遅延や誤りの原因となっている。
- **省庁間のフォーマット分断**: 農林水産省は被害額・被害面積を軸とした「被害統計」フォーマットを、環境省は捕獲情報収集システムで捕獲データを収集しており、両者の紐付けは手作業に依存している。
- **デジタル庁の標準データセットに未掲載**: デジタル庁が推進する自治体標準データセットに「鳥獣被害」は含まれておらず、標準化の空白地帯となっている。
- **民間SaaSの台頭**: ジビエクラウドやHunter Go等の民間サービスが独自のデータ項目を定義しており、エクスポートデータの形式が統一されていない。

## 目的（Goals）

- 被害報告・目撃報告・捕獲報告を統一的に扱えるスキーマを定義する
- 農林水産省の被害統計および環境省の捕獲情報収集システムへの変換を可能にする
- 自治体・猟友会・民間SaaS間でのデータ交換を容易にする
- GIS連携（緯度経度・メッシュコード）を標準でサポートする
- 段階的に採用可能な設計（必須フィールドを最小限に）とする

## 提案: サトノメ標準フォーマット v1.0

### レポートの種類（report_type）

| report_type | 説明 |
|---|---|
| `damage_report` | 農作物・森林・水産物等への被害報告 |
| `sighting_report` | 鳥獣の目撃報告（被害なし） |
| `capture_report` | わな・銃猟等による捕獲報告 |

### 共通フィールド

すべてのレポート種別で共通して使用するフィールド。

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | uuid | ◯ | レポート一意識別子 |
| `report_type` | enum | ◯ | `damage_report` / `sighting_report` / `capture_report` |
| `municipality_code` | string(6) | ◯ | 全国地方公共団体コード（JIS X 0402） |
| `reported_at` | timestamptz | ◯ | 報告日時（ISO 8601） |
| `occurred_at` | timestamptz | ◯ | 発生・目撃・捕獲日時 |
| `reporter_id` | uuid | △ | 報告者ID（システム内部） |
| `reporter_name` | string | △ | 報告者氏名 |
| `reporter_affiliation` | string | - | 所属（猟友会名等） |
| `animal_code` | string(4) | ◯ | 動物種コード（後述） |
| `animal_count` | integer | ◯ | 頭数・羽数 |
| `sex` | enum | - | `male` / `female` / `unknown` |
| `age_class` | enum | - | `adult` / `juvenile` / `unknown` |
| `latitude` | decimal | ◯ | 緯度（WGS84、小数点以下6桁） |
| `longitude` | decimal | ◯ | 経度（WGS84、小数点以下6桁） |
| `address` | string | - | 住所テキスト |
| `mesh_code` | string(8) | - | 標準地域メッシュコード（3次メッシュ） |
| `description` | text | - | 自由記述 |
| `photo_urls` | string[] | - | 写真URL配列 |
| `source` | string | - | データ出所（`satonome` / `manual` / 外部システム名） |
| `status` | enum | ◯ | `pending` / `confirmed` / `dispatched` / `resolved` / `dismissed` |
| `created_at` | timestamptz | ◯ | レコード作成日時 |
| `updated_at` | timestamptz | ◯ | レコード更新日時 |

> [!NOTE]
> `△` は報告者のプライバシーに応じて任意。自治体内部では必須としつつ、オープンデータ公開時には匿名化する運用を想定。

### 被害報告固有フィールド（damage_report）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `damage_type` | enum | ◯ | `crop_feeding`（食害）/ `trampling`（踏み荒らし）/ `bark_stripping`（剥皮）/ `breakage`（折損）/ `other` |
| `crop_category` | string | ◯ | 被害品目（水稲、果樹、野菜 等） |
| `damage_area_sqm` | decimal | - | 被害面積（㎡） |
| `damage_area_ha` | decimal | - | 被害面積（ha）。農水省報告用 |
| `damage_quantity_kg` | decimal | - | 被害量（kg） |
| `estimated_damage_yen` | integer | - | 推定被害額（円） |

### 捕獲報告固有フィールド（capture_report）

| フィールド名 | 型 | 必須 | 説明 |
|---|---|---|---|
| `permit_number` | string | ◯ | 捕獲許可番号 |
| `capture_method` | enum | ◯ | `gun`（銃猟）/ `box_trap`（箱わな）/ `leg_trap`（くくりわな）/ `net`（網猟）/ `other` |
| `trap_detail` | string | - | 猟具詳細（口径、わな型番等） |
| `estimated_weight_kg` | decimal | - | 推定体重（kg） |
| `individual_id` | string | - | 個体識別番号（耳標・マイクロチップ等） |
| `disposition` | enum | ◯ | `incineration`（焼却）/ `burial`（埋設）/ `gibier`（食肉利用）/ `release`（放鳥獣）/ `other` |
| `hunter_id` | uuid | △ | 捕獲者ID |
| `hunter_count` | integer | - | 出猟者数 |
| `bleeding_done` | boolean | - | 放血実施（ジビエ利用時） |
| `evisceration_done` | boolean | - | 内臓摘出実施 |

### 動物種コード体系

環境省の鳥獣コードとの互換性を保ちつつ、実務で頻出する種を短縮コードで参照可能にする。

| animal_code | 和名 | 環境省コード | 備考 |
|---|---|---|---|
| `DEER` | ニホンジカ | 0620 | |
| `BOAR` | イノシシ | 0630 | |
| `MONK` | ニホンザル | 0410 | |
| `BRBR` | ツキノワグマ | 0510 | |
| `BWBR` | ヒグマ | 0520 | |
| `RDOG` | タヌキ | 0310 | |
| `CIVT` | ハクビシン | 0340 | 外来種 |
| `RACN` | アライグマ | 0350 | 特定外来生物 |
| `NUTR` | ヌートリア | 0710 | 特定外来生物 |
| `KYON` | キョン | 0640 | 特定外来生物 |
| `CROW` | カラス類 | 1010 | ハシブトガラス・ハシボソガラス |
| `SPAW` | スズメ | 1210 | |
| `BBLB` | ヒヨドリ | 1110 | |
| `DUCK` | カモ類 | 1310 | |
| `PIGN` | ドバト | 1410 | |
| `OTHR` | その他 | - | `description`に種名を記載 |

> [!TIP]
> `animal_code` は4文字の短縮コードを基本とする。環境省コードへの変換はマッピングテーブルで行い、新規の種が必要な場合は本RFCの改訂で追加する。

### JSON Schema（抜粋）

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://satonome.jp/schema/report/v1.0",
  "type": "object",
  "required": ["id", "report_type", "municipality_code", "reported_at",
               "occurred_at", "animal_code", "animal_count",
               "latitude", "longitude", "status"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "report_type": {
      "type": "string",
      "enum": ["damage_report", "sighting_report", "capture_report"]
    },
    "municipality_code": {
      "type": "string",
      "pattern": "^[0-9]{6}$",
      "description": "全国地方公共団体コード（JIS X 0402）"
    },
    "animal_code": {
      "type": "string",
      "pattern": "^[A-Z]{4}$"
    },
    "latitude": { "type": "number", "minimum": 20, "maximum": 46 },
    "longitude": { "type": "number", "minimum": 122, "maximum": 154 },
    "capture": {
      "type": "object",
      "description": "capture_report 時のみ必須",
      "properties": {
        "permit_number": { "type": "string" },
        "capture_method": {
          "type": "string",
          "enum": ["gun", "box_trap", "leg_trap", "net", "other"]
        },
        "disposition": {
          "type": "string",
          "enum": ["incineration", "burial", "gibier", "release", "other"]
        }
      }
    }
  }
}
```

## 既存システムとの比較

| データ項目 | サトノメ v1.0 | 農水省統計 | 環境省捕獲 | ジビエクラウド | Hunter Go |
|---|---|---|---|---|---|
| 位置情報（緯度経度） | ◯ | ✕ | △(メッシュ) | ◯ | ◯(GPS) |
| メッシュコード | ◯ | ✕ | ◯ | ✕ | ✕ |
| 被害額・被害面積 | ◯ | ◯ | ✕ | ✕ | ✕ |
| 被害品目 | ◯ | ◯ | ✕ | ✕ | ✕ |
| 被害形態 | ◯ | △ | ✕ | ✕ | ✕ |
| 捕獲方法 | ◯ | ✕ | ◯ | ◯ | ◯ |
| 性別・齢区分 | ◯ | ✕ | ◯ | ◯ | ◯ |
| 体重 | ◯ | ✕ | ✕ | ◯ | ✕ |
| 個体識別番号 | ◯ | ✕ | ✕ | ◯(QR) | ✕ |
| 処分方法 | ◯ | ✕ | ◯ | ◯ | ◯ |
| HACCP記録 | ✕ (v2検討) | ✕ | ✕ | ◯ | ✕ |
| 写真 | ◯ | ✕ | ✕ | ✕ | ◯ |
| 許可番号 | ◯ | ✕ | ◯ | ✕ | ✕ |

## 移行計画

サトノメの現行 `reports` テーブルからの主な差分と段階的な移行方針を示す。

### Phase 1: スキーマ拡張（非破壊的）

現行テーブルに以下のカラムを追加する。既存データへの影響なし。

- `report_type` カラム追加（既存レコードは `damage_report` をデフォルト値とする）
- `sex`, `age_class`, `capture_method`, `disposition` カラム追加（nullable）
- `animal_type` enum に `nutria`, `kyon`, `sparrow`, `bulbul`, `duck`, `pigeon`, `brown_bear` を追加
- `crop_category`, `damage_type` カラム追加
- `municipality_code` カラム追加（`municipality_id` からの変換ビュー併設）

### Phase 2: 捕獲報告の分離

- `capture_reports` テーブルを新設し、捕獲固有フィールドを格納
- `permit_number`, `individual_id`, `estimated_weight_kg` 等を含む
- 既存 `reports` テーブルとは `report_id` で紐付け

### Phase 3: API・エクスポート対応

- JSON Schema に準拠したREST APIエンドポイントの提供
- CSV / GeoJSON エクスポート機能
- 環境省捕獲情報収集システム向け変換機能

## 未解決事項（Open Questions）

フィードバックを歓迎します。

1. **動物種コードの粒度**: カラス類を「ハシブトガラス」「ハシボソガラス」に分けるべきか？ カモ類も種レベルまで細分化すべきか？
2. **被害品目のコード化**: `crop_category` を自由テキストとするか、農水省の品目分類コードに準拠した enum とするか？
3. **写真データの扱い**: URL参照のみとするか、Base64埋め込みも許容するか？ファイルサイズ上限は？
4. **個人情報の取り扱い**: 報告者・捕獲者情報のオープンデータ公開時の匿名化ルールをフォーマット仕様に含めるべきか？
5. **HACCP・トレーサビリティ連携**: ジビエ利用時のHACCP記録をv1.0に含めるか、v2.0に先送りするか？
6. **メッシュコードの精度**: 3次メッシュ（約1km四方）で十分か、4次メッシュ（約500m四方）まで必要か？
7. **多言語対応**: インバウンド観光客からの目撃報告等を想定し、フィールド名・enum値を英語ベースとしているが、和名のエイリアスも仕様に含めるべきか？

## 参考文献

- 農林水産省「鳥獣被害の現状と対策」 https://www.maff.go.jp/j/seisan/tyozyu/higai/
- 環境省 捕獲情報収集システム https://www.env.go.jp/nature/choju/capture/
- 鳥獣による農林水産業等に係る被害の防止のための特別措置に関する法律（鳥獣被害防止特措法）
- デジタル庁 自治体標準データセット https://www.digital.go.jp/
- 総務省 全国地方公共団体コード（JIS X 0402）
- 環境省 鳥獣関係統計・鳥獣コード一覧
- 標準地域メッシュ（JIS X 0410）

---

> [!IMPORTANT]
> 本文書はDraft段階です。自治体職員、猟友会関係者、SaaS開発者からのフィードバックを広く募集しています。  
> Issue・Pull Requestでのご意見をお待ちしています。
