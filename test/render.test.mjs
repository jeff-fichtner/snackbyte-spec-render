import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFile, writeFile, mkdtemp, rm, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  renderMarkdown,
  renderArtifact,
  renderFile,
  looksLikeSpec,
  looksLikePlan,
  looksLikeTasks,
  renderSpecDashboard,
  renderPlanView,
  renderTasksTimeline,
  navBar,
  NAV_STYLES,
  NAV_KEYS,
} from '../src/index.mjs';

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const read = (name) => readFile(join(FIX, name), 'utf8');

let spec, plan, tasks, research;
beforeAll(async () => {
  [spec, plan, tasks, research] = await Promise.all([
    read('spec.md'),
    read('plan.md'),
    read('tasks.md'),
    read('research.md'),
  ]);
});

describe('exports', () => {
  it('exposes the full public surface', () => {
    for (const fn of [
      renderMarkdown,
      renderArtifact,
      renderFile,
      renderSpecDashboard,
      renderPlanView,
      renderTasksTimeline,
      navBar,
    ]) {
      expect(typeof fn).toBe('function');
    }
    expect(typeof NAV_STYLES).toBe('string');
    expect(Array.isArray(NAV_KEYS)).toBe(true);
    expect(NAV_KEYS).toContain('spec');
  });
});

describe('looksLike* predicates', () => {
  it('detects a spec', () => {
    expect(looksLikeSpec(spec)).toBe(true);
    expect(looksLikeSpec(research)).toBe(false);
  });
  it('detects a plan', () => {
    expect(looksLikePlan(plan)).toBe(true);
    expect(looksLikePlan(research)).toBe(false);
  });
  it('detects tasks', () => {
    expect(looksLikeTasks(tasks)).toBe(true);
    expect(looksLikeTasks(research)).toBe(false);
  });
});

describe('renderArtifact dispatch', () => {
  const isFullDoc = (html) =>
    html.startsWith('<!DOCTYPE html>') && html.trimEnd().endsWith('</html>');

  it('renders spec.md via the dashboard (priority + requirement cards)', () => {
    const html = renderArtifact(spec, { name: 'spec.md', title: 'Widget Spec' });
    expect(isFullDoc(html)).toBe(true);
    expect(html).toContain('req-list'); // dashboard-only markup
    expect(html).toContain('FR-001');
    expect(html).toContain('class="status'); // status badge
  });

  it('renders plan.md via the plan view (def grid + principle cards)', () => {
    const html = renderArtifact(plan, { name: 'plan.md', title: 'Widget Plan' });
    expect(isFullDoc(html)).toBe(true);
    expect(html).toContain('def-grid'); // Technical Context -> definition grid
    expect(html).toContain('principle'); // Constitution Check -> principle cards
  });

  it('renders tasks.md via the timeline (roadmap chips + panels)', () => {
    const html = renderArtifact(tasks, { name: 'tasks.md', title: 'Widget Tasks' });
    expect(isFullDoc(html)).toBe(true);
    expect(html).toContain('roadmap'); // timeline-only markup
    expect(html).toContain('PHASE 1');
    expect(html).toContain('MVP'); // 🎯 MVP badge parsed
  });

  it('falls back to the generic view for a non-artifact name', () => {
    // Even spec content, if the filename is not spec.md, uses the generic view.
    const html = renderArtifact(spec, { name: 'notes.md' });
    expect(isFullDoc(html)).toBe(true);
    expect(html).not.toContain('req-list');
    expect(html).toContain('<article>'); // generic shell
  });

  it('falls back to generic when content does not match the name', () => {
    // tasks.md filename but research content (no phases) -> generic view
    const html = renderArtifact(research, { name: 'tasks.md' });
    expect(html).not.toContain('roadmap');
    expect(html).toContain('<article>');
  });
});

