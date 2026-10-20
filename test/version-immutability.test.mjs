import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { root } from '../scripts/engine.mjs';
import { integrityOf } from '../engine/src/manifest.mjs';

const entryPath = 'data/entries/chief-of-staff.json';
const manifestPath = 'templates/chief-of-staff/1.0.0.json';
const json = value => `${JSON.stringify(value, null, 2)}\n`;

async function fixture({ git: withGit = true, release = true } = {}) {
  const temporary = await mkdtemp(join(tmpdir(), 'awesome-bot-version-'));
  const directory = join(temporary, 'repository');
  await cp(root, directory, {
    recursive: true,
    filter: file => !['.git', 'dist', 'out', '.cache', 'node_modules', 'site', '.impeccable'].some(name => file === resolve(root, name))
  });
  const config = join(temporary, 'empty-git-config');
  await writeFile(config, '');
  const env = { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: config };
  const git = (args, cwd = directory) => {
    const result = spawnSync('git', ['-C', cwd, ...args], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout.trim();
  };
  const commit = () => {
    git(['add', '.']);
    git(['-c', 'user.name=Version Test', '-c', 'user.email=version@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'Fixture snapshot']);
    return git(['rev-parse', 'HEAD']);
  };
  let base;
  if (withGit) {
    git(['-c', 'init.defaultBranch=main', 'init', '-q']);
    base = commit();
    if (release) git(['tag', 'v0.1.0']);
  }
  const run = (args, extraEnv = {}, cwd = directory) => spawnSync(process.execPath, args, { cwd, env: { ...env, ...extraEnv }, encoding: 'utf8' });
  const event = async (name, payload, ref = 'refs/heads/main') => {
    const eventFile = join(temporary, 'event.json');
    await writeFile(eventFile, json(payload));
    return { GITHUB_ACTIONS: 'true', GITHUB_EVENT_NAME: name, GITHUB_EVENT_PATH: eventFile, GITHUB_REF: ref };
  };
  return { directory, temporary, base, git, commit, run, event, cleanup: () => rm(temporary, { recursive: true, force: true }) };
}

function succeeds(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result;
}

function rejectsVersion(result) {
  assert.notEqual(result.status, 0, 'Mutation unexpectedly passed the version guard');
  assert.match(result.stderr + result.stdout, /immutable|Conflicting published/);
}

async function changeEntry(f, changes = {}) {
  const entry = JSON.parse(await readFile(join(f.directory, entryPath), 'utf8'));
  const oldMission = entry.mission;
  entry.mission += ' 额外核对例外事项的负责人。';
  Object.assign(entry, changes);
  await writeFile(join(f.directory, entryPath), json(entry));
  return { entry, oldMission };
}

// Deliberately construct the previously accepted bypass without invoking build:
// source, manifest, and its integrity index all agree on the changed same version.
async function changeAllGeneratedCopies(f) {
  const { entry, oldMission } = await changeEntry(f);
  const manifest = JSON.parse(await readFile(join(f.directory, manifestPath), 'utf8'));
  manifest.description = manifest.description.replace(oldMission, entry.mission);
  manifest.bot.persona = manifest.bot.persona.replace(oldMission, entry.mission);
  await writeFile(join(f.directory, manifestPath), json(manifest));
  const registry = JSON.parse(await readFile(join(f.directory, 'registry/index.json'), 'utf8'));
  registry.entries.find(item => item.id === entry.id).versions.find(item => item.version === entry.version).integrity = await integrityOf(manifest);
  await writeFile(join(f.directory, 'registry/index.json'), json(registry));
}

test('same-version source edits fail before build writes template or integrity bytes', async () => {
  const f = await fixture();
  try {
    const before = await Promise.all([manifestPath, 'registry/index.json'].map(file => readFile(join(f.directory, file))));
    await changeEntry(f);
    rejectsVersion(f.run(['scripts/build.mjs']));
    rejectsVersion(f.run(['scripts/build.mjs', '--check']));
    for (const [index, file] of [manifestPath, 'registry/index.json'].entries()) assert.deepEqual(await readFile(join(f.directory, file)), before[index]);
  } finally { await f.cleanup(); }
});

test('an ancestor release prevents a coherent committed source, template, and integrity rewrite', async () => {
  const f = await fixture();
  try {
    await changeAllGeneratedCopies(f);
    f.commit();
    rejectsVersion(f.run(['scripts/check-versions.mjs']));
    rejectsVersion(f.run(['scripts/build.mjs', '--check']));
    // A bad unpublished HEAD must still be repairable using released bytes.
    for (const file of [entryPath, manifestPath, 'registry/index.json']) {
      await writeFile(join(f.directory, file), f.git(['show', `v0.1.0:${file}`]) + '\n');
    }
    succeeds(f.run(['scripts/check-versions.mjs']));
    succeeds(f.run(['scripts/build.mjs', '--check']));
  } finally { await f.cleanup(); }
});

test('CI protects the real PR base and push before even when no release tag exists', async () => {
  const f = await fixture({ release: false });
  try {
    await changeAllGeneratedCopies(f);
    f.commit();
    const pr = await f.event('pull_request', { pull_request: { base: { sha: f.base } } }, 'refs/pull/1/merge');
    rejectsVersion(f.run(['scripts/check-versions.mjs', '--ci'], pr));
    rejectsVersion(f.run(['scripts/build.mjs', '--check'], pr));
    const push = await f.event('push', { before: f.base, ref: 'refs/heads/main' });
    rejectsVersion(f.run(['scripts/check-versions.mjs', '--ci'], push));
    const manual = await f.event('workflow_dispatch', {});
    rejectsVersion(f.run(['scripts/check-versions.mjs', '--ci'], manual));
  } finally { await f.cleanup(); }
});

test('a version increase and a new community entry build while all previous bytes stay intact', async () => {
  const f = await fixture();
  try {
    const paths = f.git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'templates/']).split('\n');
    const originals = await Promise.all(paths.map(file => readFile(join(f.directory, file))));
    const { entry } = await changeEntry(f, { version: '1.1.0' });
    const community = { ...structuredClone(entry), id: 'awesome/community-example', version: '1.0.0', name: '社区协作示例', author: { name: 'Community contributor' }, references: [{ label: 'Original contribution', url: 'https://github.com/Harzva/awesome-bot' }] };
    delete community.upstreamUseCaseName;
    delete community.upstreamMarketplaceId;
    await writeFile(join(f.directory, 'data/entries/community-example.json'), json(community));
    succeeds(f.run(['scripts/build.mjs']));
    succeeds(f.run(['scripts/build.mjs', '--check']));
    succeeds(f.run(['scripts/check-versions.mjs']));
    for (const [index, file] of paths.entries()) assert.deepEqual(await readFile(join(f.directory, file)), originals[index], file);
    const registry = JSON.parse(await readFile(join(f.directory, 'registry/index.json'), 'utf8'));
    assert.deepEqual(registry.entries.find(item => item.id === entry.id).versions.map(item => item.version), ['1.1.0', '1.0.0']);
    assert.ok(registry.entries.some(item => item.id === community.id));
    assert.equal(JSON.parse(await readFile(join(f.directory, 'templates/community-example/1.0.0.json'), 'utf8')).author.name, 'Community contributor');
    f.commit();
    await unlink(join(f.directory, manifestPath));
    rejectsVersion(f.run(['scripts/check-versions.mjs']));
    rejectsVersion(f.run(['scripts/build.mjs']));
  } finally { await f.cleanup(); }
});

test('initial zero-before and first release bootstrap are explicit, but older releases still protect tag pushes', async () => {
  const f = await fixture({ release: false });
  try {
    const zero = '0'.repeat(40);
    let env = await f.event('push', { before: zero, ref: 'refs/heads/main' });
    let report = JSON.parse(succeeds(f.run(['scripts/check-versions.mjs', '--ci'], env)).stdout);
    assert.equal(report.mode, 'initial-branch-push');
    assert.equal(report.bootstrap, true);
    f.git(['tag', 'v0.1.0']);
    env = await f.event('push', { before: zero, ref: 'refs/tags/v0.1.0' }, 'refs/tags/v0.1.0');
    report = JSON.parse(succeeds(f.run(['scripts/check-versions.mjs', '--ci'], env)).stdout);
    assert.equal(report.mode, 'release-tag');
    assert.equal(report.bootstrap, true);
    await changeAllGeneratedCopies(f);
    f.commit();
    f.git(['tag', 'v0.2.0']);
    env = await f.event('push', { before: zero, ref: 'refs/tags/v0.2.0' }, 'refs/tags/v0.2.0');
    rejectsVersion(f.run(['scripts/check-versions.mjs', '--ci'], env));
    env = await f.event('push', { before: zero, ref: 'refs/heads/main' });
    rejectsVersion(f.run(['scripts/check-versions.mjs', '--ci'], env));
  } finally { await f.cleanup(); }
});

test('CI rejects missing, self, unavailable, and shallow baselines instead of silently using HEAD', async () => {
  const f = await fixture({ release: false });
  try {
    for (const sha of [undefined, f.base, 'f'.repeat(40)]) {
      const env = await f.event('pull_request', { pull_request: { base: { sha } } }, 'refs/pull/1/merge');
      const result = f.run(['scripts/check-versions.mjs', '--ci'], env);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /actual base|checkout itself|unavailable/);
    }
    const shallow = join(f.temporary, 'shallow');
    f.git(['clone', '--quiet', '--depth=1', pathToFileURL(f.directory).href, shallow]);
    const env = await f.event('push', { before: '0'.repeat(40), ref: 'refs/heads/main' });
    const result = f.run(['scripts/check-versions.mjs', '--ci'], env, shallow);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /fetch-depth: 0/);
  } finally { await f.cleanup(); }
});

