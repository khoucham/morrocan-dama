# Moroccan Dama Online

Moroccan Dama (الضامة المغربية) with private online tables and voice chat.
Also plays against the computer or two players on one device.

## Run it on your computer

    npm install
    npm run build      # only needed after editing files in src/
    npm start          # http://localhost:3000

Open http://localhost:3000 in two browser windows (or on two devices on the same wifi using
your computer's address). In one, choose **Play online with voice**, then **Create table**.
In the other, open the invite link (it takes you straight to the table). Both tap the big microphone button and allow the microphone.

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
- **Watchers.** The host's invite box has a second link ending in `/watch`. Up to 4 watchers can join; they see the
  board live, cannot play, and join the call **muted**. The host sees a Mute/Unmute button under each watcher, and a
  watcher can raise a hand to ask to speak. Everyone connects to everyone (a mesh), so keep it to about 6 people.
  Muting is enforced by the server's list: the muted person's microphone is switched off and everyone else's
  browser stops playing their audio. Opening the play link when both seats are taken joins as a watcher automatically.
- Rematch swaps colours so the other player moves first.
- The board is mirrored so the long 8-square diagonal runs from each player's bottom-right corner to the top-left. Move notation (a-h, 1-8) follows that layout, with file a on the left.

## Files

    server.js              entry file, starts the server
    app.js                 table server + static page
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

## Phone app, sounds, chat

- **Installable app.** The page has a manifest, icons and a small service worker (`public/sw.js`). On Android/Chrome
  an "Install the app" button appears on the menu; on iPhone the menu shows "Share, then Add to Home Screen". Once
  installed it opens full screen, and the computer / two-player modes also start with no connection.
  The icons are made from `tools/icon.svg` with `node tools/make-icons.js` (needs playwright; the PNGs are committed).
- **Sounds.** Synthesised in the browser (no audio files): move, capture, crown, friend joins, your turn, chat pop,
  win / lose / draw. One switch (Sound: on/off) is remembered on each device.
- **Chat and reactions.** Everyone at the table, watchers included, can write (200 characters, two messages a second).
  The last 30 messages are kept so latecomers see them. Six quick reactions float over the board.

## Clock, hint, puzzles

- **Game clock.** When creating a table choose No clock, 3, 5 or 10 minutes each. The server keeps the time; it only runs
  while both players are connected, and running out of time loses the game.
- **Hint.** The Hint button on a local game shows the computer's best move (depth 12, about one second).
- **Tactic puzzles.** 16 puzzles, each with exactly one winning first move (checked by the engine in
  `test/puzzles.test.js`). Progress is saved on the device. Regenerate with `node tools/make-puzzles.js`.
