/* Drives two browser windows (jsdom) against the real server through the real UI.
   WebRTC and the microphone do not exist in jsdom, so they are replaced with small mocks that
   exercise the page's signalling code. Real audio can only be checked on real devices. */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { start } = require('../app.js');
const P = require('../src/puzzles.js');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];

function installMocks(window) {
  window.__pcs = [];
  class MockPC {
    constructor() {
      this.signalingState = 'stable'; this.connectionState = 'new'; this.localDescription = null; this.closed = false;
      window.__pcs.push(this);
    }
    addTransceiver() {
      this.sender = { track: null, replaceTrack: async t => { this.sender.track = t; } };
      setTimeout(() => { if (!this.closed && this.onnegotiationneeded) this.onnegotiationneeded(); }, 0);
      return { sender: this.sender };
    }
    async setLocalDescription() {
      const type = this.signalingState === 'have-remote-offer' ? 'answer' : 'offer';
      this.localDescription = { type, sdp: 'mock-' + type };
      this.signalingState = type === 'offer' ? 'have-local-offer' : 'stable';
      if (type === 'answer') this._connected();
    }
    async setRemoteDescription(d) {
      this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable';
      if (d.type === 'answer') this._connected();
    }
    async addIceCandidate() {}
    restartIce() {}
    close() { this.closed = true; }
    _connected() { this.connectionState = 'connected'; if (this.onconnectionstatechange) this.onconnectionstatechange(); }
  }
  window.RTCPeerConnection = MockPC;
  window.MediaStream = class { constructor() {} };
  const track = { enabled: true, stop() { this.stopped = true; } };
  const stream = { getAudioTracks: () => [track], getTracks: () => [track] };
  Object.defineProperty(window.navigator, 'mediaDevices', { value: { getUserMedia: async () => stream }, configurable: true });
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  window.__track = track;
}

async function open(port, hash, session, nick) {
  const dom = await JSDOM.fromURL('http://127.0.0.1:' + port + '/' + (hash ? '#' + hash : ''), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(window) {
      installMocks(window);
      window.scrollTo = () => {};
      window.__sfxLog = [];
      window.addEventListener('error', e => errors.push(e.message));
      if (session) window.sessionStorage.setItem('dama-online', JSON.stringify(session));
      if (nick) window.localStorage.setItem('dama-nick', nick);
    }
  });
  return dom.window;
}

