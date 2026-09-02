# Walkthrough: Tính Năng Browser & Network API Recorder

Chúng ta đã hoàn thành việc thiết kế và triển khai toàn diện tính năng **Browser & Network API Recorder** cho **JMeter Web UI**. Tính năng này cho phép bạn ghi lại các luồng thao tác trên trình duyệt hoặc nhập file HAR (HTTP Archive) để tự động sinh ra kịch bản kiểm thử Apache JMeter hoàn chỉnh.

---

## 🚀 Các Tính Năng Đã Triển Khai

### 1. Live Browser Recorder qua Chrome DevTools Protocol (CDP)
- **Tự động nhận diện trình duyệt**: Phát hiện Google Chrome hoặc Microsoft Edge đã cài đặt trên máy.
- **Tự động khởi chạy & Kết nối CDP**: Mở một phiên trình duyệt sạch (profile riêng biệt), tự động bắt các sự kiện mạng (`Network.requestWillBeSent`, `Network.responseReceived`, `Network.loadingFinished`, `Network.getResponseBody`).
- **Stream thời gian thực (SSE)**: Danh sách các API, trạng thái HTTP, thời gian phản hồi, kích thước payload và body được cập nhật trực tiếp lên giao diện người dùng.
- **Quản lý Transaction Bước (`Step / Transaction Stepper`)**: Người dùng có thể phân chia các hành động (như `01_Open_App`, `02_Login`, `03_Search_Product`, `04_Checkout`) ngay trong lúc đang thao tác trên trình duyệt để tự động đóng gói vào các **Transaction Controller** tương ứng.

### 2. Import HAR File (HTTP Archive)
- Cho phép kéo thả hoặc chọn file `.har` xuất từ **Chrome DevTools (F12 -> Network -> Export HAR)**, Firefox, Safari, Postman, Charles, hoặc Fiddler.
- Tự động bóc tách từng request, method, query parameters, multipart/JSON payload, request/response headers, response body và thời gian phản hồi.

### 3. Bộ Lọc Thông Minh (Smart Filtering)
- **Hide Static Assets**: Tự động loại bỏ các tài nguyên tĩnh (`.js`, `.css`, `.png`, `.jpg`, `.svg`, `.ico`, `.woff2`, `.map`...).
- **Hide Analytics**: Tự động lọc các domain tracking/analytics (`google-analytics.com`, `googletagmanager.com`, `clarity.ms`, `facebook.net`, `sentry.io`...).
- **Clean Redundant Headers**: Tự động làm sạch các header rác của trình duyệt (`sec-ch-ua`, `sec-fetch-dest`, `sec-fetch-mode`, `sec-fetch-site`, `Host`, `Content-Length`) và giữ lại các header nghiệp vụ quan trọng (`Authorization`, `Content-Type`, `Accept`, `X-CSRF-Token`, custom headers).

### 4. Tự Động Tạo Cấu Trúc JMeter Chuẩn
- Tạo **Transaction Controller** cho từng bước.
- Tạo **HTTP Request** sampler với đầy đủ Method, Domain, Port, Protocol, Path, URL Params, và Raw Post Body.
- Tự động gắn con **HTTP Header Manager** vào sampler.
- Tùy chọn trích xuất Domain/Base URL thành **HTTP Request Defaults**.

---

## 🛠️ Danh Sách Tệp Đã Thêm & Cập Nhật

