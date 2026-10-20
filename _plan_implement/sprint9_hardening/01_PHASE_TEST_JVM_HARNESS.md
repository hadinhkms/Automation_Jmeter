# Phase 1: Test Suite Harness, JVM Stability & Cleanup
## Khắc phục sự cố Test Runner & Crash Dump 32-bit Java

> **Trọng tâm:** P1 (Critical)  
> **Tài liệu cha:** [00_MASTER_PLAN.md](00_MASTER_PLAN.md)

---

### 1. Phân Tích Nguyên Nhân Gốc (Root Cause)
1. `tests/verify-sprint9.mjs` dùng cú pháp ESM import file `.ts` trực tiếp. Node.js mặc định không hỗ trợ TypeScript mà cần engine transpiler (`tsx`).
2. Môi trường phát triển có Java 32-bit (`Java HotSpot Client VM 1.8`). Khi lệnh `jmeter.bat` được gọi mà không có biến môi trường `HEAP`, JMeter cố gắng xin 1GB RAM từ hệ điều hành, dẫn đến lỗi DOS 1455 và ghi các file dump `hs_err_pid*.log`.

---

### 2. Kế Hoạch Chỉnh Sửa Mã Nguồn

#### 2.1 File `package.json`
Thêm script kiểm thử chuẩn vào khối `"scripts"`:
```json
"test:sprint9": "tsx tests/verify-sprint9.mjs",
"test": "npm run test:sprint9"
```

#### 2.2 File `tests/verify-sprint9.mjs`
Tại test case `TC-CLI-01`:
```javascript
const cmd = `"${jmeterBin}" -n -t "${jmxPath}" -l "${jtlPath}" -j "${logPath}"`
const env = { ...process.env, HEAP: '-Xms128m -Xmx512m' }
const output = execSync(cmd, { cwd: tempDir, encoding: 'utf-8', timeout: 35000, env })
```

#### 2.3 Cleanup Workspace
Chạy dọn dẹp các tệp tin rác:
- `Remove-Item hs_err_pid*.log, replay_pid*.log -Force`

---

### 3. Checklist Nghiệm Thu Phase 1
- [x] Chạy `npm test` thành công, exit code 0.
- [x] Không còn bất kỳ file crash log nào trong thư mục gốc.
