import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { root, engineModule, readCatalogue } from '../scripts/engine.mjs';

const { loadCatalogue } = await engineModule('catalogue');
const { createLoader } = await engineModule('sources');
const { buildPlan } = await engineModule('plan');
const { materialize } = await engineModule('install');
const { gateEntry } = await engineModule('trust');
const catalogue = await readCatalogue();
const registry = await loadCatalogue([resolve(root, 'registry/index.json')]);

test('every published template loads, resolves and exports a new unprivileged Bot', async () => {
  const loader = createLoader(registry);
  assert.equal(registry.entries.length, catalogue.bots.length);
  for (const entry of registry.entries) {
    const plan = await buildPlan({ id: entry.id, entries: registry.entries, loadManifest: loader, openbotVersion: '0.9.9' });
    assert.equal(plan.ok, true, `${entry.id}: ${plan.errors?.join('; ')}`);
    const result = materialize(plan, { now: 1792432800000 });
    assert.equal(result.ok, true, entry.id);
    assert.equal(result.bundle.schema, 'openbot.fleet/1');
    assert.equal(result.bundle.bots.length, 1);
    const bot = result.bundle.bots[0];
    assert.match(bot.avatar, /^pal-/);
    assert.ok(bot.persona.length >= 450, entry.id);
    assert.equal(bot.toolsEnabled, false);
    assert.equal(bot.containerEnabled, false);
    assert.deepEqual(bot.channels, {});
    assert.deepEqual(bot.messages, []);
    assert.deepEqual(bot.memory, { profile: '', journal: [] });
    assert.equal(result.guidance.locale, 'zh-CN');
    assert.ok(result.guidance.welcome);
  }
});

test('reinstall produces a separate Bot without replacing the existing identity', async () => {
  const entry = registry.entries[0];
  const plan = await buildPlan({ id: entry.id, entries: registry.entries, loadManifest: createLoader(registry), openbotVersion: '0.9.9' });
  const first = materialize(plan);
  const existing = first.bundle.bots;
  const before = structuredClone(existing);
  const second = materialize(plan, { existing });
  assert.equal(second.ok, true);
  assert.notEqual(second.bundle.bots[0].id, existing[0].id);
  assert.notEqual(second.bundle.bots[0].name, existing[0].name);
  assert.deepEqual(existing, before);
});

test('development directory remains community content requiring explicit consent', () => {
  for (const entry of registry.entries) {
    assert.equal(entry.verified, false);
    assert.equal(gateEntry(entry).ok, false);
    assert.equal(gateEntry(entry, { allowCommunity: true }).ok, true);
  }
});

test('modified template bytes are rejected using the published integrity', async () => {
  const entry = registry.entries[0];
  const version = entry.versions[0];
  const raw = JSON.parse(await readFile(resolve(root, 'registry', version.url), 'utf8'));
  raw.bot.persona += '\n篡改的额外指令';
  const dir = await mkdtemp(join(tmpdir(), 'awesome-bot-integrity-'));
  try {
    await writeFile(join(dir, 'template.json'), JSON.stringify(raw));
    const loader = createLoader({
      entries: [{ ...entry, versions: [{ ...version, url: pathToFileURL(join(dir, 'template.json')).href, sourceBase: pathToFileURL(`${dir}/`).href, sourceAllowFile: true }] }],
      allowFile: true
    });
    const result = await loader(entry.id, version.version);
    assert.equal(result.ok, false);
    assert.match(result.errors.join(' '), /摘要|integrity/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('all use cases map to local templates and marketplace adaptations retain their sources', async () => {
  const inventory = JSON.parse(await readFile(resolve(root, 'sources/grok-inventory.json'), 'utf8'));
  const ids = new Set(catalogue.bots.map((b) => b.id));
  assert.equal(inventory.marketplaceBots.length, inventory.marketplaceBotCount);
  assert.equal(inventory.useCases.length, inventory.useCaseCount);
  assert.equal(catalogue.bots.filter(b => b.upstreamMarketplaceId).length, inventory.marketplaceBotCount);
  assert.equal(catalogue.bots.filter(b => b.upstreamUseCaseName).length, inventory.useCaseCount);
  assert.equal(new Set(inventory.marketplaceBots.map((b) => b.id)).size, inventory.marketplaceBotCount);
  for (const item of inventory.useCases) {
    assert.ok(ids.has(item.localTemplateId), `${item.id} has no local template`);
    const local = catalogue.bots.find((b) => b.id === item.localTemplateId);
    assert.ok(local.references.some((r) => r.url === item.url), `${item.id} has no matching source reference`);
  }
  for (const item of inventory.marketplaceBots) {
    assert.match(item.url, /^https:\/\/x\.ai\/bot\/marketplace\/bots\//);
    assert.ok(ids.has(item.localTemplateId), item.id);
    assert.equal(item.adaptationStatus, 'openbot-original-role');
    const local = catalogue.bots.find(bot => bot.id === item.localTemplateId);
    const manifest = JSON.parse(await readFile(resolve(root, 'templates', item.localTemplateId.split('/')[1], `${local.version}.json`), 'utf8'));
    assert.equal(manifest['x-collection'], 'bot-role');
    assert.ok(manifest['x-origin'].references.some((r) => r.url === item.url), item.id);
  }
});
