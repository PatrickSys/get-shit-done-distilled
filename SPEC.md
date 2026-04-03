# GSDD — GSD Distilled Specification

> Living document. Source of truth for what GSDD is, what it takes from GSD, what it strips, and what the lifecycle looks like.
> Local-only. Do not persist in git. Challenge claims — this is mostly AI-written.

---

## What This Is

GSDD (GSD Distilled) is a **stripped-down, agent-agnostic fork of GSD** (Get Shit Done). It takes the proven spec-driven development lifecycle from GSD and removes the complexity ceiling — fewer commands, fewer files, fewer moving parts — while keeping the core loop that makes GSD work.

**Core loop:** `init → plan → execute → verify` — per phase, within milestones.

**Supported agents:** Claude Code, Gemini CLI, Codex CLI, Cursor, GitHub Copilot (extension/chat/CLI), Antigravity, any AI coding agent. Framework files are plain markdown — any agent that can read files can follow the workflows.

---

## Distillation Anchors From GSD

> This section keeps only the upstream facts that still matter for product truth and current design constraints. Exhaustive command/workflow inventories belong in archive material or design evidence, not in the live spec.

### What Matters From Upstream GSD

- GSD is workflow-heavy and Claude-first. Its core leverage comes from the spec-driven lifecycle, role specialization, and explicit verification, but many workflow surfaces assume Claude-specific APIs.
- The main upstream files that still drive GSDD distillation are `get-shit-done/workflows/*.md`, the original role files preserved in `agents/_archive/`, and the upstream templates that define lifecycle artifacts and codebase mapping shape.
- GSDD keeps the lifecycle and the strongest guardrails, but strips vendor lock-in, excessive ceremony, and stale-state artifacts.

USER NOTE PRESERVED: The delegate layer now lives under `distilled/templates/delegates/`. The rationale is that delegates are task-specific wrappers, not durable role contracts. The durable "what the agent is" contract lives in `agents/*.md`; the delegate layer carries the workflow-specific "what the agent does here" wrapper. See `distilled/DESIGN.md` decision 3 for the full rationale.

### Canonical Role Library

`agents/` now contains the merged canonical 9-role library on `main`, and `agents/_archive/` preserves the 11 original GSD role files for source comparison.

| GSD Original(s) | Canonical Role |
|------------------|---------------|
| `gsd-codebase-mapper.md` | `mapper.md` |
| `gsd-project-researcher.md` + `gsd-phase-researcher.md` | `researcher.md` |
| `gsd-research-synthesizer.md` | `synthesizer.md` |
| `gsd-planner.md` + `gsd-plan-checker.md` | `planner.md` |
| `gsd-executor.md` | `executor.md` |
| `gsd-verifier.md` | `verifier.md` |
| `gsd-roadmapper.md` | `roadmapper.md` |
| `gsd-debugger.md` | `debugger.md` |

> [!IMPORTANT]
> **Subagent baseline:** GSD heavily relies on Claude's `Task()` subagent spawning. GSDD workflows must still work single-agent as the baseline, but subagent orchestration remains a core enhancement. Re-implement subagent behavior only after explicit research and tool-surface comparison.

### The Lean Context Decision: Why We Stripped the 7-File Monolith

**Original GSD Design:** Generated 7 static files during codebase mapping: `STACK`, `ARCHITECTURE`, `CONVENTIONS`, `CONCERNS`, `STRUCTURE`, `TESTING`, `INTEGRATIONS`.
**GSDD Design:** Enforces a strict **4-File Standard** (`STACK`, `ARCHITECTURE`, `CONVENTIONS`, `CONCERNS`).

**Why did we drop the other three? (The "Context Rot" Problem)**
Explicitly documented here to prevent future agents from hallucinating them back into existence or users wondering where the leverage went. Research against 2026 SOTA tools (LeanSpec "Context Economy", Aider `tree-sitter` dynamic repomaps) proves that mapping *current state* into static Markdown is an anti-pattern.
1. **`STRUCTURE.md` (Dropped):** A physical map of directories breaks the moment a developer adds a new folder. Passing stale state to execution agents causes massive hallucination. Modern agents use dynamic runtime tools (Cursor indexing, OpenSearch, Aider repomaps) to view structure instantly.
2. **`INTEGRATIONS.md` (Dropped):** Database schemas and endpoint maps change daily. An agent should be instructed to read the definitive `schema.prisma` or `init.sql` dynamically, rather than trusting a stale Markdown summary.
3. **`TESTING.md` (Dropped / Merged):** Testing inventories rot quickly, but testing rules do not. GSDD keeps durable testing conventions inside `CONVENTIONS.md` and expects agents to inspect the real test setup dynamically when implementation starts.

