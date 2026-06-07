const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  // Job searching
  searchJobs: (keywords, location) => ipcRenderer.invoke('search-jobs', { keywords, location }),
  openSearchUrls: (urls) => ipcRenderer.invoke('open-search-urls', urls),
})
