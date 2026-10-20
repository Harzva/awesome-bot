import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './engine.mjs';

export const ENGLISH_CATEGORIES = {
  general: 'General assistance', sales: 'Sales and outreach', marketing: 'Marketing and content',
  support: 'Customer success and support', people: 'Recruiting and people', operations: 'Operations and finance',
  engineering: 'Engineering and development', design: 'Design and creative', product: 'Product and feedback', personal: 'Personal life'
};
const FIELDS = ['id', 'name', 'summary', 'mission', 'style', 'boundaries', 'inputs', 'outputs', 'workflow', 'requirements', 'skills', 'welcome', 'quickPrompts', 'example'];
const TEXT = ['name', 'summary', 'mission', 'style', 'boundaries', 'welcome'];
const ARRAYS = ['inputs', 'outputs', 'workflow', 'requirements', 'quickPrompts'];
const english = value => typeof value === 'string' && value.trim().length > 0 && !/[\p{Script=Han}\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value);
const demand = (condition, message) => { if (!condition) throw new Error(`Invalid English content: ${message}`); };
const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === expected.length && Object.keys(value).every(key => expected.includes(key));

export function validateEnglishEntry(record, original) {
  demand(keys(record, FIELDS), `${original.id}: exact entry fields required`);
  demand(record.id === original.id, `${original.id}: identity mismatch`);
  for (const key of TEXT) demand(english(record[key]), `${original.id}.${key}: nonempty English required`);
  for (const key of ARRAYS) demand(Array.isArray(record[key]) && record[key].length === original[key].length && record[key].every(english), `${original.id}.${key}: translate every item`);
  demand(Array.isArray(record.skills) && record.skills.length === original.skills.length && record.skills.every(skill => keys(skill, ['name', 'desc']) && english(skill.name) && english(skill.desc)), `${original.id}.skills: translate every skill`);
  demand(keys(record.example, ['title', 'prompt']) && english(record.example.title) && english(record.example.prompt), `${original.id}.example: translate title and prompt`);
  return { ...original, ...structuredClone(record) };
}

export function validateEnglishScenario(record, original, bots) {
  demand(keys(record, ['id', 'title', 'summary', 'inputs', 'outputs', 'steps']) && record.id === original.id, `${original.id}: exact scenario fields required`);
  for (const key of ['title', 'summary']) demand(english(record[key]), `${original.id}.${key}`);
  for (const key of ['inputs', 'outputs']) demand(Array.isArray(record[key]) && record[key].length === original[key].length && record[key].every(english), `${original.id}.${key}`);
  demand(Array.isArray(record.steps) && record.steps.length === original.steps.length, `${original.id}: step count mismatch`);
  const byId = new Map(bots.map(bot => [bot.id, bot]));
  const steps = record.steps.map((step, i) => {
    demand(keys(step, ['botId', 'prompt', 'handoff']) && step.botId === original.steps[i].botId && byId.has(step.botId) && english(step.prompt) && english(step.handoff), `${original.id}: translate the same ordered handoff`);
    return { ...step, botName: byId.get(step.botId).name };
  });
  return { ...original, ...structuredClone(record), titleEn: record.title, steps, botIds: steps.map(step => step.botId) };
}

async function recordsAt(directory) {
  const files = await readdir(directory, { withFileTypes: true });
  const result = new Map();
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    demand(file.isFile() && /^[a-z0-9][a-z0-9-]*\.json$/.test(file.name), `unexpected path ${file.name}`);
    const data = JSON.parse(await readFile(resolve(directory, file.name), 'utf8'));
    demand(data.id?.split('/').pop() === file.name.slice(0, -5), `filename mismatch ${file.name}`);
    demand(!result.has(data.id), `duplicate ${data.id}`);
    result.set(data.id, data);
  }
  return result;
}

export async function loadEnglish(catalogue, scenarios, { directory = resolve(root, 'data/locales/en') } = {}) {
  const entries = await recordsAt(resolve(directory, 'entries'));
  const ids = new Set(catalogue.bots.map(bot => bot.id));
  for (const id of entries.keys()) demand(ids.has(id), `orphan entry ${id}`);
  const bots = [];
  for (const bot of catalogue.bots) {
    if (entries.has(bot.id)) bots.push(validateEnglishEntry(entries.get(bot.id), bot));
    else demand(!bot.upstreamMarketplaceId && !bot.upstreamUseCaseName, `missing translation ${bot.id}`);
  }
  const recipeRecords = await recordsAt(resolve(directory, 'scenarios'));
  demand(recipeRecords.size === scenarios.length, 'scenario coverage mismatch');
  const recipes = scenarios.map(scenario => validateEnglishScenario(recipeRecords.get(scenario.id), scenario, bots));
  const categories = catalogue.categories.map(item => ({ id: item.id, name: ENGLISH_CATEGORIES[item.id] || item.id }));
  return { bots, scenarios: recipes, categories, coverage: { translated: bots.length, total: catalogue.bots.length } };
}

