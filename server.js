/* Moroccan Dama online server.
   - Serves the single-page client.
   - Runs private two-player tables over WebSocket (/ws).
   - Validates every move with the same rules engine the browser uses, so the server decides what is legal.
   - Relays WebRTC signalling so the two browsers can open a direct voice call.
   Audio never passes through this server. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { EventEmitter } = require('events');
const { WebSocketServer } = require('ws');
const E = require('./src/engine.js');

const INDEX = path.join(__dirname, 'public', 'index.html');
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I
const ROOM_IDLE_MS = 30 * 60 * 1000;
const ROOM_MAX_MS = 8 * 60 * 60 * 1000;

/* Voice works between most pairs of players with STUN alone. A TURN relay covers strict networks
   (some mobile carriers, corporate wifi). Set TURN_URLS / TURN_USERNAME / TURN_CREDENTIAL to enable it. */
function iceConfig() {
  const servers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (process.env.TURN_URLS) {
    servers.push({
      urls: process.env.TURN_URLS.split(',').map(s => s.trim()).filter(Boolean),
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || ''
    });
  }
  return { iceServers: servers };
}

function start(port, host) {
  const rooms = new Map();
  const sseClients = new Map();   // fallback connections (no WebSocket needed), keyed by session id
  const SID = /^[A-Za-z0-9_-]{16,64}$/;

  /* Fallback transport for hosts that do not pass WebSocket upgrades through:
     GET /sse?sid=...  keeps one long-lived response open (server -> browser),
     POST /send?sid=... carries each browser -> server message.
     An SSE connection is wrapped so the table logic treats it exactly like a WebSocket. */
  function openSse(req, res, sid) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Content-Encoding': 'identity'
    });
    res.write('retry: 3000\n\n: ok\n\n');
    const old = sseClients.get(sid);
    if (old) old.terminate();
    const a = new EventEmitter();
    a.readyState = 1; a.isAlive = true; a.isSse = true;
    const safeWrite = s => { try { res.write(s); } catch (e) {} };
    a.send = s => { if (a.readyState === 1) safeWrite('data: ' + s + '\n\n'); };
    a.close = a.terminate = () => { if (a.readyState === 3) return; a.readyState = 3; try { res.end(); } catch (e) {} };
    a.ping = () => { if (a.readyState === 1) safeWrite(': ping\n\n'); a.isAlive = true; };
    sseClients.set(sid, a);
    const keep = setInterval(() => a.ping(), 15000);
    res.on('close', () => {
      clearInterval(keep); a.readyState = 3;
      if (sseClients.get(sid) === a) sseClients.delete(sid);
      a.emit('close');
    });
    onConnection(a);
  }

  function receiveSse(req, res, sid) {
    const a = sseClients.get(sid);
    if (!a) { res.writeHead(410); return res.end(); }
    const chunks = []; let size = 0, dead = false;
    req.on('data', c => {
      if (dead) return;
      size += c.length;
      if (size > 16 * 1024) { dead = true; res.writeHead(413); res.end(); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (dead) return;
      a.emit('message', Buffer.concat(chunks));
      res.writeHead(204); res.end();
    });
  }

  const server = http.createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://localhost');
    const url = u.pathname;
    if (url === '/sse' || url === '/send') {
      const sid = u.searchParams.get('sid') || '';
      if (!SID.test(sid)) { res.writeHead(400); return res.end(); }
      if (url === '/sse' && req.method === 'GET') return openSse(req, res, sid);
      if (url === '/send' && req.method === 'POST') return receiveSse(req, res, sid);
      res.writeHead(405); return res.end();
    }
    if (url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('ok ' + rooms.size + ' tables');
    }
    if (url === '/' || url === '/index.html') {
      fs.readFile(INDEX, (err, data) => {
        if (err) { res.writeHead(500); return res.end('Client not built. Run: npm run build'); }
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'X-Content-Type-Options': 'nosniff',
          'Permissions-Policy': 'microphone=(self)'
        });
        res.end(data);
      });
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16 * 1024 });

  /* ---------- helpers ---------- */
  const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
  const sendSide = (room, side, obj) => { const p = room.p[side]; if (p) send(p.ws, obj); };
  const broadcast = (room, obj) => { sendSide(room, 1, obj); sendSide(room, -1, obj); };
  const fail = (ws, message, code) => send(ws, { t: 'error', message, code: code || 'error' });

  function newCode() {
    for (;;) {
      let c = '';
      for (let i = 0; i < 5; i++) c += ALPHABET[crypto.randomInt(ALPHABET.length)];
      if (!rooms.has(c)) return c;
    }
  }
  const cleanName = (n, fallback) =>
    String(n == null ? '' : n).replace(/[\u0000-\u001f\u007f<>]/g, '').trim().slice(0, 20) || fallback;

  function freshState() {
    const st = E.createState(1);
    return { board: st.board, turn: st.turn, over: st.over };
  }

  function snapshot(room, side, reason) {
    const me = room.p[side], opp = room.p[-side];
    return {
      t: 'joined', reason, code: room.code, side, token: me.token,
      names: { '1': room.p[1] ? room.p[1].name : null, '-1': room.p[-1] ? room.p[-1].name : null },
      peer: !!(opp && opp.ws && opp.ws.readyState === 1),
      ice: iceConfig(),
      board: Array.from(room.state.board), turn: room.state.turn, over: room.state.over,
      log: room.log, last: room.last,
      drawOffered: room.drawOffer === -side,
      rematchPeer: !!room.rematch[-side]
    };
  }

  function attach(room, side, ws) {
    const p = room.p[side];
    if (p.ws && p.ws !== ws) { try { p.ws.close(4000, 'replaced'); } catch (e) {} }
    p.ws = ws; ws.room = room; ws.side = side;
    room.lastActive = Date.now();
  }

  /* ---------- message handlers ---------- */
  function onCreate(ws, m) {
    if (ws.room) return fail(ws, 'You are already at a table.');
    const code = newCode();
    const room = {
      code, createdAt: Date.now(), lastActive: Date.now(),
      p: { '1': null, '-1': null }, state: freshState(), log: [], last: null,
      drawOffer: null, rematch: { '1': false, '-1': false }
    };
    room.p[1] = { name: cleanName(m.name, 'Player 1'), token: crypto.randomBytes(16).toString('hex'), ws: null };
    rooms.set(code, room);
    attach(room, 1, ws);
    send(ws, snapshot(room, 1, 'create'));
  }

  function onJoin(ws, m) {
    if (ws.room) return fail(ws, 'You are already at a table.');
    const room = rooms.get(String(m.code || '').toUpperCase().trim());
    if (!room) return fail(ws, 'No table with that code. Check it and try again.', 'not_found');
    const side = !room.p[-1] ? -1 : !room.p[1] ? 1 : 0;
    if (!side) return fail(ws, 'That table is full.', 'full');
    room.p[side] = { name: cleanName(m.name, side === 1 ? 'Player 1' : 'Player 2'), token: crypto.randomBytes(16).toString('hex'), ws: null };
    attach(room, side, ws);
    send(ws, snapshot(room, side, 'join'));
    sendSide(room, -side, { t: 'peer', status: 'joined', name: room.p[side].name });
  }

  function onResume(ws, m) {
    const room = rooms.get(String(m.code || '').toUpperCase().trim());
    if (!room) return fail(ws, 'That table no longer exists.', 'not_found');
    const side = [1, -1].find(s => room.p[s] && room.p[s].token === m.token);
    if (!side) return fail(ws, 'That table no longer exists.', 'not_found');
    if (ws.room && ws.room !== room) ws.room = null;
    attach(room, side, ws);
    send(ws, snapshot(room, side, 'resume'));
    sendSide(room, -side, { t: 'peer', status: 'online', name: room.p[side].name });
  }

  function onMove(ws, m) {
    const room = ws.room, side = ws.side;
    if (!room) return fail(ws, 'Not at a table.');
    if (room.state.over) return fail(ws, 'The game is over.', 'illegal');
    if (!room.p[-side]) return fail(ws, 'Waiting for your friend to join.', 'illegal');
    if (room.state.turn !== side) return fail(ws, 'It is not your turn.', 'illegal');
    const from = Number(m.from), p = Array.isArray(m.path) ? m.path.map(Number) : [];
    if (!Number.isInteger(from) || p.length < 1 || p.length > 24 || p.some(x => !Number.isInteger(x) || x < 0 || x > 63)) {
      return fail(ws, 'Illegal move.', 'illegal');
    }
    let next;
    try { next = E.play(room.state, { from, path: p, caps: [] }); }
    catch (e) { return fail(ws, 'Illegal move.', 'illegal'); }
    const mv = next.lastMove, text = E.moveText(mv);
    room.state = { board: next.board, turn: next.turn, over: next.over };
    room.log.push({ side, text });
    room.last = mv; room.drawOffer = null; room.lastActive = Date.now();
    broadcast(room, { t: 'moved', move: mv, turn: next.turn, over: next.over, text, side });
  }

  function endGame(room, over) {
    room.state.over = over; room.drawOffer = null; room.lastActive = Date.now();
    broadcast(room, { t: 'over', over });
  }

  function onDraw(ws, m) {
    const room = ws.room, side = ws.side;
    if (!room || room.state.over || !room.p[-side]) return;
    if (m.action === 'offer') {
      room.drawOffer = side;
      sendSide(room, -side, { t: 'draw', action: 'offered' });
    } else if (m.action === 'accept' && room.drawOffer === -side) {
      endGame(room, { winner: 0, reason: 'agreed' });
    } else if (m.action === 'decline' && room.drawOffer === -side) {
      room.drawOffer = null;
      sendSide(room, -side, { t: 'draw', action: 'declined' });
    }
  }

  function onRematch(ws) {
    const room = ws.room, side = ws.side;
    if (!room || !room.state.over || !room.p[-side]) return;
    room.rematch[side] = true;
    if (!room.rematch[-side]) { sendSide(room, -side, { t: 'rematch', action: 'requested' }); return; }
    // both agreed: swap colours so the other player moves first
    const a = room.p[1], b = room.p[-1];
    room.p[1] = b; room.p[-1] = a;
    if (room.p[1].ws) room.p[1].ws.side = 1;
    if (room.p[-1].ws) room.p[-1].ws.side = -1;
    room.state = freshState(); room.log = []; room.last = null; room.drawOffer = null;
    room.rematch = { '1': false, '-1': false };
    room.lastActive = Date.now();
    sendSide(room, 1, snapshot(room, 1, 'rematch'));
    sendSide(room, -1, snapshot(room, -1, 'rematch'));
  }

  function leaveRoom(ws, explicit) {
    const room = ws.room, side = ws.side;
    if (!room) return;
    const p = room.p[side];
    if (p && p.ws === ws) {
      if (explicit) room.p[side] = null; else p.ws = null;
      sendSide(room, -side, { t: 'peer', status: explicit ? 'left' : 'offline' });
    }
    room.lastActive = Date.now();
    if (!room.p[1] && !room.p[-1]) rooms.delete(room.code);
    ws.room = null; ws.side = 0;
  }

  /* ---------- connection ---------- */
  function onConnection(ws) {
    ws.isAlive = true; ws.room = null; ws.side = 0; ws.msgCount = 0;
    ws.on('pong', () => { ws.isAlive = true; });
    const rate = setInterval(() => { ws.msgCount = 0; }, 10000);

    ws.on('message', raw => {
      if (++ws.msgCount > 400) return;                  // flood guard
      let m; try { m = JSON.parse(raw.toString()); } catch (e) { return; }
      if (!m || typeof m.t !== 'string') return;
      switch (m.t) {
        case 'create': return onCreate(ws, m);
        case 'join': return onJoin(ws, m);
        case 'resume': return onResume(ws, m);
        case 'move': return onMove(ws, m);
        case 'sync': if (ws.room) send(ws, snapshot(ws.room, ws.side, 'sync')); return;
        case 'resign':
          if (ws.room && !ws.room.state.over && ws.room.p[-ws.side]) endGame(ws.room, { winner: -ws.side, reason: 'resign', by: ws.side });
          return;
        case 'draw': return onDraw(ws, m);
        case 'rematch': return onRematch(ws);
        case 'leave': return leaveRoom(ws, true);
        case 'signal': {
          if (!ws.room || m.data == null) return;
          const s = JSON.stringify(m.data);
          if (s.length > 12000) return;
          sendSide(ws.room, -ws.side, { t: 'signal', data: m.data });
          return;
        }
        default: return;
      }
    });

    ws.on('close', () => { clearInterval(rate); leaveRoom(ws, false); });
    ws.on('error', () => {});
  }
  wss.on('connection', onConnection);

  const beat = setInterval(() => {
    [...wss.clients, ...sseClients.values()].forEach(ws => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      try { ws.ping(); } catch (e) {}
    });
  }, 25000);

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms) {
      const live = [1, -1].some(s => room.p[s] && room.p[s].ws);
      if ((!live && now - room.lastActive > ROOM_IDLE_MS) || now - room.createdAt > ROOM_MAX_MS) rooms.delete(code);
    }
  }, 5 * 60 * 1000);
  beat.unref(); sweep.unref();

  return new Promise(resolve => {
    server.listen(port, host || '0.0.0.0', () => {
      resolve({
        server, wss, rooms, port: server.address().port,
        close: () => new Promise(r => {
          clearInterval(beat); clearInterval(sweep);
          wss.clients.forEach(c => c.terminate());
          [...sseClients.values()].forEach(c => c.terminate());
          wss.close(() => server.close(() => r()));
          if (server.closeAllConnections) server.closeAllConnections();
        })
      });
    });
  });
}

module.exports = { start };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  start(port).then(s => console.log('Moroccan Dama online listening on port ' + s.port));
}
