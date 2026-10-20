# Phase 3: URL Normalizer, Chai Transpiler Polish & UI Spec Alignment
## Chuẩn hóa URL JMeter CLI, Mở rộng Chai Transpiler & Bổ sung Nút Copy UI

> **Trọng tâm:** P2 / P3 (Quality & Usability)  
> **Tài liệu cha:** [00_MASTER_PLAN.md](00_MASTER_PLAN.md)

---

### 1. Phân Tích Kỹ Thuật

#### 1.1 Vấn đề Xung Đột Giao Thức (JMX CLI UnknownHostException)
- Postman URL: `{{baseUrl}}/get` với `baseUrl = https://httpbin.org`.
- Khi chuyển đổi sang JMeter:
  - Nếu UDV lưu `baseUrl = https://httpbin.org` và HTTPRequest lưu `protocol = https`, `domain = ${baseUrl}` -> Apache JMeter CLI sẽ kết nối tới `https://https://httpbin.org/get` và bị lỗi.
  - Giải pháp: Trong `postmanEnvironmentParser.ts` hoặc `normalizePostmanUrl`: Nếu giá trị biến chứa tiền tố `https?://`, tách tiền tố ra hoặc điều chỉnh cấu hình Sampler cho tương thích hoàn toàn với JMeter CLI.

#### 1.2 Mở rộng Transpiler
- Bổ sung `{{$randomUUID}}` vào `dynamicVariablesEngine.ts`.
- Mở rộng regex trong `postmanScriptTranspiler.ts` để nhận diện các biến response:
  - `pm.response.json()`
  - `res.property`
  - `data.property`
  - `pm.response.to.have.status("200")` (chuỗi số).

#### 1.3 Cập nhật UI Drawer Spec
- Thêm nút `[Copy Response]` vào header của `SendInspectPanel.tsx` cạnh nút Close `[X]`.

---

### 2. Kế Hoạch Chỉnh Sửa Mã Nguồn

#### 2.1 File `src/utils/postman/dynamicVariablesEngine.ts`
- Thêm case `$randomuuid` xử lý tương tự `$guid`.

#### 2.2 File `src/utils/postman/postmanScriptTranspiler.ts`
- Tinh chỉnh regex trích xuất biến JSON và regex status code.

#### 2.3 File `src/components/common/debug/SendInspectPanel.tsx`
- Bổ sung nút Copy ở `send-inspect-actions`.

#### 2.4 Đồng bộ tài liệu Gate 4
- Tích dấu hoàn thành (`- [x]`) trong [sprint9-postman-scratchpad-env-switcher-plan.md](file:///d:/_Jmeter/_plan_implement/sprint9-postman-scratchpad-env-switcher-plan.md) khi các test case được verify thực chứng.

---

### 3. Checklist Nghiệm Thu Phase 3
- [x] Chạy test `TC-DV-01` nhận diện được cả `{{$randomUUID}}`.
- [x] Test chuyển đổi script Postman `const res = pm.response.json(); pm.environment.set("token", res.token)` tạo đúng `JSONExtractor`.
- [x] Test JMX CLI không bị lỗi duplicate `https://`.
- [x] Nút `[Copy Response]` hiển thị rõ ràng trên header của Response Drawer.
