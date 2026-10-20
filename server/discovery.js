// Descubrimiento de partidas en la red local mediante difusión UDP.
const dgram = require('dgram');
const os = require('os');

const DISCOVERY_PORT = 47801;

function localIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push({ address: i.address, netmask: i.netmask });
  }
  return out;
}

function broadcastAddrs() {
  const set = new Set(['255.255.255.255']);
  for (const { address, netmask } of localIPs()) {
    const a = address.split('.').map(Number), m = netmask.split('.').map(Number);
    set.add(a.map((x, i) => (x & m[i]) | (~m[i] & 255)).join('.'));
  }
  return [...set];
}

function createAnnouncer(getInfo) {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  sock.on('error', () => {});
  sock.bind(() => { try { sock.setBroadcast(true); } catch { /* ignore */ } });
  const timer = setInterval(() => {
    const msg = Buffer.from(JSON.stringify(Object.assign({ app: 'catan-virtual' }, getInfo())));
    for (const addr of broadcastAddrs()) sock.send(msg, DISCOVERY_PORT, addr, () => {});
  }, 1500);
  return { stop() { clearInterval(timer); try { sock.close(); } catch { /* ignore */ } } };
}

function createListener(onGames) {
  const games = new Map();
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  sock.on('error', () => {});
  sock.on('message', (buf, rinfo) => {
    try {
      const m = JSON.parse(buf.toString());
      if (m.app !== 'catan-virtual') return;
      games.set(rinfo.address + ':' + m.port, Object.assign(m, { address: rinfo.address, seen: Date.now() }));
    } catch { /* ignore */ }
  });
  sock.bind(DISCOVERY_PORT);
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, g] of games) if (now - g.seen > 5000) games.delete(k);
    onGames([...games.values()]);
  }, 1000);
  return { stop() { clearInterval(timer); try { sock.close(); } catch { /* ignore */ } } };
}

module.exports = { createAnnouncer, createListener, localIPs };
