
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    base: './', // Changed from '/Prompt-Modifier/' to './' for universal compatibility
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    server: {
      port: 5173,
      strictPort: true, // Forces Vite to fail if 5173 is busy, ensuring Electron always finds the right port
    },
    build: {
      outDir: 'dist',
    }
  };
});
