import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('cxsunDesktop', {
  apiBaseUrl: process.env.ELECTRON_API_BASE_URL?.trim() || 'http://codexsun.local:6005',
  appHost: process.env.ELECTRON_APP_HOST?.trim() || 'codexsun.local',
  hostsEntry: `127.0.0.1 ${process.env.ELECTRON_APP_HOST?.trim() || 'codexsun.local'}`,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node,
  },
})