| Thao Tác | Tệp | Mô Tả |
|---|---|---|
| **[NEW]** | [`src/models/recorder.ts`](file:///d:/Project_Jmeter/src/models/recorder.ts) | Định nghĩa TypeScript interface cho các bản ghi API, header, kết quả phân tích |
| **[NEW]** | [`server/browserRecorder.ts`](file:///d:/Project_Jmeter/server/browserRecorder.ts) | Module backend phát hiện browser, kết nối CDP WebSocket, bắt luồng mạng |
| **[NEW]** | [`src/utils/harParser.ts`](file:///d:/Project_Jmeter/src/utils/harParser.ts) | Bộ phân tích cú pháp dữ liệu HAR 1.2 sang chuẩn `RecordedRequest` |
| **[NEW]** | [`src/utils/recordedRequestConverter.ts`](file:///d:/Project_Jmeter/src/utils/recordedRequestConverter.ts) | Bộ lọc thông minh và chuyển đổi request sang cây `TestPlanNode` của JMeter |
| **[NEW]** | [`src/services/browserRecorderService.ts`](file:///d:/Project_Jmeter/src/services/browserRecorderService.ts) | Service giao tiếp REST API & SSE EventSource ở frontend |
| **[NEW]** | [`src/components/common/BrowserRecorderModal.tsx`](file:///d:/Project_Jmeter/src/components/common/BrowserRecorderModal.tsx) | Giao diện Studio ghi API với bảng danh sách, live preview, thanh bước và inspector |
| **[MODIFY]** | [`server/jmeterPlugin.ts`](file:///d:/Project_Jmeter/server/jmeterPlugin.ts) | Tích hợp các REST endpoints (`/api/jmeter/recorder/*`) và SSE stream |
| **[MODIFY]** | [`src/components/toolbar/Toolbar.tsx`](file:///d:/Project_Jmeter/src/components/toolbar/Toolbar.tsx) | Thêm nút **Browser Recorder** với icon Radio |
| **[MODIFY]** | [`src/components/menu/MenuBar.tsx`](file:///d:/Project_Jmeter/src/components/menu/MenuBar.tsx) | Thêm mục `Tools -> Browser & Network Recorder…` (Phím tắt `Ctrl+Shift+R`) |
| **[MODIFY]** | [`src/components/context-menu/ContextMenu.tsx`](file:///d:/Project_Jmeter/src/components/context-menu/ContextMenu.tsx) | Thêm tùy chọn `Browser & Network Recorder…` khi click chuột phải |
| **[MODIFY]** | [`src/app/App.tsx`](file:///d:/Project_Jmeter/src/app/App.tsx) | Xử lý state mở modal, phím tắt `Ctrl+Shift+R` và chèn nodes vào cây kịch bản |
| **[MODIFY]** | [`src/app/App.css`](file:///d:/Project_Jmeter/src/app/App.css) | Stylesheet cho Browser Recorder Studio |
| **[NEW]** | [`tests/test-recorder.mjs`](file:///d:/Project_Jmeter/tests/test-recorder.mjs) | Script tự động kiểm tra parser, bộ lọc và bộ tạo JMeter elements |

---

## 📖 Hướng Dẫn Sử Dụng

### Cách 1: Ghi Trực Tiếp Từ Trình Duyệt (Live Recording)
1. Trên giao diện JMeter Web UI, nhấp vào nút **Browser Recorder** trên Toolbar (icon sóng Radio) hoặc menu `Tools -> Browser & Network Recorder…` (hoặc bấm `Ctrl+Shift+R`).
2. Nhập URL mục tiêu (ví dụ: `https://your-app.com`).
3. Chọn trình duyệt (**Google Chrome** hoặc **Microsoft Edge**).
4. Nhấn nút **Start Recording**: Cửa sổ trình duyệt sẽ tự động mở lên.
5. Thao tác trên web: Các API XHR/Fetch/POST sẽ xuất hiện ngay lập tức trên bảng danh sách.
6. Muốn tạo nhóm bước mới (ví dụ chuyển sang tìm kiếm/đặt hàng), nhập tên bước vào ô **Next step name** rồi nhấn **Switch Step**.
7. Khi thao tác xong, nhấn **Stop Recording**.
8. Chọn các request mong muốn, chọn container đích trong Test Plan rồi nhấn **"Import X Samplers into Test Plan"**.

### Cách 2: Nhập File HAR (Offline)
1. Mở modal **Browser & Network Recorder** (`Ctrl+Shift+R`).
2. Chuyển sang tab **Import HAR File**.
3. Nhấn **Choose .HAR File...** hoặc kéo thả file `.har` vào khung.
4. Xem trước các API đã lọc, kiểm tra Request/Response Body ở khung Inspector.
5. Nhấn **"Import Samplers into Test Plan"**.

---

## ✅ Kết Quả Kiểm Tra (Verification)

1. **TypeScript Typecheck**:
   - `npm run typecheck` $\rightarrow$ **0 errors (Pass)**.
2. **Vite Production Build**:
   - `npm run build` $\rightarrow$ **Bundle successfully built (Pass)**.
3. **Logic & Parser Unit Tests**:
   - `npx tsx tests/test-recorder.mjs` $\rightarrow$ **Tất cả các bài kiểm tra đều đạt 100% (Pass)**:
     - Nhận diện đúng Google Chrome & Microsoft Edge trên máy.
     - Lọc chính xác file tĩnh (`.png`, `.js`) và domain analytics (`google-analytics`).
     - Lọc sạch các header rác của browser (`sec-fetch-*`, `sec-ch-ua`).
     - Chuyển đổi thành công cấu trúc `TransactionController` $\rightarrow$ `HTTPRequest` $\rightarrow$ `HTTPHeaderManager`.
