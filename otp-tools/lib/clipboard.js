"use strict";

const { spawnSync } = require("node:child_process");

function copyToClipboard(text) {
  const command =
    process.platform === "win32"
      ? { cmd: "clip", args: [] }
      : process.platform === "darwin"
        ? { cmd: "pbcopy", args: [] }
        : { cmd: "xclip", args: ["-selection", "clipboard"] };

  const result = spawnSync(command.cmd, command.args, { input: text, shell: process.platform === "win32" });

  return result.status === 0;
}

module.exports = { copyToClipboard };
