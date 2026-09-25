/**
 * Generative artwork: seeded noise, topographic contours, ridgelines and
 * the small animated vignettes used as project thumbnails.
 */

// ───────── seeded randomness ─────────
export function hash(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
export function rng(seed) {
  let a = typeof seed === 'string' ? hash(seed) : seed;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ───────── 2D gradient noise + fbm ─────────
export function noise2D(seed) {
  const r = rng(seed), p = new Uint8Array(512), g = [];
  const perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  for (let i = 0; i < 256; i++) { const a = r() * Math.PI * 2; g.push([Math.cos(a), Math.sin(a)]); }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (h, x, y) => g[h][0] * x + g[h][1] * y;
  const n = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const l1 = dot(aa, xf, yf) + u * (dot(ba, xf - 1, yf) - dot(aa, xf, yf));
    const l2 = dot(ab, xf, yf - 1) + u * (dot(bb, xf - 1, yf - 1) - dot(ab, xf, yf - 1));
    return l1 + v * (l2 - l1);
  };
  return (x, y, oct = 4) => { let s = 0, a = 1, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); t += a; a *= 0.5; f *= 2; } return s / t; };
}

// ───────── marching squares → joined polylines ─────────
export function contours(field, cols, rows, step, levels) {
  const out = [];
  for (const L of levels) {
    const segs = [];
    const P = (i, j) => field[j * cols + i];
    const lerp = (x1, y1, v1, x2, y2, v2) => { const t = (L - v1) / (v2 - v1); return [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]; };
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const idx = (a > L) | ((b > L) << 1) | ((c > L) << 2) | ((d > L) << 3);
      if (idx === 0 || idx === 15) continue;
      const x = i * step, y = j * step, s = step;
      const top = () => lerp(x, y, a, x + s, y, b), right = () => lerp(x + s, y, b, x + s, y + s, c);
      const bottom = () => lerp(x, y + s, d, x + s, y + s, c), left = () => lerp(x, y, a, x, y + s, d);
      const table = { 1: [[left, top]], 2: [[top, right]], 3: [[left, right]], 4: [[right, bottom]], 5: [[left, top], [right, bottom]], 6: [[top, bottom]], 7: [[left, bottom]], 8: [[bottom, left]], 9: [[bottom, top]], 10: [[top, right], [bottom, left]], 11: [[bottom, right]], 12: [[right, left]], 13: [[right, top]], 14: [[top, left]] };
      for (const [p, q] of table[idx]) segs.push([p(), q()]);
    }
    out.push({ level: L, lines: join(segs) });
  }
  return out;
}
function join(segs) {
  const key = ([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`;
  const ends = new Map();
  segs.forEach((s, i) => { for (const e of [0, 1]) { const k = key(s[e]); if (!ends.has(k)) ends.set(k, []); ends.get(k).push(i); } });
  const used = new Uint8Array(segs.length), lines = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const line = [segs[i][0], segs[i][1]];
    for (const dir of [1, 0]) { // extend forward, then backward
      for (;;) {
        const tip = dir ? line[line.length - 1] : line[0];
        const next = (ends.get(key(tip)) || []).find((k) => !used[k]);
        if (next == null) break;
        used[next] = 1;
        const s = segs[next], pt = key(s[0]) === key(tip) ? s[1] : s[0];
        dir ? line.push(pt) : line.unshift(pt);
      }
    }
    if (line.length > 3) lines.push(line);
  }
  return lines;
}
export function polyPath(lines, ox = 0, oy = 0, minGap = 1.6) {
  return lines.map((pts) => {
    const kept = [pts[0]];
    for (const p of pts.slice(1)) { const q = kept[kept.length - 1]; if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= minGap) kept.push(p); }
    return 'M' + kept.map(([x, y]) => `${(x + ox).toFixed(1)} ${(y + oy).toFixed(1)}`).join('L');
  }).join('');
}

/** Smooth curve through points (Catmull-Rom → cubic Bézier). */
export function smooth(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// ───────── project vignettes (drawn in a W×H box at 0,0) ─────────
export const THUMB = { w: 200, h: 128 };
const { w: TW, h: TH } = THUMB;

export const vignettes = {
  // accessibility scanner: a line sweeps across "text", flagging issues as it passes
  contrast(T, r) {
    let s = '';
    for (let row = 0; row < 7; row++) {
      let x = 18;
      while (x < TW - 30) {
        const w = 10 + r() * 34, y = 18 + row * 14;
        s += `<rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="5" rx="1" fill="${T.fg}" fill-opacity=".22"/>`;
        if (r() < 0.16) s += `<rect x="${x.toFixed(1)}" y="${y + 7}" width="${w.toFixed(1)}" height="1.6" fill="${T.accent}" class="flag" style="animation-delay:${((x / TW) * 4).toFixed(2)}s"/>`;
        x += w + 5;
      }
    }
    return s + `<rect class="scan" x="0" y="8" width="1.5" height="${TH - 16}" fill="${T.accent}"/>`;
  },
  // contract review: clauses highlighted one by one on a page
  clauseguard(T, r) {
    let s = `<rect x="58" y="10" width="84" height="108" rx="3" fill="${T.bg}" stroke="${T.border}"/>`;
    const hl = [1, 4, 7];
    for (let i = 0; i < 9; i++) {
      const w = 54 + r() * 14, y = 24 + i * 10;
      if (hl.includes(i)) s += `<rect class="mark" x="66" y="${y - 3}" width="${w.toFixed(1)}" height="8" fill="${T.accent}" fill-opacity=".28" style="animation-delay:${hl.indexOf(i) * 0.9}s"/>`;
      s += `<rect x="68" y="${y}" width="${(w - 4).toFixed(1)}" height="2.4" fill="${T.fg}" fill-opacity=".45"/>`;
    }
    return s + `<path d="M150 30h26M150 62h20M150 94h24" stroke="${T.muted}" stroke-width="1.2"/>`
      + hl.map((_, i) => `<circle class="fade" cx="150" cy="${30 + i * 32}" r="2.5" fill="${T.accent}" style="animation-delay:${0.6 + i * 0.9}s"/>`).join('');
  },
  // schema graph: tables joined by relations, a query walks the path
  tablefox(T) {
    const tables = [[16, 16], [120, 12], [70, 70], [150, 76]];
    let s = `<path id="tfq" d="M52 30H86V84H120V26M106 84V92H150" fill="none" stroke="${T.muted}" stroke-width="1" stroke-dasharray="2 3"/>`;
    for (const [x, y] of tables) {
      s += `<rect x="${x}" y="${y}" width="40" height="36" rx="3" fill="${T.bg}" stroke="${T.border}"/><rect x="${x}" y="${y}" width="40" height="8" rx="3" fill="${T.fg}" fill-opacity=".75"/>`;
      for (let k = 0; k < 3; k++) s += `<rect x="${x + 5}" y="${y + 14 + k * 7}" width="${22 + (k % 2) * 8}" height="2" fill="${T.muted}"/>`;
    }
    return s + `<circle r="3" fill="${T.accent}"><animateMotion dur="5s" repeatCount="indefinite"><mpath href="#tfq"/></animateMotion></circle>`;
  },
  // self-extending agent: a tree grows, then a new accent branch appears
  selfext(T, r) {
    const segs = [];
    const grow = (x, y, a, len, depth) => {
      if (depth > 5) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      segs.push([x, y, x2, y2, depth]);
      grow(x2, y2, a - 0.35 - r() * 0.25, len * 0.72, depth + 1);
      grow(x2, y2, a + 0.35 + r() * 0.25, len * 0.72, depth + 1);
    };
    grow(100, 122, -Math.PI / 2, 30, 0);
    const pick = segs.filter((s) => s[4] === 5)[3];
    return segs.map(([a, b, c, d, k]) => `<path class="draw" pathLength="1" d="M${a.toFixed(1)} ${b.toFixed(1)}L${c.toFixed(1)} ${d.toFixed(1)}" stroke="${T.fg}" stroke-opacity="${(0.9 - k * 0.12).toFixed(2)}" stroke-width="${(2.2 - k * 0.3).toFixed(1)}" style="animation-duration:.6s;animation-delay:${(k * 0.45).toFixed(2)}s"/>`).join('')
      + `<path class="draw" pathLength="1" d="M${pick[2].toFixed(1)} ${pick[3].toFixed(1)}l14 -12" stroke="${T.accent}" stroke-width="1.6" style="animation-duration:.8s;animation-delay:3.2s"/><circle class="fade fx pulse" cx="${(pick[2] + 14).toFixed(1)}" cy="${(pick[3] - 12).toFixed(1)}" r="2.6" fill="${T.accent}" style="animation-delay:3.8s"/>`;
  },
  // Gradient Dense Code: QR-like finders + a field of calibrated tones
  gdc(T, r) {
    const cell = 9, cols = 13, rows = 11, ox = (TW - cols * cell) / 2, oy = (TH - rows * cell) / 2;
    let s = '';
    const finder = (i, j) => i < 3 && j < 3 || i >= cols - 3 && j < 3 || i < 3 && j >= rows - 3;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      if (finder(i, j)) continue;
      const tone = r(), acc = r() < 0.18;
      s += `<rect class="tone" x="${ox + i * cell}" y="${oy + j * cell}" width="${cell - 1.5}" height="${cell - 1.5}" fill="${acc ? T.accent : T.fg}" fill-opacity="${(0.15 + tone * 0.75).toFixed(2)}" style="animation-delay:${(r() * 3).toFixed(2)}s"/>`;
    }
    for (const [i, j] of [[0, 0], [cols - 3, 0], [0, rows - 3]]) {
      const x = ox + i * cell, y = oy + j * cell;
      s += `<rect x="${x + 0.75}" y="${y + 0.75}" width="${cell * 3 - 3}" height="${cell * 3 - 3}" fill="none" stroke="${T.fg}" stroke-width="1.5"/><rect x="${x + cell - 0.75}" y="${y + cell - 0.75}" width="${cell - 0}" height="${cell - 0}" fill="${T.fg}"/>`;
    }
    return s;
  },
  // LAN broadcast: rings radiate, a waveform breathes
  audix(T, r) {
    let s = '';
    for (let i = 0; i < 3; i++) s += `<circle class="fx ring" cx="42" cy="64" r="16" fill="none" stroke="${T.accent}" style="animation-delay:${i}s"/>`;
    s += `<circle cx="42" cy="64" r="5" fill="${T.accent}"/>`;
    for (let i = 0; i < 16; i++) {
      const h = 8 + r() * 44;
      s += `<rect class="fx wave" x="${86 + i * 6.5}" y="${64 - h / 2}" width="3" height="${h.toFixed(1)}" rx="1.5" fill="${T.fg}" fill-opacity=".7" style="animation-delay:${(i * 0.09).toFixed(2)}s"/>`;
    }
    return s;
  },
  // crew & ops: multi-leg routing between airports
  aviatrack(T) {
    const ap = [[22, 96, 'PAT'], [70, 40, 'DEL'], [118, 92, 'BOM'], [178, 54, 'BLR']];
    let d = `M${ap[0][0]} ${ap[0][1]}`;
    for (let i = 1; i < ap.length; i++) { const [x1, y1] = ap[i - 1], [x2, y2] = ap[i]; d += `Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 34} ${x2} ${y2}`; }
    return `<path id="avr" d="${d}" fill="none" stroke="${T.muted}" stroke-width="1" stroke-dasharray="3 3"/>`
      + `<path class="draw" pathLength="1" d="${d}" fill="none" stroke="${T.fg}" stroke-width="1.2" style="animation-duration:4s"/>`
      + ap.map(([x, y, code]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${T.bg}" stroke="${T.fg}" stroke-width="1.4"/><text x="${x}" y="${y + 16}" text-anchor="middle" font-size="8" letter-spacing="1" fill="${T.muted}" class="m4">${code}</text>`).join('')
      + `<circle r="3" fill="${T.accent}"><animateMotion dur="6s" repeatCount="indefinite" rotate="auto"><mpath href="#avr"/></animateMotion></circle>`;
  },
  // HR: an attendance month filling in
  hrm(T, r) {
    let s = '';
    const cols = 7, rows = 5, cw = 18, ch = 14, gap = 4, ox = (TW - (cols * (cw + gap) - gap)) / 2, oy = (TH - (rows * (ch + gap) - gap)) / 2;
    for (let k = 0; k < cols * rows; k++) {
      const i = k % cols, j = Math.floor(k / cols), weekend = i >= 5, leave = !weekend && r() < 0.1;
      const fill = weekend ? 'none' : leave ? T.accent : T.fg;
      s += `<rect class="fade" x="${ox + i * (cw + gap)}" y="${oy + j * (ch + gap)}" width="${cw}" height="${ch}" rx="2" fill="${fill}" fill-opacity="${leave ? 0.9 : 0.55}" stroke="${weekend ? T.border : 'none'}" style="animation-duration:.4s;animation-delay:${(k * 0.08).toFixed(2)}s"/>`;
    }
    return s;
  },
};

