# Build, review, and publish

The repository is the source for the catalogue, static marketplace, and versioned configuration exports. Publication never writes into a running OpenBot instance or transfers an account connection.

## Maintainer checks

Use Node.js 22 or 24. Both are supported LTS lines at the 2026-10-20 verification date; CI tests both. Dependencies are locked and lifecycle scripts are not required for installation.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build:site
npm run audit:public
npm run pack:release
```

`audit:public` checks the Git index when this directory is a Git repository and refuses unstaged changes that would make the inspected working files differ from the commit. Stage only the intended public source before running the publication check. In a source directory without Git it checks public candidate files and omits known local build, cache, and historical verification outputs. It reports filenames and finding types without printing suspected secret values. This bounded check supports human review; it is not a general certification that arbitrary content contains no sensitive information.

The package command first checks that generated catalogue files match the authored entries and rebuilds the static site. It then performs the source and site audits, generates the roles/workflows/all configuration files, verifies their counts and disabled tool permissions, and creates a sorted USTAR archive with fixed ownership, file modes, and timestamps. The timestamp comes from `SOURCE_DATE_EPOCH` when explicitly set, otherwise from the catalogue snapshot. Repeating a package build with identical inputs and the same Node/zlib runtime produces the same archive bytes.

Output is written to `dist/release`. It contains:

- A versioned `.tar.gz` with the standalone project, the built marketplace, and collection exports.
- Separate versioned roles, workflows, and all-template Fleet files.
- `release-manifest.json`, with file sizes, source hashes, collection counts, and the catalogue snapshot date.
- `SHA256SUMS` and `RELEASE_NOTES.md`.

The release package excludes local/native verification receipts, caches, the private native-app integration script, and user data. It refuses an output directory containing another version or unrelated files. Collections over the host's 200-Bot input-file limit are split into numbered files, each with at most 200 Bots; IDs and names remain distinct across parts. The release manifest lists every part and its count. Host total-Bot limits still apply, so users should choose the roles they need rather than importing the whole catalogue by default. The release target is `catalogue.targetOpenBotVersion` when declared, otherwise the initial supported baseline 0.9.9.

## GitHub Actions and Pages

The `Catalogue CI` workflow runs for pull requests and pushes to `main`. Its token can read contents only. It does not use repository secrets, privileged fork checkout events, or self-hosted runners.

The `Publish marketplace` workflow rebuilds and checks the current `main`, uploads only `dist/site`, and deploys it in a separate `github-pages` environment job. Only that deployment job receives `pages: write` and `id-token: write`. Enable **Settings → Pages → Source → GitHub Actions** before the first deployment. The intended public URL is [Harzva.github.io/awesome-bot](https://harzva.github.io/awesome-bot/); a workflow file alone is not evidence that this URL is live. Check the deployment result and the rendered site after publication. GitHub documents the artifact and permission requirements in [custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

Remote Actions are pinned to complete commits verified against the official action repositories on 2026-10-20:

| Action | Release | Commit |
| --- | --- | --- |
| actions/checkout | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| actions/setup-node | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| actions/upload-pages-artifact | v5.0.0 | `fc324d3547104276b827a68afc52ff2a11cc49c9` |
| actions/deploy-pages | v5.0.1 | `368f82528645a54fb793d4d04e342629a3f51346` |
| actions/upload-artifact | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

Review action updates against their source repository before changing a pin. The defaults follow GitHub's [secure workflow guidance](https://docs.github.com/en/actions/reference/security/secure-use), including narrow permissions and untrusted-PR separation.

## Versioned releases

Update `package.json`, the lockfile, changelog, and authored catalogue version records before creating a version tag. Published template versions and release assets remain immutable. A correction gets a new version; the workflow refuses to replace an existing release.

After a reviewed commit is on `main`, push a matching tag such as `v0.1.0`. The tag must equal `v` plus the package version. The `Release catalogue` workflow runs checks, packages the project, and uses GitHub's `gh release create` with `--verify-tag` and the repository-scoped workflow token. It needs `contents: write` only for this tag-triggered job. It uses no personal access token or external publishing service.

Download the release files and verify them using `shasum -a 256 -c SHA256SUMS` on macOS or `sha256sum -c SHA256SUMS` on Linux. Archive checksums prove byte integrity relative to the published checksum file. The catalogue remains explicitly unsigned until a separate, reviewed signing and trust-anchor distribution scheme is implemented.

## Source maintenance

`Source link report` runs weekly and on manual dispatch. It probes only a small allowlist of public HTTPS hosts, with bounded concurrency and timeouts. Redirects cannot escape that host set. Missing pages are reported separately from authentication barriers, rate limits, and network uncertainty. The workflow stores a report artifact and does not open issues, post messages, install code, or edit catalogue entries. Reports are for a maintainer to review; an unchanged or uncertain remote result does not trigger a failing scheduled run.

Run a small manual sample with `npm run check:links -- --limit=5`. `--strict` makes confirmed 404/410 results fail when a maintainer deliberately wants that gate. Neither mode claims to verify a real account task.
