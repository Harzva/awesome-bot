// 模板 / 组件包的格式校验、规范化与完整性摘要。
//
// 三条硬规则（与 docs/marketplace.md 对应，改这里必须改文档）：
// 1. **模板只装声明式内容**：人设文本、技能卡描述、知识文件文本。
//    没有安装脚本、没有钩子、没有可执行文件。市场装的是「一个角色的说明」，
//    不是「一段在你机器上跑起来的代码」—— 后者比 pm 脚本危险得多，
//    因为它拿到的是用户全部对话与凭据的上下文。
// 2. **凭据永不进模板**：任何 apiKey / token / secret / 授权头都直接判不合格。
// 3. **权限只声明、不授予**：`permissions` 说明这个角色「想用」什么，
//    安装产物里的 toolsEnabled/containerEnabled 一律 false，授予是用户后续单独的动作，
//    和主 Bot 权限闭环用同一套审批，不走市场这条捷径。
import { valid as validVersion } from './semver.mjs';
import { normalizeLocale, guidanceFields } from './guidance.mjs';

export const SCHEMA = 'openbot.market/1';
export const REGISTRY_SCHEMA = 'openbot.market.registry/1';

const ID = /^[a-z0-9][a-z0-9-]{0,31}\/[a-z0-9][a-z0-9-]{0,47}$/;
const BOT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const AVATAR = /^[a-z][a-z0-9_-]{0,31}$/;

const MAX = {
  name: 40, summary: 200, description: 4000, persona: 8000,
  skills: 30, skillName: 40, skillDesc: 600, tags: 10, tag: 24,
  templates: 20, sharedSkills: 30, license: 40, url: 300, author: 60,
  // 引导层：欢迎语是装完之后的第一句话，是承诺，不是介绍 —— 短一点才逼作者写实话。
  welcome: 300, prompts: 6, prompt: 80, examples: 6, exampleTitle: 40, examplePrompt: 500,
  // 状态格式版本只到 999：这个数字是给人读的，不是给机器排序的，越大越不好记。
  stateVersion: 999, stateNote: 200
};

// 任何一层出现这些键就拒绝。不做「只查顶层」：藏在 skill.desc 里的对象同样能进上下文。
const FORBIDDEN_KEY = /^(scripts?|postinstall|preinstall|install|prepare|exec|execu\w*|cmd|shell|hooks?|api[_-]?key|apikey|token|secret|password|authorization|credential|credentials|cookie)$/i;

const TEMPLATE_TOP = new Set([
  'schema', 'kind', 'id', 'version', 'name', 'summary', 'description', 'author', 'license',
  'tags', 'openbot', 'capabilities', 'permissions', 'bot', 'homepage', 'icon', 'signature',
  'defaultLocale', 'guidance', 'i18n', 'state'
]);
const BUNDLE_TOP = new Set([
  'schema', 'kind', 'id', 'version', 'name', 'summary', 'description', 'author', 'license',
  'tags', 'openbot', 'capabilities', 'permissions', 'templates', 'sharedSkills', 'workflow', 'homepage', 'icon', 'signature',
  'defaultLocale', 'guidance', 'i18n'
]);
const BOT_TOP = new Set([
  'name', 'avatar', 'color', 'persona', 'skills', 'model', 'temperature', 'notes'
]);
// 引导层只认这三个字段。名字与 Octop 的 welcome_message / quick_prompts / task_examples 对应，
// 但保持本项目已有的 camelCase（`sharedSkills`、`instanceName` 都是这个风格）。
const GUIDANCE_TOP = new Set(['welcome', 'quickPrompts', 'taskExamples']);

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string';
const trim = (v) => (typeof v === 'string' ? v.trim() : '');

