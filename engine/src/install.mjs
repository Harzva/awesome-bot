// 把安装计划落成「配置包」—— 直接复用主工程已有的 `openbot.fleet/1` 格式。
//
// 为什么不发明一种新的安装产物：fleet 包已经是「一次带走多个 bot + 共享技能」的
// 现成格式，主工程已经有导出/导入与冲突处理。市场再定义一套平行格式，
// 等于让「导入配置包」和「从市场安装」两条路各写一遍合并规则，迟早不一致。
// 所以这里的产物可以直接喂给 fleet.importBundle。
//
// 与 fleet 的差别只有一处，也是最重要的：**权限一律为 false**。
// 模板可以声明「我想要屏幕/工具」，但那只是展示；授予必须走用户的单独确认。
import { validateManifest } from './manifest.mjs';

const BOT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const SLUG = /[^a-z0-9]+/g;

function slugOf(templateId) {
  const tail = String(templateId || '').split('/').pop() || 'bot';
  let slug = tail.toLowerCase().replace(SLUG, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  if (!slug || !/^[a-z0-9]/.test(slug)) slug = `bot-${slug || 'template'}`.slice(0, 60);
  return slug;
}

function uniqueId(base, taken) {
  const root = BOT_ID.test(base) ? base : 'bot';
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i += 1) {
    const next = `${root}-${i}`.slice(0, 80);
    if (!taken.has(next)) return next;
  }
  return `${root}-${Date.now()}`.slice(0, 80);
}

function uniqueName(base, taken) {
  const root = String(base || '机器人').trim().slice(0, 40) || '机器人';
  if (!taken.has(root)) return root;
  for (let i = 2; i < 1000; i += 1) {
    const next = `${root.slice(0, 36)} ${i}`;
    if (!taken.has(next)) return next;
  }
  return `${root.slice(0, 30)} ${Date.now()}`;
}

/**
 * 生成可直接交给 fleet.importBundle 的配置包。
 * @param {object} plan        buildPlan 的返回值
 * @param {object} options
 *   options.existing    已有 bot 列表（[{id,name}]），用于避免撞车
 *   options.knownAvatars 已知角色 id 集合（可选）；给了就丢弃不存在的 avatar
 *   options.now         毫秒时间戳（测试可注入）
 */
