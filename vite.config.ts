import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // GitHub Pages 把站点放在 /<仓库名>/ 子路径下;Vercel / Netlify 在根路径。
  // 用环境变量区分,这样一套代码两种托管都能用。
  base: process.env.GITHUB_PAGES === 'true' ? '/calc-viz/' : '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
