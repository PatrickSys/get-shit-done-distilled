---
phase: 28-tracked-public-proof-closure
plan: 28
runtime: codex-cli
assurance: self_checked
---

# Phase 28: Tracked Public Proof Closure - Plan 28 Summary

**Completed**: 2026-04-15
**Tasks**: 3
**Git Actions**: Added the public proof/support docs, the exported consumer proof pack, and the new Phase 28 plan/summary artifacts to the git index. No commit or PR created.
**Deviations**: The proof/support docs and proof pack already existed locally from earlier work, so Phase 28 did not rewrite them broadly. It adopted that existing content into tracked repo truth, corrected the planning-state overclaim, and added the missing git-tracking regressions.
**Decisions Made**: Keep the remediation narrow. Phase 28 closes the tracked-proof blocker without broadening runtime claims, reopening public naming work, or absorbing unrelated branch/delivery cleanup.
**Notes for Verification**: Re-run `git ls-files` on the proof/support docs and the exported proof pack, then re-run the guard, invariant, scenario, and health suites. The key question is no longer "do the files exist?" but "are the README-linked proof artifacts really part of tracked repo truth?"
**Notes for Next Work**: Run `/gsdd-verify 28`, then route through `/gsdd-progress` into the milestone-close audit path if the remediation verifies cleanly.

**Task outcomes**:
- Added Phase 28 to the roadmap and corrected `.planning/SPEC.md`, `.internal-research/TODO.md`, and `.internal-research/gaps.md` so they stop claiming the proof-pack tracking gap was already closed.
- Added the reader-facing proof/support docs plus the full `docs/proof/consumer-node-cli/` artifact chain to the git index so the README-linked proof boundary is available from tracked repo truth.
- Added git-tracking assertions to the guard and invariant suites so future local-only proof docs fail fast instead of silently satisfying file-existence checks.

<checks>
<executor_check>
checker: self
checker_runtime: codex-cli
status: passed
blocking: false
notes: Verified the remediation with `git ls-files README.md docs/BROWNFIELD-PROOF.md docs/RUNTIME-SUPPORT.md docs/VERIFICATION-DISCIPLINE.md docs/proof/consumer-node-cli/README.md`, `git ls-files docs/proof/consumer-node-cli`, `node tests/gsdd.guards.test.cjs`, `node tests/gsdd.invariants.test.cjs`, `node tests/gsdd.scenarios.test.cjs`, `node tests/gsdd.health.test.cjs`, and `node bin/gsdd.mjs health --json`.
</executor_check>
</checks>

<handoff>
plan_runtime: codex-cli
plan_assurance: self_checked
plan_check_status: passed
execution_runtime: codex-cli
execution_assurance: self_checked
executor_check_status: passed
hard_mismatches_open: false
</handoff>

<deltas>
- class: factual_discovery
  impact: recoverable
  disposition: proceeded
  summary: The proof/support docs and proof pack were already written locally, so the real blocker was git tracking rather than missing content. Phase 28 fixed the repo-truth seam by adding the artifacts to the index and then guarding that boundary.
- class: factual_discovery
  impact: recoverable
  disposition: proceeded
  summary: `.planning/SPEC.md` and `.internal-research/TODO.md` had drifted into claiming the proof pack was already tracked repo truth. Phase 28 corrected those planning surfaces in the same session as the actual git-tracking fix.
</deltas>

<judgment>
<active_constraints>
- Keep the fork-honest v1.2.0 posture fixed: Workspine leads the public story while `gsdd-cli`, `gsdd`, `gsdd-*`, and `.planning/` remain explicit retained contracts.
- Treat "tracked public proof" as a git-truth claim, not a local-disk claim.
- Keep public proof boundaries on the verified release floor; do not use Phase 28 as an excuse to widen runtime parity claims.
</active_constraints>
<unresolved_uncertainty>
- Phase 28 closes the concrete tracked-proof seam, but the remediation still needs a dedicated verifier pass before the milestone-close audit path can rely on it.
- The branch name remains stale relative to the actual write set, so delivery hygiene remains warning-level context even though it is not part of this remediation.
</unresolved_uncertainty>
<decision_posture>
Solve the blocker at the repo-truth layer instead of rewriting copy. The right fix is to make the advertised proof/support artifacts genuinely tracked and then encode that requirement in tests.
</decision_posture>
<anti_regression>
- Do not advertise repo-tracked public proof from README or proof-boundary docs unless the target artifacts are visible to `git ls-files`.
- Do not rely on file-existence checks alone for public proof/support surfaces.
- Keep the exported proof pack under `docs/proof/consumer-node-cli/` as the tracked public artifact chain, and keep `.planning/live-proof/consumer-node-cli` as evidence-only source material.
</anti_regression>
</judgment>
