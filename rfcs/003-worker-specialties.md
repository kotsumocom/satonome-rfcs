# RFC-003: ワーカー専門スキル（specialties）

- **ステータス**: Draft
- **著者**: 合同会社コツモ（kotsumo LLC）
- **作成日**: 2026-11-18
- **対象**: 鳥獣害対策SaaS開発者、自治体担当者

---

## 概要

サトノメのワーカー（鳥獣害対策従事者）プロフィールに**専門スキル（specialties）**フィールドを追加し、公的資格だけでは表現できない実務能力を構造化する。これにより、自治体がクエスト（依頼）を作成する際に必要スキルを指定し、適切なワーカーをフィルタリング・マッチングできる仕組みを実現する。

### この RFC で決めること

1. 鳥獣害対策に必要なスキルの分類体系（3カテゴリ）
2. `worker_profiles` テーブルへの `specialties TEXT[]` カラム追加（データモデル）
3. `quests` テーブルへの `required_specialties TEXT[]` カラム追加
4. GINインデックスを用いたタグベースのフィルタリング・マッチングSQL
5. UI設計指針（Mantine MultiSelect / Badge表示）

---

## 背景

### 免許だけでは足りない「実務スキル」の重要性

現行のサトノメでは、ワーカーの能力を**狩猟免許の種類**（第一種銃猟・第二種銃猟・わな猟・網猟）と**銃砲所持許可**で管理している。しかし、実際の鳥獣害対策現場では、免許の有無だけでは対応力を判断できない場面が多い。

例えば：

- **わな猟免許**を持っていても、ICT対応のセンサー付き罠を運用できるワーカーは限られる
- **第一種銃猟免許**保持者でも、夜間銃猟（暗視装置使用）の経験者は一部にすぎない
- **ドローン操縦**による生息調査は狩猟免許とは無関係だが、鳥獣対策では極めて有用
- **ジビエ解体処理**（HACCP基準）ができるワーカーがいれば、捕獲後の資源活用まで一貫対応できる

### 認定鳥獣捕獲等事業者制度とスキルの多様化

2015年の鳥獣保護管理法改正で創設された**認定鳥獣捕獲等事業者制度**により、法人として専門的な捕獲事業を行う団体が増加した。これに伴い、個人のスキルセットも多様化・専門化が進んでおり、「免許 + 活動エリア」だけの単純なマッチングでは、現場のニーズに応えられなくなっている。

### 適材適所の配置がなぜ難しいか

現状の自治体担当者は、以下のような運用上の課題を抱えている：

1. **属人的な知識への依存** — 「あのワーカーは電気柵が得意」「あの人はクマ対応ができる」という情報が担当者の記憶にしか存在しない
2. **担当者の異動で知識が失われる** — 年度替わりの人事異動で、ワーカーの専門性に関する知見が引き継がれない
3. **免許情報だけではフィルタリングが粗すぎる** — わな猟免許保持者を全員呼び出しても、ICT罠を扱えるのは一部

本RFCは、これらの課題を**構造化されたスキルタグ**によって解決する。

---

## スキル分類体系

鳥獣害対策に関わるスキルを3つのカテゴリに分類する。

### カテゴリA: 公的資格（既存実装 — 本RFCの対象外）

法律に基づく免許・許可。すでにサトノメの専用テーブルで管理されている。

| 資格名 | 管理テーブル | 備考 |
|---|---|---|
| 狩猟免許（第一種銃猟） | `worker_profiles.license_types` | `HuntingLicenseType` enum |
| 狩猟免許（第二種銃猟） | `worker_profiles.license_types` | 同上 |
| 狩猟免許（わな猟） | `worker_profiles.license_types` | 同上 |
| 狩猟免許（網猟） | `worker_profiles.license_types` | 同上 |
| 散弾銃所持許可 | `worker_gun_permits` | `GunPermitType` enum |
| ライフル銃所持許可 | `worker_gun_permits` | 同上 |
| 空気銃所持許可 | `worker_gun_permits` | 同上 |

> [!NOTE]
> カテゴリAの資格には有効期限・認証状態（`VerificationStatus`）・発行機関の情報が紐づくため、単純なタグ配列ではなく専用テーブルで管理する設計が適切である。本RFCではこれらに変更を加えない。

### カテゴリB: 準公的認定

環境省認定制度や市町村任命に基づく資格・身分。現在は `organizations` テーブル + `organization_members` テーブルで所属として管理されている。

