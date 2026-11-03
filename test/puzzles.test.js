/* Re-checks every shipped puzzle with the rules engine, independently of the generator. */
const assert = require('assert');
const E = require('../src/engine.js');
const P = require('../src/puzzles.js');

const parse = s => { const b = new Int8Array(64), m = { o: 1, O: 2, x: -1, X: -2 }; for (let i = 0; i < 64; i++) b[i] = m[s[i]] || 0; return b; };
/* the worst case Ivory can be forced into after move m: stones won minus stones lost, or null if the idea does not work */
function net(b, m) {
  const b2 = E.applyMove(b, m), replies = E.genMoves(b2, -1);
  if (!replies.length || !replies[0].caps.length) return null;
  let worst = Infinity;
  for (const r of replies) {
    const mine = E.genMoves(E.applyMove(b2, r), 1);
    if (!mine.length || !mine[0].caps.length) return null;
    worst = Math.min(worst, mine[0].caps.length - r.caps.length);
  }
  return worst;
}

let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS ' + String(n).padStart(2) + '  ' + name); }

test('there are puzzles, numbered 1..N, all different', () => {
  assert(P.length >= 12);
  P.forEach((p, i) => assert.strictEqual(p.n, i + 1));
  assert.strictEqual(new Set(P.map(p => p.board)).size, P.length);
});
test('every position is legal: 64 squares, only dark squares used, nobody can capture at the start', () => {
  for (const p of P) {
    assert.strictEqual(p.board.length, 64);
    const b = parse(p.board);
    b.forEach((v, i) => { if (v) assert.strictEqual(((i >> 3) + (i & 7)) & 1, 1, 'puzzle ' + p.n + ' has a stone on a light square'); });
    assert(!E.genMoves(b, 1).some(m => m.caps.length), 'puzzle ' + p.n + ': Ivory has a capture already');
    assert(!E.genMoves(b, -1).some(m => m.caps.length), 'puzzle ' + p.n + ': Ruby has a capture already');
    assert(E.countPieces(b, 1) >= 2 && E.countPieces(b, -1) >= 2);
  }
});
test('the stated solution is a legal first move and wins material by force against every reply', () => {
  for (const p of P) {
    const b = parse(p.board), legal = E.genMoves(b, 1).find(m => m.from === p.from && m.path.join() === p.path.join());
    assert(legal, 'puzzle ' + p.n + ': solution is not legal');
    assert.strictEqual(E.moveText(legal), p.text);
    const g = net(b, legal);
    assert(g !== null && g >= 1, 'puzzle ' + p.n + ': does not win material');
    assert.strictEqual(g, p.gain, 'puzzle ' + p.n + ': gain mismatch');
  }
});
test('the solution is the ONLY first move that works, so there is one right answer', () => {
  for (const p of P) {
    const b = parse(p.board);
    const working = E.genMoves(b, 1).filter(m => { const g = net(b, m); return g !== null && g >= 1; });
    assert.strictEqual(working.length, 1, 'puzzle ' + p.n + ' has ' + working.length + ' winning first moves');
  }
});
test('puzzles get harder: the later half has more stones on the board than the first half', () => {
  const count = p => p.board.replace(/\./g, '').length;
  const half = Math.floor(P.length / 2);
  const avg = a => a.reduce((s, p) => s + count(p), 0) / a.length;
  assert(avg(P.slice(half)) > avg(P.slice(0, half)));
});
console.log('\nALL ' + n + ' PUZZLE TESTS PASSED');
