# サトノメ RFC（Request for Comments）

<p align="center">
  <strong>🦌 鳥獣被害対策の標準化を目指すオープン仕様書</strong>
</p>

---

## 📋 概要

本リポジトリは、**サトノメ**（鳥獣害対策 B2G SaaS）の開発過程で設計した技術仕様を、全国の自治体・猟友会・SaaS開発者に向けて公開するものです。

鳥獣被害報告のデータフォーマット、地図表示の最適化、ワーカー（鳥獣害対策従事者）のスキル管理など、**鳥獣害対策のDX**に関わるテーマを扱います。

## 📄 RFC一覧

| RFC | タイトル | ステータス | 概要 |
|-----|---------|-----------|------|
| [RFC-001](rfcs/001-standard-format.md) | 鳥獣被害報告データ 全国標準フォーマット | Draft | 被害・目撃・捕獲報告を統一的に扱う JSON スキーマの提案 |
| [RFC-002](rfcs/002-map-clustering.md) | 地図マーカークラスタリング | Draft | MapLibre GL JS を用いた大量マーカーの効率的な表示手法 |
| [RFC-003](rfcs/003-worker-specialties.md) | ワーカー専門スキル（specialties） | Draft | 鳥獣害対策従事者の実務スキルを構造化するタグ体系の提案 |

## 📁 ディレクトリ構成

```
satonome-rfcs/
├── rfcs/                          # RFC本文
│   ├── 001-standard-format.md     # 標準フォーマット
│   ├── 002-map-clustering.md      # 地図クラスタリング
│   └── 003-worker-specialties.md  # ワーカースペシャリティ
├── schemas/                       # JSON Schema
│   ├── report-v1.json             # 被害・目撃報告スキーマ
│   ├── capture-report-v1.json     # 捕獲報告スキーマ
│   └── worker-profile-v1.json     # ワーカープロフィールスキーマ
├── examples/                      # サンプルデータ・コード
│   ├── sample-report.json         # 被害報告サンプル
│   ├── sample-capture.json        # 捕獲報告サンプル
│   └── maplibre-clustering/       # MapLibre クラスタリング実装例
│       └── cluster-setup.ts
├── docs/                          # 補足ドキュメント
│   ├── animal-type-mapping.md     # 動物種コードマッピング
│   └── comparison-table.md        # 既存システム比較表
├── LICENSE                        # MIT License（コード・スキーマ）
├── LICENSE-DOCS                   # CC BY 4.0（RFC本文・ドキュメント）
└── README.md                      # 本ファイル
```

## 🔗 関連リンク

- **サトノメ公式サイト**: [https://satonome.app](https://satonome.app)
- **デモ環境**: [https://demo.satonome.app](https://demo.satonome.app)
- **開発元**: [合同会社コツモ（kotsumo LLC）](https://kotsumo.com)

## 💬 フィードバック

これらの仕様はDraft段階であり、広くフィードバックを募集しています。

- **Issue**: 質問・提案・バグ報告は [Issues](../../issues) へ
- **Pull Request**: 修正・追加提案は PR を歓迎します
- **Discussion**: 議論は [Discussions](../../discussions) へ

特に以下のような方からのご意見を歓迎します：

- 🏛️ 自治体の鳥獣害対策担当者
- 🔫 猟友会・認定鳥獣捕獲等事業者
- 💻 鳥獣害対策システムの開発者
- 🎓 野生動物管理の研究者

## 📜 ライセンス

本リポジトリはデュアルライセンスです：

| 対象 | ライセンス | ファイル |
|------|-----------|---------|
| RFC本文・ドキュメント（`rfcs/`、`docs/`） | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [LICENSE-DOCS](LICENSE-DOCS) |
| JSON Schema・コード例（`schemas/`、`examples/`） | [MIT License](https://opensource.org/licenses/MIT) | [LICENSE](LICENSE) |

**著作権**: © 2026 合同会社コツモ（kotsumo LLC）

---

<p align="center">
  🌾 鳥獣被害対策のデジタル化を、オープンな標準から。
</p>
