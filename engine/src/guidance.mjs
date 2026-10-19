// 引导层：装完之后「它第一句话说什么、先给哪几个能点的入口」。
//
// 为什么单独一层，而不塞进 persona：
// - persona 是模型的长期指令，改它是改角色；引导层是界面文字，用户点一下就走。
// - 混在一起，翻译人设就等于换了个人。而这里只翻界面层 —— 这件事必须**说出来**，
//   不能让人以为「界面是英文 ＝ 它用英文跟你干活」。
//
// 四条硬规则（对应 docs/marketplace.md §11「引导层」，改这里必须改文档）：
// 1. **没有就是没有**：没写引导层不回退去拿 summary 或 persona 凑一句，
//    凑出来的第一句话对用户是承诺，而模板并没有这么承诺。
// 2. **不冒充语言**：请求 en-US 而条目只有 en，答复里必须写清「用的是 en」，
//    请求的语言没有就明说没有，不许把中文文案标成 en。
// 3. **同语言多地区时不替用户挑**：条目同时有 zh-CN 与 zh-TW 而用户只说了「zh」，
//    挑错一个是把简体推给繁体读者 —— 这种情况退回基座语言并说明原因。
// 4. **翻译不完整等于没翻**：完整性在 manifest.mjs 校验时就拦住（缺一块整份拒收），
//    这一层只负责「按用户的语言挑一份出来」，不负责补齐。

/** 语言标签：`zh` / `zh-CN` / `pt-BR` / `zh-Hant` / `es-419`。大小写照收，归一化时统一。 */
const LOCALE = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/**
 * 规范化语言标签：`zh-cn` → `zh-CN`，`zh_Hant` → `zh-Hant`，`es-419` 保持。
 * 认不出就返回 null —— 不要「差不多能用」地猜一个，猜出来的标签会被当成真的。
 */
export function normalizeLocale(tag) {
  if (typeof tag !== 'string') return null;
  const raw = tag.trim().replace(/_/g, '-');
  if (!LOCALE.test(raw)) return null;
  const parts = raw.split('-');
  const rest = parts.slice(1).map((p) => {
    // 地区两位字母大写（CN），文字四位首字母大写（Hant），纯数字（419）原样。
    if (/^[A-Za-z]{2}$/.test(p)) return p.toUpperCase();
    if (/^[A-Za-z]{4}$/.test(p)) return p[0].toUpperCase() + p.slice(1).toLowerCase();
    return p;
  });
  return [parts[0].toLowerCase(), ...rest].join('-');
}

/** `zh-Hant-TW` → `{ language: 'zh', subtags: ['Hant','TW'] }` */
function splitLocale(tag) {
  const parts = tag.split('-');
  return { language: parts[0], subtags: parts.slice(1) };
}

/** 一块引导层里「真的有内容」的字段名。空串与空数组都算没有 —— 写了空等于没写。
 *  校验层与解析层共用这一份：两处各写一遍，迟早一处算「有」一处算「没有」。 */
export function guidanceFields(block) {
  const out = [];
  if (block && typeof block.welcome === 'string' && block.welcome.trim()) out.push('welcome');
  if (block && Array.isArray(block.quickPrompts) && block.quickPrompts.length) out.push('quickPrompts');
  if (block && Array.isArray(block.taskExamples) && block.taskExamples.length) out.push('taskExamples');
  return out;
}

function pick(block) {
  return {
    welcome: block && typeof block.welcome === 'string' ? block.welcome : '',
    quickPrompts: block && Array.isArray(block.quickPrompts) ? [...block.quickPrompts] : [],
    taskExamples: block && Array.isArray(block.taskExamples)
      ? block.taskExamples.map((e) => (e && typeof e === 'object' ? { ...e } : e))
      : []
  };
}

/**
 * 查表。顺序固定，所以同样的输入永远给同样的结果（缓存与快照才有意义）：
 *   1. 精确命中
 *   2. 请求的语种和基座是同一个语种 → 给基座（基座是作者自己写的，不需要猜地区）
 *   3. 同语种的无地区条目
 *   4. 同语种只有一份带地区的 → 用它；有多份带地区的 → 不替用户挑
 * 不做文字推断：`zh-Hans` 不自动等于 `zh-CN`，那是猜，猜错了就是把简体推给繁体用户。
 */
function lookup(table, want, base) {
  if (table.has(want)) return { locale: want, reason: 'exact' };
  const { language, subtags } = splitLocale(want);
  if (base && splitLocale(base).language === language) {
    return { locale: base, reason: 'base-language' };
  }
  const sameLang = [...table.keys()].filter((k) => splitLocale(k).language === language);
  const bare = sameLang.find((k) => splitLocale(k).subtags.length === 0);
  if (bare) return { locale: bare, reason: 'same-language' };
  if (sameLang.length > 1) return { locale: null, reason: 'ambiguous', candidates: sameLang };
  if (sameLang.length === 1) return { locale: sameLang[0], reason: subtags.length ? 'language-only' : 'same-language' };
  return { locale: null, reason: 'no-match' };
}

