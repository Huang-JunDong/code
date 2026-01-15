import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  optimizeDeps: {
    // 不要预构建 online-editor，让它的 import.meta.url 能正确解析
    exclude: ['online-editor'],
  },
  worker: {
    format: 'es',
  },
  server: {
    host: 'localhost',
    fs: {
      strict: false,
    },
  },

  build: {
    rollupOptions: {
      output: {
        assetFileNames: '[name]-[hash].[ext]',
      },
    },
  },
});
