// 升级/回退：模板换版本之后，让已装实例跟着换内容，但不碰用户自己的东西。
//
// 产品的硬约束（docs/marketplace.md）：模板更新不覆盖实例的对话、记忆、凭据和既有承诺；
// 差异与迁移结果必须可查看。
//
// 做法上有一条是刻意的：**产物是 patch，不是完整的 bot 对象**。
// 如果产出完整对象，调用方一个「整条覆盖」就会把对话和记忆抹掉；
// patch 里根本没有 messages/memory/files 这些键，从结构上就不可能覆盖。
//
// 升级和回退是同一个操作的两个方向，共用一份实现：规则（哪些字段该保留）没有区别，
// 分成两份迟早一边修好另一边还是旧的。方向只影响目标版本怎么定、说法、以及状态闸门。
import { buildPlan } from './plan.mjs';
import { materialize } from './install.mjs';
import { compare, sortDesc } from './semver.mjs';
import { latestOf, versionSpecKind, resolveRange } from './registry.mjs';

export const INSTALLED_SCHEMA = 'openbot.market.installed/1';
export const UPGRADE_SCHEMA = 'openbot.market.upgrade/1';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/** 段落级比较：人设是长文本，行级 diff 在中文里几乎全是整段变化，段落更好读。 */
function diffParagraphs(before, after) {
  const split = (text) => String(text || '').split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const a = split(before);
  const b = split(after);
  const inB = new Set(b);
  const inA = new Set(a);
  const removed = a.filter((p) => !inB.has(p)).map((p) => p.slice(0, 240));
  const added = b.filter((p) => !inA.has(p)).map((p) => p.slice(0, 240));
  return {
    added,
    removed,
    beforeLength: String(before || '').length,
    afterLength: String(after || '').length,
    paragraphDelta: b.length - a.length
  };
}

function diffSkills(before, after) {
  const list = (v) => (Array.isArray(v) ? v.filter((s) => s && s.name) : []);
  const a = list(before);
  const b = list(after);
  const mapA = new Map(a.map((s) => [s.name, s]));
  const mapB = new Map(b.map((s) => [s.name, s]));
  return {
    added: b.filter((s) => !mapA.has(s.name)).map((s) => s.name),
    removed: a.filter((s) => !mapB.has(s.name)).map((s) => s.name),
    changed: b.filter((s) => mapA.has(s.name) && mapA.get(s.name).desc !== s.desc)
      .map((s) => ({ name: s.name, before: mapA.get(s.name).desc, after: s.desc }))
  };
}

const SCALAR_FIELDS = ['model', 'temperature', 'avatar', 'color'];

/**
 * 参与「本地改动」判定的字段。
 *
 * 一开始这里只有 `persona` / `skills` / `model` / `temperature`，`avatar` / `color` 被
 * 排除在外，理由写的是「装饰性，升级照模板走」。那条理由的代价是：**用户给 bot 换的颜色，
 * 升一次级就没了，而且没有任何提示** —— 这正是「升级不覆盖你的东西」这句承诺要防的事。
 * 装饰也是用户的选择，不能因为「不重要」就替他改回去。
 *
 * 现在六个字段一起判，但装饰字段多一条退化规则（见 editedAgainst）：
 * 安装本来就可能把 avatar 丢掉（本机没有那个角色形象），把「丢了」当成「你改了」，
 * 每次升级都会报一次冲突 —— 而冲突报多了，用户就学会无视它。
 */
const LOCAL_FIELDS = ['persona', 'skills', 'model', 'temperature', 'avatar', 'color'];

/** 装饰字段：缺值不算「用户改动」，见 editedAgainst。 */
const DECOR_FIELDS = new Set(['avatar', 'color']);

/**
 * 这个字段算不算「用户改过」。
 *
 * 装饰字段的退化：**当前值是空**就当「不知道 / 没留下」，不算改动。
 * 依据是安装那份报告 —— `materialize` 会把本机没有的角色形象丢掉并记进
 * `report.avatarDropped`，`color` 缺省写空串。也就是说「空」在这个上下文里
 * 主要表示「没落地」，不是「我把它改成了没有」。
 * 代价说清楚：用户真把颜色清成空（如果有这种操作），升级会拿模板的颜色补回来。
 * 这个方向的错是「补上一个默认值」，另一个方向的错是「每次升级都报假冲突」，
 * 两害相权取前者。
 */
function editedAgainst(field, base, current) {
  if (same(base[field], current[field])) return false;
  if (DECOR_FIELDS.has(field) && !current[field]) return false;
  return true;
}

/**
 * 把一份 bot（模板里的，或已装实例的）归一成可比的样子。
 *
 * **归一化必须和 install.mjs 落库时做的事一致**，否则「没改过」会被判成「改过」：
 * 安装会补 `temperature: 0.7`、给技能卡加 `id: s_<name>`、把缺的 `model` 写成空串，
 * 丢掉本机没有的 avatar、把缺的 color 写成空串。
 * 这里不关心 id，也不关心技能卡顺序（换序不是语义改动）。
 * 这条一致性有测试焊住：拿 materialize 的产物当「当前内容」，必须判成 clean。
 */
