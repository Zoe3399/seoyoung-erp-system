import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const appDir = dirname(fileURLToPath(import.meta.url));
  const envDir = resolve(appDir, '../..');
  const env = loadEnv(mode, envDir, '');
  const apiPort = Number(env.API_PORT ?? 4000);
  const webPort = Number(env.WEB_PORT ?? 5173);

  return {
    base: './',
    envDir,
    plugins: [react()],
    server: {
      port: webPort,
      fs: {
        allow: [envDir],
      },
      proxy: {
        '/api': {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
  };
});
