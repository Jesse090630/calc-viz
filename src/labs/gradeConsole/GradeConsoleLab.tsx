/**
 * LAB — 成绩台:把加权平均反过来解。
 *
 * ⭐⭐⭐ 这一页为什么该待在一个讲微积分的站上:
 *   它不是个计算器皮肤,它是**一条式子被反着读**。
 *   上面那块始终显示两件事 —— 原式(加权平均)和解出来的式子(对 F 反解),
 *   而且**代进了此刻的数**。学生拖滑块的时候,看见的是代数在动,不是一个黑箱吐数。
 *
 * ⭐⭐ 布局沿用混音台的比喻:每场测验一条推子,汇到右边一个主表。
 *   这个比喻是对的 —— 它把"每一场各自贡献多少"和"合起来是多少"同时摆在眼前。
 *
 * ⚠️ 原稿里"够不到"那句话算错了:它报的是**期末卷面**的差距,却说成总评的差距,
 *   期末占 25% 时夸大四倍。数全部改从 `missBy` 取,它按定义算,错不了。
 *   详见 `src/math/gradeTarget.ts`。
 *
 * ⚠️ 死界面自查:七种结论都够得着(单元测试钉死),
 *   "Dropped" 标记只在真的丢了那条上出现,"权重不是 100%" 只在真不是的时候出现。
 *
 * ⚠️ 无障碍:每条推子都是真的 `<input type="range">`(方向键能调),
 *   而且**颜色不是唯一信道** —— 每个状态都带一个符号和一个词。
 *
 * 禁止 2:这里不出现裸算式,所有数都来自 `src/math/gradeTarget.ts`。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EQUATION_TEX, GOALS, HEADLINE, MAIN_IDEA, METHODS, METHOD_NAME, METHOD_NOTE, METHOD_QUESTION,
  SEED_ITEMS, SEED_SETUP, SOLVED_TEX, VERDICT_WORD,
  type Item, type Method, type Setup, type Verdict,
  clampEarned, clampPossible, countedMean, cutoffOf, finalNeeded, gradeWith, lockedGrade,
  migrateItem, missBy, percentOf, spareBy, targetOf, verdictOf, weightSum, weightsBalanced,
} from '../../math/gradeTarget';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const KEY = 'calc-viz-grade-console-v1';

/** ⚠️ 隐私模式下 localStorage 一碰就抛。存不住是小事,抛出来把整页弄黑才是大事。 */
function safeLocal(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

interface Saved {
  readonly setup: Setup;
  readonly items: readonly Item[];
}

function restore(): Saved | null {
  const store = safeLocal();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<Saved>;
    if (!o.setup || !Array.isArray(o.items) || o.items.length === 0) return null;
    return {
      setup: { ...SEED_SETUP, ...o.setup },
      // ⚠️ 走 `migrateItem`:旧存档只有百分制的 `score`,直接读 `earned` 会是 NaN。
      items: o.items.map(migrateItem),
    };
  } catch {
    return null;
  }
}

/** 结论 → 配色与符号。⚠️ 符号和词是给不靠颜色的人用的,不许省。 */
const TONE: Readonly<Record<Verdict, { color: string; symbol: string }>> = {
  'no-data': { color: LAB.muted, symbol: '·' },
  'final-does-not-count': { color: LAB.muted, symbol: '·' },
  locked: { color: LAB.pass, symbol: '✓' },
  comfortable: { color: LAB.pass, symbol: '✓' },
  doable: { color: LAB.x2, symbol: '~' },
  tight: { color: LAB.x2, symbol: '!' },
  unreachable: { color: LAB.fail, symbol: '×' },
};

function num(v: string, fallback: number): number {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : fallback;
}

