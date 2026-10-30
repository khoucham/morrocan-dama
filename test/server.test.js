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
      const w = { pred, resolve, timer: setTimeout(() => reject(new Error('timeout waiting for ' + t)), ms) };
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

  a.close(); b.close();
  await srv.close();
  console.log('\nALL ' + n + ' SERVER TESTS PASSED');
  process.exit(0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
