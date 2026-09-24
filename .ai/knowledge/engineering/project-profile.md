# Project Technical Profile

> [!NOTE]
> Thông tin kỹ thuật nền tảng của dự án Apache JMeter Web UI & Automation Studio.

## 1. Công Nghệ Cốt Lõi (Tech Stack)
- **Ngôn ngữ:** TypeScript 5.6, JavaScript (Node.js ESM)
- **Frontend Framework:** React 18.3, Vite 6.4
- **Backend & Runner:** Node.js (Vite Plugin DevServer / Express / WebSocket / SSE)
- **Engine Tải:** Apache JMeter 5.6.3 CLI (`jmeter -n -t ...`)
- **State Management:** Zustand 5.0
- **Icons & Syntax Highlighting:** Lucide-React 0.468, PrismJS 1.30
- **Testing & Verification:** Custom runner & recorder tests, fixture comparisons

## 2. Lệnh Cơ Bản (Core Commands)
- **Cài đặt dependencies:** `npm install`
- **Chạy development:** `npm run dev` (Port 58936, Host 0.0.0.0)
- **Khởi động nhanh qua file batch:** `open-jmeter-web.bat`
- **Build production:** `npm run build`
- **Kiểm tra kiểu dữ liệu:** `npm run typecheck`
- **Lint code:** `npm run lint`

## 3. Cấu Trúc Thư Mục Chính (Folder Layout)
```text
D:\_Jmeter\
├── .ai/              # Knowledge Layer (Manifest, Domain, QA, Release)
├── .delivery/        # Delivery artifacts & Quality Gates
├── src/              # React Frontend (App, Components, Editors, JMX, Store)
├── server/           # Backend Engine (CDP Browser Recorder, JMeter Runner, Plugins)
├── plans/            # Lưu trữ kịch bản JMeter (*.jmx)
├── data/             # Dữ liệu kiểm thử CSV (*.csv)
├── runs/             # Kết quả thực thi JTL, logs và HTML Dashboard Reports
├── scripts/          # Các script tự động hóa chuẩn hóa đường dẫn
└── tests/            # Test fixtures và kiểm thử tích hợp
```
