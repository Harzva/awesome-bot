// 版本与范围：市场只需要 semver 的一个子集，不引依赖。
//
// 这个文件是**唯一**的版本比较实现 —— registry 选版本、bundle 解析依赖、
// CLI 过滤都要走它。别在别处再写一个「取最高版本」，两处规则一旦分叉，
// 会出现「列表里显示 1.2.0、实际装的是 1.1.0」这种查不出原因的错。
//
// 支持：`1.2.3`、`^1.2.3`、`~1.2.3`、`>=1.2.3`、`>1.2.3`、`<=`、`<`、`=`、`*`，
// 空格分隔表示 AND（`>=1.0.0 <2.0.0`），`||` 表示 OR。
// 预发布按 semver 官方规则：`^1.0.0` **不**匹配 `1.1.0-rc.1`，
// 只有范围里明确写了同 major.minor.patch 的预发布才放行。

const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

export function parse(version) {
  if (typeof version !== 'string') return null;
  const m = SEMVER.exec(version.trim());
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    pre: m[4] ? m[4].split('.') : []
  };
}

export function valid(version) {
  return parse(version) !== null;
}

function comparePre(a, b) {
  // 无预发布 > 有预发布
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    const x = a[i];
    const y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x);
    const ny = /^\d+$/.test(y);
    if (nx && ny) {
      const d = Number(x) - Number(y);
      if (d) return d < 0 ? -1 : 1;
    } else if (nx !== ny) {
      return nx ? -1 : 1; // 数字标识符优先级低于字母
    } else if (x !== y) {
      return x < y ? -1 : 1;
    }
  }
  return 0;
}

/** -1 / 0 / 1；任一侧不合法返回 null（不抛：调用方要能区分「不合法」和「更小」）。 */
export function compare(a, b) {
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  for (const key of ['major', 'minor', 'patch']) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  return comparePre(pa.pre, pb.pre);
}

/** 按版本从高到低排序，非法版本沉底（不参与选择，但仍可展示）。 */
export function sortDesc(versions) {
  return versions.slice().sort((a, b) => {
    const c = compare(a, b);
    if (c === null) return parse(a) ? -1 : (parse(b) ? 1 : 0);
    return -c;
  });
}

export function highest(versions) {
  const list = versions.filter(valid);
  return list.length ? sortDesc(list)[0] : null;
}

function bump(part, p) {
  // 用于把 ^ / ~ 展开成上下界
  if (part === 'major') return { major: p.major + 1, minor: 0, patch: 0 };
  if (part === 'minor') return { major: p.major, minor: p.minor + 1, patch: 0 };
  return { major: p.major, minor: p.minor, patch: p.patch + 1 };
}

function fmt(v) {
  return `${v.major}.${v.minor}.${v.patch}`;
}

// 下界必须带预发布：`^1.0.0-rc.0` 的下界是 1.0.0-rc.0，
// 用 1.0.0 当下界会把 1.0.0-rc.1 判成「小于下界」。
function fmtFull(p) {
  return p.pre && p.pre.length ? `${fmt(p)}-${p.pre.join('.')}` : fmt(p);
}

function caretUpper(p) {
  // ^0.2.3 → <0.3.0；^0.0.3 → <0.0.4；^1.2.3 → <2.0.0
  if (p.major > 0) return bump('major', p);
  if (p.minor > 0) return bump('minor', p);
  return bump('patch', p);
}

function tildeUpper(p) {
  // ~1.2.3 → <1.3.0；~1 → <2.0.0
  if (p.minor !== 0 || p.major === 0) return bump('minor', p);
  return bump('major', p);
}

/**
 * 单个 comparator → { op, version }。
 * `1.2.3` / `=1.2.3` 视为相等；`1.2` / `1` 由调用方补零后传入。
 */
function parseComparator(token) {
  const m = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(token.trim());
  if (!m) return null;
  const op = m[1] || '=';
  const raw = m[2].trim();
  let p = parse(raw);
  if (!p) {
    // 允许 `1.2` / `1` 这种简写（^1.2 很常见）
    const loose = /^(\d+)(?:\.(\d+))?$/.exec(raw);
    if (!loose) return null;
    p = { major: Number(loose[1]), minor: Number(loose[2] || 0), patch: 0, pre: [] };
  }
  return { op, p, prePinned: p.pre.length > 0 };
}

function testOne(v, c) {
  const p = parse(v);
  if (!p) return false;
  const cmp = compare(v, fmtFull(c.p));
  switch (c.op) {
    case '>=': return cmp >= 0;
    case '>': return cmp > 0;
    case '<=': return cmp <= 0;
    case '<': return cmp < 0;
    case '=': return cmp === 0;
    case '^': {
      if (cmp < 0) return false;
      const up = caretUpper(c.p);
      return compare(v, fmt(up)) < 0;
    }
    case '~': {
      if (cmp < 0) return false;
      const up = tildeUpper(c.p);
      return compare(v, fmt(up)) < 0;
    }
    default: return false;
  }
}

/**
 * 范围匹配。`*` / 空串匹配任何正式版本（不匹配预发布，与 semver 一致）。
 */
export function satisfies(version, range) {
  const v = parse(version);
  if (!v) return false;
  if (range === undefined || range === null) return false;
  const text = String(range).trim();
  if (text === '' || text === '*' || text === 'x') return v.pre.length === 0;

  return text.split('||').some((branch) => {
    const tokens = branch.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    const comps = tokens.map(parseComparator);
    if (comps.some((c) => !c)) return false;

    // 预发布规则：范围内没有明确钉住同 major.minor.patch 的预发布时，预发布版本一律不匹配。
    if (v.pre.length > 0) {
      const pinned = comps.some((c) =>
        c.prePinned && c.p.major === v.major && c.p.minor === v.minor && c.p.patch === v.patch);
      if (!pinned) return false;
    }
    return comps.every((c) => testOne(version, c));
  });
}

/** 在一组版本里挑满足范围的最高版本；没有就是 null（不退回任何一个）。 */
export function maxSatisfying(versions, range) {
  const ok = (Array.isArray(versions) ? versions : []).filter((v) => satisfies(v, range));
  return highest(ok);
}