| enum値 | 日本語名 | 説明 | 認定機関 |
|---|---|---|---|
| `certified_capture_operator` | 認定鳥獣捕獲等事業者 | 環境省認定の法人制度。安全管理体制等の審査を経て認定 | 環境省（都道府県知事経由） |
| `damage_control_team_member` | 鳥獣被害対策実施隊員 | 鳥獣被害防止特措法に基づき市町村長が任命する非常勤公務員 | 市町村長 |
| `wildlife_manager_1` | 鳥獣管理士1級 | 高度な鳥獣管理の知識・技術を認定する民間資格 | 一般社団法人鳥獣管理技術協会 |
| `wildlife_manager_2` | 鳥獣管理士2級 | 同上（中級） | 同上 |
| `wildlife_manager_3` | 鳥獣管理士3級 | 同上（初級） | 同上 |

> [!TIP]
> カテゴリBの認定は `organizations` テーブルの所属情報から**一部推測可能**（例: `organization.type = 'certified_business'` のメンバーは認定事業者の従事者）。ただし、鳥獣管理士のような個人資格はorganizationsでカバーできないため、`specialties` タグとして管理する。

### カテゴリC: 実務スキル（新規追加対象）

免許や認定によらない、実務経験・技能に基づくスキル。**本RFCの主な追加対象**。

| enum値 | 日本語名 | 説明 | 備考 |
|---|---|---|---|
| `ict_trap_operation` | ICTわな運用 | センサー/カメラ付き罠の設置・遠隔監視・データ管理 | IoTシステム連携 |
| `night_hunting` | 夜間銃猟 | 暗視装置・熱感知装置を使用した夜間の銃猟 | 認定事業者のみ実施可（法規制） |
| `gibier_processing` | ジビエ解体処理 | 捕獲個体の食肉処理（HACCP基準・衛生管理） | 解体処理施設の認可も関連 |
| `electric_fence` | 電気柵設置 | 電気柵の設計・施工・保守 | 漏電対策・安全管理知識が必要 |
| `wire_mesh_fence` | ワイヤーメッシュ柵設置 | ワイヤーメッシュ防護柵の施工 | 地形に応じた設計技術 |
| `drone_operation` | ドローン操縦 | UAVによる生息調査・追い払い | 航空法に基づく飛行許可取得者 |
| `gis_mapping` | GPS/GIS分析 | 出没マップ作成・生息密度分析・データ可視化 | QGISなどのツール操作 |
| `large_animal_handling` | 大型動物対応 | クマ・シカなど大型動物の捕獲・追い払い | 高い危険度・専門的な安全管理 |
| `bird_control` | 鳥類対応 | カラス・カワウ等の追い払い・捕獲 | 音響装置・レーザーポインタ等 |
| `box_trap_fabrication` | 箱罠製作 | 箱罠の製作・改良・修理 | 溶接技術等 |
| `safety_training` | 安全管理講習修了 | 狩猟・捕獲作業の安全管理に関する講習修了 | 認定事業者の要件 |
| `first_aid` | 救命講習修了 | 応急手当・AED使用等の救命講習修了 | 消防署講習等 |

> [!IMPORTANT]
> `specialties` の値は**ワーカーの自己申告**に基づく。カテゴリA（公的資格）のような行政認証プロセスは現段階では設けない。将来的に自治体による「スキル認証」機能を追加する場合は、別途RFCを作成する。

### enum値の命名規則

- **スネークケース**（`snake_case`）で統一
- カテゴリプレフィックスは付けない（フラットなタグとして扱う）
- 新規スキルの追加は DB マイグレーション不要（`TEXT[]` のため）
- アプリケーション側の `SPECIALTY_LABELS` 定数に追加するだけで対応可能

---

## データモデル設計

### 方式比較

| 観点 | 方式A: TEXT[]カラム | 方式B: 中間テーブル |
|---|---|---|
| **スキーマ** | `worker_profiles.specialties TEXT[]` | `worker_specialties(worker_id, specialty, acquired_at, evidence_url, ...)` |
| **新スキル追加** | アプリ側の定数追加のみ | 同左 |
| **クエリ性能** | GINインデックスで `@>` 演算子が高速 | JOIN必要だが正規化されている |
| **付帯情報** | 保持不可（取得日・証拠書類等） | 行ごとに自由に追加可能 |
| **実装コスト** | 低（カラム1つ + インデックス） | 中（テーブル + RLS + API + UI） |
| **UI複雑度** | 低（MultiSelectのみ） | 中（スキルごとのフォーム） |
| **マイグレーション影響** | 既存テーブルにALTER TABLE | 新テーブル作成 |

