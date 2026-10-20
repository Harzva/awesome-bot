import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { engineModule, root, readCatalogue } from './engine.mjs';
import { assertVersionImmutability } from './check-versions.mjs';
import { loadScenarios, renderStartGuide } from './scenarios.mjs';
import { loadEnglish, renderEnglishStartGuide, renderEnglishCatalogue } from './locales.mjs';

const { validateManifest, integrityOf, REGISTRY_SCHEMA } = await engineModule('manifest');
const { validateRegistry } = await engineModule('registry');
const { compare: compareVersions } = await engineModule('semver');
const check = process.argv.includes('--check');
const catalogue = await readCatalogue();
const scenarios = await loadScenarios(catalogue);
const englishContent = await loadEnglish(catalogue, scenarios);
const inventory = JSON.parse(await readFile(resolve(root, 'sources/grok-inventory.json'), 'utf8'));
const errors = [];
const expected = new Map();
const ids = new Set();
const categories = new Map(catalogue.categories.map((c) => [c.id, c.name]));
const sources = new Map(catalogue.sources.map((s) => [s.id, s]));
// Source mappings are maintained in the inventory; avoid manually duplicating them
// into every authored role. No upstream setting text is inserted here.
for (const item of inventory.marketplaceBots) {
  const bot = catalogue.bots.find((b) => b.id === item.localTemplateId);
  if (bot && !bot.references.some((r) => r.url === item.url)) {
    bot.references.push({ source: 'grok-marketplace', label: item.name, url: item.url });
  }
}

