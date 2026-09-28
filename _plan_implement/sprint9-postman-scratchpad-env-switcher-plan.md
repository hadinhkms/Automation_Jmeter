# Sprint 9 – Implementation Plan
## FEAT-P2: Postman 1-Click Send & Inspect | FEAT-P3: Environment Switcher + Script Transpiler | GAP-07b: Charts Export & Zoom

> **Ngày lập:** 2026-09-28
> **Version:** 1.0
> **Phạm vi:** JMeter Web Studio – `D:\_Jmeter`
> **Trạng thái:** 🔵 BACKLOG – Sau Sprint 8

---

## 1. Gate 1 – BA / PO Discovery (Phase A1)

### 1.1 In-Scope

| Feature | Description | Business Value |
|:--|:---|:---|
| **FEAT-P2** | Postman Scratchpad: 1-Click Send & Inspect Request | Debug endpoint trực tiếp trong Web UI không cần mở Postman / curl |
| **FEAT-P3** | Postman Environment Switcher + Basic Script Transpiler | Quản lý multi-env (Dev/QC/Staging/Prod) và tự động hóa chuyển đổi assertion Postman sang JMeter |
| **GAP-07b** | Grafana Charts: Export PNG + Zoom / Pan | Nâng cấp chart Sprint 8: download ảnh báo cáo, zoom vào khoảng thời gian cụ thể |

### 1.2 Out-of-Scope (Sprint này)

- Postman Mock Server (tạo server giả từ collection)
- Grafana datasource ngoài (InfluxDB/Prometheus)
- Chuyển đổi Pre-request script phức tạp (vòng lặp, crypto) – quá rủi ro, dời Sprint 10
- OAuth2 / AWS SigV4 Auth flow (Sprint 10)

### 1.3 User Flow

**FEAT-P2 Scratchpad "Send & Inspect":**
```
HTTP Request Editor -> Nút [Send Request] (màu xanh, góc phải trên)
-> Loading: nút spinner "Sending..."
-> Response Panel mở phía dưới editor:
   [Status 200 OK] [145ms] [1.2 KB]
   [Tabs: Body | Headers | Raw]
   Body: JSON viewer có collapse/expand
   Headers: bảng key/value
-> Lỗi: 500, timeout, DNS fail -> hiện error message
```

**FEAT-P3 Environment Switcher:**
```
Toolbar -> [Dev v] (dropdown environment badge)
-> Options: Dev | QC | Staging | Prod | + Import Env...
-> Click "Import Env..." -> FileUpload .postman_environment.json
-> Parse file -> Tên env + danh sách Key/Value
-> Chọn env -> Cập nhật UDVs trong Test Plan tương ứng
-> Badge toolbar đổi tên: [QC v]
```

**FEAT-P3 Script Transpiler:**
```
Khi import Postman Collection (sprint 8):
- pm.test("Status is 200", ...) -> ResponseAssertion (200)
- pm.expect(jsonData.token).to.be.a('string') -> ResponseAssertion (JSONPath)
- pm.environment.set("token", pm.response.json().token) -> JSONExtractor
- Còn lại -> JSR223PostProcessor stub với comment "// TODO: Manual transpile"
```

**GAP-07b Charts Export & Zoom:**
```
Chart View -> Toolbar icon [Download PNG]
-> canvas.toDataURL() -> trigger download "results-chart-{timestamp}.png"

Chart View -> Kéo chuột trên chart (drag)
-> Zoom vào khoảng thời gian được chọn
-> Nút [Reset Zoom] để quay về toàn bộ timeline
```

---

## 2. Gate 1.5 – UI/UX Spec (Phase A2)

### 2.1 FEAT-P2: Send & Inspect Panel

**Vị trí:** Bên dưới HTTP Request Editor (collapsible drawer), chiều cao 280px

```
HTTP Request Editor
[Method v] [URL field                    ] [Send Request]
+--------------------------------------------------+
| Response                           [x close]    |
+--------------------------------------------------+
| [200 OK] [143ms] [1.24 KB]                       |
|                                                  |
| [Body] [Headers] [Raw]                           |
|                                                  |
| {                                                |
|   "status": "success",                           |
|   "data": {                                      |
|     "token": "eyJhbGci..."   [Copy]              |
|   }                                              |
| }                                                |
+--------------------------------------------------+
```

**Design tokens:**
- Status 2xx: `#22c55e` (green-500)
- Status 4xx: `#f59e0b` (amber-500)
- Status 5xx / Error: `#ef4444` (red-500)
- Response panel bg: `var(--bg-secondary)`
- Border: `1px solid var(--border-color)`