### 判断: 方式Aを推奨

**理由：**

1. **現段階ではスキルに付帯情報が不要** — 取得日・証拠書類の管理は将来課題
2. **既存の `license_types` / `service_areas` / `target_animals` と同じ設計パターン** — `worker_profiles` テーブルは既に `TEXT[]`/`ENUM[]` カラムを多用しており、一貫性がある
3. **GINインデックスによる配列演算子 `@>` は十分高速** — ワーカー数が数千〜数万規模では問題にならない
4. **MVP優先** — 最小限の変更で最大の価値を出す

> [!NOTE]
> 将来、スキルに付帯情報（取得日・証拠写真・自治体認証ステータス等）が必要になった場合は、方式Bへの移行パスがある。その場合も `specialties TEXT[]` は「検索用キャッシュ」として残し、正規化テーブルとの二重管理にすることで後方互換性を維持できる。

### マイグレーションSQL

```sql
-- =============================================================
-- サトノメ DB マイグレーション: ワーカー専門スキル（specialties）
-- RFC-003 実装
-- =============================================================

-- ① worker_profiles に specialties カラム追加
ALTER TABLE worker_profiles
  ADD COLUMN IF NOT EXISTS specialties TEXT[] DEFAULT '{}';

COMMENT ON COLUMN worker_profiles.specialties
  IS 'ワーカーの専門スキルタグ配列（RFC-003定義）';

-- ② GINインデックス（配列演算子 @> による高速フィルタリング）
CREATE INDEX IF NOT EXISTS idx_worker_profiles_specialties
  ON worker_profiles USING GIN (specialties);

-- ③ quests に required_specialties カラム追加
ALTER TABLE quests
  ADD COLUMN IF NOT EXISTS required_specialties TEXT[] DEFAULT '{}';

COMMENT ON COLUMN quests.required_specialties
  IS 'クエストに必要な専門スキルタグ配列（RFC-003定義）';

-- ④ GINインデックス
CREATE INDEX IF NOT EXISTS idx_quests_required_specialties
  ON quests USING GIN (required_specialties);
```

### 型定義の変更

```typescript
// src/types/database.ts への追加

// --- Specialty enum値 ---
export type WorkerSpecialty =
  // カテゴリB: 準公的認定
  | "certified_capture_operator"
  | "damage_control_team_member"
  | "wildlife_manager_1"
  | "wildlife_manager_2"
  | "wildlife_manager_3"
  // カテゴリC: 実務スキル
  | "ict_trap_operation"
  | "night_hunting"
  | "gibier_processing"
  | "electric_fence"
  | "wire_mesh_fence"
  | "drone_operation"
  | "gis_mapping"
  | "large_animal_handling"
  | "bird_control"
  | "box_trap_fabrication"
  | "safety_training"
  | "first_aid";

export const WORKER_SPECIALTY_LABELS: Record<WorkerSpecialty, string> = {
  // カテゴリB
  certified_capture_operator: "認定鳥獣捕獲等事業者",
  damage_control_team_member: "鳥獣被害対策実施隊員",
  wildlife_manager_1: "鳥獣管理士1級",
  wildlife_manager_2: "鳥獣管理士2級",
  wildlife_manager_3: "鳥獣管理士3級",
  // カテゴリC
  ict_trap_operation: "ICTわな運用",
  night_hunting: "夜間銃猟",
  gibier_processing: "ジビエ解体処理",
  electric_fence: "電気柵設置",
  wire_mesh_fence: "ワイヤーメッシュ柵設置",
  drone_operation: "ドローン操縦",
  gis_mapping: "GPS/GIS分析",
  large_animal_handling: "大型動物対応",
  bird_control: "鳥類対応",
  box_trap_fabrication: "箱罠製作",
  safety_training: "安全管理講習修了",
  first_aid: "救命講習修了",
};

// --- WorkerProfile 型の変更 ---
export interface WorkerProfile {
  id: string;
  license_types: HuntingLicenseType[];
  license_prefecture: string | null;
  service_areas: string[];
  target_animals: AnimalType[];
  availability_status: WorkerAvailability;
  business_hours: string | null;
  bio: string | null;
  experience_years: number | null;
  license_number: string | null;
  license_expires_at: string | null;
  service_area_detail: Array<{ prefecture: string; city: string }>;
  specialties: WorkerSpecialty[];  // ← 追加
  created_at: string;
  updated_at: string;
}

// --- Quest 型の変更 ---
export interface Quest {
  id: string;
  municipality_id: string;
  created_by: string;
  title: string;
  description: string | null;
  animal_types: AnimalType[];
  location_text: string | null;
  latitude: number | null;
  longitude: number | null;
  reward_description: string | null;
  required_license_types: HuntingLicenseType[];
  required_specialties: WorkerSpecialty[];  // ← 追加
  max_applicants: number;
  status: QuestStatus;
  starts_at: string | null;
  ends_at: string | null;
  application_deadline: string | null;
  created_at: string;
  updated_at: string;
}
```

