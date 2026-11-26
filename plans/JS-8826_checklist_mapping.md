# JS-8826 JMX ↔ checklist JS-8826 (tab 3)

- JMX: [JS-8826_Backend_JobAlert_Regression.jmx](JS-8826_Backend_JobAlert_Regression.jmx) (viết lại 26/11/2026, thay bản 23/10 trỏ MR `mr-3387`)
- API: `{{apiHost}}/seeker/fe/api/v1/seeker-job-alert` — `POST /save` (JS-8794), `GET ?page&per_page` (JS-8795), `PUT /{id}/update` (JS-8831), `DELETE /{id}` (JS-8796). Header `Authorization: Bearer <seeker>`, `x-branch: vl24h.north`.
- Checklist: `D:\_checklist_tc_jira_N_ReleaseNote\tasks\JS-8826\checklist_JS-8826.md`, tab **3. API Job Alert (BE) - JS-8864** (28 item, đánh số `API-01` → `API-28` theo thứ tự trong tab)
- Câu hỏi Pending: `tasks/JS-8864/questions_JS-8864.md` (API-Q1 … Q17)

Mỗi sampler có tag `[API-xx]` ở đầu tên. Case gắn `(Pending Qn)` chỉ fail khi `strictSpec=true` (mặc định); `-JstrictSpec=false` chấp nhận hành vi hiện tại.

## Chạy

```bash
./apache-jmeter-5.6.3/bin/jmeter.bat -n -t plans/JS-8826_Backend_JobAlert_Regression.jmx -l runs/js8826/results.jtl -j runs/js8826/jmeter.log
```

- **setUp** tự đăng ký 2 seeker mới (user A làm chính, user B cho IDOR / mass assignment), accept consent, sinh mã `run` gắn vào mọi keyword. Guest token: `-JguestToken` → env `QC_GUEST_TOKEN` → file `qc-guest-token.local` (giống JS-8838). Tài khoản lưu ở `runs/accounts/<id>.json`.
- Mỗi nhóm case bắt đầu bằng `[Helper] Rx` **xoá toàn bộ alert của user A** để trạng thái xác định (limit 10, FIFO). tearDown xoá alert của A và B. Truyền `-Jtoken` / `-JtokenB` thì alert của tài khoản đó **bị xoá hết**.
- Mọi assertion đánh giá theo `code` trong JSON (BE trả HTTP 200), đồng thời fail nếu HTTP 5xx hoặc response lộ stack trace / SQL / đường dẫn file.

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `apiHost` / `seekerBase` / `authBase` | `api.vl24hv2.qc.sieuviet-team.com` / `/seeker/fe/api/v1` / `/seeker/fe` | QC main |
| `freq2d` / `freqWeekly` | `2` / `7` | Mã tần suất "2 ngày/lần" / "Hằng tuần" (chờ API-Q1; tracking ghi 1/4) |
| `strictSpec` | `true` | `false`: chấp nhận hành vi hiện tại ở case Pending |
| `runSpam` | `true` | `false`: bỏ 50 request spam (API-12) |
| `expiredToken` / `employerToken` | rỗng | Bật thêm case auth token hết hạn / token employer |
| `perAll` | `50` | `per_page` dùng để đọc toàn bộ danh sách |

## Mapping

