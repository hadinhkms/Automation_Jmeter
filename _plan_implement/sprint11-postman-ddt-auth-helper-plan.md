# Sprint 11 – Implementation Plan
## FEAT-P6: Data-Driven Testing (DDT) CSV Wizard | FEAT-P7: Advanced Auth Helpers (OAuth2 & AWS SigV4)

> **Căn cứ:** `.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md`  
> **Trạng thái:** ✅ DONE (2026-11-19) – xem mục 5 Implementation Notes  
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
- [x] Upload CSV hợp lệ -> Preview hiển thị đúng 5 dòng, sinh đúng node `CSVDataSetConfig`. *(TC-DDT-01/02/06; UI: 8-row CSV → 5 preview rows, delimiter `;` detected, `${var}` names editable)*
- [x] File CSV không có header hoặc rỗng -> Báo lỗi thân thiện. *(TC-DDT-03/04; UI: "The CSV file is empty." / "The first row looks like data … Add a header row such as \"username,password\"")*
- [x] Cấu hình AWS SigV4 -> Request gửi đi có header `Authorization: AWS4-HMAC-SHA256...` hợp lệ. *(TC-SIGV4-01/02 khớp AWS test vector `get-vanilla` + IAM docs; TC-SIGV4-05 chạy JMeter 5.6.3 thật với Groovy sinh ra, server nhận header và tự ký lại → khớp 100%)*
- [x] `npm run typecheck` đạt 0 lỗi.

---

## 5. Implementation Notes (Sprint 11 delivered)
| File | Ghi chú |
|:---|:---|
| `src/utils/ddt/csvPreviewParser.ts` | Đọc CSV (BOM/CRLF, quoted `""`), auto-detect `,` `;` `	`, preview 5 dòng, lỗi thân thiện: rỗng / không header / header trùng / header-only; giới hạn 20MB + đuôi file. |
| `src/utils/ddt/csvVariableMapping.ts` | Map cột → `${var}` (sanitize, validate trùng/không hợp lệ) và build properties `CSVDataSet` (`ignoreFirstLine=true`, tab → `	`). |
| `src/components/common/ddt/*` | `DdtWizardModal` (750px, responsive 390px) + `DdtPreviewTable`, `DdtRunOptionsFields`, `useDdtWizard`. File upload qua `projectAssetService.uploadAsset(file,'data')` → đường dẫn project-relative `data/<file>.csv`. Mở từ **Tools → Data-Driven Test – Import CSV…** hoặc nút toolbar; node chèn vào node đang chọn (fallback parent/Thread Group như `insertNode`). |
| `src/utils/auth/awsSigV4Signer.ts` + `awsSigV4Canonical.ts` | Signer tham chiếu (Web Crypto) – dùng để test với AWS test vector. |
| `src/utils/auth/awsSigV4Groovy.ts` + `awsSigV4Generator.ts` | Sinh `JSR223PreProcessor` (property `language: 'groovy'`). Script đọc key **theo tên biến** (JMeter var → `-J` property → env var), không bao giờ chứa key thật, không chứa `${` (tránh JMeter substitute). Validate region/service, chặn dán key thật (`AKIA…`/secret 40 ký tự) vào ô tên biến. Hỗ trợ session token, `X-Amz-Content-Sha256` (bắt buộc với S3). |
| `src/utils/auth/oauth2TokenFetcher.ts` + `oauth2TokenResponse.ts` + `oauth2BearerNodes.ts` | Client Credentials / Password grant, client auth body hoặc Basic; gọi qua proxy dev-server `/api/jmeter/proxy/send-single` (không CORS). Field hỗ trợ `${VAR}` resolve từ Environment đang active; mặc định client secret = `${OAUTH_CLIENT_SECRET}`. Chèn `HTTP Header Manager` (`Authorization: Bearer ${ACCESS_TOKEN}`) + UDV ở Test Plan, hoặc header literal. |
| `src/components/common/debug/HttpAuthWizard.tsx` (+ `OAuth2AuthForm`, `AwsSigV4AuthForm`, `AuthField`, `useOAuth2Wizard`, `authWizard.css`) | Nút **Auth** trên `HttpRequestActionBar` mở panel trong HTTP Request editor (thay cho dự kiến sửa `ProtocolEditors.tsx` – không làm phình `CoreEditors.tsx`). |
| Wiring | `App.tsx` (+`'ddt'` modal, `openDdtWizard`), `MenuBar.tsx`, `Toolbar.tsx` – chỉ thêm vài dòng. |
| `tests/verify-sprint11.mjs` | 16 TC (DDT 6, SigV4 5 gồm e2e JMeter, OAuth 5 gồm e2e qua proxy thật tới token server local). `npm run test:sprint11`, đã nối vào `npm test`. |

**Giới hạn đã biết:** Nút *Send Request* (debug) không chạy JSR223 PreProcessor nên không ký SigV4 – chữ ký chỉ áp dụng khi chạy JMeter thật. Token OAuth lưu trong UDV sẽ hết hạn – cần lấy lại qua Auth wizard trước khi chạy dài.
