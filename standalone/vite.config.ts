import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * ⚠️ `base: './'` 和**不分片**是关键:产物要能从 `file://` 直接打开。
 *   分片之后浏览器会去 fetch 同目录的 .js,而 file:// 下那是跨源,会被拦。
 */
/**
 * ⚠️ `root` 必须是**项目根**,不是 standalone 目录。
 *   Tailwind 4 按 root 去扫 class 名;把 root 设成 standalone/ 的话,
 *   它根本看不到 `src/labs/...`,于是一条工具类都不生成 ——
 *   产物能跑、数字也对,但**完全没有样式**,就是一堆裸文字。
 *   (这次是靠真的用 file:// 打开截图才发现的。)
 */
export default defineConfig({
  root: join(HERE, '..'),
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: { input: join(HERE, 'index.html'), output: { inlineDynamicImports: true } },
    outDir: join(HERE, 'out'),
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000, // 字体等一律内联
    cssCodeSplit: false,
  },
});
