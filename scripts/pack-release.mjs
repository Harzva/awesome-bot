import { readFile, writeFile, readdir, lstat, mkdir } from 'node:fs/promises';
import { resolve, dirname, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { auditPublic, publicFiles } from './audit-public.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT_FILES = new Set(['README.md', 'README.zh-CN.md', 'CATALOGUE.md', 'START_HERE.md', 'CONTRIBUTING.md', 'INTEGRATION.md', 'LICENSE', 'SECURITY.md', 'CODE_OF_CONDUCT.md', 'CHANGELOG.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md', 'AGENTS.md', 'PRODUCT.md', 'DESIGN.md', 'package.json', 'package-lock.json', 'catalogue.json', '.gitignore', '.gitattributes']);
const SOURCE_DIRS = new Set(['data', 'engine', 'registry', 'templates', 'sources', 'scripts', 'test', 'site', 'docs', '.github']);
const REQUIRED = ['README.md', 'README.zh-CN.md', 'CATALOGUE.md', 'START_HERE.md', 'CONTRIBUTING.md', 'LICENSE', 'SECURITY.md', 'SOURCE.md', 'THIRD_PARTY_NOTICES.md', 'package.json', 'package-lock.json', 'catalogue.json', 'registry/index.json'];
const sha256 = data => createHash('sha256').update(data).digest('hex');

export function releaseFileAllowed(file) {
  const path = file.replaceAll('\\', '/');
  if (path === 'scripts/verify-native.mjs' || /(?:^|\/)(?:native-verification[^/]*|verification)\.json$/.test(path)) return false;
  return path === '.impeccable/design.json' || ROOT_FILES.has(path) || SOURCE_DIRS.has(path.split('/')[0]);
}

function safeArchivePath(path) {
  if (typeof path !== 'string' || !path || path.startsWith('/') || path.includes('\\') || path.includes(':') || path.includes('\0') || path.split('/').some(part => !part || part === '.' || part === '..')) throw new Error('Unsafe archive path');
  return path;
}

export function reproducibleArchive(files, { prefix, epoch }) {
  if (!/^[a-zA-Z0-9._-]+$/.test(prefix) || !Number.isSafeInteger(epoch) || epoch < 0) throw new Error('Invalid archive version or timestamp');
  const seen = new Set();
  const records = [];
  for (const item of [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    safeArchivePath(item.path);
    if (seen.has(item.path)) throw new Error('Duplicate archive path');
    seen.add(item.path);
    const data = Buffer.isBuffer(item.data) ? item.data : Buffer.from(item.data);
    const path = `${prefix}/${item.path}`;
    const header = Buffer.alloc(512);
    function field(text, start, length) {
      const value = Buffer.from(text);
      if (value.length > length) throw new Error('Archive field is too long');
      value.copy(header, start);
    }
    function octal(value, start, length) { field(`${value.toString(8).padStart(length - 1, '0')}\0`, start, length); }
    if (Buffer.byteLength(path) <= 100) field(path, 0, 100);
    else { field(posix.basename(path), 0, 100); field(posix.dirname(path), 345, 155); }
    octal(0o644, 100, 8); octal(0, 108, 8); octal(0, 116, 8);
    octal(data.length, 124, 12); octal(epoch, 136, 12);
    header.fill(32, 148, 156);
    field('0', 156, 1); field('ustar\0', 257, 6); field('00', 263, 2);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    field(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8);
    records.push(header, data, Buffer.alloc((512 - data.length % 512) % 512));
  }
  records.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(records), { level: 9 });
}

async function regularFiles(root, dir = '') {
  const result = [];
  for (const item of await readdir(resolve(root, dir), { withFileTypes: true })) {
    const path = dir ? `${dir}/${item.name}` : item.name;
    if (item.isSymbolicLink()) throw new Error('Release cannot contain symbolic links');
    if (item.isDirectory()) result.push(...await regularFiles(root, path));
    else if (item.isFile()) result.push(path);
    else throw new Error('Release cannot contain special files');
  }
  return result.sort();
}

export function collectionParts(plans, { materialize, now, collection }) {
  const parts = [];
  const existing = [];
  for (let start = 0; start < plans.length; start += 200) {
    const selected = plans.slice(start, start + 200);
    if (selected.some(plan => plan.ok !== true || plan.bots?.length !== 1)) throw new Error('Every release entry must resolve to exactly one Bot');
    const result = materialize({
      ok: true, id: `awesome/release-${collection}`, kind: 'bulk-export', rootVersion: '1.0.0',
      bots: selected.flatMap(plan => plan.bots), sharedSkills: [], workflow: [], warnings: [],
      permissions: { tools: selected.some(plan => plan.permissions.tools), container: false, screen: selected.some(plan => plan.permissions.screen) }
    }, { now, existing });
    if (!result.ok || result.bundle.bots.length !== selected.length || result.bundle.bots.some(bot => bot.toolsEnabled !== false || bot.containerEnabled !== false)) throw new Error('Release export is incomplete or grants permissions');
    existing.push(...result.bundle.bots.map(bot => ({ id: bot.id, name: bot.name })));
    parts.push(result.bundle);
  }
  return parts;
}

export async function packRelease({ root = ROOT, outDir = resolve(ROOT, 'dist/release'), build = true } = {}) {
  root = resolve(root); outDir = resolve(outDir);
  const metadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const version = metadata.version;
  if (!/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(version)) throw new Error('Package version must be a stable filename-safe semver');
  const catalogue = JSON.parse(await readFile(resolve(root, 'catalogue.json'), 'utf8'));
  const epoch = process.env.SOURCE_DATE_EPOCH ? Number(process.env.SOURCE_DATE_EPOCH) : Math.floor(Date.parse(catalogue.updatedAt) / 1000);
  if (!Number.isSafeInteger(epoch) || epoch < 0) throw new Error('Catalogue timestamp or SOURCE_DATE_EPOCH is invalid');
  if (build) {
    execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs'), '--check'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:site'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  }
  const audit = await auditPublic(root);
  if (!audit.ok) throw new Error(`Public audit failed: ${JSON.stringify(audit.findings)}`);
  const selection = await publicFiles(root);
  const sourceFiles = selection.files.filter(releaseFileAllowed);
  for (const file of REQUIRED) if (!sourceFiles.includes(file)) throw new Error(`Required release source is missing or untracked: ${file}`);
  const siteRoot = resolve(root, 'dist/site');
  const siteFiles = await regularFiles(siteRoot);
  if (!siteFiles.includes('index.html')) throw new Error('Static site entry point is missing');
  const siteAudit = await auditPublic(siteRoot, { files: siteFiles });
  if (!siteAudit.ok) throw new Error(`Static site audit failed: ${JSON.stringify(siteAudit.findings)}`);
  {
    const payload = [];
    for (const path of sourceFiles) {
      const stat = await lstat(resolve(root, path));
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Source release requires regular files');
      payload.push({ path, data: await readFile(resolve(root, path)) });
    }
    for (const path of siteFiles) payload.push({ path: `dist/site/${path}`, data: await readFile(resolve(siteRoot, path)) });
    const assets = [];
    const counts = {};
    const collections = {};
    const runtime = await import(pathToFileURL(resolve(root, 'scripts/engine.mjs')).href);
    const authored = await runtime.readCatalogue();
    const { loadCatalogue } = await runtime.engineModule('catalogue');
    const { createLoader } = await runtime.engineModule('sources');
    const { buildPlan } = await runtime.engineModule('plan');
    const { materialize } = await runtime.engineModule('install');
    const { gateEntry } = await runtime.engineModule('trust');
    const registry = await loadCatalogue([resolve(root, 'registry/index.json')]);
    const loader = createLoader(registry);
    const targetOpenBotVersion = catalogue.targetOpenBotVersion || '0.9.9';
    const byId = new Map();
    if (registry.entries.length !== authored.bots.length) throw new Error('Authored catalogue and registry counts differ');
    for (const entry of registry.entries) {
      const gate = gateEntry(entry, { allowCommunity: true });
      if (!gate.ok) throw new Error(gate.message);
      const plan = await buildPlan({ id: entry.id, entries: registry.entries, loadManifest: loader, openbotVersion: targetOpenBotVersion });
      if (!plan.ok || plan.bots.length !== 1) throw new Error(`Release plan failed for ${entry.id}: ${plan.errors?.join('; ')}`);
      byId.set(entry.id, plan);
    }
    for (const collection of ['roles', 'workflows', 'all']) {
      const entries = authored.bots.filter(bot => collection === 'all' || bot.collection === (collection === 'roles' ? 'bot-role' : 'task-workflow'));
      const plans = entries.map(entry => byId.get(entry.id));
      if (plans.some(plan => !plan)) throw new Error('Selected entries are missing from the registry');
      const parts = collectionParts(plans, { materialize, now: Date.parse(catalogue.updatedAt), collection });
      counts[collection] = parts.reduce((sum, part) => sum + part.bots.length, 0);
      if (counts[collection] !== entries.length) throw new Error('Release collection is incomplete');
      collections[collection] = { count: counts[collection], parts: [] };
      for (const [index, bundle] of parts.entries()) {
        const suffix = parts.length > 1 ? `-part-${String(index + 1).padStart(3, '0')}-of-${String(parts.length).padStart(3, '0')}` : '';
        const name = `awesome-bot-${collection}${suffix}-v${version}.fleet.json`;
        const data = Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`);
        payload.push({ path: `exports/${collection}${suffix}.fleet.json`, data });
        assets.push({ name, data });
        collections[collection].parts.push({ file: name, bots: bundle.bots.length, sha256: sha256(data) });
      }
    }
    if (counts.all !== registry.entries.length || counts.roles + counts.workflows !== counts.all) throw new Error('Release collections do not match the registry');
    const prefix = `awesome-bot-v${version}`;
    assets.unshift({ name: `${prefix}.tar.gz`, data: reproducibleArchive(payload, { prefix, epoch }) });
    const manifest = {
      schema: 'awesome.bot.release/1', version, catalogueSnapshotAt: catalogue.updatedAt,
      sourceDateEpoch: epoch, counts, collections, targetOpenBotVersion, signed: false,
      contents: payload.map(f => ({ path: f.path, bytes: f.data.length, sha256: sha256(f.data) })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0),
      artifacts: assets.map(a => ({ file: a.name, bytes: a.data.length, sha256: sha256(a.data) })),
      scope: 'Original declarative templates. Schema and export checks do not certify real-account task execution.'
    };
    assets.push({ name: 'release-manifest.json', data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`) });
    const changelog = await readFile(resolve(root, 'CHANGELOG.md'), 'utf8');
    const changes = changelog.split(/^## /m).find(section => section.startsWith(`${version} `) || section.startsWith(`${version}\n`));
    const changeBody = changes ? changes.split('\n').slice(1).join('\n').trim() : '';
    const notes = [
      `# Awesome Bot v${version}`, '',
      ...(changeBody ? [changeBody, ''] : []),
      `${counts.roles} original Bot roles and ${counts.workflows} task workflows (${counts.all} template configurations).`, '',
      '- Every entry retains its source and implementation attribution.',
      '- Download a collection Fleet file for a configuration import, or the archive for the complete standalone project and static marketplace.',
      '- Collections larger than 200 are split into numbered files. Host total-Bot limits still apply; install only the roles you need.',
      '- Model, account, tool, and screen setup remain with the host. The unsigned catalogue requires explicit community-source consent.',
      '- Exports contain no private memory or conversation data. Published artifacts are immutable.',
      '- Schema/export checks are not a claim that every role completed a real-account task.', '',
      'Verify downloaded assets with `shasum -a 256 -c SHA256SUMS` (macOS) or `sha256sum -c SHA256SUMS` (Linux).', '',
      `Catalogue snapshot: ${catalogue.updatedAt}.`, ''
    ].join('\n');
    assets.push({ name: 'RELEASE_NOTES.md', data: Buffer.from(notes) });
    const sums = assets.map(a => `${sha256(a.data)}  ${a.name}`).sort().join('\n') + '\n';
    assets.push({ name: 'SHA256SUMS', data: Buffer.from(sums) });
    await mkdir(outDir, { recursive: true });
    const permitted = new Set(assets.map(a => a.name));
    if ((await readdir(outDir)).some(file => !permitted.has(file))) throw new Error('Release output contains another version or unrelated files; use an empty output directory');
    for (const asset of assets) await writeFile(resolve(outDir, asset.name), asset.data);
    return { ok: true, version, counts, files: assets.map(a => a.name), outDir };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => !arg.startsWith('--out='))) throw new Error('Usage: node scripts/pack-release.mjs [--out=<release-directory>]');
  const outDir = args.find(arg => arg.startsWith('--out='))?.slice(6) || resolve(ROOT, 'dist/release');
  console.log(JSON.stringify(await packRelease({ outDir })));
}
