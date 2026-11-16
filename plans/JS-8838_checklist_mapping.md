# JS-8838 JMX ↔ checklist JS-8838 (tab 1)

- JMX: [JS-8838_JobGoal_UserProfile_v1_1_BE_Regression.jmx](JS-8838_JobGoal_UserProfile_v1_1_BE_Regression.jmx)
- Spec BE: subtask JS-9022: `POST /api/v1/user-profile`, version 1.1 (`?version=1.1` hoặc header `X-API-VERSION: 1.1`) bỏ `required` của `job_goals.job_title`, chỉ giữ `maxlength:255`. Mặc định / 1.0 vẫn bắt buộc `job_title`.
- PRD: Confluence "Enhance Personalized page - V1.0" (page 1686831105, v5)
- Checklist: `D:\_checklist_tc_jira_N_ReleaseNote\tasks\JS-8838\checklist_JS-8838.md`, tab **1. Backend API & Data Integrity** (5 item, đánh số `BE-1` → `BE-5` theo thứ tự trong tab)

Mỗi sampler có tag `[BE-x]` ở đầu tên. Phần UI của US-1 → US-5 và tracking (tab 2–4) không nằm trong JMX.

## Chạy

Bấm Run (GUI, web UI) hoặc chạy lệnh dưới, không cần truyền token:

```bash
./apache-jmeter-5.6.3/bin/jmeter.bat -n -t plans/JS-8838_JobGoal_UserProfile_v1_1_BE_Regression.jmx -l runs/js8838/results.jtl
```

Thread group **setUp** tự tạo tài khoản mới mỗi lần chạy:

1. K00 sinh email `hadtv.nlsv.test+auto_<số>@gmail.com`, mobile `09xxxxxxxx`, password ngẫu nhiên.
2. K01 `POST /seeker/fe/register` bằng guest token, lấy token seeker và `seeker_id` trong JWT.
3. K02 `POST /seeker/fe/me/personal-data-consent/accept` (bắt buộc trước nghiệp vụ khác).
4. Token và `seeker_id` chia sẻ sang TG1 và tearDown qua property `js8838_token` / `js8838_seekerId`. Nếu chạy từ thư mục repo, tài khoản (kèm password) lưu ở `runs/accounts/<seeker_id>.json`.

**Guest token** (JWT `user=null`) cho API register không commit vào repo. K00 lấy theo thứ tự `-JguestToken` → env `QC_GUEST_TOKEN` → file `qc-guest-token.local` ở gốc repo (đã gitignore `*.local`). Máy mới: lấy `authorization` của request `/seeker/fe/register` trên web QC (DevTools) và lưu vào file đó. `scripts/create_qc_seeker.py` đọc cùng nguồn.

K01 không lấy được token thì test dừng ngay. Muốn dùng tài khoản có sẵn: thêm `-Jtoken=<JWT>`, setUp chuyển sang K10 và tự đọc `seeker_id` từ token.

Tài khoản mới chưa có hồ sơ (`GET` trả `1001`): G01 tạo hồ sơ bằng `POST ?version=1.1` chỉ có `provinces` (đúng luồng user 0 data lưu 1 câu nudge), G02 kiểm `job_title = null`.

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `apiHost` / `seekerBase` / `authBase` | `api.vl24hv2.qc.sieuviet-team.com` / `/seeker/fe/api/v1` / `/seeker/fe` | Môi trường QC |
| `token` / `seekerId` | rỗng: setUp tự tạo tài khoản | Truyền `-Jtoken` để dùng tài khoản có sẵn |
| `guestToken` | guest JWT của web QC | Dùng cho API register |
| `strictSpec` | `true` | `false`: case lệch spec chấp nhận hành vi hiện tại |
| `runIdorProbe` / `otherSeekerId` | `false` / 2000000001 | Bật D09–D10. **Chỉ dùng tài khoản test dùng 1 lần** (xem phần Lưu ý) |

**Dữ liệu:** `job_goals` được BE đồng bộ sang `title`, `slug`, `province_ids`, `min/max_expected_salary`, `salary_range` của resume. Suite tự lưu `job_goals` gốc ở G00 và restore ở Z01 (và tearDown Z91). G00 không đọc được hồ sơ thì test dừng ngay, không ghi gì. `salary_range` của resume không restore được về `null`.

## Mapping

| Item checklist | Case JMX | Không cover bằng JMX |
|---|---|---|
| **BE-1** `[API][v1.1]` lưu job_goals không có job_title qua query và header | A01–A08: `?version=1.1`, header `X-API-VERSION: 1.1`, header chữ thường, `job_title=null`, `job_goals={}`. Kiểm GET: provinces / salary / experience đúng, `job_title` không bị xoá. A09 (query 1.0 + header 1.1) là case cần xác nhận | Màn Tiêu chí tìm việc hiển thị đúng (UI) |
| **BE-2** `[API][v1.0]` không truyền version hoặc 1.0 vẫn bắt buộc job_title | B01–B05: không version, `?version=1.0`, header 1.0, `?version=` rỗng, `job_title=""` → `422` + `data.job_title`. B06 kiểm không ghi dữ liệu. B08–B09 v1.0 có job_title → lưu được. B07 (query 1.1 + header 1.0) cần xác nhận | Form hồ sơ cũ còn gọi v1.0 (UI, tab 4.3) |
| **BE-3** `[API][BVA]` job_title rỗng / 255 / 256 / khoảng trắng / tiếng Việt | C01–C12: `""` không ghi đè, `"   "` không lưu, 255 ký tự lưu đủ, 256 → `422`, 255 ký tự "ệ" lưu đủ, "Kế toán tổng hợp" đúng UTF-8. C13 job_title là số cần xác nhận | Hiển thị font trên UI |
| **BE-4** `[API][Security]` token, version lạ, IDOR | D01 không token, D02 token sai (1009), D03–D05 version 9.9 / abc / header 9.9 (1022), D06–D07 body sai kiểu → `422`, D08 kiểm không ghi. D09–D10 IDOR tắt mặc định | Token hết hạn thật (cần token cũ) |
| **BE-5** `[API][Data]` lưu từng phần không xoá field khác (Q14) | E00–E07: seed đủ rồi gửi riêng provinces / salary / `occupation_ids`, kiểm các field còn lại giữ nguyên. E08–E10 (min > max, lương âm, tỉnh không tồn tại) cần xác nhận | Payload thật FE gửi khi lưu nudge (DevTools); field lưu Ngành đang giả định là `occupation_ids` (chờ Q14) |

