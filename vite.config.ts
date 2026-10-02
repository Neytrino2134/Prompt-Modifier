
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  const apiKey = env.API_KEY || env.GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  return {
    base: mode === 'production' ? './' : '/',
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey),
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      proxy: {
        '/api/tripo-v3': {
          target: 'https://openapi.tripo3d.ai/v3',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tripo-v3/, ''),
          secure: false,
          headers: {
            'Origin': 'https://openapi.tripo3d.ai',
          },
        },
        '/api/tripo': {
          target: 'https://api.tripo3d.ai/v2/openapi',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/tripo/, ''),
          secure: false,
          headers: {
            'Origin': 'https://api.tripo3d.ai',
          },
        },
      },
    },
    build: {
      outDir: 'dist',
    }
  };
});
