#!/usr/bin/env node
// Resolve the canonical Master Process (software delivery standards) into ./.master_process
// Order: $MASTER_PROCESS_DIR -> D:/_Master_process (local hub) -> git clone from GitHub.
// Usage: node scripts/link-master-process.mjs [--update]
import { existsSync, lstatSync, readlinkSync, symlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = path.join(REPO_ROOT, '.master_process');
const LOCAL_HUB = process.env.MASTER_PROCESS_DIR || 'D:/_Master_process';
const REMOTE_URL = process.env.MASTER_PROCESS_REPO || 'https://github.com/hadinhkms/_Process-WoW.git';
const MARKER = 'prompts'; // folder that must exist in a valid hub
const update = process.argv.includes('--update');

const isValidHub = (dir) => existsSync(path.join(dir, MARKER));
const log = (msg) => console.log(`[master-process] ${msg}`);

function git(args, cwd) {
  execFileSync('git', args, { cwd, stdio: 'inherit' });
}

function currentState() {
  if (!existsSync(TARGET)) {
    try { lstatSync(TARGET); return 'broken-link'; } catch { return 'missing'; }
  }
  const st = lstatSync(TARGET);
  if (st.isSymbolicLink()) return 'link';
  return existsSync(path.join(TARGET, '.git')) ? 'clone' : 'dir';
}

function linkLocalHub() {
  symlinkSync(path.resolve(LOCAL_HUB), TARGET, process.platform === 'win32' ? 'junction' : 'dir');
  log(`Linked .master_process -> ${path.resolve(LOCAL_HUB)} (local hub)`);
}

function cloneRemote() {
  log(`Local hub not found at ${LOCAL_HUB}; cloning ${REMOTE_URL}`);
  try {
    git(['clone', '--depth', '1', REMOTE_URL, TARGET], REPO_ROOT);
  } catch {
    rmSync(TARGET, { recursive: true, force: true });
    console.error('[master-process] Clone failed. The repo is private: sign in first ' +
      '(`gh auth login` or Git Credential Manager), or set MASTER_PROCESS_DIR to a local copy.');
    process.exit(1);
  }
  log('Cloned remote Master Process into .master_process');
}

function main() {
  const state = currentState();
  const localOk = isValidHub(LOCAL_HUB);

  if (state === 'broken-link') rmSync(TARGET, { force: true });

  if (state === 'link') {
    log(`Already linked -> ${readlinkSync(TARGET)}`);
    return;
  }
  if (state === 'clone') {
    if (localOk) {
      log('Local hub is now available; replacing remote clone with a link');
      rmSync(TARGET, { recursive: true, force: true });
      linkLocalHub();
    } else if (update) {
      git(['pull', '--ff-only'], TARGET);
    } else {
      log('Using existing remote clone (run with --update to pull latest)');
    }
    return;
  }
  if (state === 'dir') {
    log('.master_process exists but is neither a link nor a git clone; leaving it untouched');
    process.exitCode = isValidHub(TARGET) ? 0 : 1;
    return;
  }
  if (localOk) linkLocalHub();
  else cloneRemote();

  if (!isValidHub(TARGET)) {
    console.error('[master-process] Resolution failed: .master_process/prompts not found');
    process.exitCode = 1;
  }
}

main();
