// Convert a reviewed public-source snapshot; this does not fetch or import accounts.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { root, readCatalogue } from './engine.mjs';

const input = process.argv[2];
const detailInput = process.argv[3];
if (!input || !detailInput) throw new Error('Usage: node scripts/sync-grok.mjs <reviewed-grok-evidence.json> <reviewed-grok-role-facts.json>');
const evidence = JSON.parse(await readFile(resolve(input), 'utf8'));
const details = JSON.parse(await readFile(resolve(detailInput), 'utf8'));
const facts = new Map(details.roles.map(role => [role.id, role]));
const catalogue = await readCatalogue();
const byName = new Map(catalogue.bots.filter((b) => b.upstreamUseCaseName).map((b) => [b.upstreamUseCaseName, b]));
const byMarketId = new Map(catalogue.bots.filter((b) => b.upstreamMarketplaceId).map((b) => [b.upstreamMarketplaceId, b]));
if (byName.size !== evidence.useCaseCount) throw new Error('Task coverage differs from the reviewed source count');
const related = {
  pg: 'Sales Outbound',
  'seo-aeo-desk': 'SEO / AEO Auditor',
  'mr-toms': 'Calendar Coordinator',
  'sales-call-coach': 'Sales Call Coach',
  'pitch-deck-coach': 'Presentation Designer',
  'ai-search-visibility': 'SEO / AEO Auditor',
  sherlock: 'Talent Scout',
  cooper: 'Daily Briefing Writer',
  'distro-bot': 'Social Media Manager',
  'proto-bot': 'Prototype Builder',
  'sell-bot': 'Sales Outbound',
  'qa-bot': 'Bug Reproduction',
  sequencer: 'Sales Outbound',
  'marketing-project-manager': 'Marketing Calendar Owner',
  'marketing-analyst': 'Paid Media',
  'performance-marketer': 'Paid Media',
  'market-researcher': 'Competitive Intelligence Analyst',
  'ebr-value-deck-builder': 'Deck Updater',
  'pipeline-health-and-forecast': 'Pipeline Analyst',
  'account-research': 'Account Research Specialist',
  'the-morning-newspaper': 'Daily Briefing Writer',
  'office-ops-desk': 'Executive Assistant',
  'call-follow-ups': 'Sales Call Coach',
  'apple-search-ads-review': 'Paid Media',
  'writing-bot': 'Newsletter Writer',
  frank: 'Executive Assistant',
  'customer-question-drafter': 'Ticket Triage Specialist',
  'customer-call-coach': 'Sales Call Coach',
  'account-book': 'Account Research Specialist',
  'dan-lanning': 'Sales Call Coach',
  leadsworth: 'CRM Operations Manager',
  tally: 'Paid Media',
  'site-audit': 'SEO / AEO Auditor',
  'x-brief': 'Daily Briefing Writer',
  'competitor-watching': 'Competitive Intelligence Analyst',
  fuse: 'Paid Media'
};
const ids = new Set();
const marketplaceBots = evidence.marketplaceBots.map((b) => {
  if (ids.has(b.id)) throw new Error(`Duplicate marketplace Bot: ${b.id}`);
  ids.add(b.id);
  const local = byMarketId.get(b.id);
  const fact = facts.get(b.id);
  if (!fact || fact.detailStatus !== 'verified' || !fact.purpose) throw new Error(`Missing verified public role purpose: ${b.id}`);
  const workflow = related[b.id] ? byName.get(related[b.id]) : null;
  if (!local) throw new Error(`Missing original role template for ${b.id}`);
  if (related[b.id] && !workflow) throw new Error(`Missing related task for ${b.id}`);
  return {
    id: b.id, name: b.name, author: b.creatorName, handle: b.handle,
    categories: b.categories,
    publicPurpose: fact.purpose,
    publicPurposeEvidence: { url: fact.sourceUrl, htmlSha256: fact.htmlSha256 },
    isFromGrokBotTeamCategory: b.isFromGrokBotTeamCategory,
    url: b.sourceUrl, originalAddUrl: b.addUrl, updatedAt: b.updatedAt,
    localTemplateId: local.id,
    relatedWorkflowTemplateId: workflow?.id || null,
    adaptationStatus: 'openbot-original-role',
    configurationImported: false,
    note: '对应OpenBot独立编写的职责模板，不是原Bot配置的转换或相同行为保证。'
  };
});
const useCases = evidence.useCases.map((u) => {
  const local = byName.get(u.name);
  if (!local) throw new Error(`Missing task template: ${u.name}`);
  return {
    id: `use-case/${local.id.split('/')[1]}`, name: u.name, localName: local.name,
    category: u.category, url: u.sourceUrl, originalAddUrl: u.addUrl,
    localTemplateId: local.id, adaptationStatus: 'openbot-original', configurationImported: false
  };
});
if (marketplaceBots.length !== evidence.marketplaceBotCount || useCases.length !== evidence.useCaseCount) throw new Error('Source count mismatch');
const inventory = {
  schema: 'awesome.bot.upstream-inventory/1',
  checkedAt: details.retrievedAt,
  listingSnapshotAt: evidence.retrievedAt,
  checkedTimezone: 'Asia/Shanghai',
  marketplaceBotCount: marketplaceBots.length,
  officialTeamCategoryCount: evidence.officialTeamCategoryCount,
  useCaseCount: useCases.length,
  marketplaceCategoryCounts: evidence.marketplaceCategoryCounts,
  useCaseCategoryCounts: evidence.useCaseCategoryCounts,
  collectionMethod: evidence.collectionMethod,
  sources: evidence.sources,
  completenessChecks: evidence.completenessChecks,
  marketplaceBots, useCases,
  limitations: [
    '公开目录快照；新增、移除或登录后内容可能变化。',
    'Grok Bot Team是来源页面的分类标签，和OpenBot发布者签名及实际安装状态无关。',
    '部分详情可看到设置文本，未复制人设、技能正文或图片，未导入原平台配置、凭据或运行环境。',
    '市场角色和任务场景分别保留；相关任务映射不表示原Bot的功能已完整适配。'
  ]
};
await mkdir(resolve(root, 'sources'), { recursive: true });
await writeFile(resolve(root, 'sources/grok-inventory.json'), `${JSON.stringify(inventory, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, marketplaceBots: marketplaceBots.length, useCases: useCases.length, localRoleMappings: marketplaceBots.filter((b) => b.localTemplateId).length, relatedWorkflows: marketplaceBots.filter((b) => b.relatedWorkflowTemplateId).length }));
