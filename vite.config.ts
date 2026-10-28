import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import googleMapsHandler from './api/google-maps.js';

const googleMapsApiPlugin = () => ({
  name: 'google-maps-api-middleware',
  configureServer(server: any) {
    server.middlewares.use('/api/google-maps', (req: any, res: any) => {
      googleMapsHandler(req, res);
    });
  },
  configurePreviewServer(server: any) {
    server.middlewares.use('/api/google-maps', (req: any, res: any) => {
      googleMapsHandler(req, res);
    });
  },
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), googleMapsApiPlugin()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('leaflet')) return 'vendor-leaflet';
              if (id.includes('@supabase')) return 'vendor-supabase';
              if (id.includes('@google/genai')) return 'vendor-ai';
              if (id.includes('motion')) return 'vendor-motion';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('react-router-dom') || id.includes('react-dom') || id.includes('/react/')) {
                return 'vendor-react';
              }
            }
          },
        },
      },
    },
    server: {
      host: true,
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
