const assert = require('assert');
const C = require('../src/chkobba.js');
let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let n = 0; const t = (name, fn) => { try { fn(); n++; } catch (e) { console.log('FAIL:', name); throw e; } };
const id = (s, r) => s * 10 + r - 1;   // suit 0 coins, 1 cups, 2 swords, 3 clubs

t('card ids: rank and suit round-trip, 7 of coins is the haya', () => {
  for (let i = 0; i < 40; i++) { const c = C.fromId(i); assert.strictEqual(C.cardId(c), i); assert(c.r >= 1 && c.r <= 10 && c.s >= 0 && c.s <= 3); }
  assert.strictEqual(C.rank(C.HAYA), 7); assert.strictEqual(C.suit(C.HAYA), 0);
});
t('captures: a matching card must be taken, otherwise any sum', () => {
  assert.deepStrictEqual(C.captures([id(0, 5), id(1, 2), id(2, 3)], id(1, 5)), [[id(0, 5)]]);          // the 5 only, not 2+3
  assert.deepStrictEqual(C.captures([id(0, 2), id(1, 3), id(2, 9)], id(1, 5)), [[id(0, 2), id(1, 3)]]);  // 2+3
  assert.strictEqual(C.captures([id(0, 1), id(1, 4), id(2, 2), id(3, 3)], id(1, 5)).length, 2);        // 1+4 and 2+3
  assert.strictEqual(C.captures([id(0, 9), id(1, 8)], id(2, 5)).length, 0);                            // nothing
  assert.strictEqual(C.captures([id(0, 6), id(1, 6)], id(2, 6)).length, 2);                            // either 6
});
t('deal with keep: cutter has 3 in total, table 4, dealer 3, others 3 (4 players)', () => {
  const g = C.newGame(4, 11, rnd, 0); assert.strictEqual(g.cutter, 3); assert.strictEqual(g.phase, 'cut');
  const top = g.cutCard; C.cutDecision(g, true);
  assert.deepStrictEqual(g.hands.map(h => h.length), [3, 3, 3, 3]); assert.strictEqual(g.table.length, 4);
  assert(g.hands[3].includes(top)); assert.strictEqual(g.deck.length, 40 - 16); assert.strictEqual(g.turn, 1);
});
t('deal with throw: the card goes on the table with 3 more, everyone gets 3 (2 players, target 21)', () => {
  const g = C.newGame(2, 21, rnd, 1); assert.strictEqual(g.target, 21); const top = g.cutCard; C.cutDecision(g, false);
  assert(g.table.includes(top)); assert.strictEqual(g.table.length, 4); assert.deepStrictEqual(g.hands.map(h => h.length), [3, 3]); assert.strictEqual(g.deck.length, 30);
  assert.strictEqual(g.turn, 0);
});
t('chkobba counts when the table is cleared, but not on the very last play', () => {
  const g = C.newGame(2, 11, rnd, 0); C.cutDecision(g, true);
  g.table = [id(0, 2)]; g.deck = [id(3, 9), id(3, 8), id(3, 7)]; g.hands = [[id(2, 10)], [id(1, 2)]]; g.turn = 1;
  const r = C.play(g, 1, id(1, 2), [id(0, 2)]); assert(r.chkobba); assert.strictEqual(g.chk[1], 1);
  const h = C.newGame(2, 11, rnd, 0); C.cutDecision(h, true);
  h.table = [id(0, 2)]; h.deck = []; h.hands = [[], [id(1, 2)]]; h.turn = 1;
  const r2 = C.play(h, 1, id(1, 2), [id(0, 2)]); assert(!r2.chkobba); assert.strictEqual(h.chk[1], 0); assert(r2.ended);
});
t('the last capturer takes what is left on the table', () => {
  const g = C.newGame(2, 11, rnd, 0); C.cutDecision(g, true);
  g.table = [id(0, 3), id(1, 5)]; g.deck = []; g.hands = [[], [id(2, 10)]]; g.turn = 1; g.lastCapturer = 0; g.piles = [[], []];
  const r = C.play(g, 1, id(2, 10), []);   // 10 cannot take 3 or 5 (sum 8): goes on the table, then the table goes to seat 0
  assert(r.ended); assert.strictEqual(g.table.length, 0); assert.strictEqual(g.piles[0].length, 3);
});
t('scoring: cards, coins, sevens (6s break ties), haya, chkobba', () => {
  const g = C.newGame(2, 11, rnd, 0); C.cutDecision(g, true);
  g.piles = [[C.HAYA, id(1, 7), id(2, 7), id(0, 1), id(0, 2), id(0, 3), id(0, 4), id(0, 5)], [id(3, 7), id(1, 1)]]; g.chk = [1, 0];
  const s = C.scoreDeal(g);
  // cards 8 v 2 -> 0 ; coins 6 v 0 -> 0 ; sevens 3 v 1 -> 0 ; haya -> 0 ; chkobba 1 -> 0  = 5
  assert.deepStrictEqual(s.points, [5, 0]);
  const h = C.newGame(2, 11, rnd, 0); C.cutDecision(h, true);
  h.piles = [[id(1, 7), id(2, 7), id(1, 6), id(2, 6)], [id(3, 7), id(0, 7), id(3, 6)]]; h.chk = [0, 0];
  const s2 = C.scoreDeal(h);   // sevens 2 v 2 -> sixes 2 v 1 -> team 0 ; haya -> team 1 ; cards 4 v 3 -> team 0
  assert.deepStrictEqual(s2.points, [2, 2]);   // team 0: cards + sevens; team 1: coins (it holds the haya) + haya
  assert(s2.items.some(i => i.what === 'sevens' && i.team === 0)); assert(s2.items.some(i => i.what === 'haya' && i.team === 1));
});
t('a tie on cards or coins gives no point; reaching the target with a tie keeps playing', () => {
  const g = C.newGame(2, 11, rnd, 0); C.cutDecision(g, true);
  g.piles = [[id(1, 1), id(1, 2)], [id(2, 1), id(2, 2)]]; g.chk = [0, 0]; g.scores = [10, 10];
  const s = C.scoreDeal(g); assert.deepStrictEqual(s.points, [0, 0]); assert(!g.over);
});
t('random full games (2 and 4 players, 11 and 21) always finish with 40 cards accounted for', () => {
  for (let k = 0; k < 40; k++) for (const players of [2, 4]) {
    const g = C.newGame(players, k % 2 ? 21 : 11, rnd, k % players); let guard = 0;
    while (!g.over && guard++ < 60) {
      C.cutDecision(g, rnd() < 0.5); let plays = 0;
      while (g.phase === 'play') {
        const seat = g.turn, hand = g.hands[seat], c = hand[Math.floor(rnd() * hand.length)];
        const opts = C.captures(g.table, c); C.play(g, seat, c, opts.length ? opts[Math.floor(rnd() * opts.length)] : []); assert(++plays < 60);
      }
      assert.strictEqual(g.piles[0].length + g.piles[1].length + g.table.length + g.deck.length + g.hands.reduce((a, h) => a + h.length, 0), 40);
      if (!g.over) C.nextDeal(g, rnd);
    }
    assert(g.over && g.scores[g.winner] >= g.target);
  }
});
t('illegal plays are refused and leave the hand untouched', () => {
  const g = C.newGame(2, 11, rnd, 0); C.cutDecision(g, true);
  assert.throws(() => C.play(g, 0, g.hands[0][0], []), /not your turn/);
  const seat = g.turn, c = g.hands[seat][0], before = g.hands[seat].length, opts = C.captures(g.table, c);
  if (opts.length) assert.throws(() => C.play(g, seat, c, []), /illegal capture/); else assert.throws(() => C.play(g, seat, c, [g.table[0]]), /nothing to capture/);
  assert.strictEqual(g.hands[seat].length, before);
});
console.log('ALL ' + n + ' CHKOBBA ENGINE TESTS PASSED');
