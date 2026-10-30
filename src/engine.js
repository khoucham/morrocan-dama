/* Moroccan Dama rules engine. No UI code in here.

   Board: Int8Array(64), index = row * 8 + col, row 0 is the top of the screen.
   Only dark squares ((row + col) is odd) are ever used.
   Values: 1 = bottom side man, 2 = bottom side king, -1 / -2 = top side.
   Side 1 moves up the board (row decreasing); side -1 moves down.

   Rules implemented (and nothing else):
   - Men move one square diagonally forward onto an empty square.
   - Men capture by jumping an adjacent enemy diagonally FORWARD onto the empty square behind it.
   - Kings slide any distance diagonally in all four directions.
   - Kings capture one enemy piece at a time from a distance, landing on ANY empty square beyond it.
     A king cannot jump two pieces in a row, and cannot jump its own pieces.
   - Capture is compulsory and the sequence capturing the most pieces must be chosen.
     Equal sequences may be chosen freely.
   - The capturing piece must keep capturing until it cannot. Captured pieces are removed at once.
   - A king may change diagonal between captures but may not reverse 180 degrees along the line it just used.
   - A man that reaches the far row is crowned immediately and its turn ends, even mid-capture.
   - A side loses when it has no pieces or no legal move. */
const DamaEngine = (function () {
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const inb = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const promoRow = side => (side === 1 ? 0 : 7);

  function initialBoard() {
    const b = new Int8Array(64);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 1) continue;
        if (r <= 2) b[r * 8 + c] = -1;
        if (r >= 5) b[r * 8 + c] = 1;
      }
    }
    return b;
  }

  /* All legal moves for `side`: { from, path: [landing squares], caps: [captured squares], promotes }.
     Captures are searched in full first, so the maximum-capture rule is enforced here
     and never in the UI. */
  function genMoves(board, side) {
    const results = [];
    let best = 0;
    const caps = [];
    const path = [];
    const promo = promoRow(side);

    function record(origin, promotes) {
      if (caps.length > best) { best = caps.length; results.length = 0; }
      if (caps.length === best) results.push({ from: origin, path: path.slice(), caps: caps.slice(), promotes: !!promotes });
    }

    function dfs(origin, pos, king, lastDir) {
      let extended = false;
      const r = pos >> 3, c = pos & 7;
      if (!king) {
        const dr = -side;
        for (const dc of [-1, 1]) {
          const r2 = r + 2 * dr, c2 = c + 2 * dc;
          if (!inb(r2, c2)) continue;
          const m = (r + dr) * 8 + (c + dc), t = r2 * 8 + c2;
          if (Math.sign(board[m]) === -side && board[t] === 0) {
            const saved = board[m];
            board[m] = 0;
            caps.push(m); path.push(t);
            extended = true;
            if (r2 === promo) record(origin, true);   // crowned: the turn ends here
            else dfs(origin, t, false);
            path.pop(); caps.pop();
            board[m] = saved;
          }
        }
      } else {
        for (const [dr, dc] of DIAG) {
          // after a capture the king may turn onto another diagonal but never reverse along the same line
          if (lastDir && dr === -lastDir[0] && dc === -lastDir[1]) continue;
          let rr = r + dr, cc = c + dc;
          while (inb(rr, cc) && board[rr * 8 + cc] === 0) { rr += dr; cc += dc; }
          if (!inb(rr, cc)) continue;
          const m = rr * 8 + cc;
          if (Math.sign(board[m]) !== -side) continue;   // own piece blocks
          const saved = board[m];
          board[m] = 0;
          let lr = rr + dr, lc = cc + dc;
          while (inb(lr, lc) && board[lr * 8 + lc] === 0) {   // any empty square beyond, stopping at the next piece
            const t = lr * 8 + lc;
            caps.push(m); path.push(t);
            extended = true;
            dfs(origin, t, true, [dr, dc]);
            path.pop(); caps.pop();
            lr += dr; lc += dc;
          }
          board[m] = saved;
        }
      }
      if (!extended && caps.length > 0) record(origin, false);
    }

    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p === 0 || Math.sign(p) !== side) continue;
      board[i] = 0; // the moving piece leaves its square while it jumps
      dfs(i, i, Math.abs(p) === 2);
      board[i] = p;
    }
    if (results.length) return results;

    const quiet = [];
    for (let i = 0; i < 64; i++) {
      const p = board[i];
      if (p === 0 || Math.sign(p) !== side) continue;
      const r = i >> 3, c = i & 7;
      if (Math.abs(p) === 1) {
        for (const dc of [-1, 1]) {
          const r1 = r - side, c1 = c + dc;
          if (inb(r1, c1) && board[r1 * 8 + c1] === 0) {
            quiet.push({ from: i, path: [r1 * 8 + c1], caps: [], promotes: r1 === promo });
          }
        }
      } else {
        for (const [dr, dc] of DIAG) {
          let rr = r + dr, cc = c + dc;
          while (inb(rr, cc) && board[rr * 8 + cc] === 0) {
            quiet.push({ from: i, path: [rr * 8 + cc], caps: [], promotes: false });
            rr += dr; cc += dc;
          }
        }
      }
    }
    return quiet;
  }

  function applyMove(board, mv) {
    const b = board.slice();
    const p = b[mv.from];
    b[mv.from] = 0;
    for (const x of mv.caps) b[x] = 0;
    const to = mv.path[mv.path.length - 1];
    let np = p;
    if (Math.abs(p) === 1 && (to >> 3) === promoRow(Math.sign(p))) np = p * 2;
    b[to] = np;
    return b;
  }

  function countPieces(board, side) {
    let n = 0;
    for (let i = 0; i < 64; i++) if (board[i] !== 0 && Math.sign(board[i]) === side) n++;
    return n;
  }

  /* null while play continues, otherwise { winner, reason } for the side to move being stuck. */
  function gameOver(board, turn) {
    if (countPieces(board, turn) === 0) return { winner: -turn, reason: 'no-pieces' };
    if (genMoves(board, turn).length === 0) return { winner: -turn, reason: 'no-moves' };
    return null;
  }

  function createState(first) {
    const board = initialBoard();
    const turn = first === -1 ? -1 : 1;
    return { board, turn, over: gameOver(board, turn) };
  }

  function legalMoves(state) {
    return state.over ? [] : genMoves(state.board, state.turn);
  }

  /* Validates the move against the generated list, then returns the next state. */
  function play(state, mv) {
    const legal = legalMoves(state).some(m => m.from === mv.from && m.path.join() === mv.path.join());
    if (!legal) throw new Error('Illegal move');
    const full = legalMoves(state).find(m => m.from === mv.from && m.path.join() === mv.path.join());
    const board = applyMove(state.board, full);
    const turn = -state.turn;
    return { board, turn, over: gameOver(board, turn), lastMove: full };
  }

  // The board is shown mirrored (long diagonal from the bottom-right), so files run right to left in index terms.
  const squareName = i => String.fromCharCode(97 + 7 - (i & 7)) + (8 - (i >> 3));
  function moveText(mv) {
    const sep = mv.caps.length ? '×' : '–';
    return squareName(mv.from) + sep + mv.path.map(squareName).join(sep);
  }

  return { initialBoard, genMoves, applyMove, countPieces, gameOver, createState, legalMoves, play, promoRow, squareName, moveText };
})();

if (typeof module !== 'undefined') module.exports = DamaEngine;