function scanForbidden(value, path, errors) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => scanForbidden(v, `${path}[${i}]`, errors));
    return;
  }
  if (!isObj(value)) return;
  for (const key of Object.keys(value)) {
    // `x-` 扩展位对 checkUnknown 是放行的，所以这里必须剥掉前缀再查一次：
    // 否则 `x-postinstall` 就能绕过整条禁令，而这正是最容易被利用的写法。
    const bare = key.replace(/^x-/i, '');
    if (FORBIDDEN_KEY.test(key) || FORBIDDEN_KEY.test(bare)) {
      errors.push(`${path}.${key}：市场不允许出现可执行或凭据类字段`);
      continue;
    }
    scanForbidden(value[key], `${path}.${key}`, errors);
  }
}

function checkUnknown(value, allowed, path, errors) {
  for (const key of Object.keys(value)) {
    if (allowed.has(key)) continue;
    if (key.startsWith('x-')) continue; // 扩展位，允许但下游忽略
    errors.push(`${path}.${key}：未知字段（拼错会静默丢内容，这里直接报错）`);
  }
}

function checkPermissions(input, path, errors) {
  if (input === undefined) return { tools: false, container: false, screen: false, model: 'any' };
  if (!isObj(input)) { errors.push(`${path}.permissions：必须是对象`); return null; }
  const allowed = new Set(['tools', 'container', 'screen', 'model']);
  checkUnknown(input, allowed, `${path}.permissions`, errors);
  const out = { tools: false, container: false, screen: false, model: 'any' };
  for (const key of ['tools', 'container', 'screen']) {
    if (input[key] === undefined) continue;
    if (typeof input[key] !== 'boolean') { errors.push(`${path}.permissions.${key}：必须是布尔值`); continue; }
    out[key] = input[key];
  }
  if (input.model !== undefined) {
    if (!['any', 'none'].includes(input.model)) errors.push(`${path}.permissions.model：只能是 any 或 none`);
    else out.model = input.model;
  }
  return out;
}

function cleanSkill(skill, path, errors) {
  if (!isObj(skill)) { errors.push(`${path}：技能卡必须是对象`); return null; }
  checkUnknown(skill, new Set(['name', 'desc']), path, errors);
  const name = trim(skill.name);
  const desc = trim(skill.desc);
  if (!name) errors.push(`${path}.name：技能卡必须有名字`);
  if (name.length > MAX.skillName) errors.push(`${path}.name：超过 ${MAX.skillName} 字`);
  if (desc.length > MAX.skillDesc) errors.push(`${path}.desc：超过 ${MAX.skillDesc} 字`);
  return name ? { name, desc } : null;
}

/**
 * 引导层里「一串一句话」的校验（quickPrompts）。
 * 空串是没写完；重复是界面上同一句话出现两次，用户会以为是两个入口；超长是没压缩。
 */
function cleanPromptList(input, path, errors) {
  const out = [];
  if (!Array.isArray(input)) { errors.push(`${path}：必须是数组`); return out; }
  if (input.length > MAX.prompts) errors.push(`${path}：最多 ${MAX.prompts} 条（再多界面就得滚，等于没给）`);
  const seen = new Set();
  for (const [i, item] of input.slice(0, MAX.prompts).entries()) {
    const at = `${path}[${i}]`;
    if (!isText(item)) { errors.push(`${at}：必须是文本`); continue; }
    const text = item.trim();
    if (!text) { errors.push(`${at}：空字符串（不想给就别写这个键，写了空串是没写完）`); continue; }
    if (text.length > MAX.prompt) { errors.push(`${at}：超过 ${MAX.prompt} 字（这是一句话，不是一段话）`); continue; }
    if (seen.has(text)) { errors.push(`${at}：和前面重复了（同一句只留一条）`); continue; }
    seen.add(text);
    out.push(text);
  }
  return out;
}

