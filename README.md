# snackbyte-spec-render

**Implementation repo — the Spec Kit artifact renderer (logic + CLI).** A
publishable npm package, spun (eventually) out of
[`snackbyte-npm-base`](../snackbyte-npm-base). Published name likely
`@snackbyte/spec-render`.

## What it is

The render core that turns Spec Kit Markdown artifacts into interactive,
styled HTML views (sticky auto-TOC, collapsible sections, anchored headings,
syntax highlighting, task timelines, spec dashboards, plan views, cross-nav,
lazy Mermaid). **Logic and CLI ship together in this one package** — the library
exports the render function; a `bin` entry provides the `spec-html` / watch CLI
off the same code. Markdown stays the source of truth; `.html` is derived,
git-ignored output.

## Where the code currently lives

Today it is **in-tree inside `snackbyte-base`**: `scripts/spec-html.mjs` (the
CLI/watch wrapper) plus `scripts/lib/*.mjs` (`tasks-timeline`, `spec-dashboard`,
`plan-view`, `artifact-nav`) — the actual render logic. It was added there
2026-06-29 (`feat(spec-html)`) as template tooling, never as a package. This
repo is where that logic + CLI get extracted so both `snackbyte-base` AND the
VS Code extension consume ONE renderer (no drift).

## Who depends on it

- `snackbyte-base` — replaces its in-tree `scripts/spec-html.mjs` with a
  dependency on this package.
- [`snackbyte-spec-html-vscode`](../snackbyte-spec-html-vscode) — the VS Code
  extension bundles this package for live-render-on-save.

## Status

**Stub — extraction pending.** Created 2026-07-05. This is the dependency the
VS Code extension waits on, so it is the natural first extraction. Blocked on
[`snackbyte-npm-base`](../snackbyte-npm-base) Phase 0 (the npm template it spins
from). Until then, the logic keeps living in `snackbyte-base`.
