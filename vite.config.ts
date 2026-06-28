import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fixed for repo: academicofficeusa/hod-report-system
// Live URL: https://academicofficeusa.github.io/hod-report-system/

export default defineConfig({
  base: '/hod-report-system/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['xlsx'],
  },
});
