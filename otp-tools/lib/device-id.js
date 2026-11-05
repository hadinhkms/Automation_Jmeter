"use strict";

const { randomUUID } = require("node:crypto");

// FE lưu device_id ở cookie sv_ckaid_v1 (uuid v4), xem FeCookie.getDeviceId.
const DEVICE_ID_COOKIE = "sv_ckaid_v1";

function createDeviceId() {
  return randomUUID();
}

function isValidDeviceId(deviceId) {
  return typeof deviceId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId);
}

// Dán nguyên chuỗi cookie copy từ DevTools vào đây để lấy đúng device_id của phiên đang test.
function readDeviceIdFromCookie(cookieHeader) {
  if (typeof cookieHeader !== "string") {
    return null;
  }

  const matched = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEVICE_ID_COOKIE}=`));

  return matched ? decodeURIComponent(matched.slice(DEVICE_ID_COOKIE.length + 1)) : null;
}

module.exports = {
  DEVICE_ID_COOKIE,
  createDeviceId,
  isValidDeviceId,
  readDeviceIdFromCookie,
};
