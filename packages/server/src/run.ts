import { startRelayServer } from './server.js';

startRelayServer({
  onPlayerCount: (n) => console.log(`[arcane-server] players: ${n}`),
});
