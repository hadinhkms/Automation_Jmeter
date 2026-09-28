# Sprint 7 – Implementation Plan
## GAP-03: Git Branch Switching UI | GAP-05: gRPC Sampler | GAP-06: TCP Sampler

> **Ngày lập:** 2026-09-28
> **Version:** 1.0
> **Phạm vi:** JMeter Web Studio – `D:\_Jmeter`
> **Trạng thái:** ✅ ĐÃ TRIỂN KHAI – Chờ review & duyệt

---

## 1. Gate 1 – BA / PO Discovery (Phase A1)

### 1.1 In-Scope

| GAP | Feature | Business Value |
|:--|:---|:---|
| **GAP-03** | Git Branch Switching UI | Team quản lý kịch bản test theo branch (dev/staging/prod) |
| **GAP-05** | gRPC Sampler Editor | Test microservices gRPC – hoàn thiện đa giao thức GĐ3 |
| **GAP-06** | TCP Sampler Editor | Test raw TCP socket – quick win, đơn giản |

### 1.2 Out-of-Scope (Sprint này)

- Git merge / rebase / conflict resolution UI
- gRPC server reflection (auto-discover methods)
- TCP binary/hex mode viewer
- JMX Semantic Diff (GAP-04, để Sprint 8)

### 1.3 User Flow

**GAP-03 Git Branch:**
```
Mở GitManagerModal → Thấy badge tên branch hiện tại
→ Click "Switch Branch" → Dropdown mở → List branches
→ Click branch có sẵn → POST /api/jmeter/git/checkout
→ Badge cập nhật tên branch mới + status refresh
→ Hoặc: Nhập tên mới → Enter / Click "Create" → branch mới tạo + checkout
```

**GAP-05 gRPC Sampler:**
```
Right-click Thread Group → Add → Sampler → gRPC Sampler
→ Editor hiện ra: Server, Port, Method Name, Proto Folder
→ Nhập JSON payload → Save
→ JMX Export: <vn.zalopay.benchmark.GRPCSampler>
```

**GAP-06 TCP Sampler:**
```
Right-click Thread Group → Add → Sampler → TCP Sampler
→ Editor hiện ra: Server, Port, Timeout, Client Class, EOL
→ Nhập text payload → Save
→ JMX Export: <TCPSampler>
```

---

## 2. Gate 1.5 – UI/UX Spec (Phase A2)

### 2.1 GAP-03: Branch Switcher Dropdown

**Vị trí:** Header của `GitManagerModal`, ngay sau badge tên branch hiện tại.

```
[GitBranch icon] Git Version Control    [● main] [Switch Branch ▾]  [↻] [✕]
                                                         ↓ (khi click)
                                              ┌─────────────────────┐
                                              │ BRANCHES             │
                                              │ ● main (current)    │  ← blue highlight
                                              │   develop            │
                                              │   feature/grpc       │
                                              ├──────────────────────┤
                                              │ [new-branch-name...] [Create] │
                                              └─────────────────────┘
```

**Design tokens:**
- Dropdown background: `var(--bg-primary)` + `border: 1px solid var(--border-color)`
- Current branch: `rgba(37, 99, 235, 0.15)` bg, `#60a5fa` text, bold
- Dropdown shadow: `0 8px 24px rgba(0,0,0,0.3)`
- zIndex: `10000` (above modal overlay)

### 2.2 GAP-05: gRPC Sampler Editor

**Sections:**
1. **gRPC Server & Service Configuration** – form-grid-3: Server, Port, Deadline
2. (cont.) – form-grid-2: Full Method Name, Channel Security (TLS dropdown)
3. **Proto Definition** – Proto Root Folder, Library Folder
4. **Request Payload (JSON)** – CodeEditor height 200px, language=json
5. **Metadata Headers** – EditableTable (key/value)

**Field defaults:** port=50051, deadline=5000ms, TLS=false

### 2.3 GAP-06: TCP Sampler Editor

**Sections:**
1. **TCP Server Connection** – form-grid-3: Server, Port, Timeout + form-grid-2: Connect Timeout, Client Class
2. **Connection Options** – form-grid-3: Re-use, Close, NoDelay + form-grid-2: EOL Byte, SO_LINGER
3. **Payload** – CodeEditor height 180px, language=text

---

## 3. Gate 2 – Validation Audit (Phase A3)

### 3.1 Ma trận Mandatory vs Optional