const $ = (w, s) => w.document.querySelector(s);
const click = (w, s) => $(w, s).dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const txt = (w, s) => $(w, s).textContent.replace(/\s+/g, ' ').trim();
const visible = (w, s) => !$(w, s).hidden;
async function until(fn, ms = 3000, what = 'condition') {
  const t = Date.now();
  while (Date.now() - t < ms) { if (fn()) return; await sleep(25); }
  throw new Error('timeout: ' + what);
}
/* click the first movable piece, then follow highlighted squares until the move is committed */
async function playOne(w) {
  const piece = w.document.querySelector('.piece.can, .piece.must');
  assert(piece, 'a movable piece exists');
  const flip = w.document.querySelector('.sq.dark').getAttribute('data-i') === '56';
  const col = Math.round(parseFloat(piece.style.left) / 12.5), row = Math.round(parseFloat(piece.style.top) / 12.5);
  const i = flip ? (7 - row) * 8 + col : row * 8 + (7 - col);   // screen position -> board index
  w.document.querySelector('.sq.dark[data-i="' + i + '"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  let guard = 0;
  while (w.document.querySelector('.sq.target') && guard++ < 10) w.document.querySelector('.sq.target').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
}

let n = 0;
async function test(name, fn) { await fn(); n++; console.log('PASS ' + String(n).padStart(2) + '  ' + name); }

(async () => {
  const srv = await start(0, '127.0.0.1');
  const port = srv.port;
  let A, B, code;

  await test('player A opens the online dialog, creates a table and sees the code and invite link', async () => {
    A = await open(port);
    assert(visible(A, '#hub') && !visible(A, '#menu'), 'the home screen shows the games');
    click(A, '#tile-dama'); assert(visible(A, '#menu') && !visible(A, '#hub'));
    click(A, '#open-online');
    assert(visible(A, '#online'));
    $(A, '#nick').value = 'Mohamed';
    click(A, '#create');
    await until(() => visible(A, '#game'), 3000, 'A in game');
    code = txt(A, '#sh-code');
    assert(/^[A-Z2-9]{5}$/.test(code));
    assert(visible(A, '#share-box') && visible(A, '#voice-box'));
    assert(/Waiting for your friend/.test(txt(A, '#status')));
    assert.strictEqual($(A, '#sh-link').value, 'http://127.0.0.1:' + port + '/#' + code);
    assert(/Mohamed \(you\) · White/.test(txt(A, '#who-bottom')));
    assert.strictEqual(A.document.querySelectorAll('.piece').length, 24);
    assert.strictEqual(A.document.querySelectorAll('.piece.can').length, 0, 'cannot move before a friend joins');
  });

  await test("player B taps the invite link and is at the table straight away, seeing the board from the second side", async () => {
    B = await open(port, code, null, 'Friend');
    await until(() => visible(B, '#game'), 3000, 'B in game without any dialog');
    assert(!visible(B, '#online') && !visible(B, '#joining'), 'no dialogs left open');
    assert.strictEqual(B.location.hash, '#' + code);
    await until(() => !visible(A, '#sh-opp-block'), 3000, 'A notified');
    assert(visible(A, '#share-box') && visible(A, '#sh-watch-block'), 'host can still invite watchers');
    assert(!visible(B, '#share-box'), 'the guest has no invite box');
    assert(/Friend \(you\) · Gold/.test(txt(B, '#who-bottom')));
    assert(/Mohamed · White/.test(txt(B, '#who-top')));
    assert(/Friend · Gold/.test(txt(A, '#who-top')));
    assert.strictEqual($(A, '.sq.dark').getAttribute('data-i'), '7', 'A: normal orientation, mirrored board');
    assert.strictEqual($(B, '.sq.dark').getAttribute('data-i'), '56', 'B: board turned around');
    // the long diagonal (8 squares) ends in the bottom-right corner for both players
    const bottomRight = w => [...w.document.querySelectorAll('.sq')].pop();
    assert(bottomRight(A).classList.contains('dark') && bottomRight(B).classList.contains('dark'), 'bottom-right square is playable');
    assert(![...A.document.querySelectorAll('.sq')].slice(56, 57)[0].classList.contains('dark'), 'bottom-left square is not playable');
    await until(() => A.document.querySelectorAll('.piece.can').length === 4, 2000, 'A can move');
    assert.strictEqual(B.document.querySelectorAll('.piece.can').length, 0, 'B waits');
  });

  await test('moves made in one window appear in the other, alternating turns, for several moves', async () => {
    for (let k = 0; k < 6; k++) {
      const mover = k % 2 === 0 ? A : B, watcher = k % 2 === 0 ? B : A;
      await until(() => mover.document.querySelectorAll('.piece.can, .piece.must').length > 0, 3000, 'mover ready ' + k);
      await playOne(mover);
      await until(() => watcher.document.querySelectorAll('#log li:not(.empty)').length >= Math.ceil((k + 1) / 2) && txt(watcher, '#log').length > 0, 3000, 'watcher log ' + k);
      await until(() => !watcher.document.querySelector('.piece.moving') && !mover.document.querySelector('.piece.moving'), 3000, 'animation done');
    }
    const la = txt(A, '#log'), lb = txt(B, '#log');
    assert.strictEqual(la, lb, 'both move lists match');
    assert(/1\.\S+–\S+\S+–\S+/.test(la) || la.length > 10, 'moves logged: ' + la);
    const count = w => [...w.document.querySelectorAll('.piece')].length;
    assert.strictEqual(count(A), count(B));
  });

  await test('voice: both tap the big mic, signalling is relayed and both show Connected', async () => {
    click(A, '#vc-mic'); click(B, '#vc-mic');
    await until(() => A.document.querySelector('#vc-mic').classList.contains('live') && B.document.querySelector('#vc-mic').classList.contains('live'), 2000, 'mics live');
    assert.strictEqual(txt(A, '#vc-miclab'), 'Mute');
    await until(() => /Connected/.test(txt(A, '#vc-stat')) && /Connected/.test(txt(B, '#vc-stat')), 4000, 'both connected: ' + txt(A, '#vc-stat') + ' | ' + txt(B, '#vc-stat'));
    assert(/mic is live/.test(txt(A, '#vc-stat')));
    const open = w => w.__pcs.filter(pc => !pc.closed);
    assert(open(A).length === 1 && open(A)[0].sender.track === A.__track, 'microphone track attached to the call');
    assert.strictEqual(A.document.querySelectorAll('.pp').length, 2, 'two avatars in the call');
    click(A, '#vc-mic');
    assert.strictEqual(A.__track.enabled, false, 'mute disables the track');
    assert.strictEqual(txt(A, '#vc-miclab'), 'Unmute');
    assert(A.document.querySelector('#vc-mic').classList.contains('muted'));
    assert(A.document.querySelector('.pp[data-pid] .mbadge'), 'muted badge on my own avatar');
    click(A, '#vc-mic');
    assert.strictEqual(A.__track.enabled, true);
    assert.strictEqual(txt(A, '#vc-miclab'), 'Mute');
  });

  let W;
  await test('a friend opens the watch link: joins straight in, sees the game, cannot play, starts muted', async () => {
    W = await open(port, code + '/watch', null, 'Fan');
    await until(() => visible(W, '#game'), 3000, 'watcher in game');
    assert(!visible(W, '#joining'));
    assert.strictEqual(W.location.hash, '#' + code + '/watch');
    assert(/You are watching/.test(txt(W, '#status')) || /watching/.test(txt(W, '#status')), 'status: ' + txt(W, '#status'));
    assert.strictEqual(W.document.querySelectorAll('.piece.can, .piece.must').length, 0, 'nothing to move');
    assert(!visible(W, '#odraw') && !visible(W, '#resign') && !visible(W, '#share-box'));
    assert.strictEqual(W.document.querySelectorAll('.piece').length, A.document.querySelectorAll('.piece').length, 'sees the same board as the players');
    await until(() => W.document.querySelectorAll('.pp').length === 3 && A.document.querySelectorAll('.pp').length === 3 && B.document.querySelectorAll('.pp').length === 3, 3000, 'three avatars everywhere');
    assert.strictEqual(txt(W, '#vc-miclab'), 'Join voice');
    click(W, '#vc-mic');
    await until(() => /Muted by host/.test(txt(W, '#vc-miclab')), 2000, 'locked mic');
    assert.strictEqual(W.__track.enabled, false, 'a muted watcher sends nothing');
    assert(visible(W, '#cw-hand'), 'hand button offered');
    assert(visible(A, '#vc-people .pm') && !visible(B, '#cw-hand'), 'only the host gets mute buttons');
    assert.strictEqual(B.document.querySelectorAll('.pm').length, 0, 'a player who is not the host has no mute buttons');
    assert.strictEqual(W.document.querySelectorAll('.pm').length, 0);
    assert(/Fan/.test(A.document.querySelector('.pp:not(.p-h):not(.p-a) .pn').textContent));
  });

  await test('the host sees the raised hand and unmutes; the watcher goes live; the host mutes again', async () => {
    click(W, '#vc-hand');
    await until(() => A.document.querySelector('.hand-badge'), 2000, 'host sees hand');
    await until(() => /Hand raised/.test(txt(W, '#vc-handlab')), 2000, 'watcher label');
    click(A, '#vc-people .pm');                         // Unmute
    await until(() => W.document.querySelector('#vc-mic').classList.contains('live'), 2000, 'watcher live');
    assert.strictEqual(W.__track.enabled, true, 'track on once unmuted');
    assert(!A.document.querySelector('.hand-badge'), 'hand goes down');
    assert.strictEqual(txt(A, '#vc-people .pm'), 'Mute');
    assert(!visible(W, '#cw-hand'));
    click(A, '#vc-people .pm');                         // Mute again
    await until(() => /Muted by host/.test(txt(W, '#vc-miclab')), 2000, 'muted again');
    assert.strictEqual(W.__track.enabled, false);
    click(A, '#vc-people .pm');                         // leave the watcher unmuted for the group test
    await until(() => W.__track.enabled === true, 2000, 'unmuted for the rest');
  });

  await test('everyone is connected to everyone: three people, each with two calls', async () => {
    click(B, '#vc-mic'); click(B, '#vc-mic');           // B is already live: toggle off and on
    await until(() => [A, B, W].every(w => /Connected/.test(txt(w, '#vc-stat'))), 5000, 'all connected: ' + [A, B, W].map(w => txt(w, '#vc-stat')).join(' | '));
    [A, B, W].forEach(w => assert.strictEqual(w.__pcs.filter(pc => !pc.closed).length, 2, 'two live calls each'));
    assert(/2 people|3 people/.test(txt(W, '#vc-count')));
    assert.strictEqual(txt(W, '#vc-count'), '3 people');
  });

  await test('the watcher sees the players\' moves and the same move list', async () => {
    await until(() => A.document.querySelectorAll('.piece.can, .piece.must').length > 0 || B.document.querySelectorAll('.piece.can, .piece.must').length > 0, 3000, 'someone can move');
    const mover = A.document.querySelectorAll('.piece.can, .piece.must').length ? A : B;
    const before = W.document.querySelectorAll('#log li:not(.empty)').length;
    await playOne(mover);
    await until(() => W.document.querySelectorAll('#log li:not(.empty)').length > before || txt(W, '#log') !== 'No moves yet.', 3000, 'watcher log updates');
    await until(() => !mover.document.querySelector('.piece.moving') && !W.document.querySelector('.piece.moving'), 3000);
    assert.strictEqual(txt(W, '#log'), txt(A, '#log'));
  });

  await test('a third person opening the play link when both seats are taken is let in as a watcher', async () => {
    const X = await open(port, code, null, 'Late');
    await until(() => visible(X, '#game'), 3000, 'late guest in');
    assert.strictEqual(X.location.hash, '#' + code + '/watch');
    assert(!visible(X, '#odraw'));
    await until(() => A.document.querySelectorAll('.pp').length === 4, 3000, 'four avatars');
    X.__es && X.__es.forEach(e => e.close()); X.close();
    await until(() => A.document.querySelectorAll('.pp:not(.off)').length === 3, 3000, 'avatar goes away when they leave');
  });

  await test('chat: a message from anyone shows for everyone, tags are shown as plain text, sounds and reactions work', async () => {
    const say = (w, text) => { $(w, '#chat-in').value = text; $(w, '#chat-form').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true })); };
    assert(visible(A, '#chat-box') && visible(B, '#chat-box') && visible(W, '#chat-box'));
    assert(/No messages yet/.test(txt(A, '#chat-log')));
    say(A, 'salam <img src=x onerror=alert(1)>');
    await until(() => [A, B, W].every(w => /salam/.test(txt(w, '#chat-log'))), 3000, 'everyone sees it');
    for (const w of [A, B, W]) assert.strictEqual(w.document.querySelectorAll('#chat-log img').length, 0, 'no markup injected');
    assert(/Mohamed salam <img/.test(txt(B, '#chat-log')), 'text shown literally: ' + txt(B, '#chat-log'));
    assert(A.document.querySelector('#chat-log li.me') && !B.document.querySelector('#chat-log li.me'), 'own message is marked');
    assert.strictEqual($(A, '#chat-in').value, '', 'input cleared');
    assert(B.__sfxLog.includes('pop') && !A.__sfxLog.includes('pop'), 'others hear a pop, the sender does not');
    await sleep(520);
    say(W, 'hello from the stands');
    await until(() => [A, B, W].every(w => /stands/.test(txt(w, '#chat-log'))), 3000, 'watcher can chat too');
    // reactions float over the board for everyone, with the sender name
    click(B, '#reacts [data-e="🔥"]');
    await until(() => [A, W].every(w => w.document.querySelector('#floats .fr .fe')), 3000, 'reaction floats');
    assert.strictEqual(A.document.querySelector('#floats .fe').textContent, '🔥');
    assert(/Friend/.test(A.document.querySelector('#floats .fn').textContent));
    assert.strictEqual(B.document.querySelector('#floats .fn').textContent, 'You');
  });

  await test('sounds: moves, captures and pings are played, and the sound switch is remembered', async () => {
    assert(A.__sfxLog.includes('move') || A.__sfxLog.includes('capture'), 'move sounds: ' + A.__sfxLog.join());
    assert(A.__sfxLog.includes('join'), 'join ping when people arrive: ' + A.__sfxLog.join());
    assert(B.__sfxLog.includes('turn') || A.__sfxLog.includes('turn'), 'your-turn ping');
    assert.strictEqual(txt(A, '#game .snd-toggle'), 'Sound: on');
    click(A, '#game .snd-toggle');
    assert.strictEqual(txt(A, '#game .snd-toggle'), 'Sound: off');
    assert.strictEqual(txt(A, '#menu .snd-toggle'), 'Sound: off', 'both buttons stay in step');
    assert.strictEqual(A.localStorage.getItem('dama-sound'), 'off');
    click(A, '#game .snd-toggle');
    assert.strictEqual(A.localStorage.getItem('dama-sound'), 'on');
  });

  await test('a friend who arrives late sees the earlier chat', async () => {
    const L = await open(port, code + '/watch', null, 'Late');
    await until(() => visible(L, '#game'), 3000, 'late watcher in');
    assert(/salam/.test(txt(L, '#chat-log')) && /stands/.test(txt(L, '#chat-log')), 'history: ' + txt(L, '#chat-log'));
    L.close();
  });

  await test('the page is an installable app: manifest, icons and theme colour are linked', async () => {
    const head = A.document.head;
    assert.strictEqual(head.querySelector('link[rel="manifest"]').getAttribute('href'), '/manifest.webmanifest');
    assert(head.querySelector('link[rel="apple-touch-icon"]') && head.querySelector('meta[name="theme-color"]'));
    assert(head.querySelector('meta[name="apple-mobile-web-app-capable"]'));
    assert(!visible(A, '#install-box'), 'install box stays hidden until the browser offers installation');
  });

  await test('secret hint: no button, five taps on the status line show a glowing move and it clears when you move', async () => {
    const H = await open(port);
    click(H, '#start');
    await until(() => visible(H, '#game') && H.document.querySelectorAll('.piece.can').length > 0, 3000, 'local game ready');
    assert(!visible(H, '#hint') && !visible(H, '#dk-hint'), 'no visible hint button');
    for (let k = 0; k < 4; k++) click(H, '#status');
    await new Promise(r => setTimeout(r, 200));
    assert.strictEqual(H.document.querySelectorAll('.sq.hint').length, 0, 'four taps do nothing');
    click(H, '#status');
    await until(() => H.document.querySelectorAll('.sq.hint').length === 2, 3000, 'hint squares: ' + H.document.querySelectorAll('.sq.hint').length);
    assert.strictEqual(H.document.querySelectorAll('.piece.hintpiece').length, 1, 'one glowing stone');
    await playOne(H);
    await until(() => H.document.querySelectorAll('.sq.hint').length === 0, 3000, 'hint cleared after moving');
    H.close();
  });

  await test('last move: hidden until you press the button, then shows start and end squares, and hides on the next move', async () => {
    const H = await open(port);
    click(H, '#start');
    await until(() => visible(H, '#game') && H.document.querySelectorAll('.piece.can').length > 0, 3000, 'local game ready');
    assert(H.document.querySelector('#lastmv').disabled, 'disabled before any move');
    await playOne(H);
    await until(() => H.document.querySelectorAll('.piece.can').length > 0 && !H.document.querySelector('#lastmv').disabled, 6000, 'computer replied');
    assert.strictEqual(H.document.querySelectorAll('.sq.lfrom, .sq.lto').length, 0, 'nothing shown by default');
    click(H, '#lastmv');
    assert.strictEqual(H.document.querySelectorAll('.sq.lfrom').length, 1);
    assert.strictEqual(H.document.querySelectorAll('.sq.lto').length, 1);
    click(H, '#lastmv');
    assert.strictEqual(H.document.querySelectorAll('.sq.lfrom, .sq.lto').length, 0, 'pressing again hides it');
    click(H, '#lastmv');
    await playOne(H);
    await until(() => H.document.querySelectorAll('.sq.lfrom, .sq.lto').length === 0, 3000, 'hidden after the next move');
    H.close();
  });

  await test('puzzles: list, wrong move is refused, hint and answer, solving plays the forced reply, progress is saved', async () => {
    const Q = await open(port);
    click(Q, '#open-puzzles');
    assert(visible(Q, '#puzzles'));
    assert.strictEqual(Q.document.querySelectorAll('#pz-grid button').length, 16);
    assert(Q.document.querySelector('#pz-grid button').classList.contains('next'), 'puzzle 1 is the next one');
    click(Q, '#pz-grid [data-n="1"]');
    await until(() => visible(Q, '#game') && !visible(Q, '#puzzles'), 2000, 'puzzle opens');
    assert(/Puzzle 1/.test(txt(Q, '#status')), txt(Q, '#status'));
    assert(visible(Q, '#pz-hint') && visible(Q, '#pz-solve') && !visible(Q, '#undo') && !visible(Q, '#hint') && !visible(Q, '#pz-next'));
    const sol = P[0], before = Q.document.querySelectorAll('.piece').length;
    const sq = i => Q.document.querySelector('.sq.dark[data-i="' + i + '"]');
    // a wrong first move: pick any legal first move that is not the answer
    const E = require('../src/engine.js');
    const parse = str => { const b = new Int8Array(64), m = { o: 1, O: 2, x: -1, X: -2 }; for (let i = 0; i < 64; i++) b[i] = m[str[i]] || 0; return b; };
    const wrong = E.genMoves(parse(sol.board), 1).find(m => !(m.from === sol.from && m.path.join() === sol.path.join()));
    click(Q, '.sq.dark[data-i="' + wrong.from + '"]'); click(Q, '.sq.dark[data-i="' + wrong.path[0] + '"]');
    await until(() => /Not quite/.test(txt(Q, '#status')), 2000, 'told it is wrong');
    assert.strictEqual(Q.document.querySelectorAll('.piece').length, before);
    assert(!Q.document.querySelector('.piece.moving'), 'nothing moved');
    // hint, then the answer
    click(Q, '#pz-hint');
    assert.strictEqual(Q.document.querySelectorAll('.piece.hintpiece').length, 1);
    click(Q, '#pz-solve');
    assert.strictEqual(Q.document.querySelectorAll('.sq.hint').length, 2);
    assert(new RegExp(sol.text.replace('–', '.')).test(txt(Q, '#status')), 'answer is named: ' + txt(Q, '#status'));
    // the right move
    click(Q, '.sq.dark[data-i="' + sol.from + '"]'); click(Q, '.sq.dark[data-i="' + sol.path[0] + '"]');
    await until(() => /Gold must capture|Now take them/.test(txt(Q, '#status')), 3000, 'forced reply starts');
    await until(() => /Now take them/.test(txt(Q, '#status')), 4000, 'Ruby has captured: ' + txt(Q, '#status'));
    await until(() => !Q.document.querySelector('.piece.moving') && Q.document.querySelectorAll('.piece.can, .piece.must').length > 0, 3000, 'my capture is ready');
    await playOne(Q);
    await until(() => /Solved!/.test(txt(Q, '#status')), 4000, 'solved: ' + txt(Q, '#status'));
    assert(/gave up 1 stone and won 2/.test(txt(Q, '#status')) || /gave up \d+ stones? and won \d+/.test(txt(Q, '#status')));
    assert(visible(Q, '#pz-next'));
    assert.deepStrictEqual(JSON.parse(Q.localStorage.getItem('dama-puzzles')), [1]);
    click(Q, '#pz-next');
    await until(() => /Puzzle 2/.test(txt(Q, '#status')), 2000, 'next puzzle');
    click(Q, '#pz-retry');
    assert(/Puzzle 2/.test(txt(Q, '#status')) && !visible(Q, '#pz-next'));
    click(Q, '#pz-list');
    assert(visible(Q, '#puzzles') && Q.document.querySelector('#pz-grid button.done') && /1 of 16 solved/.test(txt(Q, '#pz-progress')));
    Q.close();
  });

  await test('draw offer: B sees the offer, declines, A is told; offer again and accept ends the game', async () => {
    click(A, '#odraw');
    await until(() => visible(B, '#offer'), 2000, 'B sees offer');
    click(B, '#of-no');
    await until(() => /declined/.test(txt(A, '#note')), 2000, 'A told');
    click(B, '#odraw');
    await until(() => visible(A, '#offer'), 2000, 'A sees offer');
    click(A, '#of-yes');
    await until(() => visible(A, '#victory') && visible(B, '#victory'), 3000, 'victory overlays');
    assert.strictEqual(txt(A, '#v-title'), 'Draw');
    assert.strictEqual(txt(B, '#v-title'), 'Draw');
    assert.strictEqual(txt(A, '#v-again'), 'Rematch (swap colours)');
  });

  await test('rematch swaps colours and orientation, and the voice call survives', async () => {
    click(A, '#v-again');
    await until(() => /Waiting for Friend/.test(txt(A, '#v-rematch-note')), 2000, 'A waiting');
    await until(() => /Mohamed wants a rematch/.test(txt(B, '#v-rematch-note')), 2000, 'B told');
    click(B, '#v-again');
    await until(() => !visible(A, '#victory') && !visible(B, '#victory'), 3000, 'overlays closed');
    assert(/Mohamed \(you\) · Gold/.test(txt(A, '#who-bottom')));
    assert(/Friend \(you\) · White/.test(txt(B, '#who-bottom')));
    assert.strictEqual($(A, '.sq.dark').getAttribute('data-i'), '56', 'A now sees Ruby side');
    assert.strictEqual($(B, '.sq.dark').getAttribute('data-i'), '7');
    await until(() => B.document.querySelectorAll('.piece.can').length === 4, 2000, 'B (Ivory) moves first');
    assert.strictEqual(txt(B, '#log'), 'No moves yet.');
    assert(/Connected/.test(txt(B, '#vc-stat')), 'voice still connected');
  });

  await test('refreshing a window resumes the same table, board and move list', async () => {
    await playOne(B);
    await until(() => /1\./.test(txt(A, '#log')), 3000, 'A sees move');
    await until(() => !B.document.querySelector('.piece.moving'), 3000);
    const session = JSON.parse(B.sessionStorage.getItem('dama-online'));
    assert(session && session.code === code);
    const logBefore = txt(B, '#log');
    B.close();
    await until(() => /disconnected/.test(txt(A, '#status')), 3000, 'A sees friend drop');
    const B2 = await open(port, code, session);
    await until(() => visible(B2, '#game'), 3000, 'resumed');
    assert.strictEqual(txt(B2, '#log'), logBefore);
    assert(/Friend \(you\) · White/.test(txt(B2, '#who-bottom')));
    await until(() => !/disconnected/.test(txt(A, '#status')), 3000, 'A sees friend back');
    B = B2;
    await until(() => A.document.querySelectorAll('.piece.can').length > 0, 2000, 'A (Ruby) can move now');
  });

  await test('resign ends the game with the right winner on both screens', async () => {
    click(A, '#resign');                       // first tap arms
    assert.strictEqual(txt(A, '#resign'), 'Tap again to resign');
    click(A, '#resign');
    await until(() => visible(A, '#victory') && visible(B, '#victory'), 3000, 'victory');
    assert.strictEqual(txt(B, '#v-title'), 'You win');
    assert.strictEqual(txt(A, '#v-title'), 'Friend wins');
    assert(/You resigned/.test(txt(A, '#v-reason')));
    assert(/Mohamed resigned/.test(txt(B, '#v-reason')));
  });

  await test('leaving returns to the menu and the table is cleaned up', async () => {
    click(A, '#v-menu');
    assert(visible(A, '#menu'));
    assert.strictEqual(A.sessionStorage.getItem('dama-online'), null);
    await until(() => /left the table/.test(txt(B, '#note')), 2000, 'B told');
    click(B, '#v-menu');
    await sleep(150);
    assert.strictEqual(srv.rooms.size, 0);
  });

  await test('an unknown code shows a clear error in the dialog; local games still work', async () => {
    const W = await open(port);
    click(W, '#open-online');
    $(W, '#code').value = 'QQQQQ'; $(W, '#nick').value = 'X';
    click(W, '#join');
    await until(() => /No table with that code/.test(txt(W, '#online-err')), 2000, 'error shown');
    click(W, '#online-close');
    click(W, '#start');
    assert(visible(W, '#game'));
    assert.strictEqual(W.document.querySelectorAll('.piece').length, 24);
    assert(/Computer · Gold/.test(txt(W, '#who-top')));
    assert(visible(W, '#undo') && !visible(W, '#voice-box'));
    W.close();
  });

  await test('WebSockets blocked: the page falls back to SSE+POST, creates a table, and the WhatsApp button builds a wa.me link', async () => {
    const http = require('http');
    const dom = await JSDOM.fromURL('http://127.0.0.1:' + port + '/', {
      runScripts: 'dangerously', pretendToBeVisual: true,
      beforeParse(window) {
        installMocks(window);
        window.scrollTo = () => {};
        window.addEventListener('error', e => errors.push(e.message));
        // a host that refuses WebSocket upgrades
        window.WebSocket = class {
          constructor() { this.readyState = 0; this._l = {}; setTimeout(() => { this.readyState = 3; (this._l.close || []).forEach(f => f()); if (this.onclose) this.onclose(); }, 20); }
          addEventListener(t, f) { (this._l[t] = this._l[t] || []).push(f); }
          send() {} close() {}
        };
        // minimal EventSource + fetch backed by node http, as a real browser would provide
        window.EventSource = class {
          constructor(url) {
            this.req = http.get('http://127.0.0.1:' + port + url, res => {
              this.onopen && this.onopen();
              let buf = '';
              res.on('data', d => { buf += d; let i; while ((i = buf.indexOf('\n\n')) >= 0) { const c = buf.slice(0, i); buf = buf.slice(i + 2); if (c.startsWith('data: ') && this.onmessage) this.onmessage({ data: c.slice(6) }); } });
              res.on('close', () => { if (!this.dead && this.onerror) this.onerror(); });
            });
            this.req.on('error', () => { if (!this.dead && this.onerror) this.onerror(); });
            (window.__es = window.__es || []).push(this);
          }
          close() { this.dead = true; this.req.destroy(); }
        };
        window.fetch = (url, o) => fetch('http://127.0.0.1:' + port + url, o);
        window.__opened = [];
        window.open = u => { window.__opened.push(u); return {}; };
      }
    });
    const W = dom.window;
    click(W, '#open-online');
    $(W, '#nick').value = 'Mobile';
    click(W, '#create');
    await until(() => visible(W, '#game'), 4000, 'game visible over fallback');
    const c = txt(W, '#sh-code');
    assert(/^[A-Z2-9]{5}$/.test(c));
    assert.strictEqual(W.sessionStorage.getItem('dama-transport'), 'sse');
    click(W, '#sh-wa');
    assert.strictEqual(W.__opened.length, 1);
    const u = new URL(W.__opened[0]);
    assert.strictEqual(u.origin + u.pathname, 'https://wa.me/');
    assert(u.searchParams.get('text').includes(c) && u.searchParams.get('text').includes('/#' + c));
    W.__es.forEach(e => e.close());
    W.close();
  });

  await test('tables without a clock show no clock', async () => {
    assert(!visible(A, '#clk-top') && !visible(A, '#clk-bottom') && !visible(B, '#clk-bottom'));
  });

  await test('game clock: both players see it, only the side to move counts down, and running out of time ends the game', async () => {
    const fast = await start(0, '127.0.0.1', { clockUnitMs: 1000 });   // "3 minutes" last 3 seconds in this test
    const C = await open(fast.port, '', null, 'Clara'); click(C, '#open-online');
    assert.strictEqual($(C, '#clock-sel').querySelectorAll('option').length, 4);
    $(C, '#clock-sel').value = '3'; click(C, '#create');
    await until(() => visible(C, '#game'), 3000, 'C in game');
    const link = $(C, '#sh-link').value, codeC = link.split('#')[1];
    const D = await open(fast.port, codeC, null, 'Dan');
    await until(() => visible(D, '#game') && visible(D, '#clk-bottom') && visible(C, '#clk-bottom'), 3000, 'clocks shown');
    assert.strictEqual(txt(C, '#clk-bottom'), txt(D, '#clk-top'), 'both see the same time for Ivory');
    await until(() => C.document.querySelector('#clk-bottom').classList.contains('run'), 2000, "Ivory's clock runs first");
    assert(!C.document.querySelector('#clk-top').classList.contains('run'));
    assert(C.document.querySelector('#clk-bottom').classList.contains('low'), 'under 30 seconds is shown in red');
    await until(() => visible(C, '#victory') && visible(D, '#victory'), 6000, 'game ends on time');
    assert.strictEqual(txt(C, '#v-title'), 'Dan wins');
    assert.strictEqual(txt(D, '#v-title'), 'You win');
    assert(/You ran out of time/.test(txt(C, '#v-reason')) && /Clara ran out of time/.test(txt(D, '#v-reason')), txt(C, '#v-reason') + ' | ' + txt(D, '#v-reason'));
    assert.strictEqual(txt(C, '#clk-bottom'), '0:00');
    C.close(); D.close(); await fast.close();
  });

  await test('an invite link for a table that no longer exists opens the dialog with a clear message', async () => {
    const Z = await open(port, 'QQQQQ', null, 'Zed');
    await until(() => visible(Z, '#online') && /No table with that code/.test(txt(Z, '#online-err')), 3000, 'error dialog');
    assert(!visible(Z, '#joining'));
    Z.close();
  });

  await test('Chkobba: pick the game on the home screen, play whole games against the computer (2 and 4 players)', async () => {
    for (const [players, tile] of [['2', '#tile-ck'], ['4', '#tile-ck'], ['2', '#tile-ro'], ['4', '#tile-ro']]) {
      const K = await open(port);
      K.__ckFast = true;
      assert(visible(K, '#hub') && /Pick a game/.test(txt(K, '#hub h1')));
      click(K, tile);
      assert(visible(K, '#ck-setup') && !visible(K, '#dama-setup'), 'card game setup shown');
      assert(new RegExp(tile === '#tile-ro' ? 'Ronda' : 'Chkobba').test(txt(K, '#hero-h1')));
      if (tile === '#tile-ro') K.document.querySelector('input[name="ckt"][value="25"]').checked = true;
      K.document.querySelector('input[name="ckn"][value="' + players + '"]').checked = true;
      click(K, '#ck-start');
      assert(visible(K, '#ck'));
      let guard = 0;
      while (guard++ < 4000) {
        if (visible(K, '#ck-cut')) { click(K, Math.random() < 0.5 ? '#ck-keep' : '#ck-throw'); await new Promise(r => setTimeout(r, 12)); continue; }
        if (visible(K, '#ck-deal')) { if (K.__ck().g.over) break; click(K, '#ck-next'); continue; }
        const ck = K.__ck();
        if (!ck.busy && ck.g.phase === 'play' && ck.g.turn === 0) {
          const cards = K.document.querySelectorAll('#ck-hand .pc'); click(K, '#ck-hand .pc[data-id="' + cards[0].getAttribute('data-id') + '"]');
          let k2 = K.__ck();
          if (k2.opts.length > 1) k2.opts[0].forEach(id => click(K, '#ck-table .pc[data-id="' + id + '"]'));
          click(K, '#ck-act');
        } else await new Promise(r => setTimeout(r, 6));
      }
      const g = K.__ck().g;
      assert(g.over && g.scores[g.winner] >= g.target, players + ' players: game finished with a winner');
      assert(/win|wins/i.test(txt(K, '#ck-deal-title')));
      K.close();
    }
  });


  await test('Chkobba online: a table for 2 and for 4 (with a watcher), full games through the real screen, same layout as Dama', async () => {
    for (const [players, tile] of [[2, '#tile-ck'], [4, '#tile-ck'], [2, '#tile-ro'], [4, '#tile-ro']]) {
      const wins = [];
      const mk = async (nick) => { const w = await open(port, '', null, nick); w.__ckFast = true; return w; };
      const H = await mk('Host');
      click(H, tile);
      H.document.querySelector('input[name="ckn"][value="' + players + '"]').checked = true;
      if (tile === '#tile-ro') H.document.querySelector('input[name="ckt"][value="25"]').checked = true;
      click(H, '#ck-online');
      assert(visible(H, '#online') && !visible(H, '#clock-wrap') && new RegExp((tile === '#tile-ro' ? 'Ronda' : 'Chkobba') + ' table').test(txt(H, '#on-ck-sum')));
      $(H, '#nick').value = 'Host';
      click(H, '#create');
      await until(() => visible(H, '#game'), 3000, 'host at the table');
      assert.strictEqual($(H, '#game').getAttribute('data-kind'), 'ck');
      const code2 = txt(H, '#sh-code');
      assert(/^[A-Z2-9]{5}$/.test(code2));
      assert(visible(H, '#share-box') && visible(H, '#voice-box') && visible(H, '#chat-box'));
      assert.strictEqual(H.document.querySelectorAll('#sh-seats-ck .wr-seat').length, players, 'one waiting-room seat per player');
      assert(/Waiting for/.test(txt(H, '#ck-status')));
      assert($(H, '#ck-act').disabled, 'cannot play before everyone is seated');
      assert($(H, '#ck-play').parentNode.id === 'ck-slot', 'the card table lives inside the Dama screen');
      assert(new RegExp(tile === '#tile-ro' ? 'Ronda' : 'Chkobba').test(txt(H, '#sh-info')), 'the invite names the game');
      assert(H.document.querySelector('#sh-link').value.indexOf('?g=' + (tile === '#tile-ro' ? 'ronda' : 'chkobba') + '#') > 0, 'the link names the game');
      const all = [H];
      for (let i = 1; i < players; i++) {
        const J = await mk('Friend' + i);
        J.location.hash; // opens from the invite link
        const J2 = await open(port, code2, null, 'Friend' + i); J2.__ckFast = true; J.close();
        await until(() => visible(J2, '#game'), 3000, 'friend ' + i + ' seated');
        assert(!visible(J2, '#share-box'), 'only the host has the invite box');
        all.push(J2);
      }
      await until(() => all.every(w => w.__ck && w.__ck().g.phase !== 'wait'), 4000, 'game started for everyone');
      const W2 = await open(port, code2 + '/watch', null, 'Watcher'); W2.__ckFast = true;
      await until(() => visible(W2, '#game'), 3000, 'watcher in');
      assert(/watching/i.test(txt(W2, '#ck-act')), 'the watcher can only watch');
      // privacy: nobody sees another person's cards
      all.forEach(w => assert.strictEqual(w.document.querySelectorAll('#ck-hand .pc:not(.back)').length, w.__ck().g.hands[0].length));
      assert.strictEqual(W2.document.querySelectorAll('#ck-hand .pc:not(.back)').length, 0, 'the watcher sees no face-up hand');
      // play whole game with the real buttons
      let guard = 0;
      const everyone = all.concat([W2]);
      while (guard++ < 6000) {
        const done = all[0].__ck().g.over && visible(all[0], '#ck-deal');
        if (done) break;
        let acted = false;
        for (const w of all) {
          if (visible(w, '#ck-cut')) { click(w, Math.random() < 0.5 ? '#ck-keep' : '#ck-throw'); acted = true; continue; }
          if (visible(w, '#ck-deal') && !w.__ck().g.over && !$(w, '#ck-next').disabled) { click(w, '#ck-next'); acted = true; continue; }
          const ck = w.__ck();
          if (!ck.busy && !ck.anim && ck.g.phase === 'play' && ck.g.turn === 0) {
            const cards = w.document.querySelectorAll('#ck-hand .pc');
            click(w, '#ck-hand .pc[data-id="' + cards[0].getAttribute('data-id') + '"]');
            const k2 = w.__ck();
            if (k2.opts.length > 1) k2.opts[0].forEach(id => click(w, '#ck-table .pc[data-id="' + id + '"]'));
            click(w, '#ck-act'); acted = true;
          }
        }
        await sleep(acted ? 15 : 8);
      }
      const gH = all[0].__ck().g;
      assert(gH.over && gH.scores[gH.winner] >= gH.target, players + ' players: finished with a winner');
      await until(() => everyone.every(w => w.__ck().g.over), 3000, 'everybody sees the end');
      const scoresSeen = everyone.map(w => { const g = w.__ck().g; return g.scores[0] + ':' + g.scores[1]; });
      assert(scoresSeen.every(x => x.split(':').reduce((a, b) => a + (+b), 0) === gH.scores[0] + gH.scores[1]), 'same points everywhere');
      const titles = all.map(w => txt(w, '#ck-deal-title'));
      assert(titles.some(t => /win/i.test(t)), 'someone wins: ' + titles.join(' | '));
      // chat and leaving still work from this table
      $(all[1], '#chat-in').value = 'Yallah'; all[1].document.querySelector('#chat-form').dispatchEvent(new all[1].Event('submit', { cancelable: true }));
      await until(() => /Yallah/.test(txt(all[0], '#chat-log')), 2000, 'chat arrives');
      click(all[1], '#rl-exit'); click(all[1], '#leave-go');
      await until(() => visible(all[1], '#menu'), 2000, 'left');
      assert($(all[1], '#ck-play').parentNode.className === 'ck-wrap', 'the card table went back to its own screen');
      await until(() => all[0].document.querySelectorAll('#sh-seats-ck .wr-seat.on').length === players - 1, 3000, 'host sees the empty seat');
      for (const w of everyone) w.close();
    }
  });

  W.close();
  A.close(); B.close();
  await srv.close();
  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join('; '));
  console.log('\nALL ' + n + ' UI TESTS PASSED, page errors: none');
  process.exit(0);
})().catch(e => { console.error('FAIL', e); if (errors.length) console.error('page errors:', errors); process.exit(1); });