---

## マッチングロジック

### フェーズ1: タグベースフィルタリング（本RFC対象）

シンプルな「必要スキルをすべて持っているワーカー」の完全一致フィルタリング。

#### ユースケース1: 特定スキルを持つワーカーを検索

```sql
-- ICTわな運用 かつ 大型動物対応 ができるワーカーを検索
SELECT
  p.id,
  p.display_name,
  wp.license_types,
  wp.specialties,
  wp.availability_status
FROM worker_profiles wp
JOIN profiles p ON p.id = wp.id
WHERE wp.specialties @> ARRAY['ict_trap_operation', 'large_animal_handling']
  AND wp.availability_status = 'available'
ORDER BY wp.experience_years DESC NULLS LAST;
```

> [!TIP]
> `@>` 演算子（contains）は GINインデックスで高速に処理される。配列の要素順序は関係なく、指定された要素がすべて含まれているかを判定する。

#### ユースケース2: クエストに対する適格ワーカーの抽出

```sql
-- クエストの required_license_types と required_specialties を
-- 両方満たすワーカーを検索
SELECT
  p.id,
  p.display_name,
  wp.license_types,
  wp.specialties,
  wp.service_areas,
  wp.target_animals
FROM quests q
CROSS JOIN LATERAL (
  SELECT
    p.id,
    p.display_name,
    wp.license_types,
    wp.specialties,
    wp.service_areas,
    wp.target_animals
  FROM worker_profiles wp
  JOIN profiles p ON p.id = wp.id
  WHERE
    -- 免許要件（既存ロジック）
    (q.required_license_types = '{}' OR
     wp.license_types @> q.required_license_types)
    -- スキル要件（新規追加）
    AND (q.required_specialties = '{}' OR
         wp.specialties @> q.required_specialties)
    -- 対象動物（既存ロジック）
    AND (q.animal_types = '{}' OR
         wp.target_animals && q.animal_types)
    -- 対応可能
    AND wp.availability_status = 'available'
) AS matched
WHERE q.id = :quest_id;
```

#### ユースケース3: ワーカーが応募可能なクエストの表示

```sql
-- ワーカーのプロフィールに基づいて応募可能なクエストを表示
-- （要件を満たさないクエストにはバッジで警告）
SELECT
  q.*,
  CASE
    WHEN q.required_license_types = '{}' AND q.required_specialties = '{}'
      THEN 'no_requirements'
    WHEN wp.license_types @> q.required_license_types
      AND wp.specialties @> q.required_specialties
      THEN 'fully_qualified'
    WHEN wp.license_types @> q.required_license_types
      OR wp.specialties @> q.required_specialties
      THEN 'partially_qualified'
    ELSE 'not_qualified'
  END AS qualification_status
FROM quests q
LEFT JOIN worker_profiles wp ON wp.id = :worker_id
WHERE q.status = 'open'
ORDER BY
  CASE
    WHEN wp.license_types @> q.required_license_types
      AND wp.specialties @> q.required_specialties THEN 0
    ELSE 1
  END,
  q.created_at DESC;
```

### フェーズ2: スコアベースランキング（将来拡張）

フェーズ1の「全スキル必須」という二値的な判定に加え、スキルの一致度でスコアリングする仕組み。

