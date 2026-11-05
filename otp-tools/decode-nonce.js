const crypto = require("crypto");

const alphabet = "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function decodeNonce(nonce) {
  let ratio = null;
  for (let i = 1; i <= 42; i++) {
    const hash = crypto.createHash("md5").update(String(i)).digest("hex");
    if (nonce.indexOf(hash) > -1) {
      ratio = i;
      break;
    }
  }
  if (ratio === null) {
    throw new Error("Không tìm thấy ratio trong nonce");
  }

  const decoded = [...nonce.slice(0, 13)]
    .map((ch, i) => {
      if (i % 2 === 1) return ch;
      if (ch === "9") return "0";
      const pos = alphabet.indexOf(ch);
      if (pos < 0) {
        throw new Error(`Ký tự không thuộc bảng mã: ${ch}`);
      }
      return String(pos - ratio);
    })
    .join("");

  const clientMs = Number(decoded);
  if (!Number.isFinite(clientMs)) {
    throw new Error(`Không giải được timestamp: ${decoded}`);
  }

  return {
    ratio,
    clientMs,
    clientSec: Math.round(clientMs / 1000),
  };
}

function formatPlus7(sec) {
  const shifted = new Date((sec + 7 * 60 * 60) * 1000);
  const pad = (value) => String(value).padStart(2, "0");
  return (
    shifted.getUTCFullYear() +
    "-" +
    pad(shifted.getUTCMonth() + 1) +
    "-" +
    pad(shifted.getUTCDate()) +
    " " +
    pad(shifted.getUTCHours()) +
    ":" +
    pad(shifted.getUTCMinutes()) +
    ":" +
    pad(shifted.getUTCSeconds()) +
    " +07"
  );
}

function main() {
  const nonce = process.argv[2];
  const createdArg = process.argv[3];
  const created = createdArg === undefined ? null : Number(createdArg);

  if (!nonce || (created !== null && !Number.isFinite(created))) {
    console.error("Cách dùng: node decode-nonce.js <nonce> [created]");
    process.exit(1);
  }

  const result = decodeNonce(nonce);
  const output = {
    ratio: result.ratio,
    clientTime: formatPlus7(result.clientSec),
  };

  if (created !== null) {
    output.serverTime = formatPlus7(created);
    output.diffSeconds = created - result.clientSec;
  }

  console.log(output);
}

module.exports = { decodeNonce, formatPlus7 };

if (require.main === module) {
  main();
}
