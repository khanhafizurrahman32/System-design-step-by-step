// Sketchnote renderer: one dense, hand-drawn page per topic.
// Page spec: { w, h, title, subtitle, tags:[], footer, panels:[{ x, y, w, h, label, col, icon, blocks:[...] }] }
// Blocks:
//   { t:'text', text, col?, size? }                     wrapped paragraph
//   { t:'bullets', items:[...], mark:'•'|'✓'|'✗'|'1', col? }
//   { t:'hl', items:[...] }                             key numbers on a highlighter stroke
//   { t:'qa', items:[[q, a], ...] }                     question in colour, answer in ink
//   { t:'code', text }                                  monospace-ish small lines
//   { t:'diagram', name, h:'fill'|number }              embeds docs/diagrams/<name>.svg
//   { t:'flow', items:[...], col? }                     a → b → c chain of small boxes
const fs = require('fs'), path = require('path');
const rough = require('roughjs');
const { tw, fontFaces, PAL, INK, LH } = require('./diagram.js');
const gen = rough.generator();
const DIAG = path.join(__dirname, '..', 'docs', 'diagrams');

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h) % 2 ** 31; };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const paths = d => gen.toPaths(d).map(p => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || 'none'}"${d.options.fill && d.options.fillStyle === 'solid' && d.options.fillOpacity ? ` fill-opacity="${d.options.fillOpacity}"` : ''}/>`).join('');

function wrap(text, maxW, size) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + word : word;
      if (tw(t, size) <= maxW || !line) line = t; else { out.push(line); line = word; }
    }
    out.push(line);
  }
  return out;
}

// small hand-drawn icons, ~26px, drawn at (x, y) top-left
function icon(kind, x, y, col, seed) {
  const o = { stroke: col, strokeWidth: 1.8, roughness: 1.1, seed };
  const of = { ...o, fill: PAL.a[1], fillStyle: 'solid' };
  switch (kind) {
    case 'db': return paths(gen.ellipse(x + 13, y + 5, 24, 8, of)) + paths(gen.linearPath([[x + 1, y + 5], [x + 1, y + 22], [x + 25, y + 22], [x + 25, y + 5]], o)) + paths(gen.arc(x + 13, y + 22, 24, 8, 0, Math.PI, false, o));
    case 'user': return paths(gen.circle(x + 13, y + 8, 11, of)) + paths(gen.arc(x + 13, y + 27, 22, 20, Math.PI, 2 * Math.PI, false, o));
    case 'lock': return paths(gen.rectangle(x + 3, y + 11, 20, 14, of)) + paths(gen.arc(x + 13, y + 11, 13, 16, Math.PI, 2 * Math.PI, false, o));
    case 'bolt': return paths(gen.polygon([[x + 15, y], [x + 4, y + 15], [x + 12, y + 15], [x + 9, y + 26], [x + 22, y + 9], [x + 14, y + 9]], of));
    case 'clock': return paths(gen.circle(x + 13, y + 13, 24, of)) + paths(gen.linearPath([[x + 13, y + 5], [x + 13, y + 13], [x + 19, y + 16]], o));
    case 'warn': return paths(gen.polygon([[x + 13, y + 1], [x + 25, y + 24], [x + 1, y + 24]], { ...of, fill: PAL.r[1] })) + paths(gen.line(x + 13, y + 9, x + 13, y + 16, o)) + paths(gen.circle(x + 13, y + 20, 2, o));
    case 'chat': return paths(gen.path(`M${x + 2},${y + 3} h22 v14 h-12 l-6,6 v-6 h-4 z`, of));
    case 'check': return paths(gen.linearPath([[x + 3, y + 14], [x + 10, y + 21], [x + 24, y + 4]], { ...o, strokeWidth: 2.5 }));
    case 'chart': return paths(gen.linearPath([[x + 2, y + 2], [x + 2, y + 24], [x + 25, y + 24]], o)) + paths(gen.linearPath([[x + 6, y + 18], [x + 12, y + 11], [x + 17, y + 15], [x + 24, y + 5]], { ...o, stroke: PAL.r[0] }));
    case 'box': return paths(gen.rectangle(x + 2, y + 4, 22, 18, of)) + paths(gen.line(x + 2, y + 10, x + 24, y + 10, o));
    case 'book': return paths(gen.path(`M${x + 1},${y + 4} q6,-3 12,0 v20 q-6,-3 -12,0 z M${x + 13},${y + 4} q6,-3 12,0 v20 q-6,-3 -12,0 z`, of));
    case 'gear': return paths(gen.circle(x + 13, y + 13, 20, of)) + paths(gen.circle(x + 13, y + 13, 7, o));
    default: return '';
  }
}

