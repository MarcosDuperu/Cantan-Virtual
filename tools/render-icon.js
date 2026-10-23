// Convierte build/icon.svg en PNG (512, 256 y 128 px) usando Electron.
// Uso: npx electron tools/render-icon.js --no-sandbox
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'build');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
  const win = new BrowserWindow({ show: false, width: 600, height: 600, webPreferences: { offscreen: true } });
  await win.loadURL('data:text/html,<html><body></body></html>');
  for (const size of [512, 256, 128]) {
    const data = await win.webContents.executeJavaScript(`new Promise(r => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = c.height = ${size};
        c.getContext('2d').drawImage(img, 0, 0, ${size}, ${size}); r(c.toDataURL('image/png')); };
      img.src = 'data:image/svg+xml;base64,' + ${JSON.stringify(Buffer.from(svg).toString('base64'))};
    })`);
    const name = size === 512 ? 'icon.png' : `icon-${size}.png`;
    fs.writeFileSync(path.join(dir, name), Buffer.from(data.split(',')[1], 'base64'));
    console.log('generado', name);
  }
  app.quit();
});
