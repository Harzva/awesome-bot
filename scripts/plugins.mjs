import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseMarketIndex, marketInstallTarget } from '@deepseek-ai/dsh-plugin-market-index';
import { root } from './engine.mjs';

export const indexUrl = 'https://harzva.github.io/awesome-bot/dsh/index.json';
const sha = /^[a-f0-9]{40}$/;
const digest = /^[a-f0-9]{64}$/;
const version = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[a-zA-Z0-9.-]+)?$/;
const fail = message => { throw new Error(`Invalid plugin catalogue: ${message}`); };
function text(value) { return typeof value === 'string' && value.trim().length > 0 && value.length <= 4000; }
function localized(value, array = false) {
  return value && ['zh', 'en'].every(language => array
    ? Array.isArray(value[language]) && value[language].length > 0 && value[language].every(text)
    : text(value[language]));
}
function github(value) {
  let url; try { url = new URL(value); } catch { fail('URL'); }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com' || url.port || url.username || url.password || url.search || url.hash) fail('public GitHub HTTPS URL required');
  return url;
}

export function validatePlugins(data) {
  if (data?.schema !== 'awesome.bot.plugins/1' || !/^\d{4}-\d{2}-\d{2}$/.test(data.updatedAt) || !Array.isArray(data.entries) || !data.entries.length) fail('schema');
  const ids = new Set(), names = new Set();
  for (const item of data.entries) {
    if (!/^[a-z][a-z0-9-]{1,63}$/.test(item.id) || ids.has(item.id) || names.has(item.packageName)) fail('duplicate or invalid identity');
    ids.add(item.id); names.add(item.packageName);
    if (!/^(@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]+$/.test(item.packageName) || !version.test(item.version) || !sha.test(item.revision) || !digest.test(item.sha256)) fail('package identity or digest');
    if (!localized(item.name) || !localized(item.summary) || !['capabilities', 'requirements', 'limitations'].every(key => localized(item[key], true))) fail('complete Chinese and English content required');
    if (!Array.isArray(item.platforms) || !item.platforms.length || item.platforms.some(p => !['macOS', 'Windows', 'Linux'].includes(p)) || item.license !== 'MIT') fail('platform/license');
    const repo = github(item.repository);
    if (!/^\/[\w.-]+\/[\w.-]+$/.test(repo.pathname)) fail('repository');
    const download = github(item.downloadUrl);
    if (!download.pathname.startsWith(`${repo.pathname}/releases/download/`) || !download.pathname.endsWith('.tgz')) fail('versioned release download');
    const docs = github(item.docsUrl);
    if (!docs.pathname.startsWith(`${repo.pathname}/blob/${item.revision}/`)) fail('pinned documentation');
    if (!['dsh-bundle', 'openbot-desktop'].includes(item.format)) fail('format');
    if (!['desktop-host', 'git-adapter-required', 'ready'].includes(item.openbot?.status) || !localized(item.openbot.note)) fail('OpenBot compatibility');
    if (item.format === 'dsh-bundle') {
      if (!item.dsh || !text(item.dsh.engine) || !Number.isSafeInteger(item.dsh.publishTimestamp) || item.dsh.publishTimestamp <= 0) fail('DSH version metadata');
    } else if (item.dsh !== null) fail('desktop plugins are not standalone DSH tools');
  }
  // Use DSH's own parser for its index and exact installation specification.
  createDshIndex(data);
  return data;
}

export function createDshIndex(data) {
  const index = {
    format: 1,
    title: { zh: 'Awesome Bot 插件市场', en: 'Awesome Bot plugins' },
    description: { zh: '固定 Git 提交的 DSH 插件。安装不授予工具或账号权限。', en: 'Commit-pinned DSH bundles. Installation does not grant tool or account permissions.' },
    plugins: data.entries.filter(item => item.format === 'dsh-bundle').map(item => ({
      name: item.packageName, title: item.name, description: item.summary,
      author: 'Harzva', homepage: item.docsUrl, repository: { url: item.repository },
      metadata: { keywords: ['openbot', 'dsh', item.id] },
      versions: [{ version: item.version, publishTimestamp: item.dsh.publishTimestamp,
        source: { type: 'git', url: `${item.repository}.git`, commit: item.revision },
        engines: { dsh: item.dsh.engine } }]
    }))
  };
  parseMarketIndex(index, indexUrl);
  return index;
}

export async function readPlugins() {
  return validatePlugins(JSON.parse(await readFile(resolve(root, 'data/plugins.json'), 'utf8')));
}

export async function writePlugins({ output }) {
  const data = await readPlugins();
  const index = createDshIndex(data);
  const parsed = parseMarketIndex(index, indexUrl);
  const listing = { ...data, indexUrl: 'dsh/index.json', entries: data.entries.map(item => {
    if (item.format !== 'dsh-bundle') return item;
    const plugin = parsed.plugins.find(plugin => plugin.name === item.packageName);
    return { ...item, dsh: { ...item.dsh, indexUrl: 'dsh/index.json', installSpec: marketInstallTarget(plugin.name, plugin.versions[0]).spec } };
  }) };
  await mkdir(resolve(output, 'plugins'), { recursive: true });
  await mkdir(resolve(output, 'dsh'), { recursive: true });
  for (const [file, value] of [['plugins/catalogue.json', listing], ['dsh/index.json', index]]) {
    await writeFile(resolve(output, file), JSON.stringify(value, null, 2) + '\n');
  }
  return { plugins: listing.entries.length, dshBundles: parsed.plugins.length };
}
