# Moroccan Dama Online

Moroccan Dama (الضامة المغربية) with private online tables and voice chat.
Also plays against the computer or two players on one device.

## Run it on your computer

    npm install
    npm run build      # only needed after editing files in src/
    npm start          # http://localhost:3000

Open http://localhost:3000 in two browser windows (or on two devices on the same wifi using
your computer's address). In one, choose **Play online with voice**, then **Create table**.
In the other, enter the code. Both press **Start voice** and allow the microphone.

## Put it on the internet

You need a host that can run a long-lived Node.js process (a VPS, Render, Railway, Fly.io...).
Plain shared/WordPress hosting that only serves files cannot run the table server.

1. Upload the folder (without `node_modules`), run `npm install --omit=dev`, then `npm start`.
   The port comes from the `PORT` environment variable (default 3000).
2. **Serve it over HTTPS.** Browsers only allow microphone access on https:// pages (and localhost).
   On a VPS, put Caddy or nginx in front of port 3000 with a free Let's Encrypt certificate.
   The proxy must pass WebSocket connections on the path `/ws`.
3. Keep it running with a process manager such as pm2 (`pm2 start server.js --name dama`).
4. Health check: `GET /healthz`.

### If voice does not connect for some pairs of players

Voice goes directly between the two browsers. Most pairs connect with the free STUN servers
that are built in. Some networks (strict mobile carriers, office wifi) need a TURN relay.
Get TURN credentials from a TURN provider (many have a free tier), then start the server with:

    TURN_URLS="turn:your.turn.host:3478,turns:your.turn.host:5349" \
    TURN_USERNAME="user" TURN_CREDENTIAL="secret" npm start

## How it works

- `src/engine.js` is the single rules engine. The server uses it to check every move,
  and the browser uses it to show legal moves, so they always agree.
- `server.js` runs tables over WebSocket. Tables live in memory and are removed after 30 minutes
  with nobody connected. Restarting the server closes all tables.
- A refresh or dropped connection resumes the same table automatically (token kept in the tab).
- Voice uses WebRTC. The server only relays the connection setup messages. Audio never touches it.
- Rematch swaps colours so the other player moves first.
- The board is mirrored so the long 8-square diagonal runs from each player's bottom-right corner to the top-left. Move notation (a-h, 1-8) follows that layout, with file a on the left.

## Files

    server.js              table server + static page
    src/engine.js          rules (shared by server and browser)
    src/ai.js              computer opponent (browser only)
    src/client.template.html   the page; build.js inlines the engine and AI into public/index.html
    test/                  engine, server and two-window UI tests (npm test)

## If your host blocks WebSockets

The page tries a WebSocket first. If it cannot open one (some shared hosts block them) it switches
automatically to a fallback (Server-Sent Events down, HTTP POST up) and the game works the same.
Voice is peer-to-peer, so it is not affected either way.

## Deploying from GitHub (Hostinger Node.js web app)

- Entry file: `server.js`, Node 22, **no build command** (`public/index.html` is already built and committed).
- After editing anything in `src/`, run `npm run build` and commit the new `public/index.html`.
- Tests run automatically on every push (GitHub Actions: `.github/workflows/test.yml`).
