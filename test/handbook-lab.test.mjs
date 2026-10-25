import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const handbook = JSON.parse(await readFile(new URL('../data/handbook.json', import.meta.url), 'utf8'));
const example = handbook.chapters.find(c => c.id === 'agents').sections.find(s => s.id === 'local-lab').blocks
  .find(b => b.type === 'code' && b.text.en.startsWith('node --input-type=module'));
const script = example.text.en.match(/^node --input-type=module <<'JS'\n([\s\S]*)\nJS$/)?.[1];
const base = 'https://harzva.github.io/awesome-bot/';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function fixture(change = () => {}) {
  const directory = await mkdtemp(join(tmpdir(), 'ab-lab-'));
  const fleet = { schema: 'openbot.fleet/1', mode: 'config', bots: [{ id: 'status-report-writer', toolsEnabled: false, containerEnabled: false, messages: [], files: [], channels: {}, memory: { profile: '', journal: [] }, summary: null }], shared: { skills: [], files: [] } };
  const bytes = Buffer.from(JSON.stringify(fleet) + '\n');
  const card = { schema: 'awesome.bot.agent/1', id: 'awesome/status-report-writer', locale: 'en', templateVersion: '1.0.0', contentRevision: 'test-snapshot', configuration: { format: 'openbot.fleet/1', locale: 'en', url: base + 'exports/en/status-report-writer.fleet.json', bytes: bytes.length, sha256: digest(bytes), grantsTools: false, grantsContainer: false, includesAccountsOrMemory: false, importRequiresHostConfirmation: true } };
  const index = { schema: 'awesome.bot.agent-index/1', locale: 'en', contentRevision: 'test-snapshot', count: 1, entries: [{ id: card.id, templateVersion: card.templateVersion, json: base + 'agents/en/status-report-writer.json' }] };
  const discovery = { schema: 'awesome.bot.agent-discovery/1', contentRevision: 'test-snapshot', configurationFormat: 'openbot.fleet/1', languages: [{ locale: 'en', count: 1, url: base + 'agents/en/index.json' }] };
  const data = { fleet, bytes, card, index, discovery };
  change(data);
  const files = { 'agents/index.json': JSON.stringify(discovery), 'agents/en/index.json': JSON.stringify(index), 'agents/en/status-report-writer.json': JSON.stringify(card), 'exports/en/status-report-writer.fleet.json': data.bytes };
  for (const [path, content] of Object.entries(files)) { const file = join(directory, 'dist/site', path); await mkdir(dirname(file), { recursive: true }); await writeFile(file, content); }
  return { directory, files };
}
const run = directory => spawnSync(process.execPath, ['--input-type=module'], { cwd: directory, input: script, encoding: 'utf8', timeout: 10000 });

test('published bilingual lab executes its success and negative example without changing snapshot bytes', async () => {
  assert.ok(script, 'documented shell block contains a runnable Node program');
  assert.equal(example.text.zh, example.text.en, 'both languages execute the same program');
  const { directory, files } = await fixture();
  try {
    const result = run(directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'PASS original snapshot\nPASS altered copy rejected\n');
    for (const [path, bytes] of Object.entries(files)) assert.equal(digest(await readFile(join(directory, 'dist/site', path))), digest(bytes), path);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('documented lab rejects mixed revisions, wrong locale, altered bytes, foreign URLs and enabled tools', async () => {
  const cases = [
    ['mixed revision', d => { d.index.contentRevision = 'other-snapshot'; }],
    ['wrong locale', d => { d.card.locale = 'zh'; }],
    ['changed bytes', d => { d.bytes = Buffer.concat([d.bytes, Buffer.from(' ')]); }],
    ['foreign URL', d => { d.card.configuration.url = 'https://example.invalid/config.json'; }],
    ['enabled tools with matching digest', d => { d.fleet.bots[0].toolsEnabled = true; d.bytes = Buffer.from(JSON.stringify(d.fleet)); d.card.configuration.bytes = d.bytes.length; d.card.configuration.sha256 = digest(d.bytes); }]
  ];
  for (const [name, change] of cases) {
    const { directory } = await fixture(change);
    try { const result = run(directory); assert.equal(result.status, 1, name); assert.doesNotMatch(result.stdout, /PASS/, name); }
    finally { await rm(directory, { recursive: true, force: true }); }
  }
  const { directory } = await fixture();
  try {
    const config = join(directory, 'dist/site/exports/en/status-report-writer.fleet.json');
    const outside = join(directory, 'outside.json');
    await writeFile(outside, await readFile(config)); await rm(config); await symlink(outside, config);
    const result = run(directory);
    assert.equal(result.status, 1); assert.match(result.stderr, /symlink escaped site root/); assert.doesNotMatch(result.stdout, /PASS/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
