/**
 * LAB — 成绩台:把教学大纲那条加权平均反过来解。
 *
 * ⭐⭐⭐ 页面的主角是两个数:**PowerSchool 现在显示多少**、**期末还要考多少**。
 *   前者是他每天真能看到的那个数,后者是唯一还能改变结局的那个数。
 *
 * ⭐⭐ 项目("The Art of Calculus")单开一块,因为它的计分方式很特别:
 *   任何一条准则没做到,整个乘积归零,直接 −50;点数恒为 10 的倍数;
 *   点数加到**某一场测验的百分比**上并封顶 100,加完再重算丢哪一场。
 *   **加在哪一场最划算由代码试出来** —— 手推会错,实测三种情形三种答案。
 *
 * ⚠️ 两件还没向老师确认的事,页面上都明确标成 unconfirmed:
 *   丢最低(大纲里没有)、类目平均算法(目前两种算出来一样,分不出来)。
 *
 * ⚠️ 死界面自查:七种结论都够得着;"Dropped" 只出现在真被丢的那条上;
 *   项目那块只在打开时展开;违规警告只在真有一条没勾时出现。
 *
 * 禁止 2:这里不出现裸算式,所有数都来自 `src/math/gradeTarget.ts`。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ARTISTIC_SCORES, EQUATION_TEX, EXPLANATION_SCORES, GOALS, GUIDELINES, HEADLINE,
  IN_PROGRESS_TEX, MATH_SCORES, METHODS, METHOD_NAME, PROJECT_TEX, SEED_ITEMS, SEED_PROJECT,
  SEED_SETUP, SOLVED_TEX, VERDICT_WORD,
  type Item, type Project, type Setup, type Verdict,
  applyProject, clampEarned, clampPossible, cutoffOf, finalNeeded, gradeWith, guidelinesAllMet,
  inProgressDisplay, letterFor, lockedGrade, meanOf, migrateItem, missBy, percentOf,
  projectPoints, projectScore, roundedPercent, spareBy, targetOf, verdictOf, weightSum,
  weightsBalanced,
} from '../../math/gradeTarget';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const KEY = 'calc-viz-grade-console-v2';

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
  readonly project: Project;
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
      items: o.items.map(migrateItem),
      project: { ...SEED_PROJECT, ...(o.project ?? {}), met: { ...SEED_PROJECT.met, ...(o.project?.met ?? {}) } },
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

function show(x: number): string {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

const panel = 'rounded-2xl border border-slate-700/80 bg-slate-900/50';
const label = 'font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500';
const chip =
  'rounded-lg border px-2.5 py-1.5 font-mono text-[12px] leading-none transition';
const chipOn = 'border-amber-400/70 bg-amber-400/15 text-amber-100';
const chipOff = 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200';

export function GradeConsoleLab() {
  const [setup, setSetup] = useState<Setup>(SEED_SETUP);
  const [items, setItems] = useState<readonly Item[]>(SEED_ITEMS);
  const [project, setProject] = useState<Project>(SEED_PROJECT);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = restore();
    if (saved) {
      setSetup(saved.setup);
      setItems(saved.items);
      setProject(saved.project);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const store = safeLocal();
    if (!store) return;
    try {
      store.setItem(KEY, JSON.stringify({ setup, items, project }));
    } catch {
      /* 存不下就算了 */
    }
  }, [setup, items, project, ready]);

  const applied = useMemo(
    () => applyProject(items, project, setup.dropLowest, setup.method),
    [items, project, setup.dropLowest, setup.method],
  );
  const counted = useMemo(
    () => meanOf(items, applied.percents, setup.dropLowest, setup.method),
    [items, applied, setup.dropLowest, setup.method],
  );

  /** ⭐ 不做项目时的对照 —— "这个项目到底值多少"只能靠这个差来回答。 */
  const baseline = useMemo(() => {
    const noProj = { ...project, doing: false };
    const a = applyProject(items, noProj, setup.dropLowest, setup.method);
    const c = meanOf(items, a.percents, setup.dropLowest, setup.method);
    return finalNeeded(setup, c.mean);
  }, [items, project, setup]);

  const need = finalNeeded(setup, counted.mean);
  const shown = inProgressDisplay(setup, counted.mean);
  const verdict = verdictOf(setup, counted.mean);
  const miss = missBy(setup, counted.mean);
  const spare = spareBy(setup, counted.mean);
  const locked = lockedGrade(setup, counted.mean);
  const target = targetOf(setup);
  const tone = TONE[verdict];
  const points = projectPoints(project);
  const allMet = guidelinesAllMet(project);

  const patch = useCallback((o: Partial<Setup>) => setSetup((s) => ({ ...s, ...o })), []);
  const patchP = useCallback((o: Partial<Project>) => setProject((p) => ({ ...p, ...o })), []);
  const setItem = useCallback((i: number, o: Partial<Item>) => {
    setItems((list) => list.map((it, k) => (k === i ? { ...it, ...o } : it)));
  }, []);

  const needleAt = need === null ? 0 : Math.max(0, Math.min(100, need));

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-6">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Tool · AP Calculus BC
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Grade Console
        </h1>
        <p className="mt-2.5 max-w-2xl text-[15px] text-slate-400">{HEADLINE}.</p>
      </header>

      {/* ── 三个主数 ───────────────────────────────────────── */}
      <section data-panel="master"
        className={`mt-7 grid gap-x-8 gap-y-5 px-5 py-5 sm:grid-cols-[auto_auto_auto_1fr] sm:items-end ${panel}`}>
        <div>
          <p className={label}>Target</p>
          <div className="mt-2 flex gap-1">
            {GOALS.map((g) => (
              <button key={g} type="button" data-goal={g}
                data-active={setup.goal === g ? 'yes' : 'no'}
                onClick={() => patch({ goal: g })}
                className={`${chip} ${setup.goal === g ? chipOn : chipOff}`}>
                {g}<span className="ml-1 text-[10px] text-slate-500">{show(cutoffOf(setup, g))}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>Assessments</p>
          <p data-read="mean" data-value={counted.mean ?? ''}
            className="mt-1.5 font-mono text-[26px] leading-none tabular-nums" style={{ color: LAB.x1 }}>
            {counted.mean === null ? '—' : `${counted.mean.toFixed(2)}%`}
          </p>
        </div>

        {/* ⭐ 他每天真正看到的那个数 */}
        <div>
          <p className={label}>PowerSchool now</p>
          {/* ⚠️ 两个数要分行。挤在一行里会渲染成 "8988.95 · B" —— 读成了一个数。 */}
          <p data-read="shown" data-value={shown ?? ''}
            className="mt-1.5 font-mono text-[26px] leading-none tabular-nums text-slate-200">
            {shown === null ? '—' : roundedPercent(shown)}
          </p>
          {shown !== null && (
            <p className="mt-1 font-mono text-[11px] tabular-nums text-slate-500">
              {shown.toFixed(2)} · {letterFor(shown)}
            </p>
          )}
        </div>

        <div className="sm:text-right">
          <p className={label}>Final needed for {setup.goal}</p>
          <p data-read="need" data-value={need ?? ''}
            className="mt-1 font-mono text-[44px] leading-none tabular-nums" style={{ color: tone.color }}>
            <span aria-hidden className="mr-2 align-middle text-[0.5em]">{tone.symbol}</span>
            {need === null ? '—' : need.toFixed(1)}
          </p>
        </div>
      </section>

      {/* ── 结论 ───────────────────────────────────────────── */}
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
          {verdict === 'unreachable' && miss !== null && (
            <>
              Out of reach — a perfect final gives {gradeWith(setup, counted.mean!, 100).toFixed(1)},
              still <b>{miss.toFixed(1)}</b> short of {show(target)}.
            </>
          )}
        </p>
        {counted.droppedIndex >= 0 && (
          <p data-dropnote className="mt-1 font-mono text-[11px] text-slate-500">
            Dropping {items[counted.droppedIndex]!.name} at{' '}
            {applied.percents[counted.droppedIndex]!.toFixed(1)}% — lowest percentage, not lowest raw points.
          </p>
        )}
      </section>

      {/* ── 推子 ───────────────────────────────────────────── */}
      <section data-panel="strips" className={`mt-3 overflow-x-auto p-5 ${panel}`}>
        <div className="flex items-start gap-2.5" style={{ minWidth: `${(items.length + 1) * 98}px` }}>
          {items.map((it, i) => {
            const dropped = i === counted.droppedIndex;
            const state = it.muted ? 'Muted' : dropped ? 'Dropped' : 'Counted';
            const symbol = it.muted ? '·' : dropped ? '×' : '✓';
            const color = it.muted ? LAB.muted : dropped ? LAB.fail : LAB.pass;
            const raw = percentOf(it);
            const pct = applied.percents[i]!;
            const boosted = i === applied.targetIndex && Math.abs(pct - raw) > 1e-9;
            return (
              <div key={i} data-strip={i} data-state={state.toLowerCase()}
                className={'w-[88px] shrink-0 ' + (it.muted ? 'opacity-40' : '')}>
                <div className="flex items-center gap-0.5">
                  <input type="number" min={0} max={it.possible} step={1} value={it.earned}
                    data-earned={i} aria-label={`${it.name} points earned`}
                    onChange={(e) => setItem(i, { earned: clampEarned(num(e.target.value, it.earned), it.possible) })}
                    className="pts-input w-full min-w-0 rounded-md border border-slate-600 bg-slate-950 px-0.5 py-1 text-center font-mono text-[12px] tabular-nums text-slate-100" />
                  <span aria-hidden className="font-mono text-[11px] text-slate-600">/</span>
                  <input type="number" min={1} step={1} value={it.possible}
                    data-possible={i} aria-label={`${it.name} points possible`}
                    onChange={(e) => {
                      const possible = clampPossible(num(e.target.value, it.possible));
                      setItem(i, { possible, earned: clampEarned(it.earned, possible) });
                    }}
                    className={'pts-input w-full min-w-0 rounded-md border bg-slate-950 px-0.5 py-1 text-center font-mono text-[12px] tabular-nums '
                      + (it.possible !== 100 ? 'border-amber-400/60 text-amber-200' : 'border-slate-800 text-slate-500')} />
                </div>
                {/* ⭐ 被项目顶过的那一场,把原值和加完的值都显示出来 */}
                <p data-pct={i} data-value={pct}
                  className="mt-1.5 text-center font-mono text-[11px] tabular-nums" style={{ color }}>
                  {boosted && <span className="text-slate-600 line-through">{raw.toFixed(0)}</span>}
                  {boosted && <span aria-hidden className="text-slate-600"> → </span>}
                  {pct.toFixed(1)}%
                </p>
                <div className="fader-track relative mt-1.5 h-40 rounded-md border border-slate-800 bg-slate-950/70">
                  <div className="absolute inset-x-1 bottom-0 rounded-b-md"
                    style={{ height: `${pct}%`, background: color, opacity: 0.22 }} />
                  {/* 项目加上去的那一段,单独标出来 */}
                  {boosted && (
                    <div data-boost className="absolute inset-x-1 border-t-2"
                      style={{ bottom: `${raw}%`, borderColor: LAB.x2 }} />
                  )}
                  <div className="absolute inset-x-0 border-t border-dashed border-slate-600/70" style={{ bottom: '80%' }} />
                  <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/50" style={{ bottom: '90%' }} />
                  <input type="range" min={0} max={it.possible} step={1} value={it.earned}
                    aria-label={`${it.name} points earned, out of ${it.possible}`}
                    onChange={(e) => setItem(i, { earned: clampEarned(num(e.target.value, it.earned), it.possible) })}
                    className="fader-input absolute inset-0" />
                </div>
                <input type="text" value={it.name} aria-label={`Assessment ${i + 1} name`} data-name={i}
                  onChange={(e) => setItem(i, { name: e.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-800 bg-transparent px-1 py-0.5 text-center font-mono text-[10px] text-slate-300" />
                <p data-chip className="mt-1 text-center font-mono text-[10px]" style={{ color }}>
                  <span aria-hidden>{symbol} </span>{state}
                </p>
                <button type="button" data-mute={i} aria-pressed={it.muted}
                  onClick={() => setItem(i, { muted: !it.muted })}
                  className="mt-1 w-full rounded-md border border-slate-700 py-0.5 font-mono text-[10px] text-slate-400 hover:border-slate-500">
                  {it.muted ? 'Unmute' : 'Mute'}
                </button>
              </div>
            );
          })}

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

      {/* ── 项目 ───────────────────────────────────────────── */}
      <section data-panel="project" data-doing={project.doing ? 'yes' : 'no'} className={`mt-3 p-5 ${panel}`}>
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <label className="flex items-center gap-2.5 text-[13px] text-slate-200">
            <input type="checkbox" checked={project.doing} data-field="doing"
              onChange={(e) => patchP({ doing: e.target.checked })}
              className="h-4 w-4 accent-amber-400" />
            Doing the project — <span className="text-slate-400">The Art of Calculus (Without Words)</span>
          </label>
          {project.doing && (
            <p data-project-points data-value={points}
              className="font-mono text-[22px] leading-none tabular-nums"
              style={{ color: points > 0 ? LAB.pass : points < 0 ? LAB.fail : LAB.muted }}>
              {points > 0 ? '+' : ''}{points}
              <span className="ml-2 text-[11px] text-slate-500">points · SCORE {projectScore(project)}</span>
            </p>
          )}
        </div>

        {project.doing && (
          <>
            {/* ⚠️ 五条准则是**乘积**,任何一条 0 就全盘归零 —— 所以警告要响。 */}
            {!allMet && (
              <p data-guideline-warn className="mt-3 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
                style={{ background: `${LAB.fail}14`, color: LAB.fail }}>
                <span aria-hidden>× </span>
                One guideline unmet makes the whole product zero, so the project scores −50 no matter
                how good the work is.
              </p>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
              <div>
                <p className={label}>All five must hold</p>
                <ul className="mt-2 space-y-1.5">
                  {GUIDELINES.map((g) => (
                    <li key={g.key}>
                      <label className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-300">
                        <input type="checkbox" checked={project.met[g.key]}
                          data-guideline={g.key}
                          onChange={(e) => patchP({ met: { ...project.met, [g.key]: e.target.checked } })}
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-amber-400" />
                        <span className={project.met[g.key] ? '' : 'text-rose-300'}>{g.text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3">
                {([
                  ['Mathematics', MATH_SCORES, project.math, (v: number) => patchP({ math: v }), 'math'],
                  ['Artistic', ARTISTIC_SCORES, project.artistic, (v: number) => patchP({ artistic: v }), 'artistic'],
                  ['Explanation', EXPLANATION_SCORES, project.explanation, (v: number) => patchP({ explanation: v }), 'explanation'],
                ] as const).map(([name, options, value, set, key]) => (
                  <div key={key}>
                    <p className={label}>{name}</p>
                    <div className="mt-1.5 flex gap-1">
                      {options.map((o) => (
                        <button key={o} type="button" data-score={`${key}-${o}`}
                          data-active={value === o ? 'yes' : 'no'}
                          onClick={() => set(o)}
                          className={`${chip} ${value === o ? chipOn : chipOff}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ⭐⭐⭐ 两件只有代码说得准的事:加在哪一场,以及值多少 */}
            <div className="mt-4 space-y-1.5 border-t border-slate-800 pt-3.5">
              {applied.targetIndex >= 0 && (
                <p data-applied className="font-mono text-[12px] text-slate-300">
                  Applied to <b style={{ color: LAB.x2 }}>{items[applied.targetIndex]!.name}</b>
                  {' '}({percentOf(items[applied.targetIndex]!).toFixed(0)}% →{' '}
                  {applied.percents[applied.targetIndex]!.toFixed(0)}%)
                  {applied.ties.length > 0 && (
                    <span className="text-slate-500">
                      {' '}— identical if applied to{' '}
                      {applied.ties.map((t) => items[t]!.name).join(' or ')}
                    </span>
                  )}
                </p>
              )}
              {need !== null && baseline !== null && (
                <p data-project-worth data-value={baseline - need} className="font-mono text-[12px] text-slate-300">
                  {Math.abs(baseline - need) < 0.05
                    ? 'Worth nothing here — the final needs the same either way.'
                    : (
                      <>
                        Worth <b style={{ color: baseline > need ? LAB.pass : LAB.fail }}>
                          {(baseline - need).toFixed(1)}
                        </b>{' '}
                        points on the final: {baseline.toFixed(1)} without it, {need.toFixed(1)} with it.
                      </>
                    )}
                </p>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── 式子 ───────────────────────────────────────────── */}
      <section data-panel="equation" className={`mt-3 overflow-hidden p-5 ${panel}`}>
        <div className="grid gap-3 lg:grid-cols-4">
          {([
            ['the syllabus formula', EQUATION_TEX],
            ['what PowerSchool shows now', IN_PROGRESS_TEX],
            ['the project', PROJECT_TEX],
            ['solved for the final', SOLVED_TEX],
          ] as const).map(([name, tex], k) => (
            <div key={name}
              className={'overflow-x-auto rounded-lg border px-3 py-2.5 '
                + (k === 3 ? 'border-amber-400/40 bg-amber-400/5' : 'border-slate-800')}>
              <p className={'font-mono text-[10px] ' + (k === 3 ? 'text-amber-300' : 'text-slate-500')}>{name}</p>
              <p className="mt-1.5 text-[13px] text-slate-200"><Tex src={tex} display /></p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 设置 ───────────────────────────────────────────── */}
      <section data-panel="setup" className={`mt-3 p-5 ${panel}`}>
        <div className="grid gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {([
            ['Assignments %', setup.wAssign, (v: number) => patch({ wAssign: v }), 'wAssign'],
            ['Assessments %', setup.wAssess, (v: number) => patch({ wAssess: v }), 'wAssess'],
            ['Final %', setup.wFinal, (v: number) => patch({ wFinal: v }), 'wFinal'],
            ['Assignments score', setup.assignScore, (v: number) => patch({ assignScore: v }), 'assignScore'],
            ['A cutoff', setup.targetA, (v: number) => patch({ targetA: v }), 'targetA'],
            ['B cutoff', setup.targetB, (v: number) => patch({ targetB: v }), 'targetB'],
            ['C cutoff', setup.targetC, (v: number) => patch({ targetC: v }), 'targetC'],
          ] as const).map(([name, value, set, key]) => (
            <label key={key} className="block">
              <span className={label}>{name}</span>
              <input type="number" min={0} max={100} step={0.5} value={value} data-field={key}
                onChange={(e) => set(num(e.target.value, value))}
                className="pts-input mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 font-mono text-[12px] tabular-nums text-slate-100" />
            </label>
          ))}
        </div>

        {/* ⚠️ 两件还没确认的事,明确标出来 —— 不要让一个假设看起来像事实。 */}
        <div className="mt-4 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-2 text-[12px] text-slate-300">
              <input type="checkbox" checked={setup.dropLowest} data-field="dropLowest"
                onChange={(e) => patch({ dropLowest: e.target.checked })}
                className="h-3.5 w-3.5 accent-amber-400" />
              Drop the lowest assessment
            </label>
            <p data-unconfirmed="drop" className="mt-1 font-mono text-[10px] text-amber-300/80">
              Unconfirmed — said in class, not in the syllabus.
            </p>
          </div>
          <div>
            <div className="flex gap-1">
              {METHODS.map((m) => (
                <button key={m} type="button" data-method={m}
                  data-active={setup.method === m ? 'yes' : 'no'}
                  onClick={() => patch({ method: m })}
                  className={`${chip} ${setup.method === m ? chipOn : chipOff}`}>
                  {METHOD_NAME[m]}
                </button>
              ))}
            </div>
            <p data-unconfirmed="method" className="mt-1 font-mono text-[10px] text-amber-300/80">
              Unconfirmed — identical while every assessment is out of 100.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-800 pt-4">
          <button type="button" data-action="add"
            onClick={() => setItems((l) => [...l, { name: `Assess ${l.length + 1}`, earned: 90, possible: 100, muted: false }])}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500">
            Add
          </button>
          <button type="button" data-action="remove" disabled={items.length <= 1}
            onClick={() => setItems((l) => (l.length > 1 ? l.slice(0, -1) : l))}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500 disabled:opacity-40">
            Remove last
          </button>
          <button type="button" data-action="reset"
            onClick={() => { setSetup(SEED_SETUP); setItems(SEED_ITEMS); setProject(SEED_PROJECT); }}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-300 hover:border-slate-500">
            Reset
          </button>
        </div>

        {!weightsBalanced(setup) && (
          <p data-weightwarn className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-[11px]"
            style={{ color: LAB.x2 }}>
            <span aria-hidden>! </span>The weights add up to {show(weightSum(setup))}%, not 100%.
          </p>
        )}
      </section>
    </main>
  );
}
