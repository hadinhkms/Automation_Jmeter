"use strict";

const { constants, createPublicKey, publicEncrypt } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { CONFIG } = require("../config");

const MOBILE_FLOWS = {
  "mobile-device-token": {
    label: "Mobile M1 - đăng ký device/key test (chỉ cần làm một lần)",
    path: "/api/v1/device-token",
  },
  "mobile-request-otp": {
    label: "Mobile M2 - request SMS OTP v2",
    path: "/api/v2/request-otp",
  },
  "mobile-verify-otp": {
    label: "Mobile M3 - verify SMS OTP v1",
    path: "/api/v1/verify-otp",
  },
};

function required(value, message) {
  if (!value) throw new Error(message);
  return value;
}

function publicKeyFrom(options) {
  const raw = options["public-key-file"]
    ? readFileSync(options["public-key-file"], "utf8")
    : required(CONFIG.mobile.publicKey, "Thiếu mobile.publicKey trong config.js");
  const base64 = raw.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g, "");
  const pem = `-----BEGIN PUBLIC KEY-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END PUBLIC KEY-----`;
  return {
    key: createPublicKey(pem),
    header: `-----BEGIN PUBLIC KEY-----${base64}-----END PUBLIC KEY-----`,
  };
}

function buildContext(names, options) {
  const mobile = CONFIG.mobile;
  const phone = required(options.phone || mobile.phone, "Thiếu mobile.phone trong config.js hoặc --phone");
  if (!/^0\d{9}$/.test(phone)) {
    throw new Error("Số điện thoại Mobile phải có 10 số bắt đầu bằng 0");
  }

  const deviceId = required(options["device-id"] || mobile.deviceId, "Thiếu mobile.deviceId trong config.js hoặc --device-id");
  const jwt = required(options["guest-jwt"] || mobile.guestJwt, "Thiếu mobile.guestJwt trong config.js hoặc --guest-jwt");
  const ctx = {
    phone,
    deviceId,
    jwt,
    host: required(options["mobile-host"] || mobile.curlHost, "Thiếu mobile.curlHost trong config.js").replace(/\/$/, ""),
    action: options.action || "login_phone_number",
    requestId: options["request-id"] || mobile.requestId || "{{request_id}}",
    code: options.code || mobile.code || "{{otp_code}}",
  };

  if (names.includes("mobile-request-otp")) {
    const publicKey = publicKeyFrom(options);
    ctx.publicKey = publicKey.header;
    ctx.timestamp = Date.now();
    // Khớp thứ tự trường của SeekerRequestOtpV2RequestDTO::getPayload().
    const payload = JSON.stringify({ phoneNumber: phone, deviceId, timestamp: ctx.timestamp });
    ctx.signature = publicEncrypt(
      { key: publicKey.key, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(payload)
    ).toString("base64");
  }

  if (names.includes("mobile-device-token")) {
    const privateKeyFile = required(options["private-key-file"], "Để sinh device-token, cần --private-key-file (không lưu private key trong config)");
    ctx.privateKey = readFileSync(privateKeyFile, "utf8");
  }

  return ctx;
}

function renderMobileCurl(name, ctx) {
  const flow = MOBILE_FLOWS[name];
  const headers = {
    ...CONFIG.mobile.headers,
    Authorization: `Bearer ${ctx.jwt}`,
    "Content-Type": "application/json",
  };
  let body;

  if (name === "mobile-device-token") {
    body = {
      device_token: ctx.deviceId,
      device_type: "ios",
      device_model: "otp-local-test",
      operating_system: "IOS",
      app_version: "2.27.999",
      private_key: ctx.privateKey,
    };
  } else if (name === "mobile-request-otp") {
    headers["x-device-id"] = ctx.deviceId;
    headers["x-public-key"] = ctx.publicKey;
    body = {
      type: 1,
      mobile: ctx.phone,
      signature: ctx.signature,
      timestamp: ctx.timestamp,
    };
  } else {
    body = {
      type: 1,
      mobile: ctx.phone,
      otp: ctx.code,
      request_id: ctx.requestId,
      action: ctx.action,
    };
  }

  const lines = [`curl --location '${ctx.host}${flow.path}' \\`];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`--header '${key}: ${value}' \\`);
  }
  lines.push(`--data-raw '${JSON.stringify(body, null, 4)}'`);
  return lines.join("\n");
}

function renderMobileCurls(names, options) {
  const ctx = buildContext(names, options);
  return names.map((name) => `### ${MOBILE_FLOWS[name].label}\n${renderMobileCurl(name, ctx)}`).join("\n\n");
}

module.exports = { MOBILE_FLOWS, renderMobileCurls };
