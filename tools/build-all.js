// Rebuild every diagram: hand-written specs (diagrams-src/*.js) and generated specs (diagrams-src/generated/*.json).
const fs = require('fs'), path = require('path');
const { build } = require('./diagram.js');
const SRC = path.join(__dirname, '..', 'diagrams-src'), OUT = path.join(__dirname, '..', 'docs', 'diagrams');
let n = 0;
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith('.js'))) {
  for (const [name, spec] of Object.entries(require(path.join(SRC, f)))) { build(spec, name, OUT); n++; }
}
const gen = path.join(SRC, 'generated');
if (fs.existsSync(gen)) for (const f of fs.readdirSync(gen).filter(f => f.endsWith('.json'))) {
  build(JSON.parse(fs.readFileSync(path.join(gen, f), 'utf8')), f.replace(/\.json$/, ''), OUT); n++;
}
console.log(`built ${n} diagrams`);
