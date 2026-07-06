# @snackbyte/spec-render

Render [Spec Kit](https://github.com/github/spec-kit) Markdown artifacts to
interactive, self-contained HTML views — a **render library** and a
**`spec-render` CLI** that ship together off the same code.

Markdown stays the source of truth (clean for the Spec Kit skill chain and for
git/GitHub); this produces a sibling `.html` view per `.md` file, wrapped in a
styled shell:

- **Sticky auto-TOC** with scroll-spy, **collapsible sections**, anchored headings
- **Syntax highlighting** (highlight.js) and **priority/status badges**
- Purpose-built views for the three primary artifacts:
  - `tasks.md` → a **roadmap timeline** (phase chips with progress rings, drill-in panels)
  - `spec.md` → a **skimmable dashboard** (priority-badged user-story cards, filterable FR/SC requirements)
  - `plan.md` → a **navigable plan** (Technical Context grid, Constitution-Check principle cards)
  - everything else (`research.md`, `data-model.md`, `quickstart.md`, …) → a clean readable view
- A **cross-artifact nav bar** linking the sibling artifacts of one feature
- **Lazy Mermaid** — the client-side renderer (loaded from jsDelivr) is injected only
  when a ` ```mermaid ` block is present; there is no Mermaid npm dependency

## Requirements

- **Node.js >= 24** (ESM-only package)

## Install

```sh
npm install @snackbyte/spec-render
```

Or run the CLI without installing:

```sh
npx @snackbyte/spec-render
```

## CLI usage

The CLI resolves paths against the **current working directory** — run it from your
repo root. With no argument it renders every `.md` under `./specs`.

```sh
spec-render                 # render every ./specs/**/*.md
spec-render <path>          # render one .md file, or a directory (recursively)
spec-render --watch [path]  # render, then re-render on save (Ctrl-C to stop)
spec-render --clean [path]  # remove the generated .html alongside each .md
```

Each `<name>.md` produces a sibling `<name>.html`. Those `.html` files are derived
artifacts — **git-ignore them** (e.g. `specs/**/*.html`).

Wire it into a project's `package.json` scripts:

```jsonc
{
  "scripts": {
    "spec:html": "spec-render",
    "spec:html:watch": "spec-render --watch",
  },
}
```

## Library usage

All render functions are pure (string in, HTML string out); only `renderFile`
touches the filesystem.

```js
import { renderArtifact, renderMarkdown, renderFile } from '@snackbyte/spec-render';
import { readFile } from 'node:fs/promises';

// Dispatch to the right view based on the artifact filename:
const src = await readFile('specs/007-widget/tasks.md', 'utf8');
const html = renderArtifact(src, { name: 'tasks.md', title: 'Widget Tasks' });

// Or force the generic readable view for any Markdown:
const page = renderMarkdown('# Notes\n\nAnything.', { title: 'Notes' });

// Or read a .md and write its sibling .html in one call:
await renderFile('specs/007-widget/plan.md', { specsRoot: 'specs' });
```

### Exports

| Export                                                           | Kind                       | Description                                                                                                       |
| ---------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `renderArtifact(src, opts)`                                      | `(string) => string`       | Render Markdown, dispatching to the tasks/spec/plan view by `opts.name` (falls back to the generic view).         |
| `renderMarkdown(src, opts)`                                      | `(string) => string`       | Render Markdown to the generic readable view (TOC, badges, highlighting, lazy Mermaid).                           |
| `renderFile(mdPath, opts)`                                       | `async (string) => string` | Read a `.md`, render it, write the sibling `.html`, return its path. Discovers sibling artifacts for the nav bar. |
| `renderTasksTimeline` / `renderSpecDashboard` / `renderPlanView` | `(string) => string`       | The three purpose-built views directly.                                                                           |
| `looksLikeTasks` / `looksLikeSpec` / `looksLikePlan`             | `(string) => boolean`      | Content predicates the dispatch uses.                                                                             |
| `navBar(opts)` / `NAV_STYLES` / `NAV_KEYS`                       | markup / CSS / keys        | The shared cross-artifact nav bar building blocks.                                                                |

`opts` for the render functions: `{ title?: string, nav?: object }`. `renderArtifact`
also takes `{ name?: string }` (the artifact filename used to pick a view).
`renderFile` takes `{ specsRoot?: string }` (the root the feature label is made
relative to).

## License

[MIT](./LICENSE) © Jeff Fichtner

---

Part of the [snackbyte](https://github.com/jeff-fichtner) ecosystem; the first package
spun out of the `snackbyte-npm-base` template line.