/** 一位小数,但整数不拖一个 ".0" 的尾巴。 */
function show(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

export function GradeConsoleLab() {
  const [setup, setSetup] = useState<Setup>(SEED_SETUP);
  const [items, setItems] = useState<readonly Item[]>(SEED_ITEMS);
  const [ready, setReady] = useState(false);

  // ⚠️ 读存档放在 effect 里:服务端渲染和首屏都不该碰 localStorage。
  useEffect(() => {
    const saved = restore();
    if (saved) {
      setSetup(saved.setup);
      setItems(saved.items);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const store = safeLocal();
    if (!store) return;
    try {
      store.setItem(KEY, JSON.stringify({ setup, items }));
    } catch {
      /* 存不下就算了,页面照常用 */
    }
  }, [setup, items, ready]);

  const counted = useMemo(
    () => countedMean(items, setup.dropLowest, setup.method),
    [items, setup.dropLowest, setup.method],
  );
  /**
   * ⭐⭐⭐ 另一种算法下的结果。
   *   老师用哪一种还没确认,所以两个都算出来摆在一起 ——
   *   把范围给出来,比挑一个然后装作确定要诚实。
   */
  const otherMethod: Method = setup.method === 'mean-of-grades' ? 'total-points' : 'mean-of-grades';
  const otherCounted = useMemo(
    () => countedMean(items, setup.dropLowest, otherMethod),
    [items, setup.dropLowest, otherMethod],
  );
  const otherNeed = finalNeeded({ ...setup, method: otherMethod }, otherCounted.mean);
  const need = finalNeeded(setup, counted.mean);
  const verdict = verdictOf(setup, counted.mean);
  const miss = missBy(setup, counted.mean);
  const spare = spareBy(setup, counted.mean);
  const locked = lockedGrade(setup, counted.mean);
  const target = targetOf(setup);
  const tone = TONE[verdict];

  const patch = useCallback((o: Partial<Setup>) => setSetup((s) => ({ ...s, ...o })), []);
  const setItem = useCallback((i: number, o: Partial<Item>) => {
    setItems((list) => list.map((it, k) => (k === i ? { ...it, ...o } : it)));
  }, []);

  /** 主表上指针的高度。⚠️ 够不到的时候钉在顶上,不让它画到框外面去。 */
  const needleAt = need === null ? 0 : Math.max(0, Math.min(100, need));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Tool · Weighted Average
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Grade Console
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ── 式子:这一页的立身之本 ───────────────────────────── */}
      <section data-panel="equation" className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          One equation, read in the other direction
        </p>
        <div className="mt-2 grid gap-3 lg:grid-cols-2">
          <div className="overflow-x-auto rounded-lg border border-slate-800 px-3 py-2">
            <p className="font-mono text-[10px] text-slate-500">the weighted average</p>
            <p className="mt-1 text-[14px] text-slate-200"><Tex src={EQUATION_TEX} display /></p>
          </div>
          <div className="overflow-x-auto rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2">
            <p className="font-mono text-[10px] text-amber-300">solved for the final</p>
            <p className="mt-1 text-[14px] text-slate-200"><Tex src={SOLVED_TEX} display /></p>
          </div>
        </div>
        {/* ⭐ 代进此刻的数 —— 拖滑块的时候,动的是代数,不是一个黑箱。 */}
        <p data-substituted className="mt-2.5 overflow-x-auto border-t border-slate-800 pt-2.5 font-mono text-[12px] text-slate-300">
          {`${setup.wAssign / 100}(${show(setup.assignScore)}) + ${setup.wAssess / 100}(${counted.mean === null ? '—' : counted.mean.toFixed(2)}) + ${setup.wFinal / 100}(F) = ${show(target)}`}
          <span className="ml-3 text-slate-500">
            {counted.droppedIndex >= 0
              ? `best ${counted.counted} of ${counted.live}`
              : `all ${counted.counted} counted`}
          </span>
        </p>
      </section>

      {/* ── 目标与两个读数 ──────────────────────────────────── */}
      <section data-panel="master" className="mt-4 grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-4 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Target</p>
          <div className="mt-1 flex gap-1.5">
            {/* ⚠️ 遍历 `GOALS`,不写死 ['A','B'] —— 加一档的时候这里不用动。 */}
            {GOALS.map((g) => (
              <button
                key={g} type="button" data-goal={g} data-active={setup.goal === g ? 'yes' : 'no'}
                onClick={() => patch({ goal: g })}
                className={
                  'rounded-lg border px-2.5 py-1 font-mono text-[12px] transition ' +
                  (setup.goal === g
                    ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500')
                }
              >
                {g} <span className="text-slate-500">{show(cutoffOf(setup, g))}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Counted mean</p>
          <p data-read="mean" data-value={counted.mean ?? ''} className="mt-1 font-mono text-2xl" style={{ color: LAB.x1 }}>
            {counted.mean === null ? '—' : counted.mean.toFixed(1)}
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">Final needed</p>
          <p data-read="need" data-value={need ?? ''} className="mt-1 font-mono text-2xl" style={{ color: tone.color }}>
            <span aria-hidden>{tone.symbol} </span>
            {need === null ? '—' : need.toFixed(1)}
          </p>
        </div>
      </section>

      {/* ── ⭐⭐⭐ 两种算法并排:老师用哪一种还没确认 ──────────── */}
      <section data-panel="method" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          How the assessment average is computed
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-400">{METHOD_QUESTION}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {METHODS.map((m) => {
            const c = m === setup.method ? counted : otherCounted;
            const n = m === setup.method ? need : otherNeed;
            const on = m === setup.method;
            return (
              <button
                key={m} type="button" data-method={m} data-active={on ? 'yes' : 'no'}
                onClick={() => patch({ method: m })}
                className={
                  'rounded-xl border px-3 py-2.5 text-left transition ' +
                  (on ? 'border-amber-400/60 bg-amber-400/10' : 'border-slate-700 hover:border-slate-500')
                }
              >
                <span className={'block font-mono text-[11px] ' + (on ? 'text-amber-200' : 'text-slate-400')}>
                  <span aria-hidden>{on ? '● ' : '○ '}</span>{METHOD_NAME[m]}
                </span>
                <span className="mt-1.5 flex items-baseline gap-3">
                  <span data-method-mean={m} data-value={c.mean ?? ''} className="font-mono text-lg" style={{ color: LAB.x1 }}>
                    {c.mean === null ? '—' : c.mean.toFixed(1)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">mean</span>
                  <span data-method-need={m} data-value={n ?? ''} className="font-mono text-lg" style={{ color: LAB.x2 }}>
                    {n === null ? '—' : n.toFixed(1)}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">final</span>
                </span>
                <span className="mt-1.5 block text-[11px] leading-relaxed text-slate-500">
                  {METHOD_NOTE[m]}
                </span>
              </button>
            );
          })}
        </div>
        {/*
          ⭐⭐ 把"差多少"直接算出来。不确定用哪一种的时候,真正有用的信息
            不是两个数,而是**它们差得多不多** —— 差不到一分就不必纠结。
          ⚠️ 只在两边都算得出来的时候显示。
        */}
        {need !== null && otherNeed !== null && (
          <p data-method-spread data-value={Math.abs(need - otherNeed)}
            className="mt-2.5 border-t border-slate-800 pt-2.5 text-[12px] leading-relaxed text-slate-300">
            {Math.abs(need - otherNeed) < 0.05
              ? 'Both methods give the same answer here, so which one your teacher uses does not matter yet.'
              : <>The two methods differ by <b>{Math.abs(need - otherNeed).toFixed(1)}</b> points on the
                final ({Math.min(need, otherNeed).toFixed(1)} versus {Math.max(need, otherNeed).toFixed(1)}).</>}
          </p>
        )}
        <p className="mt-1.5 font-mono text-[10px] text-slate-500">
          Counted points: {show(counted.earned)} earned of {show(counted.possible)} possible.
        </p>
      </section>

      {/* ── 推子 ────────────────────────────────────────────── */}
      <section data-panel="strips" className="mt-4 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="flex items-end gap-2" style={{ minWidth: `${(items.length + 1) * 96}px` }}>
          {items.map((it, i) => {
            const dropped = i === counted.droppedIndex;
            const state = it.muted ? 'Muted' : dropped ? 'Dropped' : 'Counted';
            const symbol = it.muted ? '·' : dropped ? '×' : '✓';
            const color = it.muted ? LAB.muted : dropped ? LAB.fail : LAB.pass;
            const pct = percentOf(it);
            /** ⚠️ 不是满分 100 的那几条标出来 —— 整次改动就是为了它们。 */
            const odd = it.possible !== 100;
            return (
              <div key={i} data-strip={i} data-state={state.toLowerCase()}
                className={'w-[92px] shrink-0 ' + (it.muted ? 'opacity-45' : '')}>
                {/* 得分 / 满分 —— 两个数,不再假设是百分制 */}
                <div className="flex items-center gap-0.5">
                  <input
                    type="number" min={0} max={it.possible} step={1} value={it.earned}
                    data-earned={i} aria-label={`${it.name} points earned`}
                    onChange={(e) => setItem(i, { earned: clampEarned(num(e.target.value, it.earned), it.possible) })}
                    className="pts-input w-full min-w-0 rounded-md border border-slate-700 bg-slate-950 px-0.5 py-1 text-center font-mono text-[12px] text-slate-100"
                  />
                  <span aria-hidden className="font-mono text-[11px] text-slate-500">/</span>
                  <input
                    type="number" min={1} step={1} value={it.possible}
                    data-possible={i} aria-label={`${it.name} points possible`}
                    onChange={(e) => {
                      const possible = clampPossible(num(e.target.value, it.possible));
                      // ⚠️ 满分调小的时候,得分要跟着夹住,否则会出现 88/50 这种 176%。
                      setItem(i, { possible, earned: clampEarned(it.earned, possible) });
                    }}
                    className={
                      'pts-input w-full min-w-0 rounded-md border bg-slate-950 px-0.5 py-1 text-center font-mono text-[12px] ' +
                      (odd ? 'border-amber-400/60 text-amber-200' : 'border-slate-800 text-slate-400')
                    }
                  />
                </div>
                {/* ⭐ 百分比单独显示:它才是进均分的那个数 */}
                <p data-pct={i} data-value={pct}
                  className="mt-1 text-center font-mono text-[11px]" style={{ color }}>
                  {pct.toFixed(1)}%
                </p>
                <div className="fader-track relative mt-1 h-40 rounded-md border border-slate-800 bg-slate-950/70">
                  {/* ⚠️ 填充高度用**百分比**,不是得分 —— 46 分在 50 分制里是 92%,不是 46%。 */}
                  <div
                    className="absolute inset-x-1 bottom-0 rounded-b-md"
                    style={{ height: `${pct}%`, background: color, opacity: 0.22 }}
                  />
                  {/* 80 / 90 两道常见档线 */}
                  <div className="absolute inset-x-0 border-t border-dashed border-slate-600/70" style={{ bottom: '80%' }} />
                  <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/50" style={{ bottom: '90%' }} />
                  {/* ⚠️ 推子的行程是 0..满分,拖的是**得分**;刻度线是百分比。 */}
                  <input
                    type="range" min={0} max={it.possible} step={1} value={it.earned}
                    aria-label={`${it.name} points earned, out of ${it.possible}`}
                    onChange={(e) => setItem(i, { earned: clampEarned(num(e.target.value, it.earned), it.possible) })}
                    className="fader-input absolute inset-0"
                  />
                </div>
                <input
                  type="text" value={it.name} aria-label={`Channel ${i + 1} name`}
                  data-name={i}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-800 bg-transparent px-1 py-0.5 text-center font-mono text-[10px] text-slate-300"
                />
                <p data-chip className="mt-1 text-center font-mono text-[10px]" style={{ color }}>
                  <span aria-hidden>{symbol} </span>{state}
                </p>
                <button
                  type="button" data-mute={i} aria-pressed={it.muted}
                  onClick={() => setItem(i, { muted: !it.muted })}
                  className="mt-1 w-full rounded-md border border-slate-700 py-0.5 font-mono text-[10px] text-slate-400 hover:border-slate-500"
                >
                  {it.muted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            );
          })}

          {/* 主表 */}
          <div data-strip="master" className="w-[68px] shrink-0 border-l border-slate-700 pl-2">
            <p className="rounded-md border px-1 py-1 text-center font-mono text-[13px]"
              style={{ borderColor: tone.color, color: tone.color }}>
              {need === null ? '—' : need > 100 ? '!' : need.toFixed(1)}
            </p>
            <div className="fader-track relative mt-2 h-44 rounded-md border border-slate-800 bg-slate-950/70">
              <div className="absolute inset-x-1 bottom-0 rounded-b-md"
                style={{ height: `${needleAt}%`, background: tone.color, opacity: 0.25 }} />
              <div className="absolute inset-x-0 border-t border-dashed border-slate-600/70" style={{ bottom: '80%' }} />
              <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/50" style={{ bottom: '90%' }} />
              {need !== null && (
                <div data-needle className="absolute inset-x-0 border-t-2" style={{ bottom: `${needleAt}%`, borderColor: tone.color }} />
              )}
            </div>
            <p className="mt-2 text-center font-mono text-[10px] text-slate-300">Final</p>
            <p data-master-chip className="mt-1 text-center font-mono text-[10px]" style={{ color: tone.color }}>
              <span aria-hidden>{tone.symbol} </span>{VERDICT_WORD[verdict]}
            </p>
          </div>
        </div>
      </section>

      {/* ── 结论 ────────────────────────────────────────────── */}
      <section data-panel="verdict" data-verdict={verdict}
        className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[13px] leading-relaxed" style={{ color: tone.color }}>
          <span aria-hidden>{tone.symbol} </span>
          {verdict === 'no-data' && 'Nothing is counted right now. Unmute at least one assessment.'}
          {verdict === 'final-does-not-count' && locked !== null &&
            `The final carries no weight here, so it cannot change anything. The grade is already ${locked.toFixed(1)}.`}
          {verdict === 'locked' && spare !== null &&
            `Locked in. Even a zero on the final clears ${show(target)}, with ${spare.toFixed(1)} points to spare.`}
          {(verdict === 'comfortable' || verdict === 'doable' || verdict === 'tight') && need !== null && (
            <>The final needs <b>{need.toFixed(1)}</b> to reach {show(target)}.</>
          )}
          {/*
            ⚠️ 这里是原稿算错的那句。差距必须是**总评**的分,
              不是期末卷面的分 —— 两者差一个期末权重,25% 时差四倍。
          */}
          {verdict === 'unreachable' && miss !== null && need !== null && (
            <>
              Out of reach. A perfect final gives {gradeWith(setup, counted.mean!, 100).toFixed(1)},
              which is <b>{miss.toFixed(1)}</b> short of {show(target)}.
              {' '}(That would take {need.toFixed(0)} on the final, and the paper only goes to 100.)
            </>
          )}
        </p>
        {counted.droppedIndex >= 0 && (
          <p data-dropnote className="mt-1.5 font-mono text-[11px] text-slate-500">
            Dropping {items[counted.droppedIndex]!.name} — the lowest percentage at{' '}
            {percentOf(items[counted.droppedIndex]!).toFixed(1)}%
            {' '}({show(items[counted.droppedIndex]!.earned)}/{show(items[counted.droppedIndex]!.possible)}),
            {' '}not the lowest raw points.
          </p>
        )}
      </section>

      {/* ── 设置 ────────────────────────────────────────────── */}
      <section data-panel="setup" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Weights, cutoffs, drop rule
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {([
            ['Assignments %', setup.wAssign, (v: number) => patch({ wAssign: v }), 'wAssign'],
            ['Assessments %', setup.wAssess, (v: number) => patch({ wAssess: v }), 'wAssess'],
            ['Final %', setup.wFinal, (v: number) => patch({ wFinal: v }), 'wFinal'],
            ['Assignments score', setup.assignScore, (v: number) => patch({ assignScore: v }), 'assignScore'],
            ['A cutoff', setup.targetA, (v: number) => patch({ targetA: v }), 'targetA'],
            ['B cutoff', setup.targetB, (v: number) => patch({ targetB: v }), 'targetB'],
            ['C cutoff', setup.targetC, (v: number) => patch({ targetC: v }), 'targetC'],
          ] as const).map(([label, value, set, key]) => (
            <label key={key} className="block">
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
              <input
                type="number" min={0} max={100} step={0.5} value={value} data-field={key}
                onChange={(e) => set(num(e.target.value, value))}
                className="mt-0.5 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[12px] text-slate-100"
              />
            </label>
          ))}
        </div>

        <label className="mt-3 flex items-center gap-2 text-[12px] text-slate-300">
          <input
            type="checkbox" checked={setup.dropLowest} data-field="dropLowest"
            onChange={(e) => patch({ dropLowest: e.target.checked })}
            className="h-3.5 w-3.5 accent-amber-400"
          />
          Drop the lowest assessment at the end of the term
        </label>

        {/* ⚠️ 只在真不平的时候出现 —— 永远挂着的警告等于没有警告。 */}
        {!weightsBalanced(setup) && (
          <p data-weightwarn className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-[11px]" style={{ color: LAB.x2 }}>
            <span aria-hidden>! </span>
            The three weights add up to {show(weightSum(setup))}%, not 100%. The numbers above still
            follow your weights, but a course grade built from them will not sit on a 100-point scale.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-800 pt-3">
          <button type="button" data-action="add"
            onClick={() => setItems((l) => [...l, { name: `Assess ${l.length + 1}`, earned: 88, possible: 100, muted: false }])}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500">
            Add assessment
          </button>
          <button type="button" data-action="remove" disabled={items.length <= 1}
            onClick={() => setItems((l) => (l.length > 1 ? l.slice(0, -1) : l))}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500 disabled:opacity-40">
            Remove last
          </button>
          <button type="button" data-action="reset"
            onClick={() => { setSetup(SEED_SETUP); setItems(SEED_ITEMS); }}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500">
            Reset
          </button>
          <button type="button" data-action="clear"
            onClick={() => setItems((l) => l.map((it) => ({ ...it, earned: 0 })))}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500">
            Clear scores
          </button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Mute an assessment that may not happen; it is left out of the mean entirely. Everything you
          type stays in this browser.
        </p>
      </section>
    </main>
  );
}
