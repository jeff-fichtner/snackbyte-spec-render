# @snackbyte/spec-render Constitution

This constitution governs `@snackbyte/spec-render` — the Spec Kit artifact renderer
(render library + `spec-html` CLI), published to npm under the `@snackbyte/*` scope.

It is **inherited from and subordinate to** the
[`snackbyte-npm-base`](../snackbyte-npm-base) constitution (v1.1.0): this package is a
spin-out of that template and adopts its principles along with its tooling. The
principles below are reproduced so this repo is self-contained; where this file and the
template's constitution diverge, **the template's wins** and this file is the bug. Any
package-specific deviation from a default must be justified in this package's spec/plan
(per Principle V), never chosen by inertia.

## Core Principles

### I. Correct From Day One, Automated Later

Assume nobody will ever download the package; build it as if a million people will. The
distinction that matters is **correctness vs. automation**, earned in that order:

- *Correctness* is non-negotiable at Phase 1 — a right `exports` map, a `files`
  allowlist, no secrets in the tarball, SemVer honored. These cost nothing now and
  prevent irreversible mistakes later.
- *Automation* (CI publish, provenance, changelogs) is added as the package earns more
  consumers. Deferring automation is fine; shipping something *wrong* is not.

The package may stop at any phase and still be correct. Later phases add safety and
scale; they never rewrite the correctness earned earlier.

### II. The Publish Contract Is Load-Bearing

The `package.json` publish surface is the interface strangers depend on, and most of its
failure modes are silent:

- `exports` (not just `main`) defines what is importable — get it wrong and consumers
  break with no error in this repo.
- `files` / `.npmignore` is an allowlist — publish only `src/` (this package ships
  source, not a build) + README + LICENSE. Never ship `node_modules`, tests, `.env`, or
  scratch.
- `version` is a contract: a breaking change in a non-major bump breaks consumers.
- **A leaked secret in a published tarball is the #1 irreversible mistake** —
  `unpublish` is blocked after 72h. Treat every publish as permanent.

### III. Deprecate, Never Unpublish

Once published, a version is forever. The supported path to retire a version is
`npm deprecate`, never `unpublish`. Bad releases are superseded by a new version and
deprecated — not deleted.

### IV. No Laptop Publishes (Once Automated)

From Phase 2 onward, this package is never `npm publish`'d from a developer machine. A
release is: bump `version` in `package.json`, merge to `main`; the release-flow Action
tags `v<version>` (`version-strategy: package-json` — the SemVer in `package.json`, not
a build counter); CI tests and publishes.

CI authenticates to npm by **trusted publishing** (OIDC): GitHub mints a short-lived
identity token per run and npm accepts it. No npm token exists anywhere — not in CI
secrets, not in a shell — so there is nothing to leak, scope or rotate. Provenance is
attested automatically with every CI publish.

The one exception is the bootstrap: a trusted publisher can only be configured on a
package that already exists on npm. For this package that publish is done —
`0.1.0`, 2026-07-06, by hand, before the template existed — and `RELEASING.md` records
it. Every publish after it is CI.

### V. Deliberate Defaults, Not Per-Repo Re-Litigation

The recurring decisions are pinned once. Deviating is allowed but must be justified in
this package's spec/plan:

| Decision          | snackbyte default             | This package                          |
|-------------------|-------------------------------|---------------------------------------|
| Scope             | `@snackbyte/*`                | `@snackbyte/spec-render`              |
| Public vs private | Public unless a reason not to | Public (`--access public`)            |
| Source            | TypeScript, compiled, types shipped | **JS ship-source (opt-out)** — a verbatim graft of working `.mjs` where full `strict` would mean rewriting copied code; justification recorded in `DECISIONS.md` §4 |
| Module format     | ESM-only                      | ESM-only (`"type": "module"`)         |
| License           | MIT                           | MIT                                   |
| Versioning        | SemVer + Changesets           | SemVer, start `0.1.0`                 |
| Publish path      | CI via trusted publishing (OIDC) from Phase 2 on; first publish is a bootstrap | Bootstrap done by hand (0.1.0); CI via trusted publishing since 0.1.1 |
| Node floor        | Match the apps (`>=24`)       | `engines.node >= 24`                  |

### VI. Test What Users Get, Not Your Working Tree

Correctness is proven against the *artifact*, not the source. The `npm pack` smoke test —
pack the tarball, install it in a clean project, run the CLI against a real `specs/` tree
— is the minimum bar before this package is considered shippable. `prepublishOnly` runs
the check gate so a broken artifact cannot be published.

## Phasing Model

This package graduates up the same phases as the template (Phase 0 template → Phase 1
correct manual publish → Phase 2 CI-on-tag → Phase 3 provenance/audited → Phase 4 fleet
scale). Each phase is independently shippable and additive; a later phase never rewrites
an earlier one. **This package is at Phase 2** — correct (Phase 1, by hand, 2026-07-06)
and published from CI by trusted publishing (the 2026-09-20 conformance to template
0.6.0).

## Development Workflow

- **Spec-driven.** Work starts as a spec under `specs/`, authored with the Spec Kit
  skills. Plans and tasks derive from the spec.
- **Constitution check.** `/speckit-plan` verifies the plan against these principles
  before implementation; a violation must be justified or the plan changed.
- **Every-step green.** The full check gate (lint / typecheck / test) stays green at each
  step, not only at the end. The bar is: `npm run check:all` passes and the package can
  be `npm pack`'d and installed clean without touching any tooling.

## Governance

This constitution is subordinate to `snackbyte-npm-base`'s and supersedes ad-hoc practice
for this package. When a principle and a convenience conflict, the principle wins or the
template's constitution is amended — not silently ignored.

- Amendments here may only *narrow* to this package's specifics; they may not weaken an
  inherited principle. Structural changes to a principle happen in the template, then flow
  down.
- Any deviation from a Principle V default must be recorded in this package's spec or
  plan, with its justification.

**Version**: 1.1.0 | **Inherits**: snackbyte-npm-base constitution v1.1.0 | **Ratified**: 2026-07-06 | **Last Amended**: 2026-09-20

### Amendments

- **1.1.0 — 2026-09-20.** Re-inherits from the template's v1.1.0: Principle IV now
  reads trusted publishing (OIDC) and names the bootstrap, which this package already
  did by hand; Principle V gains the *Source* row, recording this package as the JS
  ship-source opt-out with its justification in `DECISIONS.md` §4; the phasing note
  moves this package to Phase 2. Made with the conformance PR to template 0.6.0.
