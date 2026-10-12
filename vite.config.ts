import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
export default defineConfig({ plugins: [react(), tailwind()], test: { include: ['tests/**/*.test.ts'], environment: 'node', pool:'threads', fileParallelism:false } });
