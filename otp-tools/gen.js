"use strict";

const { CONFIG } = require("./config");
const { createNonce, decodeNonce, isValidNonceFormat } = require("./lib/nonce");
const { createDeviceId } = require("./lib/device-id");
const {
  fetchSecretKey,
  createOtpToken,
  buildOtpRequestToken,
  requestOtp,
  toCurl,
  toRequestOtpCurl,
} = require("./lib/api");
const { copyToClipboard } = require("./lib/clipboard");
const { FLOWS, VAR, renderCurl } = require("./lib/flows");
const { MOBILE_FLOWS, renderMobileCurls } = require("./lib/mobile-flows");

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

const PHONE_PATTERN = /^0\d{9}$/;
const WEB_PHONE_FLOWS = new Set([
  "request-otp",
  "list-account",
  "profile-request-otp",
  "profile-verify",
]);

// Cặp nonce/token chỉ hợp lệ trong 30 giây kể từ lúc sinh nonce.
const TOKEN_TTL_SECONDS = 30;

function parsePhone(value) {
  if (!PHONE_PATTERN.test(value || "")) {
    throw new Error(`Số điện thoại phải đúng dạng 10 số bắt đầu bằng 0, nhận được: ${value || "(trống)"}`);
  }
  return value;
}

function resolvePhone(value) {
  const phone = value || CONFIG.webPhone;
  if (!phone) {
    throw new Error("Thiếu số test Web: đặt WEB_PHONE hoặc truyền --phone=<số được phép test>. Không tự sinh số ngẫu nhiên.");
  }
  return parsePhone(phone);
}

function secondsLeft(nonce) {
  const decoded = decodeNonce(nonce);
  if (!decoded) {
    return 0;
  }
  return Math.max(0, TOKEN_TTL_SECONDS - Math.round((Date.now() - decoded.timestampMs) / 1000));
}

async function resolveSecretKey() {
  if (CONFIG.secretKey) {
    return CONFIG.secretKey;
  }
  return fetchSecretKey();
}

async function buildPayload() {
  const nonce = createNonce();
  const deviceId = CONFIG.deviceId || createDeviceId();
  const secretKey = await resolveSecretKey();

  return { nonce, deviceId, secretKey };
}

function printPayload({ nonce, deviceId, secretKey }) {
  const decoded = decodeNonce(nonce);

  console.log(`nonce      : ${nonce}`);
  console.log(`  hợp lệ   : ${isValidNonceFormat(nonce) && decoded ? "có" : "KHÔNG"}`);
  console.log(`  timestamp: ${decoded ? `${decoded.timestampMs} (${decoded.isoTime})` : "decode lỗi"}`);
  console.log(`device_id  : ${deviceId}`);
  console.log(`secret_key : ${secretKey}`);
  console.log("");
  console.log(toCurl({ nonce, deviceId, secretKey }));
}

function parseOptions(argv) {
  const options = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      continue;
    }
    const [key, value] = arg.slice(2).split("=");
    options[key] = value === undefined ? true : value;
  }
  return options;
}

// Dựng một context dùng chung cho mọi flow, nhờ đó phone/device_id/nonce khớp
// nhau khi sinh nhiều curl cùng lúc.
async function buildFlowContext(flowNames, options) {
  const context = {
    phone: flowNames.some((name) => WEB_PHONE_FLOWS.has(name))
      ? resolvePhone(options.phone)
      : options.phone ? parsePhone(options.phone) : null,
    type: options.type || "2",
    code: options.code || VAR.code,
    requestId: options["request-id"] || VAR.requestId,
    leadSession: options["lead-session"] || VAR.leadSession,
    userJwt: options["user-jwt"] || VAR.userJwt,
    guestJwt: options["inline-jwt"] ? CONFIG.guestJwt : VAR.guestJwt,
    secretKey: options["inline-secret"] ? await resolveSecretKey() : VAR.secretKey,
    deviceId: CONFIG.deviceId || createDeviceId(),
    nonce: createNonce(),
  };

  const needsSignature = flowNames.some((name) => FLOWS[name].needsSignature);
  if (needsSignature) {
    const { token, salt } = await createOtpToken({
      nonce: context.nonce,
      deviceId: context.deviceId,
      secretKey: await resolveSecretKey(),
    });
    context.requestToken = buildOtpRequestToken(token, salt, context.nonce);
  }

  return context;
}

