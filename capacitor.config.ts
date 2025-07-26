import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c54dddee1b35436ca8f5ac47a1f9332f',
  appName: 'favor-channels',
  webDir: 'dist',
  server: {
    url: 'https://c54dddee-1b35-436c-a8f5-ac47a1f9332f.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;