function demand(condition, message) { if (!condition) errors.push(message); }
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function cell(value) { return String(value).replace(/[<>[\]`]/g, '\\$&').replaceAll('|', '\\|').replaceAll('\n', ' '); }
function https(value) {
  if (typeof value !== 'string' || /[\s<>]/.test(value)) return false;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}
function templateFile(bot) { return `templates/${bot.id.split('/')[1]}/${bot.version}.json`; }

demand(catalogue.schema === 'awesome.bot.catalogue/1', 'Unknown catalogue schema');
// Upstream coverage is scoped to mapped entries. Community originals may have no
// Grok identifier and still participate in either public collection.
const roleBots = catalogue.bots.filter(b => b.upstreamMarketplaceId);
const taskBots = catalogue.bots.filter(b => b.upstreamUseCaseName);
demand(roleBots.length === inventory.marketplaceBotCount, 'Role count differs from reviewed marketplace inventory');
demand(taskBots.length === inventory.useCaseCount, 'Workflow count differs from reviewed use-case inventory');
demand(new Set(roleBots.map(b => b.upstreamMarketplaceId)).size === roleBots.length, 'Duplicate marketplace role mapping');
demand(new Set(taskBots.map(b => b.upstreamUseCaseName)).size === taskBots.length, 'Duplicate use-case mapping');
for (const item of inventory.marketplaceBots) demand(roleBots.some(b => b.upstreamMarketplaceId === item.id && b.id === item.localTemplateId), `Missing role mapping: ${item.id}`);
for (const item of inventory.useCases) demand(taskBots.some(b => b.upstreamUseCaseName === item.name && b.id === item.localTemplateId), `Missing workflow mapping: ${item.id}`);
for (const source of catalogue.sources) {
  demand(https(source.url), `Source must use HTTPS: ${source.id}`);
  demand(typeof source.checkedAt === 'string' && Number.isFinite(Date.parse(source.checkedAt)), `Source needs a valid checkedAt: ${source.id}`);
}

const latest = new Map();
for (const bot of catalogue.bots) {
  demand(!ids.has(bot.id), `Duplicate bot id: ${bot.id}`);
  ids.add(bot.id);
  demand(categories.has(bot.category), `Unknown category: ${bot.id}`);
  demand(bot.implementation === 'openbot-original', `Unclear implementation ownership: ${bot.id}`);
  for (const key of ['name', 'summary', 'mission', 'style', 'boundaries', 'welcome']) demand(typeof bot[key] === 'string' && !!bot[key].trim(), `${bot.id}.${key} must be nonempty text`);
  for (const key of ['inputs', 'outputs', 'workflow', 'requirements', 'quickPrompts']) demand(Array.isArray(bot[key]) && bot[key].length > 0 && bot[key].every(value => typeof value === 'string' && !!value.trim()), `${bot.id}.${key} must contain nonempty text`);
  for (const key of ['tags', 'capabilities']) demand(Array.isArray(bot[key]) && bot[key].every(value => typeof value === 'string' && !!value.trim()), `${bot.id}.${key} must be a text array`);
  demand(typeof bot.needsTools === 'boolean' && typeof bot.needsScreen === 'boolean', `${bot.id} must declare tool and screen requirements`);
  demand(Array.isArray(bot.references) && bot.references.length > 0, `No public reference: ${bot.id}`);
  for (const ref of bot.references || []) {
    demand(!ref.source || sources.has(ref.source), `Unknown source ${ref.source}: ${bot.id}`);
    demand(typeof ref.label === 'string' && !!ref.label.trim(), `Reference label required: ${bot.id}`);
    demand(https(ref.url), `Reference must use HTTPS: ${bot.id}`);
    demand(!ref.checkedAt || Number.isFinite(Date.parse(ref.checkedAt)), `Reference checkedAt must be a valid date: ${bot.id}`);
  }
  demand(bot.example && typeof bot.example.title === 'string' && typeof bot.example.prompt === 'string', `${bot.id}.example must have title and prompt`);
  if (errors.length) continue;
  const slug = bot.id.split('/')[1];
  demand(/^[a-z0-9][a-z0-9-]*$/.test(slug), `Invalid slug: ${bot.id}`);
  const persona = [
    `你是${bot.name}。${bot.mission}`,
    `工作方式：${bot.style}`,
    `开始前确认：${bot.inputs.join('；')}。缺失信息先说明；能用现有材料完成的部分继续推进。`,
    `执行顺序：\n${bot.workflow.map((step, i) => `${i + 1}. ${step}`).join('\n')}`,
    `交付内容：${bot.outputs.join('；')}。把事实、推断、待确认项分开，保留可核对的来源与日期。`,
    bot.boundaries,
    '只有取得宿主工具和对应账号授权后才能访问外部数据。没有连接时明确缺少什么，提供可审阅草稿，不声称已完成操作。发送消息、发布内容、付款、删除、变更账号或生产资源须按用户明确授权与宿主审批执行。',
    '长期身份和工作方式保留在本Bot；记忆只采用用户授权提供的内容，不读取或复制其他Bot的私有记忆。模板声明的能力取决于实际模型、Harness、工具与授权，不能仅凭角色名承诺执行。'
  ].join('\n\n');
  const manifest = {
    schema: 'openbot.market/1', kind: 'template', id: bot.id,
    version: bot.version, name: bot.name, summary: bot.summary,
    description: `${bot.mission} 输入：${bot.inputs.join('、')}。交付：${bot.outputs.join('、')}。这是OpenBot独立编写的模板，公开参考见来源字段。`,
    author: bot.author, license: bot.license,
    tags: [bot.category, ...bot.tags], openbot: bot.openbot || '>=0.9.9',
    capabilities: bot.capabilities,
    permissions: { tools: bot.needsTools, container: false, screen: bot.needsScreen, model: 'any' },
    bot: {
      name: bot.name, avatar: bot.avatar, color: bot.color,
      model: '', temperature: bot.temperature, persona,
      skills: bot.skills
    },
    defaultLocale: 'zh-CN',
    guidance: {
      welcome: bot.welcome, quickPrompts: bot.quickPrompts,
      taskExamples: [{ title: bot.example.title, prompt: bot.example.prompt }]
    },
    state: { version: 1, reads: 1, note: '模板仅声明人设与技能，不创建自定义持久数据格式；任务产物由宿主与用户另行管理。' },
    'x-origin': { implementation: 'openbot-original', affiliation: 'independent', references: bot.references, upstreamConfigurationImported: false },
    'x-collection': bot.collection,
    'x-requires': bot.requirements
  };
  const validation = validateManifest(manifest, bot.id);
  errors.push(...validation.errors);
  const file = templateFile(bot);
  expected.set(file, json(manifest));
  latest.set(bot.id, { bot, manifest, file, versions: [{ manifest, file }] });
}

if (errors.length) throw new Error(errors.join('\n'));

// Published older versions remain immutable source artifacts. A latest entry can
// advance its version without deleting the bytes an existing installation used.
for (const file of await jsonFiles('templates')) {
  if (expected.has(file)) continue;
  const bytes = await readFile(resolve(root, file), 'utf8');
  let old;
  try { old = JSON.parse(bytes); } catch { errors.push(`Invalid historical template: ${file}`); continue; }
  const current = latest.get(old.id);
  const checked = validateManifest(old, file);
  demand(checked.ok, `Invalid historical template: ${file}: ${checked.errors.join('; ')}`);
  demand(current && old.kind === 'template', `Unexpected template: ${file}`);
  demand(file === `templates/${String(old.id).split('/')[1]}/${old.version}.json`, `Historical filename must match ID and version: ${file}`);
  demand(current && checked.ok && compareVersions(old.version, current.manifest.version) < 0, `Historical version must precede latest entry: ${file}`);
  if (current && checked.ok && compareVersions(old.version, current.manifest.version) < 0) {
    current.versions.push({ manifest: old, file });
    expected.set(file, bytes);
  }
}
if (errors.length) throw new Error(errors.join('\n'));

let previous = null;
try { previous = JSON.parse(await readFile(resolve(root, 'registry/index.json'), 'utf8')); }
catch (error) { if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error; }
const entries = [];
for (const { bot, manifest, versions } of latest.values()) {
  const prior = previous?.entries?.find(entry => entry.id === bot.id);
  const resolvedVersions = [];
  for (const item of versions.sort((a, b) => compareVersions(b.manifest.version, a.manifest.version))) {
    const integrity = await integrityOf(item.manifest);
    const old = prior?.versions?.find(value => value.version === item.manifest.version && value.integrity === integrity);
    resolvedVersions.push({ version: item.manifest.version, url: `../${item.file}`, integrity, publishedAt: old?.publishedAt || catalogue.updatedAt });
  }
  entries.push({ id: bot.id, kind: 'template', name: bot.name, summary: bot.summary, tags: manifest.tags, verified: false, publisher: { name: bot.author.name }, versions: resolvedVersions });
}

const registry = { schema: REGISTRY_SCHEMA, name: 'Awesome Bot — OpenBot 原创模板（开发目录，未签名）', updatedAt: catalogue.updatedAt, entries };
errors.push(...validateRegistry(registry).errors);
expected.set('registry/index.json', json(registry));

const lines = [
  '# Awesome Bot 目录', '',
  `核验日期：${catalogue.updatedAt.slice(0, 10)}。${catalogue.bots.filter(b => b.collection === 'bot-role').length} 个 OpenBot 兼容原创角色模板 + ${catalogue.bots.filter(b => b.collection === 'task-workflow').length} 个任务工作流，均有来源记录。模板尚未完成逐项真实账号任务验收。`, '',
  `已收录 Grok Marketplace 的 ${inventory.marketplaceBots.length} 个公开条目（${inventory.officialTeamCategoryCount} 个带 Grok Bot Team 标签），以及 ${inventory.useCases.length} 个任务场景。完整逐项来源、作者与适配状态见 [来源清单](sources/grok-inventory.json)。部分详情公开显示设置文本；本目录没有复制这些文本或导入其账号连接与运行环境。`, '',
  '## Grok Marketplace 全量索引', '',
  `${inventory.marketplaceBotCount}个原平台条目均有对应的OpenBot原创角色模板，保留原作者和原平台创建链接。模板根据公开职责独立编写，不代表原配置兼容或相同行为。${inventory.useCaseCount}个参考任务工作流和社区新增条目在下方分别展示。`, '',
  '| 原 Bot | 作者 | 分类 | OpenBot 对应模板 |',
  '| --- | --- | --- | --- |'
];
for (const item of inventory.marketplaceBots) {
  const local = catalogue.bots.find((b) => b.id === item.localTemplateId);
  lines.push(`| [${cell(item.name)}](${item.url}) | ${cell(item.author || '未标注')} | ${cell(item.categories.join(' / ') || '未分类')} | ${local ? `[${cell(local.name)}](${templateFile(local)})` : '待适配：保留原平台入口'} |`);
}
for (const [collection, title] of [['bot-role', 'OpenBot 原创角色'], ['task-workflow', '原创任务工作流']]) {
lines.push('', `## ${title}`, '');
for (const [id, name] of categories) {
  const bots = catalogue.bots.filter((b) => b.category === id && b.collection === collection);
  if (!bots.length) continue;
  lines.push(`### ${name}`, '', '| Bot | 能做什么 | 公开参考 |', '| --- | --- | --- |');
  for (const bot of bots) {
    lines.push(`| [${cell(bot.name)}](${templateFile(bot)}) | ${cell(bot.summary)} | [${cell(bot.references[0].label)}](${bot.references[0].url}) |`);
  }
  lines.push('');
}
}
lines.push('## 来源', '');
for (const s of catalogue.sources) lines.push(`- [${s.name}](${s.url})，核验于 ${s.checkedAt.slice(0, 10)}。${s.note}`);
lines.push('');
expected.set('CATALOGUE.md', lines.join('\n'));
expected.set('START_HERE.md', renderStartGuide(scenarios));
expected.set('START_HERE.en.md', renderEnglishStartGuide(englishContent.scenarios));
expected.set('CATALOGUE.en.md', renderEnglishCatalogue(catalogue, englishContent));

if (errors.length) throw new Error(errors.join('\n'));

async function jsonFiles(dir) {
  let items;
  try { items = await readdir(resolve(root, dir), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const paths = [];
  for (const item of items) {
    const file = `${dir}/${item.name}`;
    if (item.isDirectory()) paths.push(...await jsonFiles(file));
    else if (file.endsWith('.json')) paths.push(file);
  }
  return paths;
}
// Check the prospective output against the prior Git snapshot and available
// release tags before writing any manifest or updating its integrity index.
await assertVersionImmutability({ root, planned: expected });
for (const [file, content] of expected) {
  const target = resolve(root, file);
  if (check) {
    let actual = null;
    try { actual = await readFile(target, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (actual !== content) errors.push(`Stale generated file: ${relative(root, target)}; run npm run build`);
  } else {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(JSON.stringify({ ok: true, mode: check ? 'check' : 'build', templates: entries.length, generatedFiles: expected.size, signed: false }));
