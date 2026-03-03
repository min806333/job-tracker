import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.minwoo.jobtracker',
  appName: 'Job Tracker',
  webDir: 'dist',
  server: {
    url: "https://job-tracker-nine-xi.vercel.app/dashboard",
    cleartext: false
  }
};

export default config;
