import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMarketIndex, marketInstallTarget } from '@deepseek-ai/dsh-plugin-market-index';
import { validatePlugins, createDshIndex, indexUrl } from '../scripts/plugins.mjs';

const copy = value => structuredClone(value);
const both = value => ({ zh: value, en: value });
const fixture = () => ({ schema: 'awesome.bot.plugins/1', updatedAt: '2026-10-26', entries: [{
  id: 'test-plugin', packageName: '@example/test-plugin', version: '0.1.0', revision: 'a'.repeat(40), sha256: 'b'.repeat(64),
  name: both('Test'), summary: both('Test plugin'), format: 'dsh-bundle', license: 'MIT', platforms: ['macOS'],
  capabilities: both(['Read visible messages']), requirements: both(['Explicit host configuration']), limitations: both(['No device test claim']),
  repository: 'https://github.com/example/test-plugin', downloadUrl: 'https://github.com/example/test-plugin/releases/download/v0.1.0/plugin.tgz',
  docsUrl: `https://github.com/example/test-plugin/blob/${'a'.repeat(40)}/README.md`,
  dsh: { engine: '0.2.1-rc.2', publishTimestamp: 1793000000 }, openbot: { status: 'git-adapter-required', note: both('Requires Git adapter') }
}] });

test('DSH official parser produces a commit-pinned Git install specification, never an npm publication', () => {
  const data = validatePlugins(fixture());
  const index = parseMarketIndex(createDshIndex(data), indexUrl);
  const selected = index.plugins[0];
  assert.equal(selected.versions[0].source.type, 'git');
  const spec = marketInstallTarget(selected.name, selected.versions[0]).spec;
  assert.ok(spec.startsWith('git+https://github.com/example/test-plugin.git#'));
  assert.ok(spec.includes('a'.repeat(40)));
});

test('unpublished/unpinned downloads, credentials and incompatible DSH ranges cannot enter the catalogue', () => {
  const mutations = [
    p => { p.revision = 'main'; }, p => { p.sha256 = ''; }, p => { p.downloadUrl = 'javascript:alert(1)'; },
    p => { p.downloadUrl = 'https://github.com/other/repo/releases/download/v1/plugin.tgz'; },
    p => { p.repository = 'https://token@github.com/example/test-plugin'; },
    p => { p.docsUrl = 'https://github.com/example/test-plugin/blob/main/README.md'; },
    p => { p.dsh.engine = 'not-semver'; }, p => { delete p.summary.en; }
  ];
  for (const change of mutations) { const data = fixture(); change(data.entries[0]); assert.throws(() => validatePlugins(data)); }
});

test('desktop packages stay discoverable without claiming standalone DSH tool compatibility', () => {
  const data = fixture(), desktop = copy(data.entries[0]);
  desktop.id = 'desktop-plugin'; desktop.packageName = '@example/desktop'; desktop.format = 'openbot-desktop'; desktop.dsh = null; desktop.openbot.status = 'desktop-host';
  data.entries.push(desktop);
  assert.equal(validatePlugins(data).entries.length, 2);
  assert.equal(createDshIndex(data).plugins.length, 1);
  desktop.dsh = { engine: '*' };
  assert.throws(() => validatePlugins(data));
});

test('duplicate identities and incomplete compatibility information are rejected', () => {
  const data = fixture(); data.entries.push(copy(data.entries[0])); assert.throws(() => validatePlugins(data));
  const bad = fixture(); bad.entries[0].openbot.status = 'installed'; assert.throws(() => validatePlugins(bad));
});