### 2.2 FEAT-P3: Environment Switcher (Toolbar)

**Vị trí:** Toolbar, ngay trái nút Run, giữa File controls và Run button

```
Toolbar:
[Open] [Save] [Import v]  |  [Dev v]  |  [Run] [Stop]  |  [Git] [Settings]
                              ^^^
                          Environment
                          Dropdown Badge
```

**Dropdown:**
```
+------------------------+
| ENVIRONMENTS           |
| * Dev  (active)        |  <- blue highlight
|   QC                   |
|   Staging              |
|   Production           |
+------------------------+
| + Import Environment   |
| x Clear Environment    |
+------------------------+
```

**Design tokens:**
- Badge: `rgba(37,99,235,0.15)` bg, `#60a5fa` text, `border-radius: 6px`
- Hover item: `var(--hover-bg)`

### 2.3 Script Transpiler Decision Matrix

```
pm.test("Status is 200", () => pm.response.to.have.status(200))
 -> ResponseAssertion: TestField=RESPONSE_CODE, Pattern="200"

pm.expect(jsonData.success).to.be.true
 -> ResponseAssertion: TestField=RESPONSE_DATA, Pattern="true" (contains)

pm.environment.set("token", pm.response.json().access_token)
 -> JSONExtractor: variable="token", expression="$.access_token", matchNo=1

pm.expect(pm.response.responseTime).to.be.below(2000)
 -> ResponseAssertion: TestField=RESPONSE_TIME, NOT supported by standard JMeter
 -> JSR223Assertion stub: // TODO: verify response time < 2000ms

[Any other pm.* script]
 -> JSR223PostProcessor stub với comment block:
    /* [Postman Script – Manual Review Required]
     * Original:  <original_script>
     * TODO: Translate to Groovy/JMeter assertions
     */
```

### 2.4 GAP-07b: Charts Export & Zoom

**Export:** Icon `Download` trên chart header -> `canvas.toDataURL('image/png')` -> file download  
**Zoom:**
```
Chart hover: cursor = crosshair
Drag start: vertical highlight region
Drag end: chart re-renders to zoomed time range
[Reset Zoom] button xuất hiện -> click -> back to full timeline
```

---

## 3. Gate 2 – Validation Audit (Phase A3)

### 3.1 Ma trận Mandatory vs Optional

| Field | Component | Mandatory | Validation Rule |
|:--|:--|:---:|:---|
| URL trong HTTP Request | Send & Inspect | YES | Non-empty, phải bắt đầu http:// hoặc https:// |
| Environment name | Env file | YES | Non-empty sau parse |
| Environment variables | Env file | Optional | Có thể rỗng |
| pm.test() mapping | Transpiler | — | Always produces output (assertion hoặc stub) |
| Chart có data để export | Export PNG | YES | Nếu không có data -> Toast "Chưa có data chart" |

### 3.2 Button State Matrix

#### Send Request Button (FEAT-P2)
| State | Appearance | Trigger |
|:--|:--|:--|
| Idle (no URL) | Disabled | — |
| Idle (URL valid) | Enabled | — |
| Sending | "Sending..." + spinner + disabled | Request in flight |
| Success | "Send Request" (response panel opens) | HTTP response received |
| Error | "Send Request" (error shown in panel) | Network/timeout error |

#### Import Environment Button (FEAT-P3)
| State | Appearance | Trigger |
|:--|:--|:--|
| Idle | "Import Env..." menu item | — |
| File selected, valid | Badge updates to env name | Parse success |
| File invalid | Toast "Không đúng định dạng Postman Environment" | Parse fail |

### 3.3 Send & Inspect Security Notes

- Proxy endpoint: `POST /api/jmeter/proxy/send-single`
- Server nhận `{ method, url, headers, body }` từ client
- Server thực hiện request thay client (để tránh CORS issue)
- **Giới hạn:** Chỉ hỗ trợ HTTP/HTTPS; không hỗ trợ mutual TLS, Kerberos
- **Timeout:** Hard-limit 30 giây, trả `{ error: "Request timeout" }` nếu quá
- **Body size limit:** Response body cap 2MB (tránh OOM trên server Node)
- Không log URL/body vào server log nếu chứa thông tin nhạy cảm (header `Authorization` bị mask)

---

## 4. Gate 3 – Dev Implementation (Phase B)

### 4.1 Ma Trận File Thay Đổi

