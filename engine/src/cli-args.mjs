// 命令行参数闸门：**不认识的参数一律拒绝**，版本参数统一成一个说法。
//
// 为什么值得单独一份文件：
//   1. 参数解析是「有就收」的，没人读的键会**静默失效**。于是 `--take-templat=skills`
//      （少一个 e）、`--to=1.1.0`（这个命令原本不读 to）看着都「加上了」，实际按默认做完。
//      用户以为生效了，事后只能靠结果反推 —— 这不是严格一点的问题，是把「我要 A」
//      变成了「我得到 B，而且没人告诉我」。
//   2. 表是唯一实现：`help` 从同一张表生成，闸门也从同一张表判。表漏了哪个参数，
//      用户一敲就会看到「不认识」，当场发现；而不是等某次发布后才发现旗子白加了。
//
// 判据只管「这个名字这个命令认不认」，不管值的格式 —— 值怎么错由各命令自己说
// （版本不存在、文件读不了、时长写错），因为那些错误要说的话完全不一样。

/** 读目录的命令都认这些（源、信任、缓存）。keygen 与 gc 不读目录，所以不带。 */
const COMMON = {
  registry: '换掉默认源：只读这一份目录（不写就是仓库里那份）',
  file: '只读这一份本地目录',
  source: '追加一份源，可重复、也可逗号分隔（第一份是主源）',
  'allow-community': '允许装非官方源的条目',
  'allow-unpinned': '没有内置公钥时也肯读本地目录（会明确标出「没条件验」）',
  'pinned-key': '用指定的公钥文件当锚点（默认用 keys/official.public.json）',
  cache: '把目录与内容留在本机（默认 market/.cache）',
  'max-age': '多久之内不再联网取目录（30s / 10m / 2h / 1d）',
  offline: '一个请求都不发，只用缓存；缺哪份会按 id@版本 点名'
};

/** 与版本有关的两把旗子：同一个意思两种写法都认，写两个不一致的说法直接报错。 */
export const VERSION_FLAGS = ['to', 'version'];

/**
 * 目录签名过期之后唯一说得通的旗子。
 * 只挂在「会把内容装进实例」的四个命令上：`list` / `info` / `verify` 不装东西，
 * 给它们加这个参数就是「收下了却没人读」—— 那等于让用户以为它起了作用。
 */
const ALLOW_EXPIRED = {
  'allow-expired': '目录签名过期了也照装（明确接受「这期间可能已经撤回了你要装的版本」）'
};

const VERSION_DOC = {
  version: '哪个版本或范围（不写就是最新；与 --to 同义，两个写不一样的值会直接报错）。'
    + '写完整版本 1.2.0 就是它本身；写范围 ^1.0.0 / ~1.2.0 / ">=1.1.0 <2.0.0" / * 时挑范围内合适的那一版，并说清挑了哪个。'
    + '`1.x` 这种简写不认，会明确报错而不是当成「没有这个版本」',
  to: '同 --version：装/升/退到哪个版本或范围'
};

/** 每个命令：一句话说明 + 自己认的参数（COMMON 由闸门自动并上）。 */
export const COMMANDS = {
  list: {
    summary: '列条目（每个 id 一行，显示最新版本）',
    flags: {
      query: '按关键词过滤（id / 名称 / 摘要 / 标签）',
      kind: '只看 template 或 bundle',
      versions: '把每个 id 的所有版本都列出来（含已撤回、已下架的）'
    }
  },
  info: {
    summary: '看一个条目的详情（人设、技能卡、权限、引导层）',
    flags: {
      ...VERSION_DOC,
      locale: '按哪种语言显示引导层（en / zh-CN / pt-BR）'
    }
  },
  plan: {
    summary: '出安装计划，不写任何文件',
    flags: {
      ...VERSION_DOC,
      ...ALLOW_EXPIRED,
      openbot: '当前应用版本，用来检查模板要求的 openbot 版本',
      locale: '按哪种语言显示引导层',
      json: '把计划原样输出成 JSON'
    }
  },
  install: {
    summary: '出计划并落成配置包（可同时写安装记录）',
    flags: {
      ...VERSION_DOC,
      ...ALLOW_EXPIRED,
      openbot: '当前应用版本',
      locale: '按哪种语言显示引导层',
      json: '把计划原样输出成 JSON',
      existing: '已有的 bots 列表，用来避免 id/名字撞车',
      out: '配置包写到哪（默认 market/build/<slug>.fleet.json）',
      record: '安装记录写到哪（升级/回退/清缓存都要它）'
    }
  },
  upgrade: {
    summary: '把已装实例升到更高版本（默认最新）',
    flags: {
      ...VERSION_DOC,
      ...ALLOW_EXPIRED,
      installed: '安装记录（安装时 materialize 返回的那个）',
      current: '实例现在的内容；给了才能判断你装完之后改没改',
      openbot: '当前应用版本',
      'take-template': '冲突字段改用模板的（点名 skills 就是整组换）',
      apply: '真写盘；不写只预演',
      out: '把结果写成 JSON'
    }
  },
  rollback: {
    summary: '把已装实例退回旧版本（默认「比现在低的最高一版」）',
    flags: {
      ...VERSION_DOC,
      ...ALLOW_EXPIRED,
      installed: '安装记录',
      current: '实例现在的内容',
      openbot: '当前应用版本',
      'accept-state-loss': '目标版本自己说读不懂现在的状态格式，仍要照退',
      'take-template': '冲突字段改用模板的（点名 skills 就是整组换）',
      apply: '真写盘；不写只预演',
      out: '把结果写成 JSON'
    }
  },
  verify: {
    summary: '校验收录内容：摘要、格式、签名、覆盖率',
    flags: {
      'require-signature': '没有签名就当错误（默认只警告）'
    }
  },
  gc: {
    summary: '清理内容缓存（默认只预演）',
    flags: {
      cache: '缓存目录（默认 market/.cache）',
      limit: '容量上限（默认 500MB）',
      keep: '这些 id@版本 永远不删，可重复',
      installed: '按安装记录保住已装的内容',
      'purge-broken': '把读不出结构的缓存文件也清掉',
      apply: '真删；不写只预演',
      json: '把报告输出成 JSON'
    }
  },
  keygen: {
    summary: '生成一把发布钥匙（换钥匙请换个 --out，别覆盖）',
    flags: {
      out: '钥匙文件写到哪（默认 keys/official）',
      force: '允许覆盖已存在的私钥（覆盖后旧内容就再也验不了了）'
    }
  }
};

