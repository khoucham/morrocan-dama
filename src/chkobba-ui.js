  /* ---------- Chkobba (الشكبة): drawn cards, table, computer opponents ---------- */
  var CKE = window.Chkobba, CKG = 'chkobba';
  function ckUse(game) { CKG = game === 'ronda' ? 'ronda' : 'chkobba'; CKE = CKG === 'ronda' ? window.Ronda : window.Chkobba; }
  function gameTitle() { return CKG === 'ronda' ? 'Ronda' : 'Chkobba'; }
  var CK = null;
  var SUITN = ['diamonds', 'hearts', 'spades', 'clubs'], SUITG = ['♦', '♥', '♠', '♣'];
  var RANKN = ['', 'Ace', '2', '3', '4', '5', '6', '7', 'Queen', 'Jack', 'King'], RANKL = ['', 'A', '2', '3', '4', '5', '6', '7', 'Q', 'J', 'K'];
  var PIPS = { 1: [[50, 50]], 2: [[50, 31], [50, 69]], 3: [[50, 28], [50, 50], [50, 72]], 4: [[38, 33], [62, 33], [38, 67], [62, 67]],
    5: [[38, 33], [62, 33], [50, 50], [38, 67], [62, 67]], 6: [[38, 30], [62, 30], [38, 50], [62, 50], [38, 70], [62, 70]],
    7: [[38, 30], [62, 30], [50, 40], [38, 50], [62, 50], [38, 70], [62, 70]] };
  function ckWait(ms) { return window.__ckFast ? 8 : ms; }
  /* Ronda is played with Spanish cards: oros (coins), copas (cups), espadas (swords), bastos (clubs); 10, 11, 12 are Sota, Caballo, Rey */
  var SP_SUITN = ['oros', 'copas', 'espadas', 'bastos'], SP_RANKN = ['', 'As', '2', '3', '4', '5', '6', '7', 'Sota', 'Caballo', 'Rey'];
  function spNum(r) { return r >= 8 ? r + 2 : r; }
  function cardName(id) { var r = CKE.rank(id); return CKG === 'ronda' ? (r >= 8 ? SP_RANKN[r] : spNum(r)) + ' de ' + SP_SUITN[CKE.suit(id)] : RANKN[r] + ' of ' + SUITN[CKE.suit(id)]; }
  function cardShort(id) { var r = CKE.rank(id); return CKG === 'ronda' ? (r >= 8 ? SP_RANKN[r] : spNum(r)) + ' de ' + SP_SUITN[CKE.suit(id)] : (r >= 8 ? RANKN[r] + ' ' : RANKL[r]) + SUITG[CKE.suit(id)]; }
  var SP_ICON = [
    '<circle cx="20" cy="20" r="16.500" fill="#E3B23C" stroke="#8E5F0C" stroke-width="2"/><circle cx="20" cy="20" r="10.500" fill="none" stroke="#8E5F0C" stroke-width="1.600"/><circle cx="20" cy="20" r="4.500" fill="#8E5F0C"/>',
    '<path d="M8 6h24c0 11-4.500 18-12 18S8 17 8 6z" fill="#D2402F" stroke="#6E1810" stroke-width="2" stroke-linejoin="round"/><path d="M13 10c0 6 2 9 4 10" fill="none" stroke="#F4B6A8" stroke-width="1.800" stroke-linecap="round"/><rect x="18" y="23" width="4" height="9" fill="#6E1810"/><rect x="10" y="32" width="20" height="4.500" rx="2" fill="#6E1810"/>',
    '<path d="M20 1.500l4.500 7v18h-9v-18z" fill="#B6C8E0" stroke="#27456E" stroke-width="2" stroke-linejoin="round"/><path d="M20 5v20" stroke="#27456E" stroke-width="1.200"/><rect x="9" y="26" width="22" height="4.500" rx="2" fill="#27456E"/><rect x="17.500" y="30" width="5" height="8" rx="1.500" fill="#27456E"/>',
    '<path d="M20 2c7 0 10.500 5.500 8 11l-2.500 4 3.500 18c.5 2.500-1.500 4-4 4h-10c-2.500 0-4.500-1.500-4-4l3.500-18-2.500-4C9.500 7.500 13 2 20 2z" fill="#58963F" stroke="#27511C" stroke-width="2" stroke-linejoin="round"/><circle cx="16" cy="12" r="1.500" fill="#27511C"/><circle cx="24" cy="21" r="1.500" fill="#27511C"/><circle cx="17" cy="30" r="1.500" fill="#27511C"/>'
  ];
  function spIcon(s) { return '<svg viewBox="0 0 40 40" aria-hidden="true">' + SP_ICON[s] + '</svg>'; }
  function spCourt(r, s) {
    var fig = r === 10 ? '<path d="M8 36L11 18l7 7 6-12 6 12 7-7 3 18z" fill="#E3B23C" stroke="#8E5F0C" stroke-width="2" stroke-linejoin="round"/><circle cx="11" cy="16" r="2.500" fill="#D2402F"/><circle cx="24" cy="10" r="2.500" fill="#D2402F"/><circle cx="37" cy="16" r="2.500" fill="#D2402F"/>'
      : r === 9 ? '<path d="M10 40V20a14 14 0 0 1 28 0v20h-8V21a6 6 0 0 0-12 0v19z" fill="#9AA3AD" stroke="#3B434C" stroke-width="2" stroke-linejoin="round"/><circle cx="14" cy="26" r="1.800" fill="#3B434C"/><circle cx="34" cy="26" r="1.800" fill="#3B434C"/><circle cx="14" cy="34" r="1.800" fill="#3B434C"/><circle cx="34" cy="34" r="1.800" fill="#3B434C"/>'
      : '<path d="M6 40C8 22 18 12 36 10c-2 8-6 12-12 14 6 0 9 4 8 8z" fill="#C0452F" stroke="#6E1810" stroke-width="2" stroke-linejoin="round"/><path d="M36 10c4-2 6-6 6-9-5 0-8 3-10 6z" fill="#E3B23C" stroke="#8E5F0C" stroke-width="1.600" stroke-linejoin="round"/>';
    return '<div class="court sp"><svg class="sfig" viewBox="0 0 48 44" aria-hidden="true">' + fig + '</svg><span class="sbig">' + spIcon(s) + '</span><em>' + SP_RANKN[r].toUpperCase() + '</em></div>';
  }

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
  function cardSrc(n) { return (window.__cardSrc && window.__cardSrc[n]) || 'cards/' + n + (n.charAt(1) === '-' && n.charAt(0) === 'S' ? '.webp' : '.png'); }
  function cardHtml(id, cls, tag) {
    if (CKG === 'ronda') return spCardHtml(id, cls, tag);
    var s = CKE.suit(id), r = CKE.rank(id), g = SUITG[s], col = s < 2 ? 'red' : 'blk';
    var corner = r >= 8 ? '<i class="cn ct"><u>' + g + '</u></i><i class="cn ct bt"><u>' + g + '</u></i>'     // court cards: the suit sign only, no letter
      : '<i class="cn"><b>' + RANKL[r] + '</b><u>' + g + '</u></i><i class="cn bt"><b>' + RANKL[r] + '</b><u>' + g + '</u></i>';
    var face;
    if (r <= 7) face = PIPS[r].map(function (p) { return '<span class="pip' + (r === 1 ? ' ace' : '') + '" style="left:' + p[0] + '%;top:' + p[1] + '%">' + g + '</span>'; }).join('');
    else face = '<div class="court">' + courtSvg(r) + '</div><img class="cimg" alt="" src="' + cardSrc((r === 10 ? 'K' : r === 8 ? 'Q' : 'J') + '-' + 'dhsc'[s]) + '" decoding="sync" onerror="this.parentNode.classList.add(\'nocimg\');this.remove()">';
    tag = tag || 'button';
    return '<' + tag + (tag === 'button' ? ' type="button"' : '') + ' class="pc ' + col + (cls ? ' ' + cls : '') + '" data-id="' + id + '" aria-label="' + cardName(id) + '">' + corner + face + '</' + tag + '>';
  }
  (function () { var L = ['K', 'Q', 'J'], S = 'dhsc'; window.__ckImgs = []; for (var a = 0; a < 3; a++) for (var b = 0; b < 4; b++) { var im = new Image(); im.src = cardSrc(L[a] + '-' + S[b]); window.__ckImgs.push(im); } })();
  function spCardHtml(id, cls, tag) {
    tag = tag || 'button';
    var src = cardSrc('S-' + (id < 10 ? '0' : '') + id);
    return '<' + tag + (tag === 'button' ? ' type="button"' : '') + ' class="pc spanish photo ' + (cls ? cls : '') + '" data-id="' + id + '" aria-label="' + cardName(id) + '"><img alt="" src="' + src + '" decoding="sync" draggable="false"></' + tag + '>';
  }
  (function () { window.__spImgs = []; for (var i = 0; i < 40; i++) { var im = new Image(); im.src = cardSrc('S-' + (i < 10 ? '0' : '') + i); window.__spImgs.push(im); } })();
  function backs(n, cls) { var h = ''; for (var i = 0; i < n; i++) h += '<span class="pc back' + (cls ? ' ' + cls : '') + '"></span>'; return h; }

  /* ----- the computer ----- */
  function cval(id) { var r = CKE.rank(id), s = CKE.suit(id); return 1 + (id === CKE.HAYA ? 12 : 0) + (r === 7 ? 5 : 0) + (r === 6 ? 2 : 0) + (s === 0 ? 2 : 0); }
  function aiKeep(id) { var r = CKE.rank(id); return id === CKE.HAYA || r === 7 || CKE.suit(id) === 0 || r === 6 || Math.random() < 0.35; }
  function aiRonda(g, seat) {
    var hand = g.hands[seat], best = null, team = CKE.teamOf(g, seat), lp = g.lastPlay;
    var seen = {}; g.piles[0].concat(g.piles[1], g.table).forEach(function (c) { seen[CKE.rank(c)] = (seen[CKE.rank(c)] || 0) + 1; });
    hand.forEach(function (c) {
      var o = CKE.captures(g.table, c), sc;
      if (o.length) {
        sc = 10 + o[0].length * 3;
        if (lp && lp.stayed && o[0].indexOf(lp.card) >= 0 && CKE.teamOf(g, lp.seat) !== team) sc += 8;      // caida
        if (o[0].length === g.table.length) sc += 7;                                                          // missa
      } else {
        var same = hand.filter(function (x) { return CKE.rank(x) === CKE.rank(c); }).length;
        sc = -((4 - (seen[CKE.rank(c)] || 0)) * 1.5) + (same > 1 ? -4 : 0);   // a rank with many left unseen is risky to leave (caida), and keep pairs
      }
      sc += Math.random() * (CK && CK.level === 'strong' ? 0.3 : CK && CK.level === 'easy' ? 6 : 1.8);
      if (!best || sc > best.sc) best = { sc: sc, card: c, take: o.length ? o[0] : [] };
    });
    return best;
  }
  function aiMove(g, seat) {
    if (CKG === 'ronda') return aiRonda(g, seat);
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
  function ckMembers(q) { var n = CK.n, out = []; for (var s = 0; s < n; s++) if ((n === 4 ? s % 2 : s) === q) out.push(s); return out; }
  function ckTeam(t) {
    if (!CK.online) return CK.n === 2 ? (t === 0 ? 'You' : 'Computer') : (t === 0 ? 'You & Salma' : 'Karim & Youssef');
    return ckMembers(t).map(function (s) { return CK.names[s]; }).join(' & ');
  }
  function ckTeamShort(t) {
    if (!CK.online) return CK.n === 2 ? (t === 0 ? 'You' : 'Computer') : (t === 0 ? 'Us' : 'Them');
    if (CK.n === 2) return CK.names[t];
    return CK.watch ? 'Team ' + (t + 1) : (t === 0 ? 'Us' : 'Them');
  }
  function ckYou(s) { return s === 0 && !(CK.online && CK.watch); }
  /* what each team has taken so far: counted from the piles when I deal it, or sent by the server at an online table */
  function ckStats(g, q) {
    if (g.stats) { var s = g.stats[q]; return { pts: s.pts || 0, cards: s.cards, coins: s.coins, sevens: s.sevens, sixes: s.sixes, haya: !!s.haya, chk: g.chk[q] || 0 }; }
    var pl = g.piles[q] || [];
    return { pts: g.dealPts ? g.dealPts[q] : 0, cards: pl.length, coins: pl.filter(function (c) { return CKE.suit(c) === 0; }).length, sevens: pl.filter(function (c) { return CKE.rank(c) === 7; }).length,
      sixes: pl.filter(function (c) { return CKE.rank(c) === 6; }).length, haya: pl.indexOf(CKE.HAYA) >= 0, chk: g.chk[q] || 0 };
  }
  function ckStart(n, target, level) {
    if (CK) CK.token++;
    var token = CK ? CK.token : 0;
    CK = { n: n, token: token, names: ckNames(n), g: CKE.newGame(n, target, Math.random, Math.floor(Math.random() * n)), sel: null, opts: [], pick: [], busy: true, msg: '', last: null, show: null, quit: null, level: level || (CK && CK.level) || 'normal' };
    closeOverlay('#ck-deal'); closeOverlay('#ck-cut');
    show('ck'); ckRender(); ckCutPhase();
    if (CKG === 'ronda') ckAnnounceMsg(CK.g.ann);
  }
  function ckLater(fn, ms) { var t = CK.token; setTimeout(function () { if (CK && CK.token === t) fn(); }, ckWait(ms)); }
  function ckAnnounceMsg(ann) {
    if (!ann || !ann.items.length) return '';
    var m = ann.items.map(function (it) { var t = CK.online ? ckoTeam(it.team) : it.team; return (it.kinds === 'tringa' ? 'Tringa! ' : 'Ronda! ') + ckTeamShort(t) + ' +' + it.count; }).join(' · ');
    CK.msg = (CK.msg ? CK.msg + ' ' : '') + m; if (CK.g) ckRender();
    sfx.play('king', 0.4);
    return m;
  }
  function ckCutPhase() {
    var g = CK.g; CK.busy = true; CK.sel = null; CK.pick = []; CK.opts = [];
    if (g.phase === 'play') {                                  // Ronda has no cut: the cards are already dealt
      CK.msg = CK.names[g.dealer] + (ckYou(g.dealer) ? ' deal' : ' deals') + '.';
      ckRender(); ckLater(ckNext, 900); return;
    }
    CK.msg = CK.names[g.dealer] + (ckYou(g.dealer) ? ' deal' : ' deals') + '. ' + CK.names[g.cutter] + (ckYou(g.cutter) ? ' cut the deck…' : ' cuts the deck…');
    ckRender();
    if (CK.online) {
      if (ckYou(g.cutter) && g.cutCard != null) {
        $('#ck-cut-card').innerHTML = cardHtml(g.cutCard, 'big', 'div');
        $('#ck-cut-name').textContent = cardName(g.cutCard);
        ckLater(function () { if (CK.g.phase === 'cut') openOverlay('#ck-cut'); }, 500);
      }
      return;
    }
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
    if (CK.online) {
      CK.anim = false;
      if (g.phase === 'play') {
        if (g.turn === 0 && !CK.watch) { CK.busy = false; if (!CK.last) CK.msg = 'Your turn.'; ckRender(); sfx.play('turn'); try { if (navigator.vibrate && document.hidden) navigator.vibrate(60); } catch (e) {} }
        else { CK.busy = true; ckRender(); }
      }
      ckDrain();
      return;
    }
    if (g.phase !== 'play') return;
    if (g.turn === 0) { CK.busy = false; if (!CK.last) CK.msg = 'Your turn.'; ckRender(); sfx.play('turn'); }
    else { CK.busy = true; ckRender(); ckLater(function () { var m = aiMove(g, g.turn); ckDo(g.turn, m.card, m.take); }, 1000); }
  }
  function ckDo(seat, card, take) {
    var g = CK.g, before = g.table.slice(), r = CKE.play(g, seat, card, take);
    ckShowMove(seat, card, take, r, before);
  }
  function ckShowMove(seat, card, take, r, before) {
    var g = CK.g, nm = CK.names[seat];
    CK.anim = true;
    // Show the move on the table first: the played card lands, the cards taken glow, then they fly to the one who took them.
    var dir = seat === 0 ? 'down' : g.n === 2 ? 'up' : ['down', 'right', 'up', 'left'][seat];
    CK.show = { table: before.concat([card]), played: card, took: take.slice(), dir: dir };
    CK.last = { seat: seat, card: card, took: take.slice(), chk: r.chkobba, text: nm + ' took ', flash: CKG === 'ronda' ? (r.flash || '') : 'Chkobba!' };
    var flashWord = CKG === 'ronda' ? (r.flash || '') : 'Chkobba!';
    CK.msg = take.length ? nm + ' took with ' + cardShort(card) + (r.chkobba ? ' — ' + flashWord : '.') : nm + (ckYou(seat) ? ' put down ' : ' puts down ') + cardShort(card) + '.';
    if (!take.length && !ckYou(seat)) CK.msg = nm + ' put down ' + cardShort(card) + '.';
    if (r.dealtMore) CK.msg += g.deck.length ? ' New cards.' : (CKG === 'ronda' ? ' New cards — last round!' : ' New cards — last round! The last play can’t score a Chkobba.');
    if (r.ann && r.ann.items.length) { var annItems = CK.online ? r.ann.items.map(function (it) { return { team: it.team, count: it.count, kinds: it.kinds }; }) : r.ann.items; CK.msg += ' ' + annItems.map(function (it) { var t = CK.online ? ckoTeam(it.team) : it.team; return (it.kinds === 'tringa' ? 'Tringa! ' : 'Ronda! ') + ckTeamShort(t) + ' +' + it.count; }).join(' · '); }
    sfx.play(r.chkobba ? 'king' : take.length ? 'capture' : 'move');
    if (take.length && (card === CKE.HAYA || take.indexOf(CKE.HAYA) >= 0)) { sfx.play('haya', r.chkobba ? 0.55 : 0.12); CK.msg += ' 7♦!'; CK.last.haya = true; }   // the seven of diamonds gets its own chime
    CK.sel = null; CK.pick = []; CK.opts = [];
    ckRender();
    if (r.ended) ckLater(function () { CK.show = null; CK.anim = false; ckRender(); ckShowDeal(r); ckDrain(); }, 1700);
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
    if (CK.online && (CK.watch || !G || !G.peer)) return;
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
    CK.busy = true;
    if (CK.online) { netSend({ t: 'ckplay', card: CK.sel, take: CK.pick.slice() }); ckRender(); return; }
    ckDo(0, CK.sel, CK.pick.slice());
  }

  /* ----- the end of a deal and of the game ----- */
  var ITEM = { cards: 'Most cards', coins: 'Most diamonds', sevens: 'Most sevens', haya: '7 of diamonds', chkobba: 'Chkobba', ronda: 'Ronda', tringa: 'Tringa', caida: 'Caida', missa: 'Missa', cardsover: 'Cards over 20' };
  function ckShowDeal(r) {
    var g = CK.g, rows = '';
    var items = r && r.score ? r.score.items : [];
    items.forEach(function (it) {
      rows += '<li class="' + (it.team === 0 ? 'us' : 'them') + '"><span>' + ITEM[it.what] + (it.count > 1 ? ' ×' + it.count : '') + '</span><b>' + esc(ckTeam(it.team)) + ' +' + (it.count || 1) + '</b></li>';
    });
    (function () {
      var h = '', s0 = ckStats(g, 0), s1 = ckStats(g, 1);
      var rowsD = CKG === 'ronda' ? [['Cards', 'cards'], ['Points this deal', 'pts']] : [['Cards', 'cards'], ['Diamonds', 'coins'], ['Sevens', 'sevens'], ['Sixes', 'sixes']];
      h += '<tr><th></th><th>' + esc(ckTeam(0)) + '</th><th>' + esc(ckTeam(1)) + '</th></tr>';
      rowsD.forEach(function (rw) { var a = s0[rw[1]], b = s1[rw[1]]; h += '<tr><td>' + rw[0] + '</td><td class="' + (a > b ? 'win' : '') + '">' + a + '</td><td class="' + (b > a ? 'win' : '') + '">' + b + '</td></tr>'; });
      if (CKG !== 'ronda') {
        h += '<tr><td>7♦</td><td>' + (s0.haya ? '✓' : '') + '</td><td>' + (s1.haya ? '✓' : '') + '</td></tr>';
        h += '<tr><td>Chkobba</td><td>' + s0.chk + '</td><td>' + s1.chk + '</td></tr>';
      }
      $('#ck-deal-cmp').innerHTML = h;
    })();
    var title;
    if (!g.over) title = 'Deal finished';
    else if (CK.online) title = CK.watch ? ckTeam(g.winner) + (CK.n === 2 ? ' wins' : ' win') : g.winner === 0 ? (CK.n === 2 ? 'You win!' : 'Your team wins!') : (CK.n === 2 ? CK.names[1] + ' wins' : 'They win');
    else title = g.winner === 0 ? (CK.n === 2 ? 'You win!' : 'Your team wins!') : (CK.n === 2 ? 'Computer wins' : 'They win');
    $('#ck-deal-title').textContent = title;
    $('#ck-deal-list').innerHTML = rows || (r && r.score ? '<li><span>No points this deal</span></li>' : '');
    $('#ck-deal-total').innerHTML = '<span class="us"><b>' + g.scores[0] + '</b>' + esc(ckTeamShort(0)) + '</span><span class="to">to ' + g.target + '</span><span class="them"><b>' + g.scores[1] + '</b>' + esc(ckTeamShort(1)) + '</span>';
    var nx = $('#ck-next');
    nx.textContent = g.over ? 'Play again' : 'Next deal'; nx.disabled = false; nx.hidden = false;
    $('#ck-deal-menu').textContent = 'Main menu'; $('#ck-ready').textContent = '';
    if (CK.online) { $('#ck-deal-menu').textContent = 'Leave table'; ckoReadyNote(); }
    openOverlay('#ck-deal');
    sfx.play(g.over ? (g.winner === 0 && !CK.watch ? 'win' : CK.watch ? 'win' : 'lose') : 'turn');
    ckRender();
  }

  /* ----- drawing the screen ----- */
  function ckAvatar(id) { var h = hashId(id); return { emoji: AVATARS[h % AVATARS.length], hue: h % 360 }; }
  function ckChip(pe) { if (!pe) return ''; var av = ckAvatar(pe.id); return '<span class="sav" style="--hue:' + av.hue + '">' + av.emoji + '</span>'; }
  function ckSeat(el, seat, pos) {
    var g = CK.g, box = $(el);
    if (seat == null) { box.innerHTML = ''; box.hidden = true; return; }
    box.hidden = false;
    var n = g.hands[seat] ? g.hands[seat].length : 0, turn = g.turn === seat && g.phase === 'play';
    var pe = CK.online && CK.people ? CK.people[seat] : null;
    box.className = 'seat ' + pos + (turn ? ' turn' : '') + (pe && !pe.online ? ' off' : '') + (pe && voice.speaking[pe.id] ? ' speaking' : '');
    if (pe) box.setAttribute('data-pid', pe.id); else box.removeAttribute('data-pid');
    box.innerHTML = '<span class="nm">' + ckChip(pe) + '<span>' + esc(CK.names[seat]) + (g.dealer === seat && g.phase !== 'wait' ? ' <em>D</em>' : '') + '</span></span><span class="fan">' + backs(n) + '</span>';
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
  window.addEventListener('resize', function () { if (CK && (CK.online || !$('#ck').hidden)) ckFit(); });
  function ckRender() {
    var g = CK.g, n = g.n, teamOf = function (s) { return CKE.teamOf(g, s); };
    var deckTxt = g.phase === 'wait' ? '' : g.deck.length ? 'Deck ' + g.deck.length : 'Last round';
    $('#ck-score').innerHTML = '<span class="us"><b>' + g.scores[0] + '</b>' + esc(ckTeamShort(0)) + '</span><span class="to">to ' + g.target + '</span><span class="them"><b>' + g.scores[1] + '</b>' + esc(ckTeamShort(1)) + '</span>' + (deckTxt ? '<span class="deck' + (g.deck.length ? '' : ' lastround') + '">' + deckTxt + '</span>' : '');
    (function () {
      var T = n === 4 ? 2 : n, h = '';
      for (var q = 0; q < T; q++) {
        var st = ckStats(g, q);
        h += '<span class="pl ' + (q === 0 ? 'us' : 'them') + '"><i>' + esc(ckTeamShort(q)) + '</i><em><b>' + st.cards + '</b> <u>cards</u></em>' + (CKG === 'ronda' ? '<em><b>' + st.pts + '</b> <u>this deal</u></em>' : '<em><b>' + st.coins + '</b> ♦</em><em><b>' + st.sevens + '</b> <u>sevens</u></em>' + (st.haya ? '<em>7♦</em>' : '') + (st.chk ? '<em><b>' + st.chk + '</b> <u>Chkobba</u></em>' : '')) + '</span>';
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
    $('#ck-hand').innerHTML = CK.watch ? backs(g.hands[0].length) : g.hands[0].map(function (id) { return cardHtml(id, (CK.sel === id ? 'sel' : '') + (CK.busy || g.turn !== 0 ? ' wait' : '')); }).join('');
    var meBox = $('#ck-me');
    if (CK.online) {
      var pe0 = CK.people ? CK.people[0] : null;
      meBox.hidden = false;
      meBox.className = 'seat me' + (g.turn === 0 && g.phase === 'play' ? ' turn' : '') + (pe0 && voice.speaking[pe0.id] ? ' speaking' : '');
      if (pe0) meBox.setAttribute('data-pid', pe0.id);
      meBox.innerHTML = '<span class="nm">' + ckChip(pe0) + '<span>' + esc(CK.names[0]) + (g.dealer === 0 && g.phase !== 'wait' ? ' <em>D</em>' : '') + '</span></span>';
    } else meBox.hidden = true;
    // last play, shown as small cards
    var lp = CK.last, lh = '';
    if (lp) lh = cardHtml(lp.card, 'mini', 'div') + (lp.took.length ? '<span class="arrow">→</span>' + lp.took.map(function (t) { return cardHtml(t, 'mini', 'div'); }).join('') : '<span class="arrow">↓</span>');
    $('#ck-last').innerHTML = lh;
    $('#ck-status').textContent = CK.msg;
    $('#ck-chk').hidden = !(lp && lp.chk && CK.show); if (lp && lp.flash) $('#ck-chk').textContent = lp.flash;
    $('#ck-haya').hidden = !(lp && lp.haya && CK.show);
    var act = $('#ck-act'), label;
    if (CK.online && CK.watch) { label = 'You are watching'; act.disabled = true; }
    else if (CK.online && (g.phase === 'wait' || !G.peer)) { label = 'Waiting for players…'; act.disabled = true; }
    else if (g.phase !== 'play' || CK.busy || g.turn !== 0) { label = g.phase === 'play' && g.turn !== 0 ? 'Waiting for ' + CK.names[g.turn] + '…' : '…'; act.disabled = true; }
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
  function ckCutChoice(keep) {
    if (!CK || CK.g.phase !== 'cut') return;
    if (CK.online) { closeOverlay('#ck-cut'); netSend({ t: 'ckcut', keep: keep }); return; }
    ckApplyCut(keep);
  }
  $('#ck-keep').addEventListener('click', function () { ckCutChoice(true); });
  $('#ck-throw').addEventListener('click', function () { ckCutChoice(false); });
  $('#ck-next').addEventListener('click', function () {
    if (CK.online) {
      if (CK.watch) return;
      if (CK.ready.indexOf(CK.mySeat) < 0) CK.ready.push(CK.mySeat);
      this.disabled = true; this.textContent = 'Waiting for the others…'; ckoReadyNote();
      netSend({ t: 'ckready' });
      return;
    }
    closeOverlay('#ck-deal');
    if (CK.g.over) { ckStart(CK.n, CK.g.target); return; }
    CKE.nextDeal(CK.g, Math.random); CK.last = null; ckCutPhase();
  });
  $('#ck-deal-menu').addEventListener('click', function () {
    closeOverlay('#ck-deal');
    if (CK.online) { leaveTable(); return; }
    CK.token++; show('menu');
  });
  $('#ck-menu').addEventListener('click', function () {
    var b = this;
    if (!CK.quit) { b.textContent = 'Tap again to quit'; CK.quit = setTimeout(function () { if (CK) { CK.quit = null; } b.textContent = '← Menu'; }, 3000); return; }
    clearTimeout(CK.quit); b.textContent = '← Menu'; CK.token++; CK.quit = null; closeOverlay('#ck-cut'); closeOverlay('#ck-deal'); show('menu');
  });
  $('#ck-help').addEventListener('click', function () { openOverlay(CKG === 'ronda' ? '#ro-rules' : '#ck-rules'); });
  $('#ck-rules-btn').addEventListener('click', function () { openOverlay(CKG === 'ronda' ? '#ro-rules' : '#ck-rules'); });
  $('#ro-rules-close').addEventListener('click', function () { closeOverlay('#ro-rules'); });
  $('#ck-rules-close').addEventListener('click', function () { closeOverlay('#ck-rules'); });
  $('#ck-online').addEventListener('click', function () { openOnline('', 'ck'); });
  $('#ck-start').addEventListener('click', function () {
    var v = function (nm) { var c = document.querySelector('input[name="' + nm + '"]:checked'); return c ? +c.value : null; };
    var n = v('ckn') || 2, t = v('ckt') || (CKG === 'ronda' ? 41 : 11), lv = (document.querySelector('input[name="ckl"]:checked') || {}).value || 'normal';
    if (CKG !== 'ronda') try { localStorage.setItem('dama-ck', JSON.stringify({ n: n, t: t })); } catch (e) {}
    ckStart(n, t, lv);
  });
  (function ckPrefs() {
    try { var s = JSON.parse(localStorage.getItem('dama-ck') || 'null'); if (s) { var a = document.querySelector('input[name="ckn"][value="' + s.n + '"]'), b = document.querySelector('input[name="ckt"][value="' + s.t + '"]'); if (a) a.checked = true; if (b) b.checked = true; } } catch (e) {}
  })();


  /* =====================================================================
     ONLINE CHKOBBA: the server deals and shuffles and sends each person only their own cards.
     The table uses the same screen as Dama (top buttons, bottom bar, voice, chat). Here the server's view is
     turned around so that I am always seat 0 at the bottom, then the normal drawing code does the rest.
     ===================================================================== */
  var CKO_EMPTY_STATS = { cards: 0, coins: 0, sevens: 0, sixes: 0, haya: false };
  function ckoMount() {
    var play = $('#ck-play'), slot = $('#ck-slot');
    if (play.parentNode !== slot) slot.appendChild(play);
    var sc = $('#ck-score'), host = $('#ck-scoreslot');
    if (sc.parentNode !== host) host.appendChild(sc);
    $('#game').setAttribute('data-kind', 'ck');
    $('#sh-seats-ck').hidden = false;
  }
  function ckoUnmount() {
    var play = $('#ck-play');
    if (play.parentNode.id === 'ck-slot') {
      document.querySelector('.ck-wrap').appendChild(play);
      var bar = document.querySelector('.ck-bar'); bar.insertBefore($('#ck-score'), $('#ck-help'));
      $('#game').removeAttribute('data-kind'); $('#sh-seats-ck').hidden = true;
      closeOverlay('#ck-cut'); closeOverlay('#ck-deal');
    }
    if (CK && CK.online) { CK.token++; CK = null; }
  }
  function ckoBuild(v) {
    var n = CK.n, ms = CK.mySeat, i;
    function rot(s) { return (s - ms + n) % n; }
    var mt = n === 4 ? ms % 2 : ms, swap = mt === 1;
    if (!v) return { n: n, target: CK.target, dealer: 0, cutter: 0, phase: 'wait', turn: 0, scores: [0, 0], over: false, winner: null, deck: [], table: [], hands: ckoBlank(n), stats: [CKO_EMPTY_STATS, CKO_EMPTY_STATS], chk: [0, 0], deals: 0, cutCard: null };
    var hands = [];
    for (i = 0; i < n; i++) {
      var h;
      if (i === ms && !CK.watch) h = (v.hand || []).slice(); else { h = []; for (var k = 0; k < v.handN[i]; k++) h.push(-1); }
      hands[rot(i)] = h;
    }
    CK.turnSec = v.turnSec || 0; CK.deadline = v.tl != null ? Date.now() + v.tl : null;
    var deck = []; for (i = 0; i < v.deck; i++) deck.push(-1);
    function two(a) { return swap ? [a[1], a[0]] : [a[0], a[1]]; }
    return { n: n, target: v.target, dealer: rot(v.dealer), cutter: rot(v.cutter), phase: v.phase, turn: rot(v.turn), scores: two(v.scores), over: !!v.over,
      winner: v.winner == null ? null : (swap ? 1 - v.winner : v.winner), deck: deck, table: v.table.slice(), hands: hands, stats: two(v.stats), chk: two(v.chk), deals: v.deals, cutCard: v.cutCard };
  }
  setInterval(function () {
    var el = $('#ck-timer');
    if (!CK || !CK.online || !CK.deadline || !CK.g || (CK.g.phase !== 'play' && CK.g.phase !== 'cut') || (G && !G.peer)) { if (!el.hidden) el.hidden = true; return; }
    var left = Math.max(0, Math.ceil((CK.deadline - Date.now()) / 1000));
    var who = CK.g.phase === 'cut' ? CK.g.cutter : CK.g.turn;
    el.hidden = false; el.textContent = '⏱ ' + left + 's · ' + (ckYou(who) ? 'your turn' : CK.names[who]); el.className = 'ck-timer' + (left <= 10 ? ' low' : '');
  }, 500);
  function ckoBlank(n) { var h = []; for (var i = 0; i < n; i++) h.push([]); return h; }
  function ckoTeam(t) { return (CK.n === 4 ? CK.mySeat % 2 : CK.mySeat) === 1 ? 1 - t : t; }
  function ckoSyncPeople() {
    if (!CK || !G) return;
    var n = CK.n, seated = 0;
    CK.people = [];
    (G.crowd || []).forEach(function (e) { if (e.role === 'player' && e.seat != null) { CK.people[(e.seat - CK.mySeat + n) % n] = e; seated++; } });
    for (var s = 0; s < n; s++) { var e = CK.people[s]; CK.names[s] = (s === 0 && !CK.watch) ? 'You' : e ? e.name : 'Waiting…'; }
    G.peer = seated === n;
  }
  function ckoReadyNote() {
    if (!CK || !CK.online) return;
    var need = (G.crowd || []).filter(function (e) { return e.role === 'player' && e.online; }).length || CK.n;
    $('#ck-ready').textContent = CK.ready.length + ' of ' + need + ' ready';
  }
  function ckoShare() {
    var n = CK.n, c = G.crowd || [], seats = [], filled = 0, h = '';
    c.forEach(function (e) { if (e.role === 'player') { seats[e.seat] = e; filled++; } });
    for (var s = 0; s < n; s++) {
      var e = seats[s];
      h += '<div class="wr-seat' + (e ? ' on' : '') + (e && e.id === G.myId ? ' me' : '') + '"><b>' + (e ? esc((e.name || '?').trim().charAt(0).toUpperCase()) : '+') + '</b><small>' + (e ? esc(e.name) : 'Empty') + '</small>' + (n === 4 ? '<span class="tm">Team ' + (s % 2 + 1) + '</span>' : '') + '</div>';
    }
    var box = $('#sh-seats-ck');
    box.className = 'wr-seats' + (n === 4 ? ' four' : '');
    if (box.getAttribute('data-sig') !== h) { box.innerHTML = h; box.setAttribute('data-sig', h); }
    var full = filled === n, base = location.origin + location.pathname + '?g=' + (CKG === 'ronda' ? 'ronda' : 'chkobba') + '#' + G.code;
    $('#sh-code').textContent = G.code; $('#sh-link').value = base; $('#sh-wlink').value = base + '/watch';
    $('#sh-opp-block').hidden = full;
    $('#sh-count').textContent = full ? 'Everyone is seated · ready' : filled + ' seated · ' + (n - filled) + ' to go';
    $('#sh-info').textContent = gameTitle() + ' · ' + (n === 4 ? '4 players in teams' : '2 players') + ' · to ' + G.target;
    $('#sh-title').textContent = full ? 'Invite watchers' : (n === 2 ? 'Invite your friend' : 'Invite your friends');
    $('#sh-share').hidden = !navigator.share;
  }
  function ckoRender() {
    if (!G || G.kind !== 'ck' || !CK || !CK.online) return;
    ckoSyncPeople();
    var g = CK.g;
    if (!G.peer) { CK.waiting = true; CK.msg = 'Waiting for ' + (CK.n - (G.crowd || []).filter(function (e) { return e.role === 'player'; }).length || 1) + ' more to sit down…'; }
    else if (CK.waiting) { CK.waiting = false; CK.msg = g.phase === 'play' && g.turn === 0 && !CK.watch ? 'Your turn.' : (g.phase === 'wait' ? 'Starting…' : ''); }
    ckRender();
    $('#rl-eye').hidden = false; $('#rl-snd').classList.toggle('off', !sfx.isOn());
    $('#share-box').hidden = !(G.host);
    $('#voice-box').hidden = false; $('#chat-box').hidden = false;
    ckoShare();
    renderVoice();
    dockSync();
  }

  /* an arriving table message: wait while a move is still being shown */
  function ckDrain() {
    if (!CK || !CK.online) return;
    CK.anim = false;
    var m = CK.q.shift();
    if (m) ckoApply(m);
  }
  function ckoMsg(m) {
    if (!G || G.kind !== 'ck' || !CK || !CK.online) return;
    if (CK.anim) { CK.q.push(m); return; }
    ckoApply(m);
  }
  function ckoApply(m) {
    if (!G || !CK || !CK.online) return;
    if (m.t === 'ckready') { CK.ready = m.ready || []; if (!$('#ck-deal').hidden) { var nx = $('#ck-next'); nx.disabled = CK.ready.indexOf(CK.mySeat) >= 0; if (!nx.disabled) nx.textContent = CK.g.over ? 'Play again' : 'Next deal'; ckoReadyNote(); } return; }
    if (m.t === 'ckstate') {                                  // a new game or a new deal
      closeOverlay('#ck-deal'); closeOverlay('#ck-cut');
      CK.g = ckoBuild(m.view); CK.last = null; CK.show = null; CK.ready = []; CK.waiting = false; CK.token++;
      ckoRender(); ckoCutPhase();
      if (CKG === 'ronda' && m.view && m.view.ann) ckAnnounceMsg(m.view.ann);
      return;
    }
    if (m.t !== 'ckmoved') return;
    var ev = m.ev, before = CK.g.table.slice();
    CK.g = ckoBuild(m.view);
    if (ev.k === 'cut') {
      var seat = (ev.seat - CK.mySeat + CK.n) % CK.n;
      closeOverlay('#ck-cut');
      CK.msg = CK.names[seat] + (ev.keep ? ' kept the card.' : ' threw the card on the table.') + ' ' + ev.tableN + ' cards on the table.'; CK.last = null;
      CK.anim = true; sfx.play('move'); ckoRender(); ckLater(ckNext, 1800);
      return;
    }
    if (ev.k === 'play') {
      var rs = (ev.seat - CK.mySeat + CK.n) % CK.n;
      var score = ev.score ? { items: ev.score.items.map(function (it) { var o = {}; for (var k in it) o[k] = it[k]; o.team = ckoTeam(it.team); return o; }) } : null;
      CK.sel = null; CK.pick = []; CK.opts = [];
      ckShowMove(rs, ev.card, ev.took || [], { chkobba: !!ev.chk, flash: ev.flash || '', ann: ev.ann || null, dealtMore: !!ev.more, ended: !!ev.ended, score: score }, before);
      ckoRender();
    }
  }
  function ckoCutPhase() {
    CK.busy = true; CK.sel = null; CK.pick = []; CK.opts = [];
    if (CK.g.phase === 'cut') ckCutPhase();
    else if (CK.g.phase === 'play') ckNext();
    else ckRender();
  }

  function ckoJoined(m) {
    net.code = m.code; net.token = m.token; net.ice = m.ice; net.needResume = false; net.leaving = false;
    saveSession();
    ckUse(m.game);
    var watcher = m.role === 'watcher';
    joinAuto = null; closeOverlay('#joining');
    try { document.title = gameTitle(); var wantHash = '#' + m.code + (watcher ? '/watch' : ''); if (location.hash !== wantHash) history.replaceState(null, '', wantHash); } catch (e) {}
    clearTimeout(timer); token++; thinking = false; busy = false; moveQ = [];
    G = {
      online: true, kind: 'ck', role: watcher ? 'watcher' : 'player', myId: m.id, host: !!m.host, hostId: null, crowd: m.crowd || [], clock: null,
      cfg: { mode: 'online', level: 'medium', first: 'me' }, code: m.code, mySide: 0, n: m.n, target: m.target, names: { 1: null, '-1': null }, peer: false,
      board: new Int8Array(64), turn: 1, over: null, log: [], last: null, moves: [], hist: [], pending: false, drawOffered: false, drawSent: false, rematchPeer: false
    };
    var oldTok = CK ? CK.token : 0;
    CK = { online: true, n: m.n, target: m.target, token: oldTok + 1, watch: watcher, mySeat: watcher ? 0 : m.seat, names: [], people: [], g: null, sel: null, opts: [], pick: [],
      busy: true, msg: '', last: null, show: null, quit: null, q: [], anim: false, ready: (m.view && m.view.ready) || [], level: 'normal', waiting: false };
    CK.g = ckoBuild(m.view);
    closeOverlay('#online'); closeOverlay('#victory'); closeOverlay('#ck-cut'); closeOverlay('#ck-deal'); setBusyOnline(false);
    ckoMount();
    show('game');
    ckoSyncPeople();
    ckoRender();
    if (m.view) {
      if (m.view.phase === 'cut') ckCutPhase();
      else if (m.view.phase === 'play') ckNext();
      else if (m.view.phase === 'scored') { CK.msg = 'Deal finished.'; ckShowDeal(null); }
    }
    voiceSync();
    chatReset(m.chat || []);
  }
  function ckoCrowd() {
    ckoRender();
    if (CK && CK.online && CK.g && CK.g.phase === 'scored' && !$('#ck-deal').hidden) ckoReadyNote();
    voiceSync();
  }

  /* the home screen: pick the game, each game has its own menu */
  function setGame(which) {
    var ck = which === 'ck' || which === 'ro', ro = which === 'ro';
    if (ck) ckUse(ro ? 'ronda' : 'chkobba');
    $('#dama-setup').hidden = ck; $('#ck-setup').hidden = !ck;
    $('#hero-h1').textContent = ro ? 'Ronda' : ck ? 'Chkobba' : 'Moroccan Dama';
    $('#hero-ar').textContent = ro ? '\u0627\u0644\u0631\u0648\u0646\u062f\u0627' : ck ? '\u0627\u0644\u0634\u0643\u0628\u0629' : '\u0627\u0644\u0636\u0627\u0645\u0629 \u0627\u0644\u0645\u063a\u0631\u0628\u064a\u0629';
    if (ck) {
      var vals = ro ? [41, 25] : [11, 21], ins = document.querySelectorAll('input[name="ckt"]');
      for (var i = 0; i < ins.length; i++) { ins[i].value = vals[i]; ins[i].parentNode.lastChild.textContent = vals[i] + ' points'; }
      $('#ck-start').hidden = false;
    }
    document.title = ro ? 'Ronda' : ck ? 'Chkobba' : 'Moroccan Dama';
  }
  $('#tile-dama').addEventListener('click', function () { setGame('dama'); show('menu'); });
  $('#tile-ck').addEventListener('click', function () { setGame('ck'); show('menu'); });
  $('#tile-ro').addEventListener('click', function () { setGame('ro'); show('menu'); });
  $('#menu-back').addEventListener('click', function () { document.title = 'Dama, Chkobba and Ronda'; show('hub'); });
  setGame('dama'); document.title = 'Dama, Chkobba and Ronda';
  window.__ck = function () { CK.render = ckRender; return CK; };   // lets the automated tests look at the game
