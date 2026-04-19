/**
 * Session Fingerprint Tests
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

function createTmpPlanning() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gsdd-fp-test-'));
  const planningDir = path.join(tmpDir, '.planning');
  fs.mkdirSync(planningDir, { recursive: true });
  return { tmpDir, planningDir };
}

function cleanupTmp(tmpDir) {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

async function importModule() {
  return import(
    `${pathToFileURL(path.join(__dirname, '..', 'bin', 'lib', 'session-fingerprint.mjs')).href}?t=${Date.now()}-${Math.random()}`
  );
}

describe('session-fingerprint', () => {
  let tmpDir, planningDir;

  beforeEach(() => {
    ({ tmpDir, planningDir } = createTmpPlanning());
  });

  afterEach(() => {
    cleanupTmp(tmpDir);
  });

  test('computeFingerprint returns a SHA-256 hex hash', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'config.json'), '{"researchDepth":"standard"}');
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec');
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap');

    const result = mod.computeFingerprint(planningDir);
    assert.ok(result.hash, 'hash should exist');
    assert.strictEqual(result.hash.length, 64, 'SHA-256 hex is 64 chars');
    assert.strictEqual(result.sources['config.json'], true);
    assert.strictEqual(result.sources['SPEC.md'], true);
    assert.strictEqual(result.sources['ROADMAP.md'], true);
  });

  test('computeFingerprint changes when a file changes', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec v1');
    const hash1 = mod.computeFingerprint(planningDir).hash;
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec v2');
    const hash2 = mod.computeFingerprint(planningDir).hash;
    assert.notStrictEqual(hash1, hash2, 'hash should change when SPEC.md changes');
  });

  test('writeFingerprint and readStoredFingerprint roundtrip', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec');
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap');
    fs.writeFileSync(path.join(planningDir, 'config.json'), '{}');

    const written = mod.writeFingerprint(planningDir);
    assert.ok(written.hash, 'writeFingerprint should return a hash');
    assert.ok(written.timestamp, 'writeFingerprint should return a timestamp');

    const stored = mod.readStoredFingerprint(planningDir);
    assert.strictEqual(stored.hash, written.hash, 'stored hash should match written');
    assert.strictEqual(stored.timestamp, written.timestamp, 'stored timestamp should match written');
  });

  test('checkDrift returns noBaseline when no fingerprint file exists', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec');

    const result = mod.checkDrift(planningDir);
    assert.strictEqual(result.drifted, false);
    assert.strictEqual(result.noBaseline, true);
  });

  test('checkDrift detects no drift when state is unchanged', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec');
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap');
    fs.writeFileSync(path.join(planningDir, 'config.json'), '{}');
    mod.writeFingerprint(planningDir);

    const result = mod.checkDrift(planningDir);
    assert.strictEqual(result.drifted, false);
    assert.strictEqual(result.noBaseline, false);
  });

  test('checkDrift detects drift when a planning file changes', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec v1');
    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap');
    fs.writeFileSync(path.join(planningDir, 'config.json'), '{}');
    mod.writeFingerprint(planningDir);

    fs.writeFileSync(path.join(planningDir, 'SPEC.md'), '# Spec v2');

    const result = mod.checkDrift(planningDir);
    assert.strictEqual(result.drifted, true);
    assert.strictEqual(result.noBaseline, false);
    assert.ok(result.details.length > 0, 'should have drift details');
    assert.ok(result.details.some((d) => d.includes('SPEC.md')), 'details should mention SPEC.md');
  });

  test('checkDrift detects drift when a file is created', async () => {
    const mod = await importModule();
    fs.writeFileSync(path.join(planningDir, 'config.json'), '{}');
    mod.writeFingerprint(planningDir);

    fs.writeFileSync(path.join(planningDir, 'ROADMAP.md'), '# Roadmap');

    const result = mod.checkDrift(planningDir);
    assert.strictEqual(result.drifted, true);
    assert.ok(result.details.some((d) => d.includes('ROADMAP.md') && d.includes('created')));
  });
});
