import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function renderCodexPlanChecker(delegateContent, modelId = null) {
  const modelLine = modelId ? `model = "${modelId}"\n` : '';
  return `name = "gsdd-plan-checker"
description = "Fresh-context plan checker for GSDD plan drafts. Review-only; never edits plans directly."
sandbox_mode = "read-only"
model_reasoning_effort = "high"
${modelLine}
developer_instructions = """
${delegateContent.trim()}
"""
`;
}

function renderCodexPlanSkill(workflowContent) {
  return `---
name: gsdd-plan
description: Codex-native phase planning with fresh-context plan checking for GSDD
---

${workflowContent}

## Codex-Native Plan Checking

This section overrides the portable plan-check description above when running inside Codex CLI.

Codex CLI has a native \`gsdd-plan-checker\` subagent defined in \`.codex/agents/gsdd-plan-checker.toml\`.
Use Codex's native subagent spawning to invoke it in a fresh context.

### Execution Flow

1. Read \`.planning/SPEC.md\`, \`.planning/ROADMAP.md\`, \`.planning/config.json\`, relevant phase research, and any existing phase plan files.
2. Resolve the target phase. If no phase is provided, choose the first roadmap phase that is not complete.
3. Produce the initial phase plan according to the portable plan workflow above.
4. If \`.planning/config.json\` has \`workflow.planCheck: false\`, stop after planner self-check and explicitly report reduced assurance.
5. If \`workflow.planCheck: true\`, spawn the \`gsdd-plan-checker\` subagent with fresh context.
6. Pass only explicit inputs to the checker:
   - target phase goal and requirement IDs
   - relevant locked decisions / deferred items from \`.planning/SPEC.md\`
   - relevant phase research file(s)
   - produced \`.planning/phases/*-PLAN.md\` file(s)
7. Require the checker to return a single JSON object with this shape:
   \`\`\`json
   {
     "status": "passed",
     "summary": "One sentence overall assessment",
     "issues": [
       {
         "dimension": "requirement_coverage | task_completeness | dependency_correctness | key_link_completeness | scope_sanity | must_have_quality | context_compliance",
         "severity": "blocker | warning",
         "description": "What is wrong",
         "plan": "01-PLAN",
         "task": "1-02",
         "fix_hint": "Specific revision instruction"
       }
     ]
   }
   \`\`\`
   Status must be either "passed" or "issues_found".
8. If the checker returns \`passed\`, finish and summarize.
9. If the checker returns \`issues_found\`, revise the existing plan files only where needed, then run the checker again.
10. Maximum 3 checker cycles total. If blockers remain after cycle 3, stop and escalate to the user instead of pretending the plan is ready.

### Orchestration Summary

Return a concise orchestration summary:
- target phase
- whether native plan checking ran
- checker cycle count
- final result: passed | reduced_assurance | escalated

Never return raw checker JSON without summarizing it.
`;
}

function createCodexAdapter({
  cwd,
  workflows,
  renderSkillContent,
  getWorkflowContent,
  getDelegateContent,
  getRuntimeModelOverride,
  loadProjectModelConfig,
}) {
  const agentsDir = join(cwd, '.codex', 'agents');
  const skillsDir = join(cwd, '.agents', 'skills');

  return {
    id: 'codex',
    name: 'codex',
    kind: 'native_capable',
    detect() {
      return existsSync(join(cwd, '.codex'));
    },
    isInstalled() {
      return existsSync(agentsDir);
    },
    generate() {
      const config = loadProjectModelConfig(cwd);
      const modelId = getRuntimeModelOverride(config, 'codex', 'plan-checker');

      mkdirSync(agentsDir, { recursive: true });
      writeFileSync(
        join(agentsDir, 'gsdd-plan-checker.toml'),
        renderCodexPlanChecker(getDelegateContent('plan-checker.md'), modelId)
      );

      const planWorkflowContent = getWorkflowContent('plan.md');
      const planSkillDir = join(skillsDir, 'gsdd-plan');
      mkdirSync(planSkillDir, { recursive: true });
      writeFileSync(
        join(planSkillDir, 'SKILL.md'),
        renderCodexPlanSkill(planWorkflowContent)
      );
    },
    summary(action) {
      return `${action} Codex CLI native agents (.codex/agents/gsdd-*.toml) and overrode gsdd-plan skill with Codex-native orchestration`;
    },
  };
}

export { createCodexAdapter };
