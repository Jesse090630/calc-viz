/**
 * LAB — 「Connect Two Points」
 *
 * 平均变化率 = 割线斜率。一个实验台,没有翻页。
 *
 * ⚠️ 公式**不是一上来就摆出来**的(提示词明确要求)。
 * 顺序是:两个点 → 水平变化 → 竖直变化 → 相除 → 割线。
 * 但这不是幻灯片:每一段揭开之后**永久留在页面上并保持实时**,
 * 学生随时可以回头拖动,看四个数一起变。
 *
 * ⭐ 一个提示词里没有、但对 x² 特别值钱的落点:
 *   (b² − a²)/(b − a) = a + b
 * 平均变化率**恰好是两个输入之和**。a=1、b=3 → 4,不用算就知道。
 * 学生因此能在拖动之前**预测**读数 —— 这比"看,又对上了"强得多。
 * 等他试过 3 组之后才揭示,免得剥夺自己发现的机会。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/rateOfChange.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SecantGraph, type Reveal } from './SecantGraph';
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import { moveX1, moveX2 } from '../shared/pairState';
import {
  DOMAIN,
  SECANT_FN,
  approachSequence,
  readSecant,
  riseExpression,
  runExpression,
  showNumber,
  slopeByIdentity,
  slopeExpression,
  type SecantReading,
} from '../../math/rateOfChange';

const ORDER: readonly Reveal[] = ['points', 'run', 'rise', 'ratio'];

const STEP_LABEL: Readonly<Record<Reveal, string>> = {
  points: 'Show the horizontal change',
  run: 'Show the vertical change',
  rise: 'Divide them',
  ratio: '',
};

/** 算不出来时回退到 (1, 3),**绝不返回 NaN**。 */
function readOr(a: number, b: number): SecantReading {
  return readSecant(a, b) ?? readSecant(1, 3)!;
}

function Row({
  eyebrow,
  symbolic,
  substituted,
  accent,
  big = false,
}: {
  eyebrow: string;
  symbolic: string;
  substituted: string;
  accent: string;
  big?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-slate-950/60 px-4 py-2.5" style={{ borderColor: `${accent}40` }}>
      <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
        {eyebrow}
      </span>
      <div className={`mt-1.5 text-slate-100 ${big ? 'text-xl' : 'text-base'}`}>
        <Tex src={symbolic} />
      </div>
      <div className={`mt-0.5 font-mono tabular-nums ${big ? 'text-base text-slate-200' : 'text-sm text-slate-400'}`}>
        {substituted}
      </div>
    </div>
  );
}

