import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Load environment-specific configurations
  const isLocal = mode === 'development' || !process.env.VITE_ENVIRONMENT;
  
  return {
    plugins: [react(), tailwind()],
    server: {
      // Only use proxy in local development mode
      proxy: isLocal ? {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/admin': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      } : undefined,
    },
    define: {
      // Make environment variables available to the app
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    build: {
      // Optimize for production
      sourcemap: mode === 'development',
      minify: mode === 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            query: ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