async function main() {
  const command = process.argv[2] || "payload";

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(HELP.trim());
    return;
  }

  if (command === "flows") {
    for (const [name, flow] of Object.entries({ ...FLOWS, ...MOBILE_FLOWS })) {
      console.log(`${name.padEnd(20)} ${flow.label}`);
    }
    return;
  }

  if (command === "api") {
    const target = process.argv[3] || "request-otp";
    const options = parseOptions(process.argv.slice(4));
    if (target === "all" && options.platform && !["web", "mobile"].includes(options.platform)) {
      throw new Error("--platform chỉ nhận web hoặc mobile");
    }
    if (target === "mobile-all" || MOBILE_FLOWS[target] || (target === "all" && options.platform === "mobile")) {
      // device-token là bước chuẩn bị riêng, không phải OTP flow thường ngày.
      const names = target === "mobile-all" || target === "all"
        ? ["mobile-request-otp", "mobile-verify-otp"]
        : [target];
      const output = renderMobileCurls(names, options);
      console.log(output);
      console.log("");
      console.log(copyToClipboard(output) ? "[đã copy vào clipboard; chưa gọi API]" : "[chưa gọi API]");
      return;
    }
    const names = target === "all" ? Object.keys(FLOWS) : [target];

    for (const name of names) {
      if (!FLOWS[name]) {
        throw new Error(`Flow không tồn tại: ${name}. Xem: node otp-tools/gen.js flows`);
      }
    }

    const context = await buildFlowContext(names, options);
    const blocks = names.map((name) => `### ${FLOWS[name].label}\n${renderCurl(name, context)}`);
    const output = blocks.join("\n\n");

    console.log(output);
    console.log("");

    const copied = copyToClipboard(output);
    const note = context.requestToken ? ` - còn ${secondsLeft(context.nonce)} giây để Send` : "";
    console.log(copied ? `[đã copy vào clipboard${note}]` : `[${note.replace(/^ - /, "") || "xong"}]`);
    return;
  }

  if (command === "nonce") {
    const nonce = createNonce();
    const decoded = decodeNonce(nonce);
    console.log(nonce);
    console.log(`(timestamp: ${decoded.timestampMs} - ${decoded.isoTime}, ratio: ${decoded.ratio})`);
    return;
  }

  if (command === "device-id") {
    console.log(CONFIG.deviceId || createDeviceId());
    return;
  }

  if (command === "secret") {
    console.log(await resolveSecretKey());
    return;
  }

  if (command === "payload") {
    printPayload(await buildPayload());
    return;
  }

  if (command === "token") {
    const phone = resolvePhone(process.argv[3]);
    const payload = await buildPayload();
    printPayload(payload);

    const { token, salt } = await createOtpToken(payload);
    const requestToken = buildOtpRequestToken(token, salt, payload.nonce);

    console.log("");
    console.log(`t (token)  : ${token}`);
    console.log(`s (salt)   : ${salt}`);
    console.log(`otp token  : ${requestToken}`);

    console.log("");
    console.log("=== curl request-otp ===");
    console.log(toRequestOtpCurl({ token: requestToken, phone, nonce: payload.nonce, deviceId: payload.deviceId }));

    console.log("");
    console.log(`Còn ${secondsLeft(payload.nonce)} giây để gửi request-otp (Constant::PHONE_OTP_DURATION_EXPIRED = 30s).`);
    return;
  }

  // In đúng một khối curl đã điền đủ, không kèm gì khác, để copy là chạy được ngay.
  if (command === "curl") {
    const phone = resolvePhone(process.argv[3]);
    const payload = await buildPayload();
    const { token, salt } = await createOtpToken(payload);
    const curl = toRequestOtpCurl({
      token: buildOtpRequestToken(token, salt, payload.nonce),
      phone,
      nonce: payload.nonce,
      deviceId: payload.deviceId,
    });

    console.log(curl);
    console.log("");
    console.log(
      copyToClipboard(curl)
        ? `[đã copy vào clipboard - còn ${secondsLeft(payload.nonce)} giây để Send]`
        : `[còn ${secondsLeft(payload.nonce)} giây để Send]`
    );
    return;
  }

  if (command === "curl-otp" || command === "request-otp") {
    // request-otp gửi SMS thật nên bắt buộc chỉ định số, không random.
    const phone = command === "request-otp" ? parsePhone(process.argv[3]) : resolvePhone(process.argv[3]);
    const payload = await buildPayload();
    const { token, salt } = await createOtpToken(payload);
    const requestToken = buildOtpRequestToken(token, salt, payload.nonce);

    console.log(`phone      : ${phone}`);
    console.log(`device_id  : ${payload.deviceId}`);
    console.log(`nonce      : ${payload.nonce}`);
    console.log(`token      : ${requestToken}`);
    console.log("");
    console.log(toRequestOtpCurl({ token: requestToken, phone, nonce: payload.nonce, deviceId: payload.deviceId }));

    if (command === "curl-otp") {
      console.log("");
      console.log("Chưa gửi SMS. Chạy lại với: request-otp <phone> --yes");
      return;
    }

    if (!process.argv.includes("--yes")) {
      throw new Error("Lệnh này gửi SMS thật, thêm --yes để xác nhận.");
    }

    const result = await requestOtp({
      token: requestToken,
      phone,
      nonce: payload.nonce,
      deviceId: payload.deviceId,
    });

    console.log("");
    console.log(`HTTP ${result.status}`);
    console.log(JSON.stringify(result.data, null, 2));
    return;
  }

  console.error(`Lệnh không hợp lệ: ${command}`);
  console.error(HELP.trim());
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