export function SecantLab() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(3);
  const [reveal, setReveal] = useState<Reveal>('points');
  const [moved, setMoved] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);

  const reading = useMemo(() => readOr(a, b), [a, b]);
  const identity = slopeByIdentity(reading.a, reading.b);

  const record = useCallback((na: number, nb: number) => {
    setMoved((m) => {
      const key = `${showNumber(na)}|${showNumber(nb)}`;
      return m.includes(key) ? m : [...m, key];
    });
  }, []);

  /** 两点绝不允许重合 —— 否则 Δx = 0,读数变成 undefined。逻辑与守卫在 shared/pairState。 */
  const dragA = useCallback(
    (next: number) => {
      const s = moveX1({ x1: a, x2: b }, next, DOMAIN);
      setA(s.x1);
      setB(s.x2);
      record(s.x1, s.x2);
    },
    [a, b, record],
  );
  const dragB = useCallback(
    (next: number) => {
      const s = moveX2({ x1: a, x2: b }, next, DOMAIN);
      setA(s.x1);
      setB(s.x2);
      record(s.x1, s.x2);
    },
    [a, b, record],
  );

  const advance = useCallback(() => {
    setReveal((r) => ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(r) + 1)]!);
  }, []);

  /* ── 「把两点靠近」 ────────────────────────────────────────
     ⚠️ 这里**不讲导数**。只是让读数往 2a 走,并且刻意在还看得见两个点的地方停下。 */
  const timer = useRef<number | null>(null);
  const approach = useCallback(() => {
    if (busy) return;
    setReveal('ratio');
    setBusy(true);
    const steps = approachSequence(a, b);
    let i = 0;
    const tick = () => {
      const next = steps[i];
      if (next === undefined) {
        setBusy(false);
        timer.current = null;
        return;
      }
      setB(next);
      i += 1;
      timer.current = window.setTimeout(tick, 90);
    };
    tick();
  }, [a, b, busy]);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const reset = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setBusy(false);
    setA(1);
    setB(3);
  }, []);

  const showIdentity = moved.length >= 3 && reveal === 'ratio';

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Connect Two Points
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Two points. One straight line. What number describes it?
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div className="text-lg text-slate-100">
            <Tex src={SECANT_FN.tex} />
          </div>
          <div className="font-mono text-xs text-slate-400">
            a = {showNumber(reading.a)} · b = {showNumber(reading.b)}
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <SecantGraph
              reading={reading}
              reveal={reveal}
              onChangeA={dragA}
              onChangeB={dragB}
              busy={busy}
            />
            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              {([
                { label: 'a', value: reading.a, color: LAB.x1, onChange: dragA },
                { label: 'b', value: reading.b, color: LAB.x2, onChange: dragB },
              ] as const).map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <label htmlFor={`slider-${s.label}`} className="w-3 shrink-0 font-mono text-xs font-bold" style={{ color: s.color }}>
                    {s.label}
                  </label>
                  <input
                    id={`slider-${s.label}`}
                    type="range"
                    min={DOMAIN.a}
                    max={DOMAIN.b}
                    step={0.01}
                    value={s.value}
                    disabled={busy}
                    onChange={(e) => s.onChange(Number(e.target.value))}
                    className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 disabled:opacity-40"
                    style={{ accentColor: s.color }}
                  />
                  <output htmlFor={`slider-${s.label}`} className="w-11 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
                    {showNumber(s.value)}
                  </output>
                </div>
              ))}
              <p className="pt-0.5 text-[11px] text-slate-500">
                Drag either dot, use the sliders, or focus a dot and press ← →.
              </p>
            </div>
          </div>

          {/* 右栏:分阶段搭起来的读数 */}
          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            <div className="space-y-2">
              <Row
                eyebrow="Two points"
                symbolic="A = (a,\, f(a)) \qquad B = (b,\, f(b))"
                substituted={`A = (${showNumber(reading.a)}, ${showNumber(reading.fa)})   B = (${showNumber(reading.b)}, ${showNumber(reading.fb)})`}
                accent={LAB.muted}
              />

              {reveal !== 'points' && (
                <Row
                  eyebrow="Horizontal change"
                  symbolic="\Delta x = b - a"
                  substituted={runExpression(reading)}
                  accent={LAB.x1}
                />
              )}

              {(reveal === 'rise' || reveal === 'ratio') && (
                <Row
                  eyebrow="Vertical change"
                  symbolic="\Delta y = f(b) - f(a)"
                  substituted={riseExpression(reading)}
                  accent={LAB.x2}
                />
              )}

              {reveal === 'ratio' && (
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: `${STATE.pass.color}55`, backgroundColor: `${STATE.pass.color}0f` }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: STATE.pass.color }}>
                    Average rate of change
                  </span>
                  <div className="mt-2 text-xl text-slate-100">
                    <Tex src="\dfrac{\Delta y}{\Delta x} = \dfrac{f(b) - f(a)}{b - a}" />
                  </div>
                  <div className="mt-1.5 font-mono text-base tabular-nums text-slate-200">
                    {slopeExpression(reading)}
                  </div>
                  <p className="mt-2 text-sm font-semibold" style={{ color: STATE.pass.color }}>
                    <span aria-hidden="true">✓</span> Slope of the secant ={' '}
                    {reading.slope === null ? '—' : showNumber(reading.slope)}
                  </p>
                </div>
              )}
            </div>

            {/* 揭示按钮 */}
            {reveal !== 'ratio' && (
              <button
                type="button"
                onClick={advance}
                className="mt-3 w-full rounded-xl border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/20"
              >
                {STEP_LABEL[reveal]} →
              </button>
            )}

            {reveal === 'ratio' && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={approach}
                  disabled={busy}
                  className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-400 hover:bg-slate-800/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? 'Closing in…' : 'Bring the points closer'}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500"
                >
                  Reset to a = 1, b = 3
                </button>
              </div>
            )}

            {/* ⭐ a + b 的发现 */}
            {showIdentity && identity !== null && (
              <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Notice something
                </p>
                <p className="mt-1.5 text-sm text-slate-300">
                  For this curve the answer is always just{' '}
                  <strong className="font-mono text-cyan-200">a + b</strong>.
                </p>
                <div className="mt-2 text-base text-slate-100">
                  <Tex src="\dfrac{b^2 - a^2}{b - a} = \dfrac{(b-a)(b+a)}{b-a} = a + b" />
                </div>
                <div className="mt-1.5 font-mono text-sm tabular-nums text-cyan-200">
                  {showNumber(reading.a)} + {showNumber(reading.b)} = {showNumber(identity)}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  Move the points and predict the reading before you look.
                </p>
              </div>
            )}

            {/* 靠近之后的那一句 —— 到此为止,不讲导数 */}
            {reveal === 'ratio' && Math.abs(reading.run) < 0.6 && (
              <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                In calculus, we will ask what happens as these two points get extremely close.
              </p>
            )}
          </div>
        </div>
      </section>

      {/*
        ⚠️ 这句话是**结论**,所以不能一进页面就在那儿。
        原来它常驻页脚,于是学生还没拖任何东西,就已经读到
        "平均变化率和割线斜率是同一个数" —— 整个搭建过程的悬念当场消失。
        (是测试先撞上的:断言"公式没有一上来就摆出来"失败,查下来是这一行。)
      */}
      {reveal === 'ratio' && (
        <p className="mt-8 text-center text-xs text-slate-500">
          Average rate of change and secant slope are the same number, read two different ways.
        </p>
      )}
    </main>
  );
}
