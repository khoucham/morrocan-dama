/* Drives two browser windows (jsdom) against the real server through the real UI.
   WebRTC and the microphone do not exist in jsdom, so they are replaced with small mocks that
   exercise the page's signalling code. Real audio can only be checked on real devices. */
const assert = require('assert');
const { JSDOM } = require('jsdom');
const { start } = require('../app.js');

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

async function open(port, hash, session) {
  const dom = await JSDOM.fromURL('http://127.0.0.1:' + port + '/' + (hash ? '#' + hash : ''), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(window) {
      installMocks(window);
      window.scrollTo = () => {};
      window.addEventListener('error', e => errors.push(e.message));
      if (session) window.sessionStorage.setItem('dama-online', JSON.stringify(session));
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
    assert(visible(A, '#menu'));
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
    assert(/Mohamed \(you\) · Ivory/.test(txt(A, '#who-bottom')));
    assert.strictEqual(A.document.querySelectorAll('.piece').length, 24);
    assert.strictEqual(A.document.querySelectorAll('.piece.can').length, 0, 'cannot move before a friend joins');
  });

  await test("player B opens the invite link, the code is pre-filled, joins, and sees the board from Ruby's side", async () => {
    B = await open(port, code);
    assert(visible(B, '#online'), 'dialog opens from the invite link');
    assert.strictEqual($(B, '#code').value, code);
    $(B, '#nick').value = 'Friend';
    click(B, '#join');
    await until(() => visible(B, '#game'), 3000, 'B in game');
    await until(() => !visible(A, '#share-box'), 3000, 'A notified');
    assert(/Friend \(you\) · Ruby/.test(txt(B, '#who-bottom')));
    assert(/Mohamed · Ivory/.test(txt(B, '#who-top')));
    assert(/Friend · Ruby/.test(txt(A, '#who-top')));
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

  await test('voice: both start voice, signalling is relayed and both show Connected', async () => {
    click(A, '#vc-start'); click(B, '#vc-start');
    await until(() => !visible(A, '#vc-start') && !visible(B, '#vc-start'), 2000, 'mics live');
    await until(() => /Connected/.test(txt(A, '#vc-stat')) && /Connected/.test(txt(B, '#vc-stat')), 4000, 'both connected: ' + txt(A, '#vc-stat') + ' | ' + txt(B, '#vc-stat'));
    assert(/mic is live/.test(txt(A, '#vc-stat')));
    assert(A.__pcs[A.__pcs.length - 1].sender.track === A.__track, 'microphone track attached to the call');
    click(A, '#vc-mute');
    assert.strictEqual(A.__track.enabled, false, 'mute disables the track');
    assert.strictEqual(txt(A, '#vc-mute'), 'Unmute');
    click(A, '#vc-mute');
    assert.strictEqual(A.__track.enabled, true);
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
    assert(/Mohamed \(you\) · Ruby/.test(txt(A, '#who-bottom')));
    assert(/Friend \(you\) · Ivory/.test(txt(B, '#who-bottom')));
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
    assert(/Friend \(you\) · Ivory/.test(txt(B2, '#who-bottom')));
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
    assert(/Computer · Ruby/.test(txt(W, '#who-top')));
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

  A.close(); B.close();
  await srv.close();
  assert.deepStrictEqual(errors, [], 'no page errors: ' + errors.join('; '));
  console.log('\nALL ' + n + ' UI TESTS PASSED, page errors: none');
  process.exit(0);
})().catch(e => { console.error('FAIL', e); if (errors.length) console.error('page errors:', errors); process.exit(1); });
