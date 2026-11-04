/* Chkobba (الشكبة) rules engine. Pure functions, no DOM, no network.
   Cards: { s: suit 0..3, r: rank 1..10 }, id = s*10 + (r-1).
   Suits (French deck): 0 diamonds (the "coins" suit), 1 hearts, 2 spades, 3 clubs.  Ranks 8, 9, 10 = Queen, Jack, King.
   Seats 0..n-1 are in order of play. The first to play after a deal is the seat after the dealer.
   The cutter is the seat just before the dealer. With 4 players, seats 0/2 and 1/3 are teammates. */
var Chkobba = (function () {
  var HAYA = 6;   // id of the 7 of coins (suit 0, rank 7)

  function cardId(c) { return c.s * 10 + c.r - 1; }
  function fromId(id) { return { s: Math.floor(id / 10), r: id % 10 + 1 }; }
  function newDeck() { var d = []; for (var i = 0; i < 40; i++) d.push(i); return d; }
  function shuffle(deck, rnd) {
    var a = deck.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function rank(id) { return id % 10 + 1; }
  function suit(id) { return Math.floor(id / 10); }
  function teamOf(state, seat) { return state.n === 4 ? seat % 2 : seat; }
  function teams(state) { return state.n === 4 ? 2 : state.n; }

  /* Start a game. target is 11 or 21. rnd is a function returning [0,1). */
  function newGame(n, target, rnd, dealer) {
    if (n !== 2 && n !== 4) throw new Error('2 or 4 players');
    var g = { n: n, target: target === 21 ? 21 : 11, dealer: dealer == null ? 0 : dealer, scores: [0, 0], over: false, winner: null, deals: 0 };
    if (n === 2) g.scores = [0, 0]; else g.scores = [0, 0];
    return startDeal(g, rnd);
  }

  /* Shuffle and cut. The cutter then decides: keep(true) or throw(false). */
  function startDeal(g, rnd) {
    var deck = shuffle(newDeck(), rnd);
    var k = 8 + Math.floor(rnd() * 25);               // cut: the lower part goes on top
    deck = deck.slice(k).concat(deck.slice(0, k));
    g.deck = deck; g.hands = []; for (var i = 0; i < g.n; i++) g.hands.push([]);
    g.table = []; g.piles = [[], []]; g.chk = [0, 0]; g.lastCapturer = null;
    g.cutter = (g.dealer - 1 + g.n) % g.n;
    g.cutCard = g.deck.shift();                       // only the cutter sees it until he decides
    g.phase = 'cut'; g.turn = g.cutter; g.dealtInfo = null; g.deals++;
    return g;
  }

  function dealThree(g, seat, count) { for (var i = 0; i < count; i++) g.hands[seat].push(g.deck.shift()); }

  function cutDecision(g, keep) {
    if (g.phase !== 'cut') throw new Error('not cutting');
    var order = []; for (var i = 1; i < g.n; i++) order.push((g.dealer + i) % g.n);   // right of dealer ... cutter
    if (keep) {
      g.hands[g.cutter].push(g.cutCard);
      order.forEach(function (s) { dealThree(g, s, s === g.cutter ? 2 : 3); });
      for (var t = 0; t < 4; t++) g.table.push(g.deck.shift());
    } else {
      g.table.push(g.cutCard);
      for (var t2 = 0; t2 < 3; t2++) g.table.push(g.deck.shift());
      order.forEach(function (s) { dealThree(g, s, 3); });
    }
    dealThree(g, g.dealer, 3);
    g.dealtInfo = { kept: !!keep };
    g.cutCard = null; g.phase = 'play'; g.turn = (g.dealer + 1) % g.n;
    return g;
  }

  /* All legal captures for playing card id: arrays of table ids. [] entry means none possible. */
  function captures(table, id) {
    var r = rank(id), same = table.filter(function (t) { return rank(t) === r; });
    if (same.length) return same.map(function (t) { return [t]; });   // a matching card must be the one taken
    var out = [], n = table.length;
    for (var m = 1; m < (1 << n); m++) {
      var sum = 0, pick = [];
      for (var i = 0; i < n; i++) if (m & (1 << i)) { sum += rank(table[i]); pick.push(table[i]); }
      if (sum === r) out.push(pick);
    }
    return out;
  }

  function handsEmpty(g) { return g.hands.every(function (h) { return !h.length; }); }

  /* Play card id; take = array of table ids (must be one of captures()) or [] to put it down (only if no capture exists). */
  function play(g, seat, id, take) {
    if (g.phase !== 'play' || g.turn !== seat) throw new Error('not your turn');
    var hand = g.hands[seat], hi = hand.indexOf(id);
    if (hi < 0) throw new Error('card not in hand');
    var opts = captures(g.table, id);
    take = take || [];
    var chkobba = false, team = teamOf(g, seat);
    hand.splice(hi, 1);
    if (opts.length) {
      var ok = opts.some(function (o) { return o.length === take.length && o.every(function (x) { return take.indexOf(x) >= 0; }); });
      if (!ok) { hand.splice(hi, 0, id); throw new Error('illegal capture'); }
      g.table = g.table.filter(function (t) { return take.indexOf(t) < 0; });
      g.piles[team].push(id); take.forEach(function (t) { g.piles[team].push(t); });
      g.lastCapturer = seat;
      if (!g.table.length) {
        var last = !g.deck.length && handsEmpty(g);
        if (!last) { g.chk[team]++; chkobba = true; }
      }
    } else {
      if (take.length) { hand.splice(hi, 0, id); throw new Error('nothing to capture'); }
      g.table.push(id);
    }
    var res = { seat: seat, card: id, took: take.slice(), chkobba: chkobba, dealtMore: false, ended: false };
    if (handsEmpty(g)) {
      if (g.deck.length) {                            // next three cards each, no cards on the table
        for (var i = 1; i <= g.n; i++) dealThree(g, (g.dealer + i) % g.n, 3);
        res.dealtMore = true; g.turn = (g.dealer + 1) % g.n;
      } else {
        if (g.table.length && g.lastCapturer != null) { var lt = teamOf(g, g.lastCapturer); g.table.forEach(function (t) { g.piles[lt].push(t); }); g.table = []; }
        res.ended = true; res.score = scoreDeal(g); g.phase = 'scored';
      }
    } else g.turn = (seat + 1) % g.n;
    return res;
  }

  /* Points for one deal, added to g.scores. Returns the breakdown. */
  function scoreDeal(g) {
    var T = teams(g), pts = [], i, items = [];
    for (i = 0; i < T; i++) pts.push(0);
    function most(vals, label, tie) {
      var best = -1, who = -1, tied = false;
      vals.forEach(function (v, t) { if (v > best) { best = v; who = t; tied = false; } else if (v === best) tied = true; });
      if (tied && tie) { var v2 = tie(), b2 = -1, w2 = -1, t2 = false; v2.forEach(function (v, t) { if (v > b2) { b2 = v; w2 = t; t2 = false; } else if (v === b2) t2 = true; }); if (!t2) { who = w2; tied = false; } }
      if (!tied && who >= 0 && best > 0) { pts[who]++; items.push({ what: label, team: who }); }
    }
    most(g.piles.slice(0, T).map(function (p) { return p.length; }), 'cards');
    most(g.piles.slice(0, T).map(function (p) { return p.filter(function (c) { return suit(c) === 0; }).length; }), 'coins');
    most(g.piles.slice(0, T).map(function (p) { return p.filter(function (c) { return rank(c) === 7; }).length; }), 'sevens',
      function () { return g.piles.slice(0, T).map(function (p) { return p.filter(function (c) { return rank(c) === 6; }).length; }); });
    for (i = 0; i < T; i++) if (g.piles[i].indexOf(HAYA) >= 0) { pts[i]++; items.push({ what: 'haya', team: i }); }
    for (i = 0; i < T; i++) if (g.chk[i]) { pts[i] += g.chk[i]; items.push({ what: 'chkobba', team: i, count: g.chk[i] }); }
    for (i = 0; i < T; i++) g.scores[i] += pts[i];
    var hi = Math.max.apply(null, g.scores.slice(0, T));
    if (hi >= g.target) {
      var leaders = []; for (i = 0; i < T; i++) if (g.scores[i] === hi) leaders.push(i);
      if (leaders.length === 1) { g.over = true; g.winner = leaders[0]; }
    }
    return { points: pts, items: items };
  }

  function nextDeal(g, rnd) { g.dealer = (g.dealer + 1) % g.n; return startDeal(g, rnd); }

  return { newGame: newGame, startDeal: startDeal, cutDecision: cutDecision, captures: captures, play: play, scoreDeal: scoreDeal, nextDeal: nextDeal,
    cardId: cardId, fromId: fromId, rank: rank, suit: suit, teamOf: teamOf, HAYA: HAYA };
})();
if (typeof module !== 'undefined') module.exports = Chkobba;
