import { mkdir, readdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readCatalogue, engineModule } from './engine.mjs';

const args = process.argv.slice(2);
if (args.some(arg => !arg.startsWith('--out='))) throw new Error('Usage: node scripts/build-site.mjs [--out=<directory>]');
const output = resolve(args.find(arg => arg.startsWith('--out='))?.slice(6) || resolve(root, 'dist/site'));
if (output === root || root.startsWith(`${output}/`)) throw new Error('Output cannot replace the project or its parent');
let previous = [];
try { previous = await readdir(output); } catch (error) { if (error.code !== 'ENOENT') throw error; }
if (previous.length && !previous.includes('.awesome-bot-build')) throw new Error('Refusing to replace a nonempty directory that is not an Awesome Bot build output');
// Require a reviewed, current manifest snapshot. This never regenerates source.
execFileSync(process.execPath, [resolve(root, 'scripts/build.mjs'), '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const metadata = await readCatalogue();
const inventory = JSON.parse(await readFile(resolve(root, 'sources/grok-inventory.json'), 'utf8'));
const { loadCatalogue } = await engineModule('catalogue');
const { createLoader } = await engineModule('sources');
const { buildPlan } = await engineModule('plan');
const { materialize } = await engineModule('install');
const registry = await loadCatalogue([resolve(root, 'registry/index.json')]);
const loader = createLoader(registry);
const entries = [];
const fleets = new Map();
const now = Date.parse(metadata.updatedAt);
const repo = 'https://github.com/Harzva/awesome-bot';
const json = value => `${JSON.stringify(value, null, 2)}\n`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(resolve(output, '.awesome-bot-build'), 'awesome.bot.site/1\n');
await cp(resolve(root, 'site'), output, { recursive: true });
await cp(resolve(root, 'templates'), resolve(output, 'templates'), { recursive: true });
await cp(resolve(root, 'registry'), resolve(output, 'registry'), { recursive: true });
await cp(resolve(root, 'sources'), resolve(output, 'sources'), { recursive: true });
await writeFile(resolve(output, '.nojekyll'), '');

for (const bot of metadata.bots) {
  const plan = await buildPlan({ id: bot.id, entries: registry.entries, loadManifest: loader, openbotVersion: metadata.targetOpenBotVersion || '0.9.9' });
  if (!plan.ok || plan.bots.length !== 1) throw new Error(`Invalid single template plan: ${bot.id}: ${plan.errors?.join('; ')}`);
  const built = materialize(plan, { now });
  if (!built.ok) throw new Error(built.message);
  const slug = bot.id.split('/')[1];
  const relative = `exports/${slug}.fleet.json`;
  await mkdir(dirname(resolve(output, relative)), { recursive: true });
  await writeFile(resolve(output, relative), json(built.bundle));
  const source = bot.upstreamMarketplaceId
    ? inventory.marketplaceBots.find(item => item.id === bot.upstreamMarketplaceId)
    : inventory.useCases.find(item => item.name === bot.upstreamUseCaseName);
  const manifest = await loader(bot.id, bot.version || '1.0.0');
  const collection = bot.collection === 'bot-role' ? 'roles' : 'workflows';
  const fleetList = fleets.get(collection) || [];
  fleetList.push(...plan.bots);
  fleets.set(collection, fleetList);
  entries.push({
    id: bot.id, name: bot.name, sourceName: source?.name || '', sourceAuthor: source?.author || '',
    author: typeof bot.author === 'string' ? bot.author : bot.author?.name || 'OpenBot contributors',
    collection, category: bot.category, summary: bot.summary, mission: bot.mission, style: bot.style,
    inputs: bot.inputs, outputs: bot.outputs, workflow: bot.workflow,
    requirements: bot.requirements, skills: bot.skills, persona: manifest.bot.persona,
    guidance: { welcome: bot.welcome, quickPrompts: bot.quickPrompts, taskExamples: [bot.example] },
    permissions: manifest.permissions, capabilities: bot.capabilities,
    originalUrl: source?.url || bot.references[0]?.url || '',
    license: bot.license || 'MIT', version: bot.version || '1.0.0', updatedAt: metadata.updatedAt,
    downloadUrl: relative, manifestUrl: `templates/${slug}/${bot.version || '1.0.0'}.json`,
    editUrl: `${repo}/edit/main/${bot.sourceFile.split('/').map(encodeURIComponent).join('/')}`,
    tags: bot.tags, color: bot.color, verification: { format: 'passed', realTask: 'not-tested' }
  });
}

const downloads = {
  roles: 'exports/awesome-bot-roles.fleet.json',
  workflows: 'exports/awesome-bot-workflows.fleet.json',
  all: 'exports/awesome-bot-all.fleet.json'
};
for (const collection of ['roles', 'workflows', 'all']) {
  const bots = collection === 'all' ? [...fleets.values()].flat() : fleets.get(collection) || [];
  if (bots.length > 200) { downloads[collection] = null; continue; }
  const built = materialize({ ok: true, id: `awesome/${collection}`, kind: 'bulk-export', rootVersion: '1.0.0', bots, sharedSkills: [], workflow: [], permissions: { tools: false, container: false, screen: false }, warnings: [] }, { now });
  if (!built.ok || built.bundle.bots.length !== bots.length) throw new Error(`Incomplete ${collection} export`);
  await writeFile(resolve(output, downloads[collection]), json(built.bundle));
}
const counts = { roles: entries.filter(item => item.collection === 'roles').length, workflows: entries.filter(item => item.collection === 'workflows').length, total: entries.length };
const data = { schema: 'awesome.bot.site/1', name: 'Awesome Bot', updatedAt: metadata.updatedAt, repositoryUrl: repo, categories: metadata.categories, counts, downloads, bulkLimit: 200, registryUrl: 'registry/index.json', entries };
await writeFile(resolve(output, 'catalogue.json'), json(data));
await writeFile(resolve(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
await writeFile(resolve(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://harzva.github.io/awesome-bot/</loc></url></urlset>\n');
console.log(JSON.stringify({ ok: true, output, ...counts, individualDownloads: entries.length }));
