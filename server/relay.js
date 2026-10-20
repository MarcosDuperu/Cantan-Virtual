// Servidor de partida LAN: reenvía mensajes entre el anfitrión y los jugadores.
// El anfitrión (host) ejecuta el motor; los demás solo envían acciones.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function createRelay({ port = 47800, staticDir = null, host = '0.0.0.0' } = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (!staticDir) { res.writeHead(404); res.end(); return; }
      let p = decodeURIComponent((req.url || '/').split('?')[0]);
      if (p === '/') p = '/index.html';
      const file = path.normalize(path.join(staticDir, p));
      if (!file.startsWith(path.normalize(staticDir))) { res.writeHead(403); res.end(); return; }
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('No encontrado'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    const wss = new WebSocketServer({ server });
    let hostSock = null;
    let nextId = 1;
    const clients = new Map();
    const info = { players: 0 };

    const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };

    wss.on('connection', ws => {
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('message', raw => {
        let m;
        try { m = JSON.parse(raw.toString()); } catch { return; }
        if (m.t === 'hello') {
          if (m.role === 'host') {
            if (hostSock && hostSock.readyState === 1) { send(ws, { t: 'error', msg: 'Ya hay un anfitrión' }); ws.close(); return; }
            hostSock = ws; ws.role = 'host';
            send(ws, { t: 'welcome', role: 'host' });
            return;
          }
          if (!hostSock) { send(ws, { t: 'error', msg: 'No hay partida en este equipo' }); ws.close(); return; }
          const id = 'c' + (nextId++);
          ws.role = 'player'; ws.cid = id;
          clients.set(id, ws);
          send(ws, { t: 'welcome', role: 'player', cid: id });
          send(hostSock, { t: 'join', cid: id, profile: m.profile || {} });
          return;
        }
        if (ws.role === 'host') {
          if (m.t === 'to') send(clients.get(m.cid), m.msg);
          else if (m.t === 'all') clients.forEach(c => send(c, m.msg));
          else if (m.t === 'kick') { const c = clients.get(m.cid); if (c) { send(c, { t: 'kicked', msg: m.msg }); c.close(); } }
          else if (m.t === 'info') Object.assign(info, m.info);
          return;
        }
        if (ws.role === 'player') send(hostSock, { t: 'from', cid: ws.cid, msg: m });
      });
      ws.on('close', () => {
        if (ws.role === 'host') {
          hostSock = null;
          clients.forEach(c => { send(c, { t: 'hostGone' }); c.close(); });
          clients.clear();
        } else if (ws.role === 'player') {
          clients.delete(ws.cid);
          send(hostSock, { t: 'leave', cid: ws.cid });
        }
      });
    });

    const ping = setInterval(() => {
      wss.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        try { ws.ping(); } catch { /* ignore */ }
      });
    }, 10000);

    server.on('error', reject);
    server.listen(port, host, () => {
      resolve({
        port: server.address().port,
        info,
        close: () => new Promise(r => { clearInterval(ping); wss.clients.forEach(c => c.terminate()); wss.close(); server.close(() => r()); })
      });
    });
  });
}

module.exports = { createRelay };
