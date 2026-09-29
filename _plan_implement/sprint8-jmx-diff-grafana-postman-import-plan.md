# Sprint 8 – Implementation Plan
## GAP-04: JMX Semantic Diff | GAP-07: Grafana/Canvas Charts | FEAT-P1: Postman Collection Import

> **Ngày lập:** 2026-09-28
> **Last Updated:** 2026-09-29
> **Version:** 1.1
> **Phạm vi:** JMeter Web Studio – `D:\_Jmeter`
> **Trạng thái:** ✅ ĐÃ PHÊ DUYỆT (Gate 1 & Gate 2 Ready for Implementation)
> **Kiến trúc:** Tuân thủ Proactive File Splitting Protocol (toàn bộ file mới ≤ 150 dòng)

---

## 1. Gate 1 – BA / PO Discovery (Phase A1)

### 1.1 In-Scope

| GAP | Feature | Business Value |
|:--|:---|:---|
| **GAP-04** | JMX Semantic Diff (Side-by-Side Visual) | Phát hiện thay đổi kịch bản giữa commits một cách trực quan, không cần đọc raw XML |
| **GAP-07** | Grafana-style Canvas Charts cho Results | Nâng tầm báo cáo inline: Line/Area Chart cho TPS, Latency, Error Rate theo thời gian thực |
| **FEAT-P1** | Postman Collection Import (Phase 1) | Tận dụng toàn bộ kịch bản API Postman v2.1 sẵn có của team, chuyển thẳng sang JMX load test |

### 1.2 Out-of-Scope (Sprint này)

- Git merge / rebase / conflict resolution UI
- Grafana datasource kết nối ngoại tuyến (InfluxDB/Prometheus)
- Postman Environment Switcher (Sprint 9)
- Postman Pre-request / Tests script transpiler (Sprint 9)
- JMX 3-way merge (dời Sprint 10)

### 1.3 User Flow

**GAP-04 JMX Semantic Diff:**
```
GitManagerModal -> Tab "History Diff" -> Chọn 2 commit/branch
-> Server parse JMX cũ + JMX mới -> Diff engine so sánh node-by-node
-> Panel trái: Cây JMX "trước" (đỏ = removed, vàng = changed)
-> Panel phải: Cây JMX "sau" (xanh = added, vàng = changed)
-> Click node -> Hiển thị field-level diff chi tiết
```

**GAP-07 Grafana Canvas Charts:**
```
Tab "Results" dang chạy -> Toggle "Chart View"
-> Line Chart: TPS (req/s), Latency avg, Error Rate (%)
-> Area Chart: Active Threads theo thời gian
-> Hover tooltip: timestamp, giá trị chính xác
-> Toggle "Table View" quay lại bảng cũ
```

**FEAT-P1 Postman Import:**
```
Toolbar -> Import -> "Postman Collection"
-> Modal ImportPostmanModal
-> Drag & drop hoặc Browse file .json (v2.0 / v2.1)
-> Preview: Tree Folder/Request mapping -> JMeter equivalent
-> Tick chọn Folder/Request cụ thể (hoặc Select All)
-> Chọn Target: gắn vào Thread Group đang chọn
-> Click "Import" -> Nodes được thêm vào TestPlan tree
### 1.4 Acceptance Criteria (Gherkin format)

**GAP-04: JMX Semantic Diff**
- **AC-01:** Given 2 branches with JMX changes, When user selects both branches and clicks "Compare", Then visual tree displays added nodes (green), removed nodes (red), and modified nodes (amber) with field-level diffs.
- **AC-02:** Given identical branches selected, When viewing comparison form, Then "Compare" button is disabled.

**GAP-07: Grafana Canvas Charts**
- **AC-03:** Given a running or completed test with JTL samples, When user toggles "Chart View", Then pure Canvas 2D renders real-time TPS, Latency, Error Rate, and Thread curves without external dependencies.
- **AC-04:** Given real-time updates arriving, When sample buffer reaches 300 data points, Then oldest points roll over smoothly in FIFO manner without memory growth or canvas leaks.

**FEAT-P1: Postman Collection Import**
- **AC-05:** Given a valid Postman Collection JSON (v2.0 or v2.1), When user uploads the file, Then preview tree accurately displays folders and requests with checkboxes.
- **AC-06:** Given selected requests with `{{variable}}` syntax, When imported into target Thread Group, Then variables are automatically converted to `${variable}` and HTTP headers are preserved in HTTPHeaderManager.

---


## 2. Gate 1.5 – UI/UX Spec (Phase A2)

### 2.1 GAP-04: JMX Semantic Diff Panel

**Vị trí:** Tab mới `"History Diff"` trong `GitManagerModal.tsx`

```
[Tabs: Changes | History | History Diff  <- NEW]

