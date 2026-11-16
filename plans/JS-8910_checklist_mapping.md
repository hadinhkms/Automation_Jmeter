# JS-8910 JMX ↔ checklist JS-8837

- JMX: [JS-8910_Skill_AI_Suggest_BE_Regression.jmx](JS-8910_Skill_AI_Suggest_BE_Regression.jmx)
- Spec: Confluence "Skill Service. API" (page 1654849556, v19, 30/10/2026)
- Checklist: JS-8837, tab **1. Backend API & Data Integrity** (6 item `BE-1` → `BE-6`, đánh số theo thứ tự trong tab)

Mỗi sampler trong JMX có tag `[BE-x]` ở đầu tên. Lọc kết quả theo tag này để mark status cho item checklist tương ứng.

## Quy tắc mark status

- Mọi case tag `[BE-x]` PASS và phần "Không cover bằng JMX" đã kiểm tay → mark item **Completed**.
- Có case FAIL → giữ **To Do**, ghi mã bug.
- Phần "Không cover bằng JMX" chưa kiểm tay → chưa mark Completed.

## Rule đã chốt với QA (11/11/2026)

- Skill khác nhau về chữ hoa / thường được xem là **2 skill khác nhau** (không tính là trùng). Áp dụng cho E16 và kiểm tra không trùng tên ở S101–S106.
- **BE cho phép lưu hơn 20 skill.** Giới hạn 20 do FE xử lý, nên mục `[Limit]` của BE-5 kiểm trên UI, không kiểm ở API.
- **Loại skill trùng khi lưu do FE xử lý**, BE không cần dedupe. Mục `[Dedupe]` của BE-5 kiểm trên UI; E17 chỉ kiểm BE nhận request và không lỗi.
- **Skill gợi ý trùng tên** (vd. 2 id khác nhau cùng tên "Adobe Illustrator") **do FE loại khi hiển thị chip.** Mục `[Unique]` của BE-1 ở API chỉ kiểm không trùng `skill_id`; trùng tên kiểm trên UI.

## Mapping

| Item checklist JS-8837 | Case JMX | Không cover bằng JMX (kiểm tay) |
|---|---|---|
| **BE-1** `[API][Suggest]` GET suggest trả `nlp_occupation_id`, skill không trùng, sắp theo slot 5-5-4-4-3 | Skill Service: S101–S107 (debug=0 chỉ 3 field, debug=1 đủ field ranking + metadata, `validation_score` 3–5, kiểm slot 5-5-4-4-3, không trùng `skill_id`, ≤ limit). Proxy `mix/fe`: A01–A10, A15, A16 | DB `skill_api_log` (`get_suggest`) và `skill_suggest_log` |
| **BE-2** `[API][Suggest][BVA]` limit, thiếu param, seeker_id/job_id/debug/include_low_score sai → 422 | Skill Service: S201–S206 (limit 0/-1/51/abc/1/50/không truyền; thiếu `request_id`/`title`/`source`/`session_id`; source free-form; seeker_id/job_id 0/-1/chữ; debug, include_low_score 0 và 2; envelope 422 `validation_error` / `VALIDATION_ERROR`, không có `error_message`). S207–S208 (title script / SQL) chỉ chạy khi `-JrunWafProbe=true`. Proxy: V01–V11 | Ghi log của source free-form (DB) |
| **BE-3** `[API][Suggest][Negative]` title không ra nghề → `nlp_occupation_id = null`, `data = []` | Skill Service: S301–S305 (`djdjjdj`, `TESOL`, toàn khoảng trắng, rỗng → 422, > 255 ký tự). Proxy: A11, A12, A14, A17, A18 (A13 XSS chạy khi `-JrunWafProbe=true`) | Dòng `skill_api_log` của request lỗi (DB) |
| **BE-4** `[API][Impression & Selected]` validate body, trả success, ghi log | Skill Service: S401–S409 (body đủ, desktop/mobile_web, `nlp_occupation_id` null hoặc không gửi → 200, thiếu từng field bắt buộc → 422, `skill_ids` chứa 0/chữ, `selected_id` 0/chữ, `updated_skill_ids` chứa 0, source/platform free-form). Proxy: B01–B15, C01–C15, luồng E2E chung `session_id` D01–D06 | DB `skill_api_log` (`post_suggest_impression` / `post_suggest_selected`, `request_id = ''`, `error_trace`). `skill_ids = []` (S406, B06): tài liệu chưa quy định → **Cần xác nhận** |
| **BE-5** `[API][Save Skill]` user-profile / job-application-profile nhận `source`, link source = suggest | E00–E16b, J00–J05: source `user_profile`/`apply`/`cv_parsing`/không truyền/rỗng/null/ngoài enum/số; resume_skills dạng string (trim, bỏ phần tử rỗng, sai kiểu → 422); E02b/E13b đối chiếu `GET /skills/seeker/<id>` = skill trên hồ sơ (so khớp phân biệt hoa thường); E15 lưu 21 skill → 200 (BE cho phép > 20); E16 skill chỉ khác hoa thường → lưu cả hai; E17 skill trùng y hệt → 200 (dedupe do FE) | `skill_seeker.source` = `suggest` / `autosuggest` / null theo từng skill (DB, đang chờ Q14/Q15); lưu từ chip trên UI |
| **BE-6** `[API][Skill Service]` add / PUT / DELETE / GET skill seeker | W00–W09 trên seeker test giả `qaSeekerId` (mặc định 2099999901): `SKILL_ID_NOT_FOUND` không ghi gì; name rỗng / toàn khoảng trắng / > 1024 ký tự bị bỏ qua; PUT thay toàn bộ set, có và không có `session_id`; PUT `data=[]`; DELETE một id; DELETE `data=[]` no-op; path id 0 và id 0 → 422. Tắt bằng `-JrunSkillWrite=false`. TearDown Z03 dọn `data=[]` | DB `skill_api_log` (`put_seeker`); `/skills/autocomplete`, `/health`, `/ping` không ghi log |

Các item ở tab 2–4 (UI, tracking, cross-platform) không nằm trong phạm vi JMX. Riêng phần API của `[US2][Refill]` (selected / impression dùng chung 1 `session_id`) được D01–D06 cover một phần; phần còn lại cần kiểm bằng DevTools trên UI.

## Kết quả gần nhất (runs/js8910_v19_20261111_112512, QC 11/11/2026)

219 case: **219 pass, 0 fail** (3 case XSS/SQL tắt mặc định).

| Item | Kết quả API | Gợi ý status |
|---|---|---|
| BE-1 | PASS | Completed sau khi kiểm tay `skill_api_log` / `skill_suggest_log` (DB) và trùng tên chip trên UI |
| BE-2 | PASS | Completed sau khi kiểm tay log source free-form (DB) |
| BE-3 | PASS | Completed sau khi kiểm tay `skill_api_log` của request lỗi (DB) |
| BE-4 | PASS | Completed sau khi kiểm tay `skill_api_log` (DB); `skill_ids = []` vẫn cần xác nhận |
| BE-5 | PASS | Completed sau khi kiểm tay `skill_seeker.source` (DB); `[Limit]` / `[Dedupe]` kiểm trên UI |
| BE-6 | PASS | Completed sau khi kiểm tay `skill_api_log` `put_seeker` (DB) |

## Case không gắn checklist

- `[Security]` X01–X06: thiếu token hoặc token sai ở proxy. Không có item checklist riêng.
- `[Cleanup]` Z01–Z03: khôi phục hồ sơ test và dọn seeker test giả.
