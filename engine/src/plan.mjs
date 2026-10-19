// 安装计划：把「点一下装一个组件包」翻译成「具体装哪几个模板的哪个版本」。
//
// 这一层是纯计算，不做任何网络与磁盘动作（取内容由外部注入 loadManifest）。
// 目的是让「装什么、为什么装这个版本、哪一步装不了」在动手之前就能看见并留档。
//
// 不做什么：
// - 不自动降级到「反正有个版本能装」。范围对不上就是 unresolved，让用户看到。
// - 不把多个范围悄悄合成一个。交集为空就报 conflict，并列出每个范围想要什么。
// - 不因为「只差一个」就装半套。任何一个引用解析不了，整个计划 ok=false。
import { maxSatisfying, satisfies } from './semver.mjs';
import { pickVersion, resolveUrl, installableVersions, versionSpecKind, resolveRange } from './registry.mjs';
import { resolveGuidance } from './guidance.mjs';

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// loadManifest 允许直接返回规范化后的 content，也允许返回 { ok, value } 包装。
// 两种都收，是因为主工程可能用校验器的返回值直接透传；但只认 ok:true，别的不当成功。
function unwrap(loaded) {
  if (loaded && loaded.ok === true && isObj(loaded.value)) return loaded.value;
  return loaded;
}

function describeRange(list) {
  return list.map((x) => `${x.from} 要 ${x.range}`).join('；');
}

/**
 * 解析依赖并组装安装计划。
 * @param {object} input
 *   input.id             要安装的 id
 *   input.entries        已合并的目录条目（registry.mergeRegistries().entries）
 *   input.loadManifest   async (id, version) => { ok, errors, value } | value
 *   input.openbotVersion 当前应用版本，用于检查 manifest.openbot
 *   input.locale         界面上要显示的语言（可选）；只影响引导层，不影响装什么
 *   input.now            ISO 时间（可选，仅用于计划里的时间戳）
 * @returns {object} 计划
 */
