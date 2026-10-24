import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, readCatalogue, engineModule } from '../scripts/engine.mjs';
import { importedSources, hydrateImportedRole, adaptedPersona } from '../scripts/imported-roles.mjs';
import { loadEnglish, localizePlan } from '../scripts/locales.mjs';
import { loadScenarios } from '../scripts/scenarios.mjs';

test('all 223 source roles retain actual prompt and applicable notices after standard materialization in both languages', async () => {
  const catalogue = await readCatalogue();
  const adapted = catalogue.bots.filter(b => b.implementation === 'third-party-adaptation');
  assert.equal(adapted.length, 223);
  assert.equal(new Set(adapted.map(b => b.id.split('/')[1])).size, adapted.length);
  const english = await loadEnglish(catalogue, await loadScenarios(catalogue));
  const { loadCatalogue } = await engineModule('catalogue');
  const { createLoader } = await engineModule('sources');
  const { buildPlan } = await engineModule('plan');
  const { materialize } = await engineModule('install');
  const registry = await loadCatalogue([resolve(root, 'registry/index.json')]);
  const loader = createLoader(registry);
  for (const bot of adapted) {
    const source = bot.sourceContext;
    const plan = await buildPlan({ id: bot.id, entries: registry.entries, loadManifest: loader, openbotVersion: catalogue.targetOpenBotVersion });
    assert.equal(plan.ok, true, bot.id);
    for (const localized of [plan, localizePlan(plan, english.bots.find(e => e.id === bot.id))]) {
      const result = materialize(localized);
      assert.equal(result.ok, true, bot.id);
      const actual = result.bundle.bots[0];
      assert.ok(actual.persona.includes(source.body), bot.id + ' actual source instructions');
      assert.ok(actual.persona.includes(source.sourceUrl), bot.id + ' source URL');
      if (bot.license === 'MIT') assert.ok(actual.persona.includes(source.source.licenseText), bot.id + ' complete MIT notice');
      assert.ok(actual.persona.length <= 8000);
      assert.equal(actual.toolsEnabled, false);
      assert.equal(actual.containerEnabled, false);
      assert.deepEqual(actual.channels, {});
    }
  }
});

test('missing source evidence and mismatched fixed revision cannot enter a role', async () => {
  const catalogue = await readCatalogue();
  const original = catalogue.bots.find(b => b.implementation === 'third-party-adaptation');
  for (const change of [b => b.provenance.sha256 = '0'.repeat(64), b => b.provenance.revision = '0'.repeat(40), b => b.license = 'Apache-2.0', b => b.provenance.promptImported = false, b => b.provenance.repository = 'other/repository', b => b.provenance.path = 'different/PROFILE.md', b => b.provenance.licenseUrl = 'https://example.com/LICENSE', b => b.provenance.licenseSha256 = '0'.repeat(64)]) {
    const wrong = structuredClone(original); change(wrong);
    await assert.rejects(hydrateImportedRole(wrong), /Invalid role provenance/);
  }
  const wrong = structuredClone(original); wrong.sourceContext.body = 'x'.repeat(8001);
  assert.throws(() => adaptedPersona(wrong), /exceeds host limit/);
});
