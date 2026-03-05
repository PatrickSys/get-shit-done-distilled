/**
 * GSDD CLI Test Helpers
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const CLI_PATH = path.join(__dirname, '..', 'bin', 'gsdd.mjs');

async function loadGsdd(cwd) {
  const previousCwd = process.cwd();
  process.chdir(cwd);

  try {
    return await import(`${pathToFileURL(CLI_PATH).href}?t=${Date.now()}-${Math.random()}`);
  } finally {
    process.chdir(previousCwd);
  }
}

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gsdd-test-'));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function cleanup(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

function setNonInteractiveStdin() {
  const descriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: false,
  });

  return () => {
    if (descriptor) {
      Object.defineProperty(process.stdin, 'isTTY', descriptor);
    } else {
      delete process.stdin.isTTY;
    }
  };
}

module.exports = { cleanup, createTempProject, loadGsdd, readJson, setNonInteractiveStdin };
