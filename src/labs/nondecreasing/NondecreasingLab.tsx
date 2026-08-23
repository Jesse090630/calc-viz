/**
 * LAB — 「Up or Flat. Never Down.」(非递减函数)
 *
 * 这一节和第三节(严格递增)是一对:同一个前件 `x₁ < x₂`,结论只差一个符号。
 * 所以界面刻意**不**重讲"任取一对"那一整套,而是把全部重量压在那个符号上:
 * 两个点落在平坦段时,`<` 与 `≤` 在同一屏上给出**不同**的答案。
 *
 * ⚠️ 顺序 `x₁ < x₂` 由 `snapPair` 在数学层保证,组件里不再写第二遍。
 * (第三节那次瞬移 bug 就是因为"保证"散落在组件里。)
 *
 * 结构:
 *   NondecreasingLab —— 唯一的状态持有者(哪张图、哪一对、破坏成功没有)
 *     ├ NondecreasingGraph  受控,只画
 *     └ Panels: LiveRule / Comparison / MentalModel  受控,只读
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NondecreasingGraph } from './NondecreasingGraph';
import { Comparison, LiveRule, MentalModel } from './Panels';
import { LAB } from '../shared/theme';
import {
  GRAPHS,
  GRAPH_ORDER,
  readPair,
  showX,
  snapPair,
  suggestCounterexample,
  verdictBySlopes,
  type GraphId,
  type PairOnGrid,
} from '../../math/nondecreasing';

/** 每张图的起手式。**不**从平坦段开始 —— 先看寻常情况,平坦才有"咦"的效果。 */
const OPENING: Readonly<Record<GraphId, PairOnGrid>> = {
  steps: { x1: 2.5, x2: 3.5 },
  dip: { x1: 1, x2: 3 },
};

/** 一键跳到几个值得看的位置。省得为了找到平坦段来回拖。 */
const PRESETS: Readonly<Record<GraphId, readonly { label: string; pair: PairOnGrid }[]>> = {
  steps: [
    { label: 'Both on a flat stretch', pair: { x1: 0.4, x2: 1.8 } },
    { label: 'Across a climb', pair: { x1: 1.5, x2: 4.5 } },
    { label: 'End to end', pair: { x1: 0, x2: 8 } },
  ],
  dip: [
    { label: 'Before the trouble', pair: { x1: 0.5, x2: 3 } },
    { label: 'End to end', pair: { x1: 0, x2: 8 } },
  ],
};

