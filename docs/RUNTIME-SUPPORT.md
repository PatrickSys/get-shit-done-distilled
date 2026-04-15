# Runtime Support Matrix

Workspine is designed as a portable multi-runtime delivery framework, but the proof bar is not the same for every runtime today.

This matrix is the release-floor truth surface.

## Support tiers

### Directly validated

The workflow contract has direct repo proof for these runtimes:

- **Claude Code**
- **Codex CLI**
- **OpenCode**

These are the strongest public runtime claims.

### Qualified support

These runtimes use the same portable workflow surfaces, but this release does not claim equal runtime proof or equal ergonomics:

- **Cursor**
- **GitHub Copilot**
- **Gemini CLI**

### Fallback / manual use

Any tool that can read the generated markdown workflows can still use the framework manually, but that is outside the current native-proof story.

## Current runtime surfaces

| Runtime | Current claim | Entry surface | Notes |
| --- | --- | --- | --- |
| Claude Code | Directly validated | `.claude/skills/`, `.claude/commands/`, `.claude/agents/` | Richest native adapter surface |
| OpenCode | Directly validated | `.opencode/commands/`, `.opencode/agents/` | Native command and checker path |
| Codex CLI | Directly validated | `.agents/skills/gsdd-*` plus `.codex/agents/gsdd-plan-checker.toml` | Portable skill entry, native checker adapter |
| Cursor | Qualified support | `.agents/skills/gsdd-*` | Skills-native path; current release does not claim parity validation |
| GitHub Copilot | Qualified support | `.agents/skills/gsdd-*` | Skills-native path; current release does not claim parity validation |
| Gemini CLI | Qualified support | `.agents/skills/gsdd-*` | Skills-native path; governance is optional, not the discovery mechanism |

## What stays portable

The portable invariant for this release is the workflow contract:

- planning
- checking and revision loops
- execution discipline
- verification
- handoff and durable repo artifacts

## What does not stay equal yet

This release does **not** claim that every runtime has:

- the same native adapter richness
- the same invocation ergonomics
- the same validation depth
- the same checker/orchestration mechanics

Portable contract does not mean equal UX everywhere.

## Proof references

- `README.md`
- `docs/BROWNFIELD-PROOF.md`
- `docs/proof/consumer-node-cli/README.md`
- `docs/VERIFICATION-DISCIPLINE.md`
