import { mkdir, readdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, readCatalogue, engineModule } from './engine.mjs';
import { loadScenarios } from './scenarios.mjs';
import { loadEnglish, localizePlan, englishPersona } from './locales.mjs';
import { avatarPath, avatarSVG } from './avatars.mjs';
import { writeAgentSurface } from './agent-surface.mjs';
import { writeExternalProjects } from './external-projects.mjs';
import { writeSharedBots } from './shared-bots.mjs';

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
const recipes = await loadScenarios(metadata);
const englishContent = await loadEnglish(metadata, recipes);
const packageMetadata = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const englishById = new Map(englishContent.bots.map(bot => [bot.id, bot]));
const inventory = JSON.parse(await readFile(resolve(root, 'sources/grok-inventory.json'), 'utf8'));
const { loadCatalogue } = await engineModule('catalogue');
const { createLoader } = await engineModule('sources');
const { buildPlan } = await engineModule('plan');
const { materialize } = await engineModule('install');
const registry = await loadCatalogue([resolve(root, 'registry/index.json')]);
const loader = createLoader(registry);
const entries = [];
const fleets = new Map();
const plansById = new Map();
const englishPlans = new Map();
const englishEntries = [];
const now = Date.parse(metadata.updatedAt);
const repo = 'https://github.com/Harzva/awesome-bot';
const json = value => `${JSON.stringify(value, null, 2)}\n`;

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(resolve(output, '.awesome-bot-build'), 'awesome.bot.site/1\n');
await cp(resolve(root, 'site'), output, { recursive: true });
// A refreshed homepage must load the scripts/styles that match its catalogue,
// even when the visitor has the previous release's asset URLs cached.
const indexFile = resolve(output, 'index.html');
const indexHtml = await readFile(indexFile, 'utf8');
await writeFile(indexFile, indexHtml.replace(/((?:href|src)=["'])(\.\/(?:styles\.css|navigation\.js|app\.js))(["'])/g,
  (_, prefix, asset, suffix) => `${prefix}${asset}?v=${encodeURIComponent(packageMetadata.version)}${suffix}`));
await cp(resolve(root, 'templates'), resolve(output, 'templates'), { recursive: true });
await cp(resolve(root, 'registry'), resolve(output, 'registry'), { recursive: true });
await cp(resolve(root, 'sources'), resolve(output, 'sources'), { recursive: true });
await writeFile(resolve(output, '.nojekyll'), '');
await mkdir(resolve(output, 'avatars'), { recursive: true });
// Keep the original artwork notice and provenance with the distributed images,
// including a Pages artifact that does not contain the source checkout.
await cp(resolve(root, 'scripts/vendor/openbot-characters/LICENSE'), resolve(output, 'avatars/LICENSE.txt'));
await cp(resolve(root, 'scripts/vendor/openbot-characters/PROVENANCE.json'), resolve(output, 'avatars/PROVENANCE.json'));

for (const bot of metadata.bots) {
  const plan = await buildPlan({ id: bot.id, entries: registry.entries, loadManifest: loader, openbotVersion: metadata.targetOpenBotVersion || '0.9.9' });
  if (!plan.ok || plan.bots.length !== 1) throw new Error(`Invalid single template plan: ${bot.id}: ${plan.errors?.join('; ')}`);
  plansById.set(bot.id, plan);
  const built = materialize(plan, { now });
  if (!built.ok) throw new Error(built.message);
  const slug = bot.id.split('/')[1];
  await writeFile(resolve(output, avatarPath(bot.id)), avatarSVG(bot));
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
  const entry = {
    id: bot.id, name: bot.name, sourceName: source?.name || bot.provenance?.upstreamName || '', sourceAuthor: source?.author || bot.sourceContext?.source.author || '',
    implementation: bot.implementation, ...(bot.provenance ? { provenance: bot.provenance, sourceMarket: bot.provenance.sourceName, promptLocale: 'en', sourcePrompt: bot.sourceContext.body } : {}),
    author: typeof bot.author === 'string' ? bot.author : bot.author?.name || 'OpenBot contributors',
    collection, category: bot.category, summary: bot.summary, mission: bot.mission, style: bot.style,
    inputs: bot.inputs, outputs: bot.outputs, workflow: bot.workflow,
    requirements: bot.requirements, skills: bot.skills, persona: manifest.bot.persona,
    starterPrompt: bot.example?.prompt || '',
    guidance: { welcome: bot.welcome, quickPrompts: bot.quickPrompts, taskExamples: [bot.example] },
    permissions: manifest.permissions, capabilities: bot.capabilities,
    originalUrl: source?.url || bot.references[0]?.url || '',
    license: bot.license || 'MIT', version: bot.version || '1.0.0', updatedAt: metadata.updatedAt,
    downloadUrl: relative, manifestUrl: `templates/${slug}/${bot.version || '1.0.0'}.json`,
    editUrl: `${repo}/edit/main/${bot.sourceFile.split('/').map(encodeURIComponent).join('/')}`,
    tags: bot.tags, color: bot.color, iconUrl: avatarPath(bot.id), contentLocale: 'zh',
    verification: { format: 'passed', realTask: 'not-tested' }
  };
  entries.push(entry);
  const translated = englishById.get(bot.id);
  if (translated) {
    const englishPlan = localizePlan(plan, translated);
    englishPlans.set(bot.id, englishPlan);
    const builtEnglish = materialize(englishPlan, { now });
    if (!builtEnglish.ok || builtEnglish.bundle.bots.length !== 1) throw new Error(`Incomplete English export: ${bot.id}`);
    const englishDownload = `exports/en/${slug}.fleet.json`;
    await mkdir(dirname(resolve(output, englishDownload)), { recursive: true });
    await writeFile(resolve(output, englishDownload), json(builtEnglish.bundle));
    englishEntries.push({ ...entry,
      ...Object.fromEntries(['name', 'summary', 'mission', 'style', 'inputs', 'outputs', 'workflow', 'requirements', 'skills'].map(key => [key, translated[key]])),
      persona: englishPersona(translated), starterPrompt: translated.example.prompt,
      guidance: { welcome: translated.welcome, quickPrompts: translated.quickPrompts, taskExamples: [translated.example] },
      downloadUrl: englishDownload, contentLocale: 'en',
      editUrl: `${repo}/edit/main/data/locales/en/entries/${slug}.json`
    });
  }
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
const scenarios = [];
for (const recipe of recipes) {
  const selected = recipe.botIds.flatMap(id => plansById.get(id)?.bots || []);
  if (selected.length !== recipe.steps.length) throw new Error(`Incomplete scenario plan: ${recipe.id}`);
  const built = materialize({
    ok: true, id: `awesome/scenario-${recipe.id}`, kind: 'bulk-export', rootVersion: '1.0.0',
    bots: selected, sharedSkills: [], workflow: [], warnings: [],
    permissions: { tools: false, container: false, screen: false }
  }, { now });
  if (!built.ok || built.bundle.bots.length !== recipe.steps.length) throw new Error(`Incomplete scenario export: ${recipe.id}`);
  const downloadUrl = `exports/scenario-${recipe.id}.fleet.json`;
  await writeFile(resolve(output, downloadUrl), json(built.bundle));
  scenarios.push({ ...recipe, downloadUrl });
}
const englishDownloads = {};
for (const collection of ['roles', 'workflows', 'all']) {
  const selected = englishEntries.filter(entry => collection === 'all' || entry.collection === collection);
  if (selected.length > 200) { englishDownloads[collection] = null; continue; }
  const built = materialize({ ok: true, id: `awesome/en-${collection}`, kind: 'bulk-export', rootVersion: '1.0.0', bots: selected.flatMap(entry => englishPlans.get(entry.id).bots), sharedSkills: [], workflow: [], permissions: { tools: false, container: false, screen: false }, warnings: [] }, { now });
  if (!built.ok || built.bundle.bots.length !== selected.length) throw new Error(`Incomplete English ${collection} export`);
  const path = `exports/en/awesome-bot-${collection}.fleet.json`;
  await writeFile(resolve(output, path), json(built.bundle));
  englishDownloads[collection] = path;
}
const englishScenarios = [];
for (const recipe of englishContent.scenarios) {
  const built = materialize({ ok: true, id: `awesome/en-scenario-${recipe.id}`, kind: 'bulk-export', rootVersion: '1.0.0', bots: recipe.botIds.flatMap(id => englishPlans.get(id).bots), sharedSkills: [], workflow: [], permissions: { tools: false, container: false, screen: false }, warnings: [] }, { now });
  if (!built.ok || built.bundle.bots.length !== recipe.botIds.length) throw new Error(`Incomplete English scenario: ${recipe.id}`);
  const downloadUrl = `exports/en/scenario-${recipe.id}.fleet.json`;
  await writeFile(resolve(output, downloadUrl), json(built.bundle));
  englishScenarios.push({ ...recipe, downloadUrl });
}
const counts = { roles: entries.filter(item => item.collection === 'roles').length, workflows: entries.filter(item => item.collection === 'workflows').length, total: entries.length };
const common = { schema: 'awesome.bot.site/1', name: 'Awesome Bot', updatedAt: metadata.updatedAt, repositoryUrl: repo, bulkLimit: 200, registryUrl: 'registry/index.json', agentIndexUrl: 'agents/index.json', llmsUrl: 'llms.txt', contentRevision: packageMetadata.version };
const englishData = { ...common, contentLocale: 'en', categories: englishContent.categories, entries: englishEntries, scenarios: englishScenarios, downloads: englishDownloads, counts: { roles: englishEntries.filter(item => item.collection === 'roles').length, workflows: englishEntries.filter(item => item.collection === 'workflows').length, total: englishEntries.length }, coverage: englishContent.coverage };
const data = { ...common, contentLocale: 'zh', categories: metadata.categories, counts, downloads, scenarios, entries, locales: { en: englishData } };
await writeFile(resolve(output, 'catalogue.json'), json(data));
await writeFile(resolve(output, 'catalogue.en.json'), json(englishData));
const agents = await writeAgentSurface({ output, catalogues: { zh: data, en: englishData }, contentRevision: packageMetadata.version });
await writeExternalProjects({ output, version: packageMetadata.version });
await writeSharedBots({ output, version: packageMetadata.version });
await writeFile(resolve(output, 'robots.txt'), 'User-agent: *\nAllow: /\n');
await writeFile(resolve(output, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://harzva.github.io/awesome-bot/</loc></url><url><loc>https://harzva.github.io/awesome-bot/resources.html</loc></url><url><loc>https://harzva.github.io/awesome-bot/resources.en.html</loc></url><url><loc>https://harzva.github.io/awesome-bot/shared-bots.html</loc></url></urlset>\n');
console.log(JSON.stringify({ ok: true, output, ...counts, individualDownloads: entries.length, scenarioDownloads: scenarios.length, englishEntries: englishEntries.length, agentCards: agents.cards }));
