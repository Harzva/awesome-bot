import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RELEASE_TAG = /^refs\/tags\/v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const ZERO_SHA = /^0{40}(?:0{24})?$/;
const COMMIT_SHA = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/i;
const isTemplate = file => file.startsWith('templates/') && file.endsWith('.json');

function git(root, args, optional = false) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 }).trimEnd();
  } catch (error) {
    if (optional) return null;
    throw new Error(`Cannot inspect Git history (${args[0]}). Fetch the required history before checking template versions.`);
  }
}

function commit(root, ref) {
  const sha = git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], true);
  if (!sha || !COMMIT_SHA.test(sha)) throw new Error(`Template version baseline is unavailable: ${ref}. Fetch that commit; do not compare the checkout with itself.`);
  return sha;
}

async function templateFiles(root, directory = 'templates') {
  let items;
  try { items = await readdir(resolve(root, directory), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const files = [];
  for (const item of items) {
    const file = `${directory}/${item.name}`;
    if (item.isDirectory()) files.push(...await templateFiles(root, file));
    else if (file.endsWith('.json')) {
      if (!item.isFile()) throw new Error(`Template versions must be regular files: ${file}`);
      files.push(file);
    }
  }
  return files.sort();
}

function gitTemplates(root, sha) {
  const tree = git(root, ['ls-tree', '-r', '-z', sha, '--', 'templates/']);
  return tree.split('\0').filter(Boolean).flatMap(record => {
    const separator = record.indexOf('\t');
    const [mode, type, oid] = record.slice(0, separator).split(' ');
    const path = record.slice(separator + 1);
    if (!isTemplate(path)) return [];
    if (type !== 'blob' || !['100644', '100755'].includes(mode)) throw new Error(`Published template is not a regular file: ${path}`);
    return [{ path, oid }];
  });
}

// Git object IDs compare exact blob bytes. Respect repositories using either
// supported object format rather than assuming the hash algorithm from its size.
function blobId(data, algorithm) {
  const bytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return createHash(algorithm).update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

async function ciBase(root, head, env) {
  const name = env.GITHUB_EVENT_NAME;
  if (!env.GITHUB_EVENT_PATH) throw new Error('CI version checks require GITHUB_EVENT_PATH and the real event baseline.');
  let event;
  try { event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH, 'utf8')); }
  catch { throw new Error('Cannot read the GitHub event baseline.'); }
  if (name === 'pull_request') {
    const sha = event.pull_request?.base?.sha;
    if (!COMMIT_SHA.test(sha || '') || ZERO_SHA.test(sha)) throw new Error('Pull requests require their actual base commit SHA.');
    if (sha === head) throw new Error('Pull-request base must not be the checkout itself.');
    return { refs: [sha], currentTag: null, origin: 'pull-request-base' };
  }
  if (name === 'push') {
    const ref = event.ref || env.GITHUB_REF;
    if (event.ref && env.GITHUB_REF && event.ref !== env.GITHUB_REF) throw new Error('GitHub push ref does not match the event payload.');
    if (ref?.startsWith('refs/tags/')) return { refs: [], currentTag: ref, origin: 'release-tag' };
    const sha = event.before;
    if (!ref?.startsWith('refs/heads/') || !COMMIT_SHA.test(sha || '')) throw new Error('Branch pushes require their actual before commit SHA.');
    if (ZERO_SHA.test(sha)) return { refs: [], currentTag: null, origin: 'initial-branch-push' };
    if (sha === head) throw new Error('Push before must not be the checkout itself.');
    return { refs: [sha], currentTag: null, origin: 'push-before' };
  }
  if (name === 'workflow_dispatch') {
    if (env.GITHUB_REF?.startsWith('refs/tags/')) return { refs: [], currentTag: env.GITHUB_REF, origin: 'release-tag' };
    const parent = git(root, ['rev-parse', '--verify', 'HEAD^'], true);
    return { refs: parent ? [parent] : [], currentTag: null, origin: 'manual-parent' };
  }
  throw new Error(`Unsupported CI baseline event: ${name || '(missing)'}`);
}

/**
 * Protect existing template-version paths before publishing or generation.
 * `planned` is the generator's prospective file map, so a source-only edit is
 * rejected before it can overwrite a published manifest or its integrity index.
 * Archives have no trusted Git baseline; their build compares the supplied
 * template snapshot with prospective output without requiring Git or a network.
 */
export async function assertVersionImmutability({ root = projectRoot, planned = null, baseRefs, ci = false, env = process.env } = {}) {
  root = resolve(root);
  const top = git(root, ['rev-parse', '--show-toplevel'], true);
  const ownRepository = top && await realpath(top) === await realpath(root);
  const useCi = ci || (env.GITHUB_ACTIONS === 'true' && !!env.GITHUB_EVENT_PATH);
  if (!ownRepository) {
    if (useCi) throw new Error('CI version checks require the repository and its full Git history.');
    const files = planned ? await templateFiles(root) : [];
    for (const file of files) {
      if (!planned.has(file) || !Buffer.from(planned.get(file)).equals(await readFile(resolve(root, file)))) {
        throw new Error(`Template version snapshot is immutable: ${file}. Increase the entry version and retain the existing file.`);
      }
    }
    return { ok: true, mode: 'archive', protectedVersions: files.length, baselines: [], comparison: planned ? 'supplied-snapshot-to-build-plan' : 'build-plan-required' };
  }

  const head = git(root, ['rev-parse', '--verify', 'HEAD^{commit}'], true);
  if (!head) {
    if (useCi) throw new Error('CI version checks require a checked-out commit.');
    return { ok: true, mode: 'initial-repository', protectedVersions: 0, baselines: [], bootstrap: true };
  }
  if (useCi && git(root, ['rev-parse', '--is-shallow-repository']) === 'true') throw new Error('CI template version checks require full history (checkout fetch-depth: 0).');
  const context = baseRefs !== undefined
    ? { refs: baseRefs, currentTag: null, origin: 'explicit-base' }
    : useCi ? await ciBase(root, head, env) : { refs: ['HEAD'], currentTag: null, origin: 'local-head' };
  const baselines = new Map();
  for (const ref of context.refs) {
    const sha = commit(root, ref);
    if (useCi && sha === head) throw new Error('CI template baseline must precede the checkout.');
    baselines.set(sha, { ref, sha, published: false });
  }
  for (const ref of git(root, ['for-each-ref', '--format=%(refname)', 'refs/tags']).split('\n').filter(Boolean)) {
    if (!RELEASE_TAG.test(ref) || ref === context.currentTag) continue;
    const sha = commit(root, ref);
    // A version path is immutable across branches as well as along main.
    baselines.set(sha, { ref, sha, published: true });
  }

  const algorithm = git(root, ['rev-parse', '--show-object-format']);
  if (!['sha1', 'sha256'].includes(algorithm)) throw new Error('Unsupported Git object format for version checks.');
  const protectedFiles = new Map();
  for (const baseline of baselines.values()) {
    for (const item of gitTemplates(root, baseline.sha)) {
      const previous = protectedFiles.get(item.path);
      if (previous && previous.oid !== item.oid) {
        if (previous.published && baseline.published) throw new Error(`Conflicting published template bytes in release tags: ${item.path}. Restore the original release history.`);
        // A released snapshot remains authoritative if a later, unpublished
        // commit was already wrong. This also permits restoring its old bytes.
        if (previous.published) continue;
        if (!baseline.published) throw new Error(`Conflicting template version baselines: ${item.path}.`);
      }
      protectedFiles.set(item.path, { ...item, baseline: baseline.ref, published: baseline.published });
    }
  }
  const failures = [];
  for (const [path, item] of protectedFiles) {
    let bytes;
    if (planned) bytes = planned.has(path) ? Buffer.from(planned.get(path)) : null;
    else {
      try { bytes = await readFile(resolve(root, path)); }
      catch (error) { if (error.code !== 'ENOENT') throw error; bytes = null; }
    }
    if (!bytes) failures.push(`Deleted ${path} (baseline ${item.baseline})`);
    else if (blobId(bytes, algorithm) !== item.oid) failures.push(`Changed ${path} (baseline ${item.baseline})`);
  }
  if (failures.length) throw new Error(`Published template versions are immutable:\n${failures.map(value => `- ${value}`).join('\n')}\nIncrease the entry version and retain all earlier template bytes.`);
  return { ok: true, mode: context.origin, protectedVersions: protectedFiles.size, baselines: [...baselines.values()], bootstrap: baselines.size === 0 };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--ci' && !arg.startsWith('--base=')) || args.some(arg => arg === '--base=')) throw new Error('Usage: node scripts/check-versions.mjs [--ci] [--base=<prior-ref>]');
  const refs = args.filter(arg => arg.startsWith('--base=')).map(arg => arg.slice(7));
  console.log(JSON.stringify(await assertVersionImmutability({ ci: args.includes('--ci'), ...(refs.length ? { baseRefs: refs } : {}) })));
}
