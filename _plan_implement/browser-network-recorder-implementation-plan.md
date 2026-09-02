# Plan Implement: Browser & Network API Recorder

## Mục Tiêu

Biến tính năng **Browser & Network API Recorder** thành một tính năng production-ready, ổn định và chuẩn xác cho JMeter Web UI.

Tính năng cho phép người dùng:

- Ghi request trực tiếp từ Chrome/Edge bằng Chrome DevTools Protocol (CDP).
- Import file HAR từ Chrome, Edge, Firefox, Postman hoặc các công cụ proxy (Fiddler, Charles).
- Lọc bớt static assets, analytics request và browser headers không cần thiết.
- Chuyển đổi request thành các JMeter Test Plan nodes đúng chuẩn cấu trúc XML của Apache JMeter.
- Bảo vệ dữ liệu nhạy cảm như token, password, cookie, authorization header thông qua masking & parameterization.
- Export `.jmx` có thể mở và chạy được 100% trong Apache JMeter GUI và CLI.

---

## Scope MVP

MVP hỗ trợ đầy đủ các thành phần sau:

- **Import HAR file** (hỗ trợ kéo thả và duyệt file).
- **Live recording qua Chrome/Edge CDP** (bắt request từ byte đầu tiên).
- **Sinh các node JMeter chuẩn**:
  - `HTTPRequest` (Method, Domain, Port, Protocol, Path, Parameters, Raw Body, Multipart, Files).
  - `HTTPHeaderManager` (Chứa headers đã làm sạch).
  - `HTTPCookieManager` (Chứa cookies đã trích xuất).
  - `HTTPRequestDefaults` (Trích xuất Primary Domain/Protocol).
  - `TransactionController` (Phân nhóm các bước thao tác).
  - `UserDefinedVariables` (Tự động sinh khi bật parameterize secrets).
- **Hỗ trợ đầy đủ các request types**:
  - GET với query parameters (tách vào bảng Parameters sạch).
  - POST/PUT/PATCH với JSON/XML/GraphQL body (`postBodyRaw = true`).
  - `application/x-www-form-urlencoded` (tách thành các cặp Arguments có `encode = true`).
  - `multipart/form-data` (tách text fields và file uploads).
- **Bộ lọc thông minh**:
  - Lọc static assets (`.js`, `.css`, `.png`, `.svg`, `.woff2`...).
  - Lọc analytics/tracking domains (`google-analytics`, `facebook`, `clarity`...).
  - Lọc bỏ browser-internal redundant headers (`sec-ch-ua`, `sec-fetch-*`, `Host`...).
- **Bảo mật**:
  - Masking giá trị nhạy cảm trên giao diện.
  - Parameterize secrets thành biến JMeter `${AUTH_TOKEN}`, `${PASSWORD}`...
- **Target Node Placement**: Import vào đúng container được chọn trong cây Test Plan.

---

## Phase 1: Sửa Nền Converter & Chuẩn Hóa Cấu Trúc JMeter

### File Chính

- `src/utils/recordedRequestConverter.ts`
- `src/jmx/writer.ts`
- `src/jmx/parser.ts`
- `src/models/recorder.ts`

### Việc Cần Làm

1. **Sửa mismatch property của `TransactionController`**:
   - Thống nhất dùng `generateParent` và `includeTimers` (theo đúng `writer.ts` dòng 331 và `parser.ts` dòng 181), thay vì `generateParentSample` / `includeDurationOfTimers`.
2. **Xử lý Query Parameters & Tránh Duplicate Params**:
   - Khi tách query string vào mảng `parameters: TableRow[]`, đảm bảo trường `path` trên sampler chỉ giữ lại pathname sạch (ví dụ: `/api/v1/users`).
   - Tránh việc `path` vừa chứa `?page=1` mà `parameters` cũng có `page=1` làm JMeter gửi duplicate query params (`/api/v1/users?page=1&page=1`).
3. **Quy tắc `postBodyRaw` phân biệt rõ giữa JSON, Form URL-Encoded và Multipart**:
   - **JSON / XML / GraphQL / PlainText**: Đặt `body: string`, `postBodyRaw: true`, `parameters: []`.
   - **`application/x-www-form-urlencoded`**: Tách các trường vào `parameters: TableRow[]` (với `encode: true`), đặt `body: ""` và `postBodyRaw: false`.
   - **`multipart/form-data`**: Đặt `multipart: true`, `browserCompatible: true`, text fields đưa vào `parameters`, file items đưa vào `files: [{ path, parameterName, mimeType }]`.
