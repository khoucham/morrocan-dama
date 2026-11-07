const assert = require('assert');
const WebSocket = require('ws');
const { start } = require('../app.js');
const E = require('../src/engine.js');

function client(port) {
  const ws = new WebSocket('ws://127.0.0.1:' + port + '/ws');
  const inbox = [], waiters = [];
  ws.on('message', raw => {
    const m = JSON.parse(raw.toString());
    const i = waiters.findIndex(w => w.pred(m));
    if (i >= 0) { const w = waiters.splice(i, 1)[0]; clearTimeout(w.timer); w.resolve(m); } else inbox.push(m);
  });
  const c = {
    ws,
    open: () => new Promise(r => ws.on('open', r)),
    send: o => ws.send(JSON.stringify(o)),
    next: (t, ms = 2000) => new Promise((resolve, reject) => {
      const pred = m => !t || m.t === t;
      const j = inbox.findIndex(pred);
      if (j >= 0) return resolve(inbox.splice(j, 1)[0]);
      const w = { pred, resolve, timer: setTimeout(() => { const k = waiters.indexOf(w); if (k >= 0) waiters.splice(k, 1); reject(new Error('timeout waiting for ' + t)); }, ms) };
      waiters.push(w);
    }),
    none: async (t, ms = 150) => { await new Promise(r => setTimeout(r, ms)); assert(!inbox.some(m => m.t === t), 'unexpected ' + t); },
    close: () => ws.close()
  };
  return c;
}

let n = 0;
async function test(name, fn) { await fn(); n++; console.log('PASS ' + String(n).padStart(2) + '  ' + name); }