```sql
-- 将来構想: スコアベースのマッチング
-- スキル一致数 + 経験年数 + 活動エリア近接度 で総合スコアを算出
SELECT
  p.id,
  p.display_name,
  -- スキル一致スコア（required の何割をカバーしているか）
  CASE
    WHEN cardinality(q.required_specialties) = 0 THEN 1.0
    ELSE (
      SELECT COUNT(*)::float / cardinality(q.required_specialties)
      FROM unnest(q.required_specialties) AS req
      WHERE req = ANY(wp.specialties)
    )
  END AS skill_match_ratio,
  wp.experience_years
FROM quests q, worker_profiles wp
JOIN profiles p ON p.id = wp.id
WHERE q.id = :quest_id
  AND wp.availability_status = 'available'
ORDER BY skill_match_ratio DESC, wp.experience_years DESC NULLS LAST;
```

> [!NOTE]
> フェーズ2の実装は本RFCの対象外。自治体からのフィードバックを得てから設計を詳細化する。

---

## UI設計

### ワーカープロフィール編集

Mantine `MultiSelect` コンポーネントを使用し、ワーカーが自分のスキルを選択する。

```tsx
import { MultiSelect } from "@mantine/core";
import { WORKER_SPECIALTY_LABELS, type WorkerSpecialty } from "@/types/database";

const SPECIALTY_OPTIONS = Object.entries(WORKER_SPECIALTY_LABELS).map(
  ([value, label]) => ({
    value,
    label,
    // カテゴリ別グルーピング
    group: value.startsWith("wildlife_manager") ||
           value === "certified_capture_operator" ||
           value === "damage_control_team_member"
      ? "準公的認定"
      : "実務スキル",
  })
);

function SpecialtiesEditor({
  value,
  onChange,
}: {
  value: WorkerSpecialty[];
  onChange: (specialties: WorkerSpecialty[]) => void;
}) {
  return (
    <MultiSelect
      label="専門スキル"
      description="お持ちのスキル・資格を選択してください"
      placeholder="スキルを選択..."
      data={SPECIALTY_OPTIONS}
      value={value}
      onChange={(val) => onChange(val as WorkerSpecialty[])}
      searchable
      clearable
      maxDropdownHeight={300}
    />
  );
}
```

### ワーカー一覧のフィルタ

自治体職員がワーカーを検索する際に、スキルでフィルタリングできるようにする。

```tsx
// ワーカー一覧画面のフィルタバーに追加
<MultiSelect
  label="必要スキルで絞り込み"
  placeholder="スキルを選択..."
  data={SPECIALTY_OPTIONS}
  value={filterSpecialties}
  onChange={setFilterSpecialties}
  searchable
  clearable
/>
```

API側のフィルタパラメータ:

```
GET /api/workers?specialties=ict_trap_operation,large_animal_handling
```

### クエスト作成時の必要スキル指定

クエスト作成フォームに `required_specialties` フィールドを追加する。既存の `required_license_types` と並べて配置する。

```tsx
// クエスト作成フォーム（既存の required_license_types の隣に配置）
<MultiSelect
  label="必要な免許"
  data={Object.entries(HUNTING_LICENSE_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }))}
  value={form.values.required_license_types}
  onChange={(val) => form.setFieldValue("required_license_types", val)}
/>

<MultiSelect
  label="必要な専門スキル"
  description="このクエストに必要な専門スキルを指定（任意）"
  data={SPECIALTY_OPTIONS}
  value={form.values.required_specialties}
  onChange={(val) => form.setFieldValue("required_specialties", val)}
  searchable
  clearable
/>
```

### Badge表示

ワーカーカードやプロフィール画面で、スキルをBadgeとして表示する。

```tsx
import { Badge, Group } from "@mantine/core";
import { WORKER_SPECIALTY_LABELS, type WorkerSpecialty } from "@/types/database";

// カテゴリに応じた色分け
const SPECIALTY_COLORS: Record<string, string> = {
  certified_capture_operator: "violet",
  damage_control_team_member: "violet",
  wildlife_manager_1: "violet",
  wildlife_manager_2: "violet",
  wildlife_manager_3: "violet",
  // 実務スキルはデフォルト色（blue）
};

function SpecialtyBadges({ specialties }: { specialties: WorkerSpecialty[] }) {
  return (
    <Group gap="xs">
      {specialties.map((s) => (
        <Badge
          key={s}
          color={SPECIALTY_COLORS[s] ?? "blue"}
          variant="light"
          size="sm"
        >
          {WORKER_SPECIALTY_LABELS[s]}
        </Badge>
      ))}
    </Group>
  );
}
```

表示例（ワーカーカード）:

```
田中太郎
├─ 🪪 第一種銃猟 / わな猟
├─ 📍 長野県松本市、安曇野市
└─ 🏷️ [ICTわな運用] [大型動物対応] [安全管理講習修了]
```

