import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile, cp, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { root, readCatalogue } from '../scripts/engine.mjs';

test('bulk export covers each full collection and refuses a stale directory', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'awesome-bot-bulk-'));
  try {
    const catalogue = await readCatalogue();
    for (const [collection, count] of [['roles', catalogue.bots.filter(b => b.collection === 'bot-role').length], ['workflows', catalogue.bots.filter(b => b.collection === 'task-workflow').length], ['all', catalogue.bots.length]]) {
      const out = join(dir, `${collection}.json`);
      const result = spawnSync(process.execPath, [resolve(root, 'scripts/export-all.mjs'), '--allow-community', `--collection=${collection}`, `--out=${out}`], { cwd: root, encoding: 'utf8' });
      if (count > 200) {
        assert.notEqual(result.status, 0);
        await assert.rejects(access(out));
        continue;
      }
      assert.equal(result.status, 0, result.stderr);
      const bundle = JSON.parse(await readFile(out, 'utf8'));
      assert.equal(bundle.bots.length, count, collection);
      assert.equal(new Set(bundle.bots.map(b => b.id)).size, count);
      assert.ok(bundle.bots.every(b => b.toolsEnabled === false && b.containerEnabled === false));
    }
    const fixture = join(dir, 'stale');
    await cp(root, fixture, { recursive: true, filter: file => !['out', 'dist', '.cache', '.git', 'node_modules', 'site'].some(name => file === resolve(root, name)) });
    const registryFile = join(fixture, 'registry/index.json');
    const registry = JSON.parse(await readFile(registryFile, 'utf8'));
    registry.entries.pop();
    await writeFile(registryFile, JSON.stringify(registry));
    const blockedOut = join(dir, 'must-not-exist.json');
    const blocked = spawnSync(process.execPath, [join(fixture, 'scripts/export-all.mjs'), '--allow-community', '--collection=all', `--out=${blockedOut}`], {
      cwd: fixture, encoding: 'utf8', env: { PATH: process.env.PATH }
    });
    assert.notEqual(blocked.status, 0);
    await assert.rejects(access(blockedOut));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