/** 读目录的那几个命令：只有它们带 COMMON。 */
const READS_CATALOGUE = new Set(['list', 'info', 'plan', 'install', 'upgrade', 'rollback', 'verify']);

/**
 * 这个命令认的全部参数名（读目录的命令再并上 COMMON）。
 * gc 与 keygen 不读目录：`gc --offline` 加了也不生效，那正是这份文件要治的病 ——
 * 所以不给它们并 COMMON，宁可让人当场看到「不认识」。
 */
export function allowedFlags(cmd) {
  const names = new Set();
  const spec = COMMANDS[cmd];
  if (spec) for (const name of Object.keys(spec.flags)) names.add(name);
  if (READS_CATALOGUE.has(cmd)) for (const name of Object.keys(COMMON)) names.add(name);
  return names;
}

/** 编辑距离，只用于「你是不是想写 X」这一句提醒。 */
function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * 最接近的已知参数；差得太远就返回 null。
 * 不做「猜一个最像的」硬凑：`--foo` 硬说成 `--file` 会让人以为系统知道他要什么。
 */
export function closestFlag(name, names) {
  let best = null;
  let bestScore = Infinity;
  for (const candidate of names) {
    const d = distance(name, candidate);
    if (d < bestScore) { bestScore = d; best = candidate; }
  }
  // 两个字母以内，而且别比名字本身还长（`--a` 不该被说成 `--apply`）
  const limit = Math.min(2, Math.max(1, Math.floor(name.length / 3)));
  return best && bestScore <= limit ? best : null;
}

/**
 * 这个命令认不认这些参数。
 * @returns {{ok:boolean, unknown:Array<{name:string, suggest:string|null}>, allowed:string[]}}
 */
export function checkFlags(cmd, args) {
  const allowed = allowedFlags(cmd);
  const unknown = [];
  for (const name of Object.keys(args || {})) {
    if (name === '_') continue;
    if (allowed.has(name)) continue;
    unknown.push({ name, suggest: closestFlag(name, allowed) });
  }
  return { ok: unknown.length === 0, unknown, allowed: [...allowed].sort() };
}

/**
 * 版本参数：`--to` 与 `--version` 是一个意思的两种写法。
 * 两个都写且不一致时**报错而不是取其一** —— 静默取一个等于替用户拍板，
 * 而他明明说了两个不同的版本号，说明他自己也没定下来。
 * @returns {{ok:true, value:string|undefined} | {ok:false, error:string}}
 */
export function pickVersionArg(args) {
  const source = args || {};
  const read = (key) => {
    if (!(key in source)) return null;
    const raw = source[key];
    if (raw === true || raw === '') return { key, bad: true };
    return { key, value: String(raw) };
  };
  const seen = VERSION_FLAGS.map(read).filter(Boolean);
  if (seen.length === 0) return { ok: true, value: undefined };
  const bad = seen.find((s) => s.bad);
  if (bad) return { ok: false, error: `--${bad.key} 后面要跟版本或范围（写成 --${bad.key}=1.1.0，或 --${bad.key}=^1.0.0；带空格的写成 --${bad.key}=">=1.1.0 <2.0.0"）` };
  const values = [...new Set(seen.map((s) => s.value))];
  if (values.length > 1) {
    return { ok: false, error: `--${seen[0].key}=${seen[0].value} 和 --${seen[1].key}=${seen[1].value} 说法不一致；只说一个` };
  }
  return { ok: true, value: values[0] };
}

/** `help` 的正文：从上面那张表生成，不另写一份。 */
export function usage(cmd) {
  const lines = [];
  const target = cmd && COMMANDS[cmd] ? cmd : null;
  if (!target) {
    lines.push('市场命令行：先看有什么，再出计划，最后落成配置包。');
    lines.push('');
    lines.push('命令：');
    for (const [name, spec] of Object.entries(COMMANDS)) {
      lines.push(`  ${name.padEnd(9)} ${spec.summary}`);
    }
    lines.push('');
    lines.push('看某个命令认哪些参数：help <命令>');
    return lines.join('\n');
  }
  const spec = COMMANDS[target];
  lines.push(`${target} —— ${spec.summary}`);
  lines.push('');
  const allowed = allowedFlags(target);
  const own = Object.keys(spec.flags);
  if (own.length) {
    lines.push('参数：');
    for (const name of own) {
      lines.push(`  --${name.padEnd(18)} ${spec.flags[name]}`);
    }
  }
  const common = [...allowed].filter((n) => !own.includes(n));
  if (common.length) {
    lines.push('');
    lines.push('通用参数（源 / 信任 / 缓存）：');
    for (const name of common.sort()) lines.push(`  --${name.padEnd(18)} ${COMMON[name]}`);
  }
  lines.push('');
  lines.push('不认识的参数会直接报错 —— 参数静默失效比报错难查得多。');
  return lines.join('\n');
}
