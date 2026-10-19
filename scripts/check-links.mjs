import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_HOSTS = ['x.ai', 'github.com', 'raw.githubusercontent.com', 'docs.github.com', 'nodejs.org'];

function permitted(value, hosts) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && hosts.has(url.hostname) && (!url.port || url.port === '443');
  } catch { return false; }
}

export async function probeUrl(url, { fetchImpl = fetch, allowedHosts = DEFAULT_HOSTS, timeoutMs = 8000 } = {}) {
  const hosts = new Set(allowedHosts);
  let current = url;
  let method = 'HEAD';
  for (let redirects = 0; redirects <= 4; redirects++) {
    if (!permitted(current, hosts)) return { url, status: 'skipped', reason: 'outside-public-probe-hosts' };
    let response;
    try {
      response = await fetchImpl(current, {
        method, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs),
        headers: { 'User-Agent': 'AwesomeBot-SourceCheck/1.0 (+https://github.com/Harzva/awesome-bot)', ...(method === 'GET' ? { Range: 'bytes=0-2047' } : {}) }
      });
    } catch (error) { return { url, status: 'unknown', reason: error.name === 'TimeoutError' ? 'timeout' : 'network-error' }; }
    await response.body?.cancel();
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return { url, status: 'unknown', reason: 'redirect-without-location', httpStatus: response.status };
      try { current = new URL(location, current).href; }
      catch { return { url, status: 'unknown', reason: 'invalid-redirect-location', httpStatus: response.status }; }
      continue;
    }
    if ([405, 501].includes(response.status) && method === 'HEAD') { method = 'GET'; redirects--; continue; }
    if (response.status >= 200 && response.status < 300) return { url, status: 'available', httpStatus: response.status, finalUrl: current };
    if ([404, 410].includes(response.status)) return { url, status: 'broken', httpStatus: response.status };
    return { url, status: 'unknown', reason: response.status === 429 ? 'rate-limited' : 'not-confirmed-public', httpStatus: response.status };
  }
  return { url, status: 'unknown', reason: 'redirect-limit' };
}

export async function catalogueUrls(root = ROOT) {
  const catalogue = JSON.parse(await readFile(resolve(root, 'catalogue.json'), 'utf8'));
  const inventory = JSON.parse(await readFile(resolve(root, 'sources/grok-inventory.json'), 'utf8'));
  const urls = [
    ...catalogue.sources.map(s => s.url),
    ...inventory.marketplaceBots.map(b => b.url),
    ...inventory.useCases.map(u => u.url)
  ];
  if (resolve(root) === ROOT) {
    const { readCatalogue } = await import('./engine.mjs');
    const authored = await readCatalogue();
    urls.push(...authored.bots.flatMap(bot => (bot.references || []).map(ref => ref.url)));
  }
  return [...new Set(urls)].sort();
}

export async function checkLinks(urls, options = {}) {
  const pending = [...new Set(urls)];
  const results = new Array(pending.length);
  let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const index = cursor++;
      results[index] = await probeUrl(pending[index], options);
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency || 4, pending.length) }, worker));
  const totals = { available: 0, broken: 0, unknown: 0, skipped: 0 };
  for (const result of results) totals[result.status]++;
  return { schema: 'awesome.bot.link-report/1', checkedAt: new Date().toISOString(), totals, results, scope: 'Public availability only; no account access, installation, task execution, or automatic catalogue changes.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--strict' && !arg.startsWith('--out=') && !arg.startsWith('--limit='))) throw new Error('Usage: node scripts/check-links.mjs [--out=<report.json>] [--limit=<count>] [--strict]');
  const out = resolve(args.find(arg => arg.startsWith('--out='))?.slice(6) || resolve(ROOT, 'dist/reports/source-links.json'));
  const limitArg = args.find(arg => arg.startsWith('--limit='))?.slice(8);
  const limit = limitArg ? Number(limitArg) : Infinity;
  if (!(limit > 0) || (Number.isFinite(limit) && !Number.isInteger(limit))) throw new Error('--limit must be a positive integer');
  const report = await checkLinks((await catalogueUrls()).slice(0, limit));
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, report: out, totals: report.totals }));
  if (args.includes('--strict') && report.totals.broken) process.exitCode = 1;
}
