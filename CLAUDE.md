# CLAUDE.md — @snackbyte/spec-render

This is a **published npm package**. Strangers install it; a mistake in the publish
surface reaches them silently and a published version can never be taken back. That
shapes every rule below.

## The publish contract is load-bearing

`package.json`'s `exports`, `files`, `bin`, `engines` and `type` are the interface
consumers depend on. `npm run check:contract` (part of `check:all`) asserts them; do
not weaken or bypass it. In particular:

- `exports` is a map and always includes `./package.json`.
- `files` is an allowlist. Nothing ships that isn't listed; never lean on `.npmignore`.
- `bin` paths are bare (`dist/cli.js`, never `./dist/cli.js`) — npm strips the prefix
  on publish and ships no CLI.
- `engines.node` is a floor with no ceiling. A library must install on the next Node.

## The gate stays green at every step

`npm run check:all` — format, lint, typecheck, contract, tests — passes before every
commit, not only at the end. `prepublishOnly` runs it (plus the build, plus the on-disk
contract check) so a red tree cannot be published.

## Test what users get, not the working tree

- `npm run smoke:pack` before any publish: packs the tarball, proves a planted `.env`
  is not in it, installs it into a clean consumer, imports by name, runs the bin.
- `npm run smoke:registry` before the **first** publish: the real `npm publish` code
  path against a throwaway local registry, then an install by name. Never touches
  npmjs.org. It writes a project-local `.npmrc` and deletes it; that file is
  git-ignored and must never be committed.

## Releasing

`RELEASING.md` is the runbook. The short form: the first publish is a bootstrap from a
maintainer's machine with 2FA — once, because npm's trusted publisher can only be
configured on a package that exists. After that, a release is _bump `version`, merge
to `main`_; CI publishes by trusted publishing. No npm token exists anywhere and none
should be created. Never `npm publish` from a machine after the bootstrap. Never
`npm unpublish` — deprecate and roll forward.

## Defaults you inherit

From `snackbyte-npm-base`'s constitution: `@snackbyte/*` scope, ESM-only, MIT, Node
`>=24`, SemVer. Deviating from one is allowed with the reason recorded in this
package's spec or plan — never by inertia.