**How do we preserve the Engineering Rigor (High ROI)?**
We drop the *state*, but we MUST keep the *intent*. The 3 files were dropped, but their **rules** were aggressively absorbed into the remaining 4 files:
*   "Where to put new code" (formerly in `STRUCTURE`) is now a strict section in `CONVENTIONS.md`.
*   "How to mock the database" (formerly in `TESTING`) is now a strict section in `CONVENTIONS.md`.
*   "Where to find the definitive API schemas" (formerly in `INTEGRATIONS`) is now documented in `STACK.md` and `CONVENTIONS.md`.

This yields the ultimate high-ROI mapping: Maximum architectural discipline without feeding stale physical topologies into limited context windows.

**TESTING.md rationale:** Testing conventions (how to mock, testing patterns) were merged into CONVENTIONS.md. Test inventories are state that rots; stable rules belong in CONVENTIONS.md. See D1 in `distilled/DESIGN.md` for the full evidence record.

### What GSDD Explicitly Strips

- Claude-specific workflow APIs such as `AskUserQuestion`, `Task()`, and `SlashCommand()` must not appear in the portable workflow core.
- Hardcoded vendor paths and converter-style adapter logic are stripped in favor of plain markdown source plus generated adapters.
- Separate stale-state artifacts such as `STRUCTURE.md`, `INTEGRATIONS.md`, and `TESTING.md` inventories are stripped from the codebase mapping contract.
- Excessive lifecycle ceremony that duplicates durable truth across many files is stripped unless it clearly preserves leverage.

The detailed upstream inventories that informed these decisions are preserved in archive snapshots and in `distilled/DESIGN.md` where they still matter as rationale.

---

## Two Separate Concerns

### 1. `gsdd init` — Project Bootstrap (per-project)

`gsdd init` bootstraps a project in place: it creates `.planning/`, copies the project-local templates, and generates the runtime entry surfaces the selected tools need.

Current stripped contract:
- Always generate the portable `.agents/skills/gsdd-*/SKILL.md` surface
- In TTY environments, guide runtime selection interactively instead of requiring users to know `--tools ...` values up front
- Ask separately whether to install the root `AGENTS.md` governance block, with explicit explanation of why it helps and why it may feel invasive
- Treat that same portable skill surface as the primary Codex CLI integration path
- Optionally generate vendor-native adapters such as `.claude/skills/gsdd-*/SKILL.md` or a bounded root `AGENTS.md` block when a runtime benefits from extra native surfaces
- Keep the source workflows plain markdown and agent-agnostic
- Strip converter-style frontmatter rewriting, statusline/hooks, and other runtime-specific ceremony from the portable source

> [!IMPORTANT]
> **Pitfall: Don't build the converter.** GSD's install.js spends significant code converting Claude-specific frontmatter to OpenCode/Gemini format. GSDD writes agent-agnostic markdown from the start, so adapters are generated rather than converted.

### 2. `/gsdd:new-project` — Project Initialization (workflow)

`/gsdd:new-project` is the workflow that initializes project intent and planning state inside an already-bootstrapped repo.

Durable contract:
- gather project context deeply enough to write a real spec, not a shallow scaffold
- handle brownfield projects by delegating codebase mapping when needed
- write `SPEC.md` and `ROADMAP.md`
- keep requirements in `SPEC.md` rather than splitting them into a second durable requirements file
- use deterministic CLI config for structured preferences such as research depth or tool generation choices

---

## Research Decision: Orchestrator/Subagent Research

GSD's research leverage came from parallel specialists writing to files instead of polluting the lead agent's context window. GSDD keeps that pattern.

Durable rule:
- research can use specialist delegates writing to `.planning/research/*`
- the orchestrator should integrate summaries, not raw subagent transcripts
- shared state should flow through files, not by giving every subagent the full conversation history

Deeper evidence and vendor/tool comparisons live in `distilled/DESIGN.md`.