function render(spec, name, outdir) {
  const W = spec.w || 2000, H = spec.h || 1414;
  const chars = new Set(); const add = s => [...String(s)].forEach(c => chars.add(c));
  const T = (x, y, s, size, fill, anchor = 'start', extra = '') => { add(s); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${extra}>${esc(s)}</text>`; };
  let out = '', defs = '';
  const sd = hash(name);

  // paper: off-white with a faint dot grid
  out += `<rect width="${W}" height="${H}" fill="#fffdf8"/>`;
  defs += `<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#d9d4c7"/></pattern>`;
  out += `<rect width="${W}" height="${H}" fill="url(#dots)"/>`;

  // header: big lettering, swoosh underline, subtitle, tags
  const ts = 64; const titleW = tw(spec.title, ts);
  out += T(40, 84, spec.title, ts, INK);
  out += paths(gen.curve([[40, 102], [40 + titleW * 0.5, 112], [40 + titleW, 98]], { stroke: PAL[spec.accent || 'r'][0], strokeWidth: 4, roughness: 1.4, seed: sd }));
  const tagsW = (spec.tags || []).reduce((a, t) => a + tw(t, 17) + 34, 0);
  if (spec.subtitle) {
    const room = W - titleW - 140;
    if (room >= 620) { let sz = 26; while (wrap(spec.subtitle, room, sz).length > 2 && sz > 17) sz -= 0.5; wrap(spec.subtitle, room, sz).slice(0, 2).forEach((l, i) => out += T(titleW + 80, 62 + i * sz * 1.22, l, sz, PAL[spec.accent || 'r'][0])); }
    else { let sz = 22; while (wrap(spec.subtitle, W - tagsW - 140, sz).length > 1 && sz > 15) sz -= 0.5; wrap(spec.subtitle, W - tagsW - 140, sz).slice(0, 1).forEach(l => out += T(44, 138, l, sz, PAL[spec.accent || 'r'][0])); }
  }
  let tx = W - 40;
  for (const tag of (spec.tags || []).slice().reverse()) {
    const w = tw(tag, 17) + 24; tx -= w;
    out += paths(gen.rectangle(tx, 112, w, 30, { stroke: PAL.x[0], strokeWidth: 1.4, roughness: 1, fill: PAL.x[1], fillStyle: 'solid', seed: hash(tag) }));
    out += T(tx + w / 2, 133, tag, 17, PAL.x[0], 'middle'); tx -= 10;
  }

  // panels
  for (const [pi, P] of spec.panels.entries()) {
    const [s, bg] = PAL[P.col || 'x'];
    out += paths(gen.rectangle(P.x, P.y, P.w, P.h, { stroke: s, strokeWidth: 2.2, roughness: 1.3, seed: sd + pi * 7, fill: '#ffffff', fillStyle: 'solid' }));
    // label tab
    const lw = tw(P.label, 21) + 30 + (P.icon ? 30 : 0);
    out += paths(gen.rectangle(P.x + 14, P.y - 17, lw, 34, { stroke: s, strokeWidth: 2, roughness: 1.2, fill: bg, fillStyle: 'solid', seed: sd + pi * 7 + 1 }));
    if (P.icon) out += icon(P.icon, P.x + 24, P.y - 13, s, sd + pi * 7 + 2);
    out += T(P.x + 29 + (P.icon ? 30 : 0), P.y + 7, P.label, 21, s);

    // blocks: fit by shrinking font size until everything fits
    const innerX = P.x + 18, innerW = P.w - 36, top = P.y + 30, bottom = P.y + P.h - 12;
    const fixedDiagram = b => b.t === 'diagram' && b.h !== 'fill';
    const layout = (size) => {
      let h = 0; const items = [];
      for (const b of P.blocks) {
        const gap = size * 0.55;
        if (b.t === 'text') { const L = wrap(b.text, innerW, b.size || size); items.push({ b, L, h: L.length * (b.size || size) * LH }); }
        else if (b.t === 'bullets') { const L = b.items.map(it => wrap(it, innerW - 26, size)); items.push({ b, L, h: L.reduce((a, l) => a + l.length, 0) * size * LH + (b.items.length - 1) * size * 0.25 }); }
        else if (b.t === 'hl') { const L = b.items.map(it => wrap(it, innerW - 14, size)); items.push({ b, L, h: L.reduce((a, l) => a + l.length, 0) * size * LH + (b.items.length - 1) * size * 0.4 }); }
        else if (b.t === 'qa') { const L = b.items.map(([q, a]) => [wrap(q, innerW, size), wrap(a, innerW - 14, size * 0.92)]); items.push({ b, L, h: L.reduce((a, [q, an]) => a + q.length * size * LH + an.length * size * 0.92 * LH + size * 0.45, 0) }); }
        else if (b.t === 'code') { const sz = size * 0.86; const L = b.text.split('\n').flatMap(l => wrap(l, innerW - 16, sz)); items.push({ b, L, sz, h: L.length * sz * LH + 14 }); }
        else if (b.t === 'flow') { items.push({ b, h: size * 2.4 }); }
        else if (b.t === 'table') {
          const sz = size * 0.88, ncol = b.head.length;
          const lens = b.head.map((h, c) => Math.max(tw(h, sz), ...b.rows.map(r => tw(String(r[c] ?? ''), sz))));
          const tot = lens.reduce((a, x) => a + Math.sqrt(x), 0);
          const cw = lens.map(x => Math.max(60, (innerW - 8 * ncol) * Math.sqrt(x) / tot));
          const scale = (innerW - 8 * ncol) / cw.reduce((a, x) => a + x, 0); cw.forEach((x, i) => cw[i] = x * scale);
          const rowsW = [b.head, ...b.rows].map(r => r.map((c, i) => wrap(String(c ?? ''), cw[i] - 6, sz)));
          const rh = rowsW.map(r => Math.max(...r.map(l => l.length)) * sz * LH + 6);
          items.push({ b, sz, cw, rowsW, rh, h: rh.reduce((a, x) => a + x, 0) + 4 });
        }
        else if (b.t === 'diagram') { items.push({ b, h: fixedDiagram(b) ? b.h : 0 }); }
        h += items[items.length - 1].h + gap;
      }
      return { items, h };
    };
    let size = P.size || 19, L = layout(size);
    const hasFill = P.blocks.some(b => b.t === 'diagram' && b.h === 'fill');
    const minFill = hasFill ? 170 : 0;
    while (L.h + minFill > bottom - top && size > 12) { size -= 0.5; L = layout(size); }
    if (!hasFill) { const maxS = P.maxSize || 25; while (size < maxS) { const L2 = layout(size + 0.5); if (L2.h > bottom - top) break; size += 0.5; L = L2; } }
    if (L.h + minFill > bottom - top) console.warn(`  ! ${name} panel "${P.label}" overflows by ${Math.round(L.h + minFill - (bottom - top))}px`);
    const fillH = hasFill ? Math.max(minFill, bottom - top - L.h) : 0;

    let y = top;
    for (const it of L.items) {
      const b = it.b, gap = size * 0.55;
      const col = b.col ? PAL[b.col][0] : INK;
      if (b.t === 'text') { const sz = b.size || size; it.L.forEach((l, i) => out += T(innerX, y + sz * (i + 0.85) * LH, l, sz, col)); }
      else if (b.t === 'bullets') {
        let yy = y;
        b.items.forEach((_, k) => {
          const lines = it.L[k]; const mark = b.mark === '1' ? `${k + 1}.` : (b.mark || '•');
          const mc = b.mark === '✓' ? PAL.g[0] : b.mark === '✗' ? PAL.r[0] : (b.col ? PAL[b.col][0] : s);
          out += T(innerX, yy + size * 0.85 * LH, mark, size, mc);
          lines.forEach((l, i) => out += T(innerX + 26, yy + size * (i + 0.85) * LH, l, size, col));
          yy += lines.length * size * LH + size * 0.25;
        });
      } else if (b.t === 'hl') {
        let yy = y;
        b.items.forEach((_, k) => {
          const lines = it.L[k];
          lines.forEach((l, i) => {
            const lw = tw(l, size) + 10, ly = yy + size * i * LH;
            out += paths(gen.rectangle(innerX - 4, ly + size * 0.18, lw, size * 1.05, { stroke: 'none', fill: '#ffe066', fillStyle: 'solid', roughness: 2.2, seed: hash(l) }));
            out += T(innerX + 2, ly + size * 0.85 * LH, l, size, INK);
          });
          yy += lines.length * size * LH + size * 0.4;
        });
      } else if (b.t === 'qa') {
        let yy = y;
        it.L.forEach(([q, a]) => {
          q.forEach((l, i) => out += T(innerX, yy + size * (i + 0.85) * LH, l, size, s)); yy += q.length * size * LH;
          a.forEach((l, i) => out += T(innerX + 14, yy + size * 0.92 * (i + 0.85) * LH, l, size * 0.92, INK)); yy += a.length * size * 0.92 * LH + size * 0.45;
        });
      } else if (b.t === 'code') {
        out += paths(gen.rectangle(innerX - 4, y, innerW + 8, it.h - 4, { stroke: PAL.x[0], strokeWidth: 1, roughness: 0.8, fill: '#f6f4ee', fillStyle: 'solid', seed: hash(b.text) }));
        it.L.forEach((l, i) => out += T(innerX + 6, y + 8 + it.sz * (i + 0.85) * LH, l, it.sz, '#343a40'));
      } else if (b.t === 'flow') {
        const n = b.items.length, gapX = 26, bw = (innerW - (n - 1) * gapX) / n, bh = size * 1.9; const [fc, fb] = PAL[b.col || 'b'];
        b.items.forEach((label, k) => {
          const bx = innerX + k * (bw + gapX);
          out += paths(gen.rectangle(bx, y, bw, bh, { stroke: fc, strokeWidth: 1.6, roughness: 1, fill: fb, fillStyle: 'solid', seed: hash(label + k) }));
          let fs2 = size * 0.9; while (tw(label, fs2) > bw - 10 && fs2 > 10) fs2 -= 0.5;
          out += T(bx + bw / 2, y + bh / 2 + fs2 * 0.35, label, fs2, INK, 'middle');
          if (k < n - 1) out += paths(gen.line(bx + bw + 3, y + bh / 2, bx + bw + gapX - 4, y + bh / 2, { stroke: fc, strokeWidth: 1.8, roughness: 0.8, seed: k })) + paths(gen.linearPath([[bx + bw + gapX - 11, y + bh / 2 - 6], [bx + bw + gapX - 4, y + bh / 2], [bx + bw + gapX - 11, y + bh / 2 + 6]], { stroke: fc, strokeWidth: 1.8, roughness: 0.6, seed: k + 9 }));
        });
      } else if (b.t === 'table') {
        let yy = y; const [tc] = PAL[b.col || 'x'];
        it.rowsW.forEach((row, r) => {
          let xx = innerX;
          if (r === 0) out += paths(gen.rectangle(innerX - 4, yy, innerW + 8, it.rh[0], { stroke: 'none', fill: PAL[b.col || 'x'][1], fillStyle: 'solid', roughness: 1.5, seed: hash(b.head.join()) }));
          row.forEach((lines, c) => { lines.forEach((l, i) => out += T(xx + 3, yy + it.sz * (i + 0.85) * LH + 2, l, it.sz, r === 0 ? tc : (c === 0 ? INK : '#343a40'))); xx += it.cw[c] + 8; });
          yy += it.rh[r];
          if (r < it.rowsW.length - 1) out += paths(gen.line(innerX - 4, yy, innerX + innerW + 4, yy, { stroke: '#ced4da', strokeWidth: 1, roughness: 0.8, seed: r + hash(b.head[0]) }));
        });
      } else if (b.t === 'diagram') {
        const dh = b.h === 'fill' ? fillH : b.h;
        const src = fs.readFileSync(path.join(DIAG, b.name + '.svg'), 'utf8');
        const vb = /viewBox="([^"]+)"/.exec(src)[1];
        let inner = src.replace(/^[\s\S]*?<\/style>/, '').replace(/<\/svg>\s*$/, '').replace(/<rect [^>]*fill="#ffffff"\/>/, '');
        for (const m of inner.matchAll(/<text[^>]*>([^<]*)<\/text>/g)) add(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
        out += `<svg x="${innerX}" y="${y}" width="${innerW}" height="${dh}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
        it.h = dh;
      }
      y += it.h + gap;
    }
  }
  if (spec.footer) out += T(40, H - 24, spec.footer, 17, PAL.x[0]);
  out += T(W - 40, H - 24, 'System Design, Step by Step · CC BY-SA 4.0', 15, PAL.x[0], 'end');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(spec.title)} sketchnote">
<title>${esc(spec.title)}: sketchnote</title>
<defs>${defs}</defs>
<style>${fontFaces(chars)}text{font-family:'Excalifont','Segoe Print','Comic Sans MS',cursive;}</style>
${out}
</svg>`;
  fs.writeFileSync(path.join(outdir, name + '.svg'), svg);
  return svg.length;
}

module.exports = { render, wrap };
if (require.main === module) {
  const [dir, outdir] = process.argv.slice(2);
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const n = render(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')), f.replace(/\.json$/, ''), outdir);
    console.log(f, (n / 1024).toFixed(0) + ' KB');
  }
}
