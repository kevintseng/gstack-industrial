<div align="center">

# gstack-industrial

**적절한 순간에, 가장 적합한 Claude Code 스킬을 자동으로 제안합니다**

*[gstack](https://github.com/garrytan/gstack) 위에 얹는 강화 레이어 — 대체가 아님*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

## 이것은 무엇인가요?

Claude Code 스킬을 수백 개 설치했는데 어떤 것을 사용해야 할지 기억이 안 나시나요?

**gstack-industrial**은 당신이 보내는 모든 메시지를 감시하며, 적절한 순간에 가장 관련성 높은 스킬을 제안합니다. "yes"라고 하면 Claude는 완전히 준비된 컨텍스트를 받습니다 — 역할 정의, 제안 당시의 프로젝트 상태, 실행 힌트.

- **자동 검색** — 설치된 모든 SKILL.md를 스캔하고 라우팅 규칙을 자동 구축
- **컨텍스트 인식 제안** — 메시지, git 상태, 개발 단계, 사용 기록에 기반해 매칭
- **신뢰도 레이블** — `강력 추천` / `추천` / `가능한 적용`으로 제안 강도 표시
- **"yes" → 완전한 컨텍스트 주입** — 역할, 컨텍스트 스냅샷, 실행 힌트를 XML로 Claude에 전송
- **사용에서 학습** — 수락한 스킬 우선, 거부한 스킬 우선순위 낮춤
- **제로 스팸** — 5분 쿨다운, 세션 상한 500, 같은 스킬 3번 연속 제안 없음

모든 상태는 **로컬에만 저장**됩니다. 텔레메트리 없음, 네트워크 호출 없음.

---

## gstack과의 관계

gstack-industrial은 **gstack 위의 강화 레이어**이지 대체가 아닙니다. gstack 인프라를 재사용합니다:

| gstack 제공 | gstack-industrial 추가 |
|-----------|---------------------|
| 36+ 스킬 (ship, review, qa, brainstorming 등) | **자동 제안**: 설치된 모든 스킬 |
| `gstack-repo-mode` binary (solo/collaborative 감지) | **Repo 모드 인식 임계값** (gstack 출력 읽기) |
| `timeline.jsonl` (스킬 완료 추적) | **시퀀스 학습** (gstack timeline 읽어 다음 스킬 예측) |
| 수동 호출 (`/ship`, `/review` 등) | **능동적 제안** UserPromptSubmit hook 경유 |

**gstack이 필수** — 먼저 gstack을 설치한 후 gstack-industrial을 설치하세요.

---

## 빠른 시작

### 설치 (2분)

```bash
# 1. 클론
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. 자동 설치
bun install
```

설치 스크립트가 자동으로:
- skill-router를 `~/.claude/skills/templates/skill-router/`에 복사
- hooks를 `~/.claude/hooks/`에 복사
- 설치된 모든 스킬 스캔, 라우팅 규칙 구축
- UserPromptSubmit hook 등록 (자동 제안)
- SessionStart hook 등록 (자동 검색)
- 기본 설정 파일 생성

설치는 idempotent합니다 — 재실행해도 중복 hook이 생기지 않습니다.

### 사용 방법

**자동 모드** (권장): 아무것도 할 필요 없음, Claude가 적절한 시점에 자동 제안합니다.

제안은 이렇게 표시됩니다:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 [추천] 使用 @brainstorming
   Brainstorm ideas with structured thinking
   根據：keywords: brainstorm • phase: think
   提示：Explore the problem space before proposing solutions
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(Say "yes" to run, or "stop suggesting" to disable)
```

### 업데이트

```bash
git pull
bun install
```

---

## 어떻게 제안 내용을 판단하나요?

**Smart Router 분석:**

1. **당신의 말** — "brainstorm" → brainstorming 스킬 제안
2. **프로젝트 상태** — 커밋되지 않은 파일 → code review 제안
3. **개발 단계** — "merge 준비 완료" → finishing-branch 스킬 제안
4. **Repo 모드** — Solo dev는 낮은 임계값 (60), collaborative는 높은 임계값 (85)
5. **당신의 이력** — 자주 수락하는 스킬 우선순위 ↑, 거부하는 것 ↓
6. **스킬 패턴** — 과거 시퀀스에서 다음 스킬 예측 (gstack timeline 경유)

**방해 방지:**
- 쿨다운: 5분 내 중복 제안 없음
- 세션 상한: 세션당 최대 500개 (도달 시 가시적 경고, 조용한 실패 없음)
- 같은 스킬 3회 연속 제안 없음
- 피드백 기반: 거부한 스킬 우선순위 점진적 감소

---

## 고급 설정 (선택)

`~/.claude/config/skill-router.json` 편집:

```json
{
  "disabledSkills": ["skill-judge"],
  "repoModeThresholds": { "solo": 60, "collaborative": 85, "unknown": 80 },
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

자세한 내용: [INSTALL.md](INSTALL.md)

---

## 라이선스

MIT License - [LICENSE](LICENSE) 참조

## 감사의 말

- **[Garry Tan](https://github.com/garrytan)** — gstack 원조 철학
- **[Claude Code](https://claude.ai/code)** — 통합 플랫폼