## Kết quả gần nhất (runs/js8838_20261116_151234_autoaccount, QC 16/11/2026 15:12)

Chạy không truyền tham số, setUp tự tạo seeker 2004490917. 65 sample: **60 pass, 5 fail** (D09–D10 IDOR tắt mặc định). Lần chạy liền trước (`..._151150_autoaccount`, seeker 2004490916) cho kết quả giống hệt. 5 case fail đều là bug BE:

| Case | Item | Thực tế | Mong đợi |
|---|---|---|---|
| B06 | BE-2 | Mặc định / `?version=1.0` / header 1.0 / `?version=` thiếu `job_title` trả `422` nhưng **vẫn lưu** `provinces`, `salary_min/max`, `experience` (kiểm lại thủ công từng request: request nào cũng ghi) | `422` và không ghi gì |
| C04 | BE-3 | v1.1 `job_title = "   "` lưu thành job_title và `title` resume | Không lưu chuỗi khoảng trắng |
| C07 | BE-3 | v1.1 `job_title` 256 ký tự → `code=22001` SQLSTATE "Data too long", lộ stack trace | `422` maxlength 255 |
| D06 | BE-4 | `job_goals = "abc"` → `code=0` "Cannot unset string offsets" + stack trace | `422` |
| D07 | BE-4 | `job_goals.provinces = "abc"` → `code=0` lỗi `implode()` + stack trace | `422` |

| Item | Gợi ý status |
|---|---|
| BE-1 | Completed sau khi kiểm UI Tiêu chí tìm việc |
| BE-2 | To Do: bug B06 |
| BE-3 | To Do: bug C04, C07 |
| BE-4 | To Do: bug D06, D07; IDOR cần kiểm riêng trên tài khoản dùng 1 lần |
| BE-5 | Completed phần API sau khi Dev chốt Q14 (field lưu Ngành) |

Lần chạy trước (`..._103114_seeker2004490861`) có C10 timeout 30 s một lần; kiểm lại 3 lần GET đều ~1 s, lưu đủ 255 ký tự "ệ".

Chiều 16/11 (14:50–15:05) QC `/register` lỗi tạm thời: lúc `404` khi gọi mail queue `2646-api…/mail/queue`, lúc `cURL error 7` khi kết nối `service-statistic`. Từ 15:10 hoạt động lại. Nếu K01 fail với các lỗi này, chờ QC ổn định rồi chạy lại. Mật khẩu ngẫu nhiên luôn có ít nhất 1 chữ số (BE yêu cầu ≥ 8 ký tự, có chữ và số).

## Kết quả gọi API thủ công trên QC (16/11/2026, trước khi viết JMX)

| Case | Kết quả | Đánh giá |
|---|---|---|
| v1.1 không job_title (query, header, header chữ thường) | 200, lưu đúng, job_title giữ nguyên | PASS |
| Mặc định / 1.0 / `?version=` rỗng thiếu job_title | 422 `data.job_title` | PASS |
| Lưu từng phần provinces / salary / occupation_ids | Field khác giữ nguyên | PASS |
| v1.1 `job_title` 256 ký tự | `code=22001` SQLSTATE "Data too long for column 'title'", lộ stack trace | **Bug**: phải là 422 maxlength (C07) |
| v1.1 `job_title="   "` | 200, lưu `"   "` làm job_title và title resume | **Bug** theo checklist (C04) |
| `job_goals="abc"` | `code=0` "Cannot unset string offsets" + stack trace | **Bug**: phải là 422 (D06) |
| `job_goals.provinces="abc"` | `code=0` lỗi `implode()` + stack trace | **Bug**: phải là 422 (D07) |
| version 9.9 / abc | `code=1022` kèm stack trace trong `error` | Đúng code; lộ stack trace (hành vi chung của BE) |
| query 1.0 + header 1.1 / query 1.1 + header 1.0 | Header được ưu tiên | Cần xác nhận |
| job_title số, lương min > max, lương âm, tỉnh 99999 | 200, lưu nguyên giá trị | Cần xác nhận |
| Body có `seeker_id` của user khác | Sau request này, `GET /user-profile` của tài khoản test trả `1001 Không tìm thấy Hồ sơ hợp lệ` | **Nghi lỗi IDOR nghiêm trọng**, cần Dev kiểm tra DB |

## Lưu ý

Sau case IDOR ngày 16/11/2026, tài khoản test 2004466193 không còn đọc được hồ sơ (`1001`). Cần Dev kiểm tra bảng `resume` (id 201337851) xem `seeker_id` có bị đổi sang 2000000001 không. Tài khoản mới cũng trả `1001` cho tới khi có hồ sơ, nên khả năng cao request IDOR đã chuyển resume sang seeker khác. Từ nay suite chạy trên tài khoản tạo mới bằng `scripts/create_qc_seeker.py`.

API không xoá được `job_title` (`null`) và list rỗng (`[]`), nên restore Z01/Z91 bỏ qua các field gốc đang rỗng.
