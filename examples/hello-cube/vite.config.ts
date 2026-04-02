import { defineConfig } from 'vite';

export default defineConfig({
  server: { host: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@dimforge/rapier3d-compat')) {
            return 'rapier';
          }

          if (id.includes('three/examples/jsm')) {
            return 'three-extras';
          }

          if (id.includes('node_modules/three')) {
            return 'three';
          }

          return undefined;
        },
      },
    },
  },
});
