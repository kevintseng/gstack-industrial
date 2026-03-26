# gstack-industrial

> [English](README.md) | [繁體中文](README.zh-TW.md) | **日本語**

**Claude Code が自動的に最適なスキルを選んでくれる**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

---

## これは何？

Claude Code のスキルを何百個もインストールしたのに、どれを使えばいいか覚えられない？

**gstack-industrial** がその問題を解決します：

- **自動検出** — インストール済みの全 SKILL.md をスキャンし、ルーティングルールを自動構築
- **自動提案** — メッセージとプロジェクトの状態に基づいて最適なスキルを推薦
- **テンプレートシステム** — 標準を一度書くだけで、全スキルに自動適用
- **ゼロ干渉** — 本当に役立つ時だけ提案、スパムしません

---

## オリジナル gstack との違い

| オリジナル gstack | gstack-industrial |
|------------------|-------------------|
| 28 個のスキルを提供 | インストール済みの全スキルに**自動ルーティング** |
| どのスキルを使うか自分で覚える必要がある | 最適なスキルを**自動提案** |
| スキルを手動インストール後、自分で記憶 | セッション開始時に新しいスキルを**自動スキャン** |
| - | スパム防止メカニズム（クールダウン、回数制限） |
| - | テンプレートシステム（標準セクション共有） |

**一言で言うと**：gstack はスキルを提供し、gstack-industrial は検出とルーティングを自動化します

---

## クイックスタート

### インストール（2分）

```bash
# 1. クローン
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. 自動インストール
bun install
```

インストールスクリプトが自動的に：
- skill-router を `~/.claude/skills/templates/skill-router/` にコピー
- hooks を `~/.claude/hooks/` にコピー
- インストール済みの全スキルをスキャンし、ルーティングルールを構築
- UserPromptSubmit hook を登録（自動提案）
- SessionStart hook を登録（自動検出）
- デフォルト設定ファイルを作成

インストールは冪等です — 繰り返し実行しても重複した hook は作成されません。

### 使い方

**自動モード**（推奨）：何もしなくてOK、Claude が適切なタイミングで自動提案します

```
あなた：「この機能の実装方法を考えたい」
Claude が自動応答：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  提案：@brainstorming を使用
   構造化思考でアイデアを整理
   （"yes" で実行、"stop suggesting" で無効化）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**手動テスト**：

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "コードをレビューしたい" --debug
```

---

## Auto-Discovery（v1.1.0）

Claude Code セッション開始時に、auto-discover が `~/.claude/skills/` 配下の全 SKILL.md ファイルを自動スキャンします：

1. **frontmatter を解析** — `name` と `description` フィールドを読み取り
2. **キーワードを抽出** — description からトリガーワードを抽出（引用フレーズ、スラッシュコマンド、キー用語）
3. **フェーズを推定** — 説明から適用可能な開発フェーズを判断（think/plan/build/review/test/ship）
4. **matchers.json にマージ** — 新しいスキルは自動追加、手動ルールは上書きされません

**特徴：**
- 重複排除：同名スキルが複数ソースにある場合、gstack > plugin > standalone の優先度
- 冪等：繰り返し実行しても重複エントリは作成されない
- 手動ルール保護：`autoDiscovered: true` フラグで自動と手動を区別
- 1時間クールダウン：セッション再開のたびに再スキャンしない

**手動トリガー：**

```bash
# スキャンして更新
bun run discover

# プレビュー（書き込みなし）
bun run discover:dry
```

---

## どうやって提案内容を判断するの？

**Smart Router が分析：**

1. **あなたの言葉** — 「brainstorm」→ brainstorming スキルを提案
2. **プロジェクトの状態** — 未コミットのファイルがある → コードレビューを提案
3. **開発フェーズ** — 「マージ準備完了」→ finishing-branch スキルを提案
4. **スコア閾値** — スコア >= 80 のスキルのみ提案

**スパム防止メカニズム：**
- 5分以内に同じ提案を繰り返さない
- 1会話あたり最大10提案
- 同じスキルを3回連続で提案しない

---

## 詳細設定（任意）

デフォルトで使えますが、カスタマイズも可能：

**特定スキルの提案を無効化：**
`~/.claude/config/skill-router.json` を編集：
```json
{
  "disabledSkills": ["skill-judge"]
}
```

**クワイエットアワーを設定（夜間は提案しない）：**
```json
{
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

**特定スキルの優先度を上げる：**
```json
{
  "priorityBoosts": {
    "brainstorming": 20,
    "systematic-debugging": 15
  }
}
```

詳細：[INSTALL.md](INSTALL.md)

---

## ファイル構成

```
gstack-industrial/
├── skill-router/
│   ├── auto-discover.ts          # SKILL.md をスキャン -> matchers.json
│   ├── matchers.json             # ルーティングルール（手動 + 自動）
│   ├── matcher-engine.ts         # スコアリングエンジン
│   ├── context-extractor.ts      # コンテキスト抽出
│   ├── types.ts                  # 型定義
│   ├── index.ts                  # ルーターエントリポイント
│   ├── gen-skill-docs.ts         # テンプレートジェネレーター
│   ├── suggestion-formatter.ts   # 提案フォーマッター
│   └── test-cli.ts               # CLI テストツール
├── hooks/
│   ├── skill-router-before-message.ts    # UserPromptSubmit hook
│   └── skill-discovery-session-start.sh  # SessionStart hook
├── standard-sections/            # 共有テンプレートセクション
├── install.ts                    # インストールスクリプト
├── package.json
└── README.md
```

---

## アンインストール

```bash
# インストールされたファイルを削除
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/hooks/skill-discovery-session-start.sh
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json
rm ~/.claude/state/skill-discovery-last-run

# ~/.claude/settings.json を手動編集して関連 hooks を削除
```

---

## コントリビューション

PR 歓迎！手順：

1. このリポジトリをフォーク
2. feature ブランチを作成
3. 変更をテスト
4. PR を提出

詳しくは [CONTRIBUTING.md](CONTRIBUTING.md)

---

## ライセンス

MIT License - [LICENSE](LICENSE) を参照

---

## 謝辞

- **[Garry Tan](https://github.com/garrytan)** — gstack のオリジナル哲学
- **[Claude Code](https://claude.ai/code)** — 統合プラットフォーム