4. **Tương tác giữa `createDefaults` và Sampler Domain/Protocol**:
   - Khi bật `createDefaults`, tạo node `HTTPRequestDefaults` chứa `server: primaryDomain`, `protocol: primaryProtocol`.
   - Đối với tất cả `HTTPRequest` có cùng domain và protocol đó $\rightarrow$ để trống `server: ""` và `protocol: ""` để sampler tự động kế thừa từ Defaults.
   - Các request gọi sang third-party/domain khác $\rightarrow$ giữ nguyên `server` riêng.
5. **Implement đầy đủ tùy chọn `createCookieManager`**:
   - Trích xuất cookie từ HAR / CDP thành node `HTTPCookieManager` đính kèm sampler hoặc container.
6. **Đảm bảo thứ tự (Order Preservation)**: Giữ nguyên thứ tự request theo timestamp và index gốc khi convert.

### Acceptance Criteria

- HAR login/search/checkout sinh đúng Transaction Controller theo từng step.
- GET params xuất hiện chuẩn trong JMeter Arguments, không bị duplicate trong path.
- POST JSON có `HTTPSampler.postBodyRaw = true`.
- Form-urlencoded không bị nhét sai thành raw body mà được tách thành từng argument.
- Khi bật `createDefaults`, các sampler cùng domain để trống server và kế thừa chuẩn xác từ `HTTPRequestDefaults`.
- Export `.jmx` mở trong JMeter GUI không bị lỗi XML hoặc mất thuộc tính của Transaction Controller.

---

## Phase 2: Bảo Mật Dữ Liệu Nhạy Cảm (Redaction & Parameterization)

### File Chính

- `src/utils/harParser.ts`
- `src/utils/recordedRequestConverter.ts`
- `src/components/common/BrowserRecorderModal.tsx`
- `src/models/recorder.ts`

### Việc Cần Làm

1. **Thêm helper `redactSensitiveData`**:
   - Mask headers nhạy cảm:
     - `Authorization` (Bearer token, Basic auth)
     - `Cookie`, `Set-Cookie`
     - `X-Api-Key`, `X-CSRF-Token`, `X-Auth-Token`, `apikey`, `api-key`
   - Mask body fields & query params (hỗ trợ duyệt đệ quy trong JSON object/array):
     - `password`, `pwd`, `pass`
     - `token`, `access_token`, `refresh_token`
     - `secret`, `client_secret`
     - `apiKey`, `api_key`
     - `otp`, `pin`, `cvv`, `card_number`
2. **Thêm tùy chọn trong UI**:
   - `Mask sensitive values` (hiển thị dạng `Bearer **********` hoặc `******` trên preview).
   - `Parameterize secrets` (thay thế giá trị thật bằng biến JMeter `${AUTH_TOKEN}`, `${PASSWORD}`, `${CSRF_TOKEN}`).
3. **Tự động sinh `UserDefinedVariables` (UDVs)**:
   - Khi bật `Parameterize secrets`, converter tự động sinh kèm một node **User Defined Variables** ở đầu Test Plan chứa danh sách các biến này và giá trị mặc định để script mở ra trong JMeter chạy được ngay.
4. **Giới hạn kích thước Body**:
   - Truncate response body lớn (mặc định giới hạn <= 512KB) để tránh tràn bộ nhớ trình duyệt khi inspect.

### Acceptance Criteria

- HAR có password/token không hiển thị raw value trong UI khi bật mask.
- Generated JMeter plan không chứa token/password thật khi bật parameterize.
- Node `UserDefinedVariables` được tự động tạo với danh sách biến tương ứng.
- User có thể bật/tắt mask khi cần debug local.
- Body lớn được truncate rõ ràng, không làm UI bị giật lag.

---

## Phase 3: Làm Live CDP Recorder Ổn Định

### File Chính

- `server/browserRecorder.ts`
- `server/jmeterPlugin.ts`
- `src/services/browserRecorderService.ts`

### Việc Cần Làm

1. **Khắc phục Race Condition - Không Miss Request đầu tiên**:
   - Launch browser với URL `about:blank`.
   - Kết nối WebSocket tới Chrome DevTools Protocol.
   - Gửi lệnh `Network.enable` và `Page.enable`.
   - Sau đó mới gọi `Page.navigate({ url: targetUrl })` để bắt trọn vẹn 100% request từ byte đầu tiên của trang web.
