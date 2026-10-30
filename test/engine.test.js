const E = require('../src/engine.js');
const AI = require('../src/ai.js');
const assert = require('assert');

const sq = (r, c) => r * 8 + c;
function mk(spec) {
  const b = new Int8Array(64);
  for (const k in spec) {
    const [r, c] = k.split(',').map(Number);
    assert((r + c) % 2 === 1, 'test position ' + k + ' is not a dark square');
    b[sq(r, c)] = spec[k];
  }
  return b;
}
const state = (board, turn) => ({ board, turn, over: E.gameOver(board, turn) });
const dests = ms => ms.map(m => m.path[0]).sort((a, b) => a - b);

let n = 0;
function test(name, fn) { fn(); n++; console.log('PASS ' + String(n).padStart(2) + '  ' + name); }

test('setup: 12 pieces a side on the first three rows of dark squares', () => {
  const b = E.initialBoard();
  assert.strictEqual(E.countPieces(b, 1), 12);
  assert.strictEqual(E.countPieces(b, -1), 12);
  for (let i = 0; i < 64; i++) if (b[i]) {
    const r = i >> 3, c = i & 7;
    assert.strictEqual((r + c) % 2, 1);
    assert(b[i] > 0 ? r >= 5 : r <= 2);
  }
  assert.strictEqual(E.genMoves(b, 1).length, 7);
  assert.strictEqual(E.genMoves(b, -1).length, 7);
});

test('1. normal pieces only move diagonally forward, one square', () => {
  const m = E.genMoves(mk({ '4,3': 1 }), 1);
  assert.deepStrictEqual(dests(m), [sq(3, 2), sq(3, 4)]);
  const m2 = E.genMoves(mk({ '3,4': -1 }), -1);
  assert.deepStrictEqual(dests(m2), [sq(4, 3), sq(4, 5)]);
});

test('2. normal pieces cannot move backwards (or sideways)', () => {
  const b = mk({ '4,3': 1, '3,2': 1, '3,4': 1 });
  const m = E.genMoves(b, 1).filter(x => x.from === sq(4, 3));
  assert.strictEqual(m.length, 0, 'blocked man has no move although squares behind are empty');
});

test('3. captures are compulsory (no ordinary move allowed while a capture exists)', () => {
  const b = mk({ '4,3': 1, '3,4': -1, '6,1': 1 });
  const m = E.genMoves(b, 1);
  assert(m.length > 0 && m.every(x => x.caps.length === 1 && x.from === sq(4, 3)));
});

test('4. normal pieces capture forward only', () => {
  assert.strictEqual(E.genMoves(mk({ '4,3': 1, '5,2': -1 }), 1).every(x => x.caps.length === 0), true, 'no backward capture');
  const fwd = E.genMoves(mk({ '4,3': 1, '3,2': -1 }), 1);
  assert.strictEqual(fwd.length, 1);
  assert.deepStrictEqual(fwd[0].path, [sq(2, 1)]);
});

test('5. multiple captures are completed by the same piece', () => {
  // man at 6,1 can take 5,2 then 3,4. Another man could take one piece only.
  const b = mk({ '6,1': 1, '5,2': -1, '3,4': -1, '6,5': 1, '5,6': -1 });
  const m = E.genMoves(b, 1);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].from, sq(6, 1));
  assert.deepStrictEqual(m[0].path, [sq(4, 3), sq(2, 5)]);
  assert.deepStrictEqual(m[0].caps, [sq(5, 2), sq(3, 4)]);
  const after = E.applyMove(b, m[0]);
  assert.strictEqual(after[sq(5, 2)], 0); assert.strictEqual(after[sq(3, 4)], 0);
});

test('6. the sequence capturing the most pieces is mandatory', () => {
  // piece A (6,1) takes 2; piece B (6,7) can take only 1
  const b = mk({ '6,1': 1, '5,2': -1, '3,4': -1, '7,6': 1, '6,5': -1 });
  assert.strictEqual(E.genMoves(mk({ '7,6': 1, '6,5': -1 }), 1)[0].caps.length, 1, 'piece B alone can take one');
  const m = E.genMoves(b, 1);
  assert(m.length > 0 && m.every(x => x.caps.length === 2 && x.from === sq(6, 1)));
});

test('7. equal maximum sequences leave a free choice', () => {
  const b = mk({ '6,1': 1, '5,2': -1, '6,5': 1, '5,6': -1 });
  const m = E.genMoves(b, 1);
  assert.strictEqual(m.length, 2);
  assert.deepStrictEqual(m.map(x => x.from).sort(), [sq(6, 1), sq(6, 5)].sort());
  // one piece, two equal routes (left or right) also offered
  const b2 = mk({ '4,3': 1, '3,2': -1, '3,4': -1 });
  assert.strictEqual(E.genMoves(b2, 1).length, 2);
});

test('8. kings move diagonally any distance, in all four directions', () => {
  const m = E.genMoves(mk({ '4,3': 2 }), 1);
  assert.strictEqual(m.length, 13);
  assert(m.every(x => Math.abs((x.path[0] >> 3) - 4) === Math.abs((x.path[0] & 7) - 3)));
  assert(m.some(x => (x.path[0] >> 3) > 4), 'kings can move backwards');
});

test('9. kings capture from a distance', () => {
  const m = E.genMoves(mk({ '7,0': 2, '4,3': -1 }), 1);
  assert(m.length > 0);
  assert(m.every(x => x.from === sq(7, 0) && x.caps.length === 1 && x.caps[0] === sq(4, 3)));
});

