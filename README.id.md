<div align="center">

# gstack-industrial

**Skill Claude Code yang tepat, di saat yang tepat — otomatis**

*Lapisan peningkatan di atas [gstack](https://github.com/garrytan/gstack) — bukan pengganti*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

## Apa ini?

Anda menginstal ratusan skill Claude Code tapi tidak pernah ingat yang mana harus digunakan?

**gstack-industrial** memantau setiap pesan yang Anda kirim dan — di saat yang tepat — menyarankan skill paling relevan. Ucapkan "yes" dan Claude menerima briefing lengkap: peran yang harus diemban, status proyek saat saran dibuat, dan petunjuk eksekusi.

- **Penemuan Otomatis** — Memindai semua SKILL.md terinstal dan membangun aturan routing secara otomatis
- **Saran Berbasis Konteks** — Pencocokan berdasarkan kata-kata, git, fase pengembangan, dan riwayat
- **Label Kepercayaan** — `Sangat Disarankan` / `Disarankan` / `Mungkin Berlaku` untuk mengetahui kekuatan saran
- **"yes" → Injeksi Konteks Lengkap** — Mengirim briefing XML ke Claude (peran, snapshot konteks, petunjuk)
- **Belajar dari Penggunaan** — Meningkatkan prioritas skill yang diterima, mengurangi yang ditolak
- **Tanpa Spam** — 5 menit cooldown, batas 500/sesi, skill sama tidak disarankan 3x berturut-turut
- **UI Multibahasa** — Saran ditampilkan dalam bahasa Anda (deteksi locale sistem otomatis)
- **Sepenuhnya Lokal** — Tanpa telemetri, tanpa panggilan jaringan, semua state di `~/.claude/`

---

## Hubungan dengan gstack

gstack-industrial adalah **lapisan di atas gstack**, bukan pengganti. Ia menggunakan kembali infrastruktur gstack:

| gstack menyediakan | gstack-industrial menambahkan |
|-------------------|------------------------------|
| 36+ skill (ship, review, qa, brainstorming, dll.) | **Auto-saran** skill terinstal apa pun |
| `gstack-repo-mode` binary (deteksi solo/kolaboratif) | **Ambang sadar mode repo** (membaca output gstack) |
| `timeline.jsonl` (pelacakan penyelesaian skill) | **Pembelajaran pasangan** (membaca timeline gstack untuk prediksi) |
| Panggilan manual (`/ship`, `/review`, dll.) | **Saran proaktif** via UserPromptSubmit hook |

**gstack wajib** — instal gstack dulu, lalu gstack-industrial.

---

## Mulai Cepat

### Instalasi (2 menit)

```bash
# 1. Clone
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Auto-install
bun run install
```

### Pembaruan

```bash
git pull
bun run install
```

Installer bersifat idempotent — menjalankan ulang akan menimpa file yang terinstal dengan versi terbaru, menggabungkan field konfigurasi baru (mempertahankan pengaturan Anda), dan melewati hook yang sudah terdaftar.

---

## Bagaimana ia tahu apa yang harus disarankan?

**Smart Router menganalisis:**

1. **Kata-kata Anda** — "brainstorm" → menyarankan skill brainstorming
2. **Status proyek** — File belum di-commit → menyarankan code review
3. **Fase pengembangan** — "siap merge" → menyarankan finishing-branch
4. **Mode repo** — Ambang lebih rendah untuk dev solo (60), lebih tinggi untuk kolaboratif (85)
5. **Riwayat Anda** — Meningkatkan skill yang sering diterima, menurunkan yang ditolak
6. **Pola skill** — Memprediksi skill berikutnya dari sekuensi masa lalu

**Mekanisme anti-spam:**
- Cooldown: tidak ada saran berulang dalam 5 menit
- Batas sesi: maksimal 500 per sesi (peringatan terlihat saat tercapai, tidak gagal diam)
- Skill yang sama tidak disarankan 3 kali berturut-turut
- Berbasis feedback: skill yang ditolak prioritasnya menurun seiring waktu

---

## Konfigurasi Lanjutan (Opsional)

Edit `~/.claude/config/skill-router.json`:

```json
{
  "disabledSkills": ["skill-judge"],
  "repoModeThresholds": { "solo": 60, "collaborative": 85, "unknown": 80 },
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

Detail: [INSTALL.md](INSTALL.md)

---

## Lisensi

MIT License - lihat [LICENSE](LICENSE)

## Ucapan Terima Kasih

- **[Garry Tan](https://github.com/garrytan)** — Filosofi asli gstack
- **[Claude Code](https://claude.ai/code)** — Platform integrasi