| Field | Component | Mandatory | Validation Rule |
|:--|:--|:---:|:---|
| Server | gRPC, TCP | ✅ | Non-empty before JMX export |
| Port | gRPC, TCP | ✅ | Numeric, 1-65535 |
| Full Method Name | gRPC | ✅ | Format: `pkg.Service/Method` |
| Proto Root Folder | gRPC | ⚠️ | Optional |
| Request JSON | gRPC | ⚠️ | Optional, valid JSON preferred |
| Branch name | Git checkout | ✅ | Server-side: regex `/[^\w\-\.\/]/` reject |

### 3.2 Button State Matrix

#### Switch Branch Button
| State | Appearance | Trigger |
|:--|:--|:--|
| Idle | "Switch Branch" + GitBranch icon | — |
| Loading | "Switching..." + disabled | POST in progress |
| Success | Dropdown closes, badge updates | `res.success === true` |
| Error | Error message trên modal | `res.success === false` |

#### Create Branch Button
| State | Appearance |
|:--|:--|
| Idle (empty) | disabled |
| Idle (has input) | enabled |

---

## 4. Gate 3 – Dev Implementation (Phase B)

### 4.1 Ma Trận File Thay Đổi

| File | Loại | Dòng thêm | Ghi chú |
|:--|:--|:---:|:---|
| `src/models/jmeter.ts` | +types | +2 | `GRPCSampler`, `TCPSampler` vào union |
| `src/components/componentMeta.tsx` | +metadata | +4 | Icon Zap (gRPC), Cable (TCP) |
| `src/jmx/mappings.ts` | +mappings | +12 | JMX class ↔ type + parser |
| `src/rules/componentRules.ts` | +rules | +4 | Sampler group + samplerTypes Set |
| `src/editors/ProtocolEditors.tsx` | +editors | +195 | GRPCSamplerEditor + TCPSamplerEditor |
| `src/editors/ComponentEditorRouter.tsx` | +routing | +3 | Import + 2 case entries |
| `src/jmx/writer.ts` | +writer | +36 | JMX XML serialization cả 2 types |
| `server/jmeterPlugin.ts` | +API | +65 | GET /git/branches + POST /git/checkout |
| `src/services/gitService.ts` | +methods | +15 | getBranches() + checkout() |
| `src/components/common/GitManagerModal.tsx` | +UI | +120 | State, handlers, dropdown UI |

### 4.2 JMX Output Spec

**gRPC Sampler JMX:**
```xml
<vn.zalopay.benchmark.GRPCSampler
    guiclass="vn.zalopay.benchmark.GRPCSamplerGui"
    testclass="vn.zalopay.benchmark.GRPCSampler"
    testname="gRPC Sampler" enabled="true">
  <stringProp name="GRPCSampler.host">grpc.example.com</stringProp>
  <stringProp name="GRPCSampler.port">50051</stringProp>
  <stringProp name="GRPCSampler.fullMethod">package.Service/Method</stringProp>
  <stringProp name="GRPCSampler.requestJson">{"field1": "value1"}</stringProp>
  <stringProp name="GRPCSampler.deadline">5000</stringProp>
  <boolProp name="GRPCSampler.tls">false</boolProp>
  <stringProp name="GRPCSampler.protoFolder">/path/to/proto</stringProp>
  <stringProp name="GRPCSampler.libFolder"></stringProp>
</vn.zalopay.benchmark.GRPCSampler>
```

**TCP Sampler JMX:**
```xml
<TCPSampler guiclass="TCPSamplerGui" testclass="TCPSampler"
    testname="TCP Sampler" enabled="true">
  <stringProp name="TCPSampler.server">tcp.example.com</stringProp>
  <stringProp name="TCPSampler.port">9100</stringProp>
  <stringProp name="TCPSampler.timeout">10000</stringProp>
  <stringProp name="TCPSampler.ctimeout">5000</stringProp>
  <stringProp name="TCPSampler.request">Hello World</stringProp>
  <boolProp name="TCPSampler.reUseConnection">true</boolProp>
  <boolProp name="TCPSampler.closeConnection">false</boolProp>
  <boolProp name="TCPSampler.nodelay">false</boolProp>
  <stringProp name="TCPSampler.EolByte"></stringProp>
  <stringProp name="TCPSampler.classname">TCPClientImpl</stringProp>
</TCPSampler>
```

**Git Branch API Contract:**
```
GET  /api/jmeter/git/branches
← 200: { current: "main", branches: ["main", "develop", "feature/x"] }

POST /api/jmeter/git/checkout
→ Body: { branch: "feature/x", createNew: false }
← 200: { success: true, branch: "feature/x" }
← 400: { error: "Invalid branch name." }
← 500: { success: false, error: "..." }
```

