import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { root, readCatalogue } from '../scripts/engine.mjs';

test('the static market offers complete, deterministic and unprivileged downloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'awesome-site-'));
  const output = join(directory, 'site');
  const build = () => spawnSync(process.execPath, [resolve(root, 'scripts/build-site.mjs'), `--out=${output}`], { cwd: root, encoding: 'utf8' });
  try {
    const first = build();
    assert.equal(first.status, 0, first.stderr);
    const bytes = await readFile(join(output, 'catalogue.json'), 'utf8');
    const site = JSON.parse(bytes);
    const catalogue = await readCatalogue();
    const counts = { roles: catalogue.bots.filter(b => b.collection === 'bot-role').length, workflows: catalogue.bots.filter(b => b.collection === 'task-workflow').length, total: catalogue.bots.length };
    assert.deepEqual(site.counts, counts);
    assert.equal(site.entries.length, counts.total);
    for (const entry of site.entries) {
      assert.match(entry.downloadUrl, /^exports\/[a-z0-9-]+\.fleet\.json$/);
      assert.match(entry.manifestUrl, /^templates\/[a-z0-9-]+\/\d+\.\d+\.\d+\.json$/);
      assert.match(entry.editUrl, /^https:\/\/github\.com\/Harzva\/awesome-bot\/edit\/main\/data\/entries\//);
      assert.equal(entry.verification.realTask, 'not-tested');
      const manifest = JSON.parse(await readFile(join(output, entry.manifestUrl), 'utf8'));
      assert.equal(manifest.id, entry.id);
      const fleet = JSON.parse(await readFile(join(output, entry.downloadUrl), 'utf8'));
      assert.equal(fleet.schema, 'openbot.fleet/1');
      assert.equal(fleet.bots.length, 1);
      assert.equal(fleet.bots[0].toolsEnabled, false);
      assert.equal(fleet.bots[0].containerEnabled, false);
      assert.deepEqual(fleet.bots[0].channels, {});
      assert.deepEqual(fleet.bots[0].messages, []);
      assert.deepEqual(fleet.bots[0].memory, { profile: '', journal: [] });
    }
    for (const [collection, expected] of [['roles', counts.roles], ['workflows', counts.workflows], ['all', counts.total]]) {
      if (expected > 200) { assert.equal(site.downloads[collection], null); continue; }
      const fleet = JSON.parse(await readFile(join(output, site.downloads[collection]), 'utf8'));
      assert.equal(fleet.bots.length, expected);
      assert.equal(new Set(fleet.bots.map(bot => bot.id)).size, expected);
    }
    const second = build();
    assert.equal(second.status, 0, second.stderr);
    assert.equal(await readFile(join(output, 'catalogue.json'), 'utf8'), bytes);
    assert.ok(!bytes.includes('/Users/'));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('community growth beyond one Fleet package keeps the market and individual downloads usable', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'awesome-site-growth-'));
  const fixture = join(directory, 'repository');
  try {
    await cp(root, fixture, { recursive: true, filter: file => !['.git', 'dist', 'out', '.cache', 'node_modules'].some(name => file === resolve(root, name)) });
    const catalogue = await readCatalogue();
    const needed = Math.max(1, 201 - catalogue.bots.length);
    const source = JSON.parse(await readFile(join(fixture, 'data/entries/chief-of-staff.json'), 'utf8'));
    for (let index = 0; index < needed; index++) {
      const entry = { ...structuredClone(source), id: `awesome/community-scale-${index}`, name: `社区增长示例 ${index}`, collection: 'bot-role', author: { name: 'Community fixture' }, references: [{ label: 'Original community role', url: 'https://github.com/Harzva/awesome-bot' }] };
      delete entry.upstreamUseCaseName;
      delete entry.upstreamMarketplaceId;
      await writeFile(join(fixture, `data/entries/community-scale-${index}.json`), JSON.stringify(entry));
    }
    for (const args of [['scripts/build.mjs'], ['scripts/build-site.mjs']]) {
      const result = spawnSync(process.execPath, args, { cwd: fixture, env: { PATH: process.env.PATH }, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
    }
    const site = JSON.parse(await readFile(join(fixture, 'dist/site/catalogue.json'), 'utf8'));
    assert.equal(site.counts.total, catalogue.bots.length + needed);
    assert.equal(site.downloads.all, null);
    assert.equal(site.bulkLimit, 200);
    const entry = site.entries.find(item => item.id === 'awesome/community-scale-0');
    const single = JSON.parse(await readFile(join(fixture, 'dist/site', entry.downloadUrl), 'utf8'));
    assert.equal(single.bots.length, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
