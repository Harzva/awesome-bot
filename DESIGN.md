# Awesome Bot visual system

This document records the visual decisions for the static catalogue in `site/`. It is a directory surface first: the visitor should be able to search, narrow, inspect, and download a Bot without mistaking a configuration download for an installation.

## Evidence and direction

The supplied reference screenshot is `research/awesome-bot-20261020/ui/dsh-reference.png` (1280 × 720). The implementation's reference review recorded these observations:

- The reference uses a warm paper background, a restrained top navigation, and a large black-and-red heading.
- Search is the first useful control. It is a wide white field with a dark outline and a visible result count.
- Source and index information sit close to the search area before a long, horizontally flowing category row.
- The page is a directory with a clear list rhythm rather than a dashboard of equal cards.
- Rounded category chips are useful for scanning, while the primary content remains quiet and text-led.
- The reference has a square grid texture and a black grid logo with a red tile. Awesome Bot uses a circular four-cell mark and a plain paper field so its identity is independent of that logo treatment.

The screenshot does not expose the reference list rows, detail behavior, mobile layout, empty state, or permission semantics. Those parts are product requirements and implementation decisions rather than claims about the reference.

## Surface structure

1. A compact header identifies Awesome Bot and keeps Directory, Submit, GitHub, and language controls reachable on wide screens; narrow navigation retains GitHub and language controls.
2. The masthead explains the job of the directory in Chinese by default. Its red sentence fragment creates a memorable accent without introducing a promotional hero.
3. A high-contrast search field accepts Chinese names, summaries, tags, source names, and IDs. The result count is inside the same control line.
4. Collection controls divide `全部`, `角色`, and `任务` as a labelled button group with pressed state. Category, sort, and saved-only controls sit beside them on wide screens and wrap on narrow screens.
5. Work-area chips provide a quick horizontal scan. The compact preamble keeps the first thin-rule result row within the initial viewport, with a source label, summary, a small amount of metadata, a saved toggle, and a detail action.
6. The right rail carries bulk downloads, provenance guidance, and the machine-readable registry link. It collapses below the list on smaller widths.
7. A native dialog gives each entry a reviewable detail surface: mission, style, inputs, outputs, steps, requirements, skills, guidance, requested permissions, verification status, and safe links to manifests and sources.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#f5f0e8` | Page background |
| `surface` | `#fffdf9` | Search field and dialog |
| `surface-soft` | `#eee7dc` | Secondary detail surfaces |
| `ink` | `#201d1a` | Type, rules, primary controls |
| `muted` | `#5b554d` | Supporting copy and metadata |
| `line` | `#d7cec1` | Quiet dividers |
| `line-strong` | `#aaa095` | Control borders and scroll affordances |
| `accent` | `#ad382b` | Editorial emphasis and active details |
| `focus` | `#1d68ae` | Keyboard focus ring |
| `radius-sm` | `4px` | Controls and buttons |
| `radius-md` | `10px` | Search and dialog |
| `chip` | `99px` | Category capsules |

Typography uses self-hosted IBM Plex Sans weights for Latin interface text, licensed under SIL OFL 1.1 in `site/fonts/OFL-1.1.txt`, followed by the platform's Chinese sans fallbacks for broad glyph coverage. Its measured, editorial forms suit a practical directory better than a default browser stack. The static site has no remote font dependency or tracking request. Headings use tight spacing and the body remains readable at 15px. The UI intentionally avoids decorative gradient surfaces, glass effects, oversized metric cards, and decorative texture that would compete with the directory content. The external-link icon uses a CSS linear-gradient to draw its diagonal; that is icon geometry rather than a gradient surface.

## Interaction and state rules

- The default language is Chinese. The language toggle switches the interface and complete authored role, scenario and configuration content to English. Public source names and attribution retain their original identities. Language is part of the URL; localized Fleet projections do not rewrite the published Chinese manifests.
- Search, collection, category, sort, and saved-only filters can be combined. Search matching is case-insensitive and covers `name`, `summary`, `tags`, `sourceName`, `sourceAuthor`, `id`, mission, style, category, and capabilities.
- Favorites are stored in `localStorage` under `awesome-bot:favorites:v1`. Storage failure leaves an in-memory session state and does not block browsing.
- Detail views use a native `dialog`, close with the close control, backdrop click, or Escape, and return focus to the control that opened them.
- The collection button group exposes `aria-pressed` state instead of tab semantics because it filters the directory in place.
- External-link, download, and close marks are authored CSS shapes with decorative semantics; the accessible names remain in the surrounding text and button labels.
- Decorative section eyebrows have been removed from the HTML; functional entry metadata remains.
- “下载配置” links to a static fleet file. The page does not install, execute, or call a model.
- Batch download labels read the computed catalogue counts. If a generator returns `null` for a bundle above the single-bundle limit, the row stays visible without an `href` and says “超过单包上限，请逐项下载”; individual entry downloads remain available.
- Permission rows describe requested configuration capabilities only. They do not imply that tools, screen access, or a container have been granted.
- Source authors and template authors retain distinct labels. Format and import checks do not certify real task execution.
- All entry content is inserted with `textContent` or text nodes. Link targets accept `https:` or site-relative paths only; unsupported schemes are omitted.
- Loading is bounded to 12 seconds. Failure shows a retry action and GitHub catalogue fallback while keeping the current filters. A zero-result search has its own clear-filters action.
- Controlled URLs restore search, filters, language and Bot details through refresh and browser navigation. Shared links omit saved-only state and unknown query data; missing Bot links show a notice.

