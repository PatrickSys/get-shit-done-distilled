import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { isAbsolute, join, relative, resolve } from 'path';
import { output } from './cli-utils.mjs';
import { resolveWorkspaceContext } from './workspace-root.mjs';

const EVIDENCE_KINDS = Object.freeze(['code', 'test', 'runtime', 'delivery', 'human']);
const COMPARISON_STATUSES = Object.freeze(['satisfied', 'partial', 'missing', 'waived', 'deferred', 'not_applicable']);
const CLAIM_STATUSES = Object.freeze(['passed', 'failed', 'partial', 'waived', 'deferred', 'not_applicable']);
const ARTIFACT_VISIBILITIES = Object.freeze(['local_only', 'repo_tracked', 'public']);
const RAW_ARTIFACT_TYPES = Object.freeze(['screenshot', 'trace', 'video', 'dom_snapshot', 'dom-snapshot', 'dom', 'report']);
const PUBLIC_CLAIM_USES = Object.freeze(['public', 'publication', 'tracked', 'delivery', 'release']);
const CLAIM_USES = Object.freeze([...PUBLIC_CLAIM_USES, 'local', 'local_only']);
const REQUIRED_BUNDLE_FIELDS = Object.freeze([
  'proof_bundle_version',
  'scope',
  'route_state',
  'environment',
  'viewport',
  'evidence_inputs',
  'commands_or_manual_steps',
  'observations',
  'artifacts',
  'privacy',
  'result',
  'claim_limits',
]);
const REQUIRED_SCOPE_FIELDS = Object.freeze(['work_item', 'claim', 'requirement_ids', 'slot_ids']);
const REQUIRED_ARTIFACT_FIELDS = Object.freeze(['visibility', 'retention', 'sensitivity', 'safe_to_publish']);
const REQUIRED_OBSERVATION_FIELDS = Object.freeze(['observation', 'claim', 'route_state', 'evidence_kind', 'artifact_refs', 'privacy', 'result', 'claim_limit']);
const REQUIRED_PRIVACY_FIELDS = Object.freeze(['data_classification', 'raw_artifacts_safe_to_publish', 'retention']);

class UiProofError extends Error {}

function fail(message) {
  console.error(message);
  throw new UiProofError(message);
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  if (isPlainObject(value)) return Object.keys(value).length > 0;
  return true;
}

function pathLabel(basePath, key) {
  return basePath ? `${basePath}.${key}` : key;
}

function addError(errors, code, path, message, fix) {
  errors.push({ code, path, message, fix });
}

