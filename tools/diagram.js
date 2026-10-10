// Diagram generator: spec (JS module) -> .excalidraw (editable) + hand-drawn .svg (Excalifont subset embedded)
// Usage: node diagram.js <spec.js> <outdir>
// Spec: { w, h, title?, nodes:[[id,cx,cy,label,col,shape,w,h]], edges:[[from,to,label,style]], texts:[[x,y,text,col,size,anchor]], zones:[[x,y,w,h,label,col]] }
// label: lines split by '\n'; a line "Main|sub" renders sub smaller. shape: rect|db|pill|note|queue|x|circle
// edge style chars: d=dashed, colour letter (b g a r p t x k), 2=both ends, c/C=curve left/right, n=no head
const fs = require('fs'), path = require('path'), cp = require('child_process');
const rough = require('roughjs');
const FONT = JSON.parse(fs.readFileSync(path.join(__dirname, 'excalifont.json'), 'utf8'));
const FONTDIR = path.join(__dirname, '..', 'node_modules/@excalidraw/excalidraw/dist/dev/fonts/Excalifont');
const PAL = { b: ['#1971c2', '#d0ebff'], g: ['#2f9e44', '#d3f9d8'], a: ['#e8590c', '#fff3bf'], r: ['#e03131', '#ffe3e3'],
  p: ['#6741d9', '#e5dbff'], t: ['#0c8599', '#c5f6fa'], x: ['#495057', '#f1f3f5'], k: ['#c2255c', '#ffdeeb'], w: ['#1e1e1e', '#ffffff'] };
const INK = '#1e1e1e';
const gen = rough.generator();

const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h) % 2 ** 31; };
const tw = (s, size) => [...s].reduce((a, c) => a + (FONT.w[c] ?? 0.6), 0) * size;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MAIN = 20, SUB = 15, LH = 1.25;

function measure(n) {
  const lines = String(n[3]).split('\n');
  let w = 0, h = 0;
  for (const l of lines) { const [m, s] = l.split('|'); w = Math.max(w, tw(m, MAIN), s ? tw(s, SUB) : 0); h += MAIN * LH + (s !== undefined ? SUB * LH : 0); }
  const shape = n[5] || 'rect';
  const padX = shape === 'pill' ? 36 : 28, padY = shape === 'db' ? 34 : 22;
  return [n[6] || Math.max(90, w + padX), n[7] || Math.max(54, h + padY)];
}

function roughPaths(drawable) {
  return gen.toPaths(drawable).map(p => `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill || 'none'}"${drawable.options.strokeLineDash ? ` stroke-dasharray="${drawable.options.strokeLineDash.join(' ')}"` : ''}/>`).join('');
}
function rrPath(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); return `M${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} L${x + r},${y + h} Q${x},${y + h} ${x},${y + h - r} L${x},${y + r} Q${x},${y} ${x + r},${y} Z`; }

function clip(c, dx, dy, pad) {
  if (!c.w) return [c.x, c.y];
  const hw = c.w / 2 + pad, hh = c.h / 2 + pad;
  const t = Math.min(dx ? hw / Math.abs(dx) : 1e9, dy ? hh / Math.abs(dy) : 1e9);
  return [c.x + dx * t, c.y + dy * t];
}