History Diff Tab:
+----------------------------------------------------------+
| Compare: [main v]  <->  [feature/grpc v]   [Compare >]  |
+-------------------------+--------------------------------+
| BEFORE                  | AFTER                          |
| ThreadGroup "Smoke"     | ThreadGroup "Smoke"            |
|   GET /health           |   GET /health                  |
|   [RED] POST /login     |   [AMBER] POST /login (changed)|
|   [RED] GET /users      |   [GREEN] GET /users/list (add)|
|                         |   [GREEN] gRPC GetProduct (add)|
+-------------------------+--------------------------------+
| Field diff panel (click node):                           |
|  threads: 10 -> 50  |  rampUp: 30 -> 60  |  loop: -1   |
+----------------------------------------------------------+
```

**Design tokens:**
- Removed: `#ef4444` (red-500), strikethrough
- Added: `#22c55e` (green-500), italic
- Changed: `#f59e0b` (amber-500), bold

### 2.2 GAP-07: Grafana Canvas Charts

**Vị trí:** Tab Results – thêm toggle `Table / Chart` trên header toolbar

```
Results Tab:
[Running]  [Table | * Chart]  [Pause] [Export]

Chart View:
+------------------------------------------------+
|  TPS (req/s)           avg -----  p95 .....    |
| 350|         /\  /\                             |
| 250|        /  \/  \____                        |
|   0+-------------------------------> time(s)   |
+------------------------------------------------+
|  Error Rate (%)                                |
|   5|   .....                                   |
|   0+-------------------------------> time(s)   |
+------------------------------------------------+
|  Active Threads                                |
| 100|################                           |
|   0+-------------------------------> time(s)   |
+------------------------------------------------+
```

**Tech:** Pure Canvas 2D API (không thêm lib); update interval 500ms từ SSE JTL stream

### 2.3 FEAT-P1: ImportPostmanModal

**Vị trí:** Toolbar -> Import dropdown (sau "Import cURL")

```
ImportPostmanModal (width: 780px):
+--------------------------------------------+
| Import Postman Collection             [X]  |
+--------------------------------------------+
| [  Drag & drop .json file here  ]          |
|          or  [Browse File]                 |
+--------------------------------------------+
| OK Detected: Postman Collection v2.1       |
|    "My API Tests" - 3 folders, 18 requests |
+--------------------------------------------+
| PREVIEW (tick chon):                       |
| [x] Auth Flows                             |
|     [x] POST /auth/login                  |
|     [x] POST /auth/refresh                |
| [x] User CRUD                             |
|     [x] GET /users                        |
|     [x] POST /users                       |
|     [ ] DELETE /users/:id                 |
+--------------------------------------------+
| Target Thread Group: [Thread Group 1 v]   |
| [x] Auto-convert {{var}} -> ${var}         |
| [x] Generate HTTPHeaderManager            |
| [x] Convert Bearer Auth -> Auth header    |
+--------------------------------------------+
|         [Cancel]  [Import Selected (17)]  |
+--------------------------------------------+
```

---

## 3. Gate 2 – Validation Audit (Phase A3)

### 3.1 Ma trận Mandatory vs Optional