function normalizedFields(bot) {
  const source = bot && typeof bot === 'object' ? bot : {};
  const skills = (Array.isArray(source.skills) ? source.skills : [])
    .filter((s) => s && s.name)
    .map((s) => ({ name: String(s.name).trim(), desc: String(s.desc === undefined ? '' : s.desc).trim() }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const text = (v) => String(v === undefined || v === null ? '' : v).trim();
  return {
    persona: String(source.persona === undefined ? '' : source.persona).replace(/\r\n/g, '\n').trim(),
    skills,
    model: String(source.model === undefined ? '' : source.model).trim(),
    // 安装缺省写 0.7；不补这个默认值，没设过温度的 bot 每次都会被判成「用户改过」。
    temperature: typeof source.temperature === 'number' ? source.temperature : 0.7,
    avatar: text(source.avatar),
    // 校验层会把颜色统一成大写（manifest.mjs：`out.color = bot.color.toUpperCase()`），
    // 已装实例里存的却可能是宿主给的小写。不在这里对齐，`#00aa55` 与 `#00AA55`
    // 会被判成「用户改过」—— 而底下是同一个颜色，于是模板一改色就报一次假冲突。
    color: text(source.color).toUpperCase()
  };
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * 判「用户有没有动过这个 bot」。
 * base = 已装记录那个版本的模板内容（安装当时写进实例的东西）；
 * current = 现在实例里的内容。拿不到 current 时是 `unknown`，**不是** clean。
 * @returns {{status:'clean'|'edited'|'unknown', edited:string[], detail:object}}
 */
export function compareLocal(base, current) {
  if (!current) {
    return { status: 'unknown', edited: [], detail: {}, reason: 'no-current-state' };
  }
  const a = normalizedFields(base);
  const b = normalizedFields(current);
  const edited = [];
  const detail = {};
  for (const field of LOCAL_FIELDS) {
    if (!editedAgainst(field, a, b)) continue;
    edited.push(field);
    detail[field] = { base: a[field], current: b[field] };
  }
  return { status: edited.length ? 'edited' : 'clean', edited, detail };
}

/**
 * 三方合并：本地改没有、模板改没有，各自决定了这个字段该怎么办。
 *
 * | 本地 | 模板 | 结果 |
 * | --- | --- | --- |
 * | 没改 | 改了 | 采用模板（正常升级） |
 * | 没改 | 没改 | 采用模板（写进去也一样，省得判断写没写） |
 * | **改了** | **没改** | **保留本地** —— 模板没动它，没有理由覆盖 |
 * | **改了** | **改了** | **冲突：保留本地 + 报出来**。覆盖不可逆，不采用可逆 |
 *
 * 拿不到当前内容（unknown）时按「采用模板」处理，但由调用方负责把「我不知道你改没改」
 * 说出来 —— 装作知道比不知道更糟。
 *
 * `avatar` / `color` 也走这张表，只是「本地改没改」多一条退化规则（缺值不算改）——
 * 见 editedAgainst。
 */
export function mergeFields(base, current, incoming) {
  const a = normalizedFields(base);
  const b = current ? normalizedFields(current) : null;
  const c = normalizedFields(incoming);
  const take = [];
  const keep = [];
  for (const field of LOCAL_FIELDS) {
    const localChanged = b ? editedAgainst(field, a, b) : false;
    const templateChanged = !same(a[field], c[field]);
    if (!localChanged) { take.push(field); continue; }
    if (!templateChanged) { keep.push({ field, reason: 'template-unchanged' }); continue; }
    keep.push({ field, reason: 'conflict' });
  }
  return {
    take,
    keep,
    conflicts: keep.filter((k) => k.reason === 'conflict').map((k) => k.field),
    preserved: keep.map((k) => k.field)
  };
}


/**
 * 目标版本读不读得懂「现在这一版已经写下的东西」。
 *
 * 市场从不改对话、记忆、文件（patch 里没有这些键），所以「回退会不会弄坏」不是
 * 市场自己在动那些数据，而是模板的技能卡把东西写成了新格式、退回旧版之后没人认得。
 * 市场读不到那些文件，唯一能依据的是作者自己声明的 `state` 块。
 *
 * 三态，且**不许把 unknown 当 safe**：
 * · safe    目标声明能读到（reads ≥ 现在写下的版本）
 * · unsafe  目标自己说了读不到 —— 这是确定的冲突，不是猜测
 * · unknown 任一方没写 state。没写＝没声明，不等于「没有状态」
 * @returns {{level:'safe'|'unsafe'|'unknown', target:object|null, source:object|null, reason:string}}
 */
export function compareState(target, source) {
  const t = target && typeof target === 'object' ? target : null;
  const s = source && typeof source === 'object' ? source : null;
  if (!t || !s) {
    const missing = [];
    if (!s) missing.push('现在装的那一版');
    if (!t) missing.push('目标版本');
    return { level: 'unknown', target: t, source: s, reason: `${missing.join('和')}没有声明状态格式` };
  }
  if (t.reads >= s.version) {
    return { level: 'safe', target: t, source: s, reason: `目标版本最高能读到格式 ${t.reads}，实例里写的是 ${s.version}` };
  }
  return { level: 'unsafe', target: t, source: s, reason: `目标版本最高只读到格式 ${t.reads}，实例里写的是 ${s.version}` };
}

/** 目录里比给定版本低的、**没被撤回的**最高一版。回退的默认目标就是它。 */
function highestBelow(entry, version) {
  const older = (entry && Array.isArray(entry.versions) ? entry.versions : [])
    .filter((v) => v && v.revoked !== true)
    .map((v) => (v && typeof v.version === 'string' ? v.version : null))
    .filter((v) => v && compare(v, version) !== null && compare(v, version) < 0);
  return older.length ? sortDesc(older)[0] : null;
}

/**
 * 技能卡**逐张**三方合并。
 *
 * 整组保留在「你加了一张、模板也加了一张」时只能二选一：留你的就丢掉作者新写的，
 * 用模板的就丢掉你自己加的那张。而技能卡恰恰是最容易被各自动手加一张的字段
 * （「再加一条：先看日志」是正常用法），整组处理在这个场景里等于没做合并。
 *
 * 规则与字段级那套一致（覆盖不可逆、不覆盖可逆），只是粒度落到单张卡上：
 *
 * | 本地 | 模板 | 结果 |
 * | --- | --- | --- |
 * | 没动 | 改了 | 用模板 |
 * | 改了 | 没动 | 留本地 |
 * | 改了 | 改了 | 冲突，留本地 |
 * | 本地没这张（新增） | 有 | 保留本地新增 |
 * | 本地没这张（删了） | 有 | 尊重删除：不加回来；模板还改过它则记为冲突 |
 * | 本地没动 | 删了 | 跟着删 |
 * | 本地改过 | 删了 | 冲突：删除不可逆，保留本地那张 |
 *
 * 名字是唯一键（同名只认第一张，与 `diffSkills` 一致）。顺序 = 模板顺序 + 本地独有的按本地顺序追加，
 * 这样作者调整过的顺序能生效，用户加的那几张永远在末尾。
 *
 * `current` 不是数组（null，或那个 bot 里根本没有 skills 字段）时返回 null：**分不清
 * 「你把卡都删了」和「我看不到你的卡」就不能按「全删」写回去** —— 那会把用户攒的卡一次清空。
 * 空数组是另一种情况：那是在说「我这儿一张卡都没有」，按全删处理。
 * @param {Array} base     装的那一版模板里的技能卡
 * @param {Array|null} current  实例现在的技能卡（null＝看不到）
 * @param {Array} incoming 目标版本的技能卡
 * @returns {null|{merged:Array, decisions:Array, conflicts:string[], keptLocal:string[], added:string[], removed:string[]}}
 */
export function mergeSkills(base, current, incoming) {
  if (!Array.isArray(current)) return null;
  const index = (list) => {
    const map = new Map();
    for (const s of Array.isArray(list) ? list : []) {
      if (!s || !s.name) continue;
      const name = String(s.name).trim();
      if (!name || map.has(name)) continue; // 同名只认第一张，后面的由格式层拦
      map.set(name, { name, desc: String(s.desc === undefined ? '' : s.desc).trim() });
    }
    return map;
  };
  const b = index(base);
  const c = index(current);
  const i = index(incoming);

  const merged = [];
  const decisions = [];
  const push = (name, desc, from, action) => {
    merged.push({ name, desc, from });
    decisions.push({ name, action });
  };

  // 先走模板的顺序：模板有的，逐张判断本地动没动
  for (const [name, target] of i) {
    const was = b.get(name);
    const now = c.get(name);
    if (!was) {
      // 模板新增。本地也有一张同名的：描述一样就是同一张，不一样算冲突
      if (!now) { push(name, target.desc, 'template', 'added-by-template'); continue; }
      if (now.desc === target.desc) { push(name, target.desc, 'both', 'same'); continue; }
      push(name, now.desc, 'local', 'conflict-local');
      continue;
    }
    if (!now) {
      // 本地删了这张。模板改过它就是冲突（改动 vs 删除，默认站删除？不 —— 删除不可逆，
      // 保留删除是「不替用户复活」，而覆盖本地删除是替他撤销一次决定。所以仍按删除，但报出来）
      decisions.push({ name, action: was.desc === target.desc ? 'removed-by-local' : 'removed-by-local-conflict' });
      continue;
    }
    const localChanged = now.desc !== was.desc;
    const templateChanged = target.desc !== was.desc;
    if (!localChanged) { push(name, target.desc, 'template', templateChanged ? 'changed-by-template' : 'same'); continue; }
    if (!templateChanged) { push(name, now.desc, 'local', 'kept-local'); continue; }
    push(name, now.desc, 'local', 'conflict-local');
  }

  // 再看本地独有的（模板没有这张）
  for (const [name, now] of c) {
    if (i.has(name)) continue;
    const was = b.get(name);
    if (!was) { push(name, now.desc, 'local', 'added-by-local'); continue; }
    if (now.desc !== was.desc) { push(name, now.desc, 'local', 'conflict-local'); continue; }
    // 本地没动过，模板删了它 → 跟着删
    decisions.push({ name, action: 'removed-by-template' });
  }

  const of = (action) => decisions.filter((d) => d.action === action).map((d) => d.name);
  // 'conflict-local' 不以 'conflict' 结尾，'removed-by-local-conflict' 却以它结尾 ——
  // 只判 endsWith 会把「两边都改了」漏掉，而那正是最该报出来的那一种。
  const isConflict = (action) => action === 'conflict-local' || action.endsWith('-conflict');
  const conflicts = decisions.filter((d) => isConflict(d.action)).map((d) => d.name);
  return {
    merged,
    decisions,
    conflicts,
    keptLocal: [...of('kept-local'), ...of('added-by-local'), ...of('conflict-local')],
    added: of('added-by-template'),
    removed: [...of('removed-by-template'), ...of('removed-by-local')]
  };
}

/** 模板旧版 → 模板新版的差异（只给人看「作者改了什么」，不决定合并）。 */
function diffBot(before, after) {
  const fields = {};
  for (const key of SCALAR_FIELDS) {
    const a = before[key];
    const b = after[key];
    if (JSON.stringify(a) !== JSON.stringify(b)) fields[key] = { from: a === undefined ? null : a, to: b === undefined ? null : b };
  }
  return {
    persona: diffParagraphs(before.persona, after.persona),
    skills: diffSkills(before.skills, after.skills),
    fields
  };
}

function hasChanges(change) {
  return change.persona.added.length > 0 || change.persona.removed.length > 0
    || change.persona.beforeLength !== change.persona.afterLength
    || change.skills.added.length > 0 || change.skills.removed.length > 0 || change.skills.changed.length > 0
    || Object.keys(change.fields).length > 0;
}

/**
 * 算一次版本变化（升级或回退）。不写任何东西，只回答「会变成什么样、哪些不能自动做」。
 *
 * 两个方向共用这一份，不是为了省代码，是因为「保留用户的改动」这件事不该有两个实现：
 * 升级和回退都只动人设与技能卡，判断「这个字段要不要碰」的规则一模一样。分成两份写，
 * 迟早一边修好了另一边还是旧的，而旧的那边会在某次回退里把用户的手改盖掉。
 *
 * 方向只改三件事：目标版本怎么定、方向不对时的说法、以及回退才需要的那道状态闸门。
 * @param {object} input
 *   input.installed  已安装记录（openbot.market.installed/1）
 *   input.entries    目录条目
 *   input.loadManifest
 *   input.openbotVersion
 *   input.version    目标版本（升级缺省取最新；回退缺省取「比现在低的最高一版」）
 *   input.currentBots  实例现在的内容（缺省＝不知道）
 *   input.acceptStateLoss  明知目标版本读不懂也照做
 * @param {'upgrade'|'rollback'} direction
 */
async function planChange(input, direction) {
  const rollback = direction === 'rollback';
  const installed = input && input.installed;
  const errors = [];
  const warnings = [];

  if (!isObj(installed) || installed.schema !== INSTALLED_SCHEMA) {
    return { ok: false, direction, errors: [`不是 OpenBot 的安装记录（缺少 ${INSTALLED_SCHEMA}）`], warnings, botChanges: [], added: [], removed: [] };
  }
  if (!Array.isArray(installed.bots) || installed.bots.length === 0) {
    return { ok: false, direction, errors: ['安装记录里没有机器人，无法判断升级内容'], warnings, botChanges: [], added: [], removed: [] };
  }

  const entry = (input.entries || []).find((e) => e.id === installed.id);
  if (!entry) {
    return { ok: false, direction, errors: [`目录里已经没有 ${installed.id}`], warnings, botChanges: [], added: [], removed: [] };
  }

  // 目标版本：显式指定就按指定；否则升级取最新、回退取「比现在低的最高一版」。
  // 回退不给默认值不行 —— 让用户自己去翻目录里有哪些旧版本，等于把选择成本推回去；
  // 但也不能默认到「随便哪个旧版」，最近的一版才是「退回上一版」的自然含义。
  //
  // 「最新」与「最高一版」都**跳过被撤回的版本**：撤回的是「这一版」，不是这个模板。
  // 一个刚发出去的版本因为发现人设写错被撤回时，用户该升到上一版，
  // 而不是被告知「升不了」——那会让他以为整个模板坏了。
  const revokedHere = (entry.versions || []).filter((v) => v && v.revoked === true).map((v) => v.version);
  const installedRevoked = revokedHere.includes(installed.version);

  let target;
  let versionChoice = { kind: rollback ? 'previous' : 'latest', spec: null, resolved: null, matched: [] };
  if (input.version) {
    const spec = String(input.version).trim();
    const kind = versionSpecKind(spec);
    // 认不出的写法在这里拒：丢给 satisfies 会变成「没有这个版本」，那是另一句话。
    if (kind === 'invalid') {
      return {
        ok: false, direction,
        errors: [`--to=${spec} 我看不出是版本还是范围：给完整版本（1.2.0），或范围（^1.0.0 / ~1.2.0 / ">=1.1.0 <2.0.0" / *）`],
        warnings, botChanges: [], added: [], removed: []
      };
    }
    if (kind === 'exact') {
      target = spec;
      versionChoice = { kind: 'explicit', spec, resolved: spec, matched: [spec] };
    } else {
      const r = resolveRange(entry, spec);
      if (!r.version) {
        const why = r.matched.length ? '' : (r.revokedMatched.length
          ? `（其中 ${r.revokedMatched.join('、')} 满足这个范围，但已被目录撤回）`
          : '');
        return {
          ok: false, direction,
          errors: [`${installed.id} 没有任何可安装的版本满足 ${spec}${why}；目录里能装的是 ${r.available.join('、') || '（没有）'}`],
          warnings, botChanges: [], added: [], removed: []
        };
      }
      // 回退的方向是「往回走」：`rollback --to=^1.0.0` 要的是**范围内比自己旧的最新一版**，
      // 取范围里最高的一版会得到「就是自己」——那等于什么都不做，命令等于没用。
      // 升级不用这层过滤：范围里最高的一版若是自己就是 noop，若比自己旧就该报「不降级」。
      let picked = r.version;
      if (rollback) {
        const older = r.matched.filter((v) => {
          const c = compare(v, installed.version);
          return c !== null && c < 0;
        });
        if (!older.length) {
          return {
            ok: false, direction,
            errors: [`匹配 ${spec} 的版本（${r.matched.join('、')}）里没有比现在装的 ${installed.version} 更旧的；`
              + '回退只会往回走，要往前请用 upgrade'],
            warnings, botChanges: [], added: [], removed: []
          };
        }
        picked = older[0];
      }
      target = picked;
      versionChoice = { kind: 'range', spec, resolved: picked, matched: r.matched };
      // 范围一定要落成一句「选了哪一版」：`--to=^1.0.0` 的结果是一串可能值里挑一个，
      // 不说出来等于让用户自己猜。匹配到的其余版本也列出来，他才知道这个范围意味着什么。
      const others = r.matched.filter((v) => v !== picked);
      const skipped = r.revokedMatched.length
        ? `；${r.revokedMatched.join('、')} 也满足这个范围，但已被目录撤回`
        : '';
      // 「还有哪些」只列名字：升级挑的是范围内最高的，所以「都比它低」成立；
      // 回退挑的是范围内**比自己旧**的最高一版，其余的既有更高的也有更低的，不能一句话概括。
      warnings.push(`按范围 ${spec} 选了 ${picked}`
        + (others.length ? `（范围内还有 ${others.join('、')}${rollback ? '' : '，都比它低'}）` : '') + skipped);
    }
  } else if (rollback) target = highestBelow(entry, installed.version);
  else target = latestOf(entry);

  if (!target) {
    const older = (entry.versions || []).filter((v) => {
      const c = compare(v.version, installed.version);
      return c !== null && c < 0;
    }).map((v) => v.version);
    const message = !rollback
      ? `${installed.id} 已经没有任何可安装的版本（${revokedHere.length} 个版本被目录撤回）`
      : (older.length && older.every((v) => revokedHere.includes(v))
        ? `比 ${installed.version} 旧的版本（${older.join('、')}）都已被目录撤回，没有可回退的版本`
        : `目录里没有比 ${installed.version} 更旧的 ${installed.id}，没有可回退的版本`);
    return { ok: false, direction, errors: [message], warnings, botChanges: [], added: [], removed: [] };
  }

  // 跳过了被撤回的版本就点名：用户看到的「最新」和实际装的不一致时，不解释等于让他以为装错了。
  if (!input.version && !rollback && revokedHere.length) {
    warnings.push(`${installed.id}：${revokedHere.join('、')} 已被目录撤回，这次升到 ${target}`);
  }
  if (!input.version && rollback && revokedHere.length) {
    warnings.push(`${installed.id}：${revokedHere.join('、')} 已被目录撤回，这次退回 ${target}`);
  }
  // 显式指定的版本被撤回：改选等于替他做决定，所以拒绝，但要说清还能选什么。
  if (input.version && revokedHere.includes(target)) {
    const alive = (entry.versions || []).filter((v) => v.revoked !== true).map((v) => v.version);
    return {
      ok: false, direction,
      errors: [`${installed.id}@${target} 已被目录撤回（下架），不能${rollback ? '退回' : '升级'}到这一版`
        + (alive.length ? `；还能用的版本：${alive.join('、')}` : '；这个模板已经没有可安装的版本')],
      warnings, botChanges: [], added: [], removed: []
    };
  }

  const cmp = compare(target, installed.version);
  if (cmp === null) {
    return { ok: false, direction, errors: [`版本号不合法：${target} / ${installed.version}`], warnings, botChanges: [], added: [], removed: [] };
  }
  if (cmp === 0) {
    return {
      ok: true, noop: true, upToDate: !rollback, direction, from: installed.version, to: target,
      versionChoice,
      errors, warnings, botChanges: [], added: [], removed: []
    };
  }
  // 方向反了就直说往哪个命令走。只报「不能这样做」而不说该怎么做，
  // 用户会以为市场坏了，而不是以为敲错了命令。
  if (rollback && cmp > 0) {
    warnings.push(`目标是 ${target}，比已装的 ${installed.version} 新；那是升级，用 upgrade`);
    return {
      ok: false, direction,
      errors: [`不能把 ${installed.id} 从 ${installed.version} 「回退」到更新的 ${target}（要升级请用 upgrade）`],
      warnings, botChanges: [], added: [], removed: []
    };
  }
  if (!rollback && cmp < 0) {
    // 你装的那一版被撤回，而目录里还能装的最高版本比它还旧 —— 唯一正确的动作是 rollback。
    // 只说「不能降级」等于把用户留在原地：他既不知道为什么装不了，也不知道该敲什么。
    if (installedRevoked) {
      return {
        ok: false, direction,
        errors: [`你装的 ${installed.id}@${installed.version} 已被目录撤回，而目录里还能装的最高版本是 ${target}（比它旧）；`
          + '升级不做降级 —— 要换到那一版请用 rollback'],
        warnings, botChanges: [], added: [], removed: []
      };
    }
    warnings.push(`目标是 ${target}，比已装的 ${installed.version} 旧；这里只做升级，不降级`);
    return { ok: false, direction, errors: [`不能把 ${installed.id} 从 ${installed.version} 降到 ${target}`], warnings, botChanges: [], added: [], removed: [] };
  }

  // 你装的那一版被撤回了：这是安全相关的事，必须主动说，不能等他哪天好奇才去翻目录。
  if (installedRevoked) {
    warnings.push(`你现在装的 ${installed.id}@${installed.version} 已被目录撤回 —— 这一版作者不再提供，建议换到 ${target}`);
  }

  const plan = await buildPlan({
    id: installed.id,
    entries: input.entries,
    loadManifest: input.loadManifest,
    baseUrl: input.baseUrl,
    openbotVersion: input.openbotVersion,
    now: input.now,
    // 指定版本时锁死它：直接让 loader 取这个版本，避免「最新的又不满足约束」再挑一次
    forceVersion: target
  });
  if (!plan.ok) {
    return { ok: false, direction, errors: plan.errors, warnings: [...warnings, ...plan.warnings], botChanges: [], added: [], removed: [] };
  }
  if (plan.rootVersion !== target) {
    return { ok: false, direction, errors: [`目录里的 ${installed.id} 没有 ${target} 这个版本`], warnings, botChanges: [], added: [], removed: [] };
  }

  const installedByTemplate = new Map(installed.bots.map((b) => [b.templateId, b]));
  const newByTemplate = new Map(plan.bots.map((b) => [b.templateId, b]));
  const botChanges = [];
  const added = [];
  const removed = [];
  const stateChecks = [];

  // 已装实例「现在」长什么样。没提供就别假装知道 —— 这里缺省是空 Map，
  // 于是每个 bot 的 local.status 都会是 unknown，报告里必须写出来。
  const currentById = new Map();
  const hasCurrentList = Array.isArray(input.currentBots);
  for (const b of Array.isArray(input.currentBots) ? input.currentBots : []) {
    if (b && typeof b.id === 'string') currentById.set(b.id, b);
  }
  let unknownLocal = 0;
  // 「没给当前内容」和「给了、但记录里那个 id 不在里面」是两件事，
  // 混成一件就会把后者的原因报成「你没给我当前内容」—— 说错了原因，用户就查不到真问题。
  const missingOnInstance = [];

  for (const [templateId, bot] of newByTemplate) {
    const was = installedByTemplate.get(templateId);
    if (!was) {
      added.push({ templateId, version: bot.templateVersion, name: bot.name, role: bot.role });
      continue;
    }
    if (was.templateVersion === bot.templateVersion) continue;

    const before = await input.loadManifest(templateId, was.templateVersion);
    const after = await input.loadManifest(templateId, bot.templateVersion);
    if (!before || before.ok === false || !after || after.ok === false) {
      errors.push(`${templateId} 的旧版本 ${was.templateVersion} 或新版本 ${bot.templateVersion} 读不到，无法计算差异`);
      continue;
    }
    const change = diffBot(before.bot, after.bot);
    // 三方：base（装的时候写进去的模板内容）、current（实例现在的内容）、incoming（目标版本）。
    // 只比「模板旧版 vs 模板新版」等于替用户假设他从没动过手 —— 而人设是最容易被改的字段。
    const currentBot = currentById.get(was.botId) || null;
    const local = compareLocal(before.bot, currentBot);
    // 记录说这个模板装在 was.botId 上，但实例里没有这个 id：记录和实例对不上。
    // 这里不改「不知道」这个结论（确实判不出改没改），只把原因记清楚，
    // 让上游能据此「不碰它」—— 宁可这一个没升级，也不要把补丁打给碰巧同 id 的别人的机器人。
    if (!currentBot && hasCurrentList) {
      local.reason = 'bot-missing';
      missingOnInstance.push({ botId: was.botId, templateId, name: bot.name });
    }
    const merge = mergeFields(before.bot, currentBot, after.bot);
    // 技能卡单独按张合并：整组二选一在「你加了一张、模板也加了一张」时必然丢东西，
    // 而技能卡恰恰是最容易被各自动手加一张的字段（「再加一条：先看日志」是正常用法）。
    const skillMerge = mergeSkills(before.bot.skills, currentBot ? currentBot.skills : null, after.bot.skills);
    if (skillMerge) {
      // 逐张合并已经给出每张卡的去向，字段级那一套就不该再把 skills 当成一个整体报一遍 ——
      // 同一件事说两遍，读的人会以为发生了两件事。
      merge.take = merge.take.filter((f) => f !== 'skills');
      merge.keep = merge.keep.filter((k) => k.field !== 'skills');
      merge.preserved = merge.keep.map((k) => k.field);
      merge.conflicts = merge.conflicts.filter((f) => f !== 'skills');
    }
    if (local.status === 'unknown' && local.reason !== 'bot-missing') unknownLocal += 1;
    // 状态闸门：目标版本读不读得懂「现在这一版已经写下的东西」。
    // 升级时目标通常比现在新，这条几乎总是 safe；真正会咬住的是回退。
    const state = compareState(after.state, before.state);
    const stateLine = { templateId, name: bot.name, from: was.templateVersion, to: bot.templateVersion, ...state };
    stateChecks.push(stateLine);
    botChanges.push({
      botId: was.botId,
      templateId,
      templateName: bot.name,
      from: was.templateVersion,
      to: bot.templateVersion,
      changed: change,
      local,
      merge,
      state: stateLine,
      // 逐张合并的结论跟着 change 走：applyUpgrade 拿它拼 patch，报告拿它给「每张卡去了哪」。
      ...(skillMerge ? { skillMerge } : {}),
      ...(merge.keep.length ? { keptLocal: merge.preserved } : {}),
      ...(hasChanges(change) ? {} : { note: '内容没有实质变化（可能只是元数据或版本号）' })
    });
    // 说法要跟着方向变：回退时还写「升级会保留你的版本」，用户会以为敲错了命令。
    const act = rollback ? '回退' : '升级';
    const fieldConflicts = merge.conflicts;
    const cardConflicts = skillMerge ? skillMerge.conflicts : [];
    if (fieldConflicts.length || cardConflicts.length) {
      const bits = [];
      if (fieldConflicts.length) bits.push(`${fieldConflicts.join('、')} 你改过，模板这一版也改了`);
      if (cardConflicts.length) bits.push(`技能卡 ${cardConflicts.join('、')} 你改过，模板这一版也改了`);
      warnings.push(`${bot.name}：${bits.join('；')}；${act}会保留你的版本，不会覆盖（要换成模板的请显式指定 takeTemplate）`);
    } else if (merge.preserved.length || (skillMerge && skillMerge.keptLocal.length)) {
      const bits = [];
      if (merge.preserved.length) bits.push(`${merge.preserved.join('、')} 你改过、模板没动`);
      if (skillMerge && skillMerge.keptLocal.length) bits.push(`技能卡 ${skillMerge.keptLocal.join('、')} 你改过、模板没动`);
      warnings.push(`${bot.name}：${bits.join('；')}，${act}不碰它`);
    }
  }

  for (const [templateId, was] of installedByTemplate) {
    if (!newByTemplate.has(templateId)) {
      removed.push({ botId: was.botId, templateId, version: was.templateVersion, name: was.botId });
    }
  }
  if (removed.length) {
    // 不自动删：删机器人会一起带走它的对话与记忆，这不是「换版本」该顺手做的事。
    // 回退时说「新版不再包含」是错的 —— 那个成员是这一版才加的，退回旧版才没有它。
    const why = rollback ? `目标版本 ${target} 里没有` : '新版组件包不再包含';
    warnings.push(`${why} ${removed.map((r) => r.templateId).join('、')}；不会自动删除，需要你决定保留还是移除`);
  }
  if (missingOnInstance.length) {
    // 这条比「判不出改没改」更要紧：记录是升级唯一的身份凭据，写错了 id 就认错了机器人。
    const list = missingOnInstance.map((m) => `${m.name}（记录里写的是 ${m.botId}）`).join('、');
    warnings.push(`${list}：实例里没有这个 id 的机器人，记录和实例对不上。这几个不会被改动，也不会把版本号记成新的 —— 请先核对安装记录里的 botId；填成别人的机器人 id，补丁就会打进那台`);
  }
  if (unknownLocal) {
    // 「不知道」必须说出来：不提供当前内容时，升级会照模板覆盖人设与技能卡。
    warnings.push(`没有提供已装实例的当前内容（${unknownLocal} 个机器人），无法判断你有没有改过；这次会把 persona 与技能卡按模板覆盖。想保住手改的内容，请把已装 bots 一起传进来`);
  }

  // 状态闸门的结果。三条处置不一样：
  // · unsafe：目标版本自己说了「我读不懂那么新的格式」，这是确定的冲突 —— 默认拒绝。
  // · unknown（任一方没声明）：升级时不当噪音（作者没写就是没写，每次都提等于没提）；
  //   回退时必须说 —— 回退正是最可能读到旧版本不认识的目录的那个动作。
  // · safe：不吭声，但结论留在返回值里可核对。
  const unsafe = stateChecks.filter((s) => s.level === 'unsafe');
  const unknownState = stateChecks.filter((s) => s.level === 'unknown');
  if (unsafe.length) {
    const detail = unsafe.map((s) => `${s.name}（现在写的是格式 ${s.source.version}，${s.to} 最高只读到 ${s.target.reads}）`).join('；');
    if (input.acceptStateLoss) {
      warnings.push(`${detail}：目标版本读不懂现在写下的状态格式，你要求照做；这次之后它可能看不到这些内容，也可能把它们当成别的格式读`);
    } else {
      errors.push(`${detail}：目标版本读不懂现在写下的状态格式，不能自动做。确认要这样做（之后它可能看不到那部分内容）请加 acceptStateLoss`);
    }
  } else if (rollback && unknownState.length) {
    warnings.push(`${unknownState.map((s) => `${s.name}（${s.reason}）`).join('；')}：回退后旧版本能不能读懂现在写下的内容无法判断 —— 对话与记忆不会被市场改动，但模板自己产出的文件可能没人管`);
  }

  // 兼容旧记录里的 permissions 键（早先版本叫这个名），但新记录一律写 declaredPermissions。
  const askedBefore = installed.declaredPermissions || installed.permissions || {};
  const askedAfter = plan.permissions || {};
  for (const key of ['tools', 'container', 'screen']) {
    if (askedAfter[key] && !askedBefore[key]) {
      warnings.push(`新版本声明需要 ${key}；升级不会授予，仍需你单独确认`);
    }
    if (!askedAfter[key] && askedBefore[key]) {
      warnings.push(`新版本不再声明需要 ${key}；已授予的权限不会因此自动撤销`);
    }
  }
  // 安装时的「声明需要 X、不会授予」在升级里已经按「新版是否多要了东西」重写过，
  // 原样再抄一遍只会让用户以为每次升级都要重新授权。
  for (const w of plan.warnings) {
    if (w === plan.permissionNotice) continue;
    if (!warnings.includes(w)) warnings.push(w);
  }

  return {
    ok: errors.length === 0,
    direction,
    upToDate: false,
    id: installed.id,
    kind: plan.kind,
    from: installed.version,
    to: target,
    // 「目标是这一版」和「这一版是怎么定下来的」是两件事：`--to=^1.0.0` 落成的版本
    // 是范围里挑出来的，界面与事后核对都需要知道它出自哪个范围、范围内还有谁。
    versionChoice,
    errors,
    warnings,
    botChanges,
    added,
    removed,
    // 状态闸门的结论要能核对：哪些 safe、哪些 unknown、哪些断定了读不懂。
    stateCheck: {
      level: unsafe.length ? 'unsafe' : (unknownState.length ? 'unknown' : 'safe'),
      unsafe: unsafe.map((s) => s.templateId),
      unknown: unknownState.map((s) => s.templateId),
      bots: stateChecks
    },
    // 本地改动的汇总。界面要能一眼看出「这次会覆盖谁的手改」，所以给数字不给感觉。
    localEdits: {
      clean: botChanges.filter((c) => c.local.status === 'clean').length,
      edited: botChanges.filter((c) => c.local.status === 'edited').length,
      // unknown 含「记录对不上」的那些（结论同样是不知道），但单独给一个数以区分原因：
      // 一个是「你没给我当前内容」，一个是「你给了，但记录里的 id 不在里面」。
      unknown: botChanges.filter((c) => c.local.status === 'unknown').length,
      missing: missingOnInstance.length,
      // 技能卡的冲突算进同一栏：对用户来说「你的改动被保留了」只有一个意思，
      // 按字段冲突和按卡冲突分开计数，界面就得自己加两次才算得对。
      conflicts: botChanges.reduce((n, c) => n
        + c.merge.conflicts.length
        + (c.skillMerge ? c.skillMerge.conflicts.length : 0), 0)
    },
    // 技能卡这一轮的合并结论（只列真发生了合并的机器人）。
    // 「合并过」要能核对成「哪张卡留谁的」，否则等于让用户相信一个看不到的过程。
    skillMerge: botChanges.filter((c) => c.skillMerge).map((c) => ({
      botId: c.botId,
      templateName: c.templateName,
      merged: c.skillMerge.merged.map((s) => s.name),
      keptLocal: c.skillMerge.keptLocal,
      added: c.skillMerge.added,
      removed: c.skillMerge.removed,
      conflicts: c.skillMerge.conflicts
    })),
    // 解析结果留着给 applyUpgrade 用：重新 buildPlan 一遍不只是慢，
    // 还可能因为目录刚变而算出与展示不一致的计划。
    installPlan: plan,
    // 换完把记录换成新的，主工程落库时直接存这个
    record: {
      schema: INSTALLED_SCHEMA,
      id: installed.id,
      kind: plan.kind,
      version: target,
      installedAt: installed.installedAt,
      updatedAt: input.now || new Date().toISOString(),
      bots: plan.bots.map((b) => {
        const was = installedByTemplate.get(b.templateId);
        // 记录对不上、这次没动的成员，版本号也不能跟着写新 ——
        // 否则下一轮它会以为自己已经在新版本上，从此再也不会被升级。
        const skipped = missingOnInstance.some((m) => m.templateId === b.templateId);
        return {
          botId: was ? was.botId : null,
          templateId: b.templateId,
          templateVersion: skipped ? was.templateVersion : b.templateVersion,
          role: b.role
        };
      }),
      declaredPermissions: plan.permissions,
      // 退过什么、升过什么要留痕：只记「现在是哪个版本」的话，
      // 用户下次看到版本号变了根本想不起来是自己退的还是自动升的。
      history: [
        ...(Array.isArray(installed.history) ? installed.history : []),
        { direction, from: installed.version, to: target, at: input.now || new Date().toISOString() }
      ].slice(-20)
    }
  };
}

/** 升级：目标比现在新。 */
export function planUpgrade(input) {
  return planChange(input, 'upgrade');
}

/** 回退：把实例退回一个更旧的版本。 */
export function planRollback(input) {
  return planChange(input, 'rollback');
}

/**
 * 把升级计划落成 patch。只含模板字段，不含 id/name/messages/memory/files/channels/summary/createdAt。
 *
 * 合并规则：`merge.keep` 里的字段**不进 patch**。也就是「你改过的字段，升级不碰」——
 * 覆盖不可逆，不覆盖可逆：想让模板接管，再跑一次并显式指定 `takeTemplate`。
 *
 * @param {object} upgrade  planUpgrade 的结果
 * @param {object} plan     对应的安装计划（含新 bot 内容）；由调用方传入，避免重复解析
 * @param {object} options  { now, existing, installed, takeTemplate }
 *   options.takeTemplate  要强制采用模板内容的字段名数组（或 true 表示全部冲突字段）
 */
export function applyUpgrade(upgrade, plan, options = {}) {
  if (!upgrade || upgrade.ok !== true) return { ok: false, message: '升级计划未通过，不能应用', patch: null, report: null };
  const direction = upgrade.direction === 'rollback' ? 'rollback' : 'upgrade';
  if (upgrade.noop || upgrade.upToDate) {
    return {
      ok: true,
      message: direction === 'rollback' ? `已经装在 ${upgrade.from}，没有要回退的` : '已经是最新版本',
      patch: null,
      report: { noop: true, direction }
    };
  }
  if (!plan || plan.ok !== true) return { ok: false, message: '缺少可用的安装计划', patch: null, report: null };

  // 新增成员要现造 id，而 id 只能靠「实例上已经有什么」来避让。
  // 没拿到这份清单时 materialize 会给出一个「在空实例上没撞车」的 id ——
  // 它可能正好是用户自己那台机器人的 id，而下面又把这个 id 写进安装记录。
  // 记录一旦指向别人的机器人，下一轮升级就会照着记录去合并、去打补丁。
  // 少装一个成员可以重来，记录写错会把后面每一次升级都带到错的地方 —— 所以这里拒绝。
  if (upgrade.added.length && !Array.isArray(options.existing)) {
    const names = upgrade.added.map((a) => a.name).join('、');
    return {
      ok: false,
      message: `这次${direction === 'rollback' ? '回退' : '升级'}要新增成员（${names}），但没拿到实例上现有的机器人：新成员会拿到一个可能已被占用的 id，安装记录也会跟着记错，以后每次升级都会打到那台机器人身上。请把现有 bots 清单交进来（CLI：--current=<bots.json>）`,
      patch: null,
      report: null
    };
  }

  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const updates = [];
  const additions = [];
  const skillsReport = [];
  const skippedMissing = [];
  const take = options.takeTemplate === true ? true
    : Array.isArray(options.takeTemplate) ? new Set(options.takeTemplate) : null;

  for (const change of upgrade.botChanges) {
    // 记录说它装在这个 id 上，实例里却没有：不知道那台机器人是谁，就不动它。
    // 猜错了的代价不对称 —— 少升一台看得见，打到别人身上看不见。
    if (change.local && change.local.reason === 'bot-missing') {
      skippedMissing.push({ botId: change.botId, templateId: change.templateId });
      continue;
    }
    const bot = plan.bots.find((b) => b.templateId === change.templateId);
    if (!bot) continue;
    // 技能卡：逐张合并过就用合并结果；只有明确要求「用模板的」才整组换掉。
    // takeTemplate === true 的语义是「所有冲突字段」，所以只在真有卡冲突时才整组接管 ——
    // 否则会顺手把用户加的那张卡一起删掉，那不是他要的「用模板覆盖冲突」。
    const forceSkills = (take instanceof Set && take.has('skills'))
      || (take === true && !!change.skillMerge && change.skillMerge.conflicts.length > 0);
    const cards = change.skillMerge && !forceSkills ? change.skillMerge.merged : (bot.skills || []);
    // patch 的键就是白名单：这里没有 messages / memory / files，调用方无法整条覆盖。
    const patch = {
      persona: bot.persona,
      skills: cards.map((s) => ({ id: `s_${s.name}`, name: s.name, desc: s.desc })),
      ...(bot.model !== undefined ? { model: bot.model } : {}),
      ...(typeof bot.temperature === 'number' ? { temperature: bot.temperature } : {}),
      ...(bot.avatar ? { avatar: bot.avatar } : {}),
      ...(bot.color ? { color: bot.color } : {})
    };
    const keep = (change.merge ? change.merge.keep : [])
      .filter((k) => !(take === true || (take && take.has(k.field))))
      .map((k) => k.field);
    // 保留本地 = 从这个字段上什么都不写。删掉键，而不是写一个「当前值」：
    // 写当前值等于替用户复述一遍，只要中间有一次读到的状态是旧的，就把旧值固化下来了。
    for (const field of keep) delete patch[field];
    if (change.skillMerge) {
      skillsReport.push({
        botId: change.botId,
        // 「合并过」不是结论，逐张的去向才是结论 —— 界面要能和用户自己数出来的对上。
        decisions: change.skillMerge.decisions,
        merged: cards.map((s) => s.name),
        tookTemplate: forceSkills,
        keptLocal: change.skillMerge.keptLocal,
        removed: change.skillMerge.removed,
        conflicts: change.skillMerge.conflicts
      });
    }
    updates.push({
      botId: change.botId,
      templateId: change.templateId,
      templateVersion: change.to,
      patch,
      ...(keep.length ? { keptLocal: keep } : {}),
      ...(Object.keys(patch).length === 0 ? { note: '没有可应用的字段（你的改动都保留了）' } : {})
    });
  }

  let addedRenamed = [];
  if (upgrade.added.length) {
    const built = materialize(plan, { existing: options.existing || [], now });
    if (!built.ok) return { ok: false, message: built.message, patch: null, report: null };
    // 只为新增成员产出完整配置；已在装的成员走 patch，不重发完整对象。
    // 用 provenance 对上 templateId → 真实 botId（materialize 可能因 id 冲突改名）。
    const addedIds = new Set(upgrade.added.map((a) => a.templateId));
    for (const p of built.provenance) {
      if (!addedIds.has(p.templateId)) continue;
      const bot = built.bundle.bots.find((b) => b.id === p.botId);
      if (bot) additions.push({ templateId: p.templateId, bot });
    }
    // 新成员因为 id/名字被占用而改名，必须报出去：用户看到的和模板里的不一样，不说会以为装错了东西。
    // 但 materialize 是对「整包」跑一遍的，已在装的成员也会被它算成新的、也改名 ——
    // 只认真新增的那几个，否则报告里会冒出一堆莫名其妙的 lead-2 / beta-2。
    const produced = new Set(additions.map((a) => a.bot.id));
    addedRenamed = built.report.renamed.filter((r) => produced.has(r.to));
  }

  // 安装记录里新增成员的 botId 在 planUpgrade 时还不知道，这里补上真实 id。
  const idByTemplate = new Map(additions.map((a) => [a.templateId, a.bot.id]));
  const record = upgrade.record ? {
    ...upgrade.record,
    updatedAt: new Date(now).toISOString(),
    bots: upgrade.record.bots.map((b) => ({
      ...b,
      botId: b.botId || idByTemplate.get(b.templateId) || null
    }))
  } : null;

  const verb = direction === 'rollback' ? '退回' : '更新';
  const bits = [];
  if (updates.length) bits.push(`${verb} ${updates.length} 个机器人`);
  if (additions.length) bits.push(`新增 ${additions.length} 个机器人`);
  // 跳过的不说，用户会以为全升完了，而那一台还停在旧版本上。
  if (skippedMissing.length) bits.push(`${skippedMissing.map((s) => s.botId).join('、')} 因为记录对不上、没动`);

  return {
    ok: true,
    message: bits.length ? bits.join('，') : '没有可应用的改动',
    patch: {
      schema: UPGRADE_SCHEMA,
      // patch 的形状两个方向一样（宿主的应用方式不需要区分），但「这是退回去」要写在
      // 文件里：事后想查「这台机器上的 1.0.0 是装的还是退回来的」，只有记录里那个字段能回答。
      direction,
      id: upgrade.id,
      from: upgrade.from,
      to: upgrade.to,
      updatedAt: new Date(now).toISOString(),
      updates,
      additions: additions.map((a) => a.bot)
    },
    record,
    report: {
      direction,
      updated: updates.map((u) => u.botId),
      added: additions.map((a) => a.bot.id),
      // 新增成员改过名的（id 或名字被占用了）：界面要能说出「它不叫模板里那个名字」。
      addedRenamed,
      // 记录对不上、这次没动的：留下名字，事后能查「那台为什么还停在旧版本」。
      skippedMissing,
      // 「保留了你的」必须能核对：哪些机器人的哪些字段没被覆盖。
      keptLocal: updates.filter((u) => u.keptLocal).map((u) => ({ botId: u.botId, fields: u.keptLocal })),
      // 技能卡单独一栏：字段级没法表达「这四张里有一张留你的、三张用模板的」。
      skills: skillsReport,
      kept: (options.installed && options.installed.bots ? options.installed.bots : [])
        .filter((b) => !updates.some((u) => u.botId === b.botId))
        .map((b) => b.botId),
      // 这几样两个方向都从不触碰，写进报告是为了让「没动」这件事可被核对，而不是靠信任。
      preserved: ['messages', 'memory', 'files', 'channels', 'credentials'],
      // 状态闸门最后给出的结论，报告里留一份，事后能查「当时是判过还是没有」。
      stateCheck: upgrade.stateCheck || null
    }
  };
}

/** 描述一次版本变化（升级或回退），CLI 与界面共用一份措辞。 */
export function summarizeUpgrade(change) {
  if (!change) return '没有变更计划';
  const back = change.direction === 'rollback';
  if (change.ok !== true) return `${back ? '退不回去' : '升不了'}：${(change.errors || []).join('；')}`;
  if (change.noop) {
    const vc = change.versionChoice;
    // 范围挑出来的那一版正装着：说「已经是最新版本」是错的（目录里可能还有更新的，只是不在这个范围里）。
    if (vc && vc.kind === 'range') {
      return back ? `已经装在 ${change.from}（${vc.spec} 范围内比自己旧的最高一版就是它）` : `已经装在 ${change.from}（${vc.spec} 范围内最高的一版）`;
    }
    return back ? `已经装在 ${change.from}，没有要回退的` : `已经是最新版本（${change.from}）`;
  }
  // `--to=^1.0.0` 落成的是范围里挑出来的一版：摘要第一行就要说清它是这么来的，
  // 否则用户只知道「我给了个范围」，看到 1.2.0 会以为是软件自己乱挑的。
  const vc = change.versionChoice;
  const specNote = vc && vc.kind === 'range' ? `（按 ${vc.spec} 选的）` : '';
  const head = `${change.id}：${change.from} → ${change.to}${back ? '（回退）' : ''}${specNote}`;
  const parts = [];
  const verb = back ? '退回' : '更新';
  if (change.botChanges.length) parts.push(`${verb} ${change.botChanges.map((c) => c.templateName).join('、')}`);
  if (change.added.length) parts.push(`新增 ${change.added.map((a) => a.name).join('、')}`);
  if (change.removed.length) parts.push(`移出 ${change.removed.map((r) => r.templateId).join('、')}（不自动删除）`);
  // 说了「更新 N 个」却不说「其中 M 个只改了一半」，用户会以为自己的改动还在模板那一版的语义里。
  const kept = (change.botChanges || []).filter((c) => c.merge && c.merge.keep.length);
  if (kept.length) parts.push(`${kept.length} 个保留了你的改动（${kept.map((c) => `${c.templateName}：${c.merge.preserved.join('/')}`).join('；')}）`);
  // 技能卡是逐张合的：只报「保留了几张」最容易让人担心「模板新加的那张还在不在」，
  // 所以把保留的名字写出来，用户能自己数。
  const cards = (change.botChanges || []).filter((c) => c.skillMerge && c.skillMerge.keptLocal.length);
  if (cards.length) parts.push(`技能卡逐张合并（${cards.map((c) => `${c.templateName} 留你的 ${c.skillMerge.keptLocal.join('/')}`).join('；')}）`);
  // localEdits.unknown 含「记录对不上」的那些，但两者的原因不同，摘要里不能说成同一句：
  // 一个是我们没看到实例，一个是看到了、记录里的 id 却不在里面。说错原因，用户就查错了方向。
  const missing = (change.localEdits || {}).missing || 0;
  const unknown = ((change.localEdits || {}).unknown || 0) - missing;
  if (unknown > 0) parts.push(`${unknown} 个无法判断有没有改过（没提供当前内容）`);
  if (missing > 0) parts.push(`${missing} 个的安装记录在实例里找不到（记录和实例对不上，这次没动）`);
  // 回退时状态闸门是重点：能否读懂现在写下的格式，比「改了几段人设」重要得多。
  if (back && change.stateCheck) {
    if (change.stateCheck.level === 'safe') parts.push('目标版本声明能读懂现在的状态格式');
    else if (change.stateCheck.level === 'unknown') parts.push('读不读得懂现在的状态格式无法判断（有版本没声明 state）');
    else parts.push('目标版本读不懂现在的状态格式（你已确认照做）');
  }
  return parts.length ? `${head}；${parts.join('；')}` : `${head}；没有内容变化`;
}