| Item | Checklist | Case JMX | Không cover bằng JMX |
|---|---|---|---|
| API-01 | Tạo alert mới, mặc định ON/2 ngày, đầu danh sách | C01–C10 (đủ field, chỉ q, chỉ filter, tiếng Việt, không gửi cờ) | — |
| API-02 | Exact duplicate, bật lại kênh OFF | D01–D10 (trùng, trùng khi OFF → ON, khác tần suất/cờ vẫn trùng; `created_at` giữ nguyên = Q12) | Copy toast (FE) |
| API-03 | Đủ 12 tiêu chí, phường/xã | C01–C02 (9 tiêu chí theo cURL dev), C11–C12 (bỏ `level` → alert khác) | Việc gấp, Không cần CV, phường/xã: chưa có tên field (Q14) |
| API-04 | search_context rỗng, khoảng trắng, "Tất cả" | E01–E04 (`""` thay cho "Tất cả", chờ Q15) | — |
| API-05 | Normalize trước khi so trùng | N01 thứ tự mảng, N02 URL-encode, N03 HOA (Q3), N04 khoảng trắng (Q3), N05–N07 `[]`/bỏ key/`null`, N08–N09 khác dấu | — |
| API-06 | Overlapping vẫn tạo | O00–O04 | — |
| API-07 | Limit 10, FIFO, BVA 9/10/11 | L00–L07 (alert cũ nhất OFF vẫn bị xoá, trùng khi đủ 10, PUT/DELETE id đã tự xoá, xoá 1 rồi tạo) | Không còn gửi email/push cho alert bị xoá (queue) |
| API-08 | created_at giờ VN, thứ tự, FIFO cùng thời điểm | C02 (`created_at` lệch ≤ 10 phút giờ VN), C13 sắp giảm dần, L08 thứ tự ổn định | Tạo lúc 23:59→00:00; 2 alert trùng giây khi FIFO (Q16) |
| API-09 | Validation payload | V01–V22 | — |
| API-10 | BVA keyword, ký tự đặc biệt, mảng lớn | B01–B08 (1/255/256/5000 ký tự, `' & % / \ "`, emoji + zero-width, toàn bộ tỉnh trong `data/provinces.csv`, 300 ngành) | — |
| API-11 | XSS, SQLi, mass assignment | S01–S04c (Q4) | Email Job Alert có thực thi script không |
| API-12 | Đồng thời | TG2–TG3 (3 POST song song khi đủ 10), TG4–TG5 (5 POST cùng payload, 50 POST spam) | Bản ghi mồ côi trong DB |
| API-13 | GET list đủ field, mới nhất trước | C13 | Alert tạo từ App trong cùng danh sách (Q5) |
| API-14 | Phân trang & tham số biên | P01 (0 alert), DL03–DL04, PG01–PG11 (6 alert), L01c (10 alert) | Giới hạn `per_page` (Q8): chỉ kiểm không 500 |
| API-15 | Bật/tắt từng kênh | U01–U04 | — |
| API-16 | Đổi tần suất, giá trị cũ bị từ chối | F01–F03 (Q1) | Lịch gửi theo tần suất mới (queue) |
| API-17 | PUT thiếu field, cờ sai, id sai, sai method | UN01–UN12 (Q7) | — |
| API-18 | DELETE, xoá lặp, tạo lại | DL01–DL08 | Dừng gửi email/push (queue) |
| API-19 | Không token / token rỗng / JWT bị sửa / employer | A00–A12 cho cả 4 API, A99 kiểm không side effect; A13+ khi truyền `-JexpiredToken` / `-JemployerToken` | Token sau logout / đổi mật khẩu |
| API-20 | IDOR | I01–I06b | — |
| API-21 | X-BRANCH | BR01–BR04 (chỉ kiểm không 500, chờ Q9) | Rule tách dữ liệu/limit theo branch |
| API-22 | Cross-platform App/Web | — | Chờ Q5 (cách giả lập ngữ cảnh App) |
| API-23 → API-26 | Email queue, unsubscribe, push, retry | — | Cần trigger job / log queue (Q10, Q17) |
| API-27 | Apply kèm tạo alert | — | Luồng Apply pop-up (UI/DevTools) |
| API-28 | Saved Search cũ & dữ liệu migrate | — | Cần tài khoản đã migrate (JS-8780), Q11 |

## Kết quả gần nhất (QC 26/11/2026, 3 lần chạy)

- `runs/js8826_20261126_020232`: 416 sample, 24 fail. `runs/js8826_20261126_020511`: 417 sample, 22 fail. Cùng tập fail, trừ case race RD-V và 2 lần `Connection reset` do mạng (B02 / PG06 / tearDown, chạy lại pass).
- Lần đầu `..._015653` là bản script cũ (check lộ stack trace chặn mọi case, sai `total_items`, sai quote `${q255}`) — không dùng làm kết quả.
- Mã tần suất: `2` = 2 ngày/lần, `7` = Hằng tuần được chấp nhận; `0, 1, 3, 99, -1, null, "abc"` bị `422` (API-16 pass) → đề xuất trả lời API-Q1 theo kết quả này.
- Response: `{"code","msg","data"}` luôn HTTP 200; list `data.items` + `total_items`, `total_pages`; `created_at` là epoch giây. Trùng: `code 1003` "Thông tin tìm kiếm đã được lưu trước đó." (không trả id). Không tìm thấy / IDOR: `1001`. Không token: `0`, token rỗng/sửa payload: `1009`. Validation: `422`.

### Bug BE

