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
