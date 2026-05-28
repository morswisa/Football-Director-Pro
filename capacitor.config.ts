import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.footballdirectorpro.app",
  appName: "Football Director Pro",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;
