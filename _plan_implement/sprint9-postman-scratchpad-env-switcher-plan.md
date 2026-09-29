# Sprint 9 – Implementation Plan
## FEAT-P2: Postman 1-Click Send & Inspect | FEAT-P3: Environment Switcher & Dynamic Variables | FEAT-P3b: Chai Transpiler v1

> **Căn cứ:** `.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md`  
> **Trạng thái:** 🟢 READY FOR DEV (Gate 1 & Gate 2 Approved)  
> **Kiến trúc:** Tuân thủ Proactive File Splitting (Component/Hook/Util ≤ 150 dòng, Service ≤ 200 dòng)

---

## 1. Gate 1 – BA / PO Discovery (Phase A1)

### 1.1 In-Scope & Acceptance Criteria
- **FEAT-P2 Send & Inspect:** Nút `[Send Request]` trên HTTP Request Editor. Gửi qua proxy backend Node `/api/jmeter/proxy/send-single` để bypass CORS. Hiển thị Status code, Latency (ms), Size (bytes), Tabs: Body (format JSON highlight/collapse), Headers, Raw.
- **FEAT-P3 Environment Switcher:** Dropdown trên Toolbar chọn môi trường (Dev, QC, Staging, Prod); Import file `*.postman_environment.json`; tự động đồng bộ biến môi trường vào node `UserDefinedVariables` (UDV) trong cây JMX.
- **FEAT-P3b Dynamic Variables & Transpiler v1:** Tự ánh xạ `{{$guid}}` -> `${__UUID()}`, `{{$timestamp}}` -> `${__time()}`, `{{var}}` -> `${var}`. Dịch `pm.response.to.have.status(200)` -> `ResponseAssertion`; trích xuất `pm.environment.set(k, v)` -> `JSONPostProcessor`.

### 1.2 Out-of-Scope
- Local Mock Server (chuyển sang Sprint 10).
- Request History & Multi-tab workspace (chuyển sang Sprint 10).
- Dịch script thuật toán phức tạp sang Groovy (chỉ tạo stub comment `JSR223PostProcessor`).

### 1.3 User Flow
```text
[HTTP Request Editor] -> Nhập URL/Headers/Body -> Click [Send Request] (màu xanh indigo)
  -> Nút chuyển sang [Spinner] "Sending..." (disabled)
  -> Node Backend proxy thực thi HTTP/HTTPS request ra internet (timeout 30s)
  -> Response Drawer trượt mở bên dưới: [Status: 200 OK] | [142ms] | [1.5KB]
  -> Xem Body format JSON đẹp hoặc Headers/Raw -> Click nút [Copy Response]
[Toolbar] -> Click [Env Badge v] -> Chọn [Import .json] hoặc đổi môi trường -> Biến tự map vào kịch bản
```

---

## 2. Gate 1.5 – UI/UX Specification (Phase A2)

### 2.1 Wireframes & Vị Trí
- **Send & Inspect Drawer:** Nằm dưới HTTP Request Editor (cao 260px, có nút đóng và kéo resize).
  - Header: `[200 OK (xanh)]` | `138 ms` | `2.4 KB` | `[Copy JSON]` | `[X Đóng]`
  - Tabs: `[Body]` (JSON Tree view) | `[Headers]` (Bảng key-value) | `[Raw]`
- **Environment Switcher:** Nằm trên thanh Toolbar, bên trái cụm nút Run test.
  - Badge active: Nền `rgba(59, 130, 246, 0.15)`, chữ xanh `#93c5fd`, có dropdown menu.

### 2.2 Design Tokens
- Status 2xx: `#22c55e` | Status 4xx: `#f59e0b` | Status 5xx/Timeout: `#ef4444`.
- Panel bg: `var(--bg-secondary, #111827)` | Border: `var(--border-color, #374151)`.

---

## 3. Gate 2 – Validation Audit (Phase A3)

### 3.1 Ma Trận Mandatory vs Optional & Giới Hạn
| Trường Dữ Liệu | Bắt Buộc | Quy Tắc Kiểm Tra & Giới Hạn |
|:---|:---:|:---|
| **Request URL** | **YES** | Phải bắt đầu bằng `http://` hoặc `https://` sau khi giải mã biến. |
| **HTTP Method** | **YES** | `GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS`. |
| **Timeout Limit** | — | Hard-cap **30 giây** trên Node proxy; quá 30s trả lỗi `504 Gateway Timeout`. |
| **Response Size** | — | Giới hạn tối đa **2 MB**; vượt quá 2MB tự động truncate kèm cảnh báo. |

### 3.2 Button State Matrix (`[Send Request]`)
- **Idle (No URL):** Nút Disabled mờ.
- **Idle (Valid URL):** Nút Enabled màu xanh Indigo, hover sáng.
- **Sending:** Nút Disabled, icon Spinner quay, text "Sending...".
- **Done/Error:** Nút Enabled trở lại, Response Panel cập nhật kết quả.

### 3.3 Bất Biến Bắt Buộc: JMX Native Schema Compatibility (Không Làm Hỏng JMX)
1. **Cô Lập Trạng Thái UI (Zero JMX Pollution):**
   - Các trạng thái giao diện như Response Inspector, tab history, kết quả debug 1-click CHỈ lưu trong Zustand/client state, **TUYỆT ĐỐI KHÔNG** chèn bất kỳ thẻ XML lạ hay custom attribute nào vào cây JMX.
