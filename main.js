// Proceso principal de Electron
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { createRelay } = require('./server/relay');
const { createAnnouncer, createListener, localIPs } = require('./server/discovery');

let win = null;
let relay = null;
let announcer = null;
let listener = null;
let announceInfo = {};

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1100, minHeight: 700,
    backgroundColor: '#0d2b45',
    title: 'Catan Virtual',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.on('closed', () => { win = null; });
}

async function stopHost() {
  if (announcer) { announcer.stop(); announcer = null; }
  if (relay) { await relay.close(); relay = null; }
}

ipcMain.handle('lan:host-start', async (_e, opts) => {
  await stopHost();
  let port = (opts && opts.port) || 47800;
  for (let i = 0; i < 10; i++) {
    try { relay = await createRelay({ port: port + i }); break; } catch (err) { if (i === 9) throw err; }
  }
  announceInfo = Object.assign({ port: relay.port }, (opts && opts.info) || {});
  announcer = createAnnouncer(() => announceInfo);
  return { port: relay.port, ips: localIPs().map(i => i.address) };
});
ipcMain.handle('lan:host-stop', async () => { await stopHost(); return true; });
ipcMain.handle('lan:announce', (_e, info) => { if (relay) announceInfo = Object.assign({ port: relay.port }, info); return true; });
ipcMain.handle('lan:discover-start', e => {
  if (listener) listener.stop();
  const sender = e.sender;
  listener = createListener(games => { if (!sender.isDestroyed()) sender.send('lan:games', games); });
  return true;
});
ipcMain.handle('lan:discover-stop', () => { if (listener) { listener.stop(); listener = null; } return true; });
ipcMain.handle('app:quit', () => app.quit());
ipcMain.handle('app:fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); return win && win.isFullScreen(); });

// En Linux la aceleración por GPU provoca fallos de repintado en algunos equipos
if (process.platform === 'linux') app.disableHardwareAcceleration();

app.whenReady().then(createWindow);
app.on('window-all-closed', async () => { await stopHost(); if (listener) listener.stop(); app.quit(); });
