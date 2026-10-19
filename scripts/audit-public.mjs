import { readdir, readFile, lstat, realpath } from 'node:fs/promises';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const LOCAL_DIRS = new Set(['.git', 'node_modules', '.cache', 'out', 'dist', 'coverage', 'test-results', 'playwright-report']);
const LOCAL_REPORT = /^(?:native-verification(?:-[^.]+)?|verification)\.json$/;
const PRIVATE_NAME = /(?:^|\/)(?:\.env(?:\..+)?|\.codex|OPENBOT-CURRENT\.md|OPENBOT-COORDINATION\.md|WORKLOG\.md|secrets?\.json|credentials?\.json|auth\.json|cookies?\.json|id_rsa|id_ed25519|[^/]*\.private\.[^/]+)$/i;
const SECRET_PATTERNS = [
  ['private-key', /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/],
  ['github-credential', /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/],
  ['api-credential', /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/],
  ['private-home-path', /\/(?:Users|home)\/[A-Za-z0-9._-]+(?:\/|(?=["'\s]))/]
];
const CREDENTIAL_FIELD = /^(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|secret|cookie|authorization)$/i;

function inside(root, path) {
  const rel = relative(root, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep);
}

export async function publicFiles(root = ROOT) {
  root = await realpath(resolve(root));
  try {
    const top = execFileSync('git', ['-C', root, 'rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (await realpath(top) === root) {
      const files = execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean).sort();
      if (!files.length) throw new Error('The Git index is empty; stage the intended public files before auditing');
      return { mode: 'git-index', files };
    }
  } catch (error) {
    if (error.message?.includes('Git index is empty')) throw error;
  }
  const files = [];
  async function walk(dir) {
    for (const item of await readdir(resolve(root, dir), { withFileTypes: true })) {
      if (LOCAL_DIRS.has(item.name) || (dir === '' && LOCAL_REPORT.test(item.name))) continue;
      const path = dir ? `${dir}/${item.name}` : item.name;
      if (item.isDirectory()) await walk(path);
      else files.push(path);
    }
  }
  await walk('');
  return { mode: 'public-candidate-files', files: files.sort() };
}

export async function auditPublic(root = ROOT, options = {}) {
  root = await realpath(resolve(root));
  const selection = options.files ? { mode: 'explicit-files', files: options.files } : await publicFiles(root);
  const findings = [];
  if (selection.mode === 'git-index') {
    const changed = execFileSync('git', ['-C', root, 'diff', '--name-only', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    for (const file of changed) findings.push({ file, code: 'index-worktree-mismatch' });
  }
  let scanned = 0;
  for (const file of selection.files) {
    const normalized = file.replaceAll('\\', '/');
    const absolute = resolve(root, file);
    if (!inside(root, absolute)) { findings.push({ file, code: 'path-outside-root' }); continue; }
    if (normalized.split('/').some(part => LOCAL_DIRS.has(part))) findings.push({ file, code: 'local-artifact-in-public-index' });
    if ((PRIVATE_NAME.test(normalized) && !/\.env\.example$/i.test(normalized)) || LOCAL_REPORT.test(normalized.split('/').pop())) findings.push({ file, code: 'private-file-name' });
    if (/\.(?:dmg|p12|pfx|key|sqlite|db|zip|tgz|tar|gz)$/i.test(normalized)) findings.push({ file, code: 'unexpected-private-or-archive-file' });
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) { findings.push({ file, code: 'non-regular-public-file' }); continue; }
    const bytes = await readFile(absolute);
    scanned++;
    if (bytes.includes(0)) continue;
    const text = bytes.toString('utf8');
    for (const [code, pattern] of SECRET_PATTERNS) if (pattern.test(text)) findings.push({ file, code });
    if (/\.ya?ml$/i.test(normalized) && normalized.startsWith('.github/workflows/')) {
      for (const match of text.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)\s*(?:#.*)?$/gm)) {
        const action = match[1];
        if (!action.startsWith('./') && !/@[a-f0-9]{40}$/i.test(action)) findings.push({ file, code: 'action-not-pinned-to-commit' });
      }
    }
    if (normalized.endsWith('.json')) {
      let data;
      try { data = JSON.parse(text); } catch { findings.push({ file, code: 'invalid-json' }); continue; }
      function visit(value) {
        if (!value || typeof value !== 'object') return;
        for (const [key, item] of Object.entries(value)) {
          if (CREDENTIAL_FIELD.test(key) && item !== '' && item !== null && item !== false && item !== undefined) findings.push({ file, code: 'nonempty-credential-field' });
          else if (typeof item === 'object') visit(item);
        }
      }
      visit(data);
    }
  }
  return { ok: findings.length === 0, mode: selection.mode, scanned, findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => !arg.startsWith('--root='))) throw new Error('Usage: node scripts/audit-public.mjs [--root=<public-source-directory>]');
  const root = args.find(arg => arg.startsWith('--root='))?.slice(7) || ROOT;
  const result = await auditPublic(root);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 1;
}