describe('generic view (renderMarkdown)', () => {
  it('is a full HTML document with the reading shell', () => {
    const html = renderMarkdown(research);
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<article>');
    expect(html).toContain('nav class="toc"'); // TOC present when headings exist
  });

  it('derives the title from the first H1 when none is passed', () => {
    const html = renderMarkdown(research);
    expect(html).toContain('<title>Widget Research</title>');
  });

  it('prefers an explicit title', () => {
    const html = renderMarkdown(research, { title: 'Override' });
    expect(html).toContain('<title>Override</title>');
  });

  it('builds a TOC that includes level-3 headings', () => {
    const html = renderMarkdown(research);
    expect(html).toContain('lvl-3'); // "### A level-3 heading"
    expect(html).toContain('Deeper section');
  });

  it('escapes HTML in code and preserves smart quotes/entities safely', () => {
    const html = renderMarkdown(research);
    // The literal "<script>" in prose must be escaped, never a live tag.
    expect(html).not.toContain('<script>const'); // no injected live script from content
    expect(html).toContain('&lt;script&gt;');
  });

  it('syntax-highlights fenced code with a known language', () => {
    const html = renderMarkdown(research);
    expect(html).toContain('<pre class="hljs">');
    expect(html).toContain('hljs-'); // at least one highlight token class
  });

  it('detects mermaid and injects the client loader only when present', () => {
    const withMermaid = renderMarkdown(research);
    expect(withMermaid).toContain('<pre class="mermaid">');
    expect(withMermaid).toContain('mermaid.esm.min.mjs'); // CDN loader injected

    const noMermaid = renderMarkdown('# Plain\n\nNo diagram here.');
    expect(noMermaid).not.toContain('mermaid.esm.min.mjs');
  });

  it('decorates priority and status markers as badges', () => {
    const html = renderMarkdown('# T\n\nItem (Priority: P1)\n\n**Status**: In-Progress\n');
    expect(html).toContain('class="badge p1"');
    expect(html).toContain('class="badge status"');
    expect(html).toContain('In-Progress'); // full multi-word status preserved
  });
});

describe('navBar', () => {
  it('marks the current artifact and links existing siblings', () => {
    const bar = navBar({
      siblings: { spec: true, plan: true, tasks: false },
      current: 'plan',
      feature: '007-widget',
    });
    expect(bar).toContain('007-widget');
    expect(bar).toContain('an-link current'); // current is a non-link span
    expect(bar).toContain('href="spec.html"'); // existing sibling linked
    expect(bar).not.toContain('href="tasks.html"'); // missing sibling omitted
  });
});

describe('renderFile (filesystem round-trip)', () => {
  let dir;
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'spec-render-test-'));
    const feat = join(dir, 'specs', '007-widget');
    await mkdir(feat, { recursive: true });
    await writeFile(join(feat, 'spec.md'), spec, 'utf8');
    await writeFile(join(feat, 'plan.md'), plan, 'utf8');
    await writeFile(join(feat, 'tasks.md'), tasks, 'utf8');
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const exists = (p) =>
    access(p).then(
      () => true,
      () => false,
    );

  it('writes a sibling .html next to the .md and returns its path', async () => {
    const specsRoot = join(dir, 'specs');
    const md = join(specsRoot, '007-widget', 'spec.md');
    const out = await renderFile(md, { specsRoot });
    expect(out).toBe(md.replace(/\.md$/, '.html'));
    expect(await exists(out)).toBe(true);
    const html = await readFile(out, 'utf8');
    expect(html).toContain('req-list'); // rendered as a spec dashboard
  });

  it('discovers sibling artifacts and labels the feature', async () => {
    const specsRoot = join(dir, 'specs');
    const md = join(specsRoot, '007-widget', 'plan.md');
    const out = await renderFile(md, { specsRoot });
    const html = await readFile(out, 'utf8');
    // spec.md and tasks.md exist as siblings -> both linked in the nav bar.
    expect(html).toContain('href="spec.html"');
    expect(html).toContain('href="tasks.html"');
    // feature label derived from the specsRoot-relative first path segment.
    expect(html).toContain('007-widget');
  });

  it('uses the directory name as the feature label without a specsRoot', async () => {
    const md = join(dir, 'specs', '007-widget', 'tasks.md');
    const out = await renderFile(md);
    const html = await readFile(out, 'utf8');
    expect(html).toContain('007-widget'); // falls back to basename(dir)
  });
});
