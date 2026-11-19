"use strict";

const { VAR } = require("./flows");

const HELP = `
Sinh curl cho các API trong luồng OTP của seeker

  node otp-tools/gen.js api all [--platform=mobile]    Sinh tất cả curl Web (mặc định) hoặc Mobile
  node otp-tools/gen.js api <flow> [--opt=...]         Sinh một curl, copy vào clipboard
  node otp-tools/gen.js flows                        Liệt kê flow khả dụng

  node otp-tools/gen.js nonce             In ra nonce 64 ký tự (kèm timestamp decode được)
  node otp-tools/gen.js device-id         In ra device_id mới (uuid v4, giống cookie sv_ckaid_v1)
  node otp-tools/gen.js secret            Gọi API system lấy secret_key
  node otp-tools/gen.js payload           Gom đủ 3 giá trị + in lệnh curl (không gọi otp-token)
  node otp-tools/gen.js token [phone]     Gọi otp-token lấy t/s + in sẵn curl request-otp
  node otp-tools/gen.js curl [phone]      Chỉ in curl request-otp hoàn chỉnh + copy clipboard
  node otp-tools/gen.js request-otp <phone> --yes   Chạy trọn luồng và GỬI SMS thật

Option cho lệnh api:
  --platform=mobile    Với api all: sinh các API Mobile thay vì Web
  --phone=09xxxxxxxx    Web: ghi đè WEB_PHONE; Mobile: ghi đè MOBILE_PHONE
  --type=2              18.5: 2 = SMS, 1 = Voice
  --code=1234           OTP thật, mặc định để biến ${VAR.code}
  --request-id=...      Lấy từ response bước request, mặc định ${VAR.requestId}
  --lead-session=...    Lấy từ short link Lead Form, mặc định ${VAR.leadSession}
  --user-jwt=...        JWT user đã đăng nhập, mặc định ${VAR.userJwt}
  --inline-secret       Điền secret_key thật thay vì ${VAR.secretKey}
  --inline-jwt          Điền guest JWT thật thay vì ${VAR.guestJwt}
  --mobile-host=URL     Host Seeker Mobile (mặc định http://seeker-mobile.sieuviet.com:8080)
  --device-id=UUID      Device đã đăng ký cho Mobile
  --public-key-file=... PEM public key của device; tự tạo signature cho mobile-request-otp
  --private-key-file=... PEM private key; chỉ dùng khi sinh mobile-device-token
  --guest-jwt=...       JWT guest Mobile; mặc định ${VAR.guestJwt}

Biến môi trường hay dùng:
  WEB_PHONE (hoặc --phone cho curl OTP Web), SEEKER_URL, SYSTEM_URL, X_BRANCH,
  JWT_GUEST, OTP_SECRET_KEY, DEVICE_ID, CURL_HOST, MOBILE_CURL_HOST
`;

module.exports = { HELP };
