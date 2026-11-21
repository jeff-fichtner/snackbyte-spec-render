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
//   spec-render --help | --version
//
// The default target is ./specs relative to the current directory. This is the
// CLI's cwd contract: it makes no assumption about where the package itself is
// installed.
//
// Exit codes: 0 success; 1 a path is missing or a file failed to render;
// 2 the command line itself is wrong (an unknown option, too many paths).

import { readdir, readFile, stat, unlink, access, watch } from 'node:fs/promises';
import { join, dirname, relative, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { renderFile } from './index.mjs';

const USAGE = `Usage: spec-render [options] [path]

Render Spec Kit Markdown artifacts (spec.md, plan.md, tasks.md, ...) to
interactive HTML. Each <name>.md gets a sibling <name>.html.

  path            a .md file, or a directory to render recursively
                  (default: ./specs, resolved against the current directory)

Options:
  -w, --watch     render, then re-render each file when it is saved
  -c, --clean     remove the generated .html next to each .md instead
  -h, --help      show this help
  -v, --version   show the installed version

Examples:
  spec-render                      render every .md under ./specs
  spec-render specs/001-login      render one feature
  spec-render --watch              keep the views current while you edit
  spec-render --clean              delete the generated views

Docs: https://github.com/jeff-fichtner/snackbyte-spec-render#readme`;

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

// A command-line mistake: printed with a pointer to --help, exit 2.
class UsageError extends Error {}

function parseCommandLine(argv) {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      strict: true,
      options: {
        watch: { type: 'boolean', short: 'w' },
        clean: { type: 'boolean', short: 'c' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });
  } catch (err) {
    // parseArgs names the offending option first; its advice about `--` is noise here.
    const option = /'([^']+)'/.exec(err.message)?.[1];
    throw new UsageError(option ? `Unknown option: ${option}` : err.message);
  }
  const { values, positionals } = parsed;
  if (positionals.length > 1) {
    throw new UsageError(
      `spec-render takes one path, got ${positionals.length}: ${positionals.join(' ')}\n` +
        'Pass a directory to render everything under it.',
    );
  }
  if (values.watch && values.clean) {
    throw new UsageError('--watch and --clean cannot be used together.');
  }
  return { ...values, path: positionals[0] };
}

async function packageVersion() {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  return pkg.version;
}

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
  let opts;
  try {
    opts = parseCommandLine(process.argv.slice(2));
  } catch (err) {
    if (!(err instanceof UsageError)) throw err;
    console.error(`${err.message}\nRun "spec-render --help" for usage.`);
    process.exitCode = 2;
    return;
  }

  if (opts.help) {
    console.log(USAGE);
    return;
  }
  if (opts.version) {
    console.log(await packageVersion());
    return;
  }

  const target = opts.path ? resolve(ROOT, opts.path) : DEFAULT_SPECS_DIR;
  const s = await stat(target).catch(() => null);
  if (!s) {
    if (opts.path) {
      console.error(`Path not found: ${opts.path}`);
    } else {
      console.error(
        `No specs/ folder in ${ROOT}\n` +
          'Run spec-render from your project root (where Spec Kit keeps specs/),\n' +
          'or pass a path: spec-render <file.md | directory>. See "spec-render --help".',
      );
    }
    process.exitCode = 1;
    return;
  }

  let files = [];
  if (s.isFile()) {
    if (!target.endsWith('.md')) {
      console.error(`Not a Markdown file: ${opts.path}\nPass a .md file or a directory.`);
      process.exitCode = 1;
      return;
    }
    files = [target];
  } else {
    for await (const f of walk(target)) files.push(f);
  }

  const specsRoot = specsRootFor(target, s.isFile());

  if (opts.clean) {
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

  // One file failing does not stop the rest: each is reported, and the run
  // exits 1 at the end if any failed.
  let rendered = 0;
  let failed = 0;
  for (const f of files) {
    try {
      const out = await renderFile(f, { specsRoot });
      console.log(`  ${rel(f)} -> ${rel(out)}`);
      rendered++;
    } catch (err) {
      console.error(`  error rendering ${rel(f)}: ${err.message}`);
      failed++;
    }
  }
  if (!files.length) {
    console.log(`No .md files found under ${rel(target)}.`);
  } else {
    console.log(`\nRendered ${rendered} file(s) to HTML.`);
  }
  if (failed) {
    console.error(`${failed} file(s) failed to render.`);
    process.exitCode = 1;
  }

  // --watch keeps the process alive, re-rendering on save. Watch the directory
  // even when it started empty, so newly-created specs render automatically.
  if (opts.watch) {
    const watchDir = s.isFile() ? dirname(target) : target;
    await watchAndRender(watchDir, specsRoot);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
