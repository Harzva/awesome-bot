import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './engine.mjs';
export function validSharedUrl(value, kind, sources = []) {
  if (typeof value !== 'string') return false;
  let url;try { url = new URL(value); } catch { return false; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || /[\s<>]/.test(value)) return false;
  if (kind === 'share') return url.origin === 'https://x.ai' && /^\/bot\/[A-Za-z0-9_-]+$/.test(url.pathname) && !url.hash;
  if (kind === 'template') return url.origin === 'https://templatesgrokbot.com' && /^\/bot\/[a-zA-Z0-9_-]+$/.test(url.pathname) && !url.hash;
  if (kind === 'source-file') return url.origin === 'https://github.com' && sources.some(source => {
    const prefix = `/${source.repository}/blob/${source.revision}/`;
    return url.pathname.startsWith(prefix) && /^[\w./-]+\.(?:md|json)$/i.test(url.pathname.slice(prefix.length)) && !url.pathname.slice(prefix.length).split('/').some(v => v === '..' || !v) && (!url.hash || /^#[a-zA-Z0-9_-]+$/.test(url.hash));
  });
  return false;
}
export function validateSharedBots(data) {
  if (data.schema !== 'awesome.bot.shared-bots/1' || data.installable !== false || data.availability !== 'source-indexed-not-individually-tested' || !Array.isArray(data.sources) || !Array.isArray(data.entries)) throw new Error('Invalid shared Bot collection');
  const sourceIds = new Set();
  for (const source of data.sources) {
    if (!/^[a-z0-9-]+$/.test(source.id) || sourceIds.has(source.id) || !/^[\w.-]+\/[\w.-]+$/.test(source.repository) || !/^[a-f0-9]{40}$/.test(source.revision) || !/^[a-f0-9]{64}$/.test(source.sha256)) throw new Error('Invalid shared source provenance');
    const githubPrefix = `https://github.com/${source.repository}/`;
    const rawPrefix = `https://raw.githubusercontent.com/${source.repository}/${source.revision}/`;
    if (!(source.url.startsWith(rawPrefix) || source.url === githubPrefix + 'tree/' + source.revision || source.url.startsWith(githubPrefix + 'tree/' + source.revision + '/') || source.url.startsWith(githubPrefix + 'blob/' + source.revision + '/'))) throw new Error('Unpinned shared source URL');
    sourceIds.add(source.id);
  }
  const urls = new Set();
  for (const entry of data.entries) {
    if (Object.keys(entry).some(k => !['name', 'author', 'url', 'category', 'sources', 'sourceRecords', 'linkKind'].includes(k))) throw new Error('Shared Bot must contain metadata only');
    if (typeof entry.name !== 'string' || !entry.name.trim() || typeof entry.author !== 'string' || typeof entry.category !== 'string' || !Array.isArray(entry.sources) || !validSharedUrl(entry.url, entry.linkKind, data.sources.filter(s => entry.sources.includes(s.id))) || urls.has(entry.url)) throw new Error('Invalid or duplicate shared Bot');
    urls.add(entry.url);
    if (!entry.sources.length || new Set(entry.sources).size !== entry.sources.length || entry.sources.some(id => !sourceIds.has(id))) throw new Error('Missing shared source');
    if (!Array.isArray(entry.sourceRecords) || entry.sourceRecords.some(r => !entry.sources.includes(r.sourceId) || typeof r.recordId !== 'string' || !r.recordId)) throw new Error('Invalid shared source record');
    if (entry.sources.some(id => !entry.sourceRecords.some(r => r.sourceId === id))) throw new Error('Incomplete shared attribution');
  }
  return data;
}
export async function readSharedBots() {
  return validateSharedBots(JSON.parse(await readFile(resolve(root, 'data/shared-bots.json'), 'utf8')));
}
export async function writeSharedBots({ output, version }) {
  const data = await readSharedBots();
  await writeFile(resolve(output, 'shared-bots.json'), JSON.stringify(data) + '\n');
  const page = resolve(output, 'shared-bots.html');
  const html = await readFile(page, 'utf8');
  await writeFile(page, html.replace(/((?:src|href)=["'])(\.\/(?:styles\.css|shared-bots\.css|shared-bots\.js))(["'])/g, (_, p, asset, q) => `${p}${asset}?v=${encodeURIComponent(version)}${q}`));
  return data.entries.length;
}
