export const platformSyncTags = {
  onlineOnly: {
    online: true,
    offline: false,
    mode: 'online-only',
  },
  offlineCapable: {
    online: true,
    offline: true,
    mode: 'offline-capable',
  },
  mirrorEvidence: {
    online: true,
    offline: true,
    mode: 'mirror-evidence',
  },
} as const
