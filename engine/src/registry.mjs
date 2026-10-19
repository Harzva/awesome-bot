// 目录（registry）的解析与查询。
//
// 发现方式学 DSH：**目录是一份静态 JSON，可以从任何 HTTPS 地址读**，
// 官方目录只是默认源，不是唯一源。所以这里不含任何 GitHub 专用逻辑，
// 也不要求登录、不要求中心服务在线；企业内网自建一份同样能用。
//
// 一个 id 可能在多个源里出现。合并规则写死在这里：
// 官方源优先，社区源只补空缺，并且**永远保留来源**，界面必须能说出
// 「这个模板来自哪个源、验证过没有」。不要去重成一个不带来源的列表。
import { REGISTRY_SCHEMA, cleanSignature, canonicalJson } from './manifest.mjs';
import { satisfies, sortDesc, valid as validVersion } from './semver.mjs';
import { keyIdOf, verifyJson, verifyAgainstKeys } from './sign.mjs';
import { parseInstant, MAX_TTL_DAYS } from './lifetime.mjs';

const ENTRY_ID = /^[a-z0-9][a-z0-9-]{0,31}\/[a-z0-9][a-z0-9-]{0,47}$/;
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const trim = (v) => (typeof v === 'string' ? v.trim() : '');

export const TRUST = { official: 'official', community: 'community' };

/**
 * 校验一份目录文档。
 * @returns {{ok:boolean, errors:string[], value:object|null}}
 */
