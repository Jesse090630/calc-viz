/**
 * UI — 换版之后那块**黑屏**的修法。
 *
 * ⭐⭐⭐ 这个文件是为了修一个真实事故而存在的,不是防御性编程。
 *
 * 症状(Jesse 的原话):「whenever i click on the theorem page, i will black out,
 *   or nothing changes」—— 点开一课,整屏变黑,或者点了像没点。
 *
 * 病因(查出来的,不是猜的):
 *   · 每条课都是 `lazy(() => import(...))`,产物文件名带内容哈希;
 *   · 一次部署会把所有哈希换掉;
 *   · 而**一直开着的那个标签页**手里是旧的 `index.html` 和旧 chunk。
 *     它去取新的、或者把新旧两批混着用,于是某个组件解析成 `undefined`,
 *     React 抛 **#130(Element type is invalid)**;
 *   · 整个应用**没有任何 error boundary** —— React 19 遇到未捕获的渲染错误
 *     会把整棵树卸载掉。`#root` 变成空的,页面只剩 `bg-slate-950` 的底色。
 *     **那就是"黑屏"。** 而错误发生在路由切换时,所以看上去就是"点了没反应"。
 *
 * ⚠️ 用全新浏览器打开线上站点,每一条路由都正常 —— 所以**线上产物是好的**。
 *   这件事只打击"页面一直开着、跨过了一次部署"的人,也就是最常用这个站的人。
 *
 * ⭐ 修法:重新加载一次就好 —— 新的 `index.html` 带来配套的新 chunk。
 *   所以捕获到错误时**自动重载一次**,并用一个会话级标记防止无限重载。
 *   重载之后还错,说明不是版本错位而是真 bug,这时**显示一条看得见的消息**,
 *   绝不再让用户对着一块黑屏猜。
 *
 * ⚠️ 判定逻辑单独抽在这里,而不是埋在组件里 —— 埋进去就只能靠手点来测,
 *   而"黑屏"这种事恰恰是手点最容易漏掉的。
 */

/** 会话级标记:这个路由已经自动重载过一次了。 */
export const RELOAD_PREFIX = 'calcviz:reloaded:';

export type Recovery = 'reload' | 'show-message';

/**
 * 出错之后该做什么。
 *
 * ⚠️ 不去分辨"这是不是版本错位错误"。分辨不可靠,而代价不对称:
 *   把版本错位误判成真 bug,用户继续看黑屏(很糟);
 *   把真 bug 误判成版本错位,用户多看一次闪烁然后看到消息(可以接受)。
 *   所以**一律先重载一次**,第二次再说实话。
 */
export function decideRecovery(alreadyReloaded: boolean): Recovery {
  return alreadyReloaded ? 'show-message' : 'reload';
}

/** 这个路由的标记键。 */
export function reloadKey(route: string): string {
  return `${RELOAD_PREFIX}${route}`;
}

/**
 * 读标记。
 * ⚠️ `sessionStorage` 在隐私模式、被禁用的第三方上下文里会**抛异常**,
 *   不是返回 null。这里吞掉异常当作"没重载过" —— 最差也就是多重载一次,
 *   总好过在错误处理代码里再抛一个错误。
 */
export function hasReloaded(route: string, store: Storage | null): boolean {
  if (store === null) return false;
  try {
    return store.getItem(reloadKey(route)) !== null;
  } catch {
    return false;
  }
}

export function markReloaded(route: string, store: Storage | null): void {
  if (store === null) return;
  try {
    store.setItem(reloadKey(route), '1');
  } catch {
    /* 存不进去就算了,大不了多重载一次 */
  }
}

/**
 * 这个路由已经好了,把标记清掉。
 * ⚠️ 不清的话,用户这一整个会话里**再也享受不到自动重载** ——
 *   下次真的换版时又会看到黑屏。
 */
export function clearReloaded(route: string, store: Storage | null): void {
  if (store === null) return;
  try {
    store.removeItem(reloadKey(route));
  } catch {
    /* ignore */
  }
}

/**
 * 从 hash 里取路由名。和 `App.tsx` 里那个极简路由器用同一条规则。
 * ⚠️ `main.tsx` 的 preload 处理器和 `RouteErrorBoundary` 必须认同一个路由,
 *   否则两边各记各的标记,一次换版会**连着自动重载两次**。
 */
export function routeFromHash(hash: string): string {
  return hash.replace(/^#\/?/, '');
}

/** 拿得到 `sessionStorage` 就给它,拿不到给 `null`(SSR / 被禁用)。 */
export function safeSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export const RECOVERY_TITLE = 'This page needs a reload';
export const RECOVERY_BODY =
  'The site was updated while this tab was open, so the page was holding half of the old version and half of the new one. Reloading fixes it. If it keeps happening, the problem is not the update.';
export const RECOVERY_ACTION = 'Reload the page';
