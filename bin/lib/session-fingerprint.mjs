// session-fingerprint.mjs — Planning state drift detection
//
// Computes a SHA-256 fingerprint from the combined contents of ROADMAP.md,
// SPEC.md, and config.json. When the fingerprint stored in
// .planning/.state-fingerprint.json no longer matches the live files, the
// preflight and health systems can warn that planning state drifted since
// the last recorded session.
//
// The fingerprint file is session-local and gitignored by convention.

import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { output } from './cli-utils.mjs';
import { resolveWorkspaceContext } from './workspace-root.mjs';

const FINGERPRINT_FILE = '.state-fingerprint.json';
const FINGERPRINT_GITIGNORE_ENTRY = '.planning/.state-fingerprint.json';
const FINGERPRINT_SOURCES = ['ROADMAP.md', 'SPEC.md', 'config.json'];

/**
 * Compute a SHA-256 fingerprint from the planning truth files.
 * Missing files contribute an empty string (so a newly created file
 * registers as drift).
 */
export function computeFingerprint(planningDir) {
  const hash = createHash('sha256');
  const sources = {};
  const files = {};
  for (const file of FINGERPRINT_SOURCES) {
    const filePath = join(planningDir, file);
    const exists = existsSync(filePath);
    const content = exists ? readFileSync(filePath, 'utf-8') : '';
    hash.update(`${file}:${exists ? 'exists' : 'missing'}:${content}\n`);
    sources[file] = exists;
    files[file] = {
      exists,
      hash: createHash('sha256').update(content).digest('hex'),
    };
  }
  return { hash: hash.digest('hex'), sources, files };
}

export function cmdSessionFingerprint(...args) {
  const { args: normalizedArgs, planningDir, invalid, error } = resolveWorkspaceContext(args);
  if (invalid) {
    console.error(error);
    process.exitCode = 1;
    return;
  }

  const [action] = normalizedArgs;
  if (action !== 'write') {
    console.error('Usage: node .planning/bin/gsdd.mjs session-fingerprint write');
    process.exitCode = 1;
    return;
  }

  output({ operation: 'session-fingerprint write', fingerprint: writeFingerprint(planningDir) });
}

/**
 * Read the stored fingerprint from .planning/.state-fingerprint.json.
 * Returns null if the file does not exist or is unparseable.
 */
export function readStoredFingerprint(planningDir) {
  const filePath = join(planningDir, FINGERPRINT_FILE);
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write the current fingerprint to .planning/.state-fingerprint.json.
 */
export function writeFingerprint(planningDir) {
  ensureFingerprintGitignore(planningDir);
  const { hash, sources, files } = computeFingerprint(planningDir);
  const data = {
    hash,
    sources,
    files,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(join(planningDir, FINGERPRINT_FILE), JSON.stringify(data, null, 2) + '\n');
  return data;
}

function ensureFingerprintGitignore(planningDir) {
  const gitignorePath = join(dirname(planningDir), '.gitignore');
  const current = existsSync(gitignorePath) ? readFileSync(gitignorePath, 'utf-8') : '';
  const entries = current.split(/\r?\n/);
  if (entries.some(ignoresPlanningDir) || entries.includes(FINGERPRINT_GITIGNORE_ENTRY)) return;

  const next = current.trimEnd()
    ? `${current.trimEnd()}\n${FINGERPRINT_GITIGNORE_ENTRY}\n`
    : `${FINGERPRINT_GITIGNORE_ENTRY}\n`;
  writeFileSync(gitignorePath, next);
}

function ignoresPlanningDir(entry) {
  const normalized = String(entry || '').trim().replace(/\\/g, '/');
  return ['.planning', '/.planning', '.planning/', '/.planning/', '.planning/*', '/.planning/*', '.planning/**', '/.planning/**'].includes(normalized);
}

/**
 * Check whether the current planning state has drifted from the stored
 * fingerprint. Returns { drifted, details, stored, current }.
 *
 * If no stored fingerprint exists, returns drifted: false with a note
 * that no baseline was found (first session after adoption).
 */
export function checkDrift(planningDir) {
  const stored = readStoredFingerprint(planningDir);
  const { hash: currentHash, sources: currentSources, files: currentFiles } = computeFingerprint(planningDir);

  if (!stored) {
    return {
      drifted: false,
      noBaseline: true,
      classification: 'no_baseline',
      details: ['No stored fingerprint found — first session or fingerprint was cleared.'],
      stored: null,
      current: { hash: currentHash, sources: currentSources, files: currentFiles },
      files: [],
    };
  }

  const drifted = stored.hash !== currentHash;
  const details = [];
  const files = drifted
    ? FINGERPRINT_SOURCES.map((file) => classifyFileDrift(file, stored, currentSources, currentFiles))
    : FINGERPRINT_SOURCES.map((file) => ({ file, status: 'unchanged' }));
  if (drifted) {
    for (const file of files) {
      if (file.status === 'created') details.push(`${file.file} created`);
      else if (file.status === 'removed') details.push(`${file.file} removed`);
      else if (file.status === 'changed') details.push(`${file.file} changed`);
      else if (file.status === 'unknown') details.push(`${file.file} may have changed`);
    }
    if (details.length === 0) {
      details.push('Planning state hash changed since last recorded session.');
    }
  }

  return {
    drifted,
    noBaseline: false,
    classification: drifted ? 'planning_state_drift' : 'clean',
    details,
    files,
    stored: { hash: stored.hash, timestamp: stored.timestamp, files: stored.files ?? null },
    current: { hash: currentHash, sources: currentSources, files: currentFiles },
  };
}

function classifyFileDrift(file, stored, currentSources, currentFiles) {
  const was = stored.sources?.[file] ?? false;
  const now = currentSources[file];

  if (was && !now) return { file, status: 'removed' };
  if (!was && now) return { file, status: 'created' };
  if (!was && !now) return { file, status: 'unchanged' };

  const storedFile = stored.files?.[file];
  if (!storedFile?.hash) return { file, status: 'unknown' };
  return {
    file,
    status: storedFile.hash === currentFiles[file].hash ? 'unchanged' : 'changed',
  };
}
