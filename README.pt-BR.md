<div align="center">

# gstack-industrial

**A skill certa do Claude Code, no momento certo — automaticamente**

*Camada de aprimoramento sobre [gstack](https://github.com/garrytan/gstack) — não é um substituto*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

## O que é isso?

Você instalou centenas de skills do Claude Code mas nunca lembra qual usar?

**gstack-industrial** monitora cada mensagem que você envia e — no momento certo — sugere a skill mais relevante. Diga "yes" e Claude recebe um briefing completo: quem ser, o estado do projeto quando a sugestão foi feita, e como executar.

- **Descoberta Automática** — Escaneia todos os SKILL.md instalados e constrói regras automaticamente
- **Sugestões com Contexto** — Correspondência com suas palavras, git, fase de desenvolvimento e histórico
- **Rótulos de Confiança** — `Altamente Recomendado` / `Sugerido` / `Pode Aplicar` para você saber a intensidade da sugestão
- **"yes" → Injeção de Contexto Completo** — Envia ao Claude um briefing XML (papel, snapshot de contexto, dicas)
- **Aprende com Você** — Aumenta prioridade de skills aceitas, reduz das recusadas
- **Zero Spam** — 5 min cooldown, cap de 500 por sessão, mesma skill não sugerida 3x seguidas
- **UI Multilíngue** — Sugestões no seu idioma (detecta locale do sistema automaticamente)
- **Totalmente Local** — Sem telemetria, sem chamadas de rede, todo estado em `~/.claude/`

---

## Relação com gstack

gstack-industrial é uma **camada sobre o gstack**, não um substituto. Reutiliza a infraestrutura do gstack:

| gstack fornece | gstack-industrial adiciona |
|----------------|---------------------------|
| 36+ skills (ship, review, qa, brainstorming, etc.) | **Auto-sugestão** de qualquer skill instalada |
| `gstack-repo-mode` binary (detecção solo/colaborativo) | **Limites conscientes do modo repo** (lê saída do gstack) |
| `timeline.jsonl` (rastreamento de conclusão de skill) | **Aprendizado de pares** (lê timeline do gstack para prever próxima skill) |
| Invocação manual (`/ship`, `/review`, etc.) | **Sugestões proativas** via UserPromptSubmit hook |

**gstack é obrigatório** — instale o gstack primeiro, depois o gstack-industrial.

---

## Início Rápido

### Instalação (2 minutos)

```bash
# 1. Clonar
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Auto-instalar
bun run install
```

### Atualização

```bash
git pull
bun run install
```

O instalador é idempotente — re-executar sobrescreve os arquivos instalados com a versão mais recente, mescla novos campos de configuração (preservando suas configurações) e pula hooks já registrados.

---

## Como ele sabe o que sugerir?

**Smart Router analisa:**

1. **Suas palavras** — "brainstorm" → sugere brainstorming skill
2. **Estado do projeto** — Arquivos não commitados → sugere code review
3. **Fase de desenvolvimento** — "pronto para merge" → sugere finishing-branch
4. **Modo repo** — Limite menor para devs solo (60), maior para colaborativo (85)
5. **Seu histórico** — Prioriza skills aceitas, penaliza dispensadas
6. **Padrões de skill** — Prevê próxima skill baseado em sequências passadas

**Mecanismos anti-spam:**
- Cooldown: sem sugestões repetidas em 5 minutos
- Limite de sessão: máximo 500 por sessão (aviso visível ao atingir, não falha silenciosa)
- Mesma skill não é sugerida 3 vezes seguidas
- Baseado em feedback: skills dispensadas têm prioridade reduzida ao longo do tempo

---

## Configuração Avançada (Opcional)

Edite `~/.claude/config/skill-router.json`:

```json
{
  "disabledSkills": ["skill-judge"],
  "repoModeThresholds": { "solo": 60, "collaborative": 85, "unknown": 80 },
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

**Substituição de idioma** (detectado automaticamente pelo locale do sistema):
```json
{ "lang": "pt-BR" }
```
Suporte: `en`, `zh-TW`, `zh-CN`, `ja`, `ko`, `pt-BR`, `id`, `vi`

Detalhes: [INSTALL.md](INSTALL.md)

---

## Licença

MIT License - veja [LICENSE](LICENSE)

## Agradecimentos

- **[Garry Tan](https://github.com/garrytan)** — Filosofia original do gstack
- **[Claude Code](https://claude.ai/code)** — Plataforma de integração
