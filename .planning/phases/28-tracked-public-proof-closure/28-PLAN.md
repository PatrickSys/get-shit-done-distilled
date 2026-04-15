---
phase: 28-tracked-public-proof-closure
plan: 28
type: execute
wave: 1
runtime: codex-cli
assurance: self_checked
depends_on: []
files-modified:
  - .planning/ROADMAP.md
  - .planning/SPEC.md
  - .internal-research/TODO.md
  - .internal-research/gaps.md
  - .planning/phases/28-tracked-public-proof-closure/28-PLAN.md
  - .planning/phases/28-tracked-public-proof-closure/28-SUMMARY.md
  - tests/gsdd.guards.test.cjs
  - tests/gsdd.invariants.test.cjs
  - docs/BROWNFIELD-PROOF.md
  - docs/RUNTIME-SUPPORT.md
  - docs/VERIFICATION-DISCIPLINE.md
  - docs/proof/consumer-node-cli/README.md
  - docs/proof/consumer-node-cli/brief.md
  - docs/proof/consumer-node-cli/SPEC.md
  - docs/proof/consumer-node-cli/ROADMAP.md
  - docs/proof/consumer-node-cli/phases/01-foundation/01-01-PLAN.md
  - docs/proof/consumer-node-cli/phases/01-foundation/01-01-SUMMARY.md
  - docs/proof/consumer-node-cli/phases/01-foundation/01-VERIFICATION.md
autonomous: true
requirements:
  - PROOF-01
  - PACK-01
must_haves:
  truths:
    - README-linked proof and support entrypoints are present in git-tracked repo truth, not only on local disk.
    - The exported consumer proof pack exists as a tracked artifact chain under docs/proof/consumer-node-cli/.
    - Guard and invariant coverage fail if public proof/support entrypoints drift back to local-only state.
    - Planning truth names Phase 28 as the remediation step and routes the next action to verification instead of claiming the repo-proof gap was already closed.
  artifacts:
    - path: docs/BROWNFIELD-PROOF.md
      provides: Reader-facing proof narrative in tracked repo truth
    - path: docs/RUNTIME-SUPPORT.md
      provides: Reader-facing runtime support matrix in tracked repo truth
    - path: docs/VERIFICATION-DISCIPLINE.md
      provides: Reader-facing verification boundary note in tracked repo truth
    - path: docs/proof/consumer-node-cli/README.md
      provides: Exported consumer proof-pack index
    - path: tests/gsdd.guards.test.cjs
      provides: Guard coverage for tracked public-proof truth
    - path: tests/gsdd.invariants.test.cjs
      provides: Structural invariant coverage for tracked public-proof truth
---

# Phase 28: Tracked Public Proof Closure - Plan 28

<assurance_check>
source_artifact: .planning/phases/27-release-packaging-audit/27-VERIFICATION.md
source_runtime: codex-cli
source_assurance: self_checked
current_runtime: codex-cli
current_assurance: unreviewed
status: matched_runtime
warning: Phase 28 is a same-runtime remediation pass created from the Phase 27 verification blocker. Final assurance can only be self_checked until a later verifier reruns the milestone truth from repo evidence.
</assurance_check>

## Objective
Close the tracked-public-proof blocker left by Phase 27 so `PROOF-01` and `PACK-01` can be defended from git-tracked repo truth instead of local disk truth.

## Context
- `.planning/phases/27-release-packaging-audit/27-VERIFICATION.md` found the precise blocker: the proof/support docs and exported consumer proof pack existed on disk but were not tracked in git.
- `README.md` and the proof-boundary docs already point to the right public artifacts. The remediation is to make those artifacts genuinely tracked repo truth and then lock that requirement with regression coverage.
- The user already approved the narrow remediation scope: new Phase 28, proof-gap only, no unrelated delivery cleanup.

## Requirements Covered
- `PROOF-01`
- `PACK-01`

## Tasks