2. **Ánh Xạ Chuẩn Sang Apache JMeter 5.6.3 XML Elements:**
   - Environment variables -> `<Arguments guiclass="ArgumentsPanel" testclass="Arguments">` (UDV).
   - Biến dạng `{{var}}` được chuyển thành `${var}`; dynamic variables chuyển thành built-in JMeter functions: `${__UUID()}`, `${__time()}` mà JMeter CLI hiểu nguyên bản.
   - Assertions & Extractors -> `<ResponseAssertion>`, `<JSONPathAssertion>`, `<JSONPostProcessor>`.
3. **Kỷ Luật Kiểm Thử Round-Trip & JMeter CLI Execution:**
   - Mọi kịch bản sau khi áp dụng tính năng phải thỏa mãn:
     `TestPlanNode -> JmxWriter.write() -> XML string -> JmxParser.parse() -> 100% khớp schema`.
   - File `.jmx` xuất ra phải chạy thành công trực tiếp bằng lệnh:
     `apache-jmeter-5.6.3\bin\jmeter.bat -n -t <exported.jmx> -l <test.jtl>` với exit code 0.

---

## 4. Gate 3 – Dev Implementation Architecture (Phase B)

### 4.1 Danh Sách File Triển Khai (Mỗi file ≤ 150 dòng)
| File | Loại | Dòng | Trách Nhiệm Duy Nhất |
|:---|:---:|:---:|:---|
| `src/services/proxyDebugService.ts` | **NEW** | ~80 | Client fetch wrapper gọi `/api/jmeter/proxy/send-single`. |
| `src/components/common/debug/SendInspectPanel.tsx` | **NEW** | ~135 | Container hiển thị kết quả debug: status, metrics, tab router. |
| `src/components/common/debug/ResponseBodyViewer.tsx` | **NEW** | ~110 | Sub-component render body JSON highlight & collapse. |
| `src/components/common/debug/ResponseHeadersTable.tsx` | **NEW** | ~85 | Sub-component render bảng headers. |
| `src/store/environmentStore.ts` | **NEW** | ~100 | Zustand store quản lý active environment & variables persist. |
| `src/components/toolbar/EnvironmentSwitcher.tsx` | **NEW** | ~120 | Component dropdown toolbar chọn và nạp môi trường. |
| `src/utils/postman/postmanEnvironmentParser.ts` | **NEW** | ~85 | Parser đọc file `.postman_environment.json`. |
| `src/utils/postman/dynamicVariablesEngine.ts` | **NEW** | ~75 | Ánh xạ `{{$guid}}`, `{{$timestamp}}` sang JMeter native functions. |
| `src/utils/postman/postmanScriptTranspiler.ts` | **NEW** | ~130 | Dịch `pm.test` / `pm.expect` sang Assertion nodes. |
| `server/routes/debugProxyRouter.ts` | **NEW** | ~140 | Express/Connect middleware proxy HTTP request trên Node. |
| `server/jmeterPlugin.ts` | **EDIT** | +15 | Đăng ký `debugProxyRouter`. |
| `src/editors/ProtocolEditors.tsx` | **EDIT** | +30 | Nhúng nút `[Send Request]` và `SendInspectPanel`. |
| `src/components/toolbar/Toolbar.tsx` | **EDIT** | +15 | Nhúng `EnvironmentSwitcher`. |

### 4.2 API Contract (`POST /api/jmeter/proxy/send-single`)
- **Input:** `{ method: string, url: string, headers: Array<{key, value, enabled}>, body?: string, timeoutMs?: number }`
- **Output:** `{ status: number, statusText: string, latencyMs: number, sizeBytes: number, headers: Array<{key, value}>, body: string, truncated: boolean }`

---

## 5. Gate 4 – QA Verification Checklist (Phase D)

- [ ] **TC-01:** Gửi GET `https://httpbin.org/get` -> Status 200, hiển thị latency, JSON format chuẩn.
- [ ] **TC-02:** Gửi POST `https://httpbin.org/post` có body JSON -> Response echo lại đúng data.
- [ ] **TC-03:** Request chứa biến `{{baseUrl}}` -> Phân giải đúng theo environment đang chọn.
- [ ] **TC-04:** Endpoint lỗi 401/404/500 -> Hiển thị badge màu tương ứng, không làm crash app.
- [ ] **TC-05:** Request quá 30s -> Trả về lỗi timeout rõ ràng.
- [ ] **TC-06:** Import file `.postman_environment.json` -> Tự động nạp danh sách biến và cập nhật UDV.
- [ ] **TC-07:** Import script `pm.response.to.have.status(200)` -> Sinh ra `ResponseAssertion` mã 200.
- [ ] **TC-08 (JMX Compatibility):** Kịch bản có Environment + Assertions sau khi Save/Export ra file `.jmx` phải mở lại được bằng `JmxParser.parse()` không bị lỗi hoặc mất thuộc tính.
- [ ] **TC-09 (JMeter CLI Verification):** Chạy thực tế bằng `jmeter.bat -n -t [exported.jmx]` -> Apache JMeter 5.6.3 CLI load XML thành công và thực thi không có warning/error về unknown tags.
- [ ] **Regression:** `npm run typecheck` đạt 0 lỗi; tính năng Import Collection (Sprint 8) vẫn hoạt động bình thường.

---

## 6. Rollback Plan
```powershell
git checkout HEAD -- src/editors/ProtocolEditors.tsx src/components/toolbar/Toolbar.tsx server/jmeterPlugin.ts
Remove-Item -Path "src/services/proxyDebugService.ts", "src/store/environmentStore.ts", "src/components/toolbar/EnvironmentSwitcher.tsx", "server/routes/debugProxyRouter.ts" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force -Path "src/components/common/debug", "src/utils/postman/dynamicVariablesEngine.ts", "src/utils/postman/postmanScriptTranspiler.ts", "src/utils/postman/postmanEnvironmentParser.ts" -ErrorAction SilentlyContinue
npm run typecheck
```
