#!/usr/bin/env node
/**
 * Profile SVG generator — zero dependencies, Node 18+.
 * Builds every animated SVG used by README.md into ./assets.
 *
 *   node scripts/generate.mjs              # pulls live stats from the GitHub API
 *   OFFLINE=1 node scripts/generate.mjs    # uses fallback stats (no network)
 *
 * GitHub strips <script> from READMEs, so all motion here is CSS keyframes
 * (plus a little SMIL for motion along paths). Every SVG honours
 * prefers-reduced-motion and ships a <title> for screen readers.
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const USER = process.env.GH_USER || 'Adhrit-Verma';
const TOKEN = process.env.GITHUB_TOKEN;
const OUT = new URL('../assets/', import.meta.url);
mkdirSync(OUT, { recursive: true });

// ───────────────────────── theme ─────────────────────────
const C = {
  bg: '#0D1117', panel: '#161B22', panel2: '#1C2330', line: '#30363D',
  text: '#E6EDF3', soft: '#C9D1D9', dim: '#8B949E',
  cyan: '#00E7FF', violet: '#A371F7', blue: '#4F8EDB', green: '#3FB950', amber: '#F0B72F', pink: '#FF7B72',
};
const SANS = "'Segoe UI',Ubuntu,'Helvetica Neue',Arial,sans-serif";
const MONO = "'JetBrains Mono','SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#F1E05A', TypeScript: '#3178C6', HTML: '#E34C26', CSS: '#563D7C',
  'C++': '#F34B7D', Java: '#B07219', 'C#': '#178600', Shell: '#89E051', 'Jupyter Notebook': '#DA5B0B',
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const mono = (n) => n * 8.6; // approx width of n monospace chars at 14px

const svg = (w, h, title, body, css = '', reduced = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title">
<title id="title">${esc(title)}</title>
<style>
text{font-family:${SANS}}.m{font-family:${MONO}}
@keyframes fadeIn{to{opacity:1}}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pulse{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}
@keyframes flow{to{stroke-dashoffset:-24}}
@keyframes orbit{to{stroke-dashoffset:-100}}
.fx{transform-box:fill-box;transform-origin:center}
.gx{transform-box:fill-box;transform-origin:left center}
${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}${reduced}}
</style>
${body}
</svg>`;

const frame = (w, h, r = 16) => `
<defs><linearGradient id="edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient></defs>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="${C.bg}" stroke="${C.line}"/>
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" fill="none" stroke="url(#edge)" stroke-width="2" pathLength="100" stroke-dasharray="14 86" style="animation:orbit 8s linear infinite"/>`;

const write = (name, content) => { writeFileSync(new URL(name, OUT), content); console.log('  ✓ assets/' + name); };

// ───────────────────────── content (edit me) ─────────────────────────
const ROLES = [
  'backend systems that don’t flinch',
  'AI agents with guardrails',
  'automation that kills busywork',
  'weird experiments (see: GDC)',
];

const TERMINAL = [
  { cmd: 'whoami', out: [['adhrit verma', C.cyan], [' — software engineer · backend + genai · bengaluru', C.soft]] },
  { cmd: 'cat focus.txt', out: [['backend systems · rag pipelines · multi-agent workflows · automation', C.soft]] },
  { cmd: 'ls ~/shipped', out: [['contrast/  clauseguard/  tablefox/  gdc/  hrm-platform/  aviatrack/', C.blue]] },
  { cmd: 'uptime', out: [['learning AI since class 11 (2018) · ~3 yrs shipping production code', C.soft]] },
  { cmd: 'echo $MOTTO', out: [['"I don’t just collect tech stacks — I build things until they work."', C.amber]] },
];

export const PROJECTS = [
  { name: 'Contrast', tag: 'AI · A11Y', color: C.cyan, lang: 'JavaScript', repo: 'Contrast',
    desc: 'AI-assisted accessibility auditor. A 7-phase LangGraph pipeline crawls, scans (axe-core, Lighthouse, a11y tree), AI-assesses, generates fixes and re-verifies them in a fresh browser. 72 tests + W3C ACT accuracy scoring.',
    chips: ['Node.js', 'Puppeteer', 'LangGraph', 'axe-core', 'SQLite'] },
  { name: 'ClauseGuard', tag: 'MULTI-AGENT', color: C.violet, lang: 'Python', repo: 'ClauseGuard',
    desc: 'Upload a contract PDF, get a structured risk report. Extractor → Risk Analyzer → Summarizer agents, hybrid BM25 + embedding retrieval via rank fusion, runs on local Ollama or the Anthropic API.',
    chips: ['FastAPI', 'LangGraph', 'Pydantic', 'Ollama', 'pytest'] },
  { name: 'TableFox', tag: 'EXPERIMENTAL', color: C.amber, lang: 'Python', repo: 'TableFox',
    desc: 'Local-first PostgreSQL schema intelligence for AI agents: a searchable schema graph plus guarded read-only SQL exposed as MCP tools, so agents spend fewer tokens figuring out your database.',
    chips: ['FastAPI', 'Next.js', 'MCP', 'PostgreSQL'] },
  { name: 'Self-Extending AI', tag: 'AGENTS', color: C.green, lang: 'Python', repo: 'two-agent-self-extending-ai-system',
    desc: 'A UserAgent serves requests from an approved skill registry; when it hits a gap, a BuilderAgent writes a new skill package that is sandbox-validated and approved before it can ever run.',
    chips: ['Python', 'FastAPI', 'Sandboxing', 'Agents'] },
  { name: 'GDC', tag: 'RESEARCH', color: C.pink, lang: 'Python', repo: 'GDC',
    desc: 'Gradient Dense Code: keeps a scannable QR carrier but hides an extra payload in calibrated RGB gradients. Reed–Solomon, CRC32, interleaving, compression and camera decoding.',
    chips: ['Python', 'OpenCV', 'Error correction', 'Encoding'] },
  { name: 'AuDix', tag: 'REAL-TIME', color: C.blue, lang: 'JavaScript', repo: 'AuDix_User',
    desc: 'Local-intranet audio broadcasting: one host goes live and everyone on the network listens in real time — no internet, no accounts, just the LAN.',
    chips: ['JavaScript', 'Node.js', 'Real-time audio', 'LAN'] },
  { name: 'AviaTrack', tag: 'PRODUCTION', color: C.cyan, private: true,
    desc: 'Airline crew & ops platform: flight planning, PIC/SIC allocation, duty-time / FDP maths, DGCA-style feasibility checks, multi-leg execution and reports. Built 70%+ of the core workflows.',
    chips: ['Node.js', 'PostgreSQL', 'RBAC', 'CI/CD'] },
  { name: 'HRM Platform', tag: 'PRODUCTION', color: C.green, private: true,
    desc: 'End-to-end HR suite: attendance, leave, salary/CTC & slips, appraisals, onboarding, training, documents and device tracking — with RBAC, audit logs, secure sessions and approval flows.',
    chips: ['Node.js', 'Express', 'PostgreSQL', 'Audit logs'] },
];

// Levels are self-assessed (1–5). Tweak freely.
const SKILLS = [
  { branch: 'BACKEND', color: C.cyan, items: [['Node.js / Express', 5], ['REST APIs & auth', 5], ['Python (Flask/FastAPI)', 4], ['RBAC & audit logging', 4], ['System design', 3]] },
  { branch: 'AI & AGENTS', color: C.violet, items: [['LLM integration', 4], ['RAG & retrieval', 4], ['LangGraph multi-agent', 4], ['Structured outputs', 4], ['Neural nets (learning)', 2]] },
  { branch: 'DATA', color: C.blue, items: [['PostgreSQL', 5], ['Query optimisation', 4], ['SQLite / MongoDB', 4], ['Pandas / NumPy', 4], ['Redis', 3]] },
  { branch: 'SHIP & OPS', color: C.green, items: [['Linux / VPS deploys', 4], ['GitLab CI/CD', 4], ['Puppeteer automation', 4], ['Docker', 3], ['React + Figma UI', 3]] },
];

const QUESTS = [
  ['MAIN', 'Build stronger backend systems', 0.75, C.green],
  ['MAIN', 'Improve AI agent workflows', 0.65, C.green],
  ['MAIN', 'Ship more public projects', 0.55, C.green],
  ['SIDE', 'Get better at DSA without losing my mind', 0.4, C.amber],
  ['SIDE', 'Turn side projects into career leverage', 0.45, C.amber],
  ['BOSS', 'Stop overthinking and push more code', 0.2, C.pink],
];

// ───────────────────────── hero ─────────────────────────
function hero() {
  const W = 1000, H = 320;
  const nodes = {
    api: [790, 160, 'API', C.cyan], pg: [680, 78, 'PostgreSQL', C.blue], redis: [668, 248, 'Redis', C.pink],
    llm: [895, 72, 'LLM', C.violet], rag: [930, 172, 'RAG', C.violet], agents: [870, 262, 'Agents', C.green],
  };
  const edges = [['api', 'pg'], ['api', 'redis'], ['api', 'llm'], ['api', 'rag'], ['api', 'agents'], ['llm', 'rag'], ['rag', 'agents'], ['pg', 'redis']];
  const edgeSvg = edges.map(([a, b], i) => {
    const [x1, y1] = nodes[a], [x2, y2] = nodes[b];
    return `<path id="e${i}" d="M${x1},${y1} L${x2},${y2}" stroke="${C.line}" stroke-width="1.5"/>
<path d="M${x1},${y1} L${x2},${y2}" stroke="${nodes[b][3]}" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="3 9" style="animation:flow ${1.2 + (i % 3) * 0.4}s linear infinite"/>
<circle r="3" fill="${nodes[b][3]}"><animateMotion dur="${2.2 + (i % 4) * 0.5}s" begin="${i * 0.35}s" repeatCount="indefinite"><mpath href="#e${i}"/></animateMotion></circle>`;
  }).join('');
  const nodeSvg = Object.values(nodes).map(([x, y, label, col], i) => {
    const r = label === 'API' ? 26 : 16;
    return `<circle class="fx" cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${col}" style="animation:pulse 2.6s ease-out ${i * 0.4}s infinite"/>
<circle cx="${x}" cy="${y}" r="${r}" fill="${C.panel}" stroke="${col}" stroke-width="2"/>
<text class="m" x="${x}" y="${label === 'API' ? y + 5 : y + r + 16}" text-anchor="middle" font-size="${label === 'API' ? 13 : 11}" font-weight="${label === 'API' ? 700 : 400}" fill="${label === 'API' ? col : C.dim}">${label}</text>`;
  }).join('');
  const roles = ROLES.map((r, i) => `<text class="m role r${i}" x="86" y="232" font-size="18" fill="${C.text}" style="animation-delay:${i * 4}s">${esc(r)}</text>`).join('');
  const bootCmd = './boot --profile adhrit';

  const css = `
.role{opacity:0;animation:role ${ROLES.length * 4}s infinite}
@keyframes role{0%{opacity:0;transform:translateY(10px)}3%{opacity:1;transform:none}22%{opacity:1;transform:none}25%{opacity:0;transform:translateY(-10px)}100%{opacity:0}}
.cover{animation:reveal 1.1s steps(${bootCmd.length}) .3s forwards}
@keyframes reveal{to{transform:scaleX(0)}}
.cov{transform-box:fill-box;transform-origin:right center}
.scan{animation:scan 7s linear infinite}@keyframes scan{from{transform:translateY(0)}to{transform:translateY(${H}px)}}
.caret{animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
.up{opacity:0;animation:fadeIn .8s ease 1.4s forwards}`;
  const reduced = `.role{opacity:0}.r0{opacity:1}.cover{display:none}.up{opacity:1}`;

  const body = `${frame(W, H, 18)}
<defs>
<pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${C.line}"/></pattern>
<linearGradient id="nameG" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="560" y2="0" spreadMethod="repeat">
<stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.cyan}"/>
<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="500 0" dur="6s" repeatCount="indefinite"/>
</linearGradient>
<linearGradient id="scanG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}" stop-opacity="0"/><stop offset="1" stop-color="${C.cyan}" stop-opacity=".12"/></linearGradient>
</defs>
<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="17" fill="url(#dots)" opacity=".55"/>
<rect class="scan" x="2" y="-60" width="${W - 4}" height="60" opacity=".6" fill="url(#scanG)"/>
<g fill="none">${edgeSvg}</g>${nodeSvg}
<text class="m" x="60" y="70" font-size="14" fill="${C.green}">$ <tspan fill="${C.cyan}">${bootCmd}</tspan></text>
<rect class="cover cov" x="76" y="54" width="${mono(bootCmd.length) + 14}" height="22" fill="${C.bg}"/>
<text x="58" y="140" font-size="60" font-weight="800" fill="url(#nameG)" letter-spacing="-1">Adhrit Verma</text>
<g class="up">
<text x="60" y="180" font-size="18" fill="${C.soft}">Software Engineer · Backend + GenAI · Bengaluru, India</text>
<text class="m" x="60" y="232" font-size="18" fill="${C.cyan}">&gt;</text>
${roles}
<rect class="caret" x="60" y="258" width="10" height="3" fill="${C.cyan}"/>
<text class="m" x="60" y="290" font-size="12" fill="${C.dim}">Node.js · Python · PostgreSQL · LangGraph · RAG · automation</text>
</g>`;
  return svg(W, H, 'Adhrit Verma — Software Engineer, Backend + GenAI', body, css, reduced);
}

// ───────────────────────── terminal ─────────────────────────
function terminal() {
  const W = 1000, LH = 30, top = 78;
  const H = top + TERMINAL.length * LH * 2 + 44;
  let t = 0.5, y = top, body = '', css = '';
  TERMINAL.forEach((l, i) => {
    const dur = Math.max(0.35, l.cmd.length * 0.06);
    body += `<text class="m" x="36" y="${y}" font-size="15" fill="${C.green}">❯ <tspan fill="${C.text}">${esc(l.cmd)}</tspan></text>
<rect class="cov" x="56" y="${y - 17}" width="${mono(l.cmd.length) + 16}" height="24" fill="${C.panel}" style="animation:reveal ${dur}s steps(${l.cmd.length}) ${t}s forwards"/>`;
    t += dur + 0.2;
    y += LH;
    body += `<text class="m o" x="56" y="${y}" font-size="14" style="animation-delay:${t.toFixed(2)}s">${l.out.map(([s, c]) => `<tspan fill="${c}">${esc(s)}</tspan>`).join('')}</text>`;
    t += 0.55;
    y += LH;
  });
  body += `<text class="m o" x="36" y="${y}" font-size="15" fill="${C.green}" style="animation-delay:${t.toFixed(2)}s">❯</text>
<rect x="58" y="${y - 14}" width="9" height="18" fill="${C.cyan}" style="opacity:0;animation:blink 1s steps(1) ${t.toFixed(2)}s infinite"/>`;
  css = `.cov{transform-box:fill-box;transform-origin:right center}
@keyframes reveal{to{transform:scaleX(0)}}
.o{opacity:0;animation:fadeIn .25s ease forwards}
@keyframes blink{0%{opacity:1}50%{opacity:0}}`;
  const frameBody = `${frame(W, H, 14)}
<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="13" fill="${C.panel}"/>
<path d="M2,44 H${W - 2}" stroke="${C.line}"/>
<circle cx="28" cy="23" r="6" fill="#FF5F57"/><circle cx="48" cy="23" r="6" fill="#FEBC2E"/><circle cx="68" cy="23" r="6" fill="#28C840"/>
<text class="m" x="${W / 2}" y="28" font-size="13" fill="${C.dim}" text-anchor="middle">adhrit@omen: ~</text>
${body}`;
  return svg(W, H, 'Terminal: whoami — Adhrit Verma, backend + GenAI engineer', frameBody, css, '.cov{display:none}.o{opacity:1}');
}

// ───────────────────────── pipeline ─────────────────────────
function pipeline() {
  const W = 1000, H = 250, Y = 118;
  const steps = [
    ['Real workflow', 'a messy manual process', C.amber],
    ['API layer', 'Express · FastAPI · auth', C.cyan],
    ['Data', 'PostgreSQL · Redis · SQL', C.blue],
    ['AI layer', 'RAG · LangGraph · agents', C.violet],
    ['Shipped', 'dashboards · CI/CD', C.green],
  ];
  const boxes = steps.map(([t, s, c], i) => {
    const cx = 100 + i * 200;
    return `<rect class="bx" x="${cx - 82}" y="${Y - 38}" width="164" height="76" rx="12" fill="${C.panel}" stroke="${c}" stroke-width="1.6" style="animation-delay:${i * 0.9}s"/>
<text x="${cx}" y="${Y - 4}" text-anchor="middle" font-size="16" font-weight="700" fill="${C.text}">${t}</text>
<text class="m" x="${cx}" y="${Y + 18}" text-anchor="middle" font-size="10.5" fill="${C.dim}">${esc(s)}</text>`;
  }).join('');
  const packets = [C.cyan, C.violet, C.green, C.amber].map((c, i) =>
    `<circle r="4" fill="${c}"><animateMotion dur="4.5s" begin="${i * 1.125}s" repeatCount="indefinite"><mpath href="#main"/></animateMotion></circle>`).join('');
  const body = `${frame(W, H, 16)}
<text class="m" x="30" y="38" font-size="12" letter-spacing="3" fill="${C.cyan}">HOW I BUILD</text>
<text class="m" x="${W - 30}" y="38" font-size="12" fill="${C.dim}" text-anchor="end">workflow → api → data → ai → shipped</text>
<path id="main" d="M18,${Y} H${W - 18}" stroke="${C.line}" stroke-width="2" fill="none"/>
<path d="M18,${Y} H${W - 18}" stroke="${C.cyan}" stroke-opacity=".5" stroke-width="2" stroke-dasharray="4 8" fill="none" style="animation:flow 1s linear infinite"/>
<path id="back" d="M900,${Y + 38} C900,${Y + 118} 100,${Y + 118} 100,${Y + 38}" stroke="${C.dim}" stroke-opacity=".6" stroke-dasharray="3 7" fill="none" style="animation:flow 1.6s linear infinite reverse"/>
<circle r="3.5" fill="${C.amber}"><animateMotion dur="5s" repeatCount="indefinite"><mpath href="#back"/></animateMotion></circle>
${packets}${boxes}
<text class="m" x="${W / 2}" y="${Y + 112}" text-anchor="middle" font-size="11" fill="${C.dim}">↺ measure, get feedback, iterate</text>`;
  const css = `.bx{animation:glow 4.5s ease-in-out infinite}@keyframes glow{0%,100%{stroke-opacity:.35}12%{stroke-opacity:1}}`;
  return svg(W, H, 'How I build: real workflow to API layer to data to AI layer to shipped product, with a feedback loop', body, css);
}

// ───────────────────────── project cards ─────────────────────────
function wrap(text, max) {
  const lines = [''];
  for (const w of text.split(' ')) {
    if ((lines.at(-1) + ' ' + w).trim().length > max) lines.push(w);
    else lines[lines.length - 1] = (lines.at(-1) + ' ' + w).trim();
  }
  return lines;
}
function card(p) {
  const W = 480, H = 228;
  const lines = wrap(p.desc, 66).slice(0, 4);
  const tagW = p.tag.length * 7.4 + 22;
  let cx = 24;
  const chips = p.chips.map((c) => {
    const w = c.length * 7 + 20, x = cx; cx += w + 8;
    return `<rect x="${x}" y="${H - 44}" width="${w}" height="24" rx="12" fill="${C.panel2}" stroke="${C.line}"/>
<text class="m" x="${x + w / 2}" y="${H - 28}" font-size="11" text-anchor="middle" fill="${C.soft}">${esc(c)}</text>`;
  }).join('');
  const meta = p.private
    ? `<tspan fill="${C.amber}">■</tspan> private · production system`
    : `<tspan fill="${LANG_COLORS[p.lang] || C.dim}">●</tspan> ${p.lang} · ${(USER + '/' + p.repo).slice(0, 54)}`;
  const body = `${frame(W, H, 14).replace(/url\(#edge\)/g, p.color).replace('<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="14" fill="' + C.bg + '"', '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="14" fill="' + C.panel + '"')}
<circle class="fx" cx="32" cy="40" r="6" fill="none" stroke="${p.color}" style="animation:pulse 2s ease-out infinite"/>
<circle cx="32" cy="40" r="6" fill="${p.color}"/>
<text x="48" y="47" font-size="22" font-weight="700" fill="${C.text}">${esc(p.name)}</text>
<rect x="${W - 24 - tagW}" y="26" width="${tagW}" height="24" rx="6" fill="none" stroke="${p.color}"/>
<text class="m" x="${W - 24 - tagW / 2}" y="42" font-size="11" letter-spacing="1" text-anchor="middle" fill="${p.color}">${esc(p.tag)}</text>
<text class="m" x="24" y="74" font-size="11" fill="${C.dim}">${meta}</text>
${lines.map((l, i) => `<text x="24" y="${104 + i * 21}" font-size="13.5" fill="${C.soft}">${esc(l)}</text>`).join('')}
${chips}`;
  return svg(W, H, `${p.name}: ${p.desc}`, body);
}

// ───────────────────────── skill tree ─────────────────────────
function skillTree() {
  const W = 1000, H = 340, colW = 240;
  let delay = 0.2;
  const cols = SKILLS.map((b, ci) => {
    const x = 24 + ci * colW;
    const rows = b.items.map(([name, lv], ri) => {
      const y = 104 + ri * 46;
      const blocks = Array.from({ length: 5 }, (_, k) => {
        const on = k < lv;
        const d = on ? (delay += 0.05) : 0;
        return `<rect class="${on ? 'b on' : 'b'}" x="${x + k * 42}" y="${y + 9}" width="36" height="8" rx="2" fill="${on ? b.color : C.line}" ${on ? `style="animation-delay:${d.toFixed(2)}s"` : ''}/>`;
      }).join('');
      return `<text x="${x}" y="${y}" font-size="13.5" fill="${C.soft}">${esc(name)}</text>
<text class="m" x="${x + 204}" y="${y}" font-size="11" text-anchor="end" fill="${C.dim}">LV${lv}</text>${blocks}`;
    }).join('');
    return `<circle class="fx" cx="${x + 6}" cy="68" r="5" fill="none" stroke="${b.color}" style="animation:pulse 2.4s ease-out ${ci * 0.5}s infinite"/>
<circle cx="${x + 6}" cy="68" r="5" fill="${b.color}"/>
<text class="m" x="${x + 20}" y="73" font-size="13" font-weight="700" letter-spacing="2" fill="${b.color}">${esc(b.branch)}</text>${rows}`;
  }).join('');
  const body = `${frame(W, H, 16)}
<text class="m" x="24" y="38" font-size="12" letter-spacing="3" fill="${C.cyan}">SKILL TREE</text>
<text class="m" x="${W - 24}" y="38" font-size="11" fill="${C.dim}" text-anchor="end">self-assessed · strongest on the backend</text>
${cols}`;
  const css = `.b.on{opacity:.12;animation:fadeIn .35s ease forwards}`;
  return svg(W, H, 'Skill tree: Backend, AI and agents, Data, Ship and Ops — with self-assessed levels', body, css, '.b.on{opacity:1}');
}

// ───────────────────────── quest log ─────────────────────────
function questLog() {
  const W = 1000, rowH = 38, H = 70 + QUESTS.length * rowH + 10;
  const rows = QUESTS.map(([kind, name, p, col], i) => {
    const y = 78 + i * rowH, barX = 640, barW = 280;
    return `<rect x="24" y="${y - 15}" width="52" height="20" rx="4" fill="none" stroke="${col}"/>
<text class="m" x="50" y="${y - 1}" font-size="10.5" text-anchor="middle" fill="${col}">${kind}</text>
<text x="92" y="${y}" font-size="15" fill="${C.text}">${esc(name)}</text>
<rect x="${barX}" y="${y - 10}" width="${barW}" height="10" rx="5" fill="${C.panel2}"/>
<rect class="gx bar" x="${barX}" y="${y - 10}" width="${barW * p}" height="10" rx="5" fill="${col}" style="animation-delay:${0.2 + i * 0.15}s"/>
<text class="m" x="${W - 24}" y="${y}" font-size="12" text-anchor="end" fill="${C.dim}">${Math.round(p * 100)}%</text>`;
  }).join('');
  const body = `${frame(W, H, 16)}
<text class="m" x="24" y="38" font-size="12" letter-spacing="3" fill="${C.cyan}">QUEST LOG</text>
<text class="m" x="${W - 24}" y="38" font-size="11" fill="${C.dim}" text-anchor="end">current run · no save-scumming</text>
${rows}`;
  return svg(W, H, 'Quest log: ' + QUESTS.map((q) => q[1]).join('; '), body, `.bar{animation:grow 1.4s cubic-bezier(.2,.8,.2,1) both}`);
}

// ───────────────────────── live stats ─────────────────────────
async function gh(path) {
  const r = await fetch('https://api.github.com' + path, {
    headers: { 'User-Agent': USER, Accept: 'application/vnd.github+json', ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
  });
  if (!r.ok) throw new Error(`${path} → HTTP ${r.status}`);
  return r.json();
}
async function loadStats() {
  // Fallback reflects the pinned repos; the first Action run replaces it with live data.
  const fallback = { repos: 22, followers: 5, languages: { Python: 4, JavaScript: 2 }, contributions: null, live: false };
  if (process.env.OFFLINE) return fallback;
  try {
    const [user, repos] = await Promise.all([gh(`/users/${USER}`), gh(`/users/${USER}/repos?per_page=100&type=owner`)]);
    const own = repos.filter((r) => !r.fork);
    const languages = {};
    for (const r of own) if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
    let contributions = null;
    if (TOKEN) {
      try {
        const r = await fetch('https://api.github.com/graphql', {
          method: 'POST',
          headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': USER, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `query{user(login:"${USER}"){contributionsCollection{contributionCalendar{totalContributions}}}}` }),
        });
        contributions = (await r.json()).data?.user?.contributionsCollection?.contributionCalendar?.totalContributions ?? null;
      } catch { /* optional */ }
    }
    return { repos: own.length, followers: user.followers, languages, contributions, live: true };
  } catch (e) {
    console.warn('  ! GitHub API unavailable, using fallback stats:', e.message);
    return fallback;
  }
}
function stats(s) {
  const W = 1000, H = 220;
  const blocks = [
    [s.repos, 'public repos'],
    ...(s.contributions != null ? [[s.contributions, 'contributions (1y)']] : []),
    [Object.keys(s.languages).length, 'languages'],
    [new Date().getFullYear() - 2018, 'years into AI'],
  ].slice(0, 4);
  const blockSvg = blocks.map(([n, label], i) => {
    const x = 30 + i * 130;
    return `<g class="rise" style="animation-delay:${0.15 + i * 0.15}s">
<text x="${x}" y="122" font-size="40" font-weight="800" fill="${C.cyan}">${n}</text>
<text class="m" x="${x}" y="148" font-size="11" fill="${C.dim}">${label}</text></g>`;
  }).join('');
  const langs = Object.entries(s.languages).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const total = langs.reduce((a, [, n]) => a + n, 0) || 1;
  const barX = 580, barW = 390;
  let off = 0;
  const bar = langs.map(([l, n]) => {
    const w = (n / total) * barW, x = barX + off; off += w;
    return `<rect x="${x}" y="84" width="${Math.max(w - 2, 2)}" height="12" fill="${LANG_COLORS[l] || C.dim}"/>`;
  }).join('');
  const legend = langs.map(([l, n], i) => {
    const x = barX + (i % 2) * 195, y = 128 + Math.floor(i / 2) * 24;
    return `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${LANG_COLORS[l] || C.dim}"/>
<text x="${x + 16}" y="${y}" font-size="13" fill="${C.soft}">${esc(l)} <tspan class="m" font-size="11" fill="${C.dim}">${Math.round((n / total) * 100)}%</tspan></text>`;
  }).join('');
  const stamp = new Date().toISOString().slice(0, 10);
  const body = `${frame(W, H, 16)}
<defs><clipPath id="barClip"><rect x="${barX}" y="84" width="${barW}" height="12" rx="6"/></clipPath></defs>
<text class="m" x="30" y="38" font-size="12" letter-spacing="3" fill="${C.cyan}">LIVE STATS</text>
<text class="m" x="${barX}" y="66" font-size="11" letter-spacing="2" fill="${C.dim}">TOP LANGUAGES · BY REPO</text>
${blockSvg}
<g clip-path="url(#barClip)"><g class="gx bar">${bar}</g></g>
${legend}
<text class="m" x="${W - 24}" y="${H - 18}" font-size="10" text-anchor="end" fill="${C.dim}">${s.live ? 'auto-generated' : 'fallback data'} by scripts/generate.mjs · ${stamp}</text>`;
  const css = `.rise{opacity:0;animation:rise .7s ease forwards}@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.bar{animation:grow 1.6s cubic-bezier(.2,.8,.2,1) .3s both}`;
  return svg(W, H, `GitHub stats: ${blocks.map(([n, l]) => `${n} ${l}`).join(', ')}`, body, css, '.rise{opacity:1}');
}

// ───────────────────────── build ─────────────────────────
console.log(`Generating profile SVGs for ${USER}…`);
write('hero.svg', hero());
write('terminal.svg', terminal());
write('pipeline.svg', pipeline());
write('skill-tree.svg', skillTree());
write('quest-log.svg', questLog());
for (const p of PROJECTS) write(`card-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`, card(p));
write('stats.svg', stats(await loadStats()));
console.log('Done.');
