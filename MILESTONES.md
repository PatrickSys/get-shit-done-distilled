# GSDD Milestones

Completed and in-progress milestones. Active milestone phases live in `.planning/ROADMAP.md`.

---

## v0.5.0 — Workflow Kernel v1

**Status:** Complete — shipped 2026-03-28

**Goal:** Deliver the 10-workflow portable kernel with spec-driven lifecycle, subagent orchestration, and deterministic CLI.

**Phases shipped:**
- Phase 1: Workflow Continuity And Persistence
- Phase 2: Spec And Plan Quality Hardening
- Phase 3: Outcome-Based Verification
- Phase 4: Context And Adapter Depth
- Phase 5: Deterministic DX And Research Discipline

**Key deliverables:** 10 workflows (new-project, plan, execute, verify, quick, pause, resume, progress, map-codebase, audit-milestone), 3 native-capable adapters (Claude, Codex, OpenCode), 36 merged PRs, 1,062+ invariant tests.

---

## v0.6.0 — Cross-Runtime Continuity and Reduced Friction

**Status:** Partial — Phases 6-8 complete and verified; Phase 9 reopened into v0.9.0

**Goal:** Harden session continuity, compressed judgment persistence, and brownfield entry. Reduce lifecycle friction.

**Phases shipped:**
- Phase 6: Friction Audit And Brownfield Entry (completed 2026-03-30)
- Phase 7: Continuity Model And Resume Hardening (verified 2026-03-30)
- Phase 8: Compressed Judgment Handoffs (verified 2026-03-30)

**Phase 9** was included in v0.6.0 scope but reopened: the shallow implementation added checkpoint frontmatter labels without real cross-runtime validation. Reopened as v0.9.0 with deeper requirements.

**Key deliverables:** Three-layer continuity boundary (D40), compressed judgment `<judgment>` block (D41), brownfield `map-codebase → quick` lane, resume stale-checkpoint detection.

---

## v0.9.0 — True Cross-Runtime Execution (Active)

**Status:** In progress — Phases 9a and 9c complete; 9b, 9d, 10 open

See `.planning/ROADMAP.md` for current phase status and success criteria.

**Goal:** Honest cross-runtime support with fixture-validated claims, surgical session-boundary safety, and clean truth surfaces.

**Phases:**
- [x] 9a — Checkpoint Provenance Completion (PR #62, 2026-04-03)
- [x] 9c — Checkpoint Backup Safety (PR #63, 2026-04-03)
- [ ] 9b — Truth-Surface Reconciliation
- [ ] 9d — Session-Boundary Safety
- [ ] 10 — Cross-Runtime Validation Fixtures

---

## v1.0.0 — Launch Polish (Planned)

**Status:** Not started — after v0.9.0

**Tentative scope:** npm publish, positioning doc, brownfield fast lane, ceremony calibration for smaller scopes.
