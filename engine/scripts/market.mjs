#!/usr/bin/env node
// 市场命令行。存在的意义是把「浏览 → 看依赖 → 出计划 → 落成配置包」这条链
// 在没有界面的情况下跑通，也让主工程接入前就能验收。
//
// 用法：
//   node market/scripts/market.mjs help [命令]        ← 每个命令认哪些参数，从那里看
//   node market/scripts/market.mjs list [--query=写] [--kind=template] [--versions]
//   node market/scripts/market.mjs info <id> [--to=1.0.0] [--locale=en]
//   node market/scripts/market.mjs plan <id> [--to=1.0.0] [--openbot=0.0.12] [--json]
//   node market/scripts/market.mjs install <id> --out=/tmp/fleet.json [--record=rec.json]
//   node market/scripts/market.mjs upgrade --installed=rec.json [--to=1.1.0] [--current=bots.json]
//        [--apply] [--out=up.json] [--take-template=<字段,…>]
//        --current   已装实例现在的 bots（数组，或 {bots:[…]}）。给了才能判断「你装完之后改没改」；
//                    改过的字段升级**不会覆盖**（默认保留你的），要换成模板的加 --take-template=<字段,…>
//   node market/scripts/market.mjs rollback --installed=rec.json [--to=1.0.0] [--current=bots.json]
//        [--accept-state-loss] [--apply] [--out=up.json]
//        --accept-state-loss  目标版本自己声明读不懂现在的状态格式时，仍然照退（默认拒绝）
//   node market/scripts/market.mjs verify
//
// 参数清单只活在 src/cli-args.mjs 那张表里：`help` 由它生成，闸门也由它判。
// **不认识的参数直接报错**，不会静默按默认值做完 —— 打错一个字母却照跑成功，
// 事后只能靠结果反推「我明明加了这个参数」。`--to` 与 `--version` 是同一个意思，
// 两个写不一样的值会报错（不替用户挑一个）。
//
// 源：
//   默认读本仓库 market/registry/index.json。
//   --registry=<https://…>  只读这一份（换掉默认源）
//   --file=<path>           只读这一份本地目录
//   --source=<url|path>     追加一份源，可重复、可逗号分隔（第一份源是主源）
//   追加的源不会让「官方」两个字变宽松：级别由签名能否用内置公钥验过决定，
//   要装非官方源的条目得显式加 --allow-community。
// 缓存（只对 https 源生效；本地文件永远重读）：
//   --cache[=<dir>]        把取到的目录与内容留在本机，默认 market/.cache
//   --max-age=<时长>       多久之内不再联网取目录，默认 5m；纯数字按秒算（30s / 10m / 2h / 1d）
//   --offline              一个请求都不发，只用缓存；目录和要装的内容都必须在缓存里
// 语言：
//   --locale=<tag>         info / plan 按哪种语言显示引导层（en、zh-CN、pt-BR）
//                          条目没有这个语言就给基座那份，并说明「不是你要的」——
//                          绝不把中文文案标成英文。
// 清理缓存：
//   gc [--cache[=<dir>]] [--limit=500MB] [--keep=<id@版本>,…] [--installed=<record.json>]
//      [--apply] [--purge-broken] [--json]
//     默认只预演；已安装的内容（--installed / --keep 指定的）永远不删，哪怕超上限也只报告。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { search, latestOf, newestOf } from '../src/registry.mjs';
import { loadCatalogue } from '../src/catalogue.mjs';
import { describeAgo, parseDuration } from '../src/cache.mjs';
import { gcCache, parseSize, describeBytes, DEFAULT_LIMIT_BYTES } from '../src/cache-gc.mjs';
import { buildPlan, summarizePlan, planSources } from '../src/plan.mjs';
import { materialize } from '../src/install.mjs';
import { planUpgrade, planRollback, applyUpgrade, summarizeUpgrade } from '../src/update.mjs';
import { createLoader } from '../src/sources.mjs';
import { generateKeyPair, describeSignatureCheck } from '../src/sign.mjs';
import { resolvePinnedKeys, canOverride, assertRegistryTrusted, gateEntry } from '../src/trust.mjs';
import { describeLifetime } from '../src/lifetime.mjs';
import { scanForPrivateKeys, describeLeakScan } from '../src/leak-scan.mjs';
import { resolveGuidance } from '../src/guidance.mjs';
import { tallyStateCoverage, tallyGuidanceCoverage, hasGuidanceBlock } from '../src/coverage.mjs';
import { COMMANDS, checkFlags, pickVersionArg, usage } from '../src/cli-args.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

// 可重复的参数：--source=a --source=b（解析成一个数组，不然后一个会盖掉前一个）
const REPEATABLE = new Set(['source', 'keep']);

function put(out, key, value) {
  if (!REPEATABLE.has(key)) { out[key] = value; return; }
  if (!Array.isArray(out[key])) out[key] = out[key] === undefined ? [] : [out[key]];
  out[key].push(value);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) put(out, arg.slice(2, eq), arg.slice(eq + 1));
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) { put(out, arg.slice(2), argv[i + 1]); i += 1; }
      else put(out, arg.slice(2), true);
    } else out._.push(arg);
  }
  return out;
}

/** 展开一个「可重复 + 逗号分隔」的列表参数（--source 与 --keep 都吃这个形状）。 */
function expandList(raw) {
  const items = Array.isArray(raw) ? raw : (raw === undefined ? [] : [raw]);
  const out = [];
  for (const item of items) {
    for (const part of String(item).split(',')) if (part.trim()) out.push(part.trim());
  }
  return out;
}

/** 把 --source 展开成列表：可重复，也可一条里逗号分隔。 */
function extraSources(args) {
  return expandList(args.source);
}

function sourceSpecs(args) {
  const extras = extraSources(args);
  // --registry / --file 是「换掉默认源」，不是「多加一份」：两条路径都说得通，
  // 但同时给一个 --registry 又不动默认源，最容易变成「我以为在看官方目录」。
  if (args.registry) return [String(args.registry), ...extras];
  const base = args.file ? resolve(String(args.file)) : join(ROOT, 'registry', 'index.json');
  return [base, ...extras];
}

/**
 * 缓存设置。三种情况要分清，混起来会出两种错：
 *   1. 没给 --cache 也没给 --offline → 不缓存（CLI 默认不留痕，免得 verify 读到旧目录）；
 *   2. 给了 --cache（不带值也算）→ 用默认目录 market/.cache；
 *   3. 给了 --offline → 必须有缓存目录，否则「离线」变成「直接什么都没有」。
 */
