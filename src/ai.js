/* Computer opponent: negamax with alpha-beta, a short capture search at the horizon,
   and iterative deepening on the hardest level. It only ever plays moves the engine generates. */
const DamaAI = (function (E) {
  const WIN = 100000;
  const TIMEOUT = { timeout: true };

  /* Score from side 1's point of view. */
  function evaluate(b) {
    let s = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (p === 0) continue;
      const r = i >> 3, c = i & 7;
      const edge = (c === 0 || c === 7) ? 3 : 0;
      if (p === 1) s += 100 + (7 - r) * 6 + (r === 1 ? 15 : 0) + (r === 7 ? 6 : 0) + edge;
      else if (p === -1) s -= 100 + r * 6 + (r === 6 ? 15 : 0) + (r === 0 ? 6 : 0) + edge;
      else {
        const centre = 3 - Math.abs(r - 3.5) * 0.5 - Math.abs(c - 3.5) * 0.5;
        if (p === 2) s += 330 + centre; else s -= 330 + centre;
      }
    }
    return s;
  }

  function orderMoves(moves, side) {
    if (moves.length < 2 || moves[0].caps.length > 0) return;
    const key = m => side * ((m.from >> 3) - (m.path[0] >> 3)) + (m.promotes ? 10 : 0);
    moves.sort((a, b) => key(b) - key(a));
  }

  function search(b, side, depth, alpha, beta, ply, q, ctx) {
    if (ctx.deadline && (++ctx.nodes & 511) === 0 && Date.now() > ctx.deadline) throw TIMEOUT;
    const moves = E.genMoves(b, side);
    if (moves.length === 0) return -WIN + ply;
    if (depth <= 0 && (moves[0].caps.length === 0 || q >= 6)) return side * evaluate(b);
    orderMoves(moves, side);
    let best = -Infinity;
    for (const mv of moves) {
      const score = -search(E.applyMove(b, mv), -side, depth - 1, -beta, -alpha, ply + 1,
        depth <= 0 ? q + 1 : q, ctx);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function searchRoot(board, side, moves, depth, ctx) {
    let bestScore = -Infinity, bestMove = moves[0], alpha = -Infinity;
    for (const mv of moves) {
      const score = -search(E.applyMove(board, mv), -side, depth - 1, -Infinity, -alpha, 1, 0, ctx);
      if (score > bestScore) { bestScore = score; bestMove = mv; }
      if (bestScore > alpha) alpha = bestScore;
    }
    return { move: bestMove, score: bestScore };
  }

  /* level: { depth, rand, time } */
  function chooseMove(board, side, level) {
    const moves = shuffle(E.genMoves(board, side));
    if (moves.length <= 1) return moves[0] || null;
    if (level.rand && Math.random() < level.rand) return moves[0];
    orderMoves(moves, side);
    if (!level.time) return searchRoot(board, side, moves, level.depth, { nodes: 0, deadline: 0 }).move;
    const deadline = Date.now() + level.time;
    let best = moves[0], ordered = moves;
    for (let d = 2; d <= level.depth; d++) {
      try {
        const res = searchRoot(board, side, ordered, d, { nodes: 0, deadline });
        best = res.move;
        ordered = [best].concat(ordered.filter(m => m !== best));
        if (Math.abs(res.score) > WIN / 2) break;
      } catch (e) {
        if (e === TIMEOUT) break;
        throw e;
      }
    }
    return best;
  }

  return { chooseMove, evaluate };
})(typeof module !== 'undefined' ? require('./engine.js') : DamaEngine);

if (typeof module !== 'undefined') module.exports = DamaAI;