| Field | Component | Mandatory | Validation Rule |
|:--|:--|:---:|:---|
| Branch A / Branch B | JMX Diff | YES | Phải khác nhau |
| .json file upload | Postman Import | YES | JSON hợp lệ, có field `info.schema` |
| Postman schema version | Postman Import | YES | Phải là v2.0 hoặc v2.1 |
| Target Thread Group | Postman Import | YES | Non-empty; phải tồn tại trong tree |
| HTTP Method | Postman -> HTTP Request | YES | Default `GET` nếu thiếu |
| Canvas Chart update interval | Charts | Optional | 500ms default, không config |

### 3.2 Button State Matrix

#### Compare Button (GAP-04)
| State | Appearance | Trigger |
|:--|:--|:--|
| Idle (same branch) | Disabled | — |
| Idle (diff branches) | Enabled | — |
| Loading | "Comparing..." + disabled | Fetch in progress |
| Success | Diff panels rendered | 200 OK |
| Error | Error toast | API failure |

#### Import Selected Button (FEAT-P1)
| State | Appearance | Trigger |
|:--|:--|:--|
| No file loaded | Disabled | — |
| File loaded, 0 selected | Disabled | All unchecked |
| File loaded, >=1 selected | Enabled "Import Selected (N)" | — |
| Importing | "Importing..." + spinner | Processing |
| Success | Modal closes, tree updated | Done |

### 3.3 Validation Rules Postman Parser

- JSON không phải Postman schema -> Toast: "File không đúng định dạng Postman Collection v2.x"
- URL object `{ raw, host, path, query }` -> normalize thành string trước khi parse
- `{{var_name}}` -> `${var_name}` (regex global replace)
- Auth `bearer` -> Header `Authorization: Bearer ${token_var}`
- Auth `basic` -> Header `Authorization: Basic ${base64_var}`
- Body `raw` + `Content-Type: application/json` -> HTTPRequest body data
- Body `formdata` -> Parameters table (multipart=true)
- Body `urlencoded` -> Parameters table (multipart=false)

---

## 4. Gate 3 – Dev Implementation (Phase B)

### 4.1 Ma Trận File Thay Đổi (Tuân thủ Proactive File Splitting Protocol - Toàn bộ file ≤ 150 dòng)

| File | Loại | Dòng ước tính | Vai trò / Module |
|:--|:--|:---:|:---|
| `server/jmxDiffEngine.ts` | NEW | ~180 | Backend diff engine: parse JMX XML and compute node/field diffs |
| `server/jmeterPlugin.ts` | EDIT | +25 | Endpoint `GET /api/jmeter/jmx/diff` tích hợp `jmxDiffEngine` |
| `src/services/jmxDiffService.ts` | NEW | ~60 | Service client gọi diff API |
| `src/components/git/JmxDiffPanel.tsx` | NEW | ~135 | Tab History Diff chính trong GitManagerModal |
| `src/components/git/JmxDiffNodeTree.tsx` | NEW | ~110 | Component cây JMX side-by-side (added/removed/changed badges) |
| `src/components/git/JmxDiffFieldInspector.tsx` | NEW | ~85 | Panel chi tiết các thuộc tính bị thay đổi (field-level diff) |
| `src/components/common/GitManagerModal.tsx` | EDIT | +35 | Thêm sub-tab chuyển đổi giữa Working Tree và Semantic Diff |
| `src/components/results/charts/chartTypes.ts` | NEW | ~55 | Types, interfaces, default configuration cho canvas chart |
| `src/components/results/charts/chartRenderer.ts` | NEW | ~135 | Pure Canvas 2D engine: grid, smooth curves, area gradients, legends |
| `src/components/results/charts/ResultsChart.tsx` | NEW | ~125 | React Canvas component, DPR auto-scaling, hover tooltip |
| `src/components/results/LiveMetricsDashboard.tsx` | EDIT | +40 | Toggle View: KPI Cards/Table vs Grafana Canvas Charts |
| `src/utils/postman/postmanTypes.ts` | NEW | ~70 | TypeScript definitions cho Postman Collection v2.0/v2.1 |
| `src/utils/postman/postmanVariableConverter.ts` | NEW | ~55 | Helper convert `{{var}}` sang `${var}` |
| `src/utils/postman/postmanRequestConverter.ts` | NEW | ~135 | Chuyển đổi Postman Request sang `TestPlanNode` (HTTPRequest + HeaderManager) |
| `src/utils/postman/postmanParser.ts` | NEW | ~110 | Facade parse collection, extract items preview, validate schema |
| `src/components/common/postman/PostmanFileUploader.tsx` | NEW | ~105 | Dropzone drag-and-drop & file picker kèm validation badge |
| `src/components/common/postman/PostmanItemTreePreview.tsx` | NEW | ~120 | Cây preview folder/request kèm multi-select checkboxes |
| `src/components/common/postman/PostmanImportOptions.tsx` | NEW | ~90 | Panel chọn Target ThreadGroup & các tuỳ chọn convert |
| `src/components/common/postman/ImportPostmanModal.tsx` | NEW | ~130 | Modal chính điều phối flow import Postman |
| `src/components/toolbar/Toolbar.tsx` | EDIT | +12 | ToolButton "Import Postman Collection" |
| `src/components/menu/MenuBar.tsx` | EDIT | +6 | Menu item "Import Postman Collection…" |
| `src/app/App.tsx` | EDIT | +10 | Wiring modal `postman` |