function requireField(obj, field, path, errors) {
  if (!isPlainObject(obj) || !hasValue(obj[field])) {
    addError(errors, 'missing_required_field', pathLabel(path, field), `Missing required UI proof field: ${pathLabel(path, field)}`, 'Add the required field to the proof bundle metadata.');
    return false;
  }
  return true;
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function artifactType(artifact) {
  const explicit = typeof artifact.type === 'string' ? artifact.type.toLowerCase() : '';
  if (explicit) return explicit;
  const artifactPath = typeof artifact.path === 'string' ? artifact.path.toLowerCase() : '';
  if (/screenshot|\.png$|\.jpe?g$|\.webp$/.test(artifactPath)) return 'screenshot';
  if (/trace|\.zip$/.test(artifactPath)) return 'trace';
  if (/video|\.mp4$|\.webm$|\.mov$/.test(artifactPath)) return 'video';
  if (/dom|\.html?$/.test(artifactPath)) return 'dom_snapshot';
  if (/report/.test(artifactPath)) return 'report';
  return explicit;
}

function isRawUiArtifact(artifact) {
  return RAW_ARTIFACT_TYPES.includes(artifactType(artifact));
}

function collectClaimUses(bundle, options) {
  const uses = new Set();
  for (const value of normalizeArray(options.claimUse).concat(normalizeArray(options.claimUses))) {
    uses.add(String(value).toLowerCase());
  }

  const explicitSources = [
    bundle?.proof_claim,
    bundle?.proof_claims,
    bundle?.claim_context?.proof_use,
    bundle?.claim_context?.proof_uses,
    bundle?.publication?.intended_use,
  ];
  for (const source of explicitSources) {
    for (const value of normalizeArray(source)) uses.add(String(value).toLowerCase());
  }

  return [...uses];
}

function validateClaimUses(bundle, options, errors) {
  for (const value of collectClaimUses(bundle, options)) {
    if (!CLAIM_USES.includes(value)) {
      addError(errors, 'unsupported_claim_use', 'proof_claim', `Unsupported UI proof claim use: ${value}`, `Use only: ${CLAIM_USES.join(', ')}.`);
    }
  }
}

function hasPublicClaim(bundle, options) {
  return collectClaimUses(bundle, options).some((value) => PUBLIC_CLAIM_USES.includes(value));
}

function validateObservationPrivacy(privacy, path, errors) {
  for (const field of REQUIRED_PRIVACY_FIELDS) requireField(privacy, field, path, errors);
  if (hasValue(privacy?.raw_artifacts_safe_to_publish) && typeof privacy.raw_artifacts_safe_to_publish !== 'boolean') {
    addError(errors, 'invalid_raw_artifacts_safe_to_publish', `${path}.raw_artifacts_safe_to_publish`, 'raw_artifacts_safe_to_publish must be a boolean.', 'Use false unless all raw artifacts are explicitly safe to publish.');
  }
}

function validateObservations(bundle, errors) {
  for (const [index, observation] of normalizeArray(bundle?.observations).entries()) {
    if (!isPlainObject(observation)) continue;
    const observationPath = `observations[${index}]`;
    for (const field of REQUIRED_OBSERVATION_FIELDS) requireField(observation, field, observationPath, errors);
    if (hasValue(observation.evidence_kind) && !EVIDENCE_KINDS.includes(observation.evidence_kind)) {
      addError(errors, 'unsupported_evidence_kind', `${observationPath}.evidence_kind`, `Unsupported UI proof observation evidence kind: ${observation.evidence_kind}`, `Use only: ${EVIDENCE_KINDS.join(', ')}.`);
    }
    if (hasValue(observation.result) && !CLAIM_STATUSES.includes(observation.result)) {
      addError(errors, 'invalid_observation_result', `${observationPath}.result`, `Invalid UI proof observation result: ${observation.result}`, `Use only: ${CLAIM_STATUSES.join(', ')}.`);
    }
    validateObservationPrivacy(observation.privacy, `${observationPath}.privacy`, errors);
  }
}

function validateEvidenceKinds(bundle, errors) {
  const kinds = normalizeArray(bundle?.evidence_inputs?.kinds);
  if (kinds.length === 0) {
    addError(errors, 'missing_evidence_kinds', 'evidence_inputs.kinds', 'Missing UI proof evidence kinds.', 'Record at least one fixed evidence kind: code, test, runtime, delivery, or human.');
  }
  for (const [index, kind] of kinds.entries()) {
    if (!EVIDENCE_KINDS.includes(kind)) {
      addError(errors, 'unsupported_evidence_kind', `evidence_inputs.kinds[${index}]`, `Unsupported UI proof evidence kind: ${kind}`, `Use only: ${EVIDENCE_KINDS.join(', ')}.`);
    }
  }
}

function validateResult(bundle, errors) {
  if (!isPlainObject(bundle?.result)) return;
  if (!hasValue(bundle.result.claim_status)) {
    addError(errors, 'missing_claim_status', 'result.claim_status', 'Missing UI proof result claim status.', `Record claim_status using: ${CLAIM_STATUSES.join(', ')}.`);
  } else if (!CLAIM_STATUSES.includes(bundle.result.claim_status)) {
    addError(errors, 'invalid_claim_status', 'result.claim_status', `Invalid UI proof claim status: ${bundle.result.claim_status}`, `Use only: ${CLAIM_STATUSES.join(', ')}.`);
  }
}

function validateComparisonStatuses(bundle, errors) {
  const statuses = bundle?.result?.comparison_status_by_slot;
  if (!isPlainObject(statuses)) {
    addError(errors, 'missing_comparison_statuses', 'result.comparison_status_by_slot', 'Missing UI proof comparison statuses by slot.', `Record one status per slot using: ${COMPARISON_STATUSES.join(', ')}.`);
    return;
  }
  const slotIds = normalizeArray(bundle?.scope?.slot_ids);
  const slotSet = new Set(slotIds);
  for (const slotId of slotIds) {
    if (!hasValue(statuses[slotId])) {
      addError(errors, 'missing_comparison_status', `result.comparison_status_by_slot.${slotId}`, `Missing UI proof comparison status for slot: ${slotId}`, `Record one status per slot using: ${COMPARISON_STATUSES.join(', ')}.`);
    }
  }
  for (const [slot, status] of Object.entries(statuses)) {
    if (slotSet.size > 0 && !slotSet.has(slot)) {
      addError(errors, 'unknown_comparison_slot', `result.comparison_status_by_slot.${slot}`, `UI proof comparison status references undeclared slot: ${slot}`, 'Use only slot IDs declared in scope.slot_ids.');
    }
    if (!COMPARISON_STATUSES.includes(status)) {
      addError(errors, 'invalid_comparison_status', `result.comparison_status_by_slot.${slot}`, `Invalid UI proof comparison status: ${status}`, `Use only: ${COMPARISON_STATUSES.join(', ')}.`);
    }
  }
}

function validateClaimLimits(bundle, errors) {
  const claimLimits = normalizeArray(bundle?.claim_limits);
  if (claimLimits.length === 0) {
    addError(errors, 'missing_claim_limits', 'claim_limits', 'Missing UI proof claim limits.', 'Add at least one claim limit that narrows what this proof does not prove.');
  }
}

function artifactReference(artifact) {
  if (!isPlainObject(artifact)) return null;
  if (typeof artifact.path === 'string' && artifact.path.trim()) return artifact.path.trim();
  if (typeof artifact.url === 'string' && artifact.url.trim()) return artifact.url.trim();
  return null;
}

function validateArtifacts(bundle, errors, publicClaim) {
  const artifacts = normalizeArray(bundle?.artifacts);
  if (artifacts.length === 0) {
    addError(errors, 'missing_artifacts', 'artifacts', 'Missing UI proof artifacts list.', 'Record artifact metadata for each referenced proof artifact.');
    return new Set();
  }

  const artifactRefs = new Set();
  for (const [index, artifact] of artifacts.entries()) {
    const artifactPath = `artifacts[${index}]`;
    if (!isPlainObject(artifact)) {
      addError(errors, 'invalid_artifact', artifactPath, 'UI proof artifact entry must be an object.', 'Record path/type plus privacy metadata for each artifact.');
      continue;
    }
    const ref = artifactReference(artifact);
    if (!ref) {
      addError(errors, 'missing_artifact_ref', artifactPath, 'UI proof artifact must include path or url.', 'Reference raw UI artifacts by path or URL; do not inline them.');
    } else {
      artifactRefs.add(ref);
    }
    for (const field of REQUIRED_ARTIFACT_FIELDS) {
      requireField(artifact, field, artifactPath, errors);
    }
    if (hasValue(artifact.visibility) && !ARTIFACT_VISIBILITIES.includes(artifact.visibility)) {
      addError(errors, 'invalid_visibility', `${artifactPath}.visibility`, `Invalid UI proof artifact visibility: ${artifact.visibility}`, `Use only: ${ARTIFACT_VISIBILITIES.join(', ')}.`);
    }
    if (hasValue(artifact.safe_to_publish) && typeof artifact.safe_to_publish !== 'boolean') {
      addError(errors, 'invalid_safe_to_publish', `${artifactPath}.safe_to_publish`, 'safe_to_publish must be a boolean.', 'Use true only after explicit safe-to-publish classification; otherwise use false.');
    }
    if (isRawUiArtifact(artifact) && artifact.visibility !== 'local_only' && artifact.safe_to_publish !== true) {
      addError(errors, 'unsafe_raw_artifact', artifactPath, 'Raw UI artifacts are local-only by default unless explicitly classified safe to publish.', 'Set visibility: local_only and safe_to_publish: false, or document sanitized public-safe classification.');
    }
    if (publicClaim && (artifact.visibility === 'local_only' || artifact.safe_to_publish !== true)) {
      addError(errors, 'unsafe_public_proof_claim', artifactPath, 'Public/tracked/delivery UI proof claims cannot rely on local-only or unsafe artifacts.', 'Use local-only claim language, or provide sanitized artifacts with safe_to_publish: true and non-local visibility.');
    }
  }
  return artifactRefs;
}

function validatePrivacy(bundle, errors) {
  validateObservationPrivacy(bundle.privacy, 'privacy', errors);
}

function validateObservationArtifactRefs(bundle, artifactRefs, errors) {
  for (const [index, observation] of normalizeArray(bundle?.observations).entries()) {
    if (!isPlainObject(observation)) continue;
    for (const [refIndex, ref] of normalizeArray(observation.artifact_refs).entries()) {
      if (!artifactRefs.has(ref)) {
        addError(errors, 'unknown_artifact_ref', `observations[${index}].artifact_refs[${refIndex}]`, `Observation references undeclared UI proof artifact: ${ref}`, 'Add the artifact to artifacts[] or correct the observation artifact reference.');
      }
    }
  }
}

export function validateUiProofBundle(bundle, options = {}) {
  const errors = [];
  const warnings = [];

  if (!isPlainObject(bundle)) {
    addError(errors, 'invalid_bundle', '', 'UI proof bundle must be an object.', 'Provide structured UI proof metadata.');
    return { valid: false, errors, warnings };
  }

  for (const field of REQUIRED_BUNDLE_FIELDS) requireField(bundle, field, '', errors);
  for (const field of REQUIRED_SCOPE_FIELDS) requireField(bundle.scope, field, 'scope', errors);
  validateClaimUses(bundle, options, errors);
  validateEvidenceKinds(bundle, errors);
  validateObservations(bundle, errors);
  validateResult(bundle, errors);
  validateComparisonStatuses(bundle, errors);
  validateClaimLimits(bundle, errors);
  validatePrivacy(bundle, errors);
  const artifactRefs = validateArtifacts(bundle, errors, hasPublicClaim(bundle, options));
  validateObservationArtifactRefs(bundle, artifactRefs, errors);

  return { valid: errors.length === 0, errors, warnings };
}

export function parseUiProofBundleContent(content, filePath = 'UI proof bundle') {
  const trimmed = content.trim();
  if (!trimmed) {
    return { bundle: null, errors: [{ code: 'empty_bundle_file', path: filePath, message: 'UI proof bundle file is empty.', fix: 'Write JSON UI proof metadata before validating.' }] };
  }

  const jsonCandidates = [trimmed];
  const fenceMatches = [...trimmed.matchAll(/```(?:json|ui-proof-json)?\s*([\s\S]*?)```/gi)];
  for (const match of fenceMatches) jsonCandidates.push(match[1].trim());

  for (const candidate of jsonCandidates) {
    try {
      return { bundle: JSON.parse(candidate), errors: [] };
    } catch {
      // Try next candidate; final error is reported below.
    }
  }

  return {
    bundle: null,
    errors: [{ code: 'unparseable_bundle', path: filePath, message: 'UI proof bundle metadata is not valid JSON.', fix: 'Use a .json proof bundle or a markdown fenced JSON block; no YAML parser dependency is installed.' }],
  };
}

export function readUiProofBundleFile(filePath) {
  return parseUiProofBundleContent(readFileSync(filePath, 'utf-8'), filePath);
}

function walkForUiProofFiles(dir, results) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkForUiProofFiles(fullPath, results);
      continue;
    }
    const name = entry.toLowerCase();
    if (['ui-proof.json', 'ui-proof.md', 'proof-bundle.json'].includes(name)) {
      results.add(fullPath);
    }
  }
}

