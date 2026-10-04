/**
 * UI — 包住每一条懒加载课页的 error boundary。
 *
 * ⭐⭐⭐ 没有它的时候,一次换版就能让整站变成黑屏(见 `chunkRecovery.ts` 的开头)。
 *   React 19 对未捕获的渲染错误的处理是**把整棵树卸载掉**,
 *   于是 `#root` 空掉,屏幕上只剩背景色,而且没有任何提示、没法恢复。
 *
 * ⚠️ 必须是 class 组件 —— React 到今天也只有 class 能当 error boundary。
 *
 * ⚠️ `key={route}` 由调用方给:换路由时要让 boundary **重新挂载**,
 *   否则在一条课上出过错之后,后面每一条课都会继续显示错误界面。
 */
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import {
  RECOVERY_ACTION, RECOVERY_BODY, RECOVERY_TITLE,
  clearReloaded, decideRecovery, hasReloaded, markReloaded, safeSessionStorage,
} from './chunkRecovery';

/**
 * ⭐⭐⭐ "这条路由真的渲染出来了"的唯一可靠信号。
 *
 * ⚠️ 不能在 boundary 的 `componentDidMount` 里清标记。实测的顺序是:
 *   boundary 渲染孩子 → Suspense 还在等 chunk,先显示 fallback →
 *   **boundary 自己挂载成功了**(`state.failed` 还是 false)→ 清掉标记 →
 *   过一会儿 lazy 的 promise 才 reject → `componentDidCatch` 读到"没重载过"
 *   → 再重载 → 无限循环。实测跑出 **646 次重载**。
 *
 * ⭐ 而放在 Suspense **里面**的组件不一样:Suspense 没解析完之前,
 *   它的孩子一个都不会挂载。所以这个 effect 跑起来,就意味着课页真的出来了。
 */
export function RouteHealthy({ route }: { route: string }): null {
  useEffect(() => {
    clearReloaded(route, safeSessionStorage());
  }, [route]);
  return null;
}

interface Props {
  readonly route: string;
  readonly children: ReactNode;
}
interface State {
  readonly failed: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    const store = safeSessionStorage();
    const { route } = this.props;
    // ⚠️ 留一条痕迹。黑屏最可恨的地方就是什么都不留下。
    console.error(`[calc-viz] route "${route}" failed to render`, error, info.componentStack);
    if (decideRecovery(hasReloaded(route, store)) === 'reload') {
      markReloaded(route, store);
      window.location.reload();
    }
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        data-route-error
        role="alert"
        className="flex h-dvh w-dvw flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center"
      >
        <p className="text-lg font-bold tracking-tight text-slate-100">{RECOVERY_TITLE}</p>
        <p className="max-w-md text-sm leading-relaxed text-slate-400">{RECOVERY_BODY}</p>
        <button
          type="button"
          data-route-error-reload
          onClick={() => window.location.reload()}
          className="rounded-lg border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 font-mono text-[12px] text-amber-100 hover:border-amber-300"
        >
          {RECOVERY_ACTION}
        </button>
        <a href="#/" className="font-mono text-[11px] text-slate-500 hover:text-slate-300">
          ← all topics
        </a>
      </div>
    );
  }
}
