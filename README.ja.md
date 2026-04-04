# gstack-industrial

> [English](README.md) | [繁體中文](README.zh-TW.md) | **日本語**

**Claude Code スキルの自動提案 — gstack の拡張であって、置き換えではない**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

---

## これは何？

Claude Code のスキルを何百個もインストールしたのに、どれを使えばいいか覚えられない？

**gstack-industrial** がその問題を解決します：

- **自動検出** — インストール済みの全 SKILL.md をスキャンし、ルーティングルールを自動構築
- **自動提案** — メッセージとプロジェクトの状態に基づいて最適なスキルを推薦
- **使用フィードバック** — 承認/却下を学習し、優先度を自動調整
- **シーケンス学習** — gstack の timeline を読み、次に使うスキルを予測
- **リポモード対応** — Solo dev は低い閾値、collaborative は高い閾値（gstack 経由）
- **ゼロ干渉** — 本当に役立つ時だけ提案、スパムしません

すべての状態は**ローカルのみ**に保存。テレメトリなし、ネットワーク呼び出しなし。

---

## gstack との関係

gstack-industrial は **gstack の上に重ねるレイヤー**であり、置き換えではありません。gstack のインフラを再利用します：

| gstack が提供 | gstack-industrial が追加 |
|--------------|------------------------|
| 36+ のスキル（ship、review、qa、brainstorming など）| **自動提案**：任意のインストール済みスキル |
| `gstack-repo-mode` binary（solo/collaborative 検出）| **リポモード対応閾値**（gstack の出力を読む）|
| `timeline.jsonl`（スキル完了追跡）| **シーケンス学習**（gstack timeline を読み次のスキルを予測）|
| 手動呼び出し（`/ship`、`/review` など）| **積極的な提案** UserPromptSubmit hook 経由 |

**gstack が必須** — まず gstack をインストールしてから、gstack-industrial をインストール。

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
4. **リポモード** — Solo dev は低い閾値（60）、collaborative は高い閾値（85）
5. **あなたの履歴** — 承認したスキルを優先、却下したスキルを低優先化
6. **スキルパターン** — 過去のシーケンスから次のスキルを予測（gstack timeline 経由）

**スパム防止メカニズム：**
- クールダウン：5分以内に同じ提案を繰り返さない
- セッション上限：1セッション最大 500 提案（上限到達時は可視の警告、サイレント失敗なし）
- 同じスキルを3回連続で提案しない
- フィードバックベース：却下したスキルは時間とともに優先度が下がる

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

**リポモード閾値の調整：**
```json
{
  "repoModeThresholds": {
    "solo": 60,
    "collaborative": 85,
    "unknown": 80
  }
}
```

**フィードバック感度の調整：**
```json
{
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
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
