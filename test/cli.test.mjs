import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod, access, realpath } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'src', 'cli.mjs');

const exists = (p) =>
  access(p).then(
    () => true,
    () => false,
  );

let cwd;
beforeEach(async () => {
  cwd = await realpath(await mkdtemp(join(tmpdir(), 'spec-render-cli-')));
});
afterEach(async () => {
  await rm(cwd, { recursive: true, force: true });
});

function run(...args) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8' });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

async function seedFeature(dir = join(cwd, 'specs', '001-login')) {
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'spec.md'), '# Login\n\nA spec.\n');
  await writeFile(join(dir, 'notes.md'), '# Notes\n\nNotes.\n');
  return dir;
}

describe('cli: help and version', () => {
  it.each(['--help', '-h'])('%s prints usage and exits 0', (flag) => {
    const r = run(flag);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/^Usage: spec-render \[options\] \[path\]/);
    expect(r.out).toContain('--watch');
    expect(r.out).toContain('--clean');
  });

  it.each(['--version', '-v'])('%s prints the package version and exits 0', async (flag) => {
    const { version } = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
    const r = run(flag);
    expect(r.code).toBe(0);
    expect(r.out.trim()).toBe(version);
  });

  it('--help wins over a missing specs folder', () => {
    expect(run('--help').code).toBe(0);
  });
});

describe('cli: command-line mistakes exit 2 and render nothing', () => {
  it('an unknown option is named', async () => {
    await seedFeature();
    const r = run('--wtach');
    expect(r.code).toBe(2);
    expect(r.err).toContain('Unknown option: --wtach');
    expect(r.err).toContain('spec-render --help');
    expect(await exists(join(cwd, 'specs', '001-login', 'spec.html'))).toBe(false);
  });

  it('more than one path is refused', async () => {
    await seedFeature();
    const r = run('specs/001-login/spec.md', 'specs/001-login/notes.md');
    expect(r.code).toBe(2);
    expect(r.err).toContain('takes one path, got 2');
    expect(await exists(join(cwd, 'specs', '001-login', 'spec.html'))).toBe(false);
  });

  it('--watch with --clean is refused', () => {
    const r = run('--watch', '--clean');
    expect(r.code).toBe(2);
    expect(r.err).toContain('--watch and --clean cannot be used together');
  });
});

describe('cli: missing or wrong targets exit 1', () => {
  it('no specs/ folder says where it looked and what to do', () => {
    const r = run();
    expect(r.code).toBe(1);
    expect(r.err).toContain(`No specs/ folder in ${cwd}`);
    expect(r.err).toContain('spec-render <file.md | directory>');
  });

  it('a missing explicit path is named as given', () => {
    const r = run('nope.md');
    expect(r.code).toBe(1);
    expect(r.err.trim()).toBe('Path not found: nope.md');
  });

  it('a file that is not Markdown is refused', async () => {
    await writeFile(join(cwd, 'readme.txt'), 'hi');
    const r = run('readme.txt');
    expect(r.code).toBe(1);
    expect(r.err).toContain('Not a Markdown file: readme.txt');
  });
});

describe('cli: rendering', () => {
  it('renders every .md under ./specs by default', async () => {
    const dir = await seedFeature();
    const r = run();
    expect(r.code).toBe(0);
    expect(r.out).toContain('Rendered 2 file(s) to HTML.');
    expect(await readFile(join(dir, 'spec.html'), 'utf8')).toContain('<html');
    expect(await exists(join(dir, 'notes.html'))).toBe(true);
  });

  it('renders one file given as a path', async () => {
    const dir = await seedFeature();
    const r = run('specs/001-login/spec.md');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Rendered 1 file(s) to HTML.');
    expect(await exists(join(dir, 'spec.html'))).toBe(true);
    expect(await exists(join(dir, 'notes.html'))).toBe(false);
  });

  it('says so when a directory holds no Markdown', async () => {
    await mkdir(join(cwd, 'empty'));
    const r = run('empty');
    expect(r.code).toBe(0);
    expect(r.out).toContain('No .md files found under empty.');
  });

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'a file that fails to render is reported, the rest still render, and the run exits 1',
    async () => {
      const dir = await seedFeature();
      await chmod(join(dir, 'notes.md'), 0o000);
      try {
        const r = run();
        expect(r.code).toBe(1);
        expect(r.err).toContain('error rendering specs/001-login/notes.md');
        expect(r.err).toContain('1 file(s) failed to render.');
        expect(r.out).toContain('Rendered 1 file(s) to HTML.');
        expect(await exists(join(dir, 'spec.html'))).toBe(true);
      } finally {
        await chmod(join(dir, 'notes.md'), 0o644);
      }
    },
  );

  it('--clean removes the generated views', async () => {
    const dir = await seedFeature();
    run();
    const r = run('--clean');
    expect(r.code).toBe(0);
    expect(r.out).toContain('Removed 2 generated .html file(s).');
    expect(await exists(join(dir, 'spec.html'))).toBe(false);
  });
});

describe('cli: --watch', () => {
  it('re-renders a file when it is saved', async () => {
    const dir = await seedFeature();
    const child = spawn(process.execPath, [CLI, '--watch'], { cwd });
    let out = '';
    const seen = (text) =>
      new Promise((resolveSeen, rejectSeen) => {
        const timer = setTimeout(
          () => rejectSeen(new Error(`timed out waiting for: ${text}\n${out}`)),
          8000,
        );
        const check = () => {
          if (out.includes(text)) {
            clearTimeout(timer);
            child.stdout.off('data', check);
            resolveSeen(undefined);
          }
        };
        child.stdout.on('data', check);
        check();
      });
    child.stdout.on('data', (d) => (out += d));
    try {
      await seen('Watching specs for changes');
      // On Linux the recursive watcher attaches to subfolders asynchronously after
      // the banner prints, so a save in the first moments can go unseen. Save again
      // until the re-render line (it carries a [time] stamp) shows up.
      const rerendered = '] specs/001-login/spec.md -> specs/001-login/spec.html';
      for (let attempt = 0; attempt < 20 && !out.includes(rerendered); attempt++) {
        await writeFile(join(dir, 'spec.md'), '# Login\n\nEdited while watching.\n');
        await new Promise((r) => setTimeout(r, 400));
      }
      await seen(rerendered);
      await expect
        .poll(() => readFile(join(dir, 'spec.html'), 'utf8'))
        .toContain('Edited while watching.');
    } finally {
      child.kill();
    }
  }, 15000);
});