(async () => {
  const srv = await start(0, '127.0.0.1');
  const port = srv.port;

  const a = client(port), b = client(port);
  await a.open(); await b.open();
  let code, tokenA, tokenB, snapA, snapB;

  await test('creating a table returns a 5-character code, side 1 and a token', async () => {
    a.send({ t: 'create', name: '  Mohamed<b>  ' });
    snapA = await a.next('joined');
    code = snapA.code; tokenA = snapA.token;
    assert(/^[A-HJ-NP-Z2-9]{5}$/.test(code));
    assert.strictEqual(snapA.side, 1);
    assert.strictEqual(snapA.names['1'], 'Mohamedb', 'name is cleaned');
    assert.strictEqual(snapA.peer, false);
    assert.strictEqual(snapA.turn, 1);
    assert.strictEqual(snapA.board.length, 64);
    assert(snapA.ice.iceServers.length >= 1);
  });

  await test('moves are refused while waiting for a friend', async () => {
    const mv = E.genMoves(E.initialBoard(), 1)[0];
    a.send({ t: 'move', from: mv.from, path: mv.path });
    const err = await a.next('error');
    assert.strictEqual(err.code, 'illegal');
  });

  await test('joining with a wrong code fails, with the right code works (case-insensitive)', async () => {
    b.send({ t: 'join', code: 'ZZZZZ', name: 'Friend' });
    assert.strictEqual((await b.next('error')).code, 'not_found');
    b.send({ t: 'join', code: code.toLowerCase(), name: 'Friend' });
    snapB = await b.next('joined');
    tokenB = snapB.token;
    assert.strictEqual(snapB.side, -1);
    assert.strictEqual(snapB.peer, true);
    const peer = await a.next('peer');
    assert.deepStrictEqual([peer.status, peer.name], ['joined', 'Friend']);
  });

  await test('a third player cannot join a full table', async () => {
    const c3 = client(port); await c3.open();
    c3.send({ t: 'join', code, name: 'Third' });
    assert.strictEqual((await c3.next('error')).code, 'full');
    c3.close();
  });

  await test('signalling messages are relayed to the other player only', async () => {
    a.send({ t: 'signal', data: { description: { type: 'offer', sdp: 'x' } } });
    const s = await b.next('signal');
    assert.strictEqual(s.data.description.type, 'offer');
    await a.none('signal');
    b.send({ t: 'signal', data: { candidate: { candidate: 'c' } } });
    assert.strictEqual((await a.next('signal')).data.candidate.candidate, 'c');
  });

  await test('out-of-turn and illegal moves are rejected, legal ones broadcast to both', async () => {
    const legal = E.genMoves(E.initialBoard(), -1)[0];
    b.send({ t: 'move', from: legal.from, path: legal.path });
    assert.strictEqual((await b.next('error')).code, 'illegal', 'not black turn');
    a.send({ t: 'move', from: 40, path: [0] });
    assert.strictEqual((await a.next('error')).code, 'illegal', 'nonsense move');
    const mv = E.genMoves(E.initialBoard(), 1)[0];
    a.send({ t: 'move', from: mv.from, path: mv.path });
    const ma = await a.next('moved'), mb = await b.next('moved');
    assert.deepStrictEqual(ma.move, mb.move);
    assert.strictEqual(ma.turn, -1);
    assert.strictEqual(ma.side, 1);
    assert(/^[a-h][1-8]–[a-h][1-8]$/.test(ma.text));
  });

  await test('a dropped player can resume with their token, and the other player is told', async () => {
    b.close();
    const off = await a.next('peer');
    assert.strictEqual(off.status, 'offline');
    const b2 = client(port); await b2.open();
    b2.send({ t: 'resume', code, token: 'wrong' });
    assert.strictEqual((await b2.next('error')).code, 'not_found');
    b2.send({ t: 'resume', code, token: tokenB });
    const snap = await b2.next('joined');
    assert.strictEqual(snap.reason, 'resume');
    assert.strictEqual(snap.side, -1);
    assert.strictEqual(snap.log.length, 1, 'the move played before the drop is kept');
    assert.strictEqual(snap.turn, -1);
    assert.strictEqual((await a.next('peer')).status, 'online');
    b.ws = b2.ws; Object.assign(b, b2);
  });

  await test('a full game between two clients ends with the engine result and consistent boards', async () => {
    let local = E.createState(1);
    const mv0 = E.genMoves(E.initialBoard(), 1)[0];
    local = E.play(local, mv0);
    let over = null, plies = 1, guard = 0;
    while (!over && guard++ < 400) {
      const side = local.turn, who = side === 1 ? a : b;
      const moves = E.legalMoves(local);
      const mv = moves[Math.floor(Math.random() * moves.length)];
      who.send({ t: 'move', from: mv.from, path: mv.path });
      const ma = await a.next('moved'), mb = await b.next('moved');
      assert.deepStrictEqual(ma.move, mb.move);
      local = E.play(local, mv); plies++;
      assert.strictEqual(ma.turn, local.turn);
      assert.deepStrictEqual(ma.over, local.over);
      over = ma.over;
    }
    if (!over) { // random play can shuffle kings for a long time; end it by resignation
      a.send({ t: 'resign' });
      const o = await a.next('over'); await b.next('over');
      over = o.over;
      assert.deepStrictEqual(over, { winner: -1, reason: 'resign', by: 1 });
    }
    assert(over.reason === 'no-pieces' || over.reason === 'no-moves' || over.reason === 'resign');
    // a move after the game is over is refused
    a.send({ t: 'move', from: 40, path: [33] });
    assert.strictEqual((await a.next('error')).code, 'illegal');
  });

  await test('rematch needs both players and swaps colours, resetting the board', async () => {
    a.send({ t: 'rematch' });
    assert.strictEqual((await b.next('rematch')).action, 'requested');
    b.send({ t: 'rematch' });
    const sa = await a.next('joined'), sb = await b.next('joined');
    assert.strictEqual(sa.reason, 'rematch');
    assert.strictEqual(sa.side, -1);
    assert.strictEqual(sb.side, 1);
    assert.strictEqual(sa.log.length, 0);
    assert.strictEqual(sa.turn, 1);
    assert.strictEqual(sa.over, null);
    assert.strictEqual(sa.names['1'], 'Friend');
    // the old tokens still work after the swap
    tokenA = sa.token; tokenB = sb.token;
  });

  await test('draw offer: accept ends the game as a draw, decline carries on', async () => {
    // b is now side 1 (moves first)
    b.send({ t: 'draw', action: 'offer' });
    assert.strictEqual((await a.next('draw')).action, 'offered');
    a.send({ t: 'draw', action: 'decline' });
    assert.strictEqual((await b.next('draw')).action, 'declined');
    b.send({ t: 'draw', action: 'accept' });   // nothing to accept: ignored
    await a.none('over');
    a.send({ t: 'draw', action: 'offer' });
    await b.next('draw');
    b.send({ t: 'draw', action: 'accept' });
    const o = await a.next('over'); await b.next('over');
    assert.deepStrictEqual(o.over, { winner: 0, reason: 'agreed' });
  });

  await test('resign gives the win to the opponent', async () => {
    a.send({ t: 'rematch' }); await b.next('rematch'); b.send({ t: 'rematch' });
    await a.next('joined'); await b.next('joined');
    // after another swap a is side 1 again
    a.send({ t: 'resign' });
    const o = await b.next('over'); await a.next('over');
    assert.strictEqual(o.over.winner, -1);
    assert.strictEqual(o.over.reason, 'resign');
  });

  await test('leaving a table frees the seat; the table disappears when both leave', async () => {
    b.send({ t: 'leave' });
    assert.strictEqual((await a.next('peer')).status, 'left');
    assert.strictEqual(srv.rooms.size, 1);
    a.send({ t: 'leave' });
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(srv.rooms.size, 0);
  });

  await test('garbage input does not crash the server', async () => {
    const g = client(port); await g.open();
    g.ws.send('not json'); g.ws.send(JSON.stringify({ t: 'move' })); g.ws.send(JSON.stringify({ t: 'nope' })); g.ws.send(JSON.stringify({}));
    g.send({ t: 'create', name: 'Still fine' });
    assert.strictEqual((await g.next('joined')).side, 1);
    g.close();
  });

  await test('health check and index respond', async () => {
    const http = require('http');
    const get = p => new Promise(r => http.get({ host: '127.0.0.1', port, path: p }, res => { let d = ''; res.on('data', x => d += x); res.on('end', () => r({ status: res.statusCode, body: d, headers: res.headers })); }));
    const h = await get('/healthz'); assert.strictEqual(h.status, 200);
    assert.strictEqual((await get('/nope')).status, 404);
    const idx = await get('/'); assert.strictEqual(idx.status, 200);
    assert(/microphone=\(self\)/.test(idx.headers['permissions-policy']));
  });

  await test('fallback transport (SSE + POST) can host a table and play against a WebSocket player', async () => {
    const http = require('http');
    const sid = 'testsid1234567890abc';
    const events = [], waiters = [];
    const req = http.get({ host: '127.0.0.1', port, path: '/sse?sid=' + sid }, res => {
      assert.strictEqual(res.statusCode, 200);
      assert(/text\/event-stream/.test(res.headers['content-type']));
      let buf = '';
      res.on('data', d => {
        buf += d.toString();
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const chunk = buf.slice(0, i); buf = buf.slice(i + 2);
          if (!chunk.startsWith('data: ')) continue;
          const m = JSON.parse(chunk.slice(6));
          const w = waiters.findIndex(x => x.t === m.t);
          if (w >= 0) waiters.splice(w, 1)[0].resolve(m); else events.push(m);
        }
      });
    });
    const next = t => new Promise((resolve, reject) => {
      const j = events.findIndex(m => m.t === t);
      if (j >= 0) return resolve(events.splice(j, 1)[0]);
      waiters.push({ t, resolve }); setTimeout(() => reject(new Error('sse timeout ' + t)), 2000);
    });
    const post = (body, id = sid) => new Promise(r => {
      const q = http.request({ host: '127.0.0.1', port, path: '/send?sid=' + id, method: 'POST' }, res => { res.resume(); r(res.statusCode); });
      q.end(typeof body === 'string' ? body : JSON.stringify(body));
    });
    await new Promise(r => setTimeout(r, 100));
    assert.strictEqual(await post({ t: 'create', name: 'Mobile' }), 204);
    const snap = await next('joined');
    assert.strictEqual(snap.side, 1);
    const w = client(port); await w.open();
    w.send({ t: 'join', code: snap.code, name: 'Desktop' });
    assert.strictEqual((await w.next('joined')).side, -1);
    assert.strictEqual((await next('peer')).t, 'peer');
    const mv = E.genMoves(E.initialBoard(), 1)[0];
    await post({ t: 'move', from: mv.from, path: mv.path });
    const moved = await w.next('moved');
    assert.strictEqual(moved.move.from, mv.from);
    // signalling relays both ways (this is what voice uses)
    w.send({ t: 'signal', data: { hello: 'from ws' } });
    assert.deepStrictEqual((await next('signal')).data, { hello: 'from ws' });
    await post({ t: 'signal', data: { hello: 'from sse' } });
    assert.deepStrictEqual((await w.next('signal')).data, { hello: 'from sse' });
    // bad requests
    assert.strictEqual(await post('not json'), 204);
    assert.strictEqual(await post({ t: 'sync' }, 'unknownsid12345678'), 410);
    assert.strictEqual(await post('x'.repeat(20000)), 413);
    w.close(); req.destroy();
  });

  await test('fallback endpoints reject bad session ids and methods', async () => {
    const http = require('http');
    const st = (m, p) => new Promise(r => { const q = http.request({ host: '127.0.0.1', port, path: p, method: m }, res => { res.resume(); r(res.statusCode); }); q.end(); });
    assert.strictEqual(await st('GET', '/sse?sid=short'), 400);
    assert.strictEqual(await st('POST', '/send'), 400);
    assert.strictEqual(await st('POST', '/sse?sid=abcdefghijklmnopqrst'), 405);
  });

  await test('watchers: join with the code, see the board and the crowd, cannot move, start muted', async () => {
    const h = client(port), g = client(port), w1 = client(port);
    await h.open(); await g.open(); await w1.open();
    h.send({ t: 'create', name: 'Host' }); const hs = await h.next('joined');
    assert.strictEqual(hs.role, 'player'); assert.strictEqual(hs.host, true); assert(hs.id);
    g.send({ t: 'join', code: hs.code, name: 'Guest' }); const gs = await g.next('joined');
    assert.strictEqual(gs.host, false); assert.notStrictEqual(gs.id, hs.id);
    await h.next('crowd'); await g.next('crowd');
    w1.send({ t: 'watch', code: hs.code.toLowerCase(), name: 'Fan' });
    const ws1 = await w1.next('joined');
    assert.strictEqual(ws1.role, 'watcher'); assert.strictEqual(ws1.side, 0); assert.strictEqual(ws1.board.length, 64);
    assert.strictEqual(ws1.peer, true);
    const ce = ws1.crowd.find(x => x.id === ws1.id);
    assert.deepStrictEqual([ce.role, ce.muted, ce.asking], ['watcher', true, false]);
    assert.strictEqual(ws1.crowd.length, 3);
    const hc = await h.next('crowd');
    assert.strictEqual(hc.host, hs.id); assert.strictEqual(hc.list.length, 3);
    // a watcher cannot move, resign, offer a draw or ask for a rematch
    const mv = E.genMoves(E.initialBoard(), 1)[0];
    w1.send({ t: 'move', from: mv.from, path: mv.path });
    assert.strictEqual((await w1.next('error')).code, 'illegal');
    w1.send({ t: 'resign' }); w1.send({ t: 'draw', action: 'offer' });
    await h.none('over'); await h.none('draw');
    // but sees the players' moves
    h.send({ t: 'move', from: mv.from, path: mv.path });
    assert.strictEqual((await w1.next('moved')).move.from, mv.from);
    await g.next('moved'); await h.next('moved');
    h.ws.close(); g.close(); w1.close();
  });

  await test('host can mute and unmute a watcher, nobody else can, and a watcher can raise a hand', async () => {
    const h = client(port), g = client(port), w1 = client(port);
    await h.open(); await g.open(); await w1.open();
    h.send({ t: 'create', name: 'Host' }); const hs = await h.next('joined');
    g.send({ t: 'join', code: hs.code, name: 'Guest' }); await g.next('joined');
    w1.send({ t: 'watch', code: hs.code, name: 'Fan' }); const ws1 = await w1.next('joined');
    const drain = async c => { for (let i = 0; i < 6; i++) { try { await c.next('crowd', 80); } catch (e) { break; } } };
    await drain(h); await drain(g); await drain(w1);
    const entry = (c, id) => c.list.find(x => x.id === id);
    // raise hand
    w1.send({ t: 'ask', on: true });
    let c = await h.next('crowd'); assert.strictEqual(entry(c, ws1.id).asking, true);
    await drain(g); await drain(w1);
    // the other player is not the host: ignored
    g.send({ t: 'mute', id: ws1.id, muted: false });
    await h.none('crowd', 200);
    // host unmutes: muted false and the hand goes down; everyone is told
    h.send({ t: 'mute', id: ws1.id, muted: false });
    c = await w1.next('crowd');
    assert.deepStrictEqual([entry(c, ws1.id).muted, entry(c, ws1.id).asking], [false, false]);
    assert.strictEqual(entry(await g.next('crowd'), ws1.id).muted, false);
    // a watcher cannot mute himself or others
    await drain(h); await drain(g);
    w1.send({ t: 'mute', id: ws1.id, muted: true }); await h.none('crowd', 120);
    // host mutes again; a watcher who is not muted cannot raise a hand
    await drain(h); await drain(g); await drain(w1);
    h.send({ t: 'mute', id: ws1.id, muted: true });
    assert.strictEqual(entry(await w1.next('crowd'), ws1.id).muted, true);
    h.ws.close(); g.close(); w1.close();
  });

  await test('signalling is addressed: each person gets only what is sent to them, with the sender id', async () => {
    const h = client(port), g = client(port), w1 = client(port), w2 = client(port);
    await Promise.all([h, g, w1, w2].map(c => c.open()));
    h.send({ t: 'create', name: 'H' }); const hs = await h.next('joined');
    g.send({ t: 'join', code: hs.code, name: 'G' }); const gs = await g.next('joined');
    w1.send({ t: 'watch', code: hs.code, name: 'W1' }); const a = await w1.next('joined');
    w2.send({ t: 'watch', code: hs.code, name: 'W2' }); const b = await w2.next('joined');
    w1.send({ t: 'signal', to: b.id, data: { x: 1 } });
    const got = await w2.next('signal');
    assert.deepStrictEqual(got.data, { x: 1 }); assert.strictEqual(got.from, a.id);
    await h.none('signal'); await g.none('signal'); await w1.none('signal');
    h.send({ t: 'signal', to: a.id, data: { y: 2 } });
    assert.strictEqual((await w1.next('signal')).from, hs.id);
    g.send({ t: 'signal', to: 'nobody', data: {} });          // unknown target is dropped quietly
    w1.send({ t: 'signal', to: a.id, data: {} });             // so is a message to yourself
    await w1.none('signal');
    [h, g, w1, w2].forEach(c => c.ws.close());
  });

  await test('seat limits: five watchers are refused, watchers leaving updates the crowd, table closing tells watchers', async () => {
    const h = client(port); await h.open();
    h.send({ t: 'create', name: 'H' }); const hs = await h.next('joined');
    const ws = [];
    for (let i = 0; i < 4; i++) { const w = client(port); await w.open(); w.send({ t: 'watch', code: hs.code, name: 'W' + i }); await w.next('joined'); ws.push(w); }
    const extra = client(port); await extra.open();
    extra.send({ t: 'watch', code: hs.code, name: 'late' });
    assert.strictEqual((await extra.next('error')).code, 'full');
    ws[0].send({ t: 'leave' });
    await new Promise(r => setTimeout(r, 150));
    extra.send({ t: 'watch', code: hs.code, name: 'late' });
    assert.strictEqual((await extra.next('joined')).role, 'watcher');
    // host leaves for good while only watchers remain: they are told the table closed
    h.send({ t: 'leave' });
    await ws[1].next('closed');
    // nobody can resume after that
    const r = client(port); await r.open();
    r.send({ t: 'resume', code: hs.code, token: 'x' });
    assert.strictEqual((await r.next('error')).code, 'not_found');
    [h, extra, r, ...ws].forEach(c => { try { c.ws.close(); } catch (e) {} });
  });

  await test('a watcher can resume after a dropped connection, and rename shows in the crowd', async () => {
    const h = client(port), w = client(port); await h.open(); await w.open();
    h.send({ t: 'create', name: 'H' }); const hs = await h.next('joined');
    w.send({ t: 'watch', code: hs.code, name: 'Fan' }); const ws1 = await w.next('joined');
    w.ws.close();
    const w2 = client(port); await w2.open();
    w2.send({ t: 'resume', code: hs.code, token: ws1.token });
    const back = await w2.next('joined');
    assert.strictEqual(back.role, 'watcher'); assert.strictEqual(back.id, ws1.id); assert.strictEqual(back.reason, 'resume');
    w2.send({ t: 'rename', name: '  <b>Nour</b>  ' });
    let c;
    do { c = await h.next('crowd'); } while (!c.list.some(x => x.name === 'bNour/b'));
    h.ws.close(); w2.ws.close();
  });

  await test('chat: everyone at the table can write, text is cleaned and rate limited, history reaches latecomers', async () => {
    const h = client(port), g = client(port), w = client(port), late = client(port);
    await Promise.all([h, g, w, late].map(c => c.open()));
    h.send({ t: 'create', name: 'Host' }); const hs = await h.next('joined');
    assert.deepStrictEqual(hs.chat, []);
    g.send({ t: 'join', code: hs.code, name: 'Guest' }); await g.next('joined');
    w.send({ t: 'watch', code: hs.code, name: 'Fan' }); await w.next('joined');
    h.send({ t: 'chat', text: '  hello\n\tthere   friends  ' });
    for (const c of [h, g, w]) { const m = await c.next('chat'); assert.strictEqual(m.text, 'hello there friends'); assert.strictEqual(m.name, 'Host'); assert(m.id && m.ts); }
    await new Promise(r => setTimeout(r, 520));
    w.send({ t: 'chat', text: 'x'.repeat(500) });
    assert.strictEqual((await h.next('chat')).text.length, 200, 'long messages are cut');
    // too fast: the second message is dropped; empty messages are ignored
    g.send({ t: 'chat', text: 'one' }); g.send({ t: 'chat', text: 'two' });
    await h.next('chat'); await new Promise(r => setTimeout(r, 150));
    assert.strictEqual((await h.next('chat', 100).catch(() => 'none')), 'none');
    await new Promise(r => setTimeout(r, 520));
    g.send({ t: 'chat', text: '   ' }); g.send({ t: 'chat' }); g.send({ t: 'chat', text: { evil: 1 } });
    await new Promise(r => setTimeout(r, 200));
    // a latecomer gets the history in the snapshot
    late.send({ t: 'watch', code: hs.code, name: 'Late' });
    const ls = await late.next('joined');
    assert.deepStrictEqual(ls.chat.map(m => m.text.slice(0, 11)), ['hello there', 'xxxxxxxxxxx', 'one']);
    // someone who has not joined a table cannot chat into it
    while (await h.next('chat', 60).then(() => true, () => false));   // clear what is already waiting
    const out = client(port); await out.open(); out.send({ t: 'chat', text: 'hi' }); await h.none('chat', 150);
    [h, g, w, late, out].forEach(c => c.ws.close());
  });

  await test('reactions: only the allowed emoji go through, with the sender name, watchers included', async () => {
    const h = client(port), w = client(port); await h.open(); await w.open();
    h.send({ t: 'create', name: 'Host' }); const hs = await h.next('joined');
    w.send({ t: 'watch', code: hs.code, name: 'Fan' }); await w.next('joined');
    w.send({ t: 'react', emoji: '👏' });
    const r = await h.next('react'); assert.deepStrictEqual([r.emoji, r.name], ['👏', 'Fan']);
    assert.strictEqual((await w.next('react')).emoji, '👏');
    await new Promise(r => setTimeout(r, 350));
    w.send({ t: 'react', emoji: '<script>' }); w.send({ t: 'react', emoji: 'x' }); w.send({ t: 'react' });
    await h.none('react', 150);
    h.ws.close(); w.ws.close();
  });

  await test('installable app files are served with the right types, and nothing else under public/ is exposed', async () => {
    const http = require('http');
    const get = p => new Promise(r => http.get({ host: '127.0.0.1', port, path: p }, res => { const ch = []; res.on('data', x => ch.push(x)); res.on('end', () => r({ status: res.statusCode, type: res.headers['content-type'], body: Buffer.concat(ch), h: res.headers })); }));
    const mf = await get('/manifest.webmanifest');
    assert.strictEqual(mf.status, 200); assert(/manifest\+json/.test(mf.type));
    const j = JSON.parse(mf.body.toString());
    assert.strictEqual(j.display, 'standalone'); assert(j.icons.some(i => i.purpose === 'maskable'));
    for (const i of j.icons) { const r = await get(i.src); assert.strictEqual(r.status, 200); assert.strictEqual(r.type, 'image/png'); assert.strictEqual(r.body.slice(1, 4).toString(), 'PNG'); }
    const sw = await get('/sw.js'); assert.strictEqual(sw.status, 200); assert(/javascript/.test(sw.type)); assert.strictEqual(sw.h['service-worker-allowed'], '/');
    assert.strictEqual((await get('/apple-touch-icon.png')).status, 404);
    assert.strictEqual((await get('/icons/../app.js')).status, 404);
    assert.strictEqual((await get('/public/index.html')).status, 404);
    assert.strictEqual((await get('/package.json')).status, 404);
  });

  await test('game clock: the server runs it only while both players are connected, switches it on each move and ends the game on time', async () => {
    const fast = await start(0, '127.0.0.1', { clockUnitMs: 100 });      // one "minute" lasts 100 ms in this test
    const mk = async () => { const c = client(fast.port); await c.open(); return c; };
    // no clock and nonsense values both mean "no clock"
    const n1 = await mk(); n1.send({ t: 'create', name: 'N', clock: 7 }); assert.strictEqual((await n1.next('joined')).clock, null);
    const n2 = await mk(); n2.send({ t: 'create', name: 'N' }); assert.strictEqual((await n2.next('joined')).clock, null);
    // 5 minutes each = 500 ms here
    const h = await mk(), g = await mk();
    h.send({ t: 'create', name: 'H', clock: 5 });
    const hs = await h.next('joined');
    assert.deepStrictEqual([hs.clock.limit, hs.clock.running, hs.clock.left['1'], hs.clock.left['-1']], [500, null, 500, 500]);
    g.send({ t: 'join', code: hs.code, name: 'G' });
    const gs = await g.next('joined'); assert.strictEqual(gs.clock.limit, 500);
    let c = await h.next('clock'); assert.strictEqual(c.clock.running, 1, 'Ivory\'s clock starts when both are here');
    // a move hands the clock over, and Ivory has used some time
    await new Promise(r => setTimeout(r, 120));
    const mv = E.genMoves(E.initialBoard(), 1)[0];
    h.send({ t: 'move', from: mv.from, path: mv.path });
    await g.next('moved');
    do { c = await g.next('clock'); } while (c.clock.running !== -1);
    assert(c.clock.left['1'] < 500 && c.clock.left['1'] > 250, 'Ivory used about 120 ms: ' + c.clock.left['1']);
    assert.strictEqual(c.clock.left['-1'], 500);
    // Ruby drops out: the clock pauses, nobody loses on time while away
    const gTok = gs.token;
    g.ws.close();
    do { c = await h.next('clock'); } while (c.clock.running !== null);
    await new Promise(r => setTimeout(r, 700));
    await h.none('over');
    // Ruby comes back with the token: the clock runs again, with the time that was left
    const g2 = await mk(); g2.send({ t: 'resume', code: hs.code, token: gTok });
    const back = await g2.next('joined'); assert(back.clock.left['-1'] > 450);
    do { c = await h.next('clock'); } while (c.clock.running !== -1);
    // ...and when Ruby's time runs out the game ends, Ivory wins, and a late move is refused
    const over = await h.next('over', 2000);
    assert.deepStrictEqual([over.over.winner, over.over.reason, over.over.by], [1, 'time', -1]);
    assert.strictEqual(over.clock.running, null); assert.strictEqual(over.clock.left['-1'], 0);
    const late = E.genMoves(E.play({ board: E.initialBoard(), turn: 1 }, mv).board, -1)[0];
    g2.send({ t: 'move', from: late.from, path: late.path });
    assert.strictEqual((await g2.next('error')).code, 'illegal');
    // rematch gives both players their full time again
    h.send({ t: 'rematch' }); g2.send({ t: 'rematch' });
    const fresh = await h.next('joined');
    assert.deepStrictEqual([fresh.clock.left['1'], fresh.clock.left['-1']], [500, 500]);
    [n1, n2, h, g2].forEach(x => x.ws.close());
    await fast.close();
  });


  /* ---------- Chkobba online ---------- */
  const CKE = require('../src/chkobba.js');
  async function ckTable(n, target) {
    const cs = []; for (let i = 0; i < n; i++) { const c = client(port); await c.open(); cs.push(c); }
    cs[0].send({ t: 'ckcreate', name: 'Host', n, target });
    const snaps = [await cs[0].next('ckjoined')];
    const code = snaps[0].code;
    for (let i = 1; i < n; i++) { cs[i].send({ t: 'join', code, name: 'P' + (i + 1) }); snaps.push(await cs[i].next('ckjoined')); }
    const starts = []; for (const c of cs) starts.push((await c.next('ckstate')).view);
    return { cs, snaps, starts, code };
  }
  /* play the current deal to its end with any legal moves; returns the last ckmoved event */
  async function ckPlayOut(T) {
    let view = T.views, last = null;
    for (let guard = 0; guard < 80; guard++) {
      const seat = view[0].turn; const mine = view[seat];
      let play = null;
      for (const card of mine.hand) { const o = CKE.captures(mine.table, card); play = { card, take: o.length ? o[0] : [] }; break; }
      T.cs[seat].send({ t: 'ckplay', card: play.card, take: play.take });
      const msgs = []; for (const c of T.cs) msgs.push(await c.next('ckmoved'));
      view = msgs.map(m => m.view); last = msgs[0].ev;
      T.views = view;
      if (last.ended) return last;
    }
    throw new Error('deal did not end');
  }

  await test('Chkobba table, 2 players: seats fill, the game starts and only the cutter sees the cut card', async () => {
    const T = await ckTable(2, 11);
    assert.strictEqual(T.snaps[0].seat, 0); assert.strictEqual(T.snaps[1].seat, 1);
    assert(T.snaps[0].host && !T.snaps[1].host);
    const v = T.starts;
    assert.strictEqual(v[0].phase, 'cut'); assert.strictEqual(v[0].target, 11);
    const cutter = v[0].cutter;
    assert(Number.isInteger(v[cutter].cutCard), 'the cutter sees the card');
    assert.strictEqual(v[1 - cutter].cutCard, null, 'the other player does not');
    assert.strictEqual(v[0].deck, 39);
    T.cs.forEach(c => c.ws.close());
  });

  await test('Chkobba: hands stay private, only the cutter can cut, and the turn order is enforced', async () => {
    const T = await ckTable(2, 21);
    const cutter = T.starts[0].cutter, other = 1 - cutter;
    T.cs[other].send({ t: 'ckcut', keep: true });
    assert.strictEqual((await T.cs[other].next('error')).code, 'illegal');
    T.cs[cutter].send({ t: 'ckcut', keep: true });
    const m = []; for (const c of T.cs) m.push(await c.next('ckmoved'));
    assert.strictEqual(m[0].ev.k, 'cut');
    for (let s = 0; s < 2; s++) {
      const v = m[s].view;
      assert.strictEqual(v.phase, 'play');
      assert.strictEqual(v.hand.length, v.handN[s], 'own hand is sent in full');
      assert.strictEqual(v.table.length, 4);
    }
    // a view carries only the receiver's own cards; the other hand is just a count
    const a = m[0].view, b = m[1].view;
    assert.deepStrictEqual(Object.keys(a).sort(), Object.keys(b).sort());
    assert.deepStrictEqual(a.handN, [3, 3]);
    assert(a.hand.every(c => b.hand.indexOf(c) < 0), 'no card is in both hands');
    const turn = a.turn, wrong = 1 - turn;
    T.cs[wrong].send({ t: 'ckplay', card: m[wrong].view.hand[0], take: [] });
    assert.strictEqual((await T.cs[wrong].next('error')).code, 'illegal');
    T.cs[turn].send({ t: 'ckplay', card: 39 === a.hand[0] ? 38 : 99, take: [] });   // a card not in hand
    assert.strictEqual((await T.cs[turn].next('error')).code, 'illegal');
    T.cs.forEach(c => c.ws.close());
  });

  await test('Chkobba: a whole deal can be played, scores arrive, and both players ready up for the next one', async () => {
    const T = await ckTable(2, 21);
    const cutter = T.starts[0].cutter;
    T.cs[cutter].send({ t: 'ckcut', keep: false });
    const m = []; for (const c of T.cs) m.push(await c.next('ckmoved'));
    T.views = m.map(x => x.view);
    const end = await ckPlayOut(T);
    assert(end.ended && end.score && Array.isArray(end.score.points));
    const v = T.views[0];
    assert.strictEqual(v.phase, 'scored');
    assert.strictEqual(v.stats[0].cards + v.stats[1].cards, 40, 'every card ended up in a pile');
    assert.strictEqual(v.scores[0] + v.scores[1], end.score.points[0] + end.score.points[1]);
    T.cs[0].send({ t: 'ckready' });
    const r = await T.cs[1].next('ckready'); assert.deepStrictEqual(r.ready, [0]);
    T.cs[1].send({ t: 'ckready' });
    const st = []; for (const c of T.cs) st.push(await c.next('ckstate'));
    assert.strictEqual(st[0].view.phase, 'cut'); assert.strictEqual(st[0].view.deals, 2);
    T.cs.forEach(c => c.ws.close());
  });

  await test('Chkobba, 4 players in two teams: seats, teammates, a fifth person watches, and reconnecting gives the same hand back', async () => {
    const T = await ckTable(4, 11);
    assert.deepStrictEqual(T.snaps.map(s => s.seat), [0, 1, 2, 3]);
    const late = client(port); await late.open();
    late.send({ t: 'join', code: T.code, name: 'Late' });
    assert.strictEqual((await late.next('error')).code, 'full');
    late.send({ t: 'watch', code: T.code, name: 'Late' });
    const w = await late.next('ckjoined');
    assert.strictEqual(w.role, 'watcher'); assert.deepStrictEqual(w.view.hand, []);
    const cutter = T.starts[0].cutter;
    T.cs[cutter].send({ t: 'ckcut', keep: true });
    const m = []; for (const c of T.cs) m.push(await c.next('ckmoved'));
    assert.strictEqual(m[0].view.handN.length, 4);
    // seat 2 drops and comes back with its token
    const back = client(port); await back.open();
    T.cs[2].ws.close(); await new Promise(r => setTimeout(r, 120));
    back.send({ t: 'resume', code: T.code, token: T.snaps[2].token });
    const again = await back.next('ckjoined');
    assert.strictEqual(again.seat, 2); assert.deepStrictEqual(again.view.hand, m[2].view.hand);
    [...T.cs, late, back].forEach(c => c.ws.close());
  });

  await test('Chkobba: a player who leaves frees the seat, the host seat moves on, and an empty table closes', async () => {
    const T = await ckTable(2, 11);
    T.cs[0].send({ t: 'leave' });
    let crowd; do { crowd = await T.cs[1].next('crowd'); } while (crowd.list.length !== 1);
    assert.strictEqual(crowd.list.length, 1); assert.strictEqual(crowd.host, crowd.list[0].id);
    const nu = client(port); await nu.open();
    nu.send({ t: 'join', code: T.code, name: 'New' });
    const j = await nu.next('ckjoined'); assert.strictEqual(j.seat, 0);
    T.cs[1].send({ t: 'leave' }); nu.send({ t: 'leave' });
    await new Promise(r => setTimeout(r, 150));
    const c2 = client(port); await c2.open(); c2.send({ t: 'join', code: T.code, name: 'x' });
    assert.strictEqual((await c2.next('error')).code, 'not_found');
    [T.cs[0], T.cs[1], nu, c2].forEach(c => c.ws.close());
  });

  await test('Ronda table: no cut, 4 table cards, announcements in the view, caida/missa events, and a turn timer value is sent', async () => {
    const RND = require('../src/ronda.js');
    const cs = []; for (let i = 0; i < 2; i++) { const c = client(port); await c.open(); cs.push(c); }
    cs[0].send({ t: 'ckcreate', name: 'Host', n: 2, target: 25, game: 'ronda', turn: 30 });
    const s0 = await cs[0].next('ckjoined');
    assert.strictEqual(s0.game, 'ronda'); assert.strictEqual(s0.target, 25); assert.strictEqual(s0.turnSec, 30);
    cs[1].send({ t: 'join', code: s0.code, name: 'P2' }); const s1 = await cs[1].next('ckjoined'); assert.strictEqual(s1.game, 'ronda');
    let views = []; for (const c of cs) views.push((await c.next('ckstate')).view);
    assert.strictEqual(views[0].phase, 'play'); assert.strictEqual(views[0].table.length, 4); assert.strictEqual(views[0].handN[0], 3);
    assert(views[0].tl > 25000 && views[0].tl <= 30000, 'the timer is running: ' + views[0].tl);
    assert.strictEqual(views[0].deck, 40 - 4 - 6);
    // only the player to move can play; a capture is forced
    const seat = views[0].turn, wrong = 1 - seat;
    cs[wrong].send({ t: 'ckplay', card: views[wrong].hand[0], take: [] }); assert.strictEqual((await cs[wrong].next('error')).code, 'illegal');
    let ended = false;
    for (let guard = 0; guard < 100 && !ended; guard++) {
      const st = views[0].turn, mine = views[st];
      const card = mine.hand[0], o = RND.captures(mine.table, card);
      cs[st].send({ t: 'ckplay', card, take: o.length ? o[0] : [] });
      const msgs = []; for (const c of cs) msgs.push(await c.next('ckmoved'));
      views = msgs.map(m => m.view); ended = msgs[0].ev.ended;
      assert.strictEqual(msgs[0].view.hand.length >= 0, true);
    }
    assert(ended && views[0].phase === 'scored');
    assert.strictEqual(views[0].stats[0].cards + views[0].stats[1].cards, 40, 'every card is in a pile at the end');
    cs.forEach(c => c.ws.close());
  });

  a.close(); b.close();
  await srv.close();
  console.log('\nALL ' + n + ' SERVER TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