function finish({ want, locale, reason, note, base, baseBlock, translatedBlock }) {
  // 翻译块和基座同语言时不算「翻过」：那只是条目里多写了一份重复内容。
  const translated = !!translatedBlock && locale !== base;
  const source = translated ? translatedBlock : baseBlock;
  const content = pick(source);
  const notes = [...note];

  // 三值：true 引导语翻过、人设没翻；false 全程同一语言；null 不知道基座语言（别当成 false）。
  const partial = base === null ? null : translated;
  if (partial === true) {
    notes.push(`这段引导语是 ${locale}，人设仍是 ${base} —— 它跟你干活时说的还是那个语言`);
  } else if (partial === null) {
    notes.push('条目没声明基座语言（defaultLocale），无法判断这段引导语和人设是不是同一种语言');
  }
  if (source && !guidanceFields(source).length) {
    // 校验层不会放行空块，但真出现时要说「这块是空的」，不能装作有内容。
    notes.push(`${locale || '这块'}引导层是空的`);
  }

  return {
    present: true,
    requested: want,
    locale,
    // exact = 没为你降级。没请求语言时，只要知道基座语言就算不降级。
    exact: locale !== null && (want === null || locale === want),
    reason,
    baseLocale: base,
    translated,
    personaLocale: base,
    partial,
    notes,
    ...content
  };
}

/**
 * 按用户语言解析出一块引导层。
 *
 * 返回里的三件事要分清，混起来就会撒谎：
 *   - `locale`      **实际给出的**那块内容的语言（不一定是请求的语言）
 *   - `requested`   用户请求的语言（规范化后；没请求是 null）
 *   - `exact`       有没有为用户降级（false 时 `notes` 里必有原因）
 * 另外 `personaLocale` / `partial` 说明人设语言：
 *   - `partial === true`：引导语翻过了，人设没翻 —— 它回你话还是基座语言
 *   - `partial === null`：条目没说基座语言，**不知道**人设用哪种话
 *   - `partial === false`：全程同一种语言，没有这个落差
 *
 * @param {object} manifest 规范化后的模板/组件包
 * @param {string} [requested] 用户语言，可空
 */
export function resolveGuidance(manifest, requested) {
  const base = manifest && typeof manifest.defaultLocale === 'string' ? normalizeLocale(manifest.defaultLocale) : null;
  const baseBlock = manifest && manifest.guidance ? manifest.guidance : null;
  const want = normalizeLocale(requested);
  const gaveUnusable = requested !== undefined && requested !== null && requested !== '' && want === null;

  if (!baseBlock) {
    return {
      present: false,
      requested: want,
      locale: null,
      exact: false,
      reason: 'no-guidance',
      baseLocale: base,
      translated: false,
      personaLocale: base,
      partial: null,
      notes: ['这个条目没有写引导层：装完之后它不会主动说第一句话，也没有可点的入口'],
      welcome: '', quickPrompts: [], taskExamples: []
    };
  }

  const notes = [];
  if (gaveUnusable) {
    // 请求了但认不出：别静默当成「没请求」，否则界面永远不知道自己被忽略了。
    notes.push(`「${String(requested)}」不是能识别的语言标签，按基座语言给`);
  }

  if (!want || want === base) {
    return finish({
      want: want || null,
      locale: base,
      reason: !want ? (gaveUnusable ? 'invalid-locale' : 'no-preference') : 'base-exact',
      note: notes,
      base,
      baseBlock
    });
  }

  const table = new Map();
  const dupes = [];
  if (manifest && manifest.i18n && typeof manifest.i18n === 'object') {
    for (const [tag, value] of Object.entries(manifest.i18n)) {
      const norm = normalizeLocale(tag);
      if (!norm) continue; // 校验层已经拦过，这里只是别炸
      if (table.has(norm)) { dupes.push(norm); continue; }
      table.set(norm, value);
    }
  }
  if (dupes.length) notes.push(`条目里有重复的语言块（${[...new Set(dupes)].join('、')}），只取第一份`);

  const chosen = lookup(table, want, base);
  if (chosen.locale) {
    if (chosen.reason === 'base-language') {
      // 只说「同语种、退到基座」，不说「一样」—— 简体与繁体同属中文，但推错一个也是推错。
      notes.push(`条目没有 ${want} 的引导层，用的是同语种的基座 ${chosen.locale}`);
    } else if (chosen.reason !== 'exact') {
      notes.push(`条目没有 ${want} 的引导层，用的是 ${chosen.locale}`);
    }
    return finish({
      want,
      locale: chosen.locale,
      reason: chosen.reason,
      note: notes,
      base,
      baseBlock,
      translatedBlock: chosen.reason === 'base-language' ? null : table.get(chosen.locale)
    });
  }
  if (chosen.reason === 'ambiguous') {
    notes.push(`条目同时有 ${chosen.candidates.join(' / ')}，看不出你读哪一种，用的是基座语言 ${base || '（未声明）'}`);
  } else if (base === null) {
    notes.push(`条目没有 ${want} 的引导层，也没有声明基座语言（defaultLocale）`);
  } else {
    notes.push(`条目没有 ${want} 的引导层，也没有同语种的其它版本，用的是基座语言 ${base}`);
  }
  return finish({ want, locale: base, reason: chosen.reason, note: notes, base, baseBlock });
}
