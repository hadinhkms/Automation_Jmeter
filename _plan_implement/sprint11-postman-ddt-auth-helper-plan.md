# Sprint 11 – Implementation Plan
## FEAT-P6: Data-Driven Testing (DDT) CSV Wizard | FEAT-P7: Advanced Auth Helpers (OAuth2 & AWS SigV4)

> **Căn cứ:** `.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md`  
> **Trạng thái:** 🔵 BACKLOG (Thực thi sau khi hoàn thành Sprint 10)  
> **Kiến trúc:** Tuân thủ Proactive File Splitting (Mỗi file ≤ 150 dòng)

---

## 1. Gate 1 – BA / PO Discovery (Phase A1)

### 1.1 In-Scope & Acceptance Criteria
- **FEAT-P6 Data-Driven Testing (DDT) Wizard:** Upload file CSV dữ liệu test, render bảng preview 5 dòng đầu tiên; 1-click tự động map tên cột thành biến `${col_name}` và sinh node `CSVDataSetConfig` chuẩn hóa đường dẫn portable trong JMeter.
- **FEAT-P7 Advanced Auth Helpers:**
  - *OAuth 2.0 Helper:* Tự động gọi endpoint Auth lấy Access Token và gán vào Header Manager.
  - *AWS SigV4 Helper:* Sinh đoạn mã `JSR223PreProcessor` (Groovy) tự động tính toán chữ ký HMAC-SHA256 theo chuẩn AWS Signature Version 4.

### 1.2 User Flow
```text
[HTTP Sampler Editor] -> Tab [Data Source] -> Bấm [+ Import CSV Data]
  -> Upload "users.csv" -> Render bảng xem trước: [username | password | role]
  -> Bấm [Tạo CSV Data Set Config] -> Tự sinh node trong JMX Tree với tên biến: username,password,role
[HTTP Sampler Editor] -> Tab [Auth] -> Chọn [AWS Signature v4] -> Nhập AccessKey/SecretKey -> Tự sinh Groovy PreProcessor
```

---

## 2. Gate 1.5 & Gate 2 – UI/UX & Validation (Phase A2/A3)
- **DDT Wizard Modal:** Modal width 750px hiển thị dữ liệu bảng 5 dòng, phát hiện delimiter (phẩy `,`, chấm phẩy `;`, tab `\t`).
- **Validation:** File CSV phải có hàng tiêu đề (header row); dung lượng file upload tối đa 20MB.

---

## 3. Gate 3 – Dev Implementation Architecture (Phase B)

### 3.1 Danh Sách File Triển Khai
| File | Loại | Dòng | Trách Nhiệm Duy Nhất |
|:---|:---:|:---:|:---|
| `src/components/common/ddt/DdtWizardModal.tsx` | **NEW** | ~140 | Modal giao diện import CSV và preview bảng dữ liệu. |
| `src/utils/ddt/csvPreviewParser.ts` | **NEW** | ~80 | Parser đọc 5 dòng đầu và trích xuất header từ CSV. |
| `src/utils/auth/awsSigV4Generator.ts` | **NEW** | ~110 | Sinh mã Groovy chuẩn ký HMAC-SHA256 cho AWS SigV4. |
| `src/utils/auth/oauth2TokenFetcher.ts` | **NEW** | ~120 | Client fetcher trao đổi token OAuth 2.0 (Client Credentials/Password). |
| `src/editors/ProtocolEditors.tsx` | **EDIT** | +20 | Nhúng Auth Wizard vào tab Auth của HTTP Request Editor. |

---

## 4. Gate 4 – QA Verification Checklist (Phase D)
- [ ] Upload CSV hợp lệ -> Preview hiển thị đúng 5 dòng, sinh đúng node `CSVDataSetConfig`.
- [ ] File CSV không có header hoặc rỗng -> Báo lỗi thân thiện.
- [ ] Cấu hình AWS SigV4 -> Request gửi đi có header `Authorization: AWS4-HMAC-SHA256...` hợp lệ.
- [ ] `npm run typecheck` đạt 0 lỗi.
