const fs = require("fs");
const path = require("path");
const { decodeNonce, formatPlus7 } = require("./decode-nonce");

function parseLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const jsonStart = trimmed.indexOf("{");
  if (jsonStart < 0) return null;

  const raw = trimmed.slice(jsonStart);
  const source = jsonStart > 0 ? trimmed.slice(0, jsonStart).replace(/:$/, "") : "";
  return {
    source,
    raw,
    row: JSON.parse(raw),
  };
}

function readEntries(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map(parseLine)
    .filter(Boolean)
    .map((entry, index) => {
      const params = entry.row.detail?.params || {};
      const created = Number(entry.row.created);
      let decoded = null;
      let decodeError = "";

      try {
        decoded = decodeNonce(params.nonce);
      } catch (error) {
        decodeError = error.message;
      }

      const diffSeconds = decoded && Number.isFinite(created) ? created - decoded.clientSec : null;

      return {
        index: index + 1,
        source: entry.source,
        fullLog: entry.raw,
        mobile: params.mobile || "",
        error: entry.row.detail?.error || "",
        nonce: params.nonce || "",
        created: Number.isFinite(created) ? String(created) : "",
        clientTime: decoded ? formatPlus7(decoded.clientSec) : "",
        serverTime: Number.isFinite(created) ? formatPlus7(created) : "",
        diffSeconds,
        decodeError,
      };
    });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(entries) {
  const rows = entries
    .map((entry) => {
      const diff = entry.diffSeconds === null ? entry.decodeError : `${entry.diffSeconds} giây`;
      const diffClass = entry.diffSeconds > 30 ? "late" : "";
      return `<tr>
        <td>${entry.index}</td>
        <td>${escapeHtml(entry.mobile)}</td>
        <td>${escapeHtml(entry.error)}</td>
        <td class="mono">${escapeHtml(entry.nonce)}</td>
        <td class="mono">${escapeHtml(entry.created)}</td>
        <td class="time">${escapeHtml(entry.clientTime)}</td>
        <td class="time">${escapeHtml(entry.serverTime)}</td>
        <td class="${diffClass}">${escapeHtml(diff)}</td>
        <td class="log">${escapeHtml(entry.fullLog)}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>OTP log lệch giờ</title>
  <style>
    body { font-family: sans-serif; margin: 16px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ccc; padding: 10px 12px; line-height: 1.6; vertical-align: middle; text-align: left; }
    .time { white-space: nowrap; }
    th { position: sticky; top: 0; background: #f3f3f3; }
    tr:nth-child(even) { background: #fafafa; }
    .mono, .log { font-family: ui-monospace, monospace; font-size: 12px; }
    .log { white-space: pre-wrap; word-break: break-all; min-width: 480px; }
    .late { color: #b00020; font-weight: 700; }
  </style>
</head>
<body>
  <p>${entries.length} dòng. Giờ đã cộng +07. Lệch lớn hơn 30 giây là máy user chậm hơn server.</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>mobile</th>
        <th>error</th>
        <th>nonce</th>
        <th>created</th>
        <th>giờ user +07</th>
        <th>giờ server +07</th>
        <th>lệch</th>
        <th>full log</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

function main() {
  const input = process.argv[2] || path.join(__dirname, "logs-debug.txt");

  const entries = readEntries(input);
  const output = path.join(path.dirname(path.resolve(input)), `${path.basename(input, path.extname(input))}-result.html`);
  fs.writeFileSync(output, renderHtml(entries));
  console.log(`Đã ghi ${entries.length} dòng: ${output}`);
}

main();