function cacheSettings(args) {
  const offline = !!args.offline;
  const wants = args.cache !== undefined || offline;
  if (!wants) return null;
  let dir = join(ROOT, '.cache');
  if (args.cache !== undefined && args.cache !== true) dir = resolve(String(args.cache));
  const maxAgeMs = offline ? 0 : (args['max-age'] !== undefined ? parseDuration(args['max-age']) : 300_000);
  return { dir, offline, maxAgeMs };
}

async function loadRegistry(args) {
  // 内置公钥 = 客户端自己带的、不来自目录的那把。只有它能回答「这份目录是不是官方的」。
  const pinned = await resolvePinnedKeys({
    explicitPath: args['pinned-key'] ? resolve(String(args['pinned-key'])) : null,
    // 读不到只当没有锚点（装了个没有 keys 的副本），不报错
    defaultPath: join(ROOT, 'keys', 'official.public.json')
  });
  const cat = await loadCatalogue(sourceSpecs(args), { pinned, cache: cacheSettings(args) });
  cat.pinned = pinned;
  return cat;
}

/**
 * 一句「这份源凭什么算官方 / 为什么不算」。
 * 缓存的来源必须跟着源一起报：不然「目录源」这一行会让人以为刚联网取过。
 * ⚠ 只留给「过期了还在用」——新鲜期内的缓存也打警告，警告很快就没人看了。
 */
function describeSource(s) {
  const level = s.trust === 'official' ? '官方' : '社区';
  const why = s.verified ? `已验签 ${s.keyId}` : describeSignatureCheck({ reason: s.reason, keyId: s.keyId });
  const memo = s.from === 'cache' && s.stale ? `　⚠ 用的是${describeAgo(s.ageMs)}取到的缓存`
    : s.from === 'cache' ? `　（本机缓存，${describeAgo(s.ageMs)}取的，还在有效期内）`
      : s.from === 'cache-revalidated' ? '　（内容和线上一致，已确认）'
        : s.from === 'network' ? '　（刚联网取到）' : '';
  return `${s.name}（${level}，${why}）${s.entries} 条 ← ${s.url}${memo}`;
}

/**
 * 引导层的可读输出。CLI 与界面共用一份措辞 —— 两边各写一套，用户会看到两种说法。
 * 三件事必须说出来：这块内容是哪种语言、是不是你要的那种、人设是什么语言。
 * 最后一条最容易漏：界面翻成英文不等于它用英文回话。
 */
function printGuidance(g) {
  if (!g || !g.present) {
    console.log('\n引导层：没有（装完之后它不会主动说第一句话，也没有可点的入口）');
    return;
  }
  const lang = g.locale || '语言未声明';
  const want = g.requested && !g.exact ? `，不是你要的 ${g.requested}` : '';
  console.log(`\n引导层（${lang}${want}）：`);
  if (g.welcome) console.log(`  「${g.welcome}」`);
  if (g.quickPrompts.length) {
    console.log('  能点的入口：');
    for (const p of g.quickPrompts) console.log(`    · ${p}`);
  }
  if (g.taskExamples.length) {
    console.log('  示例：');
    for (const e of g.taskExamples) console.log(`    · ${e.title} → ${e.prompt}`);
  }
  if (g.notes.length) {
    console.log('  说明：');
    for (const n of g.notes) console.log(`    - ${n}`);
  }
}

/**
 * 整个运行环境里「有没有锚点」这一关。
 * 只在 no-pinned-key（没条件验）时生效；验过但不通过属于「这份源不是官方的」，
 * 交给按条目的 gateEntry 判断，别在这里一棒子打死 —— 多源下没有「整份目录」这回事了。
 */
function requirePinnedAnchor(reg, args) {
  const t = reg.registrySignature;
  if (t.ok || !canOverride(t.reason)) return false;
  const { overridden } = assertRegistryTrusted(t, {
    allowUnpinned: !!args['allow-unpinned'],
    command: '这次安装'
  });
  if (overridden) {
    console.log(`⚠ 目录签名未验证（${describeSignatureCheck(t)}）：本机没有内置公钥，按 --allow-unpinned 继续`);
  }
  return true;
}

/** 装某个 id 之前过闸门；不过就抛，过了就把「你正在装非官方内容」打出来。 */
function requireInstallable(reg, id, args) {
  const entry = reg.entries.find((e) => e.id === id);
  const gate = gateEntry(entry, {
    allowCommunity: !!args['allow-community'],
    allowUnpinned: !!args['allow-unpinned'],
    allowExpired: !!args['allow-expired']
  });
  if (!gate.ok) throw new Error(gate.message);
  if (gate.warning) console.log(`⚠ ${gate.warning}`);
}

/**
 * 离线只够做「本机已有的事」。
 * 目录与内容都在缓存里时，离线照样能出计划、能装 —— 所以这里不再一刀切拒绝；
 * 缺哪一份由装载器按 id@版本 报出来（比笼统说「离线装不了」有用得多）。
 */
function loaderFor(reg, args, extra = {}) {
  return createLoader({ ...reg, ...extra, cache: cacheSettings(args) });
}

function printProblems(reg) {
  if (!reg.problems || reg.problems.length === 0) return;
  console.log('\n合并时被拒绝的部分：');
  for (const p of reg.problems) console.log(`  · ${p}`);
}

/**
 * 目录不是刚从网上取来时，必须单独说一句。
 * 这句话不能藏在「目录源」的行尾里 —— 用户看的是列表，不是元信息。
 * 也没法用「转圈/加载中」代替：离线时它更该显眼，而不是更不显眼。
 */
function printStaleness(reg) {
  for (const note of reg.cacheNotes || []) console.log(`\n⚠ ${note}`);
  // 新鲜度与有效期是两件事，所以分成两句说：一个是「文件取回来多久了」，
  // 一个是「这份签名还能不能当依据」。刚联网取回、签名却早过期，是可能的。
  for (const s of reg.expiredSources || []) {
    console.log(`\n⚠ ${s.name} 的目录签名${s.state === 'future' ? `写在未来（${s.expiresAt}），这个时间不可信` : `已于 ${String(s.expiresAt).slice(0, 10)} 过期`}`
      + '\n  签名本身验得过；过期说的是「这份目录太老了，这期间撤回的东西它不知道」。'
      + '\n  装它给的条目会被拦下：联网重取一份，或加 --allow-expired。');
  }
  // 快到期只提醒一次，且措辞指向要做的事（续签），不是单纯报个数字。
  for (const s of reg.expiringSources || []) {
    console.log(`\n! ${s.name} 的目录签名还有 ${s.daysLeft} 天到期（${String(s.expiresAt).slice(0, 10)}）：到期后就不能再作为安装依据，该重签了`);
  }
  if (!reg.stale) return;
  console.log('⚠ 上面这些内容不是刚联网取的：目录里没有的、被撤回的东西，这里都还看不到。'
    + '\n  要拿到最新的就联网重跑（或去掉 --offline）。');
}

