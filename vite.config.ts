import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
    base: '/exel-wb-integration',
    plugins: [react()],
    build: { chunkSizeWarningLimit: 3000, outDir: './build' },
});