export function findUiProofBundleFiles(planningDir) {
  const results = new Set();
  for (const relativePath of [
    'UI-PROOF.json',
    'ui-proof.json',
    'ui-proof.md',
    'ui-proof/UI-PROOF.json',
    'ui-proof/proof-bundle.json',
    'brownfield-change/UI-PROOF.json',
  ]) {
    const fullPath = join(planningDir, relativePath);
    if (existsSync(fullPath)) results.add(fullPath);
  }
  for (const relativeDir of ['phases', 'quick', 'brownfield-change']) {
    walkForUiProofFiles(join(planningDir, relativeDir), results);
  }
  return [...results].sort();
}

function resolveWorkspacePath(cwd, target) {
  const workspaceRoot = resolve(cwd);
  const resolved = resolve(workspaceRoot, target);
  const rel = relative(workspaceRoot, resolved);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))) return resolved;
  fail(`Path must stay inside the workspace: ${target}`);
}

function parseClaimUse(args) {
  const values = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== '--claim') fail('Usage: gsdd ui-proof validate <path> [--claim <public|publication|tracked|delivery|release>]');
    const value = args[index + 1];
    if (!value || value.startsWith('--')) fail('Usage: gsdd ui-proof validate <path> [--claim <public|publication|tracked|delivery|release>]');
    values.push(...value.split(',').map((entry) => entry.trim()).filter(Boolean));
    index += 1;
  }
  for (const value of values) {
    if (!PUBLIC_CLAIM_USES.includes(value)) fail(`Unsupported UI proof claim use: ${value}`);
  }
  return values;
}