export function validateRegistry(input, path = 'registry') {
  const errors = [];
  if (!isObj(input)) return { ok: false, errors: [`${path}：不是对象`], value: null };
  if (input.schema !== REGISTRY_SCHEMA) {
    return { ok: false, errors: [`${path}.schema：必须是 ${REGISTRY_SCHEMA}`], value: null };
  }
  const name = trim(input.name);
  if (!name) errors.push(`${path}.name：目录必须有名字（界面上要说清这是哪份目录）`);
  if (!Array.isArray(input.entries)) {
    return { ok: false, errors: [...errors, `${path}.entries：必须是数组`], value: null };
  }

  // 目录自己的签名：验的是「这份目录是不是官方发的」，钥匙必须来自客户端内置，
  // 不能来自目录里的 keys（那样被替换的目录可以自带一把钥匙给自己发证）。
  const signature = cleanSignature(input.signature, path, errors);

  // 有效期：**顶层字段**，因此被签名覆盖。
  // 不能放进 signature 里 —— signableBytes 会整个剔掉 signature，
  // 那样谁都能把它改成 2099 年而签名照样「有效」（这一条有测试看着）。
  let issued = null;
  if (input.issued !== undefined) {
    if (!isObj(input.issued)) {
      errors.push(`${path}.issued：必须是对象（{at, expires}）`);
    } else {
      const at = parseInstant(trim(input.issued.at));
      const expires = parseInstant(trim(input.issued.expires));
      const ttl = at !== null && expires !== null ? expires - at : null;
      if (at === null) errors.push(`${path}.issued.at：要写带时区的 ISO 时刻（如 2026-10-20T00:00:00Z）`);
      else if (expires === null) errors.push(`${path}.issued.expires：要写带时区的 ISO 时刻（如 2027-01-18T00:00:00Z）`);
      else if (ttl <= 0) errors.push(`${path}.issued.expires：必须晚于 at`);
      else if (ttl > MAX_TTL_DAYS * 86_400_000) {
        errors.push(`${path}.issued.expires：有效期最长 ${MAX_TTL_DAYS} 天（再长就等于没有有效期）`);
      } else {
        issued = { at: new Date(at).toISOString(), expires: new Date(expires).toISOString() };
      }
    }
  }

  // 撤回名单：官方说「这个版本别再装了」「这把发布者钥匙作废了」。
  // 它只对**验过签名的目录**有效（见 mergeRegistries）—— 否则谁都能借 --source 下架别人的模板。
  const revoked = {};
  if (input.revoked !== undefined) {
    if (!isObj(input.revoked)) errors.push(`${path}.revoked：必须是对象（{keyIds, versions}）`);
    else {
      const keyIds = [];
      if (input.revoked.keyIds !== undefined && !Array.isArray(input.revoked.keyIds)) {
        errors.push(`${path}.revoked.keyIds：必须是数组`);
      } else {
        for (const item of input.revoked.keyIds || []) {
          const keyId = trim(item);
          if (!/^ed25519-[A-Za-z0-9_-]{16}$/.test(keyId)) errors.push(`${path}.revoked.keyIds：${JSON.stringify(item)} 不是 keyId`);
          else if (!keyIds.includes(keyId)) keyIds.push(keyId);
        }
      }
      const versions = [];
      if (input.revoked.versions !== undefined && !Array.isArray(input.revoked.versions)) {
        errors.push(`${path}.revoked.versions：必须是数组`);
      } else {
        for (const item of input.revoked.versions || []) {
          const text = trim(item);
          const at = text.lastIndexOf('@');
          const id = at > 0 ? text.slice(0, at) : '';
          const version = at > 0 ? text.slice(at + 1) : '';
          // 撤回项必须是「哪个 id 的哪个版本」：只写 id 会把整个模板下架，
          // 那会让已装用户的升级路径突然消失，不是撤回该有的效果。
          if (!ENTRY_ID.test(id) || !validVersion(version)) {
            errors.push(`${path}.revoked.versions：${JSON.stringify(item)} 要写成 id@版本（如 openbot/writer@1.0.0）`);
          } else if (!versions.includes(text)) versions.push(text);
        }
      }
      if (keyIds.length) revoked.keyIds = keyIds.sort();
      if (versions.length) revoked.versions = versions.sort();
    }
  }

  // 公钥表：keyId → PEM。放在目录顶层而不是每条目内嵌，一份 key 只出现一次，
  // 也便于「换 key」时一眼看出多了哪一把。
  const keys = {};
  if (input.keys !== undefined) {
    if (!isObj(input.keys)) errors.push(`${path}.keys：必须是对象（keyId → 公钥 PEM）`);
    else {
      for (const [keyId, pem] of Object.entries(input.keys)) {
        const actual = keyIdOf(pem);
        if (!actual) { errors.push(`${path}.keys["${keyId}"]：公钥解析失败`); continue; }
        // keyId 必须由公钥算出来：允许随便填，等于允许「换 key 保留 id」。
        if (actual !== keyId) { errors.push(`${path}.keys["${keyId}"]：与公钥算出的 ${actual} 不一致`); continue; }
        keys[keyId] = pem;
      }
    }
  }

  const entries = [];
  const seen = new Set();
  for (const [i, raw] of input.entries.entries()) {
    const at = `${path}.entries[${i}]`;
    if (!isObj(raw)) { errors.push(`${at}：必须是对象`); continue; }
    const id = trim(raw.id);
    if (!ENTRY_ID.test(id)) { errors.push(`${at}.id：不是合法的 publisher/name`); continue; }
    if (seen.has(id)) { errors.push(`${at}.id：同一份目录里重复出现 ${id}`); continue; }
    seen.add(id);
    if (raw.kind !== 'template' && raw.kind !== 'bundle') {
      errors.push(`${at}.kind：必须是 template 或 bundle`);
      continue;
    }
    if (!Array.isArray(raw.versions) || raw.versions.length === 0) {
      errors.push(`${at}.versions：至少要有 一个版本`);
      continue;
    }
    const versions = [];
    for (const [j, v] of raw.versions.entries()) {
      const vat = `${at}.versions[${j}]`;
      if (!isObj(v)) { errors.push(`${vat}：必须是对象`); continue; }
      const version = trim(v.version);
      if (!validVersion(version)) { errors.push(`${vat}.version：不是合法 semver`); continue; }
      const url = trim(v.url);
      // 相对地址由调用方按目录自身位置解析；这里只拒绝明显不是路径/URL 的值。
      if (!url) { errors.push(`${vat}.url：必须有下载地址`); continue; }
      const integrity = trim(v.integrity);
      if (!/^sha256-[A-Za-z0-9+/]{43}=$/.test(integrity)) {
        // 没有摘要的条目仍然可以展示，但安装时必须要求用户显式确认。
        errors.push(`${vat}.integrity：缺少 sha256 摘要（不能确认内容没被改过）`);
        continue;
      }
      if (versions.some((x) => x.version === version)) { errors.push(`${vat}.version：${version} 重复`); continue; }
      // 每个版本记「它自己是谁签的」：换钥匙之后老版本还是老钥匙签的，
      // 用一个条目级 keyId 去验全部版本，会让轮换那一天所有历史版本突然「签名为假」。
      const signer = trim(v.signer);
      if (signer && !keys[signer]) {
        errors.push(`${vat}.signer：公钥表里没有 ${signer}（换过钥匙的话，旧公钥要留在 keys 里）`);
        continue;
      }
      versions.push({
        version,
        url,
        integrity,
        ...(signer ? { signer } : {}),
        ...(trim(v.publishedAt) ? { publishedAt: trim(v.publishedAt) } : {})
      });
    }
    if (versions.length === 0) { errors.push(`${at}.versions：没有可用版本`); continue; }

    const publisher = isObj(raw.publisher)
      ? { name: trim(raw.publisher.name), ...(trim(raw.publisher.keyId) ? { keyId: trim(raw.publisher.keyId) } : {}) }
      : null;
    // 声明了 keyId 却没有对应公钥 = 无法验签，却还挂着「这是某发布者」的签名身份。
    if (publisher && publisher.keyId && !keys[publisher.keyId]) {
      errors.push(`${at}.publisher.keyId：目录公钥表里没有 ${publisher.keyId}，无法验签`);
      continue;
    }

    entries.push({
      id,
      kind: raw.kind,
      name: trim(raw.name) || id,
      summary: trim(raw.summary),
      tags: Array.isArray(raw.tags) ? raw.tags.map((t) => trim(t).toLowerCase()).filter(Boolean) : [],
      verified: raw.verified === true,
      publisher,
      versions: sortDesc(versions.map((v) => v.version)).map((v) => versions.find((x) => x.version === v))
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    // 验签/验摘要一律用 raw：signature 与 integrity 都算在**原始解析结果**上。
    // value 是规范化视图（补默认值、丢未知字段），对 value 验签必然对不上，
    // 那会让「签名有效」永远为假，而原因极难查。
    raw: input,
    value: errors.length === 0
      ? {
        schema: REGISTRY_SCHEMA,
        name,
        ...(trim(input.updatedAt) ? { updatedAt: trim(input.updatedAt) } : {}),
        // 带出来只为展示（界面上要能显示「这份目录是谁签的、还有多久到期」），不要拿 value 去验签
        ...(signature ? { signature } : {}),
        ...(issued ? { issued } : {}),
        ...(Object.keys(revoked).length ? { revoked } : {}),
        ...(Object.keys(keys).length ? { keys } : {}),
        entries
      }
      : null
  };
}

/**
 * 目录自己的签名校验。传**原始解析结果**（validateRegistry 的 raw，或自己 parse 出来的对象），
 * 不要传 value。
 * @param {{ok:boolean,keyId:string|null,reason:string|null, tried:number}} 由 verifyAgainstKeys 给出
 */
export function checkRegistrySignature(registry, pinnedKeys) {
  return verifyAgainstKeys(registry, pinnedKeys);
}

/**
 * 生成目录时决定「要不要沿用上一份的签名」。
 *
 * 只在签名对**新内容**依然有效时沿用，不做「只要有 signature 就抄过来」：
 * 内容改了签名就作废，留着它等于给一份改过的目录挂上旧的合格标记。
 * 也正因为这里做的是验证而不是搬运，`build-registry --check` 不需要私钥。
 */
export function carrySignature(draft, previous, publicKeyPem) {
  const prevSig = previous && previous.signature;
  if (!prevSig || !publicKeyPem) return draft;
  // `issued` 也是被签住的内容，而它只能由签名那一步写。
  // 不把它一起沿用，签名就会因为「少了 issued」验不过，于是**每次 build 都要求重签** ——
  // 而 build 只是重算摘要，看上去什么都没变。这条不只影响 --check，它会让签名悄悄丢掉。
  const withIssued = previous.issued && !draft.issued ? { ...draft, issued: previous.issued } : draft;
  const candidate = { ...withIssued, signature: prevSig };
  if (verifyJson(candidate, publicKeyPem).ok) return candidate;
  return draft;
}

/** 规范化后的内容比较：判断「除了签名，目录是否一个字都没变」。 */
export function contentOf(registry) {
  const copy = { ...registry };
  delete copy.signature;
  return canonicalJson(copy);
}

/** 目录里版本号最高的那一版，**不管是否被撤回**。只用来展示「原本最高的是谁」。 */
export function newestOf(entry) {
  if (!entry || !Array.isArray(entry.versions) || entry.versions.length === 0) return null;
  return sortDesc(entry.versions.map((v) => v.version))[0] || null;
}

/** 能装的版本（跳过被撤回的），从新到旧。 */
export function installableVersions(entry) {
  const list = entry && Array.isArray(entry.versions) ? entry.versions : [];
  return list.filter((v) => v && v.revoked !== true);
}

/**
 * 用户说的「版本」是哪一种写法：`exact`（1.2.0）/ `range`（^1.0.0、~1.2.0、>=1.1.0 <2.0.0、*）/ `invalid`。
 *
 * 认不出的必须在这里就拒，不能丢给 `satisfies`：它遇到不认识的范围只返回 false，
 * 于是「`1.x` 这种写法我不支持」会变成「没有这个版本」—— 用户会去目录里找一个根本不存在的版本，
 * 而真正的问题是写法。支持的范围子集见 `semver.mjs` 顶部注释，这里只做分类，不另写一套规则。
 */
export function versionSpecKind(spec) {
  const s = typeof spec === 'string' ? spec.trim() : '';
  if (!s) return 'invalid';
  if (validVersion(s)) return 'exact';
  // 有算子（< > = ~ ^ *）、空白（AND）或 `||`（OR）才算范围；`1.x` / `1.1` / `latest` 都不算。
  return /[<>=~^*]|\s|\|\|/.test(s) ? 'range' : 'invalid';
}

/**
 * 把一个范围落成一个具体版本：匹配的按从新到旧排，取最高的一版。
 *
 * 只回答「范围里有哪几版、最高的是谁」，**不做方向判断** —— 升级与回退的方向、能否降级、
 * 「已经在这范围里了」这几种情况都由调用方用同一套 `compare` 处理。
 * 在这里再判一次方向，就会出现两套「不能降级」的说法。
 *
 * @returns {{spec:string, matched:string[], version:string|null, available:string[], revokedMatched:string[]}}
 *   available        目录里**可安装**的版本（已排除被撤回的）
 *   revokedMatched   本来满足这个范围、但已被撤回的版本（说「没有匹配」时得能解释这一点）
 */
export function resolveRange(entry, spec) {
  const alive = installableVersions(entry);
  const available = alive.map((v) => v.version);
  const matched = sortDesc(alive.filter((v) => satisfies(v.version, spec)).map((v) => v.version));
  // 被撤回的版本不算候选，但「它本来匹配」是一件要说出来的事：
  // 否则用户看到「没有匹配 ^1.3」会以为是自己写错了范围。
  const revokedMatched = (entry && Array.isArray(entry.versions) ? entry.versions : [])
    .filter((v) => v && v.revoked === true && satisfies(v.version, spec))
    .map((v) => v.version);
  return { spec: String(spec), matched, version: matched[0] || null, available, revokedMatched };
}

/**
 * 目录里**会装**的那一版：最新的、且没被撤回。
 *
 * 与 `newestOf` 分开是因为两者回答的问题不同：界面上要显示「原本最高的是 1.2.0（⊘ 已撤回）」，
 * 而安装要回答「那我实际会装哪一版」。把这两件事混成一个函数，就会出现
 * 「显示 1.2.0、实际装 1.1.0」这种说不清的状态。
 */
export function latestOf(entry) {
  const versions = installableVersions(entry).map((v) => v.version).filter(validVersion);
  return sortDesc(versions)[0] || null;
}

/**
 * 挑一个满足范围的版本。范围不匹配返回 null —— **不退回最新版**：
 * 「要 1.x 却装了 2.0」是最难查的那类错。
 * 被撤回的版本不参与挑选：撤回的意思是「这一版别再装了」，不是「这个模板没了」，
 * 所以退到下一个没被撤回的版本是对的；但如果范围只能靠它满足，那就是真的没有。
 */
export function pickVersion(entry, range = '*') {
  const ok = installableVersions(entry).filter((v) => satisfies(v.version, range));
  if (ok.length === 0) return null;
  const best = sortDesc(ok.map((v) => v.version))[0];
  return ok.find((v) => v.version === best) || null;
}

/**
 * 合并多份目录。返回的每个 entry 带 sources[]（来自哪几份源）与 trust
 * （只要有一份官方源声明它就是 official，否则 community）。
 *
 * 另外汇总 sourcesRevoked：**只采信验过签名的源**声明的撤回。
 * 否则一份 `--source` 就能把别人的模板下架 —— 那是拿撤回当攻击手段。
 *
 * 每个版本被**打上它自己那份源的 baseUrl / allowFile / keys**：
 * 目录里的 url 是相对自己那份目录的（`../templates/x.json`），合并后只留一个全局 baseUrl
 * 会把 B 源的模板拼到 A 源的域名下 —— 轻则 404，重则从错误的源取到内容。
 * allowFile 同理：远端源不许指到 `file://`，否则一份恶意社区目录能读到本机任意文件。
 * keys 同理：验签要用「发这份内容的那个源」登记的公钥，拿 A 源的公钥去验 B 源的内容
 * 只会得到「签名对不上」，而这会被误读成人篡改了内容。
 *
 * source.trust 由调用方按**签名能否用内置公钥验过**决定（见 trust.classifySource），
 * 不是源自己声明的字段。
 */
export function mergeRegistries(sources) {
  const list = Array.isArray(sources) ? sources : [];
  const byId = new Map();
  const problems = [];

  const stamp = (entry, source, trust) => {
    // 同一份源的所有版本共用一个 keys 对象（引用共享，不复制）：合并后在内存里只有一份。
    const keysOf = source.keys || {};
    return {
      ...entry,
      versions: entry.versions.map((v) => ({
        ...v,
        sourceBase: source.baseUrl || '',
        sourceAllowFile: source.allowFile === true,
        sourceKeys: keysOf,
        sourceTrust: trust
      }))
    };
  };
  const descriptor = (source, trust) => ({
    name: source.name || '未命名源',
    trust,
    url: source.url || '',
    baseUrl: source.baseUrl || '',
    // 带上判断依据：「社区」两个字要能说清是因为没签名、验不过、还是本机没锚点
    verified: source.verified === true,
    keyId: source.keyId || null,
    reason: source.reason || null,
    // 「这份源是什么时候签的」要跟着来源一起走：装哪个条目就得按那个来源的时间判断，
    // 不能拿主源的有效期去判断社区源给的条目（那是两把钥匙、两份签名）。
    lifetime: source.lifetime || null
  });

  const revokedKeyIds = new Set();
  const revokedVersions = new Set();

  for (const source of list) {
    const trust = source.trust === TRUST.official ? TRUST.official : TRUST.community;
    const reg = source.registry;
    if (!reg || !Array.isArray(reg.entries)) { problems.push(`${source.name || '未命名源'}：没有可用目录`); continue; }

    // 撤回名单只认验过签名的源。没验过的源声明撤回 = 它想让别人的东西下架，
    // 而它自己没有任何资格作这个判断（下架等于让已装用户的升级路径消失）。
    const decl = reg.revoked || {};
    const declared = [...(decl.keyIds || []), ...(decl.versions || [])];
    if (declared.length && trust !== TRUST.official) {
      problems.push(`「${source.name || '未命名源'}」不是官方目录，它声明的 ${declared.length} 条撤回不采信`);
    } else if (declared.length) {
      for (const keyId of decl.keyIds || []) revokedKeyIds.add(keyId);
      for (const version of decl.versions || []) revokedVersions.add(version);
    }

    for (const rawEntry of reg.entries) {
      const entry = stamp(rawEntry, source, trust);
      const existing = byId.get(entry.id);
      if (!existing) {
        byId.set(entry.id, {
          ...entry,
          trust,
          sources: [descriptor(source, trust)]
        });
        continue;
      }
      existing.sources.push(descriptor(source, trust));
      // 官方条目只认官方声明的版本。
      // 允许社区源给官方 id 追加版本，等于允许任何人给 `openbot/writer` 发一个 9.9.9；
      // 界面上它还是同一个名字、同一个作者，用户看不出区别。所以这里宁可少一个版本。
      if (existing.trust === TRUST.official && trust !== TRUST.official) {
        problems.push(`${entry.id}：社区源「${source.name || '未命名源'}」试图为官方条目提供版本，已忽略`);
        continue;
      }
      // 社区条目被官方源接管：元数据以官方为准，社区贡献的版本不保留（同上理由）。
      if (trust === TRUST.official && existing.trust !== TRUST.official) {
        const keptSources = existing.sources;
        const dropped = existing.versions.length;
        byId.set(entry.id, { ...entry, trust, sources: keptSources });
        if (dropped) problems.push(`${entry.id}：官方源接管后，社区源提供的 ${dropped} 个版本不再采用`);
        continue;
      }
      const known = new Map(existing.versions.map((v) => [v.version, v]));
      for (const v of entry.versions) {
        const prev = known.get(v.version);
        if (!prev) {
          existing.versions.push(v);
          known.set(v.version, v);
          continue;
        }
        // 同一个版本号、两份源给的摘要不一样：至少有一份是旧的或被改过。
        // 这里没有时间线可比，不裁决谁对；但绝不静默 —— 静默等于随机挑一份装，
        // 而用户看到的是同一个 id、同一个版本号。
        if (prev.integrity !== v.integrity) {
          problems.push(`${entry.id}@${v.version}：两份源给的摘要不一致，按先出现的那份；「${source.name || '未命名源'}」给的这份未采用`);
        }
      }
      existing.versions = sortDesc(existing.versions.map((v) => v.version))
        .map((ver) => existing.versions.find((x) => x.version === ver));
    }
  }

  // 撤回标记落到**版本**上，而不是只留在目录顶层的 revoked 列表里。
  //
  // 顶层的 revoked 回答的是「官方撤回了什么」；可每个要选版本的人（plan 挑根、plan 挑成员、
  // upgrade 定目标、rollback 定目标、列表标 ⊘）都需要「这一版能不能装」。让他们各自去查
  // 那个集合，就一定会有一处忘查 —— 而忘查的表现是「装上了被撤回的版本」，
  // 也就是撤回机制在最该生效的那条路径上失效。
  const entries = [...byId.values()].map((entry) => ({
    ...entry,
    versions: entry.versions.map((v) => (revokedVersions.has(`${entry.id}@${v.version}`) ? { ...v, revoked: true } : v))
  }));

  return {
    entries,
    problems,
    revoked: {
      keyIds: [...revokedKeyIds].sort(),
      versions: [...revokedVersions].sort()
    }
  };
}

/** 关键词搜索：命中 id / name / summary / tags，返回按相关度粗排的列表。 */
export function search(entries, query) {
  const q = trim(query).toLowerCase();
  const list = Array.isArray(entries) ? entries : [];
  if (!q) return list;
  const scored = [];
  for (const entry of list) {
    let score = 0;
    if (entry.id.toLowerCase().includes(q)) score += 4;
    if (entry.name.toLowerCase().includes(q)) score += 3;
    if (entry.tags.some((t) => t.includes(q))) score += 2;
    if (entry.summary.toLowerCase().includes(q)) score += 1;
    if (score > 0) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((x) => x.entry);
}

/** 相对地址解析：目录里的 url 可以是相对路径，按目录本身位置展开。 */
export function resolveUrl(base, url) {
  try {
    return new URL(url, base).toString();
  } catch {
    return '';
  }
}
