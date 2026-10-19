import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { gunzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { reproducibleArchive, releaseFileAllowed, collectionParts } from '../scripts/pack-release.mjs';
import { engineModule } from '../scripts/engine.mjs';
import { auditPublic } from '../scripts/audit-public.mjs';
import { probeUrl, checkLinks } from '../scripts/check-links.mjs';

function tarMembers(bytes) {
  const tar = gunzipSync(bytes);
  const files = [];
  for (let offset = 0; tar[offset];) {
    const header = tar.subarray(offset, offset + 512);
    const name = header.subarray(0, 100).toString().replace(/\0.*$/, '');
    const prefix = header.subarray(345, 500).toString().replace(/\0.*$/, '');
    const size = parseInt(header.subarray(124, 136).toString().replace(/\0.*$/, ''), 8);
    files.push({ path: prefix ? `${prefix}/${name}` : name, data: tar.subarray(offset + 512, offset + 512 + size).toString() });
    offset += 512 + Math.ceil(size / 512) * 512;
  }
  return files;
}

test('release archive is deterministic, readable, and rejects unsafe members', () => {
  const files = [{ path: 'registry/index.json', data: '{"entries":[]}' }, { path: 'README.md', data: 'Awesome Bot\n' }];
  const options = { prefix: 'awesome-bot-v0.1.0', epoch: 1792440000 };
  const first = reproducibleArchive(files, options);
  assert.deepEqual(reproducibleArchive([...files].reverse(), options), first);
  assert.deepEqual(tarMembers(first), [
    { path: 'awesome-bot-v0.1.0/README.md', data: 'Awesome Bot\n' },
    { path: 'awesome-bot-v0.1.0/registry/index.json', data: '{"entries":[]}' }
  ]);
  for (const path of ['../outside', '/absolute', 'a/../../outside', 'a\\outside', 'a:b']) {
    assert.throws(() => reproducibleArchive([{ path, data: '' }], options), /Unsafe archive path/);
  }
});

test('release selection excludes internal verification and native-only adapters', () => {
  for (const file of ['native-verification.json', 'native-verification-56.json', 'verification.json', 'out/example.fleet.json', 'scripts/verify-native.mjs']) assert.equal(releaseFileAllowed(file), false, file);
  for (const file of ['README.md', 'engine/src/manifest.mjs', 'data/entries/chief-of-staff.json', 'templates/chief-of-staff/1.0.0.json']) assert.equal(releaseFileAllowed(file), true, file);
});

test('release archive retains the actual localized and provenance root documents', async () => {
  const documents = ['README.md', 'README.zh-CN.md', 'CATALOGUE.md', 'CONTRIBUTING.md', 'INTEGRATION.md', 'LICENSE', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md', 'CHANGELOG.md', '.gitattributes', '.impeccable/design.json'];
  const files = [];
  for (const path of documents) {
    assert.equal(releaseFileAllowed(path), true, `${path} must remain in the release source`);
    const data = await readFile(new URL(`../${path}`, import.meta.url));
    assert.ok(data.length > 0, `${path} must exist and contain the referenced documentation`);
    files.push({ path, data });
  }
  const members = tarMembers(reproducibleArchive(files, { prefix: 'awesome-bot-v0.1.0', epoch: 1792440000 }));
  assert.deepEqual(new Set(members.map(member => member.path)), new Set(documents.map(path => `awesome-bot-v0.1.0/${path}`)));
});

test('public audit rejects private material without echoing its value', async () => {
  const root = await mkdtemp(join(tmpdir(), 'awesome-public-audit-'));
  const secret = ['gh', 'p_', 'x'.repeat(36)].join('');
  try {
    await writeFile(join(root, 'payload.json'), JSON.stringify({ apiKey: secret }));
    await writeFile(join(root, 'notes.md'), ['', 'Users', 'fixture-person', 'Private', 'notes.md'].join('/'));
    const report = await auditPublic(root, { files: ['payload.json', 'notes.md'] });
    assert.equal(report.ok, false);
    assert.ok(report.findings.some(f => f.code === 'nonempty-credential-field'));
    assert.ok(report.findings.some(f => f.code === 'github-credential'));
    assert.ok(report.findings.some(f => f.code === 'private-home-path'));
    assert.ok(!JSON.stringify(report).includes(secret));
    const outside = await auditPublic(root, { files: ['../outside.json'] });
    assert.equal(outside.findings[0].code, 'path-outside-root');
    await mkdir(join(root, '.github/workflows'), { recursive: true });
    await writeFile(join(root, '.github/workflows/unsafe.yml'), 'steps:\n  - uses: actions/checkout@main # a comment must not bypass pin checks\n');
    const workflow = await auditPublic(root, { files: ['.github/workflows/unsafe.yml'] });
    assert.ok(workflow.findings.some(f => f.code === 'action-not-pinned-to-commit'));
    execFileSync('git', ['init', '-q', root]);
    execFileSync('git', ['-C', root, 'add', 'payload.json']);
    await writeFile(join(root, 'payload.json'), '{}');
    const mismatch = await auditPublic(root);
    assert.ok(mismatch.findings.some(f => f.code === 'index-worktree-mismatch'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('large release collections are split at 200 with distinct identities across parts', async () => {
  const { materialize } = await engineModule('install');
  const plans = Array.from({ length: 201 }, (_, index) => ({
    ok: true, permissions: { tools: true, screen: false },
    bots: [{ templateId: `fixture/bot-${index}`, templateVersion: '1.0.0', role: 'member', name: 'Repeated name', persona: 'Synthetic role used only to test file splitting.', skills: [], model: '', temperature: 0.5 }]
  }));
  const parts = collectionParts(plans, { materialize, now: 1792440000000, collection: 'all' });
  assert.deepEqual(parts.map(part => part.bots.length), [200, 1]);
  const bots = parts.flatMap(part => part.bots);
  assert.equal(new Set(bots.map(bot => bot.id)).size, 201);
  assert.equal(new Set(bots.map(bot => bot.name)).size, 201);
  assert.ok(bots.every(bot => bot.toolsEnabled === false && bot.containerEnabled === false));
});

test('source checks classify uncertainty and never follow a redirect to a private host', async () => {
  const visited = [];
  const redirected = await probeUrl('https://x.ai/bot', { fetchImpl: async url => { visited.push(url); return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); } });
  assert.equal(redirected.status, 'skipped');
  assert.equal(visited.length, 1);
  const methods = [];
  const available = await probeUrl('https://github.com/Harzva/awesome-bot', { fetchImpl: async (_url, request) => { methods.push(request.method); return new Response(null, { status: request.method === 'HEAD' ? 405 : 200 }); } });
  assert.equal(available.status, 'available');
  assert.deepEqual(methods, ['HEAD', 'GET']);
  const report = await checkLinks(['https://x.ai/missing', 'https://x.ai/limited'], { fetchImpl: async url => new Response(null, { status: url.endsWith('missing') ? 404 : 429 }) });
  assert.deepEqual(report.totals, { available: 0, broken: 1, unknown: 1, skipped: 0 });
});
