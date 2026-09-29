# Project JMeter Agent Rules

## Canonical Single Source of Truth
Mọi yêu cầu phát triển phần mềm, thay đổi UI/UX, kịch bản test hoặc cải tiến kỹ thuật trong toàn bộ dự án BẮT BUỘC phải tuân thủ tài liệu quy trình chuẩn duy nhất tại:

- **Quy trình tổng thể & Playbook:** [.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md](.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md) (hoặc [D:\_Master_Process\SOFTWARE_DELIVERY_PROCESS_MASTER.md](file:///D:/_Master_Process/SOFTWARE_DELIVERY_PROCESS_MASTER.md))
- **Thư mục Prompts chuẩn:** [.master_process/prompts/](.master_process/prompts/)

## Tối Ưu Tốc Độ & Tiết Kiệm Token (Speed & Token-Saving Policy)
- **Tác vụ nhỏ/vừa (L1/L2):** Dùng ngay file gộp siêu tốc [.master_process/prompts/00_Fast_Track_L1_L2.prompt.md](.master_process/prompts/00_Fast_Track_L1_L2.prompt.md) để giải quyết trọn vẹn cả 5 vai trò trong 1 lượt prompt duy nhất, tiết kiệm 80% token.
- **Tác vụ lớn (L3/L4):** Thực hiện tuần tự qua các file prompt con tương ứng (A1 -> A2 -> A3 -> B -> C -> D -> E).
- **Nguyên tắc phản hồi:** Trả lời trực diện, súc tích, đi thẳng vào bảng ma trận, code diff và checklist kiểm thử; KHÔNG chào hỏi xã giao, KHÔNG lặp lại toàn bộ đề bài, KHÔNG giải thích triết lý lan man để tiết kiệm tối đa token context.

## Mandatory 5-Phase Delivery Process
1. **Principal BA / PO** (.master_process/prompts/01_A1_BA_Discovery_Plan.prompt.md): Phân tích yêu cầu, In/Out scope, User flow, đề xuất solution và lập **Implementation Plan** (mở Technical Spike nếu có rủi ro kỹ thuật). Chốt Gate 1: Requirement Ready.
2. **Principal Designer (UI/UX)** (.master_process/prompts/03_A2_Designer_UIUX_Spec.prompt.md): Thẩm định chuẩn web hiện đại, phân cấp thị giác, workspace ergonomics, tokens, responsive (390px) và Dark/Light theme.
3. **Principal BA (Validation Audit)** (.master_process/prompts/04_A3_BA_Validation_Audit.prompt.md): Rà soát logic nghiệp vụ, lập ma trận **Mandatory vs Optional**, ma trận trạng thái Buttons (idle, loading, disabled, confirmation dialog), quy tắc validation inline/toast. Chốt Gate 2: Ready for Dev (Handoff Package).
4. **Principal Developer / Tech Lead (20+ YOE)** (.master_process/prompts/05_B_Dev_Implementation.prompt.md): Thẩm định kỹ thuật, xuất Implementation Preview trước khi code, Clean Architecture, an toàn concurrency, tối ưu hiệu năng chống lag/leak bộ nhớ.
5. **Principal QA / Test Architect (10+ YOE)** (.master_process/prompts/07_D_QA_Verification_Gate4.prompt.md): Thẩm định và verify lại toàn bộ sản phẩm theo đúng **Implementation Plan**, BVA, Fault Injection, Responsive, Theme, chạy build. **CHẶN BÀN GIAO NẾU CÒN BUG.** Chốt Gate 4: Ready for Release.

## CLI & Tooling
```powershell
python "D:/_Master_process/master.py" doctor .
python "D:/_Master_process/master.py" audit .
python "D:/_Master_process/master.py" optimize .
```

## Kỷ luật Giới hạn Kích thước File & Chủ Động Tách File (Proactive File Splitting Protocol)
- **TUYỆT ĐỐI KHÔNG TẠO FILE NGUYÊN KHỐI (MONOLITH):** Tuân thủ trần số dòng theo `config/quality-policy.json`: UI Component ≤ 150 dòng, Hook ≤ 150 dòng, Utils/Helpers ≤ 150 dòng, Service/Client ≤ 200 dòng, Module khác/Backend/Scripts ≤ 250 dòng, Test Scripts ≤ 800 dòng.
- **CẢNH BÁO SỚM & CHỦ ĐỘNG TÁCH FILE TẠI VÙNG VÀNG (80% LIMIT):**
  - Khi một file đạt hoặc dự kiến sau khi sửa sẽ đạt **≥ 80% ngưỡng cho phép** (Component/Hook/Util ≥ 120 dòng, Service ≥ 160 dòng, Module ≥ 200 dòng, Test ≥ 650 dòng): AI **BẮT BUỘC DỪNG VIỆC THÊM LOGIC VÀO FILE ĐÓ** và **CHỦ ĐỘNG TÁCH FILE NGAY**.
  - Không chờ đến khi vượt trần, bị lỗi git hook pre-commit hoặc audit chặn đứng mới vội vã sửa.
- **CHIẾN LƯỢC TÁCH FILE CHUẨN KIẾN TRÚC:**
  - *Frontend:* Tách Sub-components cho các phần UI độc lập; tách state/effects vào Custom Hooks; tách types và constants ra file riêng.
  - *Backend & Modules:* Tách theo Clean Architecture (Router → Service → Repository → Schemas → Mappers); tách helper logic ra utils riêng.

## Kỷ luật Thực chứng khi Test & Re-test (Evidence-Based Verification Protocol)
- **CẤM TỰ QUY LUẬN / SUY DIỄN:** Tuyệt đối không được nhìn code rồi tự suy luận "logic trông đúng rồi nên chắc chắn test pass" hoặc "chỉ sửa một dòng nên không cần test lại".
- **BẮT BUỘC ĐÍNH KÈM EVIDENCE BLOCK:** Sau khi implement hay fix bug, BẮT BUỘC phải thực thi lệnh test thực tế trên terminal và báo cáo đủ 5 yếu tố:
  1. **Exact Command:** Lệnh chạy thực tế (ví dụ: `npm test`, `npx tsc --noEmit`, `npx vite build`).
  2. **Exit Code:** Mã thoát thực tế từ tiến trình (`exit 0` nếu pass, khác 0 nếu fail).
  3. **Quantitative Metrics:** Tổng số test pass/fail/skipped và thời gian chạy thực tế.
  4. **Terminal Output Snippet:** Trích xuất log thực tế mà máy tính in ra chứng minh test đã thực sự chạy.
  5. **Git Revision & Working Tree:** Commit SHA và trạng thái clean/dirty của working tree tại thời điểm test.

