# @snackbyte/spec-render Constitution

This constitution governs `@snackbyte/spec-render` — the Spec Kit artifact renderer
(render library + `spec-html` CLI), published to npm under the `@snackbyte/*` scope.

It is **inherited from and subordinate to** the
[`snackbyte-npm-base`](../snackbyte-npm-base) constitution (v1.0.0): this package is a
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

From Phase 2 onward, this package is never `npm publish`'d from a developer machine.
Releases run through CI on a tag: `git tag vX.Y.Z && git push --tags` → build → test →
publish, using the manifest-driven release-flow Action with `version-strategy:
package-json` (the SemVer in `package.json`, not a build counter). Tokens live in CI
secrets; granular automation tokens, not classic; 2FA on the account. Phase 1's manual
`npm publish --access public` is the explicitly-allowed exception until Phase 2 lands.

### V. Deliberate Defaults, Not Per-Repo Re-Litigation

The recurring decisions are pinned once. Deviating is allowed but must be justified in
this package's spec/plan:

| Decision          | snackbyte default             | This package                          |
|-------------------|-------------------------------|---------------------------------------|
| Scope             | `@snackbyte/*`                | `@snackbyte/spec-render`              |
| Public vs private | Public unless a reason not to | Public (`--access public`)            |
| Module format     | ESM-only                      | ESM-only (`"type": "module"`)         |
| License           | MIT                           | MIT                                   |
| Versioning        | SemVer + Changesets           | SemVer, start `0.1.0`                 |
| Publish path      | CI-on-tag from Phase 2 on     | Manual at Phase 1, CI-on-tag Phase 2  |
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
an earlier one. **This package targets Phase 1** — a correct, manually-published package —
and adopts the release-flow Action wiring as the on-ramp to Phase 2.

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

**Version**: 1.0.0 | **Inherits**: snackbyte-npm-base constitution v1.0.0 | **Ratified**: 2026-07-06 | **Last Amended**: 2026-07-06
