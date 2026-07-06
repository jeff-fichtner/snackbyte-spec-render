# DECISIONS — what packaging @snackbyte/spec-render actually required

This is the raw material for `snackbyte-npm-base`'s Phase 0 template extraction. The
model (per the constitution): build **one real, correct package first**, then extract the
template from what this package actually needed. Every list below is a candidate template
fact — a thing the template must provide, or a knob it must leave open.

`@snackbyte/spec-render` is the first graduate of the template line. It is an **ESM-only,
source-shipped (no build) library + CLI**. That shape drove most of what follows; a
package that _compiles_ (TS → dist) would differ on the points flagged **[build-only]**.

## 1. The `package.json` publish surface (Constitution II)

What had to be present and correct for a working, non-leaky publish:

- **`name`** — scoped `@snackbyte/spec-render`. Scope was unused on npm before this
  (first `@snackbyte/*` package). First publish needs `--access public` (a scoped
  package is private by default and would 402/403 without it).
- **`version`** — `0.1.0` start.
- **`type: "module"`** — ESM-only.
- **`engines.node: ">=24"`** — the snackbyte runtime floor. (Note: `snackbyte-base` pins
  `>=24 <25`; for a _library_ the upper bound is intentionally dropped — a consumer on
  Node 25 must be allowed to install it.)
- **`exports` map, not `main`** — this is the load-bearing one. The map:
  ```jsonc
  "exports": {
    ".": "./src/index.mjs",
    "./package.json": "./package.json"
  }
  ```
  `.` is the library entry. `./package.json` is exported deliberately so tooling can read
  it (a common thing that silently breaks under a strict `exports` map without it).
- **`bin`** — `{ "spec-render": "src/cli.mjs" }`. The CLI file has a `#!/usr/bin/env node`
  shebang and is ESM. No separate build; the shebang file _is_ the published file.
  **Gotcha (caught only by the real registry):** the bin path must **not** have a `./`
  prefix. `"./src/cli.mjs"` is silently stripped on publish (`"bin[...] script name ...
was invalid and removed"`) — which would ship a package with **no CLI**. Verdaccio's
  older validation did not catch this; npmjs.org did. Template fact: bin values are
  bare relative paths (`src/cli.mjs`), and `npm pkg fix` enforces it. This is also a
  reason the pack-and-install smoke test should assert the `bin` symlink exists after a
  **real** (or real-validation) publish, not just after `npm install <tarball>`.
- **`files` allowlist** — `["src/", "README.md", "LICENSE"]`. Allowlist, not `.npmignore`.
  Everything else (tests, fixtures, tsconfig, eslint/prettier config, `.specify/`,
  `.claude/`, `environments.json`, `.github/`, `DECISIONS.md`) is correctly **excluded**
  from the tarball. (`package.json`, `README`, `LICENSE` are always included by npm
  regardless — the allowlist governs everything else.)
- **Metadata** — `description`, `keywords`, `homepage`, `bugs`, `repository`, `license`,
  `author`. `repository.url` uses the `git+https://…​.git` form.
- **`prepublishOnly: "npm run check:all"`** — the publish gate. Runs format+lint+
  typecheck+test so a stale/broken artifact can't publish. **[not build-only]** — even a
  no-build package benefits: it blocks publishing red code.

## 2. Ship-source vs. build

Decision: **ship `src/` directly, no build step.** The `.mjs` files are already ESM and
Node >=24 runs them natively; a build would only be justified to inline deps or target
older runtimes, neither of which applies.

Template implication: **the build step must be optional.** A source-shipped package has
no `dist/`, no `build` script, and `files` points at `src/`. A compiling package
**[build-only]** adds a `build` script, points `exports`/`bin`/`files` at `dist/`, and
`prepublishOnly` must run the build. The template should scaffold the no-build path as
the default and make the build path an opt-in.

## 3. The CLI cwd contract (the one real logic change during extraction)

The in-repo original resolved `REPO_ROOT` as `../` from the script file and defaulted to
`<root>/specs`. That assumption is **wrong for an installed package** (the script lives in
`node_modules/@snackbyte/spec-render/src/`, nowhere near the consumer's specs).

The published contract: **paths resolve against `process.cwd()`.** `spec-render` with no
arg renders `./specs`; `spec-render <path>` resolves `<path>` against cwd. The `feature`
nav label (was `relative(SPECS_DIR, dir)`) is now computed per-run by walking up to a
`specs` ancestor. This is the generalizable lesson: **an extracted in-repo tool's
implicit "repo root" must become an explicit cwd/argument contract.** Not a template
_fact_, but a template _checklist item_ for every CLI graduate.

## 4. The check gate for a no-TypeScript-source package

`check:all = format:check && lint && typecheck && test`. The wrinkle: this package has
**no `.ts` source**, so "typecheck" is `tsc` with `allowJs`+`checkJs` over the `.mjs`.

- **`strict: false` deliberately.** The render logic is a _faithful verbatim copy_ from
  `snackbyte-base`; full `strict` mode would demand JSDoc annotations throughout, i.e.
  rewriting copied code. Instead: `checkJs` on, `strict` off, but keep the checks that
  catch real defects (`noImplicitThis`, `alwaysStrict`). A handful of minimal JSDoc
  `@param`/`@type` casts (≈8 spots) resolved the "property added to an object literal
  after creation" inference cases without touching runtime behavior.
- Template implication: the gate's **shape** is a template fact (the four stages,
  `prepublishOnly` runs it). The **typecheck strictness** is a per-package knob — a
  TS-source package **[build-only]** would run full `strict`; a JS-source graft runs the
  relaxed `checkJs` profile documented here.

