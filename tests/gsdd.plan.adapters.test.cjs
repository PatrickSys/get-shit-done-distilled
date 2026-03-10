/**
 * GSDD CLI Tests - Specialized plan adapter surfaces
 */

const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const {
  cleanup,
  createTempProject,
  loadGsdd,
  setNonInteractiveStdin,
} = require('./gsdd.helpers.cjs');

describe('specialized plan adapter surfaces', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = createTempProject();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('claude plan skill is the primary native surface and stays out of forked subagent mode', async () => {
    const restoreStdin = setNonInteractiveStdin();
    try {
      const gsdd = await loadGsdd(tmpDir);
      await gsdd.cmdInit('--tools', 'claude');
    } finally {
      restoreStdin();
    }

    const claudePlanSkill = fs.readFileSync(
      path.join(tmpDir, '.claude', 'skills', 'gsdd-plan', 'SKILL.md'),
      'utf-8'
    );
    const claudeNewProjectSkill = fs.readFileSync(
      path.join(tmpDir, '.claude', 'skills', 'gsdd-new-project', 'SKILL.md'),
      'utf-8'
    );
    const claudePlanCommand = fs.readFileSync(
      path.join(tmpDir, '.claude', 'commands', 'gsdd-plan.md'),
      'utf-8'
    );

    assert.match(claudePlanSkill, /^name: gsdd-plan/m);
    assert.match(claudePlanSkill, /canonical Claude-native entry surface/);
    assert.match(claudePlanSkill, /Do NOT fork this skill into a subagent/);
    assert.match(claudePlanSkill, /not as a stop signal for this Claude-native adapter path/);
    assert.match(claudePlanSkill, /Maximum 3 checker cycles total/);
    assert.match(claudePlanSkill, /"status": "passed"/);
    assert.match(claudePlanSkill, /Status must be either "passed" or "issues_found"\./);
    assert.doesNotMatch(claudePlanSkill, /^context: fork$/m);
    assert.doesNotMatch(claudePlanSkill, /^agent:/m);

    assert.match(claudeNewProjectSkill, /^context: fork$/m);
    assert.match(claudeNewProjectSkill, /^agent: Plan$/m);

    assert.match(claudePlanCommand, /Compatibility alias/);
    assert.match(claudePlanCommand, /\.claude\/skills\/gsdd-plan\/SKILL\.md/);
    assert.doesNotMatch(claudePlanCommand, /Maximum 3 checker cycles total/);
  });

  test('opencode plan command is specialized and checker agent is hidden', async () => {
    const restoreStdin = setNonInteractiveStdin();
    try {
      const gsdd = await loadGsdd(tmpDir);
      await gsdd.cmdInit('--tools', 'opencode');
    } finally {
      restoreStdin();
    }

    const opencodePlanCommand = fs.readFileSync(
      path.join(tmpDir, '.opencode', 'commands', 'gsdd-plan.md'),
      'utf-8'
    );
    const opencodeExecuteCommand = fs.readFileSync(
      path.join(tmpDir, '.opencode', 'commands', 'gsdd-execute.md'),
      'utf-8'
    );
    const opencodePlanChecker = fs.readFileSync(
      path.join(tmpDir, '.opencode', 'agents', 'gsdd-plan-checker.md'),
      'utf-8'
    );

    assert.match(opencodePlanCommand, /^subtask: false$/m);
    assert.match(opencodePlanCommand, /canonical OpenCode-native entry surface/);
    assert.match(opencodePlanCommand, /hidden `gsdd-plan-checker` subagent/);
    assert.match(opencodePlanCommand, /not as a stop signal for this OpenCode-native adapter path/);
    assert.match(opencodePlanCommand, /Maximum 3 checker cycles total/);
    assert.match(opencodePlanCommand, /"status": "passed"/);
    assert.match(opencodePlanCommand, /Status must be either "passed" or "issues_found"\./);

    assert.doesNotMatch(opencodeExecuteCommand, /^subtask: false$/m);

    assert.match(opencodePlanChecker, /^mode: subagent$/m);
    assert.match(opencodePlanChecker, /^hidden: true$/m);
    assert.match(opencodePlanChecker, /Return JSON only/);
  });

  test('plan-checker delegate includes verify quality sub-checks under task_completeness', async () => {
    const restoreStdin = setNonInteractiveStdin();
    try {
      const gsdd = await loadGsdd(tmpDir);
      await gsdd.cmdInit('--tools', 'claude');
    } finally {
      restoreStdin();
    }

    const claudePlanChecker = fs.readFileSync(
      path.join(tmpDir, '.claude', 'agents', 'gsdd-plan-checker.md'),
      'utf-8'
    );
    const opencodeTmpDir = createTempProject();
    const restoreStdin2 = setNonInteractiveStdin();
    try {
      const gsdd2 = await loadGsdd(opencodeTmpDir);
      await gsdd2.cmdInit('--tools', 'opencode');
    } finally {
      restoreStdin2();
    }
    const opencodePlanChecker = fs.readFileSync(
      path.join(opencodeTmpDir, '.opencode', 'agents', 'gsdd-plan-checker.md'),
      'utf-8'
    );
    cleanup(opencodeTmpDir);

    // Both adapters render from the same delegate source - verify quality sub-checks must be present
    for (const [label, content] of [['claude', claudePlanChecker], ['opencode', opencodePlanChecker]]) {
      assert.match(content, /Runnable\?/, `${label} checker must include Runnable sub-check`);
      assert.match(content, /Fast\?/, `${label} checker must include Fast sub-check`);
      assert.match(content, /Ordered\?/, `${label} checker must include Ordered sub-check`);
      assert.match(content, /runnable command/, `${label} checker must reference runnable commands`);
      assert.match(content, /watch-mode|watchAll/i, `${label} checker must flag watch-mode`);
    }

    // DRAFT notice must be removed
    assert.doesNotMatch(claudePlanChecker, /DRAFT PAYLOAD/i, 'claude checker must not have DRAFT notice');
    assert.doesNotMatch(opencodePlanChecker, /DRAFT PAYLOAD/i, 'opencode checker must not have DRAFT notice');
  });
});
