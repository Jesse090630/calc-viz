/**
 * LAB — 「The Symmetry Test」
 *
 * 结构比上一节简单得多,因为 Jesse 明确说了不要做成大部头:
 *   一个实验台(EVEN | ODD 切换)+ 一个挑战区。没有翻页,没有解锁链。
 *
 * ⚠️ 一处**刻意**的措辞纪律,和上一节一脉相承:
 * 拖到一个 x 看见 f(-x) = f(x),**不等于**这个函数是偶函数 ——
 * 那还是"一个例子"。所以结论卡(EVEN FUNCTION / ODD FUNCTION)不会一开始就在,
 * 要等学生至少看过 3 个不同的 x 才出现,而且措辞是"每一个都对得上",不是"所以成立"。
 * 反过来,挑战区里的**反例**可以直接下结论 —— 一个就够。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/symmetry.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useMemo, useState } from 'react';
import { SymmetryGraph, DRAG_RANGE } from './SymmetryGraph';
import { Challenge } from './Challenge';
import { LabButton, MirrorPanel, ModeToggle, VerdictCard, XSlider } from './Panels';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import {
  CHALLENGE_ORDER,
  SYMMETRY_FUNCTIONS,
  informativeStart,
  mirrorAt,
  showNumber,
  type MirrorSample,
  type SymmetryKind,
} from '../../math/symmetry';

const MODE_FN = { even: 'square', odd: 'cube' } as const;

/** 看过几个不同的 x 之后才允许给出结论。一个例子不是定义。 */
const ENOUGH_SAMPLES = 3;

function clampX(x: number): number {
  return Math.min(DRAG_RANGE.b, Math.max(DRAG_RANGE.a, x));
}

/** 取样。算不出来时退回 x = 2,**绝不返回 NaN**。 */
function sampleOr(fnId: string, x: number): MirrorSample {
  const fn = SYMMETRY_FUNCTIONS[fnId] ?? SYMMETRY_FUNCTIONS.square!;
  return mirrorAt(fn, x) ?? mirrorAt(fn, 2)!;
}

export function SymmetryLab() {
  const [mode, setMode] = useState<'even' | 'odd'>('even');
  const [x, setX] = useState(2);
  /** 记录看过哪些 x(取两位小数去重),用来决定结论卡什么时候出现 */
  const [seen, setSeen] = useState<readonly string[]>(['2.00']);

  const fnId = MODE_FN[mode];
  const fn = SYMMETRY_FUNCTIONS[fnId]!;
  const sample = useMemo(() => sampleOr(fnId, x), [fnId, x]);

  const moveX = useCallback((next: number) => {
    const v = clampX(next);
    setX(v);
    setSeen((s) => {
      const key = showNumber(v);
      return s.includes(key) ? s : [...s, key];
    });
  }, []);

  const switchMode = useCallback((next: 'even' | 'odd') => {
    setMode(next);
    setX(2);
    setSeen(['2.00']);
  }, []);

  const holds = mode === 'even' ? sample.evenHolds : sample.oddHolds;
  const enough = seen.length >= ENOUGH_SAMPLES;

  /* ── Part 3:挑战 ─────────────────────────────────────────── */
  const [quizIndex, setQuizIndex] = useState(0);
  const [answer, setAnswer] = useState<SymmetryKind | null>(null);
  const quizFnId = CHALLENGE_ORDER[quizIndex % CHALLENGE_ORDER.length]!;
  const quizFn = SYMMETRY_FUNCTIONS[quizFnId]!;
  const [quizX, setQuizX] = useState(() => informativeStart(SYMMETRY_FUNCTIONS.square!));
  const quizSample = useMemo(() => sampleOr(quizFnId, quizX), [quizFnId, quizX]);

  const nextQuestion = useCallback(() => {
    const nextIndex = quizIndex + 1;
    setQuizIndex(nextIndex);
    setAnswer(null);
    // 起点必须是个**能说明问题**的 x —— 给 0 的话奇偶两条都"成立",毫无信息
    setQuizX(informativeStart(SYMMETRY_FUNCTIONS[CHALLENGE_ORDER[nextIndex % CHALLENGE_ORDER.length]!]!));
  }, [quizIndex]);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          The Symmetry Test
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Pick an input. Flip its sign. Watch what happens to the output.
        </p>
      </header>

      {/* ── 实验台 ── */}
      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <ModeToggle mode={mode} onSelect={switchMode} />
          <div className="text-lg text-slate-100">
            <Tex src={fn.tex} />
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <SymmetryGraph
              fn={fn}
              sample={sample}
              onChangeX={moveX}
              linkage={mode}
              highlightY={mode === 'even'}
              highlightOrigin={mode === 'odd'}
            />
            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <XSlider value={sample.x} min={DRAG_RANGE.a} max={DRAG_RANGE.b} onChange={moveX} />
              <p className="pt-0.5 text-[11px] text-slate-500">
                Drag the amber dot, use the slider, or focus the dot and press ← →. The cyan point
                at <span className="font-mono">−x</span> follows automatically.
              </p>
            </div>
          </div>

          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            <MirrorPanel sample={sample} test={mode} />

            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold" style={{ color: holds ? LAB.pass : LAB.fail }}>
                <span aria-hidden="true">{holds ? '✓' : '×'}</span>{' '}
                {mode === 'even' ? 'Same height. Opposite x-values.' : 'Opposite input. Opposite output.'}
              </p>

              {/*
                ⚠️ 结论卡不是一拖就给。看过 1 个 x 只说明"这个 x 成立"。
                这和上一节「每一对都要成立」是同一条线:例子不是定义。
              */}
              {!enough ? (
                <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                  That is one input. Move x to a few more places before deciding anything —{' '}
                  <span className="font-mono text-slate-300">{seen.length}</span> of{' '}
                  <span className="font-mono text-slate-300">{ENOUGH_SAMPLES}</span> so far.
                </p>
              ) : (
                <>
                  <p className="text-xs leading-relaxed text-slate-400">
                    Every input you have tried lands the same way. That is what the definition
                    names:
                  </p>
                  <VerdictCard kind={mode} />
                </>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <LabButton onClick={() => moveX(mode === 'even' ? 1.3 : 1.6)}>Jump to another x</LabButton>
              <LabButton
                onClick={() => switchMode(mode === 'even' ? 'odd' : 'even')}
                tone="primary"
              >
                Try {mode === 'even' ? 'odd' : 'even'} →
              </LabButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── 挑战 ── */}
      <section className="mt-10 overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 px-5 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
              Your turn
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Classify this one</h2>
          </div>
          <div className="text-lg text-slate-100">
            <Tex src={quizFn.tex} />
          </div>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 lg:border-b-0 lg:border-r">
            <SymmetryGraph
              fn={quizFn}
              sample={quizSample}
              onChangeX={(v) => setQuizX(clampX(v))}
              linkage={answer === null ? 'none' : (quizFn.expected === 'neither' ? 'none' : quizFn.expected)}
              highlightY={answer !== null && quizFn.expected === 'even'}
              highlightOrigin={answer !== null && quizFn.expected === 'odd'}
            />
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <XSlider value={quizSample.x} min={DRAG_RANGE.a} max={DRAG_RANGE.b} onChange={(v) => setQuizX(clampX(v))} />
            </div>
          </div>
          <div className="min-w-0 p-4">
            <Challenge
              fn={quizFn}
              answer={answer}
              onAnswer={setAnswer}
              onNext={nextQuestion}
              sample={quizSample}
              reachableRadius={DRAG_RANGE.b}
            />
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        Most functions are neither. Symmetry is a special property, not a default.
      </p>
    </main>
  );
}