## 5. Dependencies

- **Runtime deps** (3): `markdown-it`, `markdown-it-anchor`, `highlight.js`. Ranges match
  `snackbyte-base` (`^14.2.0`, `^9.2.0`, `^11.11.1`).
- **Mermaid is NOT a dependency.** It is a client-side CDN import (jsDelivr) injected into
  the generated HTML only when a `mermaid` fence is present. This stays out of
  `package.json` on purpose — a template graduate can have "dependencies" that are
  runtime-of-the-_output_, not of the package.
- **devDeps**: eslint (+ `@eslint/js`, `eslint-config-prettier`, `globals`), prettier,
  typescript, vitest, `@types/node`, `@types/markdown-it`. A far smaller set than
  `snackbyte-base` (no React/Vite/Express) — the template's devDep list should be the
  _minimal_ lint+format+typecheck+test core, with framework deps added per package.

## 6. Config files that had to exist

- `eslint.config.js` — flat config, `@eslint/js` recommended + node globals +
  `eslint-config-prettier` last. **No** `typescript-eslint` (no TS source) — simpler than
  `snackbyte-base`'s.
- `.prettierrc.json` — inherited settings verbatim (`semi`, `singleQuote`,
  `trailingComma: all`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: always`).
- `.prettierignore` — must exclude generated `specs/**/*.html` and the `.specify/` /
  `.claude/` scaffold (not ours to format).
- `tsconfig.json` — type-check-only (`noEmit`), `allowJs`+`checkJs`, `module`/
  `moduleResolution: NodeNext`. See §4 for the strictness decision.
- `.gitignore` — npm-package flavor: `node_modules`, `.env*`, `*.tgz`, `dist/`,
  `coverage/`, and the generated `specs/**/*.html`.

## 7. Release wiring (the Phase-2 on-ramp, scaffolded dormant)

- `environments.json` — single `production` channel on `main`.
- `.github/workflows/release.yml` — **Recipe B** (library / `version-strategy:
package-json`) from the release-flow Action's `CONSUMING.md`. Tags the intentional
  SemVer in `package.json` verbatim; the gated step runs `npm publish --access public`.
- It is **inert until** (a) `package.json` has a real version to tag and (b) an
  `NPM_TOKEN` repo secret exists. Phase 1 stays manual `npm publish`.
- Template implication: a **library** graduate wires `package-json` strategy (an **app**
  wires `build-id`). This is the fork the template must ask about per graduate.

## 8. Smoke test (Constitution VI — test the artifact, not the tree)

Two layers were run, weakest-to-strongest:

1. **pack + clean-install** — `npm pack` → `npm install <tarball>` into a throwaway
   consumer → run the CLI against a real `specs/` tree. Exercises the **packed files
   only** (the `files` allowlist), never the working tree. Also planted a decoy `.env`
   and confirmed it was excluded from the tarball.
2. **local-registry publish round-trip** — stand up a throwaway Verdaccio registry on
   localhost, run the _real_ `npm publish --access public` against it (so
   `prepublishOnly`/check:all fires and the actual publish code path runs), then
   `npm install @snackbyte/spec-render` **by name** from that registry into a fresh
   project and run the CLI. This proves by-name resolution + publish mechanics with
   **zero** touch to npmjs.org — fully reversible. The only difference from a real
   publish is the registry hostname.

Template implication: layer 2 is a _reusable, credential-free_ pre-publish gate any
graduate can run before the real publish. The template should ship a `smoke:registry`
helper (spin up Verdaccio, publish, install-by-name, run, tear down). Gotchas learned:
Verdaccio 6 disables self-registration (`max_users` doesn't re-enable it) — publish
anonymously via `publish: $anonymous` on the scope + a dummy `_authToken` in a
**project-local `.npmrc`**, and **git-ignore that `.npmrc`** so a token can't be
committed and so it can't redirect a real publish to localhost.

---

## Condensed template checklist (the extract)

A `snackbyte-npm-base` skeleton, per this package, must ship or scaffold:

1. `package.json` with: scoped `name`, `version` `0.1.0`, `type: module`,
   `engines.node >=24` (no upper bound for a lib), **`exports` map** (incl.
   `./package.json`), optional `bin`, **`files` allowlist**, full metadata,
   `prepublishOnly: check:all`.
2. The check gate: `format:check && lint && typecheck && test`, wired into
   `prepublishOnly`. Typecheck strictness is a knob (relaxed `checkJs` for JS-source,
   full `strict` for TS-source).
3. Config: `eslint.config.js` (flat), `.prettierrc.json`, `.prettierignore`,
   `tsconfig.json` (noEmit), npm-flavor `.gitignore`.
4. `LICENSE` (MIT) + a README skeleton (install + usage).
5. Ship-source as the default; build step opt-in **[build-only]**.
6. Release wiring: `environments.json` + `release.yml`, with the app/library strategy
   fork left as a per-graduate choice.
7. The **pack-and-install smoke test** as the definition of "shippable".
8. A per-graduate note: **every extracted in-repo CLI must convert its implicit repo-root
   assumption into an explicit cwd/argument contract.**
