"use strict";

const { randomUUID } = require("node:crypto");

const { CONFIG } = require("../config");

// Giá trị chỉ có được từ response của bước trước hoặc từ SMS thật thì để dạng
// biến Postman, phần nào tự tính được thì điền sẵn.
const VAR = {
  secretKey: "{{secret_key}}",
  guestJwt: "{{guest_jwt}}",
  userJwt: "{{JWTForever}}",
  code: "{{otp_code}}",
  requestId: "{{request_id}}",
  leadSession: "{{lead_session}}",
};

function correlation(prefix) {
  return `${prefix}-${randomUUID()}`;
}

const FLOWS = {
  "otp-token": {
    label: "18.2 Web Guest - cấp token chống giả mạo",
    path: "/fe/api/v1/otp-token",
    auth: "guest",
    needsSignature: false,
    headers: () => ({}),
    body: (ctx) => ({
      nonce: ctx.nonce,
      device_id: ctx.deviceId,
      secret_key: ctx.secretKey,
    }),
  },

  "request-otp": {
    label: "18.3 Web Guest - request SMS OTP đăng nhập/đăng ký",
    path: "/fe/api/v1/guest/auth/request-otp",
    auth: "guest",
    needsSignature: true,
    headers: () => ({
      "X-API-Version": "1.1",
      "X-Correlation-ID": correlation("otp-web-guest"),
    }),
    body: (ctx) => ({
      phone: ctx.phone,
      platform: "web",
      device_id: ctx.deviceId,
      nonce: ctx.nonce,
      token: ctx.requestToken,
    }),
  },

  "list-account": {
    label: "18.4 Web Guest - verify OTP, lấy account theo phone",
    path: "/fe/api/v1/guest/auth/list-account-by-phone",
    auth: "guest",
    needsSignature: false,
    headers: () => ({
      "X-Correlation-ID": correlation("otp-web-guest-verify"),
    }),
    body: (ctx) => ({
      phone: ctx.phone,
      code: ctx.code,
      request_id: ctx.requestId,
    }),
  },

  "profile-request-otp": {
    label: "18.5 Web Profile - request SMS/Voice OTP (đã đăng nhập)",
    path: "/fe/me/phone-request-otp",
    auth: "user",
    needsSignature: true,
    headers: () => ({
      "X-API-Version": "1.1",
      "X-Correlation-ID": correlation("otp-web-profile"),
    }),
    // Với X-API-Version 1.1 controller gọi validateOtpToken nên phải kèm
    // device_id/nonce/token y như flow guest.
    body: (ctx) => ({
      mobile: ctx.phone,
      type: ctx.type,
      platform: "web",
      device_id: ctx.deviceId,
      nonce: ctx.nonce,
      token: ctx.requestToken,
    }),
  },

  "profile-verify": {
    label: "18.6 Web Profile - verify phone OTP",
    path: "/fe/me/send-verify-phone-otp",
    auth: "user",
    needsSignature: false,
    headers: () => ({
      "X-Correlation-ID": correlation("otp-web-profile-verify"),
    }),
    body: (ctx) => ({
      mobile: ctx.phone,
      otp: ctx.code,
      request_id: ctx.requestId,
    }),
  },

  "lead-request-otp": {
    label: "18.7 Web MKT Lead Form - request OTP",
    path: "/fe/api/v1/verify-lead/request-otp",
    auth: "guest",
    needsSignature: false,
    headers: () => ({
      "X-Correlation-ID": correlation("otp-web-lead"),
    }),
    body: (ctx) => ({
      lead_session: ctx.leadSession,
    }),
  },

  "lead-verify": {
    label: "18.8 Web MKT Lead Form - verify OTP",
    path: "/fe/api/v1/verify-lead/register-phone-otp",
    auth: "guest",
    needsSignature: false,
    headers: () => ({
      "X-Correlation-ID": correlation("otp-web-lead-verify"),
    }),
    body: (ctx) => ({
      lead_session: ctx.leadSession,
      code: ctx.code,
      request_id: ctx.requestId,
    }),
  },
};

function renderCurl(flowName, ctx) {
  const flow = FLOWS[flowName];
  if (!flow) {
    throw new Error(`Flow không tồn tại: ${flowName}. Dùng: ${Object.keys(FLOWS).join(", ")}`);
  }

  const headers = {
    "Content-Type": "application/json",
    ...flow.headers(ctx),
    "X-BRANCH": CONFIG.branch,
    Authorization: `Bearer ${flow.auth === "user" ? ctx.userJwt : ctx.guestJwt}`,
  };

  const lines = [`curl --location '${CONFIG.curlHost}${flow.path}' \\`];
  for (const [key, value] of Object.entries(headers)) {
    lines.push(`--header '${key}: ${value}' \\`);
  }
  lines.push(`--data '${JSON.stringify(flow.body(ctx), null, 4)}'`);

  return lines.join("\n");
}

module.exports = { FLOWS, VAR, renderCurl };