export function englishPersona(bot) {
  return [
    `You are ${bot.name}. ${bot.mission}`,
    `Working style: ${bot.style}`,
    `Before starting, confirm: ${bot.inputs.join('; ')}. State any missing information and continue with the parts the available materials support.`,
    `Steps:\n${bot.workflow.map((step, i) => `${i + 1}. ${step}`).join('\n')}`,
    `Deliver: ${bot.outputs.join('; ')}. Separate facts, inferences and items awaiting confirmation. Keep checkable sources and dates.`,
    bot.boundaries,
    'Access external data only through host tools and accounts the user has authorized. If a connection is unavailable, explain the gap and prepare a reviewable draft; do not claim an action was completed. Sending, publishing, payments, deletion, account changes and production changes require the user\'s explicit authorization and the host\'s approval flow.',
    'Keep this Bot\'s identity and working style. Use only memory the user has authorized; do not read or copy another Bot\'s private memory. Execution depends on the actual model, harness, tools and permissions. A role name alone does not establish a capability.'
  ].join('\n\n');
}

export function localizePlan(plan, bot) {
  demand(plan?.ok === true && plan.bots.length === 1 && plan.bots[0].templateId === bot.id, `cannot localize a different plan ${bot.id}`);
  return { ...plan, bots: plan.bots.map(item => ({ ...item, name: bot.name, persona: englishPersona(bot), skills: structuredClone(bot.skills) })) };
}

export function renderEnglishStartGuide(scenarios) {
  const base = 'https://harzva.github.io/awesome-bot/';
  const lines = ['# Start with one task', '', '<!-- Generated from data/locales/en; run npm run build. -->', '',
    'Choose a goal and download only the one or two Bots you need. English downloads are localized configuration projections of the same source roles, not rewritten versions of the published Chinese manifests.', '',
    '## After downloading', '',
    '1. Preview and confirm the Fleet configuration in OpenBot. Check the names and Bot count, and follow the host\'s collision handling.',
    '2. Select a model and connect only the materials, tools and accounts needed for your task. Downloading or importing does not start a task or grant access.',
    '3. Open the first Bot, copy its task prompt, replace the placeholders with authorized materials, review it and send it. Ask for a list of missing inputs when needed.',
    '4. Review the output before manually handing the confirmed materials to the next Bot. These recipes do not run or orchestrate themselves.', '',
    'Exports keep tools and containers off, with empty accounts, conversations and memory. In an empty library, the host may choose the first imported Bot as its primary Bot; its management capabilities follow the host\'s rules. Review the host before use.', '',
    'Format and export checks do not certify real-account task execution. Source references describe public roles; the OpenBot implementations and their role marks are independent.', '',
    '## Pick a goal', ''];
  for (const scenario of scenarios) {
    lines.push(`## ${scenario.title}`, '', scenario.summary, '', `[Open scenario](${base}?lang=en&scenario=${scenario.id}) · [Download ${scenario.botIds.length} Bot configuration](${base}exports/en/scenario-${scenario.id}.fleet.json)`, '', '### Materials', '', ...scenario.inputs.map(item => `- ${item}`), '', '### Expected outputs', '', ...scenario.outputs.map(item => `- ${item}`), '', '### Steps', '');
    scenario.steps.forEach((step, i) => {
      const fence = '`'.repeat(Math.max(3, ...(step.prompt.match(/`+/g) || []).map(run => run.length + 1)));
      lines.push(`#### ${i + 1}. ${step.botName}`, '', fence + 'text', step.prompt, fence, '', `Handoff: ${step.handoff}`, '');
    });
  }
  lines.push('[Browse the English market](https://harzva.github.io/awesome-bot/?lang=en) · [Contribute](CONTRIBUTING.md)', '');
  return lines.join('\n');
}

export function renderEnglishCatalogue(catalogue, content) {
  const cell = value => String(value).replace(/[\\|\[\]<>`]/g, '\\$&').replaceAll('\n', ' ');
  const lines = ['# Awesome Bot catalogue', '', '<!-- Generated from canonical roles and data/locales/en; run npm run build. -->', '',
    `${content.bots.length} English role and task configurations. Public source roles are references; OpenBot personas, workflows and role marks are independently authored. Format checks do not certify real-account execution.`, '',
    '[English market](https://harzva.github.io/awesome-bot/?lang=en) · [First task](START_HERE.en.md) · [Agent integration](docs/agent-integration.md)', ''];
  for (const [collection, title] of [['bot-role', 'Bot roles'], ['task-workflow', 'Task workflows']]) {
    const bots = content.bots.filter(bot => bot.collection === collection);
    lines.push(`## ${title} (${bots.length})`, '', '| Bot | Work area | Responsibility | Source |', '| --- | --- | --- | --- |');
    for (const bot of bots) lines.push(`| [${cell(bot.name)}](https://harzva.github.io/awesome-bot/?lang=en&bot=${encodeURIComponent(bot.id)}) | ${cell(ENGLISH_CATEGORIES[bot.category] || bot.category)} | ${cell(bot.summary)} | [Public reference](${bot.references[0].url}) |`);
    lines.push('');
  }
  return lines.join('\n');
}
