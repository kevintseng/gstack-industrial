<div align="center">

# gstack-industrial

**Skill Claude Code phù hợp, đúng lúc — tự động**

*Lớp tăng cường trên [gstack](https://github.com/garrytan/gstack) — không phải là thay thế*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/github/v/release/kevintseng/gstack-industrial?style=for-the-badge&color=blue)](https://github.com/kevintseng/gstack-industrial/releases)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Compatible-D97757?style=for-the-badge)](https://claude.ai/code)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=for-the-badge&logo=bun)](https://bun.sh)

[![Stars](https://img.shields.io/github/stars/kevintseng/gstack-industrial?style=social)](https://github.com/kevintseng/gstack-industrial/stargazers)
[![Issues](https://img.shields.io/github/issues/kevintseng/gstack-industrial)](https://github.com/kevintseng/gstack-industrial/issues)

[**English**](README.md) | [**繁體中文**](README.zh-TW.md) | [**简体中文**](README.zh-CN.md) | [**日本語**](README.ja.md) | [**한국어**](README.ko.md) | [**Português**](README.pt-BR.md) | [**Bahasa**](README.id.md) | [**Tiếng Việt**](README.vi.md)

</div>

---

## Đây là gì?

Bạn đã cài hàng trăm skill Claude Code nhưng không bao giờ nhớ nên dùng cái nào?

**gstack-industrial** theo dõi mọi tin nhắn bạn gửi và — đúng lúc — đề xuất skill phù hợp nhất. Nói "yes" và Claude nhận được briefing đầy đủ: vai trò cần đảm nhận, trạng thái dự án lúc đề xuất được tạo, và gợi ý thực thi.

- **Tự động phát hiện** — Quét tất cả SKILL.md đã cài và xây dựng quy tắc định tuyến tự động
- **Đề xuất theo ngữ cảnh** — Khớp dựa trên lời nói, git, giai đoạn phát triển và lịch sử
- **Nhãn độ tin cậy** — `Đề xuất mạnh` / `Đề xuất` / `Có thể áp dụng` để biết mức độ đề xuất
- **"yes" → Tiêm ngữ cảnh đầy đủ** — Gửi briefing XML cho Claude (vai trò, snapshot ngữ cảnh, gợi ý)
- **Học từ sử dụng** — Tăng ưu tiên skill được chấp nhận, giảm skill bị từ chối
- **Không spam** — Cooldown 5 phút, giới hạn 500/session, cùng skill không đề xuất 3 lần liên tiếp

Tất cả state đều **chỉ lưu cục bộ**. Không telemetry. Không cuộc gọi mạng.

---

## Quan hệ với gstack

gstack-industrial là **lớp trên gstack**, không phải thay thế. Nó tái sử dụng hạ tầng của gstack:

| gstack cung cấp | gstack-industrial thêm vào |
|----------------|---------------------------|
| 36+ skill (ship, review, qa, brainstorming, v.v.) | **Tự động đề xuất** bất kỳ skill đã cài |
| `gstack-repo-mode` binary (phát hiện solo/cộng tác) | **Ngưỡng nhận biết chế độ repo** (đọc output gstack) |
| `timeline.jsonl` (theo dõi hoàn thành skill) | **Học cặp** (đọc timeline gstack để dự đoán) |
| Gọi thủ công (`/ship`, `/review`, v.v.) | **Đề xuất chủ động** qua UserPromptSubmit hook |

**gstack là bắt buộc** — cài gstack trước, sau đó cài gstack-industrial.

---

## Bắt đầu nhanh

### Cài đặt (2 phút)

```bash
# 1. Clone
git clone https://github.com/kevintseng/gstack-industrial.git
cd gstack-industrial

# 2. Tự động cài
bun install
```

### Cập nhật

```bash
git pull
bun install
```

Installer là idempotent — chạy lại sẽ ghi đè các file đã cài với phiên bản mới nhất, hợp nhất các trường cấu hình mới (giữ nguyên cài đặt của bạn), và bỏ qua hook đã đăng ký.

---

## Làm sao nó biết nên đề xuất gì?

**Smart Router phân tích:**

1. **Lời bạn nói** — "brainstorm" → đề xuất skill brainstorming
2. **Trạng thái dự án** — File chưa commit → đề xuất code review
3. **Giai đoạn phát triển** — "sẵn sàng merge" → đề xuất finishing-branch
4. **Chế độ repo** — Ngưỡng thấp hơn cho dev solo (60), cao hơn cho cộng tác (85)
5. **Lịch sử của bạn** — Nâng ưu tiên skill thường được chấp nhận, giảm cho skill bị từ chối
6. **Mẫu skill** — Dự đoán skill tiếp theo từ chuỗi quá khứ

**Cơ chế chống spam:**
- Cooldown: không đề xuất lặp lại trong 5 phút
- Giới hạn session: tối đa 500 mỗi session (cảnh báo nhìn thấy khi đạt, không lỗi âm thầm)
- Cùng một skill không được đề xuất 3 lần liên tiếp
- Dựa trên phản hồi: skill bị từ chối giảm ưu tiên theo thời gian

---

## Cấu hình nâng cao (Tùy chọn)

Chỉnh sửa `~/.claude/config/skill-router.json`:

```json
{
  "disabledSkills": ["skill-judge"],
  "repoModeThresholds": { "solo": 60, "collaborative": 85, "unknown": 80 },
  "feedbackBoost": 20,
  "feedbackPenalty": 30,
  "showLimitWarnings": true
}
```

Chi tiết: [INSTALL.md](INSTALL.md)

---

## Giấy phép

MIT License - xem [LICENSE](LICENSE)

## Lời cảm ơn

- **[Garry Tan](https://github.com/garrytan)** — Triết lý gốc của gstack
- **[Claude Code](https://claude.ai/code)** — Nền tảng tích hợp