export const VIGNETTE_CSS = `
.scan{animation:scan 4s linear infinite}@keyframes scan{from{transform:translateX(0)}to{transform:translateX(${TW}px)}}
.flag{opacity:0;animation:flag 4s linear infinite}@keyframes flag{0%{opacity:0}4%{opacity:1}70%{opacity:1}85%,100%{opacity:0}}
.mark{transform-box:fill-box;transform-origin:left center;animation:mark 2.7s cubic-bezier(.65,0,.35,1) infinite alternate}@keyframes mark{0%,20%{transform:scaleX(0)}60%,100%{transform:scaleX(1)}}
.tone{animation:tone 3s ease-in-out infinite alternate}@keyframes tone{to{fill-opacity:.12}}
.ring{animation:ring 3s ease-out infinite}@keyframes ring{from{transform:scale(.3);opacity:.9}to{transform:scale(2.3);opacity:0}}
.wave{animation:wave 1.1s ease-in-out infinite alternate}@keyframes wave{to{transform:scaleY(.25)}}
.pulse{animation:fade .6s ease forwards,pl 2s ease-in-out 4.4s infinite}@keyframes pl{50%{opacity:.35}}`;
export const VIGNETTE_REDUCED = `.flag{opacity:1}.pulse{opacity:1}`;
