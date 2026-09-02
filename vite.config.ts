import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * ⚠️⚠️ 这里有一个**只在部署之后才会暴露**的陷阱,值得写清楚。
 *
 * GitHub Pages 有两种挂法,base 完全不同:
 *   · 没有自定义域名 → 站点在 `https://<用户名>.github.io/<仓库名>/` —— base 必须是 `/calc-viz/`;
 *   · **有**自定义域名 → 站点在 `https://那个域名/` 的**根**上 —— base 必须是 `/`。
 *
 * 而部署工作流是无条件设 `GITHUB_PAGES=true` 的。
 * 所以一旦接上自定义域名,如果 base 还写死成 `/calc-viz/`,
 * 每一个资源都会去请求 `https://那个域名/calc-viz/assets/...` —— **全部 404**,
 * 页面白屏,而本地怎么测都是好的。
 *
 * 解决办法是**让两者共用同一个事实来源**:
 * GitHub Pages 靠 `public/CNAME` 这个文件认自定义域名,那就让 base 也认它。
 * 有 CNAME → 根路径;没有 → 子路径。两者不可能再对不上。
 *
 * 换句话说:**要接域名,只需要新建 `public/CNAME` 并写进域名,别的什么都不用改。**
 */
export const CNAME_PATH = join(HERE, 'public', 'CNAME');

/** 配了自定义域名吗?返回域名本身,没有则 null。 */
export function customDomain(cnamePath: string = CNAME_PATH): string | null {
  if (!existsSync(cnamePath)) return null;
  const raw = readFileSync(cnamePath, 'utf8').trim();
  return raw.length > 0 ? raw : null;
}

/**
 * 该用哪个 base。
 * ⚠️ 单独导出是为了**能被测试直接调用** —— 这段逻辑错了,后果是线上整站白屏,
 * 而那正是最不该靠"部署之后再看看"来发现的一类错误。
 */
export function resolveBase(isGithubPages: boolean, domain: string | null): string {
  if (!isGithubPages) return '/';   // Vercel / Netlify / 本地开发都在根路径
  return domain === null ? '/calc-viz/' : '/';
}

export default defineConfig({
  base: resolveBase(process.env.GITHUB_PAGES === 'true', customDomain()),
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
