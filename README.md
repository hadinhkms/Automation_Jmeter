# 🚀 Apache JMeter Web UI & Automation Studio

> **Nền tảng kiểm thử hiệu năng & tự động hóa JMeter hiện đại trên nền Web (Modern Web-Based Apache JMeter Studio & Enterprise Automation Framework)**.  
> Giữ trọn vẹn trải nghiệm thân thuộc của Apache JMeter Desktop kết hợp với sức mạnh, tốc độ và tính tiện lợi của Web UI hiện đại.

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Apache JMeter](https://img.shields.io/badge/Apache%20JMeter-5.6.3-d22128.svg?logo=apache)](https://jmeter.apache.org/)

---

## 🌟 Tính Năng Nổi Bật (Key Features)

### 1. 🌲 Cây Kịch Bản Trực Quan (Interactive Test Plan Tree)
- **Chuẩn phân cấp JMeter**: Test Plan, Thread Groups, Samplers, Logic Controllers, Pre/Post Processors, Timers, Assertions, Config Elements, Listeners.
- **Kéo thả mượt mà (Drag & Drop)**: Dễ dàng sắp xếp lại thứ tự các bước hoặc di chuyển vào trong các Controller/Thread Group.
- **Thao tác nhanh**: Đổi tên tại chỗ (`F2`), Nhân bản (`Ctrl+D`), Bật/Tắt (`Toggle Enabled`), Cắt/Sao chép/Dán (`Ctrl+X / Ctrl+C / Ctrl+V`), Xóa (`Delete`).
- **Thanh tìm kiếm & lọc nhanh**: Hỗ trợ tìm kiếm component và lọc theo loại trong các kịch bản lớn.

### 2. ⚡ Thực Thi JMeter Thật & Giám Sát Real-Time (Real Execution Engine)
- **Kết nối trực tiếp Apache JMeter CLI**: Tự động phát hiện bản cài đặt JMeter nội bộ hoặc cấu hình tùy chỉnh (`jmeter -n -t ...`).
- **Phân tích dòng dữ liệu JTL thời gian thực (Live Streaming Parser)**: Hiển thị ngay lập tức các chỉ số Throughput (req/s), Latency trung bình, P90/P95/P99, Error Rate (%) và số luồng Threads hoạt động.
- **Console Log thời gian thực**: Theo dõi log hệ thống của JMeter qua SSE (Server-Sent Events) với tính năng tìm kiếm và tải log.
- **Báo cáo HTML Dashboard tự động**: Tự động sinh và mở báo cáo HTML Dashboard chính thức của Apache JMeter chỉ với 1 click.
- **Điều khiển an toàn**: Hỗ trợ Dừng êm dịu (`Stop`), Dừng tức thì (`Shutdown`) và `Force Stop & Reset` (`taskkill`) dọn dẹp tiến trình treo.

### 3. 🌐 Trình Ghi Lưu Lượng Trình Duyệt (Browser Network Recorder)
- **Bắt tự động qua DevTools Protocol**: Khởi chạy Chrome/Edge tách biệt để ghi lại toàn bộ tương tác người dùng và request mạng (XHR / Fetch / Document).
- **Hỗ trợ nạp file HAR**: Import trực tiếp file `.har` từ bất kỳ trình duyệt nào.
- **Tùy chọn lọc thông minh**: Tự động loại bỏ file tĩnh (CSS, JS, Fonts, Images), hỗ trợ cấu hình Header Manager và tự động tạo Test Plan sẵn sàng kiểm thử.

### 4. 🪄 Tự Động Bắt Biến & Tương Quan (Intelligent Auto-Correlation Engine)
- **Phát hiện động**: Quét phân tích chuỗi request/response để tìm các giá trị phiên động như Bearer Token, JWT, CSRF Token, Session ID, User ID.
- **Trích xuất tự động**: Tự động sinh `JSONExtractor` hoặc `RegexExtractor` tại sampler nguồn và thay thế các giá trị cứng trong sampler đích thành biến `${variable_name}`.

### 5. 🎯 Cổng Đánh Giá Chất Lượng SLA & Cảnh Báo (SLA Quality Gates & Webhook Alerting)
- **Ngưỡng kiểm thử hiệu năng CI/CD**: Đặt các tiêu chí chặn (Latency trung bình tối đa, P95 tối đa, Tỷ lệ lỗi tối đa, Throughput tối thiểu).
- **Tích hợp Webhook đa nền tảng**: Tự động gửi thông báo kết quả kiểm thử định dạng Rich Embed đến **Discord**, **Slack** hoặc **Microsoft Teams**.

### 6. 🏛️ Thư Viện Mẫu Doanh Nghiệp (Enterprise Template Gallery)
Cung cấp sẵn 6 blueprint kịch bản kiểm thử chuẩn công nghiệp:
- **E-Commerce End-to-End**: Hành trình người dùng đầy đủ (Catalog -> Search -> Cart -> Checkout) với biến CSV.
- **Microservices REST API Smoke & Load**: Kiểm tra tự động các API Health Checks và CRUD với script UUID Groovy.
- **OAuth2 Concurrency & Endurance Soak**: Kiểm tra độ ổn định và phát hiện rò rỉ bộ nhớ (Memory Leak) dài hạn.
- **Step-Up Concurrency Stress Test**: Tăng dần tải theo từng bậc để tìm điểm quá tải của hệ thống.
- **GraphQL API Queries & Mutations**: Kịch bản chuẩn cho GraphQL kèm biến tham số hóa.
- **WebSocket Realtime Messaging**: Kiểm thử kết nối WebSocket bền vững, gửi nhận heartbeat ping và payload frames.

### 7. 🔀 Quản Lý Phiên Bản Git & So Sánh Code (Git Version Control & Visual Diff)
- **Bố cục Master-Detail Song Song (Side-by-Side View)**: Xem danh sách file thay đổi bên trái và kiểm tra Visual Diff code bên phải cực kỳ trực quan.
- **Lọc file nhanh**: Tích hợp thanh tìm kiếm file thay đổi tức thì.
- **Thao tác Git đầy đủ**: Hỗ trợ xem thay đổi (Status), Kéo mã (`Pull`), Soạn tin nhắn và `Commit` / `Commit & Push` ngay trên Web UI.

### 8. 📊 Biểu Đồ Tải & Mô Hình Đồng Thời (Workload Curve & Concurrency Profile)
- Tự động phân tích các Thread Group trong kịch bản và vẽ biểu đồ tải tổng hợp (Composite Concurrency Curve).
- Thống kê trực quan: Concurrency tối đa (Peak VUs), Tổng thời lượng chạy, và biểu đồ chi tiết của từng Thread Group.

### 9. 🧩 Trình Quản Lý Plugin & Tài Nguyên (Plugins & Asset Manager)
- **Plugins Manager**: Tìm kiếm, tải và kích hoạt các plugin chính thức từ hệ sinh thái `jmeter-plugins.org`.
- **Asset Manager**: Quản lý tập trung các file dữ liệu CSV, script Groovy, chứng chỉ SSL và tài liệu dự án kèm tính năng tải lên / tải về / xóa.

---

## 💻 Yêu Cầu Môi Trường (Prerequisites)

- **Node.js**: Phiên bản 20.x trở lên.
- **Java**: Java JDK 8, 11, 17 hoặc 21 (để chạy Apache JMeter Engine).
- **Apache JMeter**: Phiên bản 5.4+ (dự án đã tích hợp sẵn hoặc tự động nhận diện `apache-jmeter-5.6.3`).

---

## ⚡ Khởi Chạy Nhanh (Quick Start)

### Cách 1: Khởi Chạy 1-Click (Khuyến nghị trên Windows)
Chỉ cần nháy đúp chuột vào file:
```bat
open-jmeter-web.bat
```
Script sẽ tự động cài đặt dependencies (nếu chưa có), khởi động cả Backend Service và Vite Dev Server, đồng thời tự động mở giao diện trên trình duyệt của bạn!

---

### Cách 2: Khởi Chạy Bằng Lệnh (Command Line)

1. **Cài đặt thư viện**:
   ```bash
   npm install
   ```

2. **Khởi chạy ứng dụng**:
   ```bash
   npm run dev
   ```

3. Mở trình duyệt và truy cập theo URL hiển thị trên terminal (thường là `http://localhost:5173` hoặc cổng được cấp phát tự động).

---

## 🛠️ Các Lệnh Kiểm Tra & Xây Dựng (Scripts)

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Khởi động môi trường phát triển (Vite Dev Server) |
| `npm run build` | Biên dịch dự án hoàn chỉnh ra thư mục `dist/` |
| `npm run typecheck` | Kiểm tra toàn bộ mã nguồn TypeScript với `tsc -b` |
| `npm run lint` | Chạy linter kiểm tra chuẩn mã nguồn |
| `npm test` | Chạy bộ kiểm thử tự động (Auto-correlation, CLI runner, Recorder) |

---

## 📂 Cấu Trúc Thư Mục Dự Án (Project Structure)

```
Project_Jmeter/
├── data/                       # Dữ liệu kiểm thử CSV, tham số hóa kịch bản
├── docs/                       # Tài liệu hướng dẫn sử dụng & hình ảnh minh họa
│   └── plans/                  # USER_GUIDE.md và USER_GUIDE.html
├── plans/                      # Các kịch bản kiểm thử mẫu (.jmx)
├── server/                     # Backend Runner, Proxy và API Services
│   ├── jmeterRunner.ts         # Điều khiển tiến trình Apache JMeter CLI & streaming JTL
│   ├── browserRecorder.ts      # Engine ghi lại lưu lượng mạng qua Chrome DevTools
│   ├── pluginsManager.ts       # Quản lý tải và cài đặt JMeter Plugins
│   └── webhookNotifier.ts      # Bắn cảnh báo SLA qua Discord / Slack / MS Teams
├── src/
│   ├── app/                    # App.tsx (Root Layout & State Router) và App.css
│   ├── components/             # Các component giao diện dùng chung
│   │   ├── common/             # Các Modal (Git, SLA, Workload, Recorder, Curl,...)
│   │   ├── layout/             # Thanh trạng thái StatusBar, ConsoleLogDrawer
│   │   ├── menu/               # Thanh Menu Bar chuẩn Desktop (File, Edit, Run,...)
│   │   ├── results/            # LiveMetricsDashboard, ViewResultsTree
│   │   ├── toolbar/            # Toolbar điều khiển (Play, Stop, Clear, Modals)
│   │   └── tree/               # TestPlanTree với Drag-and-Drop & Context Menu
│   ├── editors/                # Trình chỉnh sửa chi tiết cho từng component JMeter
│   ├── jmx/                    # Parser và Serializer JMX XML tương thích 100% JMeter
│   ├── models/                 # TypeScript interfaces & Data Models
│   ├── services/               # API clients giao tiếp với server backend
│   ├── store/                  # Quản lý State toàn cục bằng Zustand
│   └── utils/                  # Thuật toán Auto-Correlation, Curl Parser, SLA Evaluator
├── tests/                      # Bộ kiểm thử tích hợp (Verification Scripts)
├── open-jmeter-web.bat         # Batch script khởi động 1-click cho người dùng
└── package.json
```

---

## ⌨️ Bảng Phím Tắt Phổ Biến (Keyboard Shortcuts)

| Phím tắt | Thao tác | Mô tả |
| :--- | :--- | :--- |
| **`Ctrl + N`** | New Plan | Tạo Test Plan trống mới |
| **`Ctrl + O`** | Open JMX | Mở tệp kịch bản `.jmx` từ máy |
| **`Ctrl + S`** | Save | Lưu kịch bản kiểm thử |
| **`Ctrl + R`** | Start Run | Khởi chạy kịch bản với JMeter Engine |
| **`Ctrl + X`** | Cut | Cắt node đang chọn trên cây |
| **`Ctrl + C`** | Copy | Sao chép node đang chọn |
| **`Ctrl + V`** | Paste | Dán node vào vị trí đang chọn |
| **`Ctrl + D`** | Duplicate | Nhân bản node đang chọn |
| **`Delete`** | Remove | Xóa node đang chọn |
| **`F2`** | Rename | Đổi tên node trực tiếp trên cây |
| **`Escape`** | Close | Đóng nhanh bất kỳ hộp thoại / popup nào đang mở |

---

## 📖 Tài Liệu Hướng Dẫn Chi Tiết
Xem toàn bộ cẩm nang sử dụng chi tiết kèm ảnh chụp giao diện tại:  
👉 **[Hướng Dẫn Sử Dụng Chi Tiết (User Guide)](docs/plans/USER_GUIDE.md)** hoặc mở trực tiếp **[`docs/plans/USER_GUIDE.html`](docs/plans/USER_GUIDE.html)** trên trình duyệt.
