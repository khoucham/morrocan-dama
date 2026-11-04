  /* ---------- Chkobba (الشكبة): drawn cards, table, computer opponents ---------- */
  var CKE = window.Chkobba;
  var CK = null;
  var SUITN = ['diamonds', 'hearts', 'spades', 'clubs'], SUITG = ['♦', '♥', '♠', '♣'];
  var RANKN = ['', 'Ace', '2', '3', '4', '5', '6', '7', 'Queen', 'Jack', 'King'], RANKL = ['', 'A', '2', '3', '4', '5', '6', '7', 'Q', 'J', 'K'];
  var PIPS = { 1: [[50, 50]], 2: [[50, 31], [50, 69]], 3: [[50, 28], [50, 50], [50, 72]], 4: [[38, 33], [62, 33], [38, 67], [62, 67]],
    5: [[38, 33], [62, 33], [50, 50], [38, 67], [62, 67]], 6: [[38, 30], [62, 30], [38, 50], [62, 50], [38, 70], [62, 70]],
    7: [[38, 30], [62, 30], [50, 40], [38, 50], [62, 50], [38, 70], [62, 70]] };
  function ckWait(ms) { return window.__ckFast ? 8 : ms; }
  function cardName(id) { return RANKN[CKE.rank(id)] + ' of ' + SUITN[CKE.suit(id)]; }
  function cardShort(id) { var r = CKE.rank(id); return (r >= 8 ? RANKN[r] + ' ' : RANKL[r]) + SUITG[CKE.suit(id)]; }

  /* the court figures are drawn here, one upper half that is repeated upside down */
  function courtSvg(r) {
    var line = 'stroke="#23201c" stroke-width=".8" stroke-linejoin="round"';
    var body = '<path d="M7 40 L11 25 Q30 15 49 25 L53 40 Z" fill="#D8382D" ' + line + '/>' +
      '<path d="M33 18.500 L49 25 L53 40 L20 40 Z" fill="#3E9B55" ' + line + '/>' +
      '<path d="M26 18 L40 40" stroke="#E9BF2D" stroke-width="2.600"/><path d="M12 30 L20 40" stroke="#E9BF2D" stroke-width="2"/>';
    var head = '<circle cx="30" cy="13.500" r="6.500" fill="#F3D9B5" ' + line + '/><circle cx="27.600" cy="13" r=".8" fill="#23201c"/><circle cx="32.400" cy="13" r=".8" fill="#23201c"/><path d="M28 16.500 Q30 17.800 32 16.500" fill="none" stroke="#23201c" stroke-width=".7"/>';
    var extra;
    if (r === 10) extra = '<path d="M23.500 14.500 Q30 29 36.500 14.500 Q30 21 23.500 14.500Z" fill="#E4DDCB" ' + line + '/>' +
      '<path d="M22.500 8.500 L23.500 1.500 L27.500 5.500 L30 0.500 L32.500 5.500 L36.500 1.500 L37.500 8.500 Z" fill="#E9BF2D" ' + line + '/>' +
      '<path d="M50 40 L50 22" stroke="#E9BF2D" stroke-width="2"/><circle cx="50" cy="20.500" r="2.200" fill="#E9BF2D" ' + line + '/>';
    else if (r === 8) extra = '<path d="M23.500 12 Q20 24 24.500 30 L27 19 Z" fill="#6B3E1E" ' + line + '/><path d="M36.500 12 Q40 24 35.500 30 L33 19 Z" fill="#6B3E1E" ' + line + '/>' +
      '<path d="M23 11 Q30 -1 37 11 Q30 6 23 11Z" fill="#3E9B55" ' + line + '/>' +
      '<path d="M25 7 L26 2.500 L28.500 5.500 L30 1.500 L31.500 5.500 L34 2.500 L35 7 Z" fill="#E9BF2D" ' + line + '/>' +
      '<path d="M48 40 Q52 30 46 24" fill="none" stroke="#E9BF2D" stroke-width="2"/><path d="M45 25 q-3 -5 1 -7 q3 2 -1 7" fill="#D8382D" ' + line + '/>';
    else extra = '<path d="M22.500 10 Q30 -2 37.500 10 Z" fill="#D8382D" ' + line + '/><path d="M22.500 10 H37.500" stroke="#E9BF2D" stroke-width="1.800"/>' +
      '<path d="M36 6 Q45 3 48 -2" fill="none" stroke="#E9BF2D" stroke-width="2.200" stroke-linecap="round"/><path d="M23.500 11 Q21 15 23.500 19" fill="none" stroke="#6B3E1E" stroke-width="2"/>' +
      '<path d="M49 40 L49 24 L53 22" fill="none" stroke="#23201c" stroke-width="1.200"/>';
    var half = '<g>' + body + head + extra + '</g>';
    return '<svg viewBox="0 0 60 80" aria-hidden="true"><rect x=".5" y=".5" width="59" height="79" fill="none" stroke="#23201c" stroke-width=".5"/>' + half + '<g transform="rotate(180 30 40)">' + half + '</g>' +
      '<path d="M0 80 L60 0" stroke="#23201c" stroke-width=".6" opacity=".5"/></svg>';
  }
  function cardSrc(n) { return (window.__cardSrc && window.__cardSrc[n]) || 'cards/' + n + '.png'; }
  function cardHtml(id, cls, tag) {
    var s = CKE.suit(id), r = CKE.rank(id), g = SUITG[s], col = s < 2 ? 'red' : 'blk';
    var corner = r >= 8 ? '<i class="cn ct"><u>' + g + '</u></i><i class="cn ct bt"><u>' + g + '</u></i>'     // court cards: the suit sign only, no letter
      : '<i class="cn"><b>' + RANKL[r] + '</b><u>' + g + '</u></i><i class="cn bt"><b>' + RANKL[r] + '</b><u>' + g + '</u></i>';
    var face;
    if (r <= 7) face = PIPS[r].map(function (p) { return '<span class="pip' + (r === 1 ? ' ace' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + g + '</span>'; }).join('');
    else face = '<div class="court">' + courtSvg(r) + '</div><img class="cimg" alt="" src="' + cardSrc((r === 10 ? 'K' : r === 8 ? 'Q' : 'J') + '-' + 'dhsc'[s]) + '" onerror="this.remove()">';
    tag = tag || 'button';
    return '<' + tag + (tag === 'button' ? ' type="button"' : '') + ' class="pc ' + col + (cls ? ' ' + cls : '') + '" data-id="' + id + '" aria-label="' + cardName(id) + '">' + corner + face + '</' + tag + '>';
  }
  function backs(n, cls) { var h = ''; for (var i = 0; i < n; i++) h += '<span class="pc back' + (cls ? ' ' + cls : '') + '"></span>'; return h; }

  /* ----- the computer ----- */
  function cval(id) { var r = CKE.rank(id), s = CKE.suit(id); return 1 + (id === CKE.HAYA ? 12 : 0) + (r === 7 ? 5 : 0) + (r === 6 ? 2 : 0) + (s === 0 ? 2 : 0); }
  function aiKeep(id) { var r = CKE.rank(id); return id === CKE.HAYA || r === 7 || CKE.suit(id) === 0 || r === 6 || Math.random() < 0.35; }
  function aiMove(g, seat) {
    if (CK && CK.level === 'easy' && Math.random() < 0.55) {      // easy: often just picks any legal move
      var all = [];
      g.hands[seat].forEach(function (c) { var o = CKE.captures(g.table, c); if (o.length) o.forEach(function (t) { all.push({ card: c, take: t }); }); else all.push({ card: c, take: [] }); });
      return all[Math.floor(Math.random() * all.length)];
    }
    var hand = g.hands[seat], best = null, others = g.hands.every(function (h, i) { return i === seat || !h.length; });
    var noise = CK && CK.level === 'strong' ? 0.05 : 0.8;
    function offer(sc, c, take) { sc += Math.random() * noise; if (!best || sc > best.sc) best = { sc: sc, card: c, take: take }; }
    hand.forEach(function (c) {
      var opts = CKE.captures(g.table, c);
      if (opts.length) opts.forEach(function (o) {
        var sc = cval(c) + o.reduce(function (a, t) { return a + cval(t); }, 0);
        var last = !g.deck.length && hand.length === 1 && others;
        if (o.length === g.table.length && !last) sc += 9;
        offer(sc, c, o);
      });
      else {
        var sum = g.table.reduce(function (a, t) { return a + CKE.rank(t); }, CKE.rank(c));
        offer(-cval(c) * 1.2 - (sum <= 10 ? 6 : 0), c, []);
      }
    });
    return best;
  }

  /* ----- a game ----- */
  function ckNames(n) { return n === 2 ? ['You', 'Computer'] : ['You', 'Karim', 'Salma', 'Youssef']; }
  function ckTeam(t) { return CK.n === 2 ? (t === 0 ? 'You' : 'Computer') : (t === 0 ? 'You & Salma' : 'Karim & Youssef'); }
  function ckStart(n, target, level) {
    if (CK) CK.token++;
    var token = CK ? CK.token : 0;
    CK = { n: n, token: token, names: ckNames(n), g: CKE.newGame(n, target, Math.random, Math.floor(Math.random() * n)), sel: null, opts: [], pick: [], busy: true, msg: '', last: null, show: null, quit: null, level: level || (CK && CK.level) || 'normal' };
    closeOverlay('#ck-deal'); closeOverlay('#ck-cut');
    show('ck'); ckRender(); ckCutPhase();
  }
  function ckLater(fn, ms) { var t = CK.token; setTimeout(function () { if (CK && CK.token === t) fn(); }, ckWait(ms)); }
  function ckCutPhase() {
    var g = CK.g; CK.busy = true; CK.sel = null; CK.pick = []; CK.opts = [];
    CK.msg = CK.names[g.dealer] + (g.dealer === 0 ? ' deal' : ' deals') + '. ' + CK.names[g.cutter] + (g.cutter === 0 ? ' cut the deck…' : ' cuts the deck…');
    ckRender();
    if (g.cutter === 0) {
      $('#ck-cut-card').innerHTML = cardHtml(g.cutCard, 'big', 'div');
      $('#ck-cut-name').textContent = cardName(g.cutCard);
      ckLater(function () { openOverlay('#ck-cut'); }, 700);
    } else ckLater(function () { ckApplyCut(aiKeep(g.cutCard)); }, 1300);
  }
  function ckApplyCut(keep) {
    var g = CK.g; closeOverlay('#ck-cut');
    var who = CK.names[g.cutter];
    CKE.cutDecision(g, keep);
    CK.msg = who + (keep ? ' kept the card.' : ' threw the card on the table.') + ' ' + g.table.length + ' cards on the table.'; CK.last = null;
    sfx.play('move'); ckRender(); ckLater(ckNext, 2200);
  }
  function ckNext() {
    var g = CK.g;
    if (g.phase !== 'play') return;
    if (g.turn === 0) { CK.busy = false; if (!CK.last) CK.msg = 'Your turn.'; ckRender(); sfx.play('turn'); }
    else { CK.busy = true; ckRender(); ckLater(function () { var m = aiMove(g, g.turn); ckDo(g.turn, m.card, m.take); }, 1000); }
  }
  function ckDo(seat, card, take) {
    var g = CK.g, before = g.table.slice(), r = CKE.play(g, seat, card, take), nm = CK.names[seat];
    // Show the move on the table first: the played card lands, the cards taken glow, then they fly to the one who took them.
    var dir = seat === 0 ? 'down' : g.n === 2 ? 'up' : ['down', 'right', 'up', 'left'][seat];
    CK.show = { table: before.concat([card]), played: card, took: take.slice(), dir: dir };
    CK.last = { seat: seat, card: card, took: take.slice(), chk: r.chkobba, text: nm + (seat === 0 ? ' took ' : ' took ') };
    CK.msg = take.length ? nm + ' took with ' + cardShort(card) + (r.chkobba ? ' — Chkobba!' : '.') : nm + (seat === 0 ? ' put down ' : ' puts down ') + cardShort(card) + '.';
    if (!take.length && seat !== 0) CK.msg = nm + ' put down ' + cardShort(card) + '.';
    if (r.dealtMore) CK.msg += g.deck.length ? ' New cards.' : ' New cards — last round! The last play can’t score a Chkobba.';
    sfx.play(r.chkobba ? 'king' : take.length ? 'capture' : 'move');
    if (take.length && (card === CKE.HAYA || take.indexOf(CKE.HAYA) >= 0)) { sfx.play('haya', r.chkobba ? 0.55 : 0.12); CK.msg += ' 7♦!'; CK.last.haya = true; }   // the seven of diamonds gets its own chime
    CK.sel = null; CK.pick = []; CK.opts = [];
    ckRender();
    if (r.ended) ckLater(function () { CK.show = null; ckRender(); ckShowDeal(r); }, 1700);
    else if (take.length) {
      var long = r.chkobba || CK.last.haya ? 1100 : 0;
      ckLater(function () { var els = document.querySelectorAll('#ck-table .pc.took, #ck-table .pc.played'); for (var i = 0; i < els.length; i++) els[i].classList.add('fly-' + dir); }, 1150 + long);
      ckLater(function () { CK.show = null; ckRender(); ckNext(); }, 1500 + long);
    } else ckLater(function () { CK.show = null; ckRender(); ckNext(); }, 800);
  }

  /* ----- what the player taps ----- */
  function ckReady() {
    if (CK.sel == null) return false;
    if (!CK.opts.length) return true;
    return CK.opts.some(function (o) { return o.length === CK.pick.length && o.every(function (x) { return CK.pick.indexOf(x) >= 0; }); });
  }
  function ckSelect(id) {
    var g = CK.g;
    if (CK.busy || g.phase !== 'play' || g.turn !== 0) return;
    if (CK.sel === id) { ckConfirm(); return; }
    CK.sel = id; CK.opts = CKE.captures(g.table, id); CK.pick = CK.opts.length === 1 ? CK.opts[0].slice() : [];
    ckRender();
  }
  function ckPickTable(id) {
    if (CK.busy || CK.sel == null || CK.opts.length < 2) return;
    if (!CK.opts.some(function (o) { return o.indexOf(id) >= 0; })) return;
    var i = CK.pick.indexOf(id); if (i >= 0) CK.pick.splice(i, 1); else CK.pick.push(id);
    ckRender();
  }
  function ckConfirm() {
    if (CK.busy || !ckReady()) return;
    CK.busy = true; ckDo(0, CK.sel, CK.pick.slice());
  }

  /* ----- the end of a deal and of the game ----- */
  var ITEM = { cards: 'Most cards', coins: 'Most diamonds', sevens: 'Most sevens', haya: '7 of diamonds', chkobba: 'Chkobba' };
  function ckShowDeal(r) {
    var g = CK.g, T = g.n === 4 ? 2 : g.n, rows = '';
    r.score.items.forEach(function (it) {
      rows += '<li class="' + (it.team === 0 ? 'us' : 'them') + '"><span>' + ITEM[it.what] + (it.count > 1 ? ' ×' + it.count : '') + '</span><b>' + ckTeam(it.team) + ' +' + (it.count || 1) + '</b></li>';
    });
    (function () {
      var h = '', T2 = g.n === 4 ? 2 : g.n;
      function cnt(q, f) { return (g.piles[q] || []).filter(f).length; }
      var rowsD = [['Cards', function (c) { return true; }], ['Diamonds', function (c) { return CKE.suit(c) === 0; }], ['Sevens', function (c) { return CKE.rank(c) === 7; }], ['Sixes', function (c) { return CKE.rank(c) === 6; }]];
      h += '<tr><th></th><th>' + esc(ckTeam(0)) + '</th><th>' + esc(ckTeam(1)) + '</th></tr>';
      rowsD.forEach(function (rw) { var a = cnt(0, rw[1]), b = cnt(1, rw[1]); h += '<tr><td>' + rw[0] + '</td><td class="' + (a > b ? 'win' : '') + '">' + a + '</td><td class="' + (b > a ? 'win' : '') + '">' + b + '</td></tr>'; });
      h += '<tr><td>7♦</td><td>' + ((g.piles[0] || []).indexOf(CKE.HAYA) >= 0 ? '✓' : '') + '</td><td>' + ((g.piles[1] || []).indexOf(CKE.HAYA) >= 0 ? '✓' : '') + '</td></tr>';
      h += '<tr><td>Chkobba</td><td>' + (g.chk[0] || 0) + '</td><td>' + (g.chk[1] || 0) + '</td></tr>';
      $('#ck-deal-cmp').innerHTML = h;
    })();
    $('#ck-deal-title').textContent = g.over ? (g.winner === 0 ? (CK.n === 2 ? 'You win!' : 'Your team wins!') : (CK.n === 2 ? 'Computer wins' : 'They win')) : 'Deal finished';
    $('#ck-deal-list').innerHTML = rows || '<li><span>No points this deal</span></li>';
    $('#ck-deal-total').innerHTML = '<span class="us"><b>' + g.scores[0] + '</b>' + ckTeam(0) + '</span><span class="to">to ' + g.target + '</span><span class="them"><b>' + g.scores[1] + '</b>' + ckTeam(1) + '</span>';
    $('#ck-next').textContent = g.over ? 'Play again' : 'Next deal';
    openOverlay('#ck-deal');
    sfx.play(g.over ? (g.winner === 0 ? 'win' : 'lose') : 'turn');
    ckRender();
  }

  /* ----- drawing the screen ----- */
  function ckSeat(el, seat, pos) {
    var g = CK.g, box = $(el);
    if (seat == null) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    var n = g.hands[seat].length, turn = g.turn === seat && g.phase === 'play';
    box.className = 'seat ' + pos + (turn ? ' turn' : '');
    box.innerHTML = '<span class="nm">' + esc(CK.names[seat]) + (g.dealer === seat ? ' <em>D</em>' : '') + '</span><span class="fan">' + backs(n) + '</span>';
  }
  /* make the cards on the table as large as they can be while all of them stay visible */
  function ckFit() {
    var t = $('#ck-table'), n = t.querySelectorAll('.pc').length;
    if (!n || !t.clientWidth) { t.style.removeProperty('--cw'); return; }
    var w = t.clientWidth - 18, h = t.clientHeight - 26, max = Math.min(78, Math.round(window.innerHeight * 0.1)), cw;
    for (cw = Math.max(max, 40); cw > 30; cw -= 2) {
      var per = Math.max(1, Math.floor((w + 8) / (cw + 8))), rows = Math.ceil(n / per);
      if (rows * (cw * 1.46 + 8) - 8 <= h) break;
    }
    var perRow = Math.max(1, Math.floor((w + 8) / (cw + 8))), nRows = Math.ceil(n / perRow), even = Math.ceil(n / nRows);
    t.style.setProperty('--cw', cw + 'px');
    var box = t.querySelector('.cards'); if (box) box.style.maxWidth = (even * (cw + 8) - 8) + 'px';   // 4 cards: 4 in a row or 2 and 2, never 3 and 1
  }
  window.addEventListener('resize', function () { if (CK && !$('#ck').hidden) ckFit(); });
  function ckRender() {
    var g = CK.g, n = g.n, teamOf = function (s) { return CKE.teamOf(g, s); };
    $('#ck-score').innerHTML = '<span class="us"><b>' + g.scores[0] + '</b>' + (n === 2 ? 'You' : 'Us') + '</span><span class="to">to ' + g.target + '</span><span class="them"><b>' + g.scores[1] + '</b>' + (n === 2 ? 'Computer' : 'Them') + '</span><span class="deck' + (g.deck.length ? '' : ' lastround') + '">' + (g.deck.length ? 'Deck ' + g.deck.length : 'Last round') + '</span>';
    (function () {
      var T = n === 4 ? 2 : n, h = '';
      for (var q = 0; q < T; q++) {
        var pl = g.piles[q] || [];
        var dm = pl.filter(function (c) { return CKE.suit(c) === 0; }).length, sv = pl.filter(function (c) { return CKE.rank(c) === 7; }).length;
        h += '<span class="pl ' + (q === 0 ? 'us' : 'them') + '"><i>' + esc(n === 2 ? (q === 0 ? 'You' : 'Computer') : (q === 0 ? 'Us' : 'Them')) + '</i><em><b>' + pl.length + '</b> <u>cards</u></em><em><b>' + dm + '</b> ♦</em><em><b>' + sv + '</b> <u>sevens</u></em>' + (pl.indexOf(CKE.HAYA) >= 0 ? '<em>7♦</em>' : '') + ((g.chk[q] || 0) ? '<em><b>' + g.chk[q] + '</b> <u>Chkobba</u></em>' : '') + '</span>';
      }
      $('#ck-piles').innerHTML = h;
    })();
    ckSeat('#ck-top', n === 2 ? 1 : 2, 'top');
    ckSeat('#ck-left', n === 4 ? 3 : null, 'left');
    ckSeat('#ck-right', n === 4 ? 1 : null, 'right');
    var picks = CK.pick, optIds = [];
    CK.opts.forEach(function (o) { o.forEach(function (t) { if (optIds.indexOf(t) < 0) optIds.push(t); }); });
    var sh = CK.show, shown = sh ? sh.table : g.table;
    $('#ck-table').innerHTML = shown.length ? '<div class="cards">' + shown.map(function (id) {
      if (sh) return cardHtml(id, id === sh.played ? (sh.took.length ? 'played' : 'landed') : sh.took.indexOf(id) >= 0 ? 'took' : '');
      return cardHtml(id, (optIds.indexOf(id) >= 0 ? 'opt ' : '') + (picks.indexOf(id) >= 0 ? 'picked' : ''));
    }).join('') + '</div>' : '<span class="empty">The table is empty</span>';
    ckFit();
    $('#ck-hand').innerHTML = g.hands[0].map(function (id) { return cardHtml(id, (CK.sel === id ? 'sel' : '') + (CK.busy || g.turn !== 0 ? ' wait' : '')); }).join('');
    // last play, shown as small cards
    var lp = CK.last, lh = '';
    if (lp) lh = cardHtml(lp.card, 'mini', 'div') + (lp.took.length ? '<span class="arrow">→</span>' + lp.took.map(function (t) { return cardHtml(t, 'mini', 'div'); }).join('') : '<span class="arrow">↓</span>');
    $('#ck-last').innerHTML = lh;
    $('#ck-status').textContent = CK.msg;
    $('#ck-chk').hidden = !(lp && lp.chk && CK.show);
    $('#ck-haya').hidden = !(lp && lp.haya && CK.show);
    var act = $('#ck-act'), label;
    if (g.phase !== 'play' || CK.busy || g.turn !== 0) { label = g.phase === 'play' && g.turn !== 0 ? 'Waiting for ' + CK.names[g.turn] + '…' : '…'; act.disabled = true; }
    else if (CK.sel == null) { label = 'Choose a card'; act.disabled = true; }
    else if (!CK.opts.length) { label = 'Put it down'; act.disabled = false; }
    else if (ckReady()) { label = 'Take'; act.disabled = false; }
    else { label = 'Choose cards to take'; act.disabled = true; }
    act.textContent = label;
    act.classList.toggle('primary', !act.disabled);
  }

  /* ----- wiring ----- */
  $('#ck-hand').addEventListener('click', function (e) { var c = e.target.closest('.pc'); if (c && CK) ckSelect(+c.getAttribute('data-id')); });
  $('#ck-table').addEventListener('click', function (e) { var c = e.target.closest('.pc'); if (c && CK) ckPickTable(+c.getAttribute('data-id')); });
  $('#ck-act').addEventListener('click', function () { if (CK) ckConfirm(); });
  $('#ck-keep').addEventListener('click', function () { if (CK && CK.g.phase === 'cut') ckApplyCut(true); });
  $('#ck-throw').addEventListener('click', function () { if (CK && CK.g.phase === 'cut') ckApplyCut(false); });
  $('#ck-next').addEventListener('click', function () {
    closeOverlay('#ck-deal');
    if (CK.g.over) { ckStart(CK.n, CK.g.target); return; }
    CKE.nextDeal(CK.g, Math.random); CK.last = null; ckCutPhase();
  });
  $('#ck-deal-menu').addEventListener('click', function () { CK.token++; closeOverlay('#ck-deal'); show('menu'); });
  $('#ck-menu').addEventListener('click', function () {
    var b = this;
    if (!CK.quit) { b.textContent = 'Tap again to quit'; CK.quit = setTimeout(function () { if (CK) { CK.quit = null; } b.textContent = '← Menu'; }, 3000); return; }
    clearTimeout(CK.quit); b.textContent = '← Menu'; CK.token++; CK.quit = null; closeOverlay('#ck-cut'); closeOverlay('#ck-deal'); show('menu');
  });
  $('#ck-help').addEventListener('click', function () { openOverlay('#ck-rules'); });
  $('#ck-rules-btn').addEventListener('click', function () { openOverlay('#ck-rules'); });
  $('#ck-rules-close').addEventListener('click', function () { closeOverlay('#ck-rules'); });
  $('#ck-online').addEventListener('click', function () { $('#ck-online-note').hidden = false; });
  $('#ck-start').addEventListener('click', function () {
    var v = function (nm) { var c = document.querySelector('input[name="' + nm + '"]:checked'); return c ? +c.value : null; };
    var n = v('ckn') || 2, t = v('ckt') || 11, lv = (document.querySelector('input[name="ckl"]:checked') || {}).value || 'normal';
    try { localStorage.setItem('dama-ck', JSON.stringify({ n: n, t: t })); } catch (e) {}
    ckStart(n, t, lv);
  });
  (function ckPrefs() {
    try { var s = JSON.parse(localStorage.getItem('dama-ck') || 'null'); if (s) { var a = document.querySelector('input[name="ckn"][value="' + s.n + '"]'), b = document.querySelector('input[name="ckt"][value="' + s.t + '"]'); if (a) a.checked = true; if (b) b.checked = true; } } catch (e) {}
  })();

  /* the home screen: pick the game, each game has its own menu */
  function setGame(which) {
    var ck = which === 'ck';
    $('#dama-setup').hidden = ck; $('#ck-setup').hidden = !ck;
    $('#hero-h1').textContent = ck ? 'Chkobba' : 'Moroccan Dama'; $('#hero-ar').textContent = ck ? '\u0627\u0644\u0634\u0643\u0628\u0629' : '\u0627\u0644\u0636\u0627\u0645\u0629 \u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629';
    document.title = ck ? 'Chkobba' : 'Moroccan Dama';
  }
  $('#tile-dama').addEventListener('click', function () { setGame('dama'); show('menu'); });
  $('#tile-ck').addEventListener('click', function () { setGame('ck'); show('menu'); });
  $('#menu-back').addEventListener('click', function () { document.title = 'Dama and Chkobba'; show('hub'); });
  setGame('dama'); document.title = 'Dama and Chkobba';
  window.__ck = function () { CK.render = ckRender; return CK; };   // lets the automated tests look at the game
