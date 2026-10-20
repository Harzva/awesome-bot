import test from 'node:test';
import assert from 'node:assert/strict';
import { readCatalogue } from '../scripts/engine.mjs';
import { loadScenarios } from '../scripts/scenarios.mjs';
import { loadEnglish, validateEnglishEntry, validateEnglishScenario, englishPersona, localizePlan, renderEnglishStartGuide } from '../scripts/locales.mjs';

const catalogue = await readCatalogue();
const recipes = await loadScenarios(catalogue);
const english = await loadEnglish(catalogue, recipes);
const original = catalogue.bots.find(bot => bot.id === 'awesome/account-research-specialist');
const translated = english.bots.find(bot => bot.id === original.id);
const fields = ['id', 'name', 'summary', 'mission', 'style', 'boundaries', 'inputs', 'outputs', 'workflow', 'requirements', 'skills', 'welcome', 'quickPrompts', 'example'];
const overlay = () => Object.fromEntries(fields.map(key => [key, structuredClone(translated[key])]));

test('every reviewed role and scenario has complete English content without Chinese fallback', () => {
  assert.equal(english.bots.length, catalogue.bots.length);
  assert.equal(english.scenarios.length, recipes.length);
  for (const bot of english.bots) {
    const authored = Object.fromEntries(fields.filter(key => key !== 'id').map(key => [key, bot[key]]));
    assert.doesNotMatch(JSON.stringify(authored), /\p{Script=Han}/u, bot.id);
    assert.doesNotMatch(englishPersona(bot), /\p{Script=Han}/u, bot.id);
    assert.ok(englishPersona(bot).includes(bot.boundaries));
    assert.match(englishPersona(bot), /do not read or copy another Bot's private memory/);
  }
  assert.doesNotMatch(JSON.stringify(english.scenarios), /\p{Script=Han}/u);
  const guide = renderEnglishStartGuide(english.scenarios);
  assert.doesNotMatch(guide, /\p{Script=Han}/u);
  for (const recipe of english.scenarios) assert.ok(guide.includes(recipe.steps[0].prompt));
});

test('missing translations, changed identities and incomplete role fields are rejected', () => {
  for (const alter of [
    item => { item.name = '中文'; }, item => { item.id = 'awesome/other'; },
    item => { item.inputs.pop(); }, item => { item.skills[0].desc = ''; },
    item => { item.example.prompt = ''; }, item => { item.extra = 'unexpected'; }
  ]) { const value = overlay(); alter(value); assert.throws(() => validateEnglishEntry(value, original), /Invalid English content/); }
});

test('English configuration projection preserves plan identity, permissions and source version', () => {
  const plan = { ok: true, permissions: { tools: true, container: false, screen: false }, bots: [{ templateId: original.id, templateVersion: '1.0.0', name: original.name, persona: 'source', skills: original.skills, avatar: original.avatar }], warnings: [] };
  const result = localizePlan(plan, translated);
  assert.equal(result.bots[0].templateId, original.id);
  assert.equal(result.bots[0].templateVersion, '1.0.0');
  assert.deepEqual(result.permissions, plan.permissions);
  assert.equal(result.bots[0].name, translated.name);
  assert.equal(result.bots[0].persona, englishPersona(translated));
  assert.equal(plan.bots[0].persona, 'source');
  assert.throws(() => localizePlan(plan, { ...translated, id: 'awesome/another' }), /different plan/);
});

test('English scenarios must retain the same Bot order and translate every handoff', () => {
  const original = recipes.find(item => item.id === 'customer-meeting');
  const value = english.scenarios.find(item => item.id === original.id);
  const overlay = { id: value.id, title: value.title, summary: value.summary, inputs: value.inputs, outputs: value.outputs, steps: value.steps.map(({ botId, prompt, handoff }) => ({ botId, prompt, handoff })) };
  for (const change of [item => item.steps.reverse(), item => { item.steps[0].handoff = ''; }, item => item.outputs.pop()]) {
    const bad = structuredClone(overlay); change(bad); assert.throws(() => validateEnglishScenario(bad, original, english.bots), /Invalid English content/);
  }
});
