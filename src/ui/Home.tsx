/**
 * UI — 概念目录
 *
 * 刻意不写成"课程列表"。每张卡片正面写的是**学生实际卡住的那个问题**,
 * 不是章节名 —— 用户是带着困惑来的,不是带着目录来的。
 */
export interface ConceptCard {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly steps: number;
  readonly ready: boolean;
}

export function Home({ concepts }: { concepts: readonly ConceptCard[] }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-bold tracking-tight">Where do these formulas come from?</h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-300">
        Not a calculator. Each topic below is a derivation you step through — press → and the
        geometry and the algebra move together, one step at a time, until the formula is something
        you watched happen rather than something you memorised.
      </p>

      <div className="mt-10 grid gap-3">
        {concepts.map((c) =>
          c.ready ? (
            <a
              key={c.id}
              href={`#/${c.id}`}
              className="group rounded-xl border border-slate-700 bg-slate-900/60 p-5 transition hover:border-amber-500/60 hover:bg-slate-900"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold group-hover:text-amber-400">{c.title}</h2>
                <span className="shrink-0 text-xs text-slate-500">{c.steps} steps</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">“{c.question}”</p>
            </a>
          ) : (
            <div
              key={c.id}
              className="rounded-xl border border-dashed border-slate-800 p-5 opacity-45"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold">{c.title}</h2>
                <span className="shrink-0 text-xs text-slate-500">soon</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">“{c.question}”</p>
            </div>
          ),
        )}
      </div>

      <p className="mt-12 text-sm text-slate-500">
        Every number on this site is computed at runtime from pure functions that are unit-tested
        against a second, independent derivation. Nothing is hard-coded.
      </p>
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
