# Sprint 10 – Implementation Plan
## FEAT-P4: Local Lightweight Mock Server | FEAT-P5: Request History & Multi-Tab Workspace | FEAT-P3c: Chai Transpiler v2

> **Căn cứ:** `.master_process/SOFTWARE_DELIVERY_PROCESS_MASTER.md`  
> **Trạng thái:** 🔵 BACKLOG (Thực thi sau khi hoàn thành Sprint 9)  
> **Kiến trúc:** Tuân thủ Proactive File Splitting (Mỗi file ≤ 150 dòng)

---

## 1. Gate 1 – BA / PO Discovery (Phase A1)

### 1.1 In-Scope & Acceptance Criteria
- **FEAT-P4 Local Mock Server:** Server Node devServer mở route `/mock/*`. Cho phép tạo danh sách mock routes (Path, Method, Status, Response Delay ms, Payload JSON/XML) để giả lập dịch vụ 3rd-party khi load test.
- **FEAT-P5 Request History & Tabs:** Tự động lưu 50 request debug gần nhất vào IndexedDB với thời gian và kết quả; hỗ trợ mở nhiều tab HTTP Sampler đồng thời để so sánh payload.
- **FEAT-P3c Chai Transpiler v2:** Mở rộng transpiler chuyển đổi các script phức tạp sang JSR223 Groovy stubs với hướng dẫn rõ ràng.

### 1.2 User Flow
```text
[Menu Tools] -> [Local Mock Server] -> Mở Modal quản lý Mock Endpoints
  -> Bấm [+ Thêm Mock] -> Nhập Path: "/mock/sms/send", Status: 200, Delay: 150ms, Body: {"status":"sent"}
  -> Kịch bản JMeter trỏ vào: http://localhost:58936/mock/sms/send
[HTTP Editor] -> Tab "History" bên cạnh -> Click request cũ để khôi phục URL/Headers/Body
```

---

## 2. Gate 1.5 – UI/UX & Gate 2 – Validation Rules (Phase A2/A3)

- **Mock Server Modal:** Width 720px, bảng hiển thị danh sách Endpoint, Method, Delay, Switch toggle Active/Inactive.
- **History Drawer:** Thanh sidebar trượt bên phải HTTP Editor liệt kê danh sách 50 request gần nhất kèm badge trạng thái (200, 404, 500).
- **Validation:** Path mock phải bắt đầu bằng `/mock/`; Delay từ 0ms đến 10000ms. History giới hạn tối đa 50 bản ghi (FIFO).

---

## 3. Gate 3 – Dev Implementation Architecture (Phase B)

### 3.1 Danh Sách File Triển Khai
| File | Loại | Dòng | Trách Nhiệm Duy Nhất |
|:---|:---:|:---:|:---|
| `server/routes/mockServerRouter.ts` | **NEW** | ~145 | Connect middleware xử lý dynamic mock endpoints `/mock/*`. |
| `src/services/mockServerService.ts` | **NEW** | ~90 | API client CRUD danh sách mock routes trên server. |
| `src/components/common/mock/MockServerManagerModal.tsx` | **NEW** | ~140 | Modal UI cấu hình mock endpoints. |
| `src/services/historyStorageService.ts` | **NEW** | ~95 | Quản lý IndexedDB lưu trữ 50 request debug gần nhất. |
| `src/components/common/debug/RequestHistoryDrawer.tsx` | **NEW** | ~130 | Sidebar hiển thị lịch sử request và nút tái sử dụng. |
| `src/components/workspace/WorkspaceTabs.tsx` | **NEW** | ~120 | Quản lý multi-tab cho các HTTP Samplers đang mở. |

---

## 4. Gate 4 – QA Verification Checklist (Phase D)
- [ ] Gửi request vào `/mock/payment/checkout` -> Trả về JSON giả lập đúng sau đúng số ms delay cấu hình.
- [ ] History lưu đúng 50 request gần nhất, không làm lag trình duyệt.
- [ ] Mở nhiều tab sampler không bị mất dữ liệu form khi chuyển tab.
- [ ] `npm run typecheck` đạt 0 lỗi.
