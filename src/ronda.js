/* Ronda (الروندا) rules engine, Moroccan way. Pure functions, no DOM, no network. Same shape as chkobba.js so the table code can use either.
   Cards: id = suit*10 + (rank-1), ranks 1..10. The 40-card Spanish deck: ranks 8, 9, 10 are Sota, Caballo and Rey (1-7, 10, 11, 12 on Spanish cards).
   The sequence order is simply 1,2,...,10 (the 7 is followed by the Sota).
   Seats 0..n-1 are in order of play, the first to play after a deal is the seat after the dealer. With 4 players, seats 0/2 and 1/3 are teams.
   Rules used (pagat.com/fishing/ronda): 3 cards each and 4 on the table; a card must capture an equal card plus the unbroken run above it;
   Ronda (a pair, 1 point) and Tringa (three of a kind, 5 points) are announced after every deal, the best side scores them all; Derba (matching the card
   just left by the opponent, 1); Missa (clearing the table, 1); at the end the side with more than 20 cards scores one point per extra card. */
var Ronda = (function () {
  function rank(id) { return id % 10 + 1; }
  function suit(id) { return Math.floor(id / 10); }
  function newDeck() { var d = []; for (var i = 0; i < 40; i++) d.push(i); return d; }
  function shuffle(deck, rnd) {
    var a = deck.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function teamOf(g, seat) { return g.n === 4 ? seat % 2 : seat; }

  function newGame(n, target, rnd, dealer) {
    if (n !== 2 && n !== 4) throw new Error('2 or 4 players');
    var g = { n: n, target: target === 25 ? 25 : 41, dealer: dealer == null ? 0 : dealer, scores: [0, 0], over: false, winner: null, deals: 0, game: 'ronda' };
    return startDeal(g, rnd);
  }

  function hasRun4(ranks) {
    var s = ranks.slice().sort(function (a, b) { return a - b; });
    return s[1] === s[0] + 1 && s[2] === s[1] + 1 && s[3] === s[2] + 1;
  }
  /* four table cards: all different ranks, and not four in a row (the bad card goes to the bottom and the next one is drawn) */
  function drawTable(g) {
    var t = [], i;
    for (i = 0; i < 4; i++) t.push(g.deck.shift());
    for (var guard = 0; guard < 60; guard++) {
      var bad = -1, seen = {};
      for (i = 0; i < 4; i++) { if (seen[rank(t[i])]) { bad = i; break; } seen[rank(t[i])] = true; }
      if (bad < 0 && hasRun4(t.map(rank))) bad = 3;
      if (bad < 0) break;
      g.deck.push(t[bad]); t[bad] = g.deck.shift();
    }
    return t;
  }

  function startDeal(g, rnd) {
    g.deck = shuffle(newDeck(), rnd);
    g.hands = []; for (var i = 0; i < g.n; i++) g.hands.push([]);
    for (var k = 0; k < 3; k++) for (i = 1; i <= g.n; i++) g.hands[(g.dealer + i) % g.n].push(g.deck.shift());
    g.table = drawTable(g);
    g.chain = null; g.piles = [[], []]; g.chk = [0, 0]; g.lastCapturer = null; g.lastPlay = null;
    g.awards = []; g.dealPts = [0, 0]; g.cutter = (g.dealer - 1 + g.n) % g.n; g.cutCard = null;
    g.phase = 'play'; g.turn = (g.dealer + 1) % g.n; g.deals++;
    dealCombos(g);
    return g;
  }
  function cutDecision(g) { return g; }   // no cut in Ronda

  function award(g, team, what, count) {
    if (!count) return;
    g.scores[team] += count; g.dealPts[team] += count;
    var last = g.awards[g.awards.length - 1];
    g.awards.push({ what: what, team: team, count: count });
    checkOver(g);
  }
  function checkOver(g) {
    if (g.over) return;
    for (var t = 0; t < 2; t++) if (g.scores[t] >= g.target) { g.over = true; g.winner = t; return; }
  }

  /* After every deal: who holds a Ronda (pair) or Tringa (three alike). The side with the best combination scores all of them. */
  function comboList(g) {
    var out = [];
    for (var s = 0; s < g.n; s++) {
      var cnt = {}, list = []; g.hands[s].forEach(function (c) { cnt[rank(c)] = (cnt[rank(c)] || 0) + 1; });
      for (var r in cnt) {
        if (cnt[r] >= 3) list.push({ what: 'tringa', rank: +r, pts: 5 });
        else if (cnt[r] === 2) list.push({ what: 'ronda', rank: +r, pts: 1 });
      }
      out.push(list);
    }
    return out;
  }
  /* a Ronda or Tringa only counts when its owner declares it before playing the first card of the hand */
  function dealCombos(g) { g.combos = comboList(g); g.decl = []; g.played1 = []; g.resolved = false; g.ann = null; }
  function canDeclare(g, seat) { return g.phase === 'play' && g.turn === seat && g.hands[seat].length === 3 && !g.played1[seat] && !!(g.combos && g.combos[seat] && g.combos[seat].length); }
  function announce(g, only) {
    var T = g.n === 4 ? 2 : g.n, combos = [], best = [-1, -1], t, i, cm = only ? g.combos : comboList(g);
    for (t = 0; t < T; t++) combos.push([]);
    for (var s = 0; s < g.n; s++) {
      if (only && !only[s]) continue;
      cm[s].forEach(function (c) { combos[teamOf(g, s)].push(c); });
    }
    function key(c) { return (c.what === 'tringa' ? 100 : 0) + c.rank; }
    for (t = 0; t < T; t++) combos[t].forEach(function (c) { if (key(c) > best[t]) best[t] = key(c); });
    var total = [0, 0], items = [];
    for (t = 0; t < T; t++) combos[t].forEach(function (c) { total[t] += c.pts; });
    var winner = -1;
    if (best[0] >= 0 || best[1] >= 0) {
      if (best[0] > best[1]) winner = 0; else if (best[1] > best[0]) winner = 1;
    }
    var gain = [0, 0];
    if (winner >= 0) gain[winner] = total[0] + total[1];
    else if (best[0] >= 0) { gain[0] = total[0]; gain[1] = total[1]; }     // exactly equal combinations: everybody keeps their own
    for (t = 0; t < T; t++) if (gain[t]) {
      var tri = combos[t].filter(function (c) { return c.what === 'tringa'; }).length, own = gain[t];
      items.push({ team: t, what: 'ronda', count: own, kinds: tri ? 'tringa' : 'ronda' });
      award(g, t, tri ? 'tringa' : 'ronda', own);
    }
    return { items: items, held: combos.map(function (c) { return c.length; }) };
  }

  /* A card must capture the equal card on the table and the unbroken run above it. Returns [] (nothing) or [[ids]]. */
  function captures(table, id) {
    var r = rank(id), m = -1, i;
    for (i = 0; i < table.length; i++) if (rank(table[i]) === r) { m = table[i]; break; }
    if (m < 0) return [];
    var out = [m], want = r + 1;
    for (;;) {
      var f = -1;
      for (i = 0; i < table.length; i++) if (rank(table[i]) === want) { f = table[i]; break; }
      if (f < 0) break;
      out.push(f); want++;
    }
    return [out];
  }

  function handsEmpty(g) { return g.hands.every(function (h) { return !h.length; }); }

  function play(g, seat, id, take, declare) {
    if (g.phase !== 'play' || g.turn !== seat) throw new Error('not your turn');
    var hand = g.hands[seat], hi = hand.indexOf(id), first = hand.length === 3 && !g.played1[seat];
    if (hi < 0) throw new Error('card not in hand');
    var opts = captures(g.table, id), team = teamOf(g, seat);
    take = take || [];
    var events = [];
    hand.splice(hi, 1);
    var captured = false, caida = false;
    if (opts.length) {
      var o = opts[0];
      if (o.length !== take.length || !o.every(function (x) { return take.indexOf(x) >= 0; })) { hand.splice(hi, 0, id); throw new Error('illegal capture'); }
      captured = true;
      var lp = g.lastPlay;
      caida = !!(lp && lp.stayed && lp.seat !== seat && teamOf(g, lp.seat) !== team && rank(lp.card) === rank(id) && take.indexOf(lp.card) >= 0);
      g.table = g.table.filter(function (t) { return take.indexOf(t) < 0; });
      g.piles[team].push(id); take.forEach(function (t) { g.piles[team].push(t); });
      g.lastCapturer = seat;
      var finalCard = !g.deck.length && handsEmpty(g);
      if (!g.table.length && !finalCard) { award(g, team, 'missa', 1); events.push({ what: 'missa', team: team }); }
      g.lastPlay = { seat: seat, card: id, stayed: false };
    } else {
      if (take.length) { hand.splice(hi, 0, id); throw new Error('nothing to capture'); }
      g.table.push(id);
      g.lastPlay = { seat: seat, card: id, stayed: true };
    }
    /* Derba / Khamssa: same number, played by the other side right after the previous card.
       2nd card = Derba (1 point), 3rd = Khamssa (5), 4th = 10. The side playing that card scores it. */
    var ch = g.chain, sameRank = ch && ch.rank === rank(id) && ch.team !== team, cn = sameRank ? ch.n + 1 : 1;
    if (cn === 2 && !caida) cn = 1;
    g.chain = { rank: rank(id), n: cn, team: team };
    if (cn >= 2) {
      var dw = cn === 2 ? 'derba' : cn === 3 ? 'khamssa' : 'bachra', dp = cn === 2 ? 1 : cn === 3 ? 5 : 10;
      award(g, team, dw, dp); events.push({ what: dw, team: team, count: dp });
    }
    var res = { seat: seat, card: id, took: take.slice(), chkobba: events.length > 0, events: events, dealtMore: false, ended: false, ann: null };
    res.flash = events.map(function (e) { return e.what === 'derba' ? 'Derba!' : e.what === 'khamssa' ? 'Khamssa! +5' : e.what === 'bachra' ? 'Bachra! +10' : 'Missa!'; }).join(' + ');
    if (first) g.played1[seat] = true;
    if (first && declare && g.combos && g.combos[seat] && g.combos[seat].length) g.decl[seat] = true;
    var done = 0; for (var q = 0; q < g.n; q++) if (g.played1[q]) done++;
    if (!g.resolved && done >= g.n) {                       // everybody has played a first card: the declared combinations are compared now
      g.resolved = true; res.ann = announce(g, g.decl); g.ann = res.ann;
    }
    if (g.over) {                                         // somebody reached the target in the middle of the deal
      res.ended = true; g.phase = 'scored'; res.score = { points: g.dealPts.slice(), items: g.awards.slice() };
      return res;
    }
    if (handsEmpty(g)) {
      if (g.deck.length) {
        for (var i = 1; i <= g.n; i++) for (var k = 0; k < 3; k++) g.hands[(g.dealer + i) % g.n].push(g.deck.shift());
        g.turn = (g.dealer + 1) % g.n; g.lastPlay = null; g.chain = null;
        res.dealtMore = true; dealCombos(g);
        if (g.over) { res.ended = true; g.phase = 'scored'; res.score = { points: g.dealPts.slice(), items: g.awards.slice() }; }
      } else {
        if (g.table.length && g.lastCapturer != null) { var lt = teamOf(g, g.lastCapturer); g.table.forEach(function (t) { g.piles[lt].push(t); }); g.table = []; }
        res.ended = true; res.score = scoreDeal(g); g.phase = 'scored';
      }
    } else g.turn = (seat + 1) % g.n;
    return res;
  }

  /* End of the last hand: the side with more than 20 cards scores one for each card above 20. */
  function scoreDeal(g) {
    var items = g.awards.slice(), pts = g.dealPts.slice();
    for (var t = 0; t < 2; t++) {
      var extra = g.piles[t].length - 20;
      if (extra > 0) { g.scores[t] += extra; pts[t] += extra; items.push({ what: 'cardsover', team: t, count: extra }); }
    }
    g.dealPts = pts;
    checkOver(g);
    if (!g.over && g.scores[0] === g.scores[1] && Math.max(g.scores[0], g.scores[1]) >= g.target) { /* cannot happen: only one side can have >20 cards */ }
    return { points: pts, items: items };
  }

  function nextDeal(g, rnd) { g.dealer = (g.dealer + 1) % g.n; return startDeal(g, rnd); }

  return { newGame: newGame, startDeal: startDeal, cutDecision: cutDecision, captures: captures, play: play, scoreDeal: scoreDeal, nextDeal: nextDeal, announce: announce, canDeclare: canDeclare,
    rank: rank, suit: suit, teamOf: teamOf, HAYA: -1 };
})();
if (typeof module !== 'undefined') module.exports = Ronda;
