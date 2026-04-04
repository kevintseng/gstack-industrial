# Security Policy

## Privacy

gstack-industrial is **local-only**. It does not:

- Send telemetry
- Make network calls
- Upload usage data
- Track users

All state (`~/.claude/sessions/skill-router-*.json`) stays on your machine.

## Reporting a Vulnerability

If you find a security issue, please report it privately:

- **GitHub Security Advisories**: https://github.com/kevintseng/gstack-industrial/security/advisories/new
- **Email**: open a private security advisory via GitHub

Please do **not** open a public issue for security vulnerabilities.

## What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Time

This is a hobby project maintained in spare time. I'll respond as soon as I can, typically within a week.

## Scope

In scope:
- Command injection in hook scripts
- Path traversal in file operations
- Code execution via malformed config/matchers

Out of scope:
- Vulnerabilities in Claude Code itself
- Vulnerabilities in gstack (report to https://github.com/garrytan/gstack)
- Vulnerabilities in Bun runtime