## Responsive and accessibility notes

- The content width is capped at 1180px. Side gutters are 24px by default, 16px at widths up to 760px, and 12px at widths up to 480px.
- At widths up to 930px, the utility rail moves below the results. At widths up to 760px, navigation and toolbar controls simplify while result actions stay aligned beside each row's content so the first detail action remains reachable without an extra scroll. The detail dialog becomes a near-full-screen sheet at widths up to 480px.
- The acceptance viewports are 1280 × 720, 1200 × 776, 390 × 844, and 375 × 812. Each initial view keeps the search field and the first result title plus detail action together; category chips remain a thin horizontal scan line.
- Native buttons, labels, selects, and dialog semantics provide keyboard access. Focus rings use a blue outline or a soft blue focus-within shadow and remain visible on the paper palette.
- `aria-live` announces result counts and copy status. The list exposes busy state while the catalogue loads.
- `prefers-reduced-motion: reduce` removes smooth scrolling and reduces transition and animation duration to 0.01ms.

## Version 0.1 visual QA record

The implementation and visual review recorded completed local-preview checks at 1280 × 720, 390 × 844, and 375 × 812. The review-fix evidence set includes `awesome-bot-review-fix-1280x720.png`, `awesome-bot-review-fix-mobile-390x844.png`, `awesome-bot-review-fix-mobile-375x812.png`, `awesome-bot-review-fix-mobile-first-result.png`, `awesome-bot-review-fix-detail.png`, and `awesome-bot-review-fix-empty.png`.

The reference and acceptance screenshots are local evidence in the workspace's `research/awesome-bot-20261020/ui/` directory, outside this Git repository. They are not public site assets or deployed links. The reference remains evidence only and is not copied into public assets. That version 0.1 documentation pass compared source text and existing review records.


## Version 0.2 acceptance

Current-build screenshots at 1280 × 720, 1200 × 776, 390 × 844, and 375 × 812 passed independent visual review. The first result title and detail action are visible at every size; phone widths have no document-level horizontal overflow. Scoped final layout detection reported no findings.

Browser checks covered search and Bot-link copy feedback, Escape and opener focus, Forward, refresh of a direct detail link, and closing without leaving the market. A separate 503 fixture recovered with Retry while preserving the English role search and its 9 matching entries. Evidence remains workspace-local outside the public repository, under `research/awesome-bot-20261020/v0.2.0/ui/`.

## Version 0.3 scenario extension and acceptance

The toolbar adds a task-scenario selector without adding a mobile control row. Selecting a goal reveals a thin-rule panel with its first Bot, a small configuration download, first-task copy, import guide and expandable materials, expected outputs and ordered handoffs. The default panel stays hidden. Scenario routes combine with existing filters and survive sharing, browser navigation and refresh. Bot details add first-task copy, the import guide and a public-ID/version feedback link.

Independent review of current-build screenshots passed at all four acceptance viewports. The first title and detail action remain visible, document-level horizontal overflow is absent, and scenario and detail actions wrap without clipping at 375px. Long scenario instructions and detail content use normal vertical scrolling. The 1280 × 720 first-row summary extends below the initial viewport, while its title and action remain reachable.

Browser checks confirmed scenario result counts, task-copy feedback, detail copy, Escape and opener focus, Back and refresh restoring the scenario and its download count. All five scene exports were downloaded over HTTP and matched their built files; each contains its expected one or two Bots. Scoped layout detection reported no findings. Evidence remains outside the public repository under `research/awesome-bot-20261020/v0.3.0/ui/`; it is local-preview evidence, not a deployed screenshot or real-account task certification.

## Version 0.4 role identity, English and Agent reading

Each role has an original deterministic SVG mark, with ten geometric work-area families and individual details derived from its stable ID. The same mark appears at 40px in the directory and 64px in details; language changes do not change its identity. The marks use the existing paper and ink palette with restrained role colors. They do not reproduce upstream avatars or creator portraits.

The English projection covers all 146 role names, missions, steps, prerequisites, skills, personas, examples and downloads, plus all five scenarios. Category labels, guidance links, fallback catalogue, accessibility labels and transient copy feedback follow the selected language. The 375px English preamble is slightly tighter so its first result action remains visible. Shrinkable toolbar tracks handle longer English labels without clipping the page.

The directory rail and Bot details offer Copy for Agent. The success message reports copying, not installation. Per-Bot Markdown and JSON keep role context, language, source version, content revision, configuration digest and requested permissions together; a small llms.txt entry introduces the reading path without loading every persona at once.

Independent visual review passed Chinese and English at all four acceptance sizes, including the corrected 1200 × 776 captures. Default first titles and detail actions remain visible, and document-level horizontal overflow is absent. English scenario and detail actions wrap without clipping. The local evidence set is `research/awesome-bot-20261020/v0.4.0/ui/`; the accepted 1200px images use the `recapture-` prefix. Other accepted images use `final-`. Browser checks confirmed full English content, English configuration links, real paste of the selected Bot's Agent-loading prompt, language-status cleanup, Escape and opener focus, and refresh preserving the English scenario. Scoped layout detection reported no findings. These checks do not certify every role's real-account execution.