### 4.2 Postman Parser Core Interface

```typescript
// src/utils/postmanParser.ts

export interface PostmanCollection {
  info: { name: string; schema: string }
  item: PostmanItem[]
  variable?: PostmanVariable[]
}

export interface PostmanItem {
  name: string
  item?: PostmanItem[]          // Folder
  request?: PostmanRequest      // Request leaf
}

// Main conversion entry point
export function convertPostmanToNodes(
  collection: PostmanCollection,
  selectedIds: Set<string>,
  targetThreadGroupId: string
): TestPlanNode[]

// Variable syntax converter
export function postmanToJMeterVar(input: string): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, '${$1}')
}
```

### 4.3 JMX Diff API Contract

```
GET /api/jmeter/jmx/diff?branchA=main&branchB=feature/grpc&file=plans/test.jmx
<- 200: {
    "added":   [{ "id": "...", "type": "GRPCSampler", "name": "gRPC Sampler", "path": "..." }],
    "removed": [{ ... }],
    "changed": [{ "id": "...", "name": "POST /login",
                  "fields": [{ "key": "threads", "before": "10", "after": "50" }] }],
    "unchanged": [{ ... }]
  }
<- 400: { "error": "Branch not found: feature/grpc" }
<- 500: { "error": "JMX parse error: ..." }
```

### 4.4 Canvas Chart Notes

```typescript
// src/components/results/ResultsChart.tsx
// - Pure Canvas 2D API: không thêm lib ngoài
// - drawLineChart(ctx, dataPoints[], color, label)
// - drawAreaChart(ctx, dataPoints[], color, label)
// - metricsHistory: Array<{ ts: number; tps: number; avgLatency: number; errorRate: number; threads: number }>
// - Max buffer: 300 data points (2.5 phut tai 500ms interval, FIFO)
// - Subscribe Zustand useRunStore -> metricsHistory[]
```

### 4.5 Architecture Notes

- `postmanParser.ts` thuần client-side: parse 100% in-browser, không gọi server
- JMX Diff API chạy server-side (cần `git show`) -> `server/jmeterPlugin.ts`
- Canvas chart subscribe vào Zustand `useRunStore` -> `metricsHistory[]`
- Import Postman tạo nodes vào Zustand `useTestPlanStore` -> trigger re-render tree

---

## 5. Gate 4 – QA Verification (Phase D)

### 5.1 Test Matrix – GAP-04 JMX Semantic Diff

| TC | Scenario | Expected |
|:--|:---|:---|
| D-01 | Chọn 2 branch giống nhau | Button disabled |
| D-02 | Diff 2 branch có thay đổi | Panel hiện đúng added/removed/changed |
| D-03 | Click node changed | Field-level diff chi tiết |
| D-04 | Branch không tồn tại | Toast "Branch not found" |
| D-05 | JMX bị corrupt trên branch | Toast "JMX parse error" |
| D-06 | Branch không có .jmx file | Message "No JMX file found" |
| D-07 | Màu sắc diff đúng spec | Red/Green/Amber theo design tokens |

