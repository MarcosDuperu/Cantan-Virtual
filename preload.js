const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isElectron: true,
  startHost: opts => ipcRenderer.invoke('lan:host-start', opts),
  stopHost: () => ipcRenderer.invoke('lan:host-stop'),
  announce: info => ipcRenderer.invoke('lan:announce', info),
  startDiscovery: cb => {
    ipcRenderer.removeAllListeners('lan:games');
    ipcRenderer.on('lan:games', (_e, games) => cb(games));
    return ipcRenderer.invoke('lan:discover-start');
  },
  stopDiscovery: () => { ipcRenderer.removeAllListeners('lan:games'); return ipcRenderer.invoke('lan:discover-stop'); },
  toggleFullscreen: () => ipcRenderer.invoke('app:fullscreen'),
  quit: () => ipcRenderer.invoke('app:quit'),
  version: () => ipcRenderer.invoke('app:version')
});
