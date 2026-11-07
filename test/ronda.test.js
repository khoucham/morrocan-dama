const assert = require('assert');
const R = require('../src/ronda.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('PASS ' + String(n).padStart(2) + '  ' + name); };
const card = (s, r) => s * 10 + r - 1;
const rnd = (seed => () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296)(7);

t('deal: 3 cards each, 4 table cards of different ranks and never four in a row', () => {
  for (let k = 0; k < 300; k++) {
    const g = R.newGame(k % 2 ? 4 : 2, 41, rnd, k % (k % 2 ? 4 : 2));
    g.hands.forEach(h => assert.strictEqual(h.length, 3));
    assert.strictEqual(g.table.length, 4);
    const ranks = g.table.map(R.rank).sort((a, b) => a - b);
    assert.strictEqual(new Set(ranks).size, 4, 'different ranks');
    assert(!(ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1 && ranks[3] === ranks[2] + 1), 'no 4-run');
    const all = [].concat(...g.hands, g.table, g.deck); assert.strictEqual(new Set(all).size, 40);
  }
});
t('capture: an equal card plus the unbroken run above it; nothing without a match', () => {
  const tb = [card(0, 6), card(1, 7), card(2, 8), card(3, 10)];       // 6 7 Sota(8) and Rey(10), no 9
  assert.deepStrictEqual(R.captures(tb, card(1, 6)).map(o => o.map(R.rank).sort((a, b) => a - b)), [[6, 7, 8]]);
  assert.deepStrictEqual(R.captures(tb, card(2, 3)), []);
  assert.deepStrictEqual(R.captures(tb, card(2, 10)).map(o => o.length), [1]);
});
t('a play that can capture must capture; one that cannot stays on the table', () => {
  const g = R.newGame(2, 41, rnd, 0);
  g.table = [card(0, 4), card(1, 9)]; g.hands[1] = [card(2, 4), card(2, 2), card(3, 5)]; g.hands[0] = [card(1, 1), card(1, 3), card(1, 6)]; g.turn = 1; g.deck = [1, 2, 3, 4, 5, 6, 7, 8];
  assert.throws(() => R.play(g, 1, card(2, 4), []), /illegal/);
  const r = R.play(g, 1, card(2, 4), [card(0, 4)]);
  assert.strictEqual(r.took.length, 1); assert.strictEqual(g.table.length, 1);
  R.play(g, 0, card(1, 3), []); assert.strictEqual(g.table.length, 2);
});
t('derba: matching the card the other side just left scores 1, but not through a run and not when the first card captured', () => {
  const g = R.newGame(2, 41, rnd, 0);
  g.table = [card(0, 9), card(1, 2)]; g.hands[1] = [card(2, 5), card(2, 1), card(3, 1)]; g.hands[0] = [card(1, 5), card(1, 3), card(1, 4)]; g.turn = 1; g.deck = [1, 2, 3, 4, 5, 6, 7, 8]; g.scores = [0, 0]; g.awards = [];
  R.play(g, 1, card(2, 5), []);                 // left a 5
  const r = R.play(g, 0, card(1, 5), [card(2, 5)]);
  assert.strictEqual(r.events[0].what, 'derba'); assert.strictEqual(g.scores[0], 1);
});
t('no derba when the match comes only through a run', () => {
  const g = R.newGame(2, 41, rnd, 0);
  g.table = [card(0, 3), card(1, 9)]; g.hands[1] = [card(2, 4), card(2, 1), card(3, 1)]; g.hands[0] = [card(1, 3), card(1, 6), card(1, 7)]; g.turn = 1; g.deck = [1, 2, 3, 4, 5, 6, 7, 8]; g.scores = [0, 0]; g.awards = [];
  R.play(g, 1, card(2, 4), []);                  // 4 left, run 3-4 now on table
  const r = R.play(g, 0, card(1, 3), [card(0, 3), card(2, 4)]);
  assert.strictEqual(r.events.filter(e => e.what === 'derba').length, 0);
});
t('derba 1, khamssa 5, bachra 10: the 2nd, 3rd and 4th card of the same number in a row, scored by whoever plays it', () => {
  const g = R.newGame(2, 41, rnd, 0);
  g.table = [card(0, 1), card(1, 9)]; g.deck = [1, 2, 3, 4, 5, 6, 7, 8]; g.scores = [0, 0]; g.awards = []; g.turn = 1; g.lastPlay = null; g.chain = null;
  g.hands = [[card(0, 5), card(1, 5), card(1, 3)], [card(2, 5), card(3, 5), card(3, 3)]]; g.combos = [[], []]; g.decl = []; g.played1 = []; g.resolved = true;
  R.play(g, 1, card(2, 5), []);                                         // first 5 stays
  let r = R.play(g, 0, card(0, 5), [card(2, 5)]);                      // 2nd 5 hits it: derba
  assert.strictEqual(r.events[0].what, 'derba'); assert.strictEqual(g.scores[0], 1);
  r = R.play(g, 1, card(3, 5), []);                                      // 3rd 5 right after: khamssa for the one who plays it
  assert.strictEqual(r.events[0].what, 'khamssa'); assert.strictEqual(g.scores[1], 5); assert.strictEqual(r.flash, 'Khamssa! +5');
  r = R.play(g, 0, card(1, 5), [card(3, 5)]);                            // 4th 5: 10 points
  assert.strictEqual(r.events[0].what, 'bachra'); assert.strictEqual(g.scores[0], 11);
});
t('missa: clearing the table scores 1, but not with the very last card', () => {
  const g = R.newGame(2, 41, rnd, 0);
  g.table = [card(0, 4)]; g.hands[1] = [card(2, 4), card(2, 2), card(3, 5)]; g.hands[0] = [card(1, 1), card(1, 3), card(1, 6)]; g.turn = 1; g.deck = [1, 2, 3, 4, 5, 6, 7, 8]; g.scores = [0, 0]; g.awards = [];
  const r = R.play(g, 1, card(2, 4), [card(0, 4)]);
  assert.strictEqual(r.events[0].what, 'missa'); assert.strictEqual(g.scores[1], 1);
  const h = R.newGame(2, 41, rnd, 0);
  h.table = [card(0, 4)]; h.deck = []; h.hands = [[], [card(2, 4)]]; h.turn = 1; h.scores = [0, 0]; h.awards = []; h.lastCapturer = null;
  const r2 = R.play(h, 1, card(2, 4), [card(0, 4)]);
  assert.strictEqual(r2.events.length, 0); assert(r2.ended);
});
t('ronda and tringa: best side scores them all; a tringa beats rondas', () => {
  const g = R.newGame(2, 41, rnd, 0);
  g.hands = [[card(0, 5), card(1, 5), card(2, 9)], [card(0, 2), card(1, 2), card(2, 7)]]; g.scores = [0, 0]; g.awards = []; g.dealPts = [0, 0]; g.over = false;
  R.announce(g); assert.deepStrictEqual(g.scores, [2, 0], 'higher pair takes both rondas: 1+1');
  g.hands = [[card(0, 5), card(1, 5), card(2, 5)], [card(0, 2), card(1, 2), card(2, 7)]]; g.scores = [0, 0]; g.awards = []; g.dealPts = [0, 0];
  R.announce(g); assert.deepStrictEqual(g.scores, [6, 0], 'tringa 5 + ronda 1');
  g.hands = [[card(0, 5), card(1, 5), card(2, 9)], [card(2, 5), card(3, 5), card(2, 7)]]; g.scores = [0, 0]; g.awards = []; g.dealPts = [0, 0];
  R.announce(g); assert.deepStrictEqual(g.scores, [1, 1], 'equal rondas: one each');
});
t('ronda must be declared before the first card of the hand; undeclared combinations do not score', () => {
  const mk = () => { const g = R.newGame(2, 41, rnd, 0); g.table = [card(0, 4), card(1, 10)]; g.deck = [1, 2, 3, 4, 5, 6, 7, 8]; g.scores = [0, 0]; g.awards = [];
    g.hands = [[card(0, 5), card(1, 5), card(2, 9)], [card(0, 2), card(1, 3), card(2, 7)]]; g.turn = 1; g.combos = [[{ what: 'ronda', rank: 5, pts: 1 }], []]; g.decl = []; g.played1 = []; g.resolved = false; return g; };
  let g = mk(); assert(!R.canDeclare(g, 0) && !R.canDeclare(g, 1), 'only the player to move, and only with a combination');
  R.play(g, 1, card(0, 2), [], false); assert(R.canDeclare(g, 0));
  let r = R.play(g, 0, card(2, 9), [], true); assert(r.ann && r.ann.items.length === 1 && g.scores[0] === 1, 'declared ronda scores after the first round');
  g = mk(); R.play(g, 1, card(0, 2), [], false); r = R.play(g, 0, card(2, 9), [], false);
  assert.strictEqual(g.scores[0], 0, 'not declared, not scored'); assert(!R.canDeclare(g, 0));
});
t('whole games for 2 and 4 players finish; cards over 20 score; reaching the target ends the game at once', () => {
  for (const players of [2, 4]) for (let k = 0; k < 60; k++) {
    const g = R.newGame(players, k % 2 ? 25 : 41, rnd, 0);
    let guard = 0;
    while (!g.over && guard++ < 4000) {
      const seat = g.turn, hand = g.hands[seat];
      const c = hand[Math.floor(rnd() * hand.length)], o = R.captures(g.table, c);
      const r = R.play(g, seat, c, o.length ? o[0] : []);
      if (r.ended && !g.over) { R.nextDeal(g, rnd); }
    }
    assert(g.over && g.scores[g.winner] >= g.target);
  }
});
console.log('\nALL ' + n + ' RONDA TESTS PASSED');
