"use strict";

const { createHash, randomInt } = require("node:crypto");

// Trùng với Constant::PHONE_OTP_CHARACTERS (PHP) và _0xf7a2e9() (FE).
const ALPHABET = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const NONCE_LENGTH = 64;
const TIMESTAMP_LENGTH = 13;

// Utils::decodeOTPNonce quét ratio trong khoảng [1, 42) nên 41 là giá trị lớn nhất decode được.
const RATIO_MIN = 1;
const RATIO_MAX = 41;

function md5(value) {
  return createHash("md5").update(String(value), "utf8").digest("hex");
}

function encodeTimestamp(timestamp, ratio) {
  return String(timestamp)
    .split("")
    .map((digit, index) => {
      if (index % 2 === 1) {
        return digit;
      }
      if (digit === "0") {
        return ALPHABET[ALPHABET.length - 1];
      }
      return ALPHABET[Number(digit) + ratio];
    })
    .join("");
}

function createNonceWithTimestamp(timestamp = Date.now()) {
  const ms = String(timestamp);
  if (ms.length !== TIMESTAMP_LENGTH) {
    throw new Error(`Timestamp phải có ${TIMESTAMP_LENGTH} chữ số (milliseconds), nhận được: ${ms}`);
  }

  const ratio = randomInt(RATIO_MIN, RATIO_MAX + 1);
  const head = encodeTimestamp(ms, ratio);
  const tail = md5(ratio);

  let padding = "";
  const paddingLength = NONCE_LENGTH - head.length - tail.length;
  for (let i = 0; i < paddingLength; i++) {
    padding += ALPHABET[randomInt(1, ALPHABET.length)];
  }

  return head + padding + tail;
}

function createNonce() {
  return createNonceWithTimestamp(Date.now());
}

// Port của Utils::decodeOTPNonce (PHP) để tự kiểm tra nonce trước khi gửi lên server.
function decodeNonce(nonce) {
  if (typeof nonce !== "string" || nonce.length < NONCE_LENGTH) {
    return null;
  }

  let ratio = null;
  let hashed = null;
  for (let i = RATIO_MIN; i < 42; i++) {
    const candidate = md5(i);
    if (nonce.includes(candidate)) {
      ratio = i;
      hashed = candidate;
      break;
    }
  }

  if (ratio === null) {
    return null;
  }

  const encoded = nonce.replace(hashed, "").substring(0, TIMESTAMP_LENGTH);
  const decoded = encoded
    .split("")
    .map((char, index) => {
      if (index % 2 === 1) {
        return char;
      }
      if (char === "9") {
        return "0";
      }
      return String(ALPHABET.indexOf(char) - ratio);
    })
    .join("");

  const timestampMs = Number(decoded);
  if (!timestampMs || Number.isNaN(timestampMs)) {
    return null;
  }

  return {
    ratio,
    timestampMs,
    timestampSec: Math.round(timestampMs / 1000),
    isoTime: new Date(timestampMs).toISOString(),
  };
}

function isValidNonceFormat(nonce) {
  return typeof nonce === "string" && /^[a-zA-Z0-9_]{64}$/.test(nonce);
}

module.exports = {
  ALPHABET,
  NONCE_LENGTH,
  md5,
  createNonce,
  createNonceWithTimestamp,
  decodeNonce,
  isValidNonceFormat,
};
