# Roadmap: Postman Feature Suite Integration
## JMeter Web Studio (`D:\_Jmeter`) – Architecture & Capability Mapping

> **Căn cứ quy trình:** `.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md`  
> **Trạng thái:** 🟢 APPROVED – Ready for Sprint Execution  
> **Mục tiêu:** Tích hợp các tính năng nổi trội nhất của Postman vào JMeter Web Studio để tối ưu hóa trải nghiệm thiết kế và kiểm thử tải.

---

### 1. Ma Trận Đối Soát Năng Lực & Phân Bổ Sprint

| Mã Feature | Tên Tính Năng | Giá Trị Cốt Lõi | Mức Độ Khả Thi | Sprint Phân Bổ | Kế Hoạch Chi Tiết |
|:---|:---|:---|:---:|:---:|:---|
| **FEAT-P2** | **Scratchpad 1-Click Send & Inspect** | Gửi lẻ 1 request debug ngay trên editor, bypass CORS qua Node proxy. | 100% | **Sprint 9** | [sprint9-postman-scratchpad-env-switcher-plan.md](sprint9-postman-scratchpad-env-switcher-plan.md) |
| **FEAT-P3** | **Environment Switcher & UDV Sync** | Dropdown chuyển nhanh Dev/QC/Staging/Prod; tự động đồng bộ biến vào JMX UDV. | 100% | **Sprint 9** | [sprint9-postman-scratchpad-env-switcher-plan.md](sprint9-postman-scratchpad-env-switcher-plan.md) |
| **FEAT-P3b**| **Dynamic Variables & Chai Transpiler v1** | Tự ánh xạ `{{$guid}}`, `${var}` và dịch `pm.test` sang Response/JSONPath Assertion. | 90% | **Sprint 9** | [sprint9-postman-scratchpad-env-switcher-plan.md](sprint9-postman-scratchpad-env-switcher-plan.md) |
| **FEAT-P4** | **Local Lightweight Mock Server** | Giả lập endpoint phụ trợ `/mock/*` với status, delay và payload JSON mẫu. | 100% | **Sprint 10** | [sprint10-postman-mock-server-history-plan.md](sprint10-postman-mock-server-history-plan.md) |
| **FEAT-P5** | **Request History & Multi-Tab Workspace** | Lưu 50 request gần nhất (IndexedDB), mở nhiều tab request làm việc cùng lúc. | 100% | **Sprint 10** | [sprint10-postman-mock-server-history-plan.md](sprint10-postman-mock-server-history-plan.md) |
| **FEAT-P6** | **Data-Driven Testing (DDT) CSV Wizard** | Upload CSV, preview 5 dòng, tự động map cột vào biến `${var}` và tạo JMX config. | 100% | **Sprint 11** | [sprint11-postman-ddt-auth-helper-plan.md](sprint11-postman-ddt-auth-helper-plan.md) |
| **FEAT-P7** | **Advanced Auth Presets (OAuth2 / AWS)** | Wizard lấy Bearer token tự động hoặc sinh mã Groovy ký HMAC AWS SigV4. | 85% | **Sprint 11** | [sprint11-postman-ddt-auth-helper-plan.md](sprint11-postman-ddt-auth-helper-plan.md) |

---

### 2. Nguyên Tắc Điều Hướng Dành Cho AI Agent
1. **Chỉ đọc plan của Sprint đang thực thi:** Khi nhận nhiệm vụ Sprint 9, chỉ đọc `sprint9-postman-scratchpad-env-switcher-plan.md`. Không đọc Sprint 10 hoặc 11 để tiết kiệm token và tránh scope creep.
2. **Tuân thủ Proactive File Splitting:** Mọi file code mới phải tuân thủ trần số dòng: Component/Hook/Util ≤ 150 dòng, Service ≤ 200 dòng, Module ≤ 250 dòng.
3. **Evidence-Based Verification:** Bắt buộc chạy `npm run typecheck` và audit trước khi bàn giao.