export function NondecreasingLab() {
  const [graphId, setGraphId] = useState<GraphId>('steps');
  const [pair, setPair] = useState<PairOnGrid>(OPENING.steps);
  /** 在 dip 图上亲手找到过一个反例 —— 找到就记住,别让它一拖走就消失。 */
  const [broken, setBroken] = useState(false);

  const graph = GRAPHS[graphId];
  const reading = useMemo(() => {
    const safe = snapPair(graph, pair);
    // `snapPair` 已经保证了区间内且有序,所以这里的 null 只可能是编程错误。
    return readPair(graph, safe.x1, safe.x2)!;
  }, [graph, pair]);

  const moveX1 = useCallback(
    (next: number) => setPair((p) => snapPair(graph, { x1: next, x2: p.x2 })),
    [graph],
  );
  const moveX2 = useCallback(
    (next: number) => setPair((p) => snapPair(graph, { x1: p.x1, x2: next })),
    [graph],
  );

  const switchGraph = useCallback((id: GraphId) => {
    setGraphId(id);
    setPair(OPENING[id]);
    setBroken(false);
  }, []);

  // 找到过就记住。放在 effect 里而不是各个 handler 里 —— 拖动、方向键、预设按钮
  // 都会改这一对,分头判断迟早漏掉一条路径。
  useEffect(() => {
    if (graphId === 'dip' && reading.shape === 'down') setBroken(true);
  }, [graphId, reading.shape]);

  const hint = useMemo(() => suggestCounterexample(graph), [graph]);
  const wholeGraph = useMemo(() => verdictBySlopes(graph), [graph]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Nondecreasing Functions
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Up or flat. Never down. Drag the two inputs and watch which symbol survives.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        {/* 图的切换 + 预设位置 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a graph" className="inline-flex rounded-xl border border-slate-700 p-1">
            {GRAPH_ORDER.map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                data-graph={id}
                aria-selected={graphId === id}
                onClick={() => switchGraph(id)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition ' +
                  (graphId === id
                    ? id === 'dip'
                      ? 'bg-red-400/15 text-red-100'
                      : 'bg-amber-400/15 text-amber-100'
                    : 'text-slate-400 hover:text-slate-200')
                }
              >
                {GRAPHS[id].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS[graphId].map((preset) => (
              <button
                key={preset.label}
                type="button"
                data-preset={preset.label}
                onClick={() => setPair(preset.pair)}
                className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <p className="mb-1 text-sm text-slate-400">{graph.blurb}</p>
            <NondecreasingGraph
              graph={graph}
              reading={reading}
              onChangeX1={moveX1}
              onChangeX2={moveX2}
            />
            {/*
              整张图的结论。⚠️ 用的是**逐段斜率**那条路径,不是"我们查了很多对"。
              查过的对再多也证明不了一个 ∀ 命题;而"每一段都不下降"是真的证明。
              这个区别在这一节值得明说,它就是 ∀ 与"抽样"的分界线。
            */}
            <p
              data-whole-graph={wholeGraph.status}
              className="mt-2 rounded-xl border px-3 py-2 text-sm leading-relaxed"
              style={{
                borderColor: wholeGraph.status === 'refuted' ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.3)',
                color: wholeGraph.status === 'refuted' ? LAB.fail : LAB.pass,
              }}
            >
              {wholeGraph.status === 'refuted'
                ? 'One section falls. A single falling section is enough to rule the whole function out.'
                : 'Every section is flat or rising — so no pair anywhere can break the rule. That is a proof, not a sample.'}
            </p>

            {/*
              ⚠️ MentalModel 放在**左栏图的下面**,不在右栏。
              第一版三块面板全堆在右栏,右栏比左栏高出一大截,
              图的下面空出一大片死区 —— 截图里一眼就看得出"这里是不是没画完"。
              而且提示词要的是把这条视觉规则做得**显眼**,
              挤在窄栏里三个格子只有指甲盖大。
            */}
            <div className="mt-3">
              <MentalModel active={reading.shape} />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <LiveRule reading={reading} />
            <Comparison reading={reading} />
          </div>
        </div>

        {/* ── Break it ─────────────────────────────────────────────── */}
        <div className="border-t border-slate-700 px-4 py-4 sm:px-5">
          {graphId === 'steps' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                This graph never comes down. Try a graph that does.
              </p>
              <button
                type="button"
                data-action="break-it"
                onClick={() => switchGraph('dip')}
                className="rounded-xl border border-red-400/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:border-red-300 hover:bg-red-500/10"
              >
                Can you break the rule? →
              </button>
            </div>
          ) : (
            <div
              data-panel="break-it"
              data-found={broken ? 'yes' : 'no'}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                {broken ? (
                  <>
                    <p className="text-sm font-bold" style={{ color: LAB.fail }}>
                      The output went down. NOT nondecreasing.
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      One failing pair is enough. You do not have to check the rest — the rule said
                      every pair, so breaking one breaks all of it.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-300">
                      Find <span className="font-mono">x₁ &lt; x₂</span> where the output actually
                      falls.
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Look for the section marked ↘.
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {hint && !broken && (
                  <button
                    type="button"
                    data-action="show-counterexample"
                    onClick={() => setPair(hint)}
                    className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    Show me one ({showX(hint.x1)} → {showX(hint.x2)})
                  </button>
                )}
                <button
                  type="button"
                  data-action="back-to-steps"
                  onClick={() => switchGraph('steps')}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                >
                  ← Back to the good one
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
