import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/hod-report-system/',
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['xlsx'],
  },
});