| File | Loại | Dòng thêm | Ghi chú |
|:--|:--|:---:|:---|
| `src/components/common/SendInspectPanel.tsx` | NEW | ~280 | Response panel: status badge, tabs, JSON viewer |
| `src/editors/CoreEditors.tsx` | EDIT | +30 | Tích hợp SendInspectPanel vào HTTPRequestEditor |
| `server/jmeterPlugin.ts` | EDIT | +60 | `POST /api/jmeter/proxy/send-single` |
| `src/services/proxyService.ts` | NEW | ~80 | `sendSingleRequest(req)` - client-side fetch wrapper |
| `src/components/toolbar/Toolbar.tsx` | EDIT | +40 | EnvironmentSwitcher dropdown component |
| `src/store/environmentStore.ts` | NEW | ~80 | Zustand store: envName, variables, activeEnvId |
| `src/utils/postmanParser.ts` | EDIT | +80 | `parsePostmanEnvironment()` + Script Transpiler logic |
| `src/components/results/ResultsChart.tsx` | EDIT | +60 | Export PNG + Zoom/Pan via canvas mouse events |

### 4.2 Send Single Request API Contract

```
POST /api/jmeter/proxy/send-single
-> Body: {
     method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
     url: "https://...",
     headers: [{ key: string; value: string }],
     body?: string
   }
<- 200: {
     status: 200,
     statusText: "OK",
     latencyMs: 143,
     sizeBytes: 1268,
     headers: [{ key: string; value: string }],
     body: string  // max 2MB, text/JSON
   }
<- 200: { error: "Request timeout after 30s" }
<- 400: { error: "Invalid URL" }
<- 500: { error: "Proxy error: ..." }
```

### 4.3 Environment Store (Zustand)

```typescript
// src/store/environmentStore.ts
interface EnvironmentState {
  environments: PostmanEnvironment[]         // danh sách env đã import
  activeEnvId: string | null                 // env đang active
  activeVariables: Record<string, string>    // { key: value } flattened
  importEnvironment: (env: PostmanEnvironment) => void
  switchEnvironment: (id: string) => void
  clearEnvironment: () => void
}
```

**Tích hợp với TestPlan:** Khi `switchEnvironment()`, tự động cập nhật `UserDefinedVariables` node trong TestPlan tree (nếu tồn tại) để đồng bộ biến vào JMX export.

### 4.4 Script Transpiler Core Logic

```typescript
// src/utils/postmanParser.ts (thêm vào)
export function transpilePostmanScript(
  script: string,
  mode: 'pre-request' | 'tests'
): TestPlanNode[] {
  const nodes: TestPlanNode[] = []
  const lines = script.split('\n')

  for (const line of lines) {
    // Pattern: pm.test("...", () => pm.response.to.have.status(N))
    const statusMatch = line.match(/pm\.response\.to\.have\.status\((\d+)\)/)
    if (statusMatch) {
      nodes.push(createResponseAssertion('RESPONSE_CODE', statusMatch[1]))
      continue
    }

    // Pattern: pm.environment.set("key", pm.response.json().path)
    const envSetMatch = line.match(/pm\.environment\.set\(["'](\w+)["'],\s*pm\.response\.json\(\)(\.[\w.]+)\)/)
    if (envSetMatch) {
      nodes.push(createJSONExtractor(envSetMatch[1], '$' + envSetMatch[2]))
      continue
    }

    // Fallback: wrap in JSR223PostProcessor stub
    nodes.push(createJSR223Stub(line))
  }

  return nodes
}
```

### 4.5 Architecture Notes

- `send-single` proxy chạy Node.js `fetch` (Node 18+ built-in) -> không cần axios thêm
- Response body lớn hơn 2MB: trả `{ truncated: true, body: "...[truncated]..." }`
- EnvironmentStore persist vào `localStorage` (key: `jmeter-studio-environments`)
- Transpiler chạy client-side, không gọi server
- Zoom chart dùng `startIdx` / `endIdx` state; không cần re-fetch data

---

## 5. Gate 4 – QA Verification (Phase D)

### 5.1 Test Matrix – FEAT-P2 Send & Inspect

