<div align="center">

# gstack-industrial

**对的时机，自动推荐最适合的 Claude Code skill**

*建立在 [gstack](https://github.com/garrytan/gstack) 之上的增强层 — 不是取代*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

## 这是什么？

你装了上百个 Claude Code skills，但从来记不住该用哪个？

**gstack-industrial** 监视你发送的每一条消息，并在对的时机建议最相关的 skill。说「yes」后 Claude 会收到完整准备好的上下文——角色定义、建议时的项目状态、以及执行提示。

- **自动发现** — 扫描所有已安装的 SKILL.md，自动建立路由规则
- **上下文感知建议** — 根据你的消息、git 状态、开发阶段和历史记录匹配
- **信心标签** — `强烈建议` / `建议` / `可能适用`，让你知道建议强度
- **「yes」→ 完整上下文注入** — 发送结构化的简报给 Claude（角色、上下文快照、执行提示）
- **从使用中学习** — 提升你接受的 skill，降低你拒绝的 skill 优先级
- **零垃圾消息** — 5 分钟冷却、500 个 session 上限、同个 skill 不连续建议 3 次
- **多语言界面** — 建议以你的语言呈现（自动检测系统 locale）
- **完全本地** — 无 telemetry、无网络调用，所有状态在 `~/.claude/`

---

## 与 gstack 的关系

gstack-industrial 是 **gstack 的上层增强**，不是取代。它重用 gstack 的基础设施：

| gstack 提供 | gstack-industrial 加上 |
|------------|----------------------|
| 36+ 个 skills（ship、review、qa、brainstorming 等）| **自动建议**任何已安装的 skill |
| `gstack-repo-mode` binary（solo/collaborative 检测）| **Repo 模式感知门槛**（读 gstack 输出）|
| `timeline.jsonl`（skill 完成记录）| **序列学习**（读 gstack timeline 预测下一个 skill）|
| 手动调用（`/ship`、`/review` 等）| **主动建议**通过 UserPromptSubmit hook |

**需要先装 gstack** — 先装 gstack，再装 gstack-industrial。

---

## 快速开始

### 安装（2 分钟）

```bash
# 1. 下载
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. 自动安装
bun run install
```

安装脚本会自动：
- 复制 skill-router 到 `~/.claude/skills/templates/skill-router/`
- 复制 hooks 到 `~/.claude/hooks/`
- 扫描所有已安装的 skills，建立路由规则
- 注册 UserPromptSubmit hook（自动建议）
- 注册 SessionStart hook（自动发现新 skills）
- 创建默认配置文件

安装是幂等的——重复执行不会产生重复的 hook。

### 使用方式

**自动模式**（推荐）：什么都不用做，Claude 会在适当时机自动建议。

建议看起来像这样：

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 [建议] 使用 @brainstorming
   在开始写代码之前先用结构化方式整理想法
   根据：keywords: brainstorm • phase: think
   提示：决定方向前先探索 3 个以上的方案
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(Say "yes" to run, or "stop suggesting" to disable)
```

说「yes」后 Claude 会收到包含角色定义、上下文快照和执行提示的 XML 简报。

### 更新

```bash
git pull
bun run install
```

安装脚本是幂等的——重新执行会覆盖已安装的文件、合并新的设置字段（保留你的设置），并跳过已存在的 hook 注册。

**手动测试**：

```bash
cd ~/.claude/skills/templates/skill-router
bun run test-cli.ts "我要 review 代码" --debug
```

---

## Auto-Discovery

每次 Claude Code session 启动时，auto-discover 会自动扫描 `~/.claude/skills/` 下所有 SKILL.md 文件：

1. **解析 frontmatter** — 读取 `name` 和 `description` 字段
2. **提取关键字** — 从 description 中提取触发词
3. **推断阶段** — 根据描述判断适用的开发阶段（think/plan/build/review/test/ship）
4. **合并到 matchers.json** — 新 skills 自动加入，手动撰写的规则不会被覆盖

**特性：**
- 去重：同名 skill 来自多个来源时，优先保留 gstack > plugin > standalone
- 幂等：重复执行不会产生重复 entries
- 手动规则保护：有 `autoDiscovered: true` 标记区分自动和手动规则
- 1 小时冷却：避免每次 session resume 都重新扫描

---

## 它怎么知道该建议什么？

**Smart Router 分析：**

1. **你说的话** — 「brainstorm」→ 建议 brainstorming skill
2. **项目状态** — 有未提交的文件 → 建议 code review
3. **开发阶段** — 说「准备 merge」→ 建议 finishing-branch skill
4. **Repo 模式** — Solo dev 用较低门槛（60），collaborative 用较高门槛（85）
5. **你的历史** — 提升你常接受的 skill 优先级，降低你常拒绝的
6. **Skill 模式** — 根据你过去的序列预测下一个 skill（通过 gstack timeline）

**不会烦你的机制：**
- 冷却时间：5 分钟内不重复建议
- Session 上限：每个 session 最多 500 个建议（达到上限时显示可见警告，不会静默失败）
- 同个 skill 不会连续建议 3 次
- 反馈驱动：被你拒绝的 skill 优先级会逐步降低

---

## 高级配置（可选）

默认已经可以用，但你可以调整：

**关闭某些 skills 的建议：**
编辑 `~/.claude/config/skill-router.json`：
```json
{
  "disabledSkills": ["skill-judge"]
}
```

**设置安静时间（晚上不打扰）：**
```json
{
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

**提升特定 skill 的优先级：**
```json
{
  "priorityBoosts": {
    "brainstorming": 20,
    "systematic-debugging": 15
  }
}
```

**调整 repo 模式门槛：**
```json
{
  "repoModeThresholds": {
    "solo": 60,
    "collaborative": 85,
    "unknown": 80
  }
}
```

**调整反馈敏感度：**
```json
{
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

**语言设置**（默认自动检测系统 locale）：
```json
{ "lang": "zh-CN" }
```
支持：`en`、`zh-TW`、`zh-CN`、`ja`、`ko`、`pt-BR`、`id`、`vi`

详细说明：[INSTALL.md](INSTALL.md)

---

## 卸载

```bash
# 移除已安装的文件
rm -rf ~/.claude/skills/templates/skill-router
rm ~/.claude/skills/templates/*-section.md
rm ~/.claude/hooks/skill-router-before-message.ts
rm ~/.claude/hooks/skill-discovery-session-start.sh
rm ~/.claude/config/skill-router.json
rm ~/.claude/sessions/skill-router-state.json
rm ~/.claude/sessions/skill-router-feedback.json
rm ~/.claude/state/skill-discovery-last-run

# 手动编辑 ~/.claude/settings.json 移除相关 hooks
```

---

## 贡献

欢迎提交 PR！流程：

1. Fork 这个 repo
2. 创建 feature branch
3. 测试你的改动
4. 提交 PR

详见 [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 授权

MIT License - 详见 [LICENSE](LICENSE)

---

## 致谢

- **[Garry Tan](https://github.com/garrytan)** — gstack 原创哲学
- **[Claude Code](https://claude.ai/code)** — 集成平台