test('a clean source archive builds independently and protects its supplied template snapshot', async () => {
  const f = await fixture({ git: false });
  try {
    succeeds(f.run(['scripts/build.mjs'], { PATH: join(f.temporary, 'no-external-tools') }));
    succeeds(f.run(['scripts/build.mjs', '--check']));
    const report = JSON.parse(succeeds(f.run(['scripts/check-versions.mjs'])).stdout);
    assert.equal(report.mode, 'archive');
    assert.equal(report.comparison, 'build-plan-required');
    await changeEntry(f);
    rejectsVersion(f.run(['scripts/build.mjs']));
    const env = await f.event('push', { before: '0'.repeat(40), ref: 'refs/heads/main' });
    assert.notEqual(f.run(['scripts/check-versions.mjs', '--ci'], env).status, 0);
  } finally { await f.cleanup(); }
});


test('a release on a side branch cannot rewrite a version from a non-ancestor release', async () => {
  const f = await fixture();
  try {
    // The published tag remains on the original branch while this branch forks
    // from its parent. The old release is visible, but is not our ancestor.
    f.git(['tag', '-d', 'v0.1.0']);
    f.git(['checkout', '-b', 'published-main']);
    await writeFile(join(f.directory, 'branch-marker.txt'), 'published branch\n');
    f.commit();
    f.git(['tag', 'v0.1.0']);
    f.git(['checkout', '-b', 'side-release', f.base]);
    await changeAllGeneratedCopies(f);
    f.commit();
    f.git(['tag', 'v0.2.0']);
    const event = await f.event('push', { ref: 'refs/tags/v0.2.0' }, 'refs/tags/v0.2.0');
    rejectsVersion(f.run(['scripts/check-versions.mjs', '--ci'], event));
    rejectsVersion(f.run(['scripts/build.mjs', '--check']));
  } finally { await f.cleanup(); }
});
