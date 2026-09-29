# Learning Candidates (Pending Gate 0.5 Review)

> [!NOTE]
> Nơi chứa bài học, quan sát, quy tắc mới do các Role trích xuất sau Feature, Bug fix, Review, QA hoặc Incident.
> - Các candidate ở đây CHƯA PHẢI LÀ STANDARD cho đến khi được Knowledge Curator duyệt qua Gate 0.5.
> - Candidate đã có quyết định cuối (`PROMOTED`, `REJECTED`, `RESOLVED`, `AUTOMATED`, `LOCALIZED`) được `master optimize` chuyển sang `.ai/learning/archive/`.
> - Tối đa 15 dòng/candidate, súc tích theo chuẩn DO/DON'T.

## Trước khi thêm candidate mới (bắt buộc)
1. Chỉ đúng cho một file/feature: ghi 1 dòng comment ngay tại vị trí code liên quan; không tạo candidate.
2. Tìm trùng: grep từ khóa nguyên nhân gốc trong file này và `.ai/knowledge/`, chỉ lấy dòng khớp (tối đa ~20 dòng), không mở cả file. Archive lớn dần nên chỉ grep dòng `Key:` (ví dụ `grep -rh "Key:.*race" .ai/learning/archive/`); chỉ mở block khi `Key` khớp.
3. Đã có candidate cùng nguyên nhân: chỉ thêm 1 dòng vào `Evidence` của candidate đó (tối đa 3 dòng). Không tạo mục mới.
4. Đã có rule trong `.ai/knowledge/`: chỉ tạo candidate khi rule sai, thiếu phạm vi hoặc lỗi thời; ghi RULE-ID trong `Quan sát`.
5. Chưa có (hoặc chỉ còn trong archive): tạo mục mới theo mẫu bên dưới; nếu từng có trong archive thì giữ `Key` cũ và chép evidence cũ.

`Key` là kebab-case mô tả nguyên nhân gốc, không mô tả feature (ví dụ `stale-response-overwrite`).

<!-- Mẫu candidate:
### [LEARN-001] Tiêu đề ngắn
- **Key:** nguyen-nhan-goc-kebab-case
- **Scope:** FEATURE-LOCAL | MODULE | PROJECT
- **Severity:** CRITICAL (bảo mật, mất/sai dữ liệu, tiền, pháp lý) | HIGH (đã gây sự cố production hoặc chặn release) | NORMAL
- **Quan sát:** 1–2 câu: hiện tượng và nguyên nhân gốc
- **DO:** Hành vi chuẩn nên làm
- **DON'T:** Hành vi cấm / lỗi cần tránh
- **Evidence:** (mỗi lần gặp lại thêm 1 dòng, tối đa 3)
  - YYYY-MM-DD · FEATURE-X / BUG-Y · Role · đường dẫn file hoặc PR
- **Owner duyệt:** Tech Lead | Principal QA | BA
- **Status:** PENDING
-->
