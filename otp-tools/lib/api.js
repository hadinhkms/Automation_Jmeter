"use strict";

const { randomUUID } = require("node:crypto");

const { CONFIG } = require("../config");
const { md5 } = require("./nonce");

function buildHeaders(extra) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Bearer ${CONFIG.jwtGuest}`,
    "X-BRANCH": CONFIG.branch,
    ...extra,
  };
}

async function callJson(url, { method = "GET", body, headers } = {}) {
  const response = await fetch(url, {
    method,
    headers: buildHeaders(headers),
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  return { ok: response.ok, status: response.status, data };
}

async function fetchSecretKey() {
  const url = `${CONFIG.systemUrl}${CONFIG.endpoints.configurationDetail}?code=${encodeURIComponent(CONFIG.secretCode)}`;
  const result = await callJson(url);

  if (!result.ok) {
    throw new Error(`Không lấy được secret_key (HTTP ${result.status}): ${JSON.stringify(result.data)}`);
  }

  const payload = result.data?.data ?? result.data;
  const value = payload?.value || payload?.items?.[0]?.value || "";

  if (!value) {
    throw new Error(`Configuration "${CONFIG.secretCode}" rỗng hoặc không tồn tại: ${JSON.stringify(result.data)}`);
  }

  return value;
}

async function createOtpToken({ nonce, deviceId, secretKey }) {
  const url = `${CONFIG.seekerUrl}${CONFIG.endpoints.otpToken}`;
  const result = await callJson(url, {
    method: "POST",
    body: { nonce, device_id: deviceId, secret_key: secretKey },
  });

  if (!result.ok) {
    throw new Error(`Tạo OTP token thất bại (HTTP ${result.status}): ${JSON.stringify(result.data)}`);
  }

  const payload = result.data?.data ?? result.data;
  if (!payload?.t || !payload?.s) {
    throw new Error(`Response không có token/salt: ${JSON.stringify(result.data)}`);
  }

  return { token: payload.t, salt: payload.s, raw: result.data };
}

// Chữ ký gửi kèm khi request OTP, khớp Utils::verifyPhoneOtpToken.
function buildOtpRequestToken(token, salt, nonce) {
  return md5(`${token}:${salt}:${nonce}`);
}

// X-API-Version 1.1 bắt buộc nonce/device_id/token phải khớp bản ghi request_otp_tokens,
// version 1.0 bỏ qua bước validateOtpToken.
async function requestOtp({ token, phone, nonce, deviceId, platform = "web", apiVersion = "1.1" }) {
  const url = `${CONFIG.seekerUrl}${CONFIG.endpoints.requestOtp}`;
  return callJson(url, {
    method: "POST",
    body: { token, phone, nonce, platform, device_id: deviceId },
    headers: {
      "X-API-Version": apiVersion,
      "X-Correlation-ID": `otp-web-guest-${randomUUID()}`,
    },
  });
}

function toCurl({ nonce, deviceId, secretKey }) {
  const body = JSON.stringify({ nonce, device_id: deviceId, secret_key: secretKey }, null, 4);
  return [
    `curl --location '${CONFIG.curlHost}${CONFIG.endpoints.otpToken}' \\`,
    `--header 'Content-Type: application/json' \\`,
    `--header 'X-BRANCH: ${CONFIG.branch}' \\`,
    `--header 'Authorization: Bearer ${CONFIG.jwtGuest}' \\`,
    `--data '${body}'`,
  ].join("\n");
}

function toRequestOtpCurl({ token, phone, nonce, deviceId, platform = "web" }) {
  const body = JSON.stringify({ phone, platform, device_id: deviceId, nonce, token }, null, 4);
  return [
    `curl --location '${CONFIG.curlHost}${CONFIG.endpoints.requestOtp}' \\`,
    `--header 'Content-Type: application/json' \\`,
    `--header 'X-API-Version: 1.1' \\`,
    `--header 'X-BRANCH: ${CONFIG.branch}' \\`,
    `--header 'X-Correlation-ID: otp-web-guest-${randomUUID()}' \\`,
    `--header 'Authorization: Bearer ${CONFIG.jwtGuest}' \\`,
    `--data '${body}'`,
  ].join("\n");
}

module.exports = {
  callJson,
  fetchSecretKey,
  createOtpToken,
  buildOtpRequestToken,
  requestOtp,
  toCurl,
  toRequestOtpCurl,
};
