import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Vite 开发服务器配置，端口 4101 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4101,
    strictPort: true,
  },
});
