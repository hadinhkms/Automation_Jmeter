"use strict";

const { CONFIG } = require("./config");
const { createNonce, decodeNonce } = require("./lib/nonce");
const { createDeviceId } = require("./lib/device-id");
const {
  createOtpToken,
  buildOtpRequestToken,
  requestOtp,
  toRequestOtpCurl,
} = require("./lib/api");
const { copyToClipboard } = require("./lib/clipboard");
const { FLOWS } = require("./lib/flows");
const { MOBILE_FLOWS } = require("./lib/mobile-flows");
const { HELP } = require("./lib/cli-help");
const { parsePhone, resolvePhone, secondsLeft, resolveSecretKey, buildPayload, printPayload } = require("./lib/cli-context");
const { runApiCommand } = require("./lib/api-command");

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
    await runApiCommand();
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
