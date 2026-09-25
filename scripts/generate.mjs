#!/usr/bin/env node
/**
 * Renders every image in README.md as an animated SVG, in GitHub's dark and light themes.
 *
 *   npm ci && node scripts/generate.mjs          # live data from the GitHub API (uses GITHUB_TOKEN if set)
 *   OFFLINE=1 node scripts/generate.mjs          # no network; activity uses clearly-labelled sample data
 *
 * Built on GitHub's own open-source design stack:
 *   primer/primitives (colour tokens) · primer/octicons (UI icons) · simple-icons (tech marks)
 *   github/mona-sans, hubot-sans & githubnext/monaspace (type, SIL OFL, via @fontsource)
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { THEMES, doc, octicon, brandIcon, monoWidth } from './lib/design.mjs';
import { rng, noise2D, contours, polyPath, smooth, vignettes, THUMB, VIGNETTE_CSS, VIGNETTE_REDUCED } from './lib/art.mjs';

const USER = process.env.GH_USER || 'Adhrit-Verma';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = new URL('../assets/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const W = 1000;

// ═════════════════════════ content ═════════════════════════
const PROJECTS = {
  production: [
    { slug: 'aviatrack', name: 'AviaTrack', meta: 'Private · in production', art: 'aviatrack',
      desc: 'Airline crew and operations platform: flight planning, PIC/SIC allocation, duty-time and FDP maths, DGCA-style feasibility checks and multi-leg execution. I built over 70% of the core workflows.',
      stack: ['Node.js', 'PostgreSQL', 'RBAC', 'CI/CD'] },
    { slug: 'hrm', name: 'HRM Platform', meta: 'Private · in production', art: 'hrm',
      desc: 'An end-to-end HR suite covering attendance, leave, payroll and slips, appraisals, onboarding, documents and device tracking, with RBAC, audit logs and approval workflows.',
      stack: ['Node.js', 'Express', 'PostgreSQL', 'Audit logging'] },
  ],
  open: [
    { slug: 'contrast', name: 'Contrast', repo: 'Contrast', meta: 'Open source · JavaScript', art: 'contrast',
      desc: 'Accessibility auditor that pairs deterministic scans (axe-core, Lighthouse, the accessibility tree) with LLM judgement, writes the fixes, then re-verifies them in a clean browser.',
      stack: ['Node.js', 'Puppeteer', 'LangGraph', 'axe-core', 'SQLite'] },
    { slug: 'clauseguard', name: 'ClauseGuard', repo: 'ClauseGuard', meta: 'Open source · Python', art: 'clauseguard',
      desc: 'Contract review as a three-agent pipeline (extract, assess risk, summarise) with hybrid BM25 and embedding retrieval, running on local Ollama or the Anthropic API.',
      stack: ['FastAPI', 'LangGraph', 'Pydantic', 'Ollama', 'pytest'] },
    { slug: 'tablefox', name: 'TableFox', repo: 'TableFox', meta: 'Experimental · Python', art: 'tablefox',
      desc: 'Local-first schema intelligence for AI agents: a searchable PostgreSQL schema graph and guarded read-only SQL, exposed as MCP tools so agents spend fewer tokens on your database.',
      stack: ['FastAPI', 'Next.js', 'MCP', 'PostgreSQL'] },
    { slug: 'self-extending-ai', name: 'Self-Extending AI', repo: 'two-agent-self-extending-ai-system', meta: 'Experimental · Python', art: 'selfext',
      desc: 'Two agents, one skill registry. A UserAgent serves requests from approved skills; when it hits a gap, a BuilderAgent writes a new one that is sandbox-validated and approved before it runs.',
      stack: ['Python', 'FastAPI', 'Sandboxing'] },
    { slug: 'gdc', name: 'Gradient Dense Code', repo: 'GDC', meta: 'Research · Python', art: 'gdc',
      desc: 'A scannable QR carrier with an extra payload encoded in calibrated RGB gradients, with Reed–Solomon, CRC32, interleaving and camera decoding. A research prototype, not a standard.',
      stack: ['Python', 'OpenCV', 'Error correction'] },
    { slug: 'audix', name: 'AuDix', repo: 'AuDix_User', meta: 'Open source · JavaScript', art: 'audix',
      desc: 'Local-intranet audio broadcasting. One host goes live and everyone on the LAN listens in real time, with no internet and no accounts.',
      stack: ['JavaScript', 'Node.js', 'Real-time audio'] },
  ],
};

const METHOD = [
  ['Observe', 'sit with the manual', 'workflow first'],
  ['Model', 'schema, roles,', 'permissions, audit'],
  ['Build', 'APIs in Node.js', 'or Python'],
  ['Augment', 'RAG and agents, only', 'where they earn it'],
  ['Ship', 'CI/CD, VPS, logs,', 'then iterate'],
];

const TOOLKIT = [
  ['Backend', [['nodedotjs', 'Node.js'], ['express', 'Express'], ['python', 'Python'], ['fastapi', 'FastAPI'], ['flask', 'Flask']]],
  ['Applied AI', [['langchain', 'LangChain · LangGraph'], ['modelcontextprotocol', 'Model Context Protocol'], ['ollama', 'Ollama'], ['anthropic', 'Anthropic API'], ['googlegemini', 'Gemini API']]],
  ['Data', [['postgresql', 'PostgreSQL'], ['redis', 'Redis'], ['mongodb', 'MongoDB'], ['sqlite', 'SQLite'], ['pandas', 'pandas · NumPy']]],
  ['Delivery', [['docker', 'Docker'], ['gitlab', 'GitLab CI/CD'], ['linux', 'Linux · VPS'], ['puppeteer', 'Puppeteer'], ['react', 'React']]],
];

// ═════════════════════════ components ═════════════════════════
function wrap(text, max) {
  const lines = [''];
  for (const w of text.split(' ')) (lines.at(-1) + ' ' + w).trim().length > max ? lines.push(w) : (lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim());
  return lines;
}

function hero(T) {
  const H = 440;
  const d = doc(W, H, 'Adhrit Verma — software engineer building backend systems and applied AI. Bengaluru, India.', T);
  // topographic field, peaked at a "Bengaluru" marker
  const step = 6, x0 = 440, cols = Math.ceil((W - x0) / step) + 1, rows = Math.ceil(H / step) + 1;
  const n = noise2D('adhrit-verma'), mx = 760, my = 210, field = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * step, y = j * step, dist = Math.hypot(x - mx, (y - my) * 1.15);
    field[j * cols + i] = n(x / 230, y / 230, 4) * 1.1 + Math.exp(-(dist * dist) / 26000) * 0.95;
  }
  const levels = Array.from({ length: 18 }, (_, k) => -0.45 + k * 0.08);
  const iso = contours(field, cols, rows, step, levels);
  let art = '';
  iso.forEach(({ lines }, k) => {
    if (!lines.length) return;
    const isAccent = k === 12;
    art += `<path class="draw" pathLength="1" d="${polyPath(lines, x0, 0)}" fill="none" stroke="${isAccent ? T.accent : T.fg}" stroke-opacity="${isAccent ? 1 : (0.16 + (k % 4 === 0 ? 0.2 : 0)).toFixed(2)}" stroke-width="${isAccent ? 1.4 : k % 4 === 0 ? 1.1 : 0.8}" style="animation-delay:${(k * 0.07).toFixed(2)}s"/>`;
  });
  d.add(`<defs><linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".28" stop-color="#fff"/></linearGradient><mask id="m"><rect x="${x0}" width="${W - x0}" height="${H}" fill="url(#fadeL)"/></mask></defs>`);
  d.add(`<g mask="url(#m)">${art}</g>`);
  // marker
  d.add(`<g class="fade" style="animation-delay:2.4s"><circle class="fx ping" cx="${mx}" cy="${my}" r="9" fill="none" stroke="${T.accent}"/><circle cx="${mx}" cy="${my}" r="3.5" fill="${T.accent}"/><path d="M${mx + 8} ${my - 8}l22 -22h54" fill="none" stroke="${T.fg}" stroke-width=".8"/></g>`);
  d.add(`<rect class="fade" x="${mx + 30}" y="${my - 49}" width="104" height="18" fill="${T.bg}" style="animation-delay:2.6s"/>`);
  d.text(mx + 34, my - 36, '12.97°N 77.59°E', { face: 'm4', size: 10.5, fill: T.muted, cls: 'fade', style: 'animation-delay:2.6s' });
  // type
  d.text(40, 66, 'SOFTWARE ENGINEER', { face: 'm4', size: 11.5, fill: T.muted, ls: 2.2, cls: 'rise' });
  d.add(`<rect class="growX" x="40" y="84" width="36" height="2" fill="${T.accent}" style="animation-delay:.3s"/>`);
  d.text(36, 182, 'Adhrit', { face: 'd8', size: 104, ls: -3, cls: 'rise', style: 'animation-delay:.15s' });
  d.text(36, 280, 'Verma', { face: 'd8', size: 104, ls: -3, cls: 'rise', style: 'animation-delay:.3s' });
  d.text(40, 332, 'Backend systems, applied AI, and the occasional', { face: 'b4', size: 19, fill: T.muted, cls: 'rise', style: 'animation-delay:.5s' });
  d.text(40, 358, 'strange experiment. Built to actually be used.', { face: 'b4', size: 19, fill: T.muted, cls: 'rise', style: 'animation-delay:.55s' });
  const meta = [['BASED IN', 'Bengaluru, IN'], ['FOCUS', 'Backend · GenAI'], ['IN AI SINCE', '2018']];
  meta.forEach(([k, v], i) => {
    const x = 40 + i * 150;
    d.add(`<path class="fade" d="M${x} 386v34" stroke="${T.border}" style="animation-delay:${0.8 + i * 0.1}s"/>`);
    d.text(x + 12, 398, k, { face: 'm4', size: 9.5, fill: T.muted, ls: 1.4, cls: 'fade', style: `animation-delay:${0.8 + i * 0.1}s` });
    d.text(x + 12, 416, v, { face: 'b5', size: 13.5, cls: 'fade', style: `animation-delay:${0.85 + i * 0.1}s` });
  });
  d.css(`.ping{animation:ping 3s ease-out 2.6s infinite}@keyframes ping{from{transform:scale(.6);opacity:1}to{transform:scale(2.6);opacity:0}}`);
  return d;
}

function section(T, num, title, note) {
  const d = doc(W, 96, `${num} — ${title}`, T);
  d.text(0, 58, num, { face: 'm4', size: 13, fill: T.accent, cls: 'rise' });
  d.text(40, 62, title, { face: 'd6', size: 34, cls: 'rise', style: 'animation-delay:.08s' });
  if (note) d.text(W, 58, note, { face: 'm4', size: 11, fill: T.muted, anchor: 'end', ls: 1, cls: 'fade', style: 'animation-delay:.3s' });
  d.add(`<rect class="growX" x="0" y="84" width="${W}" height="1" fill="${T.border}"/>`);
  return d;
}

function projectRow(T, p, index) {
  const H = 184;
  const d = doc(W, H, `${p.name}. ${p.meta}. ${p.desc}`, T);
  const r = rng(p.slug);
  d.text(0, 44, String(index).padStart(2, '0'), { face: 'm4', size: 12, fill: T.muted });
  // vignette
  d.add(`<defs><clipPath id="c"><rect width="${THUMB.w}" height="${THUMB.h}" rx="6"/></clipPath></defs>
<g transform="translate(40 28)"><rect width="${THUMB.w}" height="${THUMB.h}" rx="6" fill="${T.bgMuted}"/><g clip-path="url(#c)">${vignettes[p.art](T, r)}</g><rect x=".5" y=".5" width="${THUMB.w - 1}" height="${THUMB.h - 1}" rx="6" fill="none" stroke="${T.border}"/></g>`);
  d.css(VIGNETTE_CSS, VIGNETTE_REDUCED).use('m4', 'PATDELBOMBLR');
  // text
  const X = 276;
  d.text(X, 40, p.meta.toUpperCase(), { face: 'm4', size: 10.5, fill: p.repo ? T.muted : T.accent, ls: 1.4, cls: 'fade' });
  d.text(X, 72, p.name, { face: 'd6', size: 26, cls: 'rise', style: 'animation-delay:.05s' });
  wrap(p.desc, 86).slice(0, 3).forEach((l, i) => d.text(X, 102 + i * 21, l, { face: 'b4', size: 14.5, fill: T.muted, cls: 'rise', style: `animation-delay:${0.12 + i * 0.04}s` }));
  d.text(X, 170, p.stack.join('  /  '), { face: 'm4', size: 11, fill: T.fg, opacity: 0.75, cls: 'fade', style: 'animation-delay:.3s' });
  d.add(p.repo ? octicon('arrow-up-right', W - 22, 28, 22, T.fg) : octicon('lock', W - 20, 30, 18, T.muted));
  d.add(`<rect x="0" y="${H - 1}" width="${W}" height="1" fill="${T.border}" fill-opacity=".6"/>`);
  return d;
}

function method(T) {
  const H = 172, y = 58, xs = METHOD.map((_, i) => 100 + i * 200);
  const d = doc(W, H, 'How I work: observe, model, build, augment, ship.', T);
  d.add(`<path d="M100 ${y}H900" stroke="${T.border}"/><rect class="growX" x="100" y="${y - 0.75}" width="800" height="1.5" fill="${T.accent}" style="animation-duration:4s;animation-delay:.2s"/>`);
  d.add(`<path id="mline" d="M100 ${y}H900"/><circle r="3" fill="${T.accent}" class="fade" style="animation-delay:4.2s"><animateMotion dur="7s" begin="4.2s" repeatCount="indefinite"><mpath href="#mline"/></animateMotion></circle>`);
  METHOD.forEach(([t, a, b], i) => {
    const x = xs[i], delay = (0.2 + i * 0.95).toFixed(2);
    d.add(`<circle cx="${x}" cy="${y}" r="8" fill="${T.bg}" stroke="${T.fg}" stroke-width="1.4"/><circle class="fade" cx="${x}" cy="${y}" r="3.5" fill="${T.accent}" style="animation-delay:${delay}s"/>`);
    d.text(x, y - 22, `0${i + 1}`, { face: 'm4', size: 10.5, fill: T.muted, anchor: 'middle' });
    d.text(x, y + 46, t, { face: 'd6', size: 19, anchor: 'middle', cls: 'rise', style: `animation-delay:${delay}s` });
    d.text(x, y + 72, a, { face: 'b4', size: 13.5, fill: T.muted, anchor: 'middle', cls: 'rise', style: `animation-delay:${delay}s` });
    d.text(x, y + 90, b, { face: 'b4', size: 13.5, fill: T.muted, anchor: 'middle', cls: 'rise', style: `animation-delay:${delay}s` });
  });
  return d;
}

function toolkit(T) {
  const H = 262, colW = 250;
  const d = doc(W, H, 'Toolkit. ' + TOOLKIT.map(([g, items]) => `${g}: ${items.map((i) => i[1]).join(', ')}`).join('. '), T);
  TOOLKIT.forEach(([group, items], c) => {
    const x = c * colW;
    d.text(x, 22, group.toUpperCase(), { face: 'm4', size: 10.5, fill: T.muted, ls: 1.6 });
    d.add(`<rect class="growX" x="${x}" y="36" width="${colW - 30}" height="1" fill="${T.border}" style="animation-delay:${c * 0.1}s"/>`);
    items.forEach(([slug, label], i) => {
      const y = 70 + i * 40, delay = (0.2 + c * 0.1 + i * 0.07).toFixed(2);
      d.add(`<g class="rise" style="animation-delay:${delay}s">${brandIcon(slug, x, y - 15, 18, T.fg)}</g>`);
      d.text(x + 30, y, label, { face: 'b4', size: 15, cls: 'rise', style: `animation-delay:${delay}s` });
    });
  });
  return d;
}

function activity(T, s) {
  const H = 372, left = 64, right = 660, ridgeGap = 22, amp = 64, top = 96;
  const d = doc(W, H, `Activity: ${s.total} contributions in the last year across ${s.repos} public repositories.`, T);
  // group days into the last 12 calendar months
  const months = [];
  for (const day of s.days) {
    const key = day.date.slice(0, 7);
    if (!months.length || months.at(-1).key !== key) months.push({ key, days: [] });
    months.at(-1).days.push(day.count);
  }
  const last = months.slice(-12);
  const max = Math.max(1, ...s.days.map((x) => x.count));
  const busiest = last.reduce((b, m, i) => (m.days.reduce((a, v) => a + v, 0) > last[b].days.reduce((a, v) => a + v, 0) ? i : b), 0);
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  last.forEach((m, i) => {
    const base = top + i * ridgeGap, n = m.days.length;
    const sm = m.days.map((_, k) => { const w = [m.days[k - 1] ?? 0, m.days[k], m.days[k + 1] ?? 0]; return (w[0] + 2 * w[1] + w[2]) / 4; });
    const pts = [[left, base]];
    sm.forEach((v, k) => { const t = (k + 0.5) / n; pts.push([left + 24 + t * (right - left - 48), base - Math.sqrt(v / max) * amp * Math.pow(Math.sin(Math.PI * t), 0.6)]); });
    pts.push([right, base]);
    const line = smooth(pts), acc = i === busiest, delay = (0.1 + i * 0.12).toFixed(2);
    d.add(`<path d="${line}L${right} ${base + 2}L${left} ${base + 2}Z" fill="${T.bg}"/>`);
    d.add(`<path class="draw" pathLength="1" d="${line}" fill="none" stroke="${acc ? T.accent : T.fg}" stroke-opacity="${acc ? 1 : 0.8}" stroke-width="${acc ? 1.6 : 1.1}" style="animation-delay:${delay}s"/>`);
    d.text(0, base + 3, MON[Number(m.key.slice(5)) - 1] + ' ' + m.key.slice(2, 4), { face: 'm4', size: 9.5, fill: acc ? T.accent : T.muted, ls: 0.6 });
  });
  // figures
  const fx = 720;
  const fig = (y, big, label, delay) => {
    d.text(fx, y, String(big), { face: 'd8', size: 46, ls: -1.5, cls: 'rise', style: `animation-delay:${delay}s` });
    d.text(fx, y + 22, label, { face: 'm4', size: 10.5, fill: T.muted, ls: 1.2, cls: 'fade', style: `animation-delay:${delay + 0.2}s` });
  };
  fig(92, s.total.toLocaleString('en-US'), 'CONTRIBUTIONS · LAST 12 MONTHS', 0.3);
  fig(182, s.repos, 'PUBLIC REPOSITORIES', 0.45);
  d.text(fx, 262, s.languages.slice(0, 3).join(' · ') || '—', { face: 'b5', size: 17, cls: 'rise', style: 'animation-delay:.6s' });
  d.text(fx, 284, 'MOST-USED LANGUAGES', { face: 'm4', size: 10.5, fill: T.muted, ls: 1.2, cls: 'fade', style: 'animation-delay:.8s' });
  d.add(`<rect x="${fx}" y="318" width="10" height="2" fill="${T.accent}"/>`);
  d.text(fx + 18, 322, `Busiest month highlighted`, { face: 'b4', size: 12.5, fill: T.muted });
  d.text(fx, 350, s.live ? `UPDATED ${new Date().toISOString().slice(0, 10)}` : 'SAMPLE DATA · UNTIL FIRST ACTION RUN', { face: 'm4', size: 9.5, fill: s.live ? T.muted : T.accent, ls: 1 });
  return d;
}

function colophon(T) {
  const d = doc(W, 130, 'Colophon: set in Hubot Sans, Mona Sans and Monaspace Neon; colours from Primer Primitives; icons from Octicons and Simple Icons; generated by scripts/generate.mjs.', T);
  d.add(`<rect x="0" y="0" width="${W}" height="1" fill="${T.border}"/>`);
  d.text(0, 62, '“I don’t just collect tech stacks —', { face: 'd6', size: 24, cls: 'rise' });
  d.text(0, 94, 'I build things until they work.”', { face: 'd6', size: 24, cls: 'rise', style: 'animation-delay:.08s' });
  const lines = ['COLOPHON', 'Hubot Sans, Mona Sans & Monaspace Neon', 'Colour tokens: Primer Primitives', 'Icons: Octicons & Simple Icons', 'Rendered by scripts/generate.mjs'];
  lines.forEach((l, i) => d.text(W, 44 + i * 20, l, { face: i ? 'b4' : 'm4', size: i ? 12.5 : 10, fill: T.muted, anchor: 'end', ls: i ? 0 : 1.6 }));
  return d;
}

// ═════════════════════════ data ═════════════════════════
async function loadStats() {
  const sample = () => {
    const n = noise2D('sample-activity'), days = [], now = new Date();
    for (let i = 364; i >= 0; i--) {
      const dt = new Date(now); dt.setUTCDate(now.getUTCDate() - i);
      days.push({ date: dt.toISOString().slice(0, 10), count: Math.max(0, Math.round((n(i / 18, 0.5, 3) + 0.25) * 9 + (dt.getUTCDay() % 6 ? 1 : -2))) });
    }
    return { days, total: days.reduce((a, x) => a + x.count, 0), repos: 22, languages: ['Python', 'JavaScript'], live: false };
  };
  if (process.env.OFFLINE || !TOKEN) {
    if (!process.env.OFFLINE) console.warn('  ! GITHUB_TOKEN not set, using sample activity data');
    return sample();
  }
  try {
    const q = `query($login:String!){user(login:$login){
      repositories(ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC,first:100){totalCount nodes{primaryLanguage{name}}}
      contributionsCollection{contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}}}}`;
    const res = await fetch('https://api.github.com/graphql', {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', 'User-Agent': USER },
      body: JSON.stringify({ query: q, variables: { login: USER } }),
    });
    const u = (await res.json()).data.user;
    const tally = {};
    for (const r of u.repositories.nodes) if (r.primaryLanguage) tally[r.primaryLanguage.name] = (tally[r.primaryLanguage.name] || 0) + 1;
    const cal = u.contributionsCollection.contributionCalendar;
    return {
      days: cal.weeks.flatMap((w) => w.contributionDays.map((x) => ({ date: x.date, count: x.contributionCount }))),
      total: cal.totalContributions, repos: u.repositories.totalCount,
      languages: Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([l]) => l), live: true,
    };
  } catch (e) {
    console.warn('  ! GitHub API unavailable, using sample data:', e.message);
    return sample();
  }
}

// ═════════════════════════ build ═════════════════════════
const stats = await loadStats();
const jobs = [
  ['hero', (T) => hero(T)],
  ['section-production', (T) => section(T, '01', 'In production', 'CLOSED-SOURCE · REAL USERS')],
  ['section-open', (T) => section(T, '02', 'Open source & experiments', 'SELECTED')],
  ['section-method', (T) => section(T, '03', 'How I work')],
  ['section-toolkit', (T) => section(T, '04', 'Toolkit')],
  ['section-activity', (T) => section(T, '05', 'Activity', 'LAST 12 MONTHS')],
  ...PROJECTS.production.map((p, i) => [`project-${p.slug}`, (T) => projectRow(T, p, i + 1)]),
  ...PROJECTS.open.map((p, i) => [`project-${p.slug}`, (T) => projectRow(T, p, i + 1)]),
  ['method', (T) => method(T)],
  ['toolkit', (T) => toolkit(T)],
  ['activity', (T) => activity(T, stats)],
  ['colophon', (T) => colophon(T)],
];
console.log(`Rendering ${jobs.length * THEMES.length} SVGs for ${USER}…`);
let bytes = 0;
for (const [name, build] of jobs) for (const T of THEMES) {
  const svg = await build(T).render();
  bytes += svg.length;
  writeFileSync(new URL(`${name}-${T.name}.svg`, OUT), svg);
}
console.log(`Done: ${(bytes / 1024).toFixed(0)} KB total.`);
export { PROJECTS };
