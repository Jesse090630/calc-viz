/**
 * UI — 公式表的 KaTeX **预渲染缓存**。
 *
 * ⭐⭐ 这个文件是为了修一个真实的 bug 而存在的,不是为了"优化"。
 *
 * 症状:把公式表从五页扩到八页之后,右上角的 ∫ Formula deck **在首页点不开了**。
 *   —— 没有报错、没有 console error、chunk 也确实下载成功了,组件函数每秒被调用
 *   一百多次,可 Suspense 的 fallback 一直挂着,弹窗永远出不来。
 *
 * 病因(实测):
 *   · 在**静的**页面(`#/formulas`)上点,749 ms 就开了;
 *   · 在首页(卡片预览一直在动)和任何动画课(如 `#/cut-the-square`)上点,**8 秒都开不出来**。
 *   弹窗第一次渲染要跑两百多次 `katex.renderToString`,接近一秒。这是一次
 *   **低优先级**的 Suspense 渲染;而这些页面上有 rAF 驱动的状态更新在持续产生
 *   **高优先级**更新,React 于是一次又一次地把这次长渲染**从头重启**。
 *   它不是崩了,是**被饿死了** —— 永远排不到能跑完的那一格时间。
 *
 * ⚠️ 所以真正的修法不是"让它快一点",是**把这份工作整个搬出渲染过程**:
 *   目录是**死数据**,每条 TeX 渲染出来的 HTML 永远一样。于是在 chunk **求值时**
 *   (`warmTexCache` 在模块顶层被调用)就把它们全渲染好存进 Map。
 *   那一刻发生在 lazy import 解析期间,**不在 React 的渲染路径上**,
 *   不会被任何高优先级更新打断。等组件真的渲染时,每条公式只是查一次表。
 *
 * ⚠️ 别把这里换成组件里的 `useMemo`:useMemo 的计算仍然发生在渲染函数内部,
 *   照样会被重启、照样被饿死。位置才是关键,不是"缓存"这个词。
 */
import katex from 'katex';

const cache = new Map<string, string>();

/** 渲染一条 TeX,结果永久缓存。同一串 TeX 只会真正渲染一次。 */
export function texHtml(src: string): string {
  const hit = cache.get(src);
  if (hit !== undefined) return hit;
  const html = katex.renderToString(src, { throwOnError: false, displayMode: false });
  cache.set(src, html);
  return html;
}

/**
 * 在**模块求值时**把一批 TeX 全部预渲染好。
 * ⚠️ 必须在组件模块的顶层调用,不能放进组件体或 effect —— 见文件开头。
 */
export function warmTexCache(sources: Iterable<string>): void {
  for (const src of sources) texHtml(src);
}

/** 测试用:缓存里现在有多少条。 */
export function cacheSize(): number {
  return cache.size;
}