/** 示例任务：`{title, prompt}`。title 是场景名，prompt 是用户会说的那句话。 */
function cleanExamples(input, path, errors) {
  const out = [];
  if (!Array.isArray(input)) { errors.push(`${path}：必须是数组`); return out; }
  if (input.length > MAX.examples) errors.push(`${path}：最多 ${MAX.examples} 条`);
  const seen = new Set();
  for (const [i, item] of input.slice(0, MAX.examples).entries()) {
    const at = `${path}[${i}]`;
    if (!isObj(item)) { errors.push(`${at}：必须是 {title, prompt}`); continue; }
    checkUnknown(item, new Set(['title', 'prompt']), at, errors);
    const title = trim(item.title);
    const prompt = trim(item.prompt);
    if (!isText(item.title) || !title) errors.push(`${at}.title：必须有场景名（「改产品页文案」这种，不是「示例 1」）`);
    else if (title.length > MAX.exampleTitle) errors.push(`${at}.title：超过 ${MAX.exampleTitle} 字`);
    if (!isText(item.prompt) || !prompt) errors.push(`${at}.prompt：必须写用户真会说的那句话`);
    else if (prompt.length > MAX.examplePrompt) errors.push(`${at}.prompt：超过 ${MAX.examplePrompt} 字`);
    if (!prompt) continue;
    if (seen.has(prompt)) { errors.push(`${at}.prompt：和前面重复了`); continue; }
    seen.add(prompt);
    if (title) out.push({ title, prompt });
  }
  return out;
}

/**
 * 引导层。三个字段各自可选，但「整块都是空的」要拒 —— 写了 `guidance: {}` 等于
 * 声称有引导层却没有，界面会显示一个空框。
 */
function cleanGuidance(input, path, errors) {
  if (input === undefined) return null;
  if (!isObj(input)) { errors.push(`${path}：必须是对象（{ welcome, quickPrompts, taskExamples }）`); return null; }
  checkUnknown(input, GUIDANCE_TOP, path, errors);

  let welcome = '';
  if (input.welcome !== undefined) {
    if (!isText(input.welcome)) errors.push(`${path}.welcome：必须是文本`);
    else {
      welcome = input.welcome.trim();
      // 空串和「没写」是两件事：没写＝作者不打算给，写了空＝写到一半。
      if (!welcome) errors.push(`${path}.welcome：空字符串 —— 写了就填满，不想给就别写这个键`);
      else if (welcome.length > MAX.welcome) errors.push(`${path}.welcome：超过 ${MAX.welcome} 字（这是第一句话，不是人设）`);
    }
  }
  const quickPrompts = input.quickPrompts === undefined ? [] : cleanPromptList(input.quickPrompts, `${path}.quickPrompts`, errors);
  const taskExamples = input.taskExamples === undefined ? [] : cleanExamples(input.taskExamples, `${path}.taskExamples`, errors);

  // 同一句话既是按钮又是示例：界面上会挨着出现两遍，用户以为是两个不同的入口。
  for (const [i, ex] of taskExamples.entries()) {
    if (quickPrompts.includes(ex.prompt)) errors.push(`${path}.taskExamples[${i}].prompt：这句已经出现在 quickPrompts 里了`);
  }
  if (!welcome && !quickPrompts.length && !taskExamples.length) {
    errors.push(`${path}：三个字段全是空的 —— 要么写点用户真能用的，要么整块删掉`);
    return null;
  }
  return { welcome, quickPrompts, taskExamples };
}

/**
 * 多语言块。规则不是「有就校验」，而是「不许只翻一半」：
 * 基座有哪个字段，这块语言就必须有哪个字段；反过来也不许多出基座的字段。
 * 半翻的界面（按钮英文、欢迎语中文）比全中文更难读，而用户会以为是程序串了语言。
 */
