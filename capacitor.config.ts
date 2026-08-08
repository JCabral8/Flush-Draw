import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.flushdraw.pokergolf',
  appName: 'Poker Golf',
  webDir: 'dist',
  backgroundColor: '#0d2b31',
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