### 4.3 Architecture Notes

- Git branch APIs dùng `execSync` (đồng bộ) – pattern nhất quán với git/status, git/commit
- Branch name sanitization: server-side regex `/[^\w\-\.\/]/` → 400 ngay
- `branchLoading` state ngăn double-click submit
- Dropdown đóng tự động sau checkout thành công
- gRPC metadata chỉ serialize khi `length > 0` (tránh empty XML)

---

## 5. Gate 4 – QA Verification (Phase D)

### 5.1 Test Matrix – GAP-03 Git Branch

| TC | Scenario | Expected |
|:--|:---|:---|
| B-01 | Click "Switch Branch" | Dropdown list branches, current highlighted |
| B-02 | Click branch tồn tại | Badge đổi, status refresh |
| B-03 | Tạo branch mới | Checkout + dropdown đóng |
| B-04 | Create với input rỗng | Button disabled |
| B-05 | Branch name có ký tự đặc biệt | Server 400, error toast |
| B-06 | Git không có sẵn | Fallback `{ current: 'main', branches: ['main'] }` |
| B-07 | Double-click | Button disabled khi loading, 1 request |

### 5.2 Test Matrix – GAP-05 gRPC Sampler

| TC | Scenario | Expected |
|:--|:---|:---|
| G-01 | Add từ context menu | Node GRPCSampler trong tree |
| G-02 | Editor render | Tất cả fields + defaults đúng |
| G-03 | JMX Export | XML có `vn.zalopay.benchmark.GRPCSampler` |
| G-04 | TLS=true | `<boolProp name="GRPCSampler.tls">true</boolProp>` |
| G-05 | Metadata rows | collectionProp xuất hiện |
| G-06 | JMX Import | Parse đúng, editor populated |
| G-07 | Empty metadata | Không có collectionProp trong JMX |

### 5.3 Test Matrix – GAP-06 TCP Sampler

| TC | Scenario | Expected |
|:--|:---|:---|
| T-01 | Add từ context menu | Node TCPSampler trong tree |
| T-02 | Editor render | Fields đúng defaults |
| T-03 | JMX Export | XML có `<TCPSampler>` đúng props |
| T-04 | Client class switch | classname prop thay đổi |
| T-05 | Uncheck Re-use | `reUseConnection` = false |
| T-06 | JMX Import | Parse đúng, editor populated |

### 5.4 Regression Checklist

- [ ] WebSocket samplers vẫn parse + write đúng
- [ ] GraphQL Sampler vẫn hoạt động
- [ ] Git commit/push/pull/diff không bị ảnh hưởng
- [x] TypeScript: `npx tsc --noEmit` → **0 errors** ✅
- [x] Vite build: `npx vite build` → **success 8.52s** ✅
- [ ] Context menu Add Sampler hiển thị gRPC + TCP entries
- [ ] UI responsive tại 390px

---

## 6. Rollback Plan

```bash
git checkout HEAD -- src/models/jmeter.ts
git checkout HEAD -- src/components/componentMeta.tsx
git checkout HEAD -- src/jmx/mappings.ts
git checkout HEAD -- src/rules/componentRules.ts
git checkout HEAD -- src/editors/ProtocolEditors.tsx
git checkout HEAD -- src/editors/ComponentEditorRouter.tsx
git checkout HEAD -- src/jmx/writer.ts
git checkout HEAD -- server/jmeterPlugin.ts
git checkout HEAD -- src/services/gitService.ts
git checkout HEAD -- src/components/common/GitManagerModal.tsx
```

---

## 7. Summary & Next Sprint

### Sprint 7 – Kết quả (93% → 96%)

| GAP | Status | GĐ tăng |
|:--|:---:|:---|
| GAP-03 Git Branch UI | ✅ | GĐ6: 75% → 90% |
| GAP-05 gRPC Sampler | ✅ | GĐ3: 90% → 95% |
| GAP-06 TCP Sampler | ✅ | GĐ3: 95% → 100% ✨ |

### Sprint 8 – Proposed Next

| Priority | GAP | Feature | Effort |
|:---:|:--|:---|:---:|
| 1️⃣ | **GAP-04** | JMX Semantic Diff | L3 (3-5d) |
| 2️⃣ | **GAP-07** | Grafana / Canvas charts | L3 (3-5d) |
