import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dinosaurai.dinosoar',
  appName: 'DinoSoar',
  webDir: 'public',
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
    },
  },
};

export default config;