export async function buildPlan(input) {
  const entries = Array.isArray(input && input.entries) ? input.entries : [];
  const load = input && typeof input.loadManifest === 'function' ? input.loadManifest : null;
  const errors = [];
  const warnings = [];

  if (!input || !input.id) {
    return { ok: false, errors: ['没有指定要安装的 id'], warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null };
  }
  if (!load) {
    return { ok: false, errors: ['没有提供 loadManifest，无法读取模板内容'], warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null };
  }

  const rootEntry = entries.find((e) => e.id === input.id);
  if (!rootEntry) {
    return { ok: false, errors: [`目录里没有 ${input.id}`], warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null };
  }

  const versionsById = new Map(entries.map((e) => [e.id, e]));

  // 被撤回的版本要点名说出来：用户看到的「装 1.0.0」和目录首页的「最新 1.1.0」不一致时，
  // 不解释就等于让他以为装错了版本。
  const revokedOf = (entry) => (entry && Array.isArray(entry.versions) ? entry.versions : [])
    .filter((v) => v && v.revoked === true).map((v) => v.version);

  const rootRevoked = revokedOf(rootEntry);
  // forceVersion 用于升级：要装的就是已记录的那个目标版本，不能再按「最新」挑一次。
  // 显式指定的版本即使被撤回也不改选 —— 那是调用方明确要的，改选等于替他做决定；
  // 但要在取内容之前就拒掉，别让他先下载再看到「已撤回」。
  //
  // 这里也认范围（`--to=^1.0.0`）：与 upgrade/rollback 用同一份 `resolveRange`，
  // 两边各写一套「范围里挑哪一个」，迟早一边挑最高、一边挑最新，而没人说得清为什么。
  let rootVersion;
  let versionChoice = { kind: input.forceVersion ? 'explicit' : 'latest', spec: null, resolved: null, matched: [] };
  if (input.forceVersion) {
    const spec = String(input.forceVersion).trim();
    const kind = versionSpecKind(spec);
    if (kind === 'invalid') {
      return {
        ok: false,
        errors: [`--to=${spec} 我看不出是版本还是范围：给完整版本（1.2.0），或范围（^1.0.0 / ~1.2.0 / ">=1.1.0 <2.0.0" / *）`],
        warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null
      };
    }
    if (kind === 'exact') {
      rootVersion = rootEntry.versions.find((v) => v.version === spec) || null;
      versionChoice = { kind: 'explicit', spec, resolved: spec, matched: [spec] };
    } else {
      const r = resolveRange(rootEntry, spec);
      if (!r.version) {
        const why = r.revokedMatched.length ? `（其中 ${r.revokedMatched.join('、')} 满足这个范围，但已被目录撤回）` : '';
        return {
          ok: false,
          errors: [`${input.id} 没有任何可安装的版本满足 ${spec}${why}；目录里能装的是 ${r.available.join('、') || '（没有）'}`],
          warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null
        };
      }
      rootVersion = rootEntry.versions.find((v) => v.version === r.version) || null;
      versionChoice = { kind: 'range', spec, resolved: r.version, matched: r.matched };
      // 范围落成哪一版必须说出来：不说的话，用户只知道「我给了个范围」。
      const others = r.matched.filter((v) => v !== r.version);
      const skipped = r.revokedMatched.length ? `；${r.revokedMatched.join('、')} 也满足这个范围，但已被目录撤回` : '';
      // 与 update.mjs 用同一句措辞：同一件事在两处各说一遍，迟早一处改了一处没改。
      warnings.push(`按范围 ${spec} 选了 ${r.version}`
        + (others.length ? `（范围内还有 ${others.join('、')}，都比它低）` : '') + skipped);
    }
  } else {
    rootVersion = pickVersion(rootEntry, '*');
  }
  if (rootVersion && rootVersion.revoked === true) {
    const alive = rootEntry.versions.filter((v) => v.revoked !== true).map((v) => v.version);
    return {
      ok: false,
      errors: [`${input.id}@${rootVersion.version} 已被目录撤回（下架），不能安装`
        + (alive.length ? `；目录里还能装的版本：${alive.join('、')}` : '；这个模板已经没有可安装的版本')],
      warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null
    };
  }
  if (!rootVersion) {
    const all = (rootEntry.versions || []).map((v) => v.version);
    return {
      ok: false,
      errors: [input.forceVersion
        ? `${input.id} 没有 ${input.forceVersion} 这个版本`
        : (all.length && rootRevoked.length === all.length
          ? `${input.id} 的所有版本（${all.join('、')}）都已被目录撤回，没有可安装的版本`
          : `${input.id} 没有任何可用版本`)],
      warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null
    };
  }
  if (rootRevoked.length && !input.forceVersion) {
    warnings.push(`${input.id}：${rootRevoked.join('、')} 已被目录撤回，这次装 ${rootVersion.version}`);
  }

  const rootManifest = unwrap(await load(input.id, rootVersion.version));
  if (!rootManifest || rootManifest.ok === false) {
    // 撤回不是「内容坏了」：被撤回的内容通常完全正常，只是官方不再让装。
    // 两者混成一句话，用户会去查模板格式，而真正该做的是换个版本或换模板。
    // 离线缺缓存同理（reason: offline-miss）：内容可能好得很，只是本机没存过 ——
    // 说成「内容有问题」会让人去找发布者对质，而真正该做的是联网。
    if (rootManifest && (rootManifest.reason === 'revoked' || rootManifest.reason === 'offline-miss')) {
      return { ok: false, errors: [rootManifest.errors.join('；')], warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null };
    }
    const detail = rootManifest && Array.isArray(rootManifest.errors) ? rootManifest.errors.join('；') : '内容无法解析';
    return { ok: false, errors: [`${input.id}@${rootVersion.version} 的模板内容有问题：${detail}`], warnings, steps: [], bots: [], sharedSkills: [], workflow: [], permissions: null, guidance: null };
  }

  // 组装待解析的引用：根自己是 template 就是一条，是 bundle 就是它 templates 里的每一条。
  const refs = [];
  if (rootManifest.kind === 'template') {
    refs.push({ id: input.id, range: rootVersion.version, role: 'lead', instanceName: '', from: input.id });
  } else {
    for (const t of rootManifest.templates || []) {
      refs.push({ ...t, from: input.id });
    }
  }

  // 同一 id 被多处引用时合并范围，只有一个版本能同时满足才继续。
  const byId = new Map();
  for (const ref of refs) {
    if (!byId.has(ref.id)) byId.set(ref.id, []);
    byId.get(ref.id).push(ref);
  }

  const steps = [];
  const bots = [];
  const sharedSkills = [];
  const permissionUnion = { tools: false, container: false, screen: false };

  for (const [id, list] of byId) {
    const entry = versionsById.get(id);
    if (!entry) {
      errors.push(`缺少依赖 ${id}（${describeRange(list)}）`);
      continue;
    }
    if (entry.kind !== 'template') {
      errors.push(`${id} 是组件包，不能作为组件包内的成员（${describeRange(list)}）`);
      continue;
    }
    // 成员也要跳过被撤回的版本：一个组件包引用了 ^1.0.0，而 1.2.0 刚被撤回，
    // 整包就因为这一张卡装不上 —— 而 1.1.0 完全可用。撤回的是「那一版」，不是这个模板。
    const alive = installableVersions(entry);
    const versions = alive.map((v) => v.version);
    const allRanges = [...new Set(list.map((r) => r.range))];
    const candidates = versions.filter((v) => allRanges.every((r) => satisfies(v, r)));
    if (candidates.length === 0) {
      const dead = revokedOf(entry);
      const all = (entry.versions || []).map((v) => v.version);
      if (all.length && dead.length === all.length) {
        errors.push(`${id} 的所有版本（${all.join('、')}）都已被目录撤回，组件包里这一项装不了（${describeRange(list)}）`);
        continue;
      }
      const detail = allRanges.map((r) => {
        const best = maxSatisfying(versions, r);
        return `${r} → ${best ? `最高只能到 ${best}` : '没有可用版本'}`;
      }).join('；');
      errors.push(`版本冲突 ${id}：${describeRange(list)}；${detail}`);
      continue;
    }
    const version = maxSatisfying(candidates, '*');
    const pinned = entry.versions.find((v) => v.version === version);
    const skipped = revokedOf(entry);
    if (skipped.length) {
      warnings.push(`${id}：${skipped.join('、')} 已被目录撤回，组件包里用的是 ${version}`);
    }

    const loaded = unwrap(await load(id, version));
    if (!loaded || loaded.ok === false) {
      if (loaded && (loaded.reason === 'revoked' || loaded.reason === 'offline-miss')) {
        errors.push(loaded.errors.join('；'));
        continue;
      }
      const detail = loaded && Array.isArray(loaded.errors) ? loaded.errors.join('；') : '内容无法解析';
      errors.push(`${id}@${version} 的模板内容有问题：${detail}`);
      continue;
    }
    if (loaded.kind !== 'template') {
      errors.push(`${id}@${version} 不是模板（kind=${loaded.kind}）`);
      continue;
    }

    // 应用版本门禁：模板声明了 openbot 范围就必须满足，不满足不装。
    if (loaded.openbot && loaded.openbot !== '*' && input.openbotVersion) {
      if (!satisfies(input.openbotVersion, loaded.openbot)) {
        errors.push(`${id}@${version} 要求 OpenBot ${loaded.openbot}，当前 ${input.openbotVersion}`);
        continue;
      }
    }

    steps.push({
      id,
      version,
      kind: 'template',
      role: list.some((r) => r.role === 'lead') ? 'lead' : 'member',
      // 安装前要把来源念出来，所以这里给绝对地址；解析不了就保留原值并在 warnings 里说。
      url: pinned ? (resolveUrl(pinned.sourceBase || input.baseUrl || '', pinned.url) || pinned.url) : '',
      integrity: pinned ? pinned.integrity : '',
      requiredBy: [...new Set(list.map((r) => r.from))]
    });

    const instanceName = (list.find((r) => r.instanceName) || {}).instanceName || '';
    bots.push({
      templateId: id,
      templateVersion: version,
      role: list.some((r) => r.role === 'lead') ? 'lead' : 'member',
      instanceName,
      ...loaded.bot
    });
    // 每个 bot 自带的技能卡留在自己身上（安装时进 bot.skills）。
    // 不要把成员技能卡汇总成「共享技能卡」—— 那是另一个层级，
    // 汇总后主脑会看到下属的专职技能卡，人设边界会被稀释。
    if (loaded.permissions) {
      for (const key of ['tools', 'container', 'screen']) {
        if (loaded.permissions[key] === true) permissionUnion[key] = true;
      }
    }
  }

  // 根 manifest 自己的权限声明也要算进来（bundle 可能整体声明）。
  if (rootManifest.permissions) {
    for (const key of ['tools', 'container', 'screen']) {
      if (rootManifest.permissions[key] === true) permissionUnion[key] = true;
    }
  }
  for (const skill of rootManifest.sharedSkills || []) sharedSkills.push({ ...skill, from: input.id });

  // 来源与验证状态：这些不是错误，但界面必须显示，所以放进 warnings 而不是静默。
  const rootTrust = rootEntry.trust || 'community';
  if (rootTrust !== 'official') warnings.push(`${input.id} 来自社区目录（${(rootEntry.sources || []).map((s) => s.name).join('、') || '未知来源'}），不是官方验证过的模板`);
  if (rootEntry.verified !== true) warnings.push(`${input.id} 未标记为已验证；装之前请先看人设与权限`);

  // 成员也要报来源：一个官方组件包引用社区模板时，用户看到的「装 3 个机器人」
  // 里可能有 1 个来自别处。只看根条目会漏掉这件事。
  const foreign = [];
  for (const step of steps) {
    const entry = versionsById.get(step.id);
    if (!entry || step.id === input.id) continue;
    const where = (entry.sources || []).map((s) => s.name).join('、') || '未知来源';
    if ((entry.trust || 'community') !== 'official') foreign.push(`${step.id}（${where}）`);
    else if (entry.verified !== true) foreign.push(`${step.id}（${where}，未标记已验证）`);
  }
  if (foreign.length) warnings.push(`组件包里这些成员不是官方验证过的：${foreign.join('；')}`);
  let permissionNotice = null;
  if (permissionUnion.tools || permissionUnion.container || permissionUnion.screen) {
    const asked = ['tools', 'container', 'screen'].filter((k) => permissionUnion[k]);
    permissionNotice = `这套模板声明需要 ${asked.join(' / ')}；安装**不会**授予这些权限，装完仍需你单独确认`;
    warnings.push(permissionNotice);
  }

  const uniqueSkills = [];
  const seenSkill = new Set();
  for (const s of sharedSkills) {
    const key = `${s.name}\u0000${s.desc}`;
    if (seenSkill.has(key)) continue;
    seenSkill.add(key);
    uniqueSkills.push(s);
  }

  // lead 排在最前：界面第一眼要看到「装完先跟谁说话」。
  bots.sort((a, b) => (a.role === b.role ? 0 : a.role === 'lead' ? -1 : 1));

  return {
    ok: errors.length === 0,
    // ok=false 但 bots 非空 = 部分解析成功。这是**诊断视图**，不是可安装结果：
    // 界面可以显示「这三个能装、那个装不了」，但 materialize 会整体拒绝，不会装半套。
    partial: errors.length > 0 && bots.length > 0,
    id: input.id,
    kind: rootManifest.kind,
    rootVersion: rootVersion.version,
    // 这一版是怎么定下来的（最新 / 点名 / 范围里挑的）。界面要能回答
    // 「我给了 ^1.0.0，你怎么挑了 1.2.0」——答案必须来自计划，不能靠界面自己再算一遍。
    versionChoice,
    builtAt: input.now || new Date().toISOString(),
    errors,
    warnings,
    steps,
    bots,
    sharedSkills: uniqueSkills,
    workflow: rootManifest.workflow || [],
    permissions: permissionUnion,
    // 引导层只取**根条目**那一块：组件包装完之后用户是先跟主入口说话，
    // 一次弹四个欢迎语是噪音。成员自己的引导层留在各自模板里，详情页按成员看。
    // 语言不匹配不写成 warnings —— 它不影响能不能装，写成警告会把它变成第二条「装不了」。
    guidance: resolveGuidance(rootManifest, input.locale),
    // 单独给一份，升级流程要把它和自己的权限变化提示去重（不靠匹配文案）。
    permissionNotice,
    integrity: { root: rootVersion.integrity }
  };
}

/** 计划的可读摘要：CLI 与界面共用一份措辞，避免两处说法不一致。 */
export function summarizePlan(plan) {
  if (!plan) return '没有计划';
  if (!plan.ok) return `装不了：${plan.errors.join('；')}`;
  const lead = plan.bots.find((b) => b.role === 'lead');
  const members = plan.bots.filter((b) => b.role !== 'lead');
  const head = `将安装 ${plan.bots.length} 个机器人` + (lead ? `，主入口是「${lead.name}」` : '');
  const rest = members.map((b) => b.name).join('、');
  return rest ? `${head}；同时安装 ${rest}` : head;
}

/** 计划里引用了哪些模板（用于「安装前展示来源」）。 */
export function planSources(plan) {
  if (!isObj(plan) || !Array.isArray(plan.steps)) return [];
  return plan.steps.map((s) => ({ id: s.id, version: s.version, url: s.url }));
}