| TC | Scenario | Expected |
|:--|:---|:---|
| S-01 | GET request thành công | Status 200, body JSON, latency hiện |
| S-02 | POST request có JSON body | Response hiện đúng |
| S-03 | URL không hợp lệ (không có http://) | Button disabled |
| S-04 | URL không resolve (DNS fail) | Panel hiện "Network Error" |
| S-05 | Server timeout > 30s | Panel hiện "Request timeout" |
| S-06 | Response > 2MB | Body truncated, cảnh báo |
| S-07 | Response 401/403 | Status đỏ, body hiện |
| S-08 | Có headers Authorization | Header được gửi, không log |
| S-09 | Double click "Send" | Chỉ 1 request gửi, button disabled |
| S-10 | Toggle tabs Body/Headers/Raw | Content đúng từng tab |
| S-11 | JSON response | JSON viewer collapse/expand |
| S-12 | Non-JSON response (HTML/text) | Hiện raw text, không crash |

### 5.2 Test Matrix – FEAT-P3 Environment Switcher

| TC | Scenario | Expected |
|:--|:---|:---|
| E-01 | Import file .postman_environment.json | Env xuất hiện trong dropdown, badge đổi |
| E-02 | Import file không phải Postman Env | Toast "Không đúng định dạng" |
| E-03 | Switch env | UDVs trong TestPlan cập nhật đúng |
| E-04 | ${baseUrl} trong request sau switch | Giá trị env mới được áp dụng |
| E-05 | Clear Environment | Badge về "(No Env)", UDVs giữ nguyên |
| E-06 | Reload trang | Env persist từ localStorage |

### 5.3 Test Matrix – FEAT-P3 Script Transpiler

| TC | Scenario | Expected |
|:--|:---|:---|
| T-01 | `pm.response.to.have.status(200)` | ResponseAssertion status=200 |
| T-02 | `pm.environment.set("tok", pm.response.json().token)` | JSONExtractor variable=tok, $.token |
| T-03 | Script phức tạp không nhận dạng được | JSR223PostProcessor stub + comment |
| T-04 | Script rỗng | Không tạo node nào |
| T-05 | Pre-request `pm.environment.set(k,v)` | JSR223PreProcessor stub |

### 5.4 Test Matrix – GAP-07b Charts Export & Zoom

| TC | Scenario | Expected |
|:--|:---|:---|
| Z-01 | Click Download PNG | File PNG download, tên có timestamp |
| Z-02 | Download khi không có data | Toast "Chưa có data chart" |
| Z-03 | Drag zoom trên chart | Chart re-render khoảng thời gian chọn |
| Z-04 | Click Reset Zoom | Chart về full timeline |
| Z-05 | Zoom + Download PNG | PNG capture đúng vùng zoom |

### 5.5 Regression Checklist

- [ ] Sprint 8: Postman Import vẫn hoạt động đúng
- [ ] Sprint 8: JMX Semantic Diff vẫn đúng
- [ ] Sprint 8: Canvas Charts cơ bản vẫn update 500ms
- [ ] Sprint 7: gRPC + TCP Sampler không bị ảnh hưởng
- [ ] Git operations (commit/push/pull/branch) không bị ảnh hưởng
- [ ] TypeScript: `npx tsc --noEmit` -> 0 errors
- [ ] Vite build: `npx vite build` -> success
- [ ] UI responsive tại 390px
- [ ] Dark / Light theme: SendInspectPanel + EnvSwitcher đúng màu

---

## 6. Rollback Plan

```bash
git checkout HEAD -- src/components/common/SendInspectPanel.tsx
git checkout HEAD -- src/editors/CoreEditors.tsx
git checkout HEAD -- server/jmeterPlugin.ts
git checkout HEAD -- src/services/proxyService.ts
git checkout HEAD -- src/components/toolbar/Toolbar.tsx
git checkout HEAD -- src/store/environmentStore.ts
git checkout HEAD -- src/utils/postmanParser.ts
git checkout HEAD -- src/components/results/ResultsChart.tsx
```

---

## 7. Summary & Next Sprint

### Sprint 9 – Muc tieu (98% -> 99.5%)

| Feature | Status | GD tang |
|:--|:---:|:---|
| FEAT-P2 Send & Inspect (Scratchpad) | Planned | FEAT: 60% -> 85% |
| FEAT-P3 Env Switcher + Transpiler | Planned | FEAT: 85% -> 100% |
| GAP-07b Charts Export + Zoom | Planned | GD7: 80% -> 100% |

### Sprint 10 – Proposed Next

| Priority | Feature | Description | Effort |
|:---:|:---|:---|:---:|
| 1st | **GAP-08** | JMX 3-Way Merge UI | L4 (5-8d) |
| 2nd | **FEAT-P4** | OAuth2 / AWS SigV4 Auth import | L3 (3-5d) |
| 3rd | **GAP-09** | Distributed JMeter (Remote Engine) | L4 (5-8d) |