2. **Xử lý Redirect Chain**:
   - Bắt các sự kiện redirect qua `redirectResponse` trong `Network.requestWillBeSent` để ghi nhận đầy đủ luồng chuyển hướng.
3. **SSE Stream Heartbeat / Keep-Alive**:
   - Định kỳ mỗi 15 giây gửi comment `: ping\n\n` qua SSE stream để ngăn browser/proxy tự ngắt kết nối khi ghi lâu.
4. **Xử lý Windows File Lock khi Cleanup Profile**:
   - Trên Windows, Chrome giữ lock thư mục `tempProfileDir` một lúc sau khi thoát.
   - Bọc `rmSync` trong cơ chế retry async có độ trễ 1.5s - 2s để tránh lỗi `EBUSY: resource busy or locked`.
5. **Giới hạn Memory Buffer**:
   - Giới hạn tối đa 1000 request trong memory buffer của session ghi; tự động ngắt tải response body nhị phân lớn (video, zip).

### Acceptance Criteria

- Request đầu tiên khi tải trang được capture đầy đủ.
- Dừng recording không để lại process Chrome/Edge chạy ngầm hoặc thư mục profile rác.
- SSE stream không bị mất kết nối khi người dùng thao tác ghi liên tục 10-15 phút.
- Ghi phiên dài không làm lag dev server hay đơ giao diện.

---

## Phase 4: Cải Thiện HAR Parser

### File Chính

- `src/utils/harParser.ts`
- `src/models/recorder.ts`

### Việc Cần Làm

1. **Decode Base64 an toàn cho Unicode / Tiếng Việt**:
   - Sử dụng safe base64 decoder (Node Buffer hoặc UTF-8 decodeURIComponent helper) thay vì `atob` thuần túy để tránh lỗi văng exception với ký tự tiếng Việt / Unicode.
2. **Hỗ trợ đầy đủ các chuẩn HAR từ nhiều công cụ**:
   - Chrome DevTools, Microsoft Edge, Firefox, Postman HAR export, Charles, Fiddler.
3. **Bóc tách chi tiết Payload & Parameters**:
   - Hỗ trợ `postData.params`, `queryString`, `cookies`, `mimeType`, `_resourceType`.
   - Phân loại `application/x-www-form-urlencoded` và `multipart/form-data`.
4. **Nhận diện Transaction Step thông minh**:
   - Ưu tiên lấy từ `pageref`, page title trong `log.pages`, hoặc fallback theo path/domain.
5. **Khả năng chịu lỗi (Fault Tolerance)**:
   - Không crash khi gặp HAR entry thiếu response, body rỗng hoặc cookies thiếu trường.
   - Trả thông báo lỗi thân thiện nếu file HAR không đúng định dạng JSON.

### Acceptance Criteria

- Parse thành công HAR từ Chrome, Edge, Firefox, Postman.
- Ký tự tiếng Việt trong response body hiển thị đúng, không lỗi encoding.
- HAR không hợp lệ trả về thông báo lỗi rõ ràng trên UI thay vì crash.

---

## Phase 5: Giao Diện UI Recorder Studio

### File Chính

- `src/components/common/BrowserRecorderModal.tsx`
- `src/components/toolbar/Toolbar.tsx`
- `src/components/menu/MenuBar.tsx`
- `src/app/App.tsx`

### Việc Cần Làm

1. **Bộ lọc danh mục request**:
   - Tabs/Filters: `All`, `XHR / Fetch`, `Doc`, `Static`, `Failed`.
2. **Badge & Cảnh báo Bảo mật**:
   - Hiển thị badge icon Shield/Key khi phát hiện request có chứa token hoặc password.
3. **Bộ tùy chọn Import đầy đủ**:
   - [x] Group by Transaction Controllers
   - [x] Create HTTP Header Manager
   - [x] Create HTTP Cookie Manager
   - [ ] Extract HTTP Request Defaults
   - [x] Clean Redundant Browser Headers
   - [x] Mask Sensitive Values
   - [x] Parameterize Secrets to JMeter Variables
4. **Inspector xem chi tiết**:
   - Tabs: `Headers`, `Request Body`, `Response Body`, `Query Params`.
   - Truncate rõ ràng nếu payload quá dài, kèm nút copy.
5. **Trạng thái kết nối rõ ràng**:
   - Hiển thị rõ các trạng thái: `Idle`, `Launching Browser`, `Recording`, `Stopping`, `Disconnected`, `No Browser Detected`.