| # | Item | Thực tế | Mong đợi |
|---|---|---|---|
| 1 | API-02 (D08) | POST trùng alert đang OFF cả 2 kênh → `1003`, alert vẫn Email=0, Push=0 | Bật lại Email & Push (US2 AC2) |
| 2 | API-05 (N02) | `q` URL-encode (`chuyenvien%20R…`) và không encode → tạo 2 alert; BE lưu nguyên `%20` | Coi là trùng (cURL dev gửi q dạng encode) |
| 3 | API-05 (N06, N07) | `occupation_ids: []`, bỏ key, `null` → tạo 3 alert khác nhau | Coi là trùng |
| 4 | API-12 (RL-V) | 3 POST đồng thời khi đang đủ 10 → còn 11 / 12 alert (2 lần chạy) | Tổng vẫn 10, xoá đúng alert cũ nhất |
| 5 | API-12 (RD) | 5 POST đồng thời cùng tiêu chí → 1 lần chạy tạo 4 alert trùng (lần khác 1) | Chỉ 1 alert |
| 6 | API-10 (B06) | `q` có emoji → `code 22007` "SQLSTATE[22007] Incorrect string value … `seeker_job_alert`.`search_context`" | Lưu được (utf8mb4) hoặc 422 rõ ràng |
| 7 | Nhiều API | Mọi response lỗi (1001, 1003, 0, 1009, 404, 22007) kèm field `error` chứa stack trace `/app/frontend/...php`, `/app/vendor/...` (33 response / lần chạy, thuộc API-02, 05, 07, 10, 12, 17, 18, 19, 20) | Không lộ stack trace / đường dẫn file |
| 8 | API-04 (E02) | `q = "   "` lưu nguyên 3 khoảng trắng | Trim, coi như không keyword |
| 9 | API-09 (V16–V19) | `province_ids` `["999999"]`, `["-1"]`, `["abc"]`, `occupation_ids` `["999999","abc"]` → 200, lưu alert | 400/422 |
| 10 | API-09 (V21) | `Content-Type: text/plain` vẫn 200 và tạo alert | 400/415 (mức thấp) |

### Lệch giả định, chờ trả lời câu hỏi (không log bug khi chưa chốt)

| Item | Kết quả | Câu hỏi |
|---|---|---|
| API-01 (C09–C10) | Không gửi `is_email_enable`/`is_app_enable`/`frequency` → lưu Email=0, Push=0, frequency 2 | API-Q6 (FE luôn gửi 1 thì không ảnh hưởng UI) |
| API-04 (E01, E04) | `search_context = {}` → 422 (đúng giả định); `""` khác bỏ field → tạo alert mới | API-Q15 |
| API-05 (N03, N04) | Khác hoa/thường, khoảng trắng thừa → tạo mới (giống finding 23/10); khác dấu → tạo mới | API-Q3 |
| API-11 (S01, S02) | `<script>`, `<img onerror>` lưu & trả nguyên văn | API-Q4 |

### Gợi ý status tab 3

| Item | Status | Ghi chú |
|---|---|---|
| API-01 | Completed phần bắt buộc | C01–C08 pass; C09–C10 chờ Q6 |
| API-02 | To Do | Bug 1 |
| API-03 | To Do (Pending Q14) | 9 tiêu chí lưu đủ, `level` tham gia so trùng; thiếu Việc gấp / Không cần CV / phường xã |
| API-04 | To Do | Bug 8; Q15 |
| API-05 | To Do | Bug 2, 3; Q3. Đảo thứ tự mảng → trùng: pass |
| API-06 | Completed | |
| API-07 | Completed | BVA 9/10/11, FIFO alert OFF, trùng khi đủ 10, slot trống: pass |
| API-08 | To Do (Pending Q16) | `created_at` epoch đúng giờ, thứ tự ổn định: pass; chưa test 23:59 và FIFO trùng giây |
| API-09 | To Do | Bug 9, 10; 16 payload sai còn lại → 422 |
| API-10 | To Do | Bug 6; 1/255/256/5000 ký tự, ký tự đặc biệt, mảng lớn: pass |
| API-11 | To Do (Pending Q4) | SQLi & mass assignment pass; XSS lưu nguyên văn |
| API-12 | To Do | Bug 4, 5; spam 50 request tổng vẫn 10 |
| API-13 | Completed phần Web | Alert App chờ Q5 |
| API-14 | Completed | Tham số sai → về mặc định/422, không 500 |
| API-15, API-16, API-17, API-18, API-20 | Completed (trừ bug 7 lộ stack trace) | |
| API-19 | Completed phần đã test | Chưa test token hết hạn / employer / sau logout |
| API-21 | To Do (Pending Q9) | Chỉ kiểm không 500 |
| API-22 → API-28 | To Do | Không cover bằng JMX |
