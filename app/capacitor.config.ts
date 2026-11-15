import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.local.financedemo',
  appName: '丰收互联（演示）',
  webDir: 'dist-native',
  backgroundColor: '#f7f7f7',
  ios: { contentInset: 'automatic', backgroundColor: '#f7f7f7' },
  android: { backgroundColor: '#f7f7f7', allowMixedContent: false },
};

export default config;
