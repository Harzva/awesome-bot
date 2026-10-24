// Offline, deterministic adaptation of reviewed snapshots. Never fetches or executes upstream code.
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { root } from './engine.mjs';
import { importedSources } from './imported-roles.mjs';
const check = process.argv.includes('--check');
if (process.argv.slice(2).some(arg => arg !== '--check')) throw new Error('Usage: sync-imported-roles.mjs [--check]');
const { data, roles } = await importedSources();
const zh = JSON.parse(await readFile(resolve(root, 'data/imported-role-translations.zh.json'), 'utf8'));
const translated = new Map(zh.map(row => [row.key, row]));
if (translated.size !== zh.length || translated.size !== roles.size) throw new Error('Translation coverage mismatch');
const categories = { development: 'engineering', engineering: 'engineering', marketing: 'marketing', creator: 'marketing', writing: 'marketing', ops: 'operations', finance: 'operations', legal: 'operations', personal: 'personal', fun: 'personal', productivity: 'general', meta: 'general', research: 'general', sales: 'sales', support: 'support', success: 'support', product: 'product' };
const json = data => `${JSON.stringify(data, null, 2)}\n`;
let count = 0;
for (const [key, role] of roles) {
  const t = translated.get(key);
  if (!t?.nameZh || !t.summaryZh || !categories[role.category]) throw new Error('Missing translated metadata or category: ' + key);
  const fullSlug = `${role.sourceId}-${role.upstreamId}`;
  const slug = fullSlug.length <= 48 ? fullSlug : `${fullSlug.slice(0, 39)}-${createHash('sha256').update(key).digest('hex').slice(0, 8)}`;
  const id = `awesome/${slug}`;
  const connections = role.integrations.filter(v => typeof v === 'string').join(', ');
  const enPrompt = `Help with this task using the ${role.upstreamName} role: [my goal]. First identify required materials, available connections and actions needing approval; then complete the authorized work and return a reviewable result.`;
  const zhPrompt = `请按「${t.nameZh}」的职责协助完成：[我的目标]。先核对材料、实际可用连接和需要审批的操作，再完成授权范围内的工作并交付可审阅结果。`;
  const provenance = { sourceId: role.sourceId, sourceName: role.source.name, upstreamBotId: role.upstreamId, upstreamName: role.upstreamName, repository: role.source.repository, revision: role.source.revision, path: role.upstreamPath, sha256: role.sha256, sourceUrl: role.sourceUrl, licenseUrl: role.source.licenseUrl, licenseSha256: role.source.licenseSha256, promptImported: true, promptLocale: 'en', adaptedBy: 'OpenBot contributors', changes: ['Added host permission, task-start and language contract', 'Localized listing metadata; preserved original English instructions', 'No installer, account, schedule or environment imported'], checkedAt: data.checkedAt };
  const common = { id, category: categories[role.category], implementation: 'third-party-adaptation', collection: 'bot-role', author: { name: role.source.author }, license: role.source.license, version: '1.0.0', openbot: '>=0.9.9', avatar: 'pal-peek', color: '#334155', temperature: 0.4, tags: ['community-import', role.sourceId, role.category], capabilities: [], needsTools: true, needsScreen: false, references: [{ label: `${role.source.name}: ${role.upstreamName}`, url: role.sourceUrl }, { label: `${role.source.license} license`, url: role.source.licenseUrl }], provenance };
  const chinese = { ...common, name: t.nameZh, summary: t.summaryZh, mission: t.summaryZh, style: '按来源角色的具体步骤工作，区分事实、推断与待确认事项，保留可核对证据。', boundaries: '原始角色指令以英文保留。宿主的权限、停止和用户授权规则优先；平台、账号、路径、预约与协作对象均需另行配置，不因导入而启用。', inputs: ['用户当前的具体目标与完成标准', '任务所需的已授权材料、时间范围与实际可用连接'], outputs: ['与角色职责相符的可审阅任务结果', '来源、缺失信息、未完成操作与下一步建议'], workflow: ['核对当前任务、材料、可用工具和授权范围', '依照配置中保留的原始角色步骤执行可完成部分', '核查证据与结果，说明缺口；需对外操作时按宿主审批'], requirements: [connections ? `来源涉及的连接：${connections}；需在宿主另行配置和授权。` : '提供任务材料；联网或工具操作需宿主实际支持并授权。', '原始角色步骤为英文，名称与摘要已本地化；回复语言由用户指定。', '格式与导出已检查，真实账号任务尚未逐项验收。'], skills: [{ name: t.nameZh, desc: t.summaryZh }], welcome: `我是${t.nameZh}。请提供当前目标与材料，我会先确认可执行范围。`, quickPrompts: ['请先列出本角色执行任务所需的材料、连接与权限。'], example: { title: `开始${t.nameZh}任务`, prompt: zhPrompt } };
  const english = { id, name: role.upstreamName, summary: role.summary, mission: role.summary, style: 'Follow the source role steps, distinguish facts from inferences and open questions, and retain checkable evidence.', boundaries: 'Original role instructions are preserved in English. Host permissions, stop controls and user authorization take precedence. Platforms, accounts, paths, routines and teammates require separate setup; import enables none of them.', inputs: ['The current user goal and completion criteria', 'Authorized task materials, time window and available connections'], outputs: ['A reviewable result matching the role responsibility', 'Sources, missing inputs, incomplete actions and suggested next steps'], workflow: ['Confirm the current task, materials, available tools and authorized scope', 'Apply the preserved source role steps to the work the host can perform', 'Check evidence and results, report gaps and use host approval for external actions'], requirements: [connections ? `Source integrations: ${connections}; configure and authorize them separately in the host.` : 'Provide task materials; network and tool actions require actual host support and authorization.', 'Original role instructions are in English; listing names and summaries are localized, and the user chooses the response language.', 'Format and export checked; real-account tasks have not been individually verified.'], skills: [{ name: role.upstreamName, desc: role.summary }], welcome: `I am ${role.upstreamName}. Share your current goal and materials so I can establish the executable scope.`, quickPrompts: ['List the materials, connections and permissions this role needs before starting.'], example: { title: `Start a ${role.upstreamName} task`, prompt: enPrompt } };
  for (const [file, contents] of [[`data/entries/${slug}.json`, chinese], [`data/locales/en/entries/${slug}.json`, english]]) {
    let old;try { old = await readFile(resolve(root, file), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    const text = json(contents);
    if (old === text) continue;
    if (old !== undefined) throw new Error(`Refusing to rewrite an existing role; review and version the source update: ${file}`);
    if (check) throw new Error(`Missing generated adaptation: ${file}`);
    await writeFile(resolve(root, file), text);
  }
  count++;
}
console.log(JSON.stringify({ ok: true, mode: check ? 'check' : 'sync', importedRoles: count, network: false }));
