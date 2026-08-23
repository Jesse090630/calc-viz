/**
 * UI — 首页(空白板)
 *
 * 目录被**封存**到 `ConceptGrid.tsx`,不是删掉。八条链一条都没下线,
 * `#/limits`、`#/log-integral` 这些路由直接输网址照样能开;
 * 只是首页不再列出来,腾出位置放接下来要加的东西。
 *
 * 恢复目录:`import { ConceptGrid } from './ConceptGrid'`,在下面渲染一次就行。
 *
 * 右上角的 Type board / Formula deck 归 `App.tsx` 管,是全站常驻的,
 * 清空首页不影响它们。
 */

export function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
        Calculus Visual Engine
      </p>
      <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        Where do these formulas come from?
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
        Start with the definition everyone thinks they already understand.
      </p>
      <div className="mt-7 grid w-full max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <a
          href="#/increasing"
          className="rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900"
        >
          <p className="text-sm font-bold text-amber-100">Every Pair Must Work</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            What does <em>increasing</em> actually mean?
          </p>
        </a>
        <a
          href="#/symmetry"
          className="rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900"
        >
          <p className="text-sm font-bold text-amber-100">The Symmetry Test</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Odd, even, or neither — without memorising shapes.
          </p>
        </a>
        <a
          href="#/periodic"
          className="rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900"
        >
          <p className="text-sm font-bold text-amber-100">Does It Repeat?</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Slide the graph onto itself and find <em>T</em>.
          </p>
        </a>
        <a
          href="#/secant"
          className="rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900"
        >
          <p className="text-sm font-bold text-amber-100">Connect Two Points</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Average rate of change, built from rise and run.
          </p>
        </a>
      </div>
    </main>
  );
}

/** 链页面顶部的返回链接 */
export function BackLink() {
  return (
    <a
      href="#/"
      className="absolute left-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur hover:text-white"
    >
      ← all topics
    </a>
  );
}
