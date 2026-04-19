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
import { join } from 'path';

const FINGERPRINT_FILE = '.state-fingerprint.json';
const FINGERPRINT_SOURCES = ['ROADMAP.md', 'SPEC.md', 'config.json'];

/**
 * Compute a SHA-256 fingerprint from the planning truth files.
 * Missing files contribute an empty string (so a newly created file
 * registers as drift).
 */
export function computeFingerprint(planningDir) {
  const hash = createHash('sha256');
  const sources = {};
  for (const file of FINGERPRINT_SOURCES) {
    const filePath = join(planningDir, file);
    const content = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
    hash.update(`${file}:${content}\n`);
    sources[file] = existsSync(filePath);
  }
  return { hash: hash.digest('hex'), sources };
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
  const { hash, sources } = computeFingerprint(planningDir);
  const data = {
    hash,
    sources,
    timestamp: new Date().toISOString(),
  };
  writeFileSync(join(planningDir, FINGERPRINT_FILE), JSON.stringify(data, null, 2) + '\n');
  return data;
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
  const { hash: currentHash, sources: currentSources } = computeFingerprint(planningDir);

  if (!stored) {
    return {
      drifted: false,
      noBaseline: true,
      details: ['No stored fingerprint found — first session or fingerprint was cleared.'],
      stored: null,
      current: { hash: currentHash, sources: currentSources },
    };
  }

  const drifted = stored.hash !== currentHash;
  const details = [];
  if (drifted) {
    for (const file of FINGERPRINT_SOURCES) {
      const was = stored.sources?.[file] ?? false;
      const now = currentSources[file];
      if (was && !now) details.push(`${file} was removed`);
      else if (!was && now) details.push(`${file} was created`);
      else if (was && now) details.push(`${file} may have changed`);
    }
    if (details.length === 0) {
      details.push('Planning state hash changed since last recorded session.');
    }
  }

  return {
    drifted,
    noBaseline: false,
    details,
    stored: { hash: stored.hash, timestamp: stored.timestamp },
    current: { hash: currentHash, sources: currentSources },
  };
}
