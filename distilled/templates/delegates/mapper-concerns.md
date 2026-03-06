**Role contract:** Read `.planning/templates/roles/mapper.md` before starting. Follow its algorithm, quality guarantees, and anti-patterns.

Map the technical debt, security concerns, and risks in this codebase.

**Security check first (hard stop):** Follow the Hard stop directive in `.planning/templates/roles/mapper.md` — grep for secrets before writing anything. If found: STOP and report to Orchestrator immediately.

If no secrets found, write CONCERNS.md to `.planning/codebase/` using the template at `.planning/templates/codebase/concerns.md`.

Include:
- Known bugs or fragile areas (with file references where possible)
- Security vulnerabilities or missing validations
- Performance bottlenecks
- Missing test coverage for critical paths
- Deprecated or end-of-life dependencies

<quality_gate>
- [ ] Secret scan completed and result reported
- [ ] Concerns are specific (file references, not vague "some places")
- [ ] Severity assigned per concern: critical / moderate / minor
- [ ] Deprecated dependencies listed with EOL dates if known
</quality_gate>

Write to: `.planning/codebase/CONCERNS.md`
Return: 3-5 sentence summary to the Orchestrator when done. If secrets found, STOP and report immediately.
Guardrails: Max Agent Hops = 3. Hard stop on secrets.
