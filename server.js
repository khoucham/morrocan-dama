/* Entry file. Always starts the server, because some hosts (Hostinger) load this file through
   their own wrapper, where a "run only if called directly" check would never fire.
   The game logic lives in app.js so the tests can import it without starting anything. */
const { start } = require('./app.js');

const port = Number(process.env.PORT) || 3000;
start(port).then(s => console.log('Moroccan Dama online listening on port ' + s.port));