### 5.2 Test Matrix – GAP-07 Grafana Canvas Charts

| TC | Scenario | Expected |
|:--|:---|:---|
| C-01 | Toggle Table -> Chart | Canvas renders, không flicker |
| C-02 | Chart khi không có data | "No data yet" placeholder |
| C-03 | Real-time update 500ms | Chart update mượt |
| C-04 | 300 data points đầy buffer | Oldest points bị drop (FIFO) |
| C-05 | Toggle Chart -> Table | Table hiện đúng |
| C-06 | Hover tooltip | Timestamp + giá trị |
| C-07 | Responsive 390px | Chart scale đúng width |

### 5.3 Test Matrix – FEAT-P1 Postman Import

| TC | Scenario | Expected |
|:--|:---|:---|
| P-01 | Upload file JSON hợp lệ v2.1 | Preview tree render đúng |
| P-02 | Upload file JSON hợp lệ v2.0 | Preview tree render đúng |
| P-03 | Upload file không phải Postman | Toast "Không đúng định dạng" |
| P-04 | Upload file không phải JSON | Toast "File không hợp lệ" |
| P-05 | Tick chọn 1 folder, import | Nodes đúng hierarchy |
| P-06 | Uncheck 1 request | Request không xuất hiện |
| P-07 | `{{baseUrl}}/users` | Chuyển thành `${baseUrl}/users` |
| P-08 | Bearer Auth header | `Authorization: Bearer ${token}` |
| P-09 | Body raw JSON | Body Data tab đúng |
| P-10 | formdata body | Parameters table, multipart=true |
| P-11 | urlencoded body | Parameters table, multipart=false |
| P-12 | Collection 100+ requests | UI không lag |
| P-13 | JMX Export sau import | XML hợp lệ, chạy được JMeter |

### 5.4 Regression Checklist

- [ ] Import cURL vẫn hoạt động bình thường
- [ ] Git commit/push/pull/status không bị ảnh hưởng
- [ ] gRPC + TCP Sampler (Sprint 7) vẫn đúng
- [ ] Results Table view hiện tại vẫn đúng khi toggle
- [ ] TypeScript: `npx tsc --noEmit` -> 0 errors
- [ ] Vite build: `npx vite build` -> success
- [ ] UI responsive tại 390px
- [ ] Dark / Light theme: Diff panel + Canvas chart đúng màu

---

## 6. Rollback Plan

```bash
git checkout HEAD -- src/utils/postmanParser.ts
git checkout HEAD -- src/components/common/ImportPostmanModal.tsx
git checkout HEAD -- src/components/toolbar/Toolbar.tsx
git checkout HEAD -- src/components/results/ResultsChart.tsx
git checkout HEAD -- src/components/results/ResultsPanel.tsx
git checkout HEAD -- server/jmeterPlugin.ts
git checkout HEAD -- src/services/gitService.ts
git checkout HEAD -- src/components/common/GitManagerModal.tsx
```

---

## 7. Summary & Next Sprint

### Sprint 8 – Muc tieu (96% -> 98%)

| GAP | Status | GD tang |
|:--|:---:|:---|
| GAP-04 JMX Semantic Diff | Planned | GD6: 70% -> 90% |
| GAP-07 Grafana Canvas Charts | Planned | GD7: 0% -> 80% |
| FEAT-P1 Postman Collection Import | Planned | FEAT: 0% -> 60% |

### Sprint 9 – Proposed Next

| Priority | Feature | Description | Effort |
|:---:|:---|:---|:---:|
| 1st | **FEAT-P2** | Postman: 1-Click Send & Inspect (Scratchpad) | L2 (2-3d) |
| 2nd | **FEAT-P3** | Postman: Environment Switcher + Script Transpiler | L3 (3-5d) |
| 3rd | **GAP-07b** | Grafana Charts: Export PNG + Zoom | L2 (2d) |