<task id="28-01" type="auto">
  <files>
    - MODIFY: .planning/ROADMAP.md
    - MODIFY: .planning/SPEC.md
    - MODIFY: .internal-research/TODO.md
    - MODIFY: .internal-research/gaps.md
    - CREATE: .planning/phases/28-tracked-public-proof-closure/28-PLAN.md
    - CREATE: .planning/phases/28-tracked-public-proof-closure/28-SUMMARY.md
  </files>
  <action>
    Add Phase 28 as the explicit remediation phase, update the canonical planning surfaces so they stop claiming the proof-pack gap was already closed, and route the next action to `/gsdd-verify 28`.
  </action>
  <verify>
    - Run `rg -n "Phase 28|verify 28|tracked public proof pack|tracked-public-proof" .planning/ROADMAP.md .planning/SPEC.md .internal-research/TODO.md .internal-research/gaps.md`
  </verify>
  <done>
    The roadmap and internal truth surfaces all agree that Phase 28 is the remediation step and that verification must target Phase 28 next.
  </done>
</task>

<task id="28-02" type="auto">
  <files>
    - MODIFY: docs/BROWNFIELD-PROOF.md
    - MODIFY: docs/RUNTIME-SUPPORT.md
    - MODIFY: docs/VERIFICATION-DISCIPLINE.md
    - MODIFY: docs/proof/consumer-node-cli/README.md
    - MODIFY: docs/proof/consumer-node-cli/brief.md
    - MODIFY: docs/proof/consumer-node-cli/SPEC.md
    - MODIFY: docs/proof/consumer-node-cli/ROADMAP.md
    - MODIFY: docs/proof/consumer-node-cli/phases/01-foundation/01-01-PLAN.md
    - MODIFY: docs/proof/consumer-node-cli/phases/01-foundation/01-01-SUMMARY.md
    - MODIFY: docs/proof/consumer-node-cli/phases/01-foundation/01-VERIFICATION.md
  </files>
  <action>
    Keep the existing public proof wording unless a contradiction appears, and add the proof/support docs plus the full exported consumer proof pack to the git index so the README-linked proof boundary is actually available from a clone of the repo.
  </action>
  <verify>
    - Run `git ls-files README.md docs/BROWNFIELD-PROOF.md docs/RUNTIME-SUPPORT.md docs/VERIFICATION-DISCIPLINE.md docs/proof/consumer-node-cli/README.md`
    - Run `git ls-files docs/proof/consumer-node-cli`
  </verify>
  <done>
    The public proof/support docs and the proof-pack artifact chain are visible to `git ls-files`.
  </done>
</task>

<task id="28-03" type="auto">
  <files>
    - MODIFY: tests/gsdd.guards.test.cjs
    - MODIFY: tests/gsdd.invariants.test.cjs
  </files>
  <action>
    Add narrow regression coverage that fails if public proof/support entrypoints or exported proof-pack artifacts stop being git-tracked, then run the targeted suites plus health/scenario checks to confirm the remediation holds.
  </action>
  <verify>
    - Run `node tests/gsdd.guards.test.cjs`
    - Run `node tests/gsdd.invariants.test.cjs`
    - Run `node tests/gsdd.scenarios.test.cjs`
    - Run `node tests/gsdd.health.test.cjs`
    - Run `node bin/gsdd.mjs health --json`
  </verify>
  <done>
    Repo truth and regression coverage both enforce the tracked-public-proof boundary.
  </done>
</task>

## Verification
- `git ls-files README.md docs/BROWNFIELD-PROOF.md docs/RUNTIME-SUPPORT.md docs/VERIFICATION-DISCIPLINE.md docs/proof/consumer-node-cli/README.md`
- `git ls-files docs/proof/consumer-node-cli`
- `node tests/gsdd.guards.test.cjs`
- `node tests/gsdd.invariants.test.cjs`
- `node tests/gsdd.scenarios.test.cjs`
- `node tests/gsdd.health.test.cjs`
- `node bin/gsdd.mjs health --json`

## Success Criteria
- Public proof/support docs and proof-pack artifacts are visible to `git ls-files`.
- Planning truth no longer overclaims that the proof-pack gap was already closed before Phase 28.
- Guard and invariant coverage fail if the repo advertises tracked public proof while the proof files are only local.

## Notes
- This remediation deliberately does not expand release-floor runtime claims or perform branch/delivery cleanup.
- The work stays inside the Phase 27 blocker surface and the explicit user-approved write set.