/** 多源时把每份源都报出来；单源时只报一行，免得列表被元信息淹掉。 */
function printSources(reg) {
  if (!reg.sources || reg.sources.length === 0) return;
  console.log(`\n目录源：${reg.sources.length > 1 ? `${reg.sources.length} 份` : ''}`);
  for (const s of reg.sources) console.log(`  · ${describeSource(s)}`);
}

function printList(entries, args) {
  const kind = args.kind;
  let list = kind ? entries.filter((e) => e.kind === kind) : entries;
  list = search(list, args.query || '');
  if (list.length === 0) {
    console.log('没有匹配的条目');
    return;
  }
  for (const entry of list) {
    // 两个数分开算：newest 是「目录里最高的是谁」（可能是被撤回的那一版），
    // latest 是「实际会装哪一版」。混成一个就会出现「显示 1.2.0、装的是 1.1.0」而没人解释。
    const newest = newestOf(entry);
    const latest = latestOf(entry);
    const badge = entry.trust === 'official' ? '官方' : '社区';
    const gone = newest && newest !== latest ? '  ⊘ 已撤回' : '';
    console.log(`${entry.id.padEnd(32)} ${String(newest).padEnd(8)} ${entry.kind === 'bundle' ? '组件包' : '模板'}  ${badge}${gone}`);
    console.log(`  ${entry.name} · ${entry.summary}`);
    if (newest && newest !== latest) {
      console.log(latest
        ? `    会装 ${latest}（${newest} 已被撤回）`
        : '    没有可装的版本（全部都已被撤回）');
    }
    // 目录里「同一个 id 有多个版本」这件事，列表上必须能看出来。
    // 只显示最新一版，等于告诉用户「每个条目就一个版本」—— 那 --version 就没道理存在了。
    const all = (entry.versions || []).map((v) => v.version);
    if (args.versions) {
      for (const v of all) {
        const one = (entry.versions || []).find((x) => x.version === v) || {};
        const tags = [];
        if (one.revoked === true) tags.push('⊘ 已撤回');
        else if (v === newest) tags.push('最新');
        else if (v === latest) tags.push('会装');
        console.log(tags.length ? `    ${v.padEnd(9)} ${tags.join('　')}` : `    ${v}`);
      }
    } else if (all.length > 1) {
      const others = all.filter((v) => v !== newest);
      console.log(`    另有 ${others.length} 个版本：${others.join('、')}（--versions 看全部）`);
    }
  }
  console.log(`\n共 ${list.length} 条`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'list';

  // 参数闸门放在最前面，而且放在读目录之前：打错一个参数就该当场知道，
  // 不该先联网取一遍目录、跑完整个流程再按默认值做完。
  // 判据与说明都来自 src/cli-args.mjs 那一张表 —— 表是唯一实现，闸门和 help 都从它长出来。
  if (cmd === 'help' || args.help === true) {
    // `--help` 会被解析成 args.help，不在这里接住的话它会掉进闸门报「不认识 --help」。
    const target = cmd === 'help' ? args._[1] : (args._.length ? cmd : undefined);
    console.log(usage(target));
    return;
  }
  if (!COMMANDS[cmd]) {
    throw new Error(`未知命令：${cmd}\n\n${usage()}`);
  }
  const gate = checkFlags(cmd, args);
  if (!gate.ok) {
    const lines = ['不认识的参数：'];
    for (const u of gate.unknown) {
      lines.push(`  · --${u.name}${u.suggest ? `（你是不是想写 --${u.suggest}？）` : ''}`);
    }
    lines.push(`\n${cmd} 认识：${gate.allowed.map((n) => `--${n}`).join(' ')}`);
    lines.push(`参数打错一个字就会被静默忽略，所以这里直接拒绝。完整说明：market.mjs help ${cmd}`);
    throw new Error(lines.join('\n'));
  }
  // 版本参数：`--to` 与 `--version` 是同一个意思，写两个不一致的说法就报错（不替用户挑）。
  const wantedVersion = pickVersionArg(args);
  if (!wantedVersion.ok) throw new Error(wantedVersion.error);

  // keygen 要在读目录之前：第一次发布时目录还不存在。
  if (cmd === 'keygen') {
    const outBase = args.out ? resolve(String(args.out)) : join(ROOT, 'keys', 'official');
    const pair = generateKeyPair();
    const privatePath = `${outBase}.private.json`;
    const publicPath = `${outBase}.public.json`;
    const { existsSync } = await import('node:fs');
    if (existsSync(privatePath) && !args.force) {
      // 覆盖私钥 = 丢掉一把还在用的钥匙。换钥匙是「新建一把」而不是「覆盖旧的」：
      // 已发布的内容还得靠旧钥匙验，客户端在轮换期要同时带新旧两把。
      throw new Error(`私钥已存在：${privatePath}\n`
        + '  换钥匙请新建一把（换个 --out），别覆盖这把：历史内容还得靠它验，\n'
        + '  客户端的内置公钥表在轮换期要同时放新旧两把（keys 两把，作废的那把写进 revoked）。\n'
        + '  确实要覆盖请输入 --force（覆盖后这把钥匙签过的内容就再也验不了了）。');
    }
    await mkdir(dirname(outBase), { recursive: true });
    await writeFile(privatePath, JSON.stringify(pair, null, 2) + '\n', { mode: 0o600 });
    await writeFile(publicPath, JSON.stringify({ alg: pair.alg, keyId: pair.keyId, publicKey: pair.publicKey }, null, 2) + '\n');
    console.log(`已生成 ed25519 密钥：${pair.keyId}`);
    console.log(`公钥（入库）：${publicPath}`);
    console.log(`私钥（不要提交）：${privatePath}`);
    console.log('\n下一步：node market/scripts/sign-manifests.mjs --key=' + privatePath + ' --write');
    return;
  }

  // gc 放在读目录之前：清缓存这件事本身不需要目录，也不该因为「离线且没缓存」而失败。
  if (cmd === 'gc') {
    const dir = args.cache && args.cache !== true ? resolve(String(args.cache)) : join(ROOT, '.cache');
    const limitBytes = args.limit !== undefined ? parseSize(args.limit) : DEFAULT_LIMIT_BYTES;
    const keep = new Set();
    for (const k of expandList(args.keep)) keep.add(k);
    if (args.installed) {
      const record = JSON.parse(await readFile(resolve(String(args.installed)), 'utf8'));
      // 安装记录里逐个 bot 记着 templateId/templateVersion（见 install.mjs 的 record）
      const bots = Array.isArray(record && record.bots) ? record.bots : null;
      if (!bots) throw new Error(`${args.installed} 不像安装记录：没有 bots[]（升级记录用 --keep 手动指定）`);
      for (const b of bots) {
        if (b && b.templateId && b.templateVersion) keep.add(`${b.templateId}@${b.templateVersion}`);
      }
    }
    const report = await gcCache({
      dir, limitBytes, keep, dryRun: !args.apply, purgeBroken: !!args['purge-broken']
    });

    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }
    console.log(`缓存目录：${report.dir}`);
    console.log(`占用 ${describeBytes(report.before.bytes)}（${report.before.count} 个文件），上限 ${describeBytes(report.limitBytes)}`);
    console.log(`  · 目录缓存 ${report.catalogue.count} 份 ${describeBytes(report.catalogue.bytes)}（不参与淘汰）`);
    console.log(`  · 内容缓存 ${report.content.count} 份 ${describeBytes(report.content.bytes)}`);
    if (report.broken.length) {
      // 单列：分类计数不含坏文件，占用含 —— 不写这一行，三个数字加起来对不上总额
      console.log(`  · 读不出结构 ${report.broken.length} 个 ${describeBytes(report.brokenBytes || 0)}`);
    }
    if (report.preserved.length) {
      console.log(`保留（已安装）：${report.preserved.length} 份 ${describeBytes(report.preserved.reduce((n, e) => n + e.bytes, 0))}`);
    }
    if (report.evicted.length) {
      const freed = report.evicted.reduce((n, e) => n + e.bytes, 0);
      console.log(`\n${report.dryRun ? '将删除' : '已删除'} ${report.evicted.length} 份，腾出 ${describeBytes(freed)}：`);
      for (const e of report.evicted) {
        console.log(`  · ${e.meta.id}@${e.meta.version}　${describeBytes(e.bytes)}　取回于 ${describeAgo(Date.now() - e.fetchedAt)}`);
      }
    } else {
      console.log('\n没有需要删除的内容');
    }
    if (report.purged.length) {
      console.log(`\n已清掉 ${report.purged.length} 个读不出结构的文件（${describeBytes(report.purged.reduce((n, e) => n + e.bytes, 0))}）`);
    }
    if (report.broken.length && !report.purged.length) {
      console.log('\n读不出结构的文件（不会自动删）：');
      for (const b of report.broken) console.log(`  · ${b.file}　${b.reason}`);
    }
    if (report.notes.length) {
      console.log('');
      for (const n of report.notes) console.log(`⚠ ${n}`);
    }
    console.log(`\n清理后：${describeBytes(report.after.bytes)}（${report.after.count} 个文件）`);
    if (report.overLimit) {
      console.log('仍然超过上限。');
      process.exitCode = 1;
    }
    if (report.dryRun && report.evicted.length) {
      console.log('这是预演，没有删任何文件；加 --apply 才真删。');
    }
    return;
  }

  const reg = await loadRegistry(args);

  // 「官方」两个字现在有依据了：级别由签名能否用内置公钥验过决定，不是源自己声明的字段。
  // 但依据得说出来 —— 哪几份源、各自验过没有。不报出来，用户只能相信我的措辞。
  const trustNote = () => {
    printSources(reg);
    printProblems(reg);
    printStaleness(reg);
    if (reg.registrySignature.reason === 'no-pinned-key') {
      console.log('\n注：本机没有内置公钥，任何源都只能是社区级（装非官方内容需 --allow-community）');
    }
  };

  if (cmd === 'list') {
    printList(reg.entries, args);
    trustNote();
    return;
  }

  if (cmd === 'info') {
    const id = args._[1];
    const entry = reg.entries.find((e) => e.id === id);
    if (!entry) throw new Error(`目录里没有 ${id}`);
    // info 要能看「被撤回的东西长什么样」，所以这里故意不把撤回名单传给装载器：
    // 撤回是安装闸门的事，不是「内容不可读」。看完还要装，plan/install 会拦。
    const loader = loaderFor(reg, args, { revoked: null });
    // 不指定就看「会装的那一版」；全被撤回时退回最高的一版 —— info 要能看见被撤回的东西长什么样。
    // 指定了就得真的存在 —— 报错要说清有哪些，别只说「没有这个版本」。
    const latest = wantedVersion.value || latestOf(entry) || newestOf(entry);
    if (!entry.versions.some((v) => v.version === latest)) {
      throw new Error(`目录里的 ${entry.id} 没有 ${latest} 这个版本；现有：${entry.versions.map((v) => v.version).join('、')}`);
    }
    const value = await loader(entry.id, latest);
    if (!value || value.ok === false) throw new Error((value && value.errors || ['读取失败']).join('；'));
    // 撤回标记已落在版本上（mergeRegistries 盖的章），这里不再自己拿 reg.revoked 查一遍：
    // 两处推导迟早有一处忘了改，而忘改的表现是「标着能装，其实装不了」。
    const one = entry.versions.find((v) => v.version === value.version) || {};
    const deadKey = new Set((reg.revoked && reg.revoked.keyIds) || []);
    console.log(`${value.name}  ${value.id}@${value.version}  [${value.kind === 'bundle' ? '组件包' : '模板'}]`);
    if (one.revoked === true) {
      console.log('⊘ 已被目录撤回（下架）：看得到，但不再提供安装');
    } else if (deadKey.has(entry.publisher && entry.publisher.keyId)) {
      console.log('⊘ 发布者钥匙已被目录撤回：内容没被改，但签发它的钥匙不算数了');
    }
    // 默认展示的就是「会装的那一版」（被撤回的会被跳过），所以不需要再解释一遍「会装哪个」。
    // 真正要交代的是另一头：全都撤回了 —— 那说明这里看到的是残留，装不了。
    if (!wantedVersion.value && !latestOf(entry)) {
      console.log('这个条目已经没有可安装的版本（全部都已被撤回）');
    }
    // 同一个 id 有多个版本时要说出来：不然「info 看到的就是全部」，
    // 用户根本不会想到还有个旧版能装，--version 这个参数也就永远想不起来。
    // 旧版本列表里也要标 ⊘：只写版本号会让「1.2.0 还在」和「1.2.0 还能装」看起来是一回事。
    const siblings = entry.versions
      .filter((v) => v.version !== value.version)
      .map((v) => (v.revoked === true ? `${v.version}（⊘ 已撤回）` : v.version));
    if (siblings.length) {
      const tail = wantedVersion.value ? '' : '（加 --version 看那一版）';
      console.log(`另有 ${siblings.length} 个版本：${siblings.join('、')}${tail}`);
    }
    console.log(value.summary);
    const names = (entry.sources || []).map((s) => s.name).filter(Boolean).join('、') || '未知来源';
    console.log(`\n作者：${value.author.name}　许可证：${value.license}　来源：${entry.trust === 'official' ? '官方源' : '非官方源'}（${names}）`);
    // 签名单独一行：它是「这份内容和这个发布者」之间唯一可验证的联系。
    const declared = entry.publisher && entry.publisher.keyId;
    console.log(value.signature
      ? `签名：${value.signature.keyId}（已核对${declared ? '，与目录登记的发布者公钥一致' : ''}）`
      : `签名：无${declared ? '（目录声明了发布者，这份内容却对不上）' : ''}`);
    console.log(`要求 OpenBot：${value.openbot}`);
    const asked = ['tools', 'container', 'screen'].filter((k) => value.permissions[k]);
    console.log(`声明需要：${asked.length ? asked.join(' / ') + '（安装不授予）' : '无额外权限'}`);
    if (value.kind === 'template') {
      console.log(`\n角色：${value.bot.name}${value.bot.avatar ? `（形象 ${value.bot.avatar}）` : ''}`);
      console.log(value.bot.persona.split('\n')[0]);
      if (value.bot.skills.length) {
        console.log('\n技能卡：');
        for (const s of value.bot.skills) console.log(`  · ${s.name} —— ${s.desc}`);
      }
    } else {
      console.log(`\n成员 ${value.templates.length} 个：`);
      for (const t of value.templates) console.log(`  · ${t.id} ${t.range} ${t.role === 'lead' ? '（主入口）' : ''}`);
      if (value.sharedSkills.length) {
        console.log('\n共享技能卡：');
        for (const s of value.sharedSkills) console.log(`  · ${s.name} —— ${s.desc}`);
      }
      if (value.workflow.length) {
        console.log('\n怎么用：');
        value.workflow.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
      }
    }
    if (value.permissions.tools || value.permissions.container || value.permissions.screen) {
      console.log('\n注意：上面这些权限只是「它想要」，装完要你自己单独授予。');
    }
    // 引导层用请求的语言解析一遍，而不是把基座那块直接念出来 ——
    // 念错了语言，界面上的「预览」和装完看到的不一样。
    printGuidance(resolveGuidance(value, args.locale));
    trustNote();
    return;
  }

  if (cmd === 'plan' || cmd === 'install') {
    const id = args._[1];
    if (!id) throw new Error('要指定 id，例如 openbot/indie-launch');
    printStaleness(reg);
    // 两道：整机有没有锚点（没条件验），以及这个 id 的来源验过没有（结果是否）
    requirePinnedAnchor(reg, args);
    requireInstallable(reg, id, args);
    const loader = loaderFor(reg, args);
    const plan = await buildPlan({
      id,
      entries: reg.entries,
      loadManifest: loader,
      baseUrl: reg.baseUrl,
      openbotVersion: String(args.openbot || '0.0.12'),
      ...(args.locale ? { locale: String(args.locale) } : {}),
      // 指定版本就锁死，用于「先装旧版再看升级」这种场景
      ...(wantedVersion.value ? { forceVersion: wantedVersion.value } : {})
    });

    if (args.json) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      console.log(summarizePlan(plan));
      if (plan.warnings.length) {
        console.log('\n提示：');
        for (const w of plan.warnings) console.log(`  · ${w}`);
      }
      if (!plan.ok) {
        console.log('\n装不了：');
        for (const e of plan.errors) console.log(`  · ${e}`);
        process.exitCode = 1;
        return;
      }
      console.log('\n将装：');
      for (const bot of plan.bots) {
        console.log(`  · ${bot.name}${bot.role === 'lead' ? '（主入口）' : ''} ← ${bot.templateId}@${bot.templateVersion}`);
      }
      console.log('\n来源：');
      for (const s of planSources(plan)) console.log(`  · ${s.id}@${s.version} ${s.url}`);
      // 装完之后用户看到的第一个东西就是这块，所以在「将要装什么」这一步就给他看。
      printGuidance(plan.guidance);
    }

    if (cmd !== 'install') return;
    if (!plan.ok) return;

    let existing = [];
    if (args.existing) {
      const file = resolve(String(args.existing));
      const parsed = JSON.parse(await readFile(file, 'utf8'));
      existing = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.bots) ? parsed.bots : []);
    }
    const built = materialize(plan, { existing });
    if (!built.ok) throw new Error(built.message);

    const out = args.out ? resolve(String(args.out)) : join(ROOT, 'build', `${id.split('/').pop()}.fleet.json`);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(built.bundle, null, 2) + '\n');
    // 安装记录必须落盘：没有它，以后算不出「这个实例来自哪个模板的哪个版本」。
    if (args.record) {
      const recordPath = resolve(String(args.record));
      await mkdir(dirname(recordPath), { recursive: true });
      await writeFile(recordPath, JSON.stringify(built.record, null, 2) + '\n');
      console.log(`已写出安装记录：${recordPath}`);
    }
    console.log(`\n已写出配置包：${out}`);
    console.log(`机器人 ${built.bundle.bots.length} 个，共享技能卡 ${built.bundle.shared.skills.length} 张`);
    // 引导层不在 fleet 包里（塞进 bot 字段会被导入吞掉），所以这里单独交代一句：
    // 主工程要拿 built.guidance 去显示「装完之后它先说什么」。
    if (built.guidance && built.guidance.present) {
      const g = built.guidance;
      const gap = g.partial ? `，人设仍是 ${g.personaLocale || '未声明语言'}` : '';
      console.log(`引导层随安装结果一起给出（${g.locale || '语言未声明'}${gap}）：读 built.guidance，不要塞进 bot 字段`);
    }
    if (built.report.renamed.length) {
      console.log('改名/改 id：');
      for (const r of built.report.renamed) console.log(`  · ${r.from} → ${r.to}（${r.reason}）`);
    }
    if (built.report.permissionsWithheld.length) {
      console.log(`权限未授予：${built.report.permissionsWithheld.join(' / ')}`);
    }
    return;
  }

  // 升级与回退共用这一条：两道闸门、当前内容、输出、应用全都一样，
  // 只有「目标版本怎么定」和「状态闸门」不同。分成两段写，迟早一段修好另一段忘了。
  if (cmd === 'upgrade' || cmd === 'rollback') {
    const rollback = cmd === 'rollback';
    const id = args._[1];
    if (!args.installed) throw new Error('要指定安装记录：--installed=record.json（安装时 materialize 返回的 record）');
    const installed = JSON.parse(await readFile(resolve(String(args.installed)), 'utf8'));
    if (id && installed.id !== id) throw new Error(`安装记录里是 ${installed.id}，不是 ${id}`);
    // 回退与升级都认 --to / --version（在 main 开头已经统一读过一次）：
    // 只有 rollback 认 --to 的话，「upgrade --to=1.1.0」会被静默忽略，然后升到最新。
    const wanted = wantedVersion.value;

    printStaleness(reg);
    // 换版本会把内容写进已有实例，闸门和安装一样严：按记录里那个 id 的来源判断
    requirePinnedAnchor(reg, args);
    requireInstallable(reg, installed.id, args);
    const loader = loaderFor(reg, args);
    // 已装实例现在长什么样。不给就判不了「你改没改」—— 那时报告要明说不知道，
    // 而不是拿「模板旧版」当你的当前状态（那正是静默覆盖人设的来源）。
    let currentBots = [];
    if (args.current) {
      const file = resolve(String(args.current));
      let parsed;
      try {
        parsed = JSON.parse(await readFile(file, 'utf8'));
      } catch (err) {
        throw new Error(`读不了 --current=${file}：${err.code === 'ENOENT' ? '文件不存在' : err.message}`);
      }
      currentBots = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.bots) ? parsed.bots : null);
      // 给了一份没有 bots 的 JSON 却不报错，等于「查过了，没问题」—— 那比不查更糟。
      if (!currentBots) throw new Error(`--current=${file} 里既不是 bots 数组，也没有 bots 键；无法判断实例的当前内容`);
    }
    const changePlan = await (rollback ? planRollback : planUpgrade)({
      installed,
      entries: reg.entries,
      loadManifest: loader,
      baseUrl: reg.baseUrl,
      openbotVersion: String(args.openbot || '0.0.12'),
      version: wanted ? String(wanted) : undefined,
      acceptStateLoss: args['accept-state-loss'] === true,
      ...(args.current ? { currentBots } : {})
    });

    console.log(summarizeUpgrade(changePlan));
    if (changePlan.upToDate || changePlan.noop) return;
    if (!changePlan.ok) {
      for (const e of changePlan.errors) console.log(`  · ${e}`);
      process.exitCode = 1;
      return;
    }

    for (const change of changePlan.botChanges) {
      console.log(`\n${change.templateName}  ${change.from} → ${change.to}`);
      // 回退时状态闸门比「改了哪几段人设」重要：读不懂就是读不懂，得单独一行。
      if (rollback && change.state) {
        const verdict = change.state.level === 'safe' ? '能读' : change.state.level === 'unsafe' ? '读不懂' : '不知道';
        console.log(`  状态格式：${change.state.reason}（${verdict}）`);
      }
      const p = change.changed.persona;
      console.log(`  人设：+${p.added.length} 段 / −${p.removed.length} 段（${p.beforeLength} → ${p.afterLength} 字）`);
      for (const line of p.added) console.log(`    + ${line}`);
      for (const line of p.removed) console.log(`    − ${line}`);
      const s = change.changed.skills;
      if (s.added.length) console.log(`  技能卡新增：${s.added.join('、')}`);
      if (s.removed.length) console.log(`  技能卡移除：${s.removed.join('、')}`);
      for (const c of s.changed) console.log(`  技能卡改写：${c.name}`);
      // 上面几行是「模板改了哪几张」，下面这行才是「你的卡最后长什么样」——
      // 模板新加的那张在不在、你加的那张还在不在，用户能自己数。
      if (change.skillMerge && (change.skillMerge.keptLocal.length || change.skillMerge.conflicts.length)) {
        const sm = change.skillMerge;
        const bits = [`合并后 ${sm.merged.length} 张`];
        if (sm.keptLocal.length) bits.push(`留你的 ${sm.keptLocal.join('、')}`);
        if (sm.conflicts.length) bits.push(`冲突 ${sm.conflicts.join('、')}（保留你的那张）`);
        console.log(`  你的技能卡：${bits.join('，')}`);
      }
      for (const [key, v] of Object.entries(change.changed.fields)) {
        console.log(`  ${key}：${JSON.stringify(v.from)} → ${JSON.stringify(v.to)}`);
      }
      if (change.note) console.log(`  ${change.note}`);
      // 上面那几行是「模板从旧版到新版改了什么」，下面这行才是「你的实例会被怎么改」。
      // 两者不是一回事：你改过的地方，模板再改也不会自动盖上去。
      const local = change.local || { status: 'unknown', edited: [] };
      if (local.status === 'unknown') {
        // 两种「不知道」要分开说：一个是没给我东西看，一个是我看了、记录里那个 id 不在。
        console.log(local.reason === 'bot-missing'
          ? `  你的实例：记录里写的是 ${change.botId}，实例里没有这个 id 的机器人；这台不会被动`
          : '  你的实例：无法判断有没有改过（没给 --current，缺它的当前内容）');
      } else if (local.status === 'clean') {
        console.log('  你的实例：装完之后没改过，按模板更新');
      } else {
        const kept = change.merge ? change.merge.keep : [];
        const conflicts = change.merge ? change.merge.conflicts : [];
        // skills 已经逐张写在上面的「你的技能卡」里了，这里再说一句「改过 skills」是重复，
        // 而且笼统得没法核对（到底改了哪几张？）。只报其它字段。
        const others = local.edited.filter((f) => !(f === 'skills' && change.skillMerge));
        if (others.length) console.log(`  你的实例：你改过 ${others.join('、')}`);
        else if (change.skillMerge) console.log('  你的实例：只动过技能卡（见上一行）');
        if (kept.length) {
          console.log(`    保留你的：${kept.map((k) => (k.reason === 'conflict' ? `${k.field}（模板也改了）` : `${k.field}（模板没动）`)).join('、')}`);
        }
        if (conflicts.length) console.log(`    想用模板的版本，加 --take-template=${conflicts.join(',')}`);
      }
    }
    if (changePlan.added.length) {
      console.log(`\n新增成员：${changePlan.added.map((a) => a.name).join('、')}`);
      // 新成员的 id 只能靠「实例上已有什么」来避让。不给清单就等于让装载器赌一把，
      // 赌输了的后果不是「少装一个」，而是安装记录指向别人的机器人 —— 所以应用时不给就不做。
      if (!args.current) {
        console.log('  这些成员要现造 id：应用时必须给 --current=当前 bots.json，否则 id 可能与实例上已有的撞上，记录也会跟着记错');
      }
    }
    if (changePlan.removed.length) console.log(`\n移出成员（不会自动删除）：${changePlan.removed.map((r) => r.templateId).join('、')}`);
    if (changePlan.warnings.length) {
      console.log('\n提示：');
      for (const w of changePlan.warnings) console.log(`  · ${w}`);
    }

    if (!args.apply) {
      const file = rollback ? 'rollback.json' : 'upgrade.json';
      console.log(`\n这是预演。加 --apply --out=${file} 生成 patch（只改模板字段，不动对话/记忆/文件）。`);
      if (!args.current) {
        console.log('没给 --current=当前 bots.json：判不了你有没有改过，真正应用时会按模板覆盖 persona 与技能卡。');
      }
      return;
    }

    const take = args['take-template'] === true ? true
      : args['take-template'] ? expandList(args['take-template']) : null;
    const applied = applyUpgrade(changePlan, changePlan.installPlan, {
      now: Date.now(), installed, takeTemplate: take,
      // 与 install 走同一份口径：给了当前 bots 就交进去，新成员才会避开已占用的 id。
      // 不给就干脆不传（而不是传空数组）—— 空数组等于「实例上一台都没有」，那是另一句话。
      ...(args.current ? { existing: currentBots } : {})
    });
    if (!applied.ok) throw new Error(applied.message);
    const out = args.out ? resolve(String(args.out))
      : join(ROOT, 'build', `${String(installed.id).split('/').pop()}-${rollback ? 'rollback' : 'upgrade'}.json`);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify({ patch: applied.patch, record: applied.record }, null, 2) + '\n');
    console.log(`\n${applied.message}`);
    // 新成员的 id/名字可能因为被占用而改过：用户看到的和模板里的不一样，得说清是哪来的。
    for (const r of applied.report.addedRenamed || []) {
      console.log(`新增成员改名：${r.from} → ${r.to}（${r.reason}）`);
    }
    // 记录对不上而没动的，必须逐个点名：不点名的「跳过」等于静默少升一台。
    for (const s of applied.report.skippedMissing || []) {
      console.log(`${s.botId} 没动：安装记录里写着它，实例里没有这个 id 的机器人 —— 先核对记录里的 botId 再重跑`);
    }
    console.log(`已写出${rollback ? '回退' : '升级'} patch：${out}`);
    console.log(`未改动：${applied.report.preserved.join(' / ')}`);
    // 「保留了你的改动」要在应用之后再说一遍：预演时的提示用户可能没看。
    for (const kept of applied.report.keptLocal || []) {
      console.log(`保留 ${kept.botId} 的 ${kept.fields.join('、')}（patch 里没有这些字段，你的内容不会被覆盖）`);
    }
    // 技能卡不能只报「保留了」，得报「最后是哪几张」：卡是列表，用户关心的是自己那张还在不在。
    for (const s of applied.report.skills || []) {
      if (s.tookTemplate) {
        console.log(`${s.botId} 的技能卡按 --take-template 整组换成模板的：${s.merged.join('、')}`);
      } else if (s.keptLocal.length) {
        console.log(`${s.botId} 的技能卡合并后 ${s.merged.length} 张，其中 ${s.keptLocal.join('、')} 是你的`);
      }
    }
    if (take) console.log(`按 --take-template 覆盖了：${take === true ? '所有冲突字段' : take.join('、')}`);
    // 读不懂也退完了，更要留一句：这是用户自己确认过的动作，事后得对得上账。
    const sc = changePlan.stateCheck;
    if (rollback && sc && sc.level === 'unsafe') {
      console.log(`注意：${sc.unsafe.join('、')} 的目标版本读不懂现在的状态格式；对话与记忆没被改动，但模板自己产出的文件它可能看不到`);
    }
    return;
  }

  if (cmd === 'verify') {
    // 私钥泄漏是签名的反面：签得再对，私钥跟着发布包上传就等于全都可以伪造。
    // 这道检查放在最前面 —— 它一句话就能判断，不需要先跑完 10 个版本。
    const leak = await scanForPrivateKeys(ROOT);
    console.log(`${leak.ok ? '✓' : '✗'} ${describeLeakScan(leak)}`);
    if (!leak.ok) process.exitCode = 1;
    // 用了旧缓存的话，下面验的是「昨天那份目录」，要说出来。
    printStaleness(reg);

    // 目录自己的签名：整份目录被换掉时，下面的「逐份验签」全部会验过（keys 也被换了）
    const rs = reg.registrySignature;
    const primary = (reg.sources || [])[0];
    console.log(`${rs.ok ? '✓' : '✗'} 目录签名（主源${primary ? `「${primary.name}」` : ''}）：${describeSignatureCheck(rs)}`);
    if (!rs.ok) process.exitCode = 1;
    // 有效期单独一行：它不是一个「签名对不对」的问题，而是一个「该不该重签」的问题。
    // 过期算失败（发布闸门要拦），没写有效期只提醒 —— 老目录还没有这个字段，不该因此判红。
    const life = primary && primary.lifetime ? primary.lifetime : null;
    const lifeMark = !life || life.state === 'valid' ? '✓' : life.state === 'expiring' || life.state === 'unknown' ? '!' : '✗';
    console.log(`${lifeMark} 目录有效期（主源${primary ? `「${primary.name}」` : ''}）：${life ? describeLifetime(life) : '没有读到有效期信息'}`);
    if (life && (life.state === 'expired' || life.state === 'future')) {
      process.exitCode = 1;
      console.log('  重签：node market/scripts/sign-registry.mjs --key=market/keys/official.private.json --write');
    } else if (life && life.state === 'unknown') {
      console.log('  发布方重签一次就会写上有效期（--days=N）；不写的话，客户端只能一直按「不知道它有多老」处理');
    }
    // 追加源单独报，但不计入失败：社区源的签名本来就验不过内置公钥。
    // 真正的失败是「它冒充官方」—— 那种情况在装载时就已经中止了。
    for (const s of (reg.sources || []).slice(1)) {
      const tail = s.lifetime && s.lifetime.state !== 'valid' ? `，${describeLifetime(s.lifetime)}` : '';
      console.log(`${s.verified ? '✓' : '·'} 追加源「${s.name}」${s.verified ? `已验签 ${s.keyId}` : `社区级（${s.reason}）`}：${s.entries} 条 ← ${s.url}${tail}`);
    }
    if (reg.problems && reg.problems.length) {
      console.log(`· 合并时拒绝 ${reg.problems.length} 处：`);
      for (const p of reg.problems) console.log(`    · ${p}`);
    }

    // 签名必须在这里被显式说出来。装载器默默验过、输出只写「摘要一致」，
    // 就等于「验了但没人看得见」—— 上线时无法判断是否真的在验。
    const loader = loaderFor(reg, args, { requireSignature: !!args['require-signature'] });
    const deadVersions = new Set((reg.revoked && reg.revoked.versions) || []);
    const deadKeys = new Set((reg.revoked && reg.revoked.keyIds) || []);
    let failed = 0;
    let total = 0;
    let signed = 0;
    let unsigned = 0;
    let retired = 0;
    // 引导层覆盖率要报出来：不报的话「有多少条目装完不说话」这件事永远没人知道，
    // 而它是可以逐个补的（补了就重签），不像别的问题只能等。
    // **分母只算现行版本**：历史版本（新版本已经覆盖它）按规则不再动，
    // 算进分母这个数字就永远差一个，差的那一个还是永远不会有的 —— 见 src/coverage.mjs。
    const guidanceItems = [];
    // 状态格式声明同理：没声明的版本，回退时只能说「读不读得懂无法判断」。
    // 这个数字不报出来，用户永远不知道那句「无法判断」是因为我们没写，而不是因为查不到。
    // **分母只算模板版本**：组件包在格式层就不允许写 state（它自己不往实例里写东西，
    // 写东西的是成员模板）。把组件包算进分母，就是给作者派一件结构上做不到的活，
    // 这个数字永远刷不满 —— 而一个刷不满的指标，看两次之后就没人看了。
    // 逐版本边验边收集，最后交给 src/coverage.mjs 数一遍 —— 和预览数据用同一份实现。
    // 两处各数一遍的话，界面上那个数字和 CLI 上的数字迟早对不上，然后两个都没人信。
    const stateItems = [];
    for (const entry of reg.entries) {
      for (const version of entry.versions) {
        // 撤回是有意的：正常发布里它就是「别再装这个」，不该算失败，
        // 但也不能从输出里消失 —— 否则下线时看不出「我撤回了什么」。
        if (deadVersions.has(`${entry.id}@${version.version}`)) {
          retired += 1;
          console.log(`⊘ ${entry.id}@${version.version} 已被目录撤回，不再提供安装`);
          continue;
        }
        total += 1;
        const value = await loader(entry.id, version.version);
        if (!value || value.ok === false) {
          failed += 1;
          console.log(`✗ ${entry.id}@${version.version}：${(value && value.errors || ['读取失败']).join('；')}`);
          continue;
        }
        const sig = value.signature;
        guidanceItems.push({
          at: `${entry.id}@${version.version}`,
          id: entry.id,
          version: version.version,
          hasGuidance: hasGuidanceBlock(value),
          translated: !!(value.i18n && Object.keys(value.i18n).length)
        });
        stateItems.push({ at: `${entry.id}@${version.version}`, kind: value.kind, state: value.state });
        if (sig) {
          signed += 1;
          console.log(`✓ ${entry.id}@${version.version} 摘要一致、格式合格、签名有效（${sig.keyId}）`);
        } else {
          unsigned += 1;
          console.log(`✓ ${entry.id}@${version.version} 摘要一致、格式合格，但未签名`);
        }
      }
    }
    const tail = retired || deadKeys.size
      ? `；已撤回 ${retired} 个版本${deadKeys.size ? `、${deadKeys.size} 把发布者钥匙` : ''}`
      : '';
    if (failed) {
      console.log(`\n${failed}/${total} 个版本不通过${tail}`);
      process.exitCode = 1;
    } else {
      // 条目数与版本数分开报：一个 id 多版本时，"9 个条目" 不等于 "9 份内容"
      console.log(`\n${reg.entries.length} 个条目 / ${total} 个版本全部通过（已签名 ${signed}，未签名 ${unsigned}）${tail}`);
      const gc = tallyGuidanceCoverage(guidanceItems);
      console.log(`引导层：${gc.withGuidance}/${gc.total} 个现行版本写了引导层${gc.translated ? `，其中 ${gc.translated} 个带翻译` : ''}`);
      if (gc.missing.length) {
        console.log(`· 还有 ${gc.missing.length} 个现行版本装完之后不会主动说第一句话（不是错误，但用户会愣一下）`);
        console.log(`  ${gc.missing.join('、')}`);
      }
      if (gc.historicalTotal) {
        // 历史版本不进分母，但不能从视野里消失 —— 否则「9/9」会被读成「所有版本都写了」。
        const hist = gc.historicalMissing.length
          ? `${gc.historicalMissing.join('、')} 没写（新版本已覆盖，不再动）`
          : '都写了';
        console.log(`· 另有 ${gc.historicalTotal} 个历史版本不计入分母：${hist}`);
      }
      const sc = tallyStateCoverage(stateItems);
      console.log(`状态格式：${sc.withState}/${sc.total} 个模板版本声明了 state`);
      console.log(`· 另有 ${sc.bundles} 个组件包版本不声明（组件包自己不写状态，成员各自声明）`);
      if (sc.missing.length) {
        // 不声明不是错误，代价要说清：回退时只能回答「不知道」，而不是「没问题」。
        console.log(`· 还有 ${sc.missing.length} 个版本没声明：回退到它们（或从它们回退）时只能说「读不读得懂无法判断」`);
        console.log(`  ${sc.missing.join('、')}`);
      }
    }
    return;
  }

  throw new Error(`未知命令：${cmd}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
