# Sprint 9 Hardening & Remediation Plan
## Kế Hoạch Khắc Phục Lỗ Hổng Kỹ Thuật & Quy Trình Sprint 9

> **Căn cứ:** `.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md`  
> **Mục tiêu:** Vá triệt để 6 điểm "lủng" (P1 -> P3) được phát hiện trong phiên audit Sprint 9, đảm bảo thông qua Gate 4 (Ready for Release).  
> **Kỷ luật kiến trúc:** Tuân thủ Proactive File Splitting (Component/Hook/Util ≤ 150 dòng, Service ≤ 200 dòng, Test ≤ 800 dòng).

---

## 1. Cấu Trúc Thư Mục Kế Hoạch (Folder Structure)

```text
_plan_implement/sprint9_hardening/
├── 00_MASTER_PLAN.md                      # Kế hoạch tổng thể & ma trận điều phối
├── 01_PHASE_TEST_JVM_HARNESS.md           # Phase 1: Test Runner, JVM Memory & Cleanup (P1)
├── 02_PHASE_ENV_SYNC_HEADER_SCOPING.md    # Phase 2: Auto-Sync UDV & Cascaded Headers (P2)
└── 03_PHASE_URL_TRANSPILER_UI_SPEC.md     # Phase 3: JMX URL Normalizer, Chai Transpiler & UI (P2/P3)
```

---

## 2. Ma Trận Phân Phối Giai Đoạn (Phase Breakdown Matrix)

| Phase | Trọng Tâm | Phân Loại | File Tác Động Chính | Rủi Ro & Biện Pháp Kiểm Soát |
|:---|:---|:---:|:---|:---|
| **Phase 1** | **Test Harness & JVM Stability** | **P1 (Critical)** | `tests/verify-sprint9.mjs`<br>`package.json`<br>Cleanup root logs | **Rủi ro:** 32-bit JVM tràn bộ nhớ.<br>**Kiểm soát:** Ép `HEAP: -Xms128m -Xmx512m` và bọc loader `tsx`. |
| **Phase 2** | **Env Auto-Sync & Header Scoping** | **P2 (Major)** | `src/utils/headerScoping.ts` (NEW)<br>`src/components/common/debug/useSendRequest.ts`<br>`src/components/toolbar/useEnvironmentSync.ts`<br>`src/components/toolbar/EnvironmentSwitcher.tsx` | **Rủi ro:** Vượt trần 150 dòng của `useSendRequest.ts`.<br>**Kiểm soát:** Tách riêng `headerScoping.ts`. |
| **Phase 3** | **URL Normalizer, Transpiler & UI Spec** | **P2 / P3 (Minor)** | `src/utils/postman/postmanVariableConverter.ts`<br>`src/utils/postman/postmanScriptTranspiler.ts`<br>`src/utils/postman/dynamicVariablesEngine.ts`<br>`src/components/common/debug/SendInspectPanel.tsx` | **Rủi ro:** Phá vỡ JMX schema gốc.<br>**Kiểm soát:** Kiểm thử Round-trip JmxWriter & JmxParser. |

---

## 3. Tóm Tắt Chi Tiết Từng Phase

### [Phase 1: Test Suite Harness, JVM Stability & Dọn Rác Root (P1)](01_PHASE_TEST_JVM_HARNESS.md)
- Thêm `"test:sprint9": "tsx tests/verify-sprint9.mjs"` và `"test": "npm run test:sprint9"` vào [package.json](file:///d:/_Jmeter/package.json).
- Bổ sung `HEAP: '-Xms128m -Xmx512m'` vào `execSync` trong [tests/verify-sprint9.mjs](file:///d:/_Jmeter/tests/verify-sprint9.mjs) để chặn lỗi crash DOS 1455 trên 32-bit Java 8.
- Xóa sạch các file `hs_err_pid*.log` và `replay_pid*.log` trong thư mục gốc.

### [Phase 2: Environment Auto-Sync & Cascaded Headers Scoping (P2)](02_PHASE_ENV_SYNC_HEADER_SCOPING.md)
- Tạo module mới [src/utils/headerScoping.ts](file:///d:/_Jmeter/src/utils/headerScoping.ts) (~45 dòng) để kế thừa headers từ `TestPlan` -> `ThreadGroup` -> `HTTPRequest`.
- Refactor [src/components/common/debug/useSendRequest.ts](file:///d:/_Jmeter/src/components/common/debug/useSendRequest.ts) sử dụng helper mới, giữ file dưới 120 dòng.
- Sửa [src/components/toolbar/useEnvironmentSync.ts](file:///d:/_Jmeter/src/components/toolbar/useEnvironmentSync.ts) và [EnvironmentSwitcher.tsx](file:///d:/_Jmeter/src/components/toolbar/EnvironmentSwitcher.tsx) để tự động gọi sync sang node `UserDefinedVariables` (UDV) trong JMX khi chuyển môi trường hoặc import file `.json`.

### [Phase 3: Postman URL Normalizer, Chai Transpiler & UI Alignment (P2/P3)](03_PHASE_URL_TRANSPILER_UI_SPEC.md)
- Tối ưu `normalizePostmanUrl` trong [src/utils/postman/postmanVariableConverter.ts](file:///d:/_Jmeter/src/utils/postman/postmanVariableConverter.ts) để không bị duplicate giao thức `https://https://...` khi xuất JMX chạy CLI.
- Mở rộng [src/utils/postman/dynamicVariablesEngine.ts](file:///d:/_Jmeter/src/utils/postman/dynamicVariablesEngine.ts) hỗ trợ `{{$randomUUID}}`.
- Mở rộng [src/utils/postman/postmanScriptTranspiler.ts](file:///d:/_Jmeter/src/utils/postman/postmanScriptTranspiler.ts) nhận diện `res.*`, `data.*`, `pm.response.json()`, `status("200")`.
- Thêm nút `[Copy Response]` trực tiếp trên header của [src/components/common/debug/SendInspectPanel.tsx](file:///d:/_Jmeter/src/components/common/debug/SendInspectPanel.tsx).

---

## 4. Verification & Acceptance Criteria (Phase D Checklist)

- [x] **TC-FIX-01:** `npm test` hoặc `npm run test:sprint9` thực thi thành công 100% với exit code 0.
- [x] **TC-FIX-02:** `TC-CLI-01` thực thi Apache JMeter CLI ổn định trên cả máy có 32-bit Java, không sinh file crash `hs_err_pid*.log`.
- [x] **TC-FIX-03:** Đổi môi trường trên Toolbar -> Kiểm tra cây Test Plan thấy node `UserDefinedVariables` tự cập nhật danh sách biến mới.
- [x] **TC-FIX-04:** HTTP Request nằm trong Thread Group có `HTTPHeaderManager` (Authorization: Bearer) -> Bấm `[Send Request]` proxy gửi đầy đủ Authorization header.
- [x] **TC-FIX-05:** Import Postman Request có script `res.token` hoặc `{{$randomUUID}}` -> Transpiler sinh đúng `JSONExtractor` và `${__UUID()}`.
- [ ] **TC-FIX-06:** `npm run typecheck`, `npm run build`, `python "D:/_Master_process/master.py" doctor .` đều pass 100%.