---

## Long-Term Lifecycle: Milestones (Full Support) — GSDD Design

> GSD uses `PROJECT.md` + `REQUIREMENTS.md` + `STATE.md` + `.gsd-planning/`. GSDD simplifies this to `SPEC.md` + `ROADMAP.md` + `.planning/`.

### The Lifecycle

```
gsdd init           → bootstrap project (.planning/ + skills/adapters)
/gsdd:new-project   → Orchestrator generates SPEC.md + ROADMAP.md (v1.0 with phases 1-N)
/gsdd:plan 1        → implemented portable workflow + native-capable checker paths for Claude/OpenCode/Codex
/gsdd:execute 1     → implemented portable workflow; current contract keeps git strategy advisory and repo-convention-first
/gsdd:verify 1      → implemented portable workflow; phase verification remains separate from milestone audit
  ... repeat for each phase ...
  ... repeat lifecycle for next milestone (milestone-close and milestone-open are deferred future extensions — see I20 decision below) ...
```

### Key Files

| File | Purpose | Scope | Staleness risk |
|------|---------|-------|----------------|
| `SPEC.md` | What we are building, why, and the durable architecture rules | Project lifetime | Medium — review at milestone boundaries |
| `ROADMAP.md` | Current milestone's phases + status | Per-milestone — archived when complete | Low — actively maintained |
| `phases/N-name/PLAN.md` | Tasks for one phase | Per-phase | Low — consumed and done |
| `phases/N-name/SUMMARY.md` | What was accomplished | Per-phase | None — immutable after creation |
| `milestones/vX.Y-ROADMAP.md` | Archived milestone roadmap | Per-milestone (archived) | None — historical record |
| `config.json` | Workflow preferences | Project lifetime | None — rarely changes |
| `generation-manifest.json` | SHA-256 hashes of installed templates/roles at init/update time | Project lifetime | None — regenerated on `gsdd update --templates` |
| `codebase/STACK.md` etc. | Codebase snapshot (tech, arch, conventions, concerns) | Per-mapping run — high staleness risk for active projects. Use `/gsdd:map-codebase` to refresh deliberately. | High |

`ROADMAP.md` stays intentionally light: phases, checkboxes, and status. No REQ-ID traceability tables, no duplicate state files, no progress-percentage ceremony.

---

## Agent Integration Strategy (Agent-Agnostic)

### Durable Integration Rules

- Core workflows stay plain markdown and must remain free of vendor-specific APIs.
- Multi-agent support uses adapter generation from a single agent-agnostic source, not converter pipelines from one vendor's format.
- Generated governance and entry surfaces must preserve GSDD discipline in the tool's native UX, but the portable workflow core remains the canonical content.
- Tool capabilities change over time. Keep durable design rules in `SPEC.md`, and keep capability-by-capability evidence or dated comparisons in `distilled/DESIGN.md`.

### Two-Layer Runtime Architecture

- **Roles** in `agents/*.md`: durable contracts defining what an agent is
- **Delegates** in `distilled/templates/delegates/*.md`: thin workflow-scoped wrappers defining what that agent does in a specific step
- `gsdd init` distributes both layers into the project-local runtime surfaces so consumer projects do not depend on this framework repo at execution time

### Capability Tiers

- **Tier A - Portable baseline:** plain markdown workflow content that must remain honest and single-agent-safe even when no runtime can enforce true subagent orchestration
- **Tier B - Native capable path:** a runtime/adapter surface that can actually own planner/checker isolation, loop state, and typed handoff execution
- **Tier C - Governance-only surfaces:** adapter/governance files that can steer behavior but cannot themselves prove orchestration semantics

I17 can only close when the selected Tier B validation target(s) prove the distinct plan-check loop in real runtime behavior. Tier A may document the contract, but must not claim parity by itself.

### Runtime Discovery vs Governance

