import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { readCatalogue, root } from '../scripts/engine.mjs';
import { loadScenarios, validateScenarios, renderStartGuide } from '../scripts/scenarios.mjs';

const catalogue = await readCatalogue();
const original = JSON.parse(await readFile(resolve(root, 'data/scenarios/customer-meeting.json'), 'utf8'));

test('scenario validation rejects broken references, duplicate identities and malformed instructions', () => {
  const invalid = [
    [],
    [original, structuredClone(original)],
    [{ ...original, id: '../private' }],
    [{ ...original, id: 'all' }],
    [{ ...original, title: '' }],
    [{ ...original, outputs: [] }],
    [{ ...original, steps: [] }],
    [{ ...original, steps: Array(4).fill(original.steps[0]) }],
    [{ ...original, steps: [original.steps[0], original.steps[0]] }],
    [{ ...original, steps: [{ ...original.steps[0], botId: 'awesome/missing-bot' }] }],
    [{ ...original, steps: [{ ...original.steps[0], prompt: ' ' }] }],
    [{ ...original, steps: [{ ...original.steps[0], handoff: '' }] }],
    [{ ...original, credentials: 'unexpected' }],
    [{ ...original, steps: [{ ...original.steps[0], execute: true }] }]
  ];
  for (const value of invalid) assert.throws(() => validateScenarios(value, catalogue), /Invalid scenario/);
  const valid = validateScenarios([original], catalogue)[0];
  assert.deepEqual(valid.botIds, original.steps.map(step => step.botId));
  assert.deepEqual(valid.steps.map(step => step.botName), ['客户研究专员', '销售会前准备员']);
});

test('scenario loading rejects mismatched filenames and unexpected non-JSON entries', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'awesome-scenario-'));
  try {
    await writeFile(join(directory, 'wrong-name.json'), JSON.stringify(original));
    await assert.rejects(loadScenarios(catalogue, { directory }), /filename must match ID/);
    await rm(join(directory, 'wrong-name.json'));
    await writeFile(join(directory, original.id + '.json'), JSON.stringify(original));
    assert.equal((await loadScenarios(catalogue, { directory })).length, 1);
    await writeFile(join(directory, 'notes.txt'), 'not a scenario');
    await assert.rejects(loadScenarios(catalogue, { directory }), /unexpected path/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('the generated starter guide reuses all five recipes and their exact first prompts deterministically', async () => {
  const scenarios = await loadScenarios(catalogue);
  assert.equal(scenarios.length, 5);
  const first = renderStartGuide(scenarios);
  assert.equal(renderStartGuide(await loadScenarios(catalogue)), first);
  assert.equal(await readFile(resolve(root, 'START_HERE.md'), 'utf8'), first);
  for (const scenario of scenarios) {
    assert.ok(first.includes(`?scenario=${scenario.id}`));
    assert.ok(first.includes(`exports/scenario-${scenario.id}.fleet.json`));
    assert.ok(first.includes(scenario.steps[0].prompt));
  }
  assert.match(first, /不会自动编排或执行/);
  assert.match(first, /第一个 Bot 选为主 Bot/);
  assert.match(first, /尚未逐项完成真实账号任务认证/);
});
