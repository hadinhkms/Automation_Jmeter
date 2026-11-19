"use strict";

const { CONFIG } = require("../config");
const { createNonce, decodeNonce, isValidNonceFormat } = require("./nonce");
const { createDeviceId } = require("./device-id");
const { fetchSecretKey, createOtpToken, buildOtpRequestToken, toCurl } = require("./api");
const { FLOWS, VAR } = require("./flows");

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

module.exports = {
  parsePhone,
  resolvePhone,
  secondsLeft,
  resolveSecretKey,
  buildPayload,
  printPayload,
  parseOptions,
  buildFlowContext,
};
