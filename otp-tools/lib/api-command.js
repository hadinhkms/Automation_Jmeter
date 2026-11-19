"use strict";

const { copyToClipboard } = require("./clipboard");
const { FLOWS, renderCurl } = require("./flows");
const { MOBILE_FLOWS, renderMobileCurls } = require("./mobile-flows");
const { parseOptions, buildFlowContext, secondsLeft } = require("./cli-context");

// Lệnh `api`: sinh curl Web/Mobile và copy vào clipboard (không gọi API OTP).
async function runApiCommand() {
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

module.exports = { runApiCommand };