export function materialize(plan, options = {}) {
  if (!plan || plan.ok !== true) {
    return { ok: false, message: '计划未通过，不能安装', bundle: null, report: null };
  }
  const existing = Array.isArray(options.existing) ? options.existing : [];
  const takenIds = new Set(existing.map((b) => (b && typeof b.id === 'string' ? b.id : '')).filter(Boolean));
  const takenNames = new Set(existing.map((b) => (b && typeof b.name === 'string' ? b.name : '')).filter(Boolean));
  const known = options.knownAvatars instanceof Set ? options.knownAvatars
    : (Array.isArray(options.knownAvatars) ? new Set(options.knownAvatars) : null);
  const now = Number.isFinite(options.now) ? options.now : Date.now();

  const report = { added: [], renamed: [], avatarDropped: [], permissionsWithheld: [], warnings: [...(plan.warnings || [])] };
  const bots = [];
  const provenance = [];

  for (const bot of plan.bots) {
    const wantedId = slugOf(bot.templateId);
    const id = uniqueId(wantedId, takenIds);
    takenIds.add(id);
    if (id !== wantedId) report.renamed.push({ from: wantedId, to: id, reason: 'id 已被占用' });

    let name = bot.instanceName || bot.name;
    const named = uniqueName(name, takenNames);
    if (named !== name) {
      report.renamed.push({ from: name, to: named, reason: '同名机器人已存在，改为副本' });
      name = named;
    }
    takenNames.add(name);

    let avatar = bot.avatar || '';
    if (avatar && known && !known.has(avatar)) {
      // 不硬失败：角色形象是锦上添花，缺了就退回默认，但要如实说。
      report.avatarDropped.push({ botId: id, avatar });
      avatar = '';
    }

    const entry = {
      id,
      name,
      color: bot.color || '',
      persona: bot.persona,
      model: bot.model || '',
      temperature: typeof bot.temperature === 'number' ? bot.temperature : 0.7,
      skills: (bot.skills || []).map((s) => ({ id: `s_${s.name}`, name: s.name, desc: s.desc })),
      files: [],
      messages: [],
      memory: { profile: '', journal: [] },
      summary: null,
      channels: {},
      // 权限：声明归声明，安装不授予。
      toolsEnabled: false,
      containerEnabled: false,
      createdAt: now
    };
    if (avatar) entry.avatar = avatar;
    bots.push(entry);

    provenance.push({
      botId: id,
      templateId: bot.templateId,
      templateVersion: bot.templateVersion,
      role: bot.role,
      permissions: { tools: false, container: false, screen: false }
    });
  }

  const asked = [];
  if (plan.permissions && plan.permissions.tools) asked.push('tools');
  if (plan.permissions && plan.permissions.container) asked.push('container');
  if (plan.permissions && plan.permissions.screen) asked.push('screen');
  if (asked.length) report.permissionsWithheld.push(...asked);

  const bundle = {
    schema: 'openbot.fleet/1',
    app: 'OpenBot',
    appVersion: '',
    exportedAt: now,
    device: 'market',
    mode: 'config',
    bots,
    shared: {
      skills: (plan.sharedSkills || []).map((s) => ({ id: `s_${s.name}`, name: s.name, desc: s.desc })),
      files: []
    }
  };

  // 自检：产物必须是合法的 fleet 包形状，字段错在这里就炸，不要等主工程导入时才失败。
  const problems = [];
  for (const b of bundle.bots) {
    if (!BOT_ID.test(b.id)) problems.push(`生成的 bot id 不合法：${b.id}`);
    if (!b.persona || !String(b.persona).trim()) problems.push(`${b.name} 没有可用的模板人设`);
    if (b.toolsEnabled !== false || b.containerEnabled !== false) problems.push(`${b.name} 权限没有清空`);
  }
  if (problems.length) return { ok: false, message: problems.join('；'), bundle: null, report };

  return {
    ok: true,
    message: `已生成 ${bots.length} 个机器人的配置包`,
    bundle,
    report,
    provenance,
    // 主工程落库时应把 provenance 存下来（模板升级要靠它认出「这个实例来自哪个模板」）。
    // 这里不改 bot 字段：fleet 导入只认已知字段，塞私有键会在导入时被丢掉。
    install: { id: plan.id, version: plan.rootVersion, kind: plan.kind, workflow: plan.workflow || [] },
    // 引导层同理，必须放在 fleet 包**外面**：它属于「装完该怎么跟用户打招呼」这段界面流程，
    // 不是机器人配置。放进 bot 字段会被导入吞掉，放进包顶层会被当成未知字段拒绝。
    // 语言落差（`partial`）也一起带出去 —— 主工程要能说出「界面是英文，它回话还是中文」。
    guidance: plan.guidance || null,
    // 安装记录：主工程直接存这一份，升级时原样传回来就能算出差异。
    // 没有它，「这个实例来自哪个模板的哪个版本」只能靠命名猜。
    record: {
      schema: 'openbot.market.installed/1',
      id: plan.id,
      kind: plan.kind,
      version: plan.rootVersion,
      installedAt: new Date(now).toISOString(),
      bots: provenance.map((p) => ({
        botId: p.botId,
        templateId: p.templateId,
        templateVersion: p.templateVersion,
        role: p.role
      })),
      // 记录的是模板**声明**的权限，不是授予状态 —— 字段名里带 declared，
      // 免得后面有人把 true 读成「已经给了」。授予状态在主工程，市场从不写。
      declaredPermissions: { ...(plan.permissions || { tools: false, container: false, screen: false }) }
    }
  };
}

/** 校验一份即将安装的模板内容（CLI 拉取后用）。 */
export function acceptFetched(raw, path = 'template') {
  return validateManifest(raw, path);
}
