#!/usr/bin/env node
// spec-render — CLI over the @snackbyte/spec-render core.
//
// Renders Spec Kit Markdown artifacts to sibling .html views. Generated .html
// files are derived artifacts (git-ignore them). Paths are resolved against the
// current working directory — run it from your repo root:
//
//   spec-render                 # render every ./specs/**/*.md
//   spec-render <path>          # render one .md file or one directory (recursively)
//   spec-render --watch [path]  # render, then re-render on save (Ctrl-C to stop)
//   spec-render --clean [path]  # remove generated .html alongside .md
//
// The default target is ./specs relative to the current directory. This is the
// CLI's cwd contract: unlike the in-repo script it was extracted from, it makes
// no assumption about where the package itself is installed.

import { readdir, stat, unlink, access, watch } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { renderFile } from './index.mjs';

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

// The directory the run is rooted at — cwd. Used only to make console paths and
// the artifact `feature` label readable/relative; never to locate the package.
const ROOT = process.cwd();
const DEFAULT_SPECS_DIR = join(ROOT, 'specs');
const rel = (p) => relative(ROOT, p) || '.';

// --- File walking ----------------------------------------------------------

async function* walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      yield full;
    }
  }
}

// The root that the `feature` nav label is made relative to. When rendering
// under a specs/ tree, that's the specs dir; otherwise fall back to the target
// itself so the label degrades to the immediate directory name.
function specsRootFor(target, targetIsFile) {
  const dir = targetIsFile ? dirname(target) : target;
  // Walk up to a `specs` ancestor if one exists, else use DEFAULT_SPECS_DIR
  // when it's an ancestor, else the dir itself.
  const parts = dir.split('/');
  const idx = parts.lastIndexOf('specs');
  if (idx >= 0) return parts.slice(0, idx + 1).join('/');
  if (dir === DEFAULT_SPECS_DIR || dir.startsWith(DEFAULT_SPECS_DIR + '/')) {
    return DEFAULT_SPECS_DIR;
  }
  return dir;
}

async function resolveTarget(arg) {
  if (!arg) return DEFAULT_SPECS_DIR;
  return resolve(ROOT, arg);
}

// Watch the target directory and re-render a .md file when it changes.
// Uses fs/promises watch (recursive) — no extra dependency. Renders are
// debounced per-file so a burst of save events collapses to one render.
async function watchAndRender(dir, specsRoot) {
  console.log(`\nWatching ${rel(dir)} for changes… (Ctrl-C to stop)`);
  const timers = new Map();
  const DEBOUNCE = 120;
  const watcher = watch(dir, { recursive: true });
  for await (const event of watcher) {
    const name = event.filename;
    if (!name || !name.endsWith('.md')) continue;
    const full = join(dir, name);
    clearTimeout(timers.get(full));
    timers.set(
      full,
      setTimeout(async () => {
        timers.delete(full);
        try {
          // file may have been deleted between event and render
          if (!(await exists(full))) {
            await unlink(full.replace(/\.md$/, '.html')).catch(() => {});
            console.log(`  removed view for deleted ${rel(full)}`);
            return;
          }
          const out = await renderFile(full, { specsRoot });
          const t = new Date().toLocaleTimeString();
          console.log(`  [${t}] ${rel(full)} -> ${rel(out)}`);
        } catch (err) {
          console.error(`  error rendering ${rel(full)}: ${err.message}`);
        }
      }, DEBOUNCE),
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');
  const watchMode = args.includes('--watch');
  const pathArg = args.find((a) => !a.startsWith('--'));
  const target = await resolveTarget(pathArg);

  const s = await stat(target).catch(() => null);
  if (!s) {
    console.error(`Path not found: ${target}`);
    process.exitCode = 1;
    return;
  }

  let files = [];
  if (s.isFile()) {
    if (!target.endsWith('.md')) {
      console.error('Target must be a .md file or a directory.');
      process.exitCode = 1;
      return;
    }
    files = [target];
  } else {
    for await (const f of walk(target)) files.push(f);
  }

  const specsRoot = specsRootFor(target, s.isFile());

  if (clean) {
    let removed = 0;
    for (const f of files) {
      const htmlPath = f.replace(/\.md$/, '.html');
      try {
        await unlink(htmlPath);
        removed++;
      } catch {
        /* not present */
      }
    }
    console.log(`Removed ${removed} generated .html file(s).`);
    return;
  }

  let n = 0;
  for (const f of files) {
    const out = await renderFile(f, { specsRoot });
    console.log(`  ${rel(f)} -> ${rel(out)}`);
    n++;
  }
  console.log(n ? `\nRendered ${n} file(s) to HTML.` : 'No .md files found.');

  // --watch keeps the process alive, re-rendering on save. Watch the directory
  // even when it started empty, so newly-created specs render automatically.
  if (watchMode) {
    const watchDir = s.isFile() ? dirname(target) : target;
    await watchAndRender(watchDir, specsRoot);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
