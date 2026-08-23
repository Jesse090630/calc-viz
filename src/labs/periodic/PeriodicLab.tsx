/**
 * LAB — 「Does It Repeat?」
 *
 * 一个实验台。没有翻页,没有解锁链 —— 学生调 T,看副本滑过去,读结果。
 *
 * ⚠️ 这一节的教学重点不在"2π 是周期"这个结论,而在**"看起来重合"不算数**。
 * 所以界面上始终显示一个数:`worst mismatch`,也就是 max |f(x+T) − f(x)|。
 * T = 6.2 时它是 0.08 —— 曲线肉眼几乎重合,但那个数不肯变成 0。
 * 判断因此从"我觉得对上了"变成"读数是多少"。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/periodicity.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PeriodGraph } from './PeriodGraph';
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import {
  FUNCTION_ORDER,
  PERIODIC_FUNCTIONS,
  T_MAX,
  T_PRESETS,
  T_STEP,
  formatShift,
  formatShiftTex,
  fundamentalPeriodFromFrequency,
  measureShift,
  multipleOfFundamental,
  showNumber,
  snapT,
} from '../../math/periodicity';

/** 滑动动画时长。够慢到看得见,够快到不烦人。 */
const SLIDE_MS = 620;

export function PeriodicLab() {
  const [fnId, setFnId] = useState('sin');
  const [targetShift, setTargetShift] = useState(2 * Math.PI);
  const [liveShift, setLiveShift] = useState(2 * Math.PI);
  /** 记录这条函数上试过哪些 T,用来决定基本周期那张卡什么时候出现 */
  const [tried, setTried] = useState<readonly string[]>([formatShift(2 * Math.PI)]);

  const fn = PERIODIC_FUNCTIONS[fnId] ?? PERIODIC_FUNCTIONS.sin!;
  const report = useMemo(() => measureShift(fn, targetShift), [fn, targetShift]);
  const fundamental = fundamentalPeriodFromFrequency(fn);
  const multiple = multipleOfFundamental(fn, targetShift);

  /* ── 滑动动画 ───────────────────────────────────────────────
     ⚠️ 副本必须**看得见地移动**。直接把位移设成 T 就是瞬移,
     而"滑过去落在自己身上"这个动作正是这一节要教的东西。 */
  const frame = useRef<number | null>(null);
  const animateTo = useCallback((next: number, from = 0) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SLIDE_MS);
      // ease-out:起步快、落位稳,像一个东西被推过去
      const eased = 1 - Math.pow(1 - t, 3);
      setLiveShift(from + (next - from) * eased);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else {
        frame.current = null;
        setLiveShift(next); // 收尾必须落在**精确值**上,否则读数会差一点点
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const chooseT = useCallback(
    /**
     * `snap = false` 只有「near miss」那个按钮会用。
     *
     * ⚠️ 这是个我自己造出来又必须补上的洞:
     * 吸附到 π/12 让 2π 可以被精确选中(必要),但也意味着学生**永远碰不到**
     * 6.2 这种"看起来完全重合、其实差 0.08"的值 —— 而那恰恰是
     * `worst mismatch` 这个读数存在的全部理由。
     * 与其把它藏在拖动的手感里靠运气撞上,不如做成一个明写着的按钮。
     */
    (raw: number, animate = false, snap = true) => {
      const next = snap ? snapT(raw) : raw;
      setTargetShift(next);
      setTried((s) => {
        const key = formatShift(next);
        return s.includes(key) ? s : [...s, key];
      });
      if (animate) animateTo(next, 0);
      else {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        setLiveShift(next);
      }
    },
    [animateTo],
  );

  /** 离 2π 只差 0.083 —— 画面上几乎分不出来,读数却不肯变成 0 */
  const NEAR_MISS = 6.2;
  const nearMissActive = Math.abs(targetShift - NEAR_MISS) < 1e-9;

  const switchFunction = useCallback(
    (nextId: string) => {
      setFnId(nextId);
      const start = 2 * Math.PI;
      setTargetShift(start);
      setLiveShift(start);
      setTried([formatShift(start)]);
    },
    [],
  );

  const sliding = Math.abs(liveShift - targetShift) > 1e-6;
  const enough = tried.length >= 3;

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Periodic Functions
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Copy the graph. Slide it right. See if it lands on itself.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        {/* 函数切换 */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a function" className="inline-flex rounded-xl border border-slate-700 p-1">
            {FUNCTION_ORDER.map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={fnId === id}
                onClick={() => switchFunction(id)}
                className={
                  'rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition ' +
                  (fnId === id ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
                }
              >
                {PERIODIC_FUNCTIONS[id]!.label}
              </button>
            ))}
          </div>
          <div className="text-lg text-slate-100">
            <Tex src={fn.tex} />
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <PeriodGraph
            fn={fn}
            liveShift={liveShift}
            targetShift={targetShift}
            matches={report.matches}
            worstX={report.worstX}
            worstMismatch={report.worstMismatch}
          />
        </div>

        {/* T 控制条 */}
        <div className="grid gap-4 border-t border-slate-700 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <label htmlFor="shift-T" className="shrink-0 font-mono text-sm font-bold" style={{ color: LAB.x2 }}>
                T
              </label>
              <input
                id="shift-T"
                type="range"
                min={0}
                max={T_MAX}
                step={T_STEP}
                value={targetShift}
                onChange={(e) => chooseT(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700"
                style={{ accentColor: LAB.x2 }}
                aria-valuetext={`shift of ${formatShift(targetShift)}`}
              />
              <output
                htmlFor="shift-T"
                className="w-16 shrink-0 text-right font-mono text-sm font-bold tabular-nums"
                style={{ color: LAB.x2 }}
              >
                {formatShift(targetShift)}
              </output>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {T_PRESETS.map((preset) => {
                const active = Math.abs(preset.value - targetShift) < 1e-9;
                return (
                  <button
                    key={preset.tex}
                    type="button"
                    data-preset={formatShift(preset.value)}
                    /*
                      ⚠️ 按钮里是 KaTeX 渲染出来的公式,读屏拿到的是一堆 MathML 碎片,
                      根本读不出"派 over 二"。所以必须显式给一个 aria-label。
                      (这条是被测试逼出来的:`getByRole('button', {name: 'π'})` 找不到任何东西 ——
                       测试找不到,读屏用户同样找不到。)
                    */
                    aria-label={`Set T to ${formatShift(preset.value)}`}
                    aria-pressed={active}
                    onClick={() => chooseT(preset.value, true)}
                    className={
                      'rounded-lg border px-3 py-1.5 text-sm transition ' +
                      (active
                        ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white')
                    }
                  >
                    <span aria-hidden="true"><Tex src={preset.tex} /></span>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => animateTo(targetShift, 0)}
                disabled={targetShift <= 0 || sliding}
                className="rounded-xl border border-amber-400/60 bg-amber-400/10 px-4 py-1.5 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sliding ? 'Sliding…' : '▶ Slide the copy'}
              </button>
              <button
                type="button"
                data-preset="near-miss"
                onClick={() => chooseT(NEAR_MISS, true, false)}
                className={
                  'rounded-lg border px-3 py-1.5 text-sm font-semibold transition ' +
                  (nearMissActive
                    ? 'border-red-400/70 bg-red-500/15 text-red-100'
                    : 'border-slate-700 text-slate-300 hover:border-red-400/60 hover:text-red-100')
                }
              >
                T = 6.2 …?
              </button>
            </div>

            <p className="mt-2 text-[11px] text-slate-500">
              The slider snaps to twelfths of π, so π/2, π, 2π and 4π are all exactly reachable.
            </p>

            {/* 近似值的教学时刻 —— 只有点了那个按钮才出现 */}
            {nearMissActive && (
              <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/5 px-4 py-3">
                <p className="text-sm font-bold text-red-200">Look closely.</p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  On screen those two curves look identical. They are not. The reading says the
                  worst disagreement is{' '}
                  <strong className="font-mono text-red-200">
                    {showNumber(report.worstMismatch, 3)}
                  </strong>
                  , and the definition demands <Tex src="f(x + T) = f(x)" /> at{' '}
                  <em>every</em> x — not almost.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  6.2 is close to 2π ≈ 6.283185, and close is not a period.
                </p>
              </div>
            )}
          </div>

          {/* 读数 */}
          <div className="min-w-0">
            <div
              className="rounded-xl border px-4 py-3"
              style={{
                borderColor: report.matches ? `${STATE.pass.color}55` : `${STATE.fail.color}55`,
                backgroundColor: report.matches ? `${STATE.pass.color}0f` : `${STATE.fail.color}0f`,
                transition: 'background-color 260ms ease, border-color 260ms ease',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Overlap test
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    color: report.matches ? STATE.pass.color : STATE.fail.color,
                    backgroundColor: `${report.matches ? STATE.pass.color : STATE.fail.color}1f`,
                    border: `1px solid ${report.matches ? STATE.pass.color : STATE.fail.color}55`,
                  }}
                >
                  <span aria-hidden="true">{report.matches ? '✓' : '×'}</span>
                  {report.matches ? 'match' : 'no match'}
                </span>
              </div>

              <div className="mt-2 text-lg text-slate-100">
                <Tex
                  src={`f(x + ${formatShiftTex(targetShift)}) ${report.matches ? '=' : '\\ne'} f(x)`}
                />
              </div>

              {/*
                ⚠️ 这个读数是整节课的支点。
                「看起来重合」是感觉,「最大偏离 0.08」是事实。
              */}
              <div className="mt-2 font-mono text-sm tabular-nums text-slate-400">
                worst mismatch ={' '}
                <strong style={{ color: report.matches ? STATE.pass.color : STATE.fail.color }}>
                  {report.worstMismatch < 1e-9 ? '0.000000' : showNumber(report.worstMismatch, 6)}
                </strong>
              </div>

              <p className="mt-2 text-sm font-semibold" style={{ color: report.matches ? STATE.pass.color : STATE.fail.color }}>
                {!report.positive
                  ? 'T must be greater than 0.'
                  : report.matches
                    ? 'Perfect match. That shift is a period.'
                    : 'No match. Somewhere the two curves disagree.'}
              </p>
            </div>

            {/* T = 0 的陷阱 */}
            {targetShift === 0 && (
              <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                Shifting by nothing always lands on itself — which is why the definition insists on{' '}
                <Tex src="T > 0" />.
              </p>
            )}

            {/* 是基本周期的第几倍 */}
            {multiple !== null && (
              <p className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-300">
                {multiple === 1 ? (
                  <>This is the smallest shift that works.</>
                ) : (
                  <>
                    This also repeats the function — it is {multiple} whole periods. Periods are not
                    unique; every multiple of one is another.
                  </>
                )}
              </p>
            )}

            {/* 基本周期。等学生试过 3 个 T 之后才出现。 */}
            {enough && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-400/5 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                  Fundamental period
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                  Many shifts work. The <strong className="text-slate-200">smallest positive</strong>{' '}
                  one gets its own name.
                </p>
                <div className="mt-2 text-xl text-amber-100">
                  <Tex src={`T_0 = ${formatShiftTex(fundamental)}`} />
                </div>
                {fnId === 'sin2x' && (
                  <p className="mt-2 text-xs leading-relaxed text-cyan-200">
                    Half of sin(x)’s. The input runs twice as fast, so the wave finishes in half the
                    distance.
                  </p>
                )}
              </div>
            )}

            <p className="mt-3 text-xs text-slate-500">
              Shifts tried on this function: {tried.join(', ')}
            </p>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        “Looks lined up” is a feeling. The mismatch reading is a fact.
      </p>
    </main>
  );
}
