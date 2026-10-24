/**
 * LAB — 成绩台:把加权平均反过来解。
 *
 * ⭐⭐⭐ 这一页的主角是**那两个大数**:类目均分、期末要多少。
 *   其余一切(推子、加分、设置、公式)都是为了让这两个数可信。
 *
 * ⚠️ 这一版按 Jesse 的要求做了减法:
 *   · 两套平均算法的对比面板删了 —— 定了用**按总分**(Σ得分 / Σ满分)。
 *   · 页面上的解释段落删了,只留标签和数。
 *   · 原来的 Project 通道删了,换成**加分**:只往分子上加,分母不动。
 *
 * ⚠️ 加分为什么只加分子:那才是"加分"。连分母一起加的话,它就只是一道
 *   普通的 50 分测验,和被删掉的 Project 一模一样,这个字段也没必要存在。
 *
 * ⚠️ 死界面自查:七种结论都够得着(单元测试钉死);
 *   "Dropped" 只出现在真被丢掉那条上;权重警告只在真不平时出现;
 *   "+ 加分"那一项只在填了非零值时才出现。
 *
 * 禁止 2:这里不出现裸算式,所有数都来自 `src/math/gradeTarget.ts`。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AVERAGE_TEX, EQUATION_TEX, GOALS, HEADLINE, SEED_ITEMS, SEED_SETUP, SOLVED_TEX, VERDICT_WORD,
  type Item, type Setup, type Verdict,
  clampBonus, clampEarned, clampPossible, countedMean, cutoffOf, finalNeeded, gradeWith,
  lockedGrade, migrateItem, missBy, percentOf, spareBy, targetOf, verdictOf, weightSum,
  weightsBalanced,
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
      // ⚠️ 铺在 SEED_SETUP 上:旧存档没有 ecEarned / ecPossible,靠这一层补默认值。
      setup: { ...SEED_SETUP, ...o.setup },
      // ⚠️ 走 `migrateItem`:更早的存档只有百分制的 `score`,直接读 `earned` 会是 NaN。
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
    () => countedMean(items, setup.dropLowest, setup.ecEarned),
    [items, setup.dropLowest, setup.ecEarned],
  );
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
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Tool · Weighted Average
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Grade Console
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] text-slate-400">{HEADLINE}.</p>
      </header>

      {/* ── 两个主数 + 目标:这一页的答案 ──────────────────── */}
      <section
        data-panel="master"
        className="mt-7 grid gap-x-8 gap-y-5 rounded-2xl border border-slate-700/80 bg-slate-900/50 px-5 py-5 sm:grid-cols-[auto_auto_1fr] sm:items-end"
      >
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">Target</p>
          <div className="mt-2 flex gap-1">
            {GOALS.map((g) => (
              <button
                key={g} type="button" data-goal={g} data-active={setup.goal === g ? 'yes' : 'no'}
                onClick={() => patch({ goal: g })}
                className={
                  'rounded-lg border px-2.5 py-1.5 font-mono text-[12px] leading-none transition ' +
                  (setup.goal === g
                    ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
                }
              >
                {g}<span className="ml-1 text-[10px] text-slate-500">{show(cutoffOf(setup, g))}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
            Assessment average
          </p>
          <p data-read="mean" data-value={counted.mean ?? ''}
            className="mt-1.5 font-mono text-[28px] leading-none tabular-nums" style={{ color: LAB.x1 }}>
            {counted.mean === null ? '—' : `${counted.mean.toFixed(1)}%`}
          </p>
        </div>

        <div className="sm:text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
            Final needed for {setup.goal}
          </p>
          <p data-read="need" data-value={need ?? ''}
            className="mt-1 font-mono text-[44px] leading-none tabular-nums" style={{ color: tone.color }}>
            <span aria-hidden className="mr-2 align-middle text-[0.5em]">{tone.symbol}</span>
            {need === null ? '—' : need.toFixed(1)}
          </p>
        </div>
      </section>

      {/* ── 结论一句话 ─────────────────────────────────────── */}
      <section data-panel="verdict" data-verdict={verdict}
        className="mt-3 rounded-2xl border px-5 py-3.5"
        style={{ borderColor: `${tone.color}55`, background: `${tone.color}0f` }}>
        <p className="text-[13px] leading-relaxed" style={{ color: tone.color }}>
          <span aria-hidden className="mr-1">{tone.symbol}</span>
          {verdict === 'no-data' && 'Nothing is counted. Unmute at least one assessment.'}
          {verdict === 'final-does-not-count' && locked !== null &&
            `The final carries no weight, so the grade is already ${locked.toFixed(1)}.`}
          {verdict === 'locked' && spare !== null &&
            `Locked in — even a zero on the final clears ${show(target)}, with ${spare.toFixed(1)} to spare.`}
          {(verdict === 'comfortable' || verdict === 'doable' || verdict === 'tight') && need !== null && (
            <>The final needs <b>{need.toFixed(1)}</b> to reach {show(target)}.</>
          )}
          {verdict === 'unreachable' && miss !== null && need !== null && (
            <>
              Out of reach — a perfect final gives {gradeWith(setup, counted.mean!, 100).toFixed(1)},
              still <b>{miss.toFixed(1)}</b> short of {show(target)}.
            </>
          )}
        </p>
        {counted.droppedIndex >= 0 && (
          <p data-dropnote className="mt-1 font-mono text-[11px] text-slate-500">
            Dropping {items[counted.droppedIndex]!.name} — lowest percentage, at{' '}
            {percentOf(items[counted.droppedIndex]!).toFixed(1)}%
          </p>
        )}
      </section>

      {/* ── 推子 ───────────────────────────────────────────── */}
      <section data-panel="strips" className="mt-3 overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-900/50 p-5">
        {/*
          ⚠️ `items-start` 而不是 `items-end`。底对齐的话,各列会按**整列**的底边对齐,
            而测验列的轨道下面还有名字、状态、Mute 三样东西,主表下面只有 "Final" ——
            于是主表的轨道整整沉下去 50px,一排表看着像没对准。
            顶对齐之后,轨道上方的内容两边结构一致(一行框 + 一行小字),轨道就真的齐了。
            `home-check` 之外另有一条浏览器断言专门量这件事。
        */}
        <div className="flex items-start gap-2.5" style={{ minWidth: `${(items.length + 1) * 98}px` }}>
          {items.map((it, i) => {
            const dropped = i === counted.droppedIndex;
            const state = it.muted ? 'Muted' : dropped ? 'Dropped' : 'Counted';
            const symbol = it.muted ? '·' : dropped ? '×' : '✓';
            const color = it.muted ? LAB.muted : dropped ? LAB.fail : LAB.pass;
            const pct = percentOf(it);
            /** ⚠️ 不是满分 100 的那几条标出来。 */
            const odd = it.possible !== 100;
            return (
              <div key={i} data-strip={i} data-state={state.toLowerCase()}
                className={'w-[88px] shrink-0 ' + (it.muted ? 'opacity-40' : '')}>
                <div className="flex items-center gap-0.5">
                  <input
                    type="number" min={0} max={it.possible} step={1} value={it.earned}
                    data-earned={i} aria-label={`${it.name} points earned`}
                    onChange={(e) => setItem(i, { earned: clampEarned(num(e.target.value, it.earned), it.possible) })}
                    className="pts-input w-full min-w-0 rounded-md border border-slate-600 bg-slate-950 px-0.5 py-1 text-center font-mono text-[12px] tabular-nums text-slate-100"
                  />
                  <span aria-hidden className="font-mono text-[11px] text-slate-600">/</span>
                  <input
                    type="number" min={1} step={1} value={it.possible}
                    data-possible={i} aria-label={`${it.name} points possible`}
                    onChange={(e) => {
                      const possible = clampPossible(num(e.target.value, it.possible));
                      // ⚠️ 满分调小时得分要跟着夹住,否则会出现 88/50 这种 176%。
                      setItem(i, { possible, earned: clampEarned(it.earned, possible) });
                    }}
                    className={
                      'pts-input w-full min-w-0 rounded-md border bg-slate-950 px-0.5 py-1 text-center font-mono text-[12px] tabular-nums ' +
                      (odd ? 'border-amber-400/60 text-amber-200' : 'border-slate-800 text-slate-500')
                    }
                  />
                </div>
                <p data-pct={i} data-value={pct}
                  className="mt-1.5 text-center font-mono text-[11px] tabular-nums" style={{ color }}>
                  {pct.toFixed(1)}%
                </p>
                <div className="fader-track relative mt-1.5 h-40 rounded-md border border-slate-800 bg-slate-950/70">
                  {/* ⚠️ 填充高度用**百分比** —— 46 分在 50 分制里是 92%,不是 46%。 */}
                  <div className="absolute inset-x-1 bottom-0 rounded-b-md"
                    style={{ height: `${pct}%`, background: color, opacity: 0.22 }} />
                  <div className="absolute inset-x-0 border-t border-dashed border-slate-600/70" style={{ bottom: '80%' }} />
                  <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/50" style={{ bottom: '90%' }} />
                  <input
                    type="range" min={0} max={it.possible} step={1} value={it.earned}
                    aria-label={`${it.name} points earned, out of ${it.possible}`}
                    onChange={(e) => setItem(i, { earned: clampEarned(num(e.target.value, it.earned), it.possible) })}
                    className="fader-input absolute inset-0"
                  />
                </div>
                <input
                  type="text" value={it.name} aria-label={`Channel ${i + 1} name`} data-name={i}
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
          <div data-strip="master" className="w-[88px] shrink-0 border-l border-slate-700 pl-2.5">
            <p className="rounded-md border px-1 py-1 text-center font-mono text-[12px] tabular-nums"
              style={{ borderColor: tone.color, color: tone.color }}>
              {need === null ? '—' : need > 100 ? '!' : need.toFixed(1)}
            </p>
            <p data-master-chip className="mt-1.5 text-center font-mono text-[11px]" style={{ color: tone.color }}>
              {VERDICT_WORD[verdict]}
            </p>
            <div className="fader-track relative mt-1.5 h-40 rounded-md border border-slate-800 bg-slate-950/70">
              <div className="absolute inset-x-1 bottom-0 rounded-b-md"
                style={{ height: `${needleAt}%`, background: tone.color, opacity: 0.25 }} />
              <div className="absolute inset-x-0 border-t border-dashed border-slate-600/70" style={{ bottom: '80%' }} />
              <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/50" style={{ bottom: '90%' }} />
              {need !== null && (
                <div data-needle className="absolute inset-x-0 border-t-2"
                  style={{ bottom: `${needleAt}%`, borderColor: tone.color }} />
              )}
            </div>
            <p className="mt-2 text-center font-mono text-[10px] text-slate-300">Final</p>
          </div>
        </div>
      </section>

      {/* ── 加分 ───────────────────────────────────────────── */}
      <section data-panel="ec" className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-900/50 p-5">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <label className="block">
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Extra credit earned
            </span>
            <span className="mt-2 flex items-center gap-1.5">
              <input
                type="number" min={0} max={setup.ecPossible} step={1} value={setup.ecEarned}
                data-field="ecEarned" aria-label="Extra credit points earned"
                onChange={(e) => patch({ ecEarned: clampBonus(num(e.target.value, setup.ecEarned), setup.ecPossible) })}
                className="pts-input w-[74px] rounded-md border border-amber-400/60 bg-slate-950 px-2 py-1.5 text-center font-mono text-[16px] tabular-nums text-amber-100"
              />
              <span aria-hidden className="font-mono text-[14px] text-slate-600">/</span>
              <input
                type="number" min={1} step={1} value={setup.ecPossible}
                data-field="ecPossible" aria-label="Extra credit points possible"
                onChange={(e) => {
                  const ecPossible = clampPossible(num(e.target.value, setup.ecPossible));
                  patch({ ecPossible, ecEarned: clampBonus(setup.ecEarned, ecPossible) });
                }}
                className="pts-input w-[74px] rounded-md border border-slate-800 bg-slate-950 px-2 py-1.5 text-center font-mono text-[16px] tabular-nums text-slate-500"
              />
            </span>
          </label>

          {/* ⭐ 这一行就是类目均分的全部来历,摆出来比写一段解释管用。 */}
          <p data-points className="font-mono text-[14px] tabular-nums text-slate-300">
            {show(counted.earned)}
            {counted.bonus > 0 && <span style={{ color: LAB.x2 }}> + {show(counted.bonus)}</span>}
            <span className="text-slate-600"> / </span>
            {show(counted.possible)}
            <span className="text-slate-600"> = </span>
            <span style={{ color: LAB.x1 }}>
              {counted.mean === null ? '—' : `${counted.mean.toFixed(2)}%`}
            </span>
          </p>
        </div>
        <p data-ec-note className="mt-3 border-t border-slate-800 pt-3 font-mono text-[11px] text-slate-500">
          {/* ⚠️ 这是整块里最要紧的一句:加在分子,不加在分母。 */}
          Added to points earned only — the {show(setup.ecPossible)} does not go into points possible.
        </p>
      </section>

      {/* ── 式子 ───────────────────────────────────────────── */}
      <section data-panel="equation" className="mt-3 overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/50 p-5">
        <div className="grid gap-3 lg:grid-cols-3">
          {([
            ['the weighted average', EQUATION_TEX],
            ['the assessment average', AVERAGE_TEX],
            ['solved for the final', SOLVED_TEX],
          ] as const).map(([label, tex], k) => (
            <div key={label}
              className={
                'overflow-x-auto rounded-lg border px-3 py-2.5 ' +
                (k === 2 ? 'border-amber-400/40 bg-amber-400/5' : 'border-slate-800')
              }>
              <p className={'font-mono text-[10px] ' + (k === 2 ? 'text-amber-300' : 'text-slate-500')}>
                {label}
              </p>
              <p className="mt-1.5 text-[13px] text-slate-200"><Tex src={tex} display /></p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 设置 ───────────────────────────────────────────── */}
      <section data-panel="setup" className="mt-3 rounded-2xl border border-slate-700/80 bg-slate-900/50 p-5">
        <div className="grid gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
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
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">{label}</span>
              <input
                type="number" min={0} max={100} step={0.5} value={value} data-field={key}
                onChange={(e) => set(num(e.target.value, value))}
                className="pts-input mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[12px] tabular-nums text-slate-100"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2.5 border-t border-slate-800 pt-4">
          <label className="flex items-center gap-2 text-[12px] text-slate-300">
            <input
              type="checkbox" checked={setup.dropLowest} data-field="dropLowest"
              onChange={(e) => patch({ dropLowest: e.target.checked })}
              className="h-3.5 w-3.5 accent-amber-400"
            />
            Drop the lowest assessment
          </label>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" data-action="add"
              onClick={() => setItems((l) => [...l, { name: `Assess ${l.length + 1}`, earned: 88, possible: 100, muted: false }])}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500">
              Add
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
        </div>

        {/* ⚠️ 只在真不平的时候出现 —— 永远挂着的警告等于没有警告。 */}
        {!weightsBalanced(setup) && (
          <p data-weightwarn className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-[11px]" style={{ color: LAB.x2 }}>
            <span aria-hidden>! </span>
            The weights add up to {show(weightSum(setup))}%, not 100%.
          </p>
        )}
      </section>
    </main>
  );
}