test('10. kings choose among every empty landing square beyond the victim', () => {
  const m = E.genMoves(mk({ '7,0': 2, '4,3': -1 }), 1);
  assert.deepStrictEqual(m.map(x => x.path[0]).sort((a, b) => a - b),
    [sq(0, 7), sq(1, 6), sq(2, 5), sq(3, 4)].sort((a, b) => a - b));
  // landing stops at the next piece
  const m2 = E.genMoves(mk({ '7,0': 2, '4,3': -1, '1,6': 1 }), 1);
  assert.deepStrictEqual(m2.map(x => x.path[0]).sort((a, b) => a - b), [sq(2, 5), sq(3, 4)].sort((a, b) => a - b));
});

test('11. kings cannot jump two pieces at once, nor their own pieces', () => {
  assert(E.genMoves(mk({ '7,0': 2, '5,2': -1, '4,3': -1 }), 1).every(x => x.caps.length === 0), 'two adjacent enemies');
  assert(E.genMoves(mk({ '7,0': 2, '6,1': -1, '5,2': -1 }), 1).every(x => x.caps.length === 0), 'two adjacent enemies, close');
  assert(E.genMoves(mk({ '7,0': 2, '5,2': 1, '3,4': -1 }), 1).every(x => x.caps.length === 0), 'own piece in the way');
});

test('12. promotion ends the turn (quiet move and capture)', () => {
  const s = state(mk({ '1,2': 1, '6,7': -1 }), 1);
  const mv = E.legalMoves(s).find(m => m.path[0] === sq(0, 1));
  const next = E.play(s, mv);
  assert.strictEqual(next.board[sq(0, 1)], 2, 'crowned');
  assert.strictEqual(next.turn, -1, 'turn passes to the opponent');
  const s2 = state(mk({ '2,3': 1, '1,2': -1, '6,7': -1 }), 1);
  const next2 = E.play(s2, E.legalMoves(s2)[0]);
  assert.strictEqual(next2.board[sq(0, 1)], 2);
  assert.strictEqual(next2.turn, -1);
});

test('13. a piece crowned mid-sequence cannot keep capturing as a king', () => {
  // man 2,1 takes 1,2 and lands on 0,3 and is crowned. A king there could then take 2,5 (landing 3,6). It must not.
  const b = mk({ '2,1': 1, '1,2': -1, '2,5': -1, '7,6': -1 });
  const m = E.genMoves(b, 1);
  assert.strictEqual(m.length, 1);
  assert.strictEqual(m[0].caps.length, 1);
  assert.deepStrictEqual(m[0].path, [sq(0, 3)]);
  const after = E.applyMove(b, m[0]);
  assert.strictEqual(after[sq(0, 3)], 2);
  assert.strictEqual(after[sq(2, 5)], -1, 'the second enemy piece is still on the board');
  // control: the same king, already crowned, does continue
  const ctl = E.genMoves(mk({ '0,3': 2, '2,5': -1, '7,6': -1 }), 1);
  assert(ctl.length > 0 && ctl.every(x => x.caps[0] === sq(2, 5)));
});

test('14. the game ends when the opponent has no pieces left', () => {
  const s = state(mk({ '4,3': 1, '3,4': -1 }), 1);
  const next = E.play(s, E.legalMoves(s)[0]);
  assert.deepStrictEqual(next.over, { winner: 1, reason: 'no-pieces' });
});

test('15. the game ends when the opponent has pieces but no legal move', () => {
  const b = mk({ '0,1': -1, '1,0': 1, '1,2': 1, '2,3': 1 });
  const s = state(b, -1);
  assert.strictEqual(E.countPieces(b, -1), 1);
  assert.deepStrictEqual(s.over, { winner: 1, reason: 'no-moves' });
  assert.strictEqual(E.legalMoves(s).length, 0);
});

test('16. a king cannot capture and then reverse along the same diagonal', () => {
  // king 4,3 takes 3,4 going up-right and lands 2,5 or 1,6. Another enemy sits behind the start at 6,1 (down-left, same line).
  const b = mk({ '4,3': 2, '3,4': -1, '6,1': -1, '7,6': -1 });
  const m = E.genMoves(b, 1);
  assert(m.length > 0);
  assert(m.every(x => x.caps.length === 1), 'no second capture back along the line');
  // control: a turn onto a different diagonal is still allowed (king 7,0 takes 4,3, lands 2,5, then takes 1,4 up-left... via 2,5 -> 0,3)
  const ctl = E.genMoves(mk({ '7,0': 2, '4,3': -1, '1,4': -1 }), 1);
  assert(ctl.some(x => x.caps.length === 2), 'turning 90 degrees still works');
});

test('extra: illegal moves are rejected by the engine', () => {
  const s = E.createState(1);
  assert.throws(() => E.play(s, { from: sq(5, 0), path: [sq(2, 3)], caps: [] }));
});

test('extra: computer-vs-computer games only produce legal moves and never exceed 24 pieces', () => {
  function game(la, lb, plies) {
    let s = E.createState(1), k = 0;
    while (!s.over && k < plies) {
      const mv = AI.chooseMove(s.board, s.turn, s.turn === 1 ? la : lb);
      s = E.play(s, mv); k++;
      assert(E.countPieces(s.board, 1) + E.countPieces(s.board, -1) <= 24);
    }
    return { over: s.over, plies: k };
  }
  const easy = { depth: 2, rand: 0.3, time: 0 }, med = { depth: 4, rand: 0, time: 0 }, hard = { depth: 12, rand: 0, time: 120 };
  console.log('       easy v easy  ', game(easy, easy, 300));
  console.log('       medium v easy', game(med, easy, 300));
  console.log('       hard v medium', game(hard, med, 200));
});

console.log('\nALL ' + n + ' TESTS PASSED');