- Runtime workflow discovery and generated adapter artifacts are separate concerns. A runtime may be skills-native even when the only generated artifact for that tool is a governance-only `AGENTS.md` block.
- `AGENTS.md` and `.codex/AGENTS.md` are not skills. They are governance surfaces and must not be described as equivalent to `SKILL.md`.
- For Cursor, Copilot, and Gemini, the root `AGENTS.md` block is optional governance layered on top of native `.agents/skills/` discovery. Do not describe it as the reason those runtimes can invoke GSDD workflows.
- Workflow surface classification must follow mutability, not the human label of the workflow. A planner/verifier/auditor that persists artifacts cannot be emitted as a read-only planning lane.
- `bin/gsdd.mjs` is the CLI composition root: it owns constants, adapter registry wiring, command registration, and exports. Vendor-specific rendering and prompt text live in adapter modules.
- Internal downstream prompt/template material lives under `.planning/templates/**`. Workflow-to-workflow references target the portable `.agents/skills/gsdd-*/SKILL.md` surface, while internal sub-agent/template references target `.planning/templates/**`.

### Delegation Model

GSDD currently favors the orchestrator/subagent model:
- use bounded specialist delegates for research, mapping, and other context-heavy work
- return summaries upward and write durable artifacts to disk
- enforce capability gates, loop guards, and file-based coordination

The flatter multi-agent team model is still a future design target for heavier execution orchestration and remains subject to later audit.

### Product Horizon

This is the broad product direction, not the live queue:
- keep merged-main truth, local truth, and durable product truth clearly separated so status does not drift across `TODO.md`, `gaps.md`, and `SPEC.md`
- finish the remaining honest-kernel work before expanding surface area: milestone lifecycle decision remains the last open product question (I4 CLOSED, I21 CLOSED)
- keep adapter generation improving without polluting the portable core
- `complete-milestone`, `new-milestone`, and `plan-milestone-gaps` workflows exist as SKILL.md files (PR #54) and are partially implemented — they have not been fully validated against live consumer projects. Do not present them as fully shipped or claim parity with the core plan/execute/verify loop until validated.
- expand native adapter support only where it materially improves UX and can be validated honestly
- preserve staleness handling and optional research/delegation enhancements
- control-plane now includes `gsdd health` for workspace integrity diagnostics (D20); keep further expansion conservative
- OWASP authorization matrix (D21): optional `.planning/AUTH_MATRIX.md` artifact with OWASP pivot format; integration checker Step 4a consumes it for cell-by-cell auth verification; backwards compatible (existence-gated)

The active priority order lives in `.internal-research/TODO.md`, and unresolved design blockers live in `.internal-research/gaps.md`.

### Parked

`codebase-context` integration remains optional and parked until the extra indexing/setup friction clearly earns its keep.

---


## Principles (Product-Level)

1. **Less is more** — Every file, command, and step must earn its place
2. **Agent-agnostic** — Plain markdown, no vendor APIs in core workflows
3. **Same outcome, fewer knobs** — init → plan → execute → verify is how GSD works and it's proven. OpenSpec uses a different model (change-based: explore → new → apply → archive). LeanSpec has no rigid workflow at all. GSDD keeps GSD's phase loop but strips the ceremony.
4. **Framework source separate from project runtime state** - framework sources stay in the repo/install surface; project truth lives in `.planning/`, and generated runtime entry surfaces live in `.agents/skills/` plus optional adapters.
5. **Subagent spawning is core** — GSD relies on the Orchestrator/Subagent pattern. 2026 SOTA research (Anthropic Agent Teams, AI21 Maestro) proves that parallel sub-agents are mandatory for preventing context drift and reducing long-term token waste via "Shared State, Not Shared Context". GSDD explicitly adopts this.
6. **Slash commands are the interface** — Users trigger workflows via commands, not by manually instructing the agent
7. **Staleness is real** — Planning files become stale. Every resume must check recency. *(LeanSpec addresses this by keeping specs under 2,000 tokens each — so they're easy to refresh. GSDD should have a staleness detection mechanism, threshold TBD.)*
8. **Milestones from day one** — Long-term lifecycle is not an afterthought
9. **Optional power-ups, not dependencies** — Codebase-context MCP and vendor-specific hooks are optional enhancements. Core GSDD works with just markdown files + subagent workflows.
10. **For any developer** — GSDD works for solo devs, pairs, and teams. `.planning/` state is human-readable and shareable across agents and humans.
11. **Generators, not converters** — Multi-agent support uses the adapter generator pattern (proven by OpenSpec across 24 tools). Same source → per-tool output. Never convert lossy formats.

> Internal-workflow principles (research mandates, context budget vs thoroughness, adopt-don't-reinvent) live in root `AGENTS.md`.
