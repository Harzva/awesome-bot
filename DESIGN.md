# Awesome Bot visual system

This document records the visual decisions for the static catalogue in `site/`. It is a directory surface first: the visitor should be able to search, narrow, inspect, and download a Bot without mistaking a configuration download for an installation.

## Evidence and direction

The supplied reference screenshot is `research/awesome-bot-20261020/ui/dsh-reference.png` (1280 × 720). Direct observations from that image:

- The reference uses a warm paper background, a restrained top navigation, and a large black-and-red heading.
- Search is the first useful control. It is a wide white field with a dark outline and a visible result count.
- Source and index information sit close to the search area before a long, horizontally flowing category row.
- The page is a directory with a clear list rhythm rather than a dashboard of equal cards.
- Rounded category chips are useful for scanning, while the primary content remains quiet and text-led.
- The reference has a square grid texture and a black grid logo with a red tile. Awesome Bot uses a circular four-cell mark and a plain paper field so its identity is independent of that logo treatment.

The screenshot does not expose the reference list rows, detail behavior, mobile layout, empty state, or permission semantics. Those parts are product requirements and implementation decisions rather than claims about the reference.

## Surface structure

1. A compact header identifies Awesome Bot and keeps Directory, Submit, GitHub, and language controls reachable.
2. The masthead explains the job of the directory in Chinese by default. Its red sentence fragment creates a memorable accent without introducing a promotional hero.
3. A high-contrast search field accepts Chinese names, summaries, tags, source names, and IDs. The result count is inside the same control line.
4. Collection tabs divide `全部`, `角色`, and `任务`. Category, sort, and saved-only controls sit beside them on wide screens and wrap on narrow screens.
5. Work-area chips provide a quick horizontal scan. The results are thin-rule rows with a source label, summary, a small amount of metadata, a saved toggle, and a detail action.
6. The right rail carries bulk downloads, provenance guidance, and the machine-readable registry link. It collapses below the list on smaller widths.
7. A native dialog gives each entry a reviewable detail surface: mission, style, inputs, outputs, steps, requirements, skills, guidance, requested permissions, verification status, and safe links to manifests and sources.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#f5f0e8` | Page background |
| `surface` | `#fffdf9` | Search field and dialog |
| `ink` | `#201d1a` | Type, rules, primary controls |
| `muted` | `#5b554d` | Supporting copy and metadata |
| `line` | `#d7cec1` | Quiet dividers |
| `accent` | `#ad382b` | Editorial emphasis and active details |
| `focus` | `#1d68ae` | Keyboard focus ring |
| `radius-sm` | `4px` | Controls and buttons |
| `radius-md` | `10px` | Search and dialog |

Typography uses self-hosted IBM Plex Sans weights for Latin interface text, licensed under SIL OFL 1.1 in `site/fonts/OFL-1.1.txt`, followed by the platform's Chinese sans fallbacks for broad glyph coverage. Its measured, editorial forms suit a practical directory better than a default browser stack. The static site has no remote font dependency or tracking request. Headings use tight spacing and the body remains readable at 15px. The UI intentionally avoids gradients, glass effects, oversized metric cards, and decorative texture that would compete with the directory content.

## Interaction and state rules

- The default language is Chinese. The language toggle changes interface labels to English; Bot names, personas, source text, and other authored entry content remain as supplied.
- Search, collection, category, sort, and saved-only filters can be combined. Search matching is case-insensitive and covers `name`, `summary`, `tags`, `sourceName`, `id`, mission, style, category, and capabilities.
- Favorites are stored in `localStorage` under `awesome-bot:favorites:v1`. Storage failure leaves an in-memory session state and does not block browsing.
- Detail views use a native `dialog`, close with the close control, backdrop click, or Escape, and return focus to the control that opened them.
- “下载配置” links to a static fleet file. The page does not install, execute, or call a model.
- Batch download labels read the computed catalogue counts. If a generator returns `null` for a bundle above the single-bundle limit, the row stays visible without an `href` and says “超过单包上限，请逐项下载”; individual entry downloads remain available.
- Permission rows describe requested configuration capabilities only. They do not imply that tools, screen access, or a container have been granted.
- All entry content is inserted with `textContent` or text nodes. Link targets accept `https:` or site-relative paths only; unsupported schemes are omitted.
- Missing catalogue data shows an explicit build-state empty view. A zero-result search shows a separate empty state with a clear-filters action.

## Responsive and accessibility notes

- The content width is capped at 1180px, with 24px side gutters on small screens. The first viewport remains search-led at 1440px and 1280px.
- Below 930px, the utility rail moves below the results. Below 760px, navigation and toolbar controls simplify while result actions move below each row. The detail dialog becomes a near-full-screen sheet below 480px.
- Native buttons, labels, selects, and dialog semantics provide keyboard access. Focus rings use a blue outline with a 3px offset and remain visible on the paper palette.
- `aria-live` announces result counts and copy status. The list exposes busy state while the catalogue loads.
- `prefers-reduced-motion: reduce` removes nonessential transitions and smooth scrolling.

## Visual QA record

The supplied reference was inspected at 1280 × 720 before implementation. The implementation should be checked at 1440 × 900, 1280 × 720, 390 × 844, and 375 × 812 after `npm run build:site` and the local preview server are available. Verify the first viewport, search focus ring, category overflow, dialog focus return, empty state, and downloaded-link paths. Final screenshots are local acceptance evidence under `research/awesome-bot-20261020/ui/`; they are outside the public site and are not linked from the deployed surface. The supplied reference remains evidence only and is not copied into public site assets.

The first implementation pass was checked in the local preview at 1280 × 720, 390 × 844, and 375 × 812. The evidence set includes `awesome-bot-parent-1280x720.png`, `awesome-bot-final-mobile-390x844.png`, `awesome-bot-final-mobile-375x812.png`, `awesome-bot-detail-dialog.png`, `awesome-bot-empty-state.png`, `awesome-bot-keyboard-focus.png`, and `awesome-bot-bulk-limit-state.png`.
