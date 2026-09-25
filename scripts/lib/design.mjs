/**
 * Design system glue.
 *  - Colour tokens are read straight from @primer/primitives (GitHub's own design tokens)
 *  - Type: Hubot Sans + Mona Sans + Monaspace Neon (GitHub, SIL OFL) via @fontsource,
 *    subset per SVG with subset-font and embedded as woff2 data URIs
 *  - Icons: @primer/octicons for UI glyphs, simple-icons for technology marks
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';
import * as simpleIcons from 'simple-icons';

const require = createRequire(import.meta.url);
const octicons = require('@primer/octicons');
const pkgPath = (p) => require.resolve(p);

// ───────── colour: Primer functional tokens ─────────
function primer(themeName) {
  const css = readFileSync(pkgPath(`@primer/primitives/dist/css/functional/themes/${themeName}.css`), 'utf8');
  const get = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))[1];
  return {
    name: themeName,
    bg: get('bgColor-default'),
    bgMuted: get('bgColor-muted'),
    fg: get('fgColor-default'),
    muted: get('fgColor-muted'),
    border: get('borderColor-default'),
    accent: get('fgColor-severe'), // Primer's warm orange — the single accent
    link: get('fgColor-accent'),
  };
}
export const THEMES = [primer('dark'), primer('light')];

// ───────── type ─────────
const fontFile = (pkg, file) => readFileSync(pkgPath(`@fontsource/${pkg}/files/${file}`));
const FACES = {
  d8: { family: 'HubotSans-800', weight: 800, file: () => fontFile('hubot-sans', 'hubot-sans-latin-800-normal.woff2'), fallback: "'Segoe UI',Helvetica,Arial,sans-serif" },
  d6: { family: 'HubotSans-600', weight: 600, file: () => fontFile('hubot-sans', 'hubot-sans-latin-600-normal.woff2'), fallback: "'Segoe UI',Helvetica,Arial,sans-serif" },
  b4: { family: 'MonaSans-400', weight: 400, file: () => fontFile('mona-sans', 'mona-sans-latin-400-normal.woff2'), fallback: "'Segoe UI',Helvetica,Arial,sans-serif" },
  b5: { family: 'MonaSans-500', weight: 500, file: () => fontFile('mona-sans', 'mona-sans-latin-500-normal.woff2'), fallback: "'Segoe UI',Helvetica,Arial,sans-serif" },
  m4: { family: 'MonaspaceNeon-400', weight: 400, file: () => fontFile('monaspace-neon', 'monaspace-neon-latin-400-normal.woff2'), fallback: "ui-monospace,SFMono-Regular,Consolas,monospace" },
};
const fontCache = new Map();
async function embedFace(key, chars) {
  const id = key + '|' + chars;
  if (!fontCache.has(id)) {
    const woff2 = await subsetFont(FACES[key].file(), chars, { targetFormat: 'woff2' });
    fontCache.set(id, woff2.toString('base64'));
  }
  return fontCache.get(id);
}
/** Approximate advance width for monospace text (Monaspace ≈ 0.6em). */
export const monoWidth = (str, size) => str.length * size * 0.6;

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ───────── icons ─────────
export function octicon(name, x, y, size, fill) {
  const icon = octicons[name];
  const h = icon.heights[16] ? 16 : 24;
  const s = size / h;
  return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">${icon.heights[h].path}</g>`;
}
export function brandIcon(slug, x, y, size, fill) {
  const key = 'si' + slug[0].toUpperCase() + slug.slice(1);
  const icon = simpleIcons[key];
  if (!icon) throw new Error('simple-icons: unknown slug ' + slug);
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="${fill}"><path d="${icon.path}"/></g>`;
}

// ───────── SVG document builder ─────────
const BASE_CSS = `
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes fade{to{opacity:1}}
@keyframes growX{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 2.6s cubic-bezier(.65,0,.35,1) forwards}
.rise{opacity:0;animation:rise 1s cubic-bezier(.2,.7,.2,1) forwards}
.fade{opacity:0;animation:fade 1.2s ease forwards}
.growX{transform-box:fill-box;transform-origin:left center;animation:growX 1.4s cubic-bezier(.65,0,.35,1) both}
.fx{transform-box:fill-box;transform-origin:center}`;
const REDUCED = `.draw{stroke-dashoffset:0}.rise,.fade{opacity:1}`;

export function doc(w, h, title, theme) {
  const used = {};
  const parts = [];
  let css = '', reduced = '';
  const api = {
    theme, w, h,
    add(s) { parts.push(s); return api; },
    css(s, r = '') { css += s; reduced += r; return api; },
    /** register glyphs used by raw markup (e.g. vignettes) so they get embedded */
    use(face, str) { (used[face] ??= new Set()); for (const ch of str) used[face].add(ch); return api; },
    /** text(x, y, str, { face, size, fill, anchor, ls, cls, style, opacity }) */
    text(x, y, str, o = {}) {
      const face = o.face || 'b4';
      (used[face] ??= new Set());
      for (const ch of String(str)) used[face].add(ch);
      const attrs = [
        `x="${x}"`, `y="${y}"`, `class="${face}${o.cls ? ' ' + o.cls : ''}"`, `font-size="${o.size || 14}"`,
        `fill="${o.fill || theme.fg}"`,
        o.anchor ? `text-anchor="${o.anchor}"` : '', o.ls ? `letter-spacing="${o.ls}"` : '',
        o.opacity != null ? `fill-opacity="${o.opacity}"` : '', o.style ? `style="${o.style}"` : '',
      ].filter(Boolean).join(' ');
      parts.push(`<text ${attrs}>${esc(str)}</text>`);
      return api;
    },
    async render() {
      const faces = await Promise.all(Object.entries(used).map(async ([k, set]) => {
        const f = FACES[k];
        const data = await embedFace(k, [...set].join('') + ' ');
        return `@font-face{font-family:'${f.family}';src:url(data:font/woff2;base64,${data}) format('woff2');font-weight:${f.weight}}
.${k}{font-family:'${f.family}',${f.fallback};font-weight:${f.weight}${k[0] === 'd' ? ';word-spacing:.14em' : k[0] === 'b' ? ';word-spacing:.05em' : ''}}`;
      }));
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="t">
<title id="t">${esc(title)}</title>
<style>${faces.join('\n')}${BASE_CSS}${css}
@media (prefers-reduced-motion:reduce){*{animation:none!important}${REDUCED}${reduced}}</style>
<rect width="${w}" height="${h}" fill="${theme.bg}"/>
${parts.join('\n')}
</svg>`;
    },
  };
  return api;
}