function cmdValidate(cwd, args) {
  const [targetArg, ...flags] = args;
  if (!targetArg) fail('Usage: gsdd ui-proof validate <path> [--claim <public|publication|tracked|delivery|release>]');
  const target = resolveWorkspacePath(cwd, targetArg);
  if (!existsSync(target) || statSync(target).isDirectory()) fail(`UI proof bundle file does not exist: ${targetArg}`);

  const parsed = readUiProofBundleFile(target);
  const validation = parsed.errors.length > 0
    ? { valid: false, errors: parsed.errors, warnings: [] }
    : validateUiProofBundle(parsed.bundle, { claimUses: parseClaimUse(flags) });

  output({ operation: 'ui-proof validate', target: targetArg, valid: validation.valid, errors: validation.errors, warnings: validation.warnings });
  if (!validation.valid) process.exitCode = 1;
}

export function cmdUiProof(...args) {
  const { args: normalizedArgs, workspaceRoot, invalid, error } = resolveWorkspaceContext(args);
  if (invalid) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  const [operation, ...rest] = normalizedArgs;
  try {
    switch (operation) {
      case 'validate':
        cmdValidate(workspaceRoot, rest);
        return;
      default:
        fail('Usage: gsdd ui-proof validate <path> [--claim <public|publication|tracked|delivery|release>]');
    }
  } catch (error) {
    if (error instanceof UiProofError) {
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

export {
  ARTIFACT_VISIBILITIES as UI_PROOF_ARTIFACT_VISIBILITIES,
  COMPARISON_STATUSES as UI_PROOF_COMPARISON_STATUSES,
  EVIDENCE_KINDS as UI_PROOF_EVIDENCE_KINDS,
  RAW_ARTIFACT_TYPES as UI_PROOF_RAW_ARTIFACT_TYPES,
};
