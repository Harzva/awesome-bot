import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root } from './engine.mjs';

const SCHEMA = 'awesome.bot.scenario/1';
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const FIELDS = new Set(['schema', 'id', 'title', 'titleEn', 'summary', 'inputs', 'outputs', 'steps']);
const STEP_FIELDS = new Set(['botId', 'prompt', 'handoff']);
const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value);
function demand(condition, message) { if (!condition) throw new Error(`Invalid scenario: ${message}`); }

// Recipes describe a user-led handoff. They never create a second persona,
// runtime, permission model, or executable workflow.
export function validateScenarios(records, catalogue) {
  demand(Array.isArray(records) && records.length > 0, 'provide at least one record');
  const bots = new Map((catalogue?.bots || []).map(bot => [bot.id, bot]));
  const ids = new Set();
  return records.map(record => {
    demand(record && typeof record === 'object' && !Array.isArray(record), 'record must be an object');
    demand(Object.keys(record).every(key => FIELDS.has(key)), 'unknown record field');
    demand(record.schema === SCHEMA, 'unknown schema');
    demand(typeof record.id === 'string' && SLUG.test(record.id) && record.id !== 'all', 'invalid ID');
    demand(!ids.has(record.id), `duplicate ID ${record.id}`);
    ids.add(record.id);
    for (const key of ['title', 'titleEn', 'summary']) demand(text(record[key]), `${record.id}.${key} must be nonempty text`);
    for (const key of ['inputs', 'outputs']) {
      demand(Array.isArray(record[key]) && record[key].length > 0 && record[key].every(text), `${record.id}.${key} must contain nonempty text`);
    }
    demand(Array.isArray(record.steps) && record.steps.length >= 1 && record.steps.length <= 3, `${record.id} needs 1–3 steps`);
    const seen = new Set();
    const steps = record.steps.map(step => {
      demand(step && typeof step === 'object' && !Array.isArray(step) && Object.keys(step).every(key => STEP_FIELDS.has(key)), `${record.id} has an invalid step`);
      demand(typeof step.botId === 'string' && bots.has(step.botId), `${record.id} references an unknown Bot`);
      demand(!seen.has(step.botId), `${record.id} repeats a Bot`);
      seen.add(step.botId);
      demand(text(step.prompt) && text(step.handoff), `${record.id} needs a prompt and handoff for every step`);
      return { botId: step.botId, botName: bots.get(step.botId).name, prompt: step.prompt, handoff: step.handoff };
    });
    return {
      schema: SCHEMA, id: record.id, title: record.title, titleEn: record.titleEn, summary: record.summary,
      inputs: [...record.inputs], outputs: [...record.outputs], steps, botIds: steps.map(step => step.botId)
    };
  });
}

export async function loadScenarios(catalogue, { directory = resolve(root, 'data/scenarios') } = {}) {
  const files = await readdir(directory, { withFileTypes: true });
  const records = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    demand(file.isFile() && /^[a-z0-9][a-z0-9-]*\.json$/.test(file.name), `unexpected path ${file.name}`);
    const record = JSON.parse(await readFile(resolve(directory, file.name), 'utf8'));
    demand(record && record.id === file.name.slice(0, -5), `filename must match ID: ${file.name}`);
    records.push(record);
  }
  return validateScenarios(records, catalogue);
}

function markdown(value) { return String(value).replace(/[\\`*_[\]<>]/g, '\\$&').replaceAll('\n', ' '); }
function promptBlock(value) {
  const runs = value.match(/`+/g) || [];
  const fence = '`'.repeat(Math.max(3, ...runs.map(run => run.length + 1)));
  return [fence + 'text', value, fence];
}

export function renderStartGuide(scenarios) {
  const website = 'https://harzva.github.io/awesome-bot/';
  const lines = [
    '# 从一个任务开始', '',
    '<!-- Generated from data/scenarios/*.json; run npm run build. -->', '',
    '先选一个与你当前目标相符的场景，只下载需要的少量 Bot。场景包沿用目录中的同一份模板，不创建另一套人设。提示词和操作说明目前为中文。', '',
    '## 下载后怎么开始', '',
    '1. 下载场景配置包，在 OpenBot 的配置导入入口预览并确认。先检查 Bot 名称及数量；有同名项时按宿主提示处理。',
    '2. 选择要使用的模型；按实际任务连接需要的资料、工具和账号。下载或导入不会启动任务，也不会授予工具、容器或账号权限。',
    '3. 打开该场景的第一个 Bot，复制首个任务，把方括号占位内容替换为你已获准提供的资料，并附上准备材料，确认后发送。材料不完整时，先让 Bot 列出需要补充的内容。',
    '4. 审阅第一步的产物，再由你把已确认材料交给下一步 Bot。场景是人手交接的使用建议，不会自动编排或执行。', '',
    '普通 Bot 的导出配置默认关闭工具与容器。空库导入时，宿主可能把第一个 Bot 选为主 Bot；主 Bot 的管理能力遵循宿主现有规则，确认后再使用。详见 [导入与权限说明](INTEGRATION.md)。', '',
    '这些模板通过格式和导出检查，尚未逐项完成真实账号任务认证。外部操作仍取决于宿主、模型、连接的工具和用户授权；发送、发布或变更资源前审阅实际内容。', '',
    '## 选择场景', '',
    '| 目标 | Bot 数量 | 直接开始 |',
    '| --- | --- | --- |'
  ];
  for (const scenario of scenarios) {
    lines.push(`| [${markdown(scenario.title)}](#${scenario.id}) | ${scenario.steps.length} | [在市场中查看](${website}?scenario=${scenario.id}) · [下载配置](${website}exports/scenario-${scenario.id}.fleet.json) |`);
  }
  for (const scenario of scenarios) {
    lines.push('', `<a id="${scenario.id}"></a>`, `## ${markdown(scenario.title)}`, '', markdown(scenario.summary), '', '### 准备材料', '');
    for (const value of scenario.inputs) lines.push(`- ${markdown(value)}`);
    lines.push('', '### 预期交付', '');
    for (const value of scenario.outputs) lines.push(`- ${markdown(value)}`);
    lines.push('', '### 按顺序使用', '');
    scenario.steps.forEach((step, index) => {
      const link = `${website}?scenario=${scenario.id}&bot=${encodeURIComponent(step.botId)}`;
      lines.push(`#### ${index + 1}. [${markdown(step.botName)}](${link})`, '', ...promptBlock(step.prompt), '', `交接：${markdown(step.handoff)}`, '');
    });
  }
  lines.push('## 继续探索或反馈', '', '[浏览全部 Bot](https://harzva.github.io/awesome-bot/) · [完整目录](CATALOGUE.md) · [贡献指南](CONTRIBUTING.md)', '');
  return lines.join('\n');
}