---

## API変更

### ワーカープロフィール更新

```
PATCH /api/workers/:id/profile
```

```json
{
  "specialties": ["ict_trap_operation", "large_animal_handling", "safety_training"]
}
```

### ワーカー一覧取得（フィルタ付き）

```
GET /api/workers?specialties=ict_trap_operation,large_animal_handling&availability=available
```

### クエスト作成

```
POST /api/quests
```

```json
{
  "title": "ICT罠による鹿捕獲（松本市東部エリア）",
  "animal_types": ["deer"],
  "required_license_types": ["trap"],
  "required_specialties": ["ict_trap_operation", "large_animal_handling"],
  "location_text": "松本市東部山間部",
  "max_applicants": 3
}
```

### WorkerWithVerification 型の更新

```typescript
export interface WorkerWithVerification {
  // ... 既存フィールド
  specialties: WorkerSpecialty[];  // ← 追加
  // ... 既存フィールド
}
```

---

## 実装チェックリスト

- [ ] DBマイグレーション（`worker_profiles.specialties` + `quests.required_specialties` + GINインデックス）
- [ ] `WorkerSpecialty` 型・ラベル定数の追加（`src/types/database.ts`）
- [ ] `WorkerProfile` / `Quest` / `WorkerWithVerification` 型の更新
- [ ] Edge Function: ワーカーAPI（`specialties` フィルタ対応）
- [ ] Edge Function: クエストAPI（`required_specialties` の保存・返却）
- [ ] UI: ワーカープロフィール編集画面（MultiSelect追加）
- [ ] UI: ワーカー一覧画面（フィルタ追加）
- [ ] UI: クエスト作成/編集画面（required_specialties フィールド追加）
- [ ] UI: ワーカーカード / プロフィール画面（Badge表示）
- [ ] seed-demo.sql の更新（テスト用ワーカーにspecialtiesを設定）

---

## 未解決事項

### 1. スキルの自己申告 vs 認証

現段階ではワーカーの自己申告に基づく。将来的に以下の仕組みが必要か検討が必要：

- 自治体による「スキル認証」（verified badge の付与）
- 講習受講履歴との連携（安全管理講習・救命講習）
- 認定鳥獣捕獲等事業者の従事者は、所属組織から自動的にスキルが付与される仕組み

### 2. スキルのバージョニング・廃止

新しいスキルの追加は容易だが、既存スキルの廃止・名称変更時の移行パスを定める必要がある。
- 廃止されたenum値を `deprecated_` プレフィックスで残すか
- マイグレーションで一括変換するか

### 3. スキルカテゴリの拡張可能性

現在の2カテゴリ（準公的認定・実務スキル）以外に、以下のような分類軸が将来必要になる可能性がある：

- **対象動物別の専門性** — 現在は `target_animals` で管理しているが、「クマの学習放獣」のように動物 × 技法の組み合わせが必要な場合
- **地域特有のスキル** — 特定の地方でのみ意味を持つスキル（例: 離島での捕獲）
- **機器操作スキル** — 特定メーカーのICT罠・ドローン機種への習熟

### 4. `required_specialties` の AND/OR 論理

現在の設計では `@>` 演算子（全スキル必須 = AND条件）のみ。「電気柵設置 **または** ワイヤーメッシュ柵設置」のようなOR条件が必要になった場合の対応方針を決める必要がある。

### 5. フリーテキストのスキル

定義済みenum値に含まれない特殊スキル（例: 「猿追い犬のハンドリング」「特定の罠メーカーの認定整備士」）をワーカーが自由記述できるようにするか。`bio` フィールドの活用 vs `specialties` への自由入力の許可。

---

## 参考資料

- [鳥獣保護管理法](https://elaws.e-gov.go.jp/document?lawid=414AC0000000088) — 狩猟免許・認定鳥獣捕獲等事業者制度の法的根拠
- [鳥獣被害防止特措法](https://elaws.e-gov.go.jp/document?lawid=419AC0000000134) — 鳥獣被害対策実施隊制度の法的根拠
- [環境省：認定鳥獣捕獲等事業者制度](https://www.env.go.jp/nature/choju/capture/capture.html) — 認定要件・申請手続き
- [PostgreSQL: GINインデックス](https://www.postgresql.org/docs/current/gin.html) — 配列演算子のインデックス設計

---

*Copyright © 2026 合同会社コツモ（kotsumo LLC）. All rights reserved.*
