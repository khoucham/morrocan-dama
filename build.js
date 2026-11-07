#!/usr/bin/env node
/* Inline the engine and AI into the client template and write public/index.html. */
const fs = require('fs');
const path = require('path');

const read = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
const engine = read('src/engine.js').replace("if (typeof module !== 'undefined') module.exports = DamaEngine;", '');
const ai = read('src/ai.js').replace("if (typeof module !== 'undefined') module.exports = DamaAI;", '');
const puzzles = read('src/puzzles.js').replace("if (typeof module !== 'undefined') module.exports = DAMA_PUZZLES;", '');
const ck = read('src/chkobba.js').replace("if (typeof module !== 'undefined') module.exports = Chkobba;", '');
const ro = read('src/ronda.js').replace("if (typeof module !== 'undefined') module.exports = Ronda;", '');
const ckui = read('src/chkobba-ui.js');
const i18n = read('src/i18n.js');
const out = read('src/client.template.html').split('/*ENGINE*/').join(engine).split('/*AI*/').join(ai).split('/*PUZZLES*/').join(puzzles).split('/*CHKOBBA*/').join(ck).split('/*RONDA*/').join(ro).split('/*CKUI*/').join(ckui).split('/*I18N*/').join(i18n);

fs.mkdirSync(path.join(__dirname, 'public'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'public/index.html'), out);

const scripts = [...out.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
fs.writeFileSync(path.join(__dirname, '.syntax-check.js'), scripts.join('\n'));
console.log('built public/index.html (' + Buffer.byteLength(out) + ' bytes)');