function build(spec, name, outdir) {
  const W = spec.w || 900, H = spec.h || 420;
  let svg = '', chars = new Set(), ex = [];
  const addText = s => [...s].forEach(c => chars.add(c));
  const text = (x, y, s, size, fill, anchor = 'middle', weight) => { addText(s); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}" fill="${fill}" text-anchor="${anchor}"${weight ? ` font-weight="${weight}"` : ''}>${esc(s)}</text>`; };
  const base = { angle: 0, strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [], frameId: null, version: 1, isDeleted: false, updated: 1, link: null, locked: false, boundElements: null };
  const exEl = (o) => { const id = o.id; ex.push(Object.assign({}, base, { seed: hash(id), versionNonce: hash(id + 'n') }, o)); return id; };
  const exText = (id, x, y, w, h, s, size, color, container) => exEl({ id, type: 'text', x, y, width: w, height: h, strokeColor: color, backgroundColor: 'transparent', fillStyle: 'solid', text: s, originalText: s, fontSize: size, fontFamily: 5, textAlign: 'center', verticalAlign: 'middle', containerId: container || null, lineHeight: LH, autoResize: true, roundness: null });

  // zones
  for (const [i, z] of (spec.zones || []).entries()) {
    const [x, y, w, h, label, col] = z; const [s] = PAL[col || 'x'];
    svg += roughPaths(gen.path(rrPath(x, y, w, h, 18), { stroke: s, strokeWidth: 1.5, roughness: 0.8, strokeLineDash: [8, 8], seed: hash('z' + i) }));
    if (label) svg += text(x + 14, y + 24, label, 16, s, 'start');
    exEl({ id: 'zone' + i, type: 'rectangle', x, y, width: w, height: h, strokeColor: s, backgroundColor: 'transparent', fillStyle: 'solid', strokeStyle: 'dashed', strokeWidth: 1, roundness: { type: 3 } });
    if (label) exEl({ id: 'zonet' + i, type: 'text', x: x + 14, y: y + 8, width: tw(label, 16), height: 20, strokeColor: s, backgroundColor: 'transparent', fillStyle: 'solid', text: label, originalText: label, fontSize: 16, fontFamily: 5, textAlign: 'left', verticalAlign: 'top', containerId: null, lineHeight: LH, autoResize: true, roundness: null });
  }

  // node geometry
  const N = {};
  for (const n of spec.nodes || []) { const [w, h] = measure(n); N[n[0]] = { x: n[1], y: n[2], w, h }; }

  // edges (drawn under nodes)
  let edgeSvg = '', labelSvg = '';
  for (const [i, e] of (spec.edges || []).entries()) {
    const [f, t, label, st = ''] = e; const A = Array.isArray(f) ? { x: f[0], y: f[1] } : N[f], B = Array.isArray(t) ? { x: t[0], y: t[1] } : N[t];
    if (!A || !B) throw new Error(`${name}: bad edge ${f}->${t}`);
    const ck = (st.match(/[bgarptxk]/) || [null])[0]; const color = ck ? PAL[ck][0] : INK;
    let curve = st.includes('c') ? -1 : st.includes('C') ? 1 : 0;
    const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
    let cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2; if (curve) { cx += -dy / len * 55 * curve; cy += dx / len * 55 * curve; }
    const [x1, y1] = clip(A, (curve ? cx : B.x) - A.x, (curve ? cy : B.y) - A.y, 6);
    const [x2, y2] = clip(B, (curve ? cx : A.x) - B.x, (curve ? cy : A.y) - B.y, 8);
    const opts = { stroke: color, strokeWidth: 2, roughness: 0.9, seed: hash(name + 'e' + i), strokeLineDash: st.includes('d') ? [10, 8] : undefined };
    edgeSvg += roughPaths(curve ? gen.curve([[x1, y1], [cx, cy], [x2, y2]], opts) : gen.line(x1, y1, x2, y2, opts));
    const head = (hx, hy, fx, fy) => { const a = Math.atan2(hy - fy, hx - fx), L = 14, s = 0.45; return roughPaths(gen.linearPath([[hx - L * Math.cos(a - s), hy - L * Math.sin(a - s)], [hx, hy], [hx - L * Math.cos(a + s), hy - L * Math.sin(a + s)]], { ...opts, strokeLineDash: undefined })); };
    if (!st.includes('n')) edgeSvg += curve ? head(x2, y2, cx, cy) : head(x2, y2, x1, y1);
    if (st.includes('2')) edgeSvg += curve ? head(x1, y1, cx, cy) : head(x1, y1, x2, y2);
    const aid = 'arrow' + i;
    const pts = curve ? [[0, 0], [cx - x1, cy - y1], [x2 - x1, y2 - y1]] : [[0, 0], [x2 - x1, y2 - y1]];
    exEl({ id: aid, type: 'arrow', x: x1, y: y1, width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), strokeColor: color, backgroundColor: 'transparent', fillStyle: 'solid', strokeStyle: st.includes('d') ? 'dashed' : 'solid', roundness: curve ? { type: 2 } : null, points: pts, lastCommittedPoint: null,
      startBinding: Array.isArray(f) ? null : { elementId: f, focus: 0, gap: 6 }, endBinding: Array.isArray(t) ? null : { elementId: t, focus: 0, gap: 8 },
      startArrowhead: st.includes('2') ? 'arrow' : null, endArrowhead: st.includes('n') ? null : 'arrow', elbowed: false,
      boundElements: label ? [{ type: 'text', id: aid + 't' }] : null });
    if (label) {
      const lx = curve ? (x1 + 2 * cx + x2) / 4 : (x1 + x2) / 2, ly = curve ? (y1 + 2 * cy + y2) / 4 : (y1 + y2) / 2;
      const lines = String(label).split('\n'), size = 16; const lw = Math.max(...lines.map(l => tw(l, size))) + 12, lh = lines.length * size * LH + 6;
      labelSvg += `<rect x="${(lx - lw / 2).toFixed(1)}" y="${(ly - lh / 2).toFixed(1)}" width="${lw.toFixed(1)}" height="${lh.toFixed(1)}" rx="6" fill="#ffffff"/>`;
      lines.forEach((l, k) => labelSvg += text(lx, ly - lh / 2 + 3 + size * LH * (k + 0.78), l, size, color));
      exText(aid + 't', lx - lw / 2, ly - lh / 2, lw, lh, label, size, color, aid);
    }
  }

  // nodes
  let nodeSvg = '';
  for (const n of spec.nodes || []) {
    const [id, cx, cy, label, col = 'x', shape = 'rect'] = n; const { w, h } = N[id]; const [s, bg] = PAL[col];
    const x = cx - w / 2, y = cy - h / 2, sd = hash(name + id);
    const o = { stroke: s, strokeWidth: 2, fill: bg, fillStyle: 'solid', roughness: 1, seed: sd };
    const exBase = { strokeColor: s, backgroundColor: bg, fillStyle: 'solid' };
    if (shape === 'db') {
      const e = 9;
      nodeSvg += roughPaths(gen.path(`M${x},${y + e} L${x},${y + h - e} A${w / 2},${e} 0 0 0 ${x + w},${y + h - e} L${x + w},${y + e}`, o));
      nodeSvg += roughPaths(gen.ellipse(cx, y + e, w, 2 * e, { ...o, seed: sd + 1 }));
      exEl({ id, type: 'rectangle', x, y: y + e, width: w, height: h - e, ...exBase, roundness: { type: 3 }, boundElements: [{ type: 'text', id: id + 't' }], groupIds: [id + 'g'] });
      exEl({ id: id + 'top', type: 'ellipse', x, y, width: w, height: 2 * e, ...exBase, roundness: null, groupIds: [id + 'g'] });
    } else if (shape === 'circle') {
      nodeSvg += roughPaths(gen.ellipse(cx, cy, w, h, o));
      exEl({ id, type: 'ellipse', x, y, width: w, height: h, ...exBase, roundness: null, boundElements: [{ type: 'text', id: id + 't' }] });
    } else {
      const r = shape === 'pill' ? h / 2 : 12;
      const oo = shape === 'note' ? { ...o, fill: undefined, strokeLineDash: [8, 6] } : o;
      nodeSvg += roughPaths(gen.path(rrPath(x, y, w, h, r), oo));
      if (shape === 'queue') for (let k = 1; k <= 3; k++) nodeSvg += roughPaths(gen.line(x + w - 9 * k, y + 6, x + w - 9 * k, y + h - 6, { ...o, strokeWidth: 1.2, seed: sd + k }));
      if (shape === 'x') { nodeSvg += roughPaths(gen.line(x + 8, y + 8, x + w - 8, y + h - 8, { stroke: PAL.r[0], strokeWidth: 2.5, seed: sd + 5 })) + roughPaths(gen.line(x + w - 8, y + 8, x + 8, y + h - 8, { stroke: PAL.r[0], strokeWidth: 2.5, seed: sd + 6 })); }
      exEl({ id, type: 'rectangle', x, y, width: w, height: h, ...exBase, backgroundColor: shape === 'note' ? 'transparent' : bg, strokeStyle: shape === 'note' ? 'dashed' : 'solid', roundness: { type: 3 }, boundElements: [{ type: 'text', id: id + 't' }] });
    }
    // label
    const lines = String(label).split('\n');
    const total = lines.reduce((a, l) => a + MAIN * LH + (l.includes('|') ? SUB * LH : 0), 0);
    let ty = cy - total / 2 + (shape === 'db' ? 5 : 0);
    for (const l of lines) { const [m, sub] = l.split('|'); ty += MAIN * LH; nodeSvg += text(cx, ty - 6, m, MAIN, INK); if (sub !== undefined) { ty += SUB * LH; nodeSvg += text(cx, ty - 5, sub, SUB, s); } }
    const plain = lines.map(l => l.replace('|', '\n')).join('\n');
    exText(id + 't', x + 6, cy - total / 2, w - 12, total, plain, MAIN, INK, id);
  }

  // free texts
  let freeSvg = '';
  for (const [i, t] of (spec.texts || []).entries()) {
    const [x, y, s, col = 'w', size = 18, anchor = 'middle'] = t; const color = PAL[col][0];
    String(s).split('\n').forEach((l, k) => freeSvg += text(x, y + k * size * LH, l, size, color, { s: 'start', e: 'end' }[anchor] || 'middle'));
    const w = Math.max(...String(s).split('\n').map(l => tw(l, size)));
    exEl({ id: 'txt' + i, type: 'text', x: anchor === 's' ? x : anchor === 'e' ? x - w : x - w / 2, y: y - size, width: w, height: String(s).split('\n').length * size * LH, strokeColor: color, backgroundColor: 'transparent', fillStyle: 'solid', text: s, originalText: s, fontSize: size, fontFamily: 5, textAlign: anchor === 's' ? 'left' : anchor === 'e' ? 'right' : 'center', verticalAlign: 'top', containerId: null, lineHeight: LH, autoResize: true, roundness: null });
  }

  // title
  let titleSvg = '';
  if (spec.title) { titleSvg = text(24, 38, spec.title, 24, INK, 'start'); }

  // font subset per split file
  const byFile = {};
  for (const c of chars) { const f = FONT.file[c]; if (f) (byFile[f] = byFile[f] || []).push(c); }
  let faces = '';
  const tmp = fs.mkdtempSync('/tmp/fs-');
  for (const [f, cs] of Object.entries(byFile)) {
    const out = path.join(tmp, 'sub.woff2');
    const u = cs.map(c => 'U+' + c.codePointAt(0).toString(16).padStart(4, '0')).join(',');
    cp.execFileSync('pyftsubset', [path.join(FONTDIR, f), `--unicodes=${u}`, '--flavor=woff2', `--output-file=${out}`, '--no-hinting', '--desubroutinize']);
    faces += `@font-face{font-family:'Excalifont';src:url(data:font/woff2;base64,${fs.readFileSync(out).toString('base64')}) format('woff2');}`;
  }
  fs.rmSync(tmp, { recursive: true });

  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(spec.alt || spec.title || name)}">
<title>${esc(spec.alt || spec.title || name)}</title>
<style>${faces}text{font-family:'Excalifont','Segoe Print','Comic Sans MS',cursive;}</style>
<rect width="${W}" height="${H}" fill="#ffffff"/>
${titleSvg}${svg}${edgeSvg}${nodeSvg}${labelSvg}${freeSvg}
</svg>`;
  fs.writeFileSync(path.join(outdir, name + '.svg'), out);
  fs.writeFileSync(path.join(outdir, name + '.excalidraw'), JSON.stringify({ type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements: ex, appState: { viewBackgroundColor: '#ffffff', gridSize: null }, files: {} }, null, 1));
  return out.length;
}

const [specPath, outdir] = process.argv.slice(2);
const specs = require(path.resolve(specPath));
for (const [name, spec] of Object.entries(specs)) {
  const n = build(spec, name, outdir); console.log(`${name}: ${(n / 1024).toFixed(0)} KB`);
}