### Acceptance Criteria

- Người dùng chọn lọc và import chính xác các request mong muốn vào đúng node đích.
- Giao diện mượt mà, trực quan, có preview số lượng node sẽ sinh ra.
- Thao tác chuyển đổi transaction step mượt mà và trực quan.

---

## Phase 6: Bộ Test Tự Động & Golden Snapshot Tests

### File Chính

- `tests/test-recorder.mjs`
- `tests/fixtures/sample-login-flow.har`
- `tests/fixtures/golden-test-plan.jmx`

### Việc Cần Làm

1. **Unit Tests cho Converter**:
   - GET query params $\rightarrow$ JMeter parameters table.
   - POST JSON raw body $\rightarrow$ `postBodyRaw = true`.
   - Form-urlencoded $\rightarrow$ arguments.
   - Multipart $\rightarrow$ files table.
   - Data redaction & parameterization.
   - Transaction Controller properties (`generateParent`, `includeTimers`).
2. **Unit Tests cho HAR Parser**:
   - Parse Chrome HAR, Edge HAR, Postman HAR.
   - Safe UTF-8 Base64 decode.
   - Xử lý HAR invalid / corrupted.
3. **Golden JMX Snapshot Test**:
   - Convert recorded requests mẫu $\rightarrow$ Export JMX qua `writer.ts`.
   - So sánh với cấu trúc XML snapshot mong đợi.
4. **Integration Test**:
   - Import HAR $\rightarrow$ Insert vào Test Plan tree $\rightarrow$ Export JMX $\rightarrow$ Parse lại bằng `parser.ts` và kiểm tra độ toàn vẹn.

### Acceptance Criteria

- `npm run typecheck` đạt 0 lỗi.
- `npm run build` thành công 100%.
- Tất cả unit tests và golden snapshot tests đều PASS.

---

## Phase 7: Kiểm Thử Thực Tế Với Apache JMeter CLI & GUI

### Việc Cần Làm

1. **Xuất kịch bản `.jmx` từ các phiên ghi thực tế**:
   - Ghi luồng Đăng nhập $\rightarrow$ Tìm kiếm $\rightarrow$ Lấy chi tiết.
   - Export file `.jmx`.
2. **Kiểm thử trên Apache JMeter thật**:
   - Mở file `.jmx` bằng JMeter GUI: Xác nhận không có popup cảnh báo lỗi XML hay thiếu thuộc tính.
   - Chạy kịch bản bằng JMeter CLI (`jmeter.bat -n -t test.jmx -l results.jtl -e -o report/`).
   - Kiểm tra kết quả: HTTP Samplers gửi đúng URL, đúng query params, đúng JSON body, Header Manager đính kèm đúng Authorization token.

### Acceptance Criteria

- File `.jmx` mở mượt mà trong Apache JMeter GUI 5.6.x.
- File `.jmx` chạy thành công qua JMeter CLI, báo cáo HTML Dashboard được sinh đầy đủ.
- Request thực tế gửi đi đúng chuẩn như đã thao tác trên browser.

---

## Thứ Tự Ưu Tiên Triển Khai (Priority Roadmap)

```
[Phase 1: Fix Converter & JMX Engine]
         │
         ▼
[Phase 2: Data Redaction & Parameterization + UDVs]
         │
         ▼
[Phase 3: CDP Live Recorder (No Miss + Heartbeat + Clean Profile)]
         │
         ▼
[Phase 4: HAR Parser Unicode & Multi-source support]
         │
         ▼
[Phase 6: Golden Snapshot Tests & Integration Tests]
         │
         ▼
[Phase 5: Polish UI Studio & Badges]
         │
         ▼
[Phase 7: Real Apache JMeter CLI Verification]
```

---

## Definition of Done (DoD)

Tính năng được xem là hoàn tất khi:

1. `npm run typecheck` và `npm run build` pass 100%.
2. Tất cả test cases (unit test, HAR parser, converter, golden snapshot) pass.
3. CDP Live Recorder bắt được request từ byte đầu tiên của trang web, dừng không để lại process/profile rác.
4. HAR parser phân tích mượt mà file xuất từ Chrome, Edge, Postman, không lỗi ký tự tiếng Việt.
5. Dữ liệu nhạy cảm được mask và parameterize an toàn, tự động sinh node `UserDefinedVariables`.
6. File `.jmx` sinh ra mở và chạy thành công trên Apache JMeter GUI & CLI thật.