function cleanI18n(input, path, errors, guidance, defaultLocale) {
  if (input === undefined) return null;
  if (!isObj(input)) { errors.push(`${path}.i18n：必须是对象（{ "en": { welcome, … } }）`); return null; }
  if (!guidance) {
    errors.push(`${path}.i18n：没有 guidance 就没有可翻的东西（先写基座引导层）`);
    return null;
  }
  const baseSet = new Set(guidanceFields(guidance));
  const out = {};
  const seen = new Map(); // 规范化标签 → 原始键，抓「zh-cn / zh-CN 写了两遍」
  for (const [tag, block] of Object.entries(input)) {
    const at = `${path}.i18n.${tag}`;
    const norm = normalizeLocale(tag);
    if (!norm) { errors.push(`${at}：不是合法的语言标签（形如 en、zh-CN、pt-BR）`); continue; }
    if (seen.has(norm)) { errors.push(`${at}：和 ${seen.get(norm)} 是同一个语言，写一遍就够`); continue; }
    seen.set(norm, tag);
    if (defaultLocale && norm === defaultLocale) {
      errors.push(`${at}：这就是基座语言（${defaultLocale}），再写一份只会让两份文案慢慢跑偏`);
      continue;
    }
    const cleaned = cleanGuidance(block, at, errors);
    if (!cleaned) continue;
    const set = new Set(guidanceFields(cleaned));
    for (const key of baseSet) if (!set.has(key)) errors.push(`${at}：少了 ${key} —— 基座有、这里没有，这个语言的界面会缺半截`);
    for (const key of set) if (!baseSet.has(key)) errors.push(`${at}.${key}：基座没有这个字段，凭空多一条用户看不懂的入口`);
    out[norm] = cleaned;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * 状态格式声明。回答的是「这个版本往实例里写下的东西，格式是第几版」。
 *
 * 为什么格式层要管这个：升级和回退都只改人设与技能卡，从不碰对话、记忆、文件
 * （patch 里根本没有这些键）。但模板自己的技能卡会往磁盘上写东西，新版本写下的
 * 结构，旧版本可能读不懂 —— 那种情况下「回退」不是把内容换回去，是让程序
 * 去读一份它不认识的目录。市场读不到那些文件，唯一能依据的就是作者自己的声明。
 *
 * 不写这个字段 = 不知道，不是「没有状态」。所以校验层允许缺省，判断层必须
 * 把它当 `unknown` 而不是 `safe`。
 */
function cleanState(input, path, errors) {
  if (input === undefined) return null;
  if (!isObj(input)) { errors.push(`${path}：必须是对象（{ version, reads?, note? }）`); return null; }
  checkUnknown(input, new Set(['version', 'reads', 'note']), path, errors);

  const bad = (n) => !Number.isInteger(n) || n < 1 || n > MAX.stateVersion;
  const version = input.version;
  if (bad(version)) {
    errors.push(`${path}.version：要写 1..${MAX.stateVersion} 的整数（不知道就别写整个 state 字段）`);
    return null;
  }
  let reads = version;
  if (input.reads !== undefined) {
    if (bad(input.reads)) {
      errors.push(`${path}.reads：要写 1..${MAX.stateVersion} 的整数（等于「我最高能读到第几版」，缺省就等于 version）`);
      return null;
    }
    reads = input.reads;
  }
  const note = trim(input.note);
  if (note.length > MAX.stateNote) errors.push(`${path}.note：超过 ${MAX.stateNote} 字（这里只写「变了什么」，不写人设）`);
  return { version, reads, ...(note ? { note } : {}) };
}

function cleanBot(bot, path, errors) {
  if (!isObj(bot)) { errors.push(`${path}.bot：必须是对象`); return null; }
  checkUnknown(bot, BOT_TOP, `${path}.bot`, errors);

  // 模板不是「别人导出的实例」：对话、记忆、文件内容都不许带。
  for (const key of ['messages', 'memory', 'summary', 'files', 'channels', 'id', 'createdAt']) {
    if (Object.prototype.hasOwnProperty.call(bot, key)) {
      errors.push(`${path}.bot.${key}：模板只能描述角色，不能携带对话/记忆/文件/连接状态`);
    }
  }

  const name = trim(bot.name);
  if (!name) errors.push(`${path}.bot.name：必须有名字`);
  if (name.length > MAX.name) errors.push(`${path}.bot.name：超过 ${MAX.name} 字`);

  const persona = typeof bot.persona === 'string' ? bot.persona : '';
  if (!persona.trim()) errors.push(`${path}.bot.persona：必须有人设，否则装出来是个空壳`);
  if (persona.length > MAX.persona) errors.push(`${path}.bot.persona：超过 ${MAX.persona} 字`);

  const out = { name, persona, skills: [] };
  if (bot.avatar !== undefined) {
    if (!isText(bot.avatar) || !AVATAR.test(bot.avatar)) errors.push(`${path}.bot.avatar：只能是小写角色 id（如 peek）`);
    else out.avatar = bot.avatar;
  }
  if (bot.color !== undefined) {
    if (!isText(bot.color) || !HEX_COLOR.test(bot.color)) errors.push(`${path}.bot.color：必须是 #RRGGBB`);
    else out.color = bot.color.toUpperCase();
  }
  if (bot.model !== undefined) {
    // 只允许「模型偏好」这种字符串，不允许内嵌凭据或 baseUrl。空串 = 用本机默认。
    const model = trim(bot.model);
    if (!isText(bot.model) || (model && !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(model))) {
      errors.push(`${path}.bot.model：只能是模型名（可留空用本机默认）`);
    } else out.model = model;
  }
  if (bot.temperature !== undefined) {
    const t = Number(bot.temperature);
    if (!Number.isFinite(t) || t < 0 || t > 2) errors.push(`${path}.bot.temperature：必须在 0–2 之间`);
    else out.temperature = t;
  }
  if (bot.notes !== undefined) {
    if (!isText(bot.notes) || bot.notes.length > MAX.description) errors.push(`${path}.bot.notes：太长或不是文本`);
    else out.notes = trim(bot.notes);
  }
  if (bot.skills !== undefined) {
    if (!Array.isArray(bot.skills)) errors.push(`${path}.bot.skills：必须是数组`);
    else {
      if (bot.skills.length > MAX.skills) errors.push(`${path}.bot.skills：最多 ${MAX.skills} 张技能卡`);
      out.skills = bot.skills.slice(0, MAX.skills)
        .map((s, i) => cleanSkill(s, `${path}.bot.skills[${i}]`, errors)).filter(Boolean);
    }
  }
  return out;
}

/**
 * 签名字段的结构校验。模板、组件包、目录三处共用这一份 —— 同一契约写两遍，
 * 迟早一处收紧一处没跟上，而「一处放行」就等于整条链放行。
 * 语义校验（这把 key 是不是目录登记的那把）不在这里，那需要公钥，格式层拿不到。
 */
export function cleanSignature(input, path, errors) {
  if (input === undefined) return null;
  if (!isObj(input)) { errors.push(`${path}.signature：必须是对象`); return null; }
  const { alg, keyId, value } = input;
  if (alg !== 'ed25519') errors.push(`${path}.signature.alg：只支持 ed25519`);
  if (!isText(keyId) || !/^ed25519-[A-Za-z0-9_-]{8,32}$/.test(keyId)) errors.push(`${path}.signature.keyId：格式不对`);
  if (!isText(value) || !/^[A-Za-z0-9+/]{80,120}={0,2}$/.test(value)) errors.push(`${path}.signature.value：不是 base64 签名`);
  return alg === 'ed25519' && isText(keyId) && isText(value) ? { alg, keyId, value } : null;
}

/**
 * 校验一份模板或组件包。
 * @returns {{ok:boolean, errors:string[], value:object|null}}
 */
export function validateManifest(input, path = 'manifest') {
  const errors = [];
  if (!isObj(input)) return { ok: false, errors: [`${path}：不是对象`], value: null };

  if (input.schema !== SCHEMA) {
    return { ok: false, errors: [`${path}.schema：必须是 ${SCHEMA}（收到 ${JSON.stringify(input.schema)}）`], value: null };
  }
  if (input.kind !== 'template' && input.kind !== 'bundle') {
    return { ok: false, errors: [`${path}.kind：必须是 template 或 bundle`], value: null };
  }
  const kind = input.kind;
  checkUnknown(input, kind === 'template' ? TEMPLATE_TOP : BUNDLE_TOP, path, errors);
  scanForbidden(input, path, errors);

  const id = trim(input.id);
  if (!ID.test(id)) errors.push(`${path}.id：必须形如 publisher/name（小写字母、数字、连字符）`);

  const version = trim(input.version);
  if (!validVersion(version)) errors.push(`${path}.version：不是合法的 semver`);
  if (version.includes('-')) errors.push(`${path}.version：目录不接受预发布版本（先发正式版）`);

  const name = trim(input.name);
  if (!name) errors.push(`${path}.name：不能为空`);
  if (name.length > MAX.name) errors.push(`${path}.name：超过 ${MAX.name} 字`);

  const summary = trim(input.summary);
  if (!summary) errors.push(`${path}.summary：必须有一句话说明`);
  if (summary.length > MAX.summary) errors.push(`${path}.summary：超过 ${MAX.summary} 字`);

  const description = trim(input.description || '');
  if (description.length > MAX.description) errors.push(`${path}.description：超过 ${MAX.description} 字`);

  if (!isObj(input.author) || !trim(input.author.name)) errors.push(`${path}.author.name：必须有作者`);
  else if (trim(input.author.name).length > MAX.author) errors.push(`${path}.author.name：超过 ${MAX.author} 字`);

  const license = trim(input.license);
  if (!license) errors.push(`${path}.license：必须声明许可证（空着不是「随便用」）`);
  else if (license.length > MAX.license) errors.push(`${path}.license：超过 ${MAX.license} 字`);

  const tags = [];
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags)) errors.push(`${path}.tags：必须是数组`);
    else {
      if (input.tags.length > MAX.tags) errors.push(`${path}.tags：最多 ${MAX.tags} 个`);
      for (const [i, t] of input.tags.slice(0, MAX.tags).entries()) {
        if (!isText(t) || !t.trim() || t.length > MAX.tag) errors.push(`${path}.tags[${i}]：不是合法标签`);
        else tags.push(t.trim().toLowerCase());
      }
    }
  }

  const openbot = input.openbot === undefined ? '*' : trim(input.openbot);
  if (openbot !== '*' && !openbot) errors.push(`${path}.openbot：不是合法的版本范围`);

  const capabilities = [];
  if (input.capabilities !== undefined) {
    if (!Array.isArray(input.capabilities)) errors.push(`${path}.capabilities：必须是数组`);
    else for (const [i, c] of input.capabilities.slice(0, 20).entries()) {
      if (!isText(c) || !c.trim()) errors.push(`${path}.capabilities[${i}]：不是合法能力名`);
      else capabilities.push(c.trim());
    }
  }

  const permissions = checkPermissions(input.permissions, path, errors);

  // 引导层与语言。`defaultLocale` 只在有 i18n 时必需：
  // 没有翻译就没有「往哪儿退」的问题；一旦有翻译，不知道基座是哪国语言就无法判断
  // 该给翻译还是该给原文，于是「猜」——而这种猜会静默地把中文标成英文。
  let defaultLocale = null;
  if (input.defaultLocale !== undefined) {
    defaultLocale = normalizeLocale(input.defaultLocale);
    if (!defaultLocale) errors.push(`${path}.defaultLocale：不是合法的语言标签（形如 zh-CN、en、pt-BR）`);
  } else if (input.i18n !== undefined) {
    errors.push(`${path}.defaultLocale：有 i18n 就必须说明基座是哪国语言，否则不知道该往哪儿退`);
  }
  const guidance = cleanGuidance(input.guidance, `${path}.guidance`, errors);
  const i18n = cleanI18n(input.i18n, path, errors, guidance, defaultLocale);
  // 状态格式只属于模板：组件包本身不落状态，成员各自声明各自的。
  const state = kind === 'template' ? cleanState(input.state, `${path}.state`, errors) : null;

  // 签名结构检查放这里，语义校验（这把 key 是不是目录登记的那把）在 sources.mjs，
  // 因为那需要目录里的公钥，格式层拿不到。
  const signature = cleanSignature(input.signature, path, errors);

  let bot = null;
  let templates = [];
  let sharedSkills = [];
  let workflow = [];

  if (kind === 'template') {
    bot = cleanBot(input.bot, path, errors);
  } else {
    if (!Array.isArray(input.templates) || input.templates.length === 0) {
      errors.push(`${path}.templates：组件包至少要引用一个模板`);
    } else {
      if (input.templates.length > MAX.templates) errors.push(`${path}.templates：最多 ${MAX.templates} 个`);
      for (const [i, t] of input.templates.slice(0, MAX.templates).entries()) {
        const at = `${path}.templates[${i}]`;
        if (!isObj(t)) { errors.push(`${at}：必须是对象`); continue; }
        checkUnknown(t, new Set(['id', 'range', 'role', 'instanceName']), at, errors);
        const tid = trim(t.id);
        if (!ID.test(tid)) errors.push(`${at}.id：必须是 publisher/name`);
        const range = trim(t.range || '^0.0.0');
        if (!range) errors.push(`${at}.range：不是合法的版本范围`);
        const role = t.role === undefined ? 'member' : trim(t.role);
        if (!['lead', 'member'].includes(role)) errors.push(`${at}.role：只能是 lead 或 member`);
        const instanceName = t.instanceName === undefined ? '' : trim(t.instanceName);
        if (instanceName.length > MAX.name) errors.push(`${at}.instanceName：超过 ${MAX.name} 字`);
        if (tid) templates.push({ id: tid, range, role, instanceName });
      }
      const leads = templates.filter((t) => t.role === 'lead');
      if (leads.length > 1) errors.push(`${path}.templates：一个组件包只能有一个 lead`);
      if (templates.length > 0 && leads.length === 0) errors.push(`${path}.templates：必须指定一个 lead（装完先跟谁说话）`);
    }
    if (input.sharedSkills !== undefined) {
      if (!Array.isArray(input.sharedSkills)) errors.push(`${path}.sharedSkills：必须是数组`);
      else {
        if (input.sharedSkills.length > MAX.sharedSkills) errors.push(`${path}.sharedSkills：最多 ${MAX.sharedSkills} 张`);
        sharedSkills = input.sharedSkills.slice(0, MAX.sharedSkills)
          .map((s, i) => cleanSkill(s, `${path}.sharedSkills[${i}]`, errors)).filter(Boolean);
      }
    }
    if (input.workflow !== undefined) {
      if (!Array.isArray(input.workflow)) errors.push(`${path}.workflow：必须是数组`);
      else for (const [i, step] of input.workflow.slice(0, 20).entries()) {
        if (!isText(step) || !step.trim() || step.length > 200) errors.push(`${path}.workflow[${i}]：必须是 200 字以内的文本`);
        else workflow.push(step.trim());
      }
    }
    // 组件包不能引用自己：否则解析会绕成环。
    if (templates.some((t) => t.id === id)) errors.push(`${path}.templates：组件包不能引用自己`);
  }

  const value = {
    schema: SCHEMA,
    kind,
    id,
    version,
    name,
    summary,
    description,
    author: { name: trim(input.author && input.author.name), ...(isObj(input.author) && trim(input.author.url) ? { url: trim(input.author.url) } : {}) },
    license,
    tags: [...new Set(tags)],
    openbot,
    capabilities,
    permissions: permissions || { tools: false, container: false, screen: false, model: 'any' },
    ...(signature ? { signature } : {}),
    ...(defaultLocale ? { defaultLocale } : {}),
    ...(guidance ? { guidance } : {}),
    ...(i18n ? { i18n } : {}),
    ...(state ? { state } : {}),
    ...(isObj(input.homepage) || isText(input.homepage) ? { homepage: input.homepage } : {}),
    ...(kind === 'template' ? { bot } : { templates, sharedSkills, workflow })
  };

  return { ok: errors.length === 0, errors, value: errors.length === 0 ? value : null };
}

/**
 * 规范化 JSON：递归按键名升序、去掉所有格式化空白。
 * 摘要必须能被第三方复现，所以规则写死在这里，并且只在这里。
 * 注意：键序按 JS 默认（UTF-16 码元）升序，不是 localeCompare。
 */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

/** `sha256-<base64>`，与 Subresource Integrity 同形，便于以后直接贴到 HTML/registry。 */
export async function integrityOf(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  let bin = '';
  for (const b of new Uint8Array(digest)) bin += String.fromCharCode(b);
  return 'sha256-' + btoa(bin);
}
