const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  // Credential management
  saveCredentials: (platform, creds) => ipcRenderer.invoke('save-credentials', platform, creds),
  getCredentials: () => ipcRenderer.invoke('get-credentials'),
  getRawCredentials: () => ipcRenderer.invoke('get-raw-credentials'),
  // Job searching (with stored credentials)
  searchJobsCredentialed: (keywords, location) => ipcRenderer.invoke('search-jobs-credentialed', { keywords, location }),
  // Fallback: open browser tabs
  searchJobs: (keywords, location) => ipcRenderer.invoke('search-jobs', { keywords, location }),
  openSearchUrls: (urls) => ipcRenderer.invoke('open-search-urls', urls),
})