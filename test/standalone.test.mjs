import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm, readdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { root } from '../scripts/engine.mjs';

const cleanEnv = { PATH: process.env.PATH };
function run(directory, args) {
  const result = spawnSync(process.execPath, args, { cwd: directory, env: cleanEnv, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}
async function copyRepository(destination) {
  await cp(root, destination, { recursive: true, filter: file => !['out', 'dist', '.cache', '.git', 'node_modules', 'site'].some(name => file === resolve(root, name)) });
}

test('vendored engine bytes match their reviewed provenance', async () => {
  const provenance = JSON.parse(await readFile(resolve(root, 'engine/PROVENANCE.json'), 'utf8'));
  assert.equal(provenance.modified, false);
  assert.equal(provenance.license, 'MIT');
  assert.ok(provenance.files.length > 1);
  for (const item of provenance.files) {
    assert.match(item.path, /^(src\/[a-z-]+|scripts\/market)\.mjs$/);
    const bytes = await readFile(resolve(root, 'engine', item.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, item.path);
  }
  await assert.rejects(access(resolve(root, 'engine/keys')));
});

test('fresh copy builds and exports with no workspace sibling or inherited engine environment', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'awesome-bot-independent-'));
  const clone = join(temporary, 'awesome-bot');
  try {
    await copyRepository(clone);
    await assert.rejects(access(join(dirname(clone), 'openbot-multiplatform-start')));
    run(clone, ['scripts/build.mjs', '--check']);
    const listing = run(clone, ['scripts/market.mjs', 'list', '--query=幕僚长']);
    assert.match(listing.stdout, /awesome\/chief-of-staff/);
    const out = join(temporary, 'bot.fleet.json');
    const blocked = spawnSync(process.execPath, ['scripts/market.mjs', 'install', 'awesome/chief-of-staff', '--openbot=0.9.9', '--allow-community', `--out=${out}`], { cwd: clone, env: cleanEnv, encoding: 'utf8' });
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr + blocked.stdout, /allow-unpinned/);
    await assert.rejects(access(out));
    run(clone, ['scripts/market.mjs', 'install', 'awesome/chief-of-staff', '--openbot=0.9.9', '--allow-community', '--allow-unpinned', `--out=${out}`]);
    const bundle = JSON.parse(await readFile(out, 'utf8'));
    assert.equal(bundle.bots.length, 1);
    assert.equal(bundle.bots[0].toolsEnabled, false);
    assert.equal(bundle.bots[0].containerEnabled, false);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});

test('community entry needs no Grok identifier and version updates preserve earlier template bytes', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'awesome-bot-contribution-'));
  const clone = join(temporary, 'awesome-bot');
  try {
    await copyRepository(clone);
    const sourceFile = join(clone, 'data/entries/chief-of-staff.json');
    const source = JSON.parse(await readFile(sourceFile, 'utf8'));
    const countBefore = (await readdir(join(clone, 'data/entries'))).length;
    const entry = structuredClone(source);
    entry.id = 'awesome/community-example';
    entry.name = '社区协作示例';
    entry.collection = 'bot-role';
    entry.version = '1.0.0';
    entry.author = { name: 'Community contributor' };
    entry.references = [{ label: 'Original contribution', url: 'https://github.com/Harzva/awesome-bot' }];
    delete entry.upstreamUseCaseName;
    delete entry.upstreamMarketplaceId;
    await writeFile(join(clone, 'data/entries/community-example.json'), `${JSON.stringify(entry, null, 2)}\n`);
    const priorVersion = source.version;
    const historicalFile = join(clone, 'templates/chief-of-staff', `${priorVersion}.json`);
    const historicalBytes = await readFile(historicalFile, 'utf8');
    const [major, minor] = priorVersion.split('.').map(Number);
    source.version = `${major}.${minor + 1}.0`;
    source.mission += ' 新版补充例外事项的复核方式。';
    await writeFile(sourceFile, `${JSON.stringify(source, null, 2)}\n`);
    run(clone, ['scripts/build.mjs']);
    run(clone, ['scripts/build.mjs', '--check']);
    assert.equal(await readFile(historicalFile, 'utf8'), historicalBytes);
    const registry = JSON.parse(await readFile(join(clone, 'registry/index.json'), 'utf8'));
    assert.ok(registry.entries.some(item => item.id === entry.id));
    const versions = registry.entries.find(item => item.id === source.id).versions.map(v => v.version);
    assert.equal(versions[0], source.version);
    assert.ok(versions.includes(priorVersion));
    const manifest = JSON.parse(await readFile(join(clone, 'templates/community-example/1.0.0.json'), 'utf8'));
    assert.equal(manifest.author.name, 'Community contributor');
    assert.equal(manifest['x-collection'], 'bot-role');
    assert.equal((await readdir(join(clone, 'data/entries'))).length, countBefore + 1);
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
