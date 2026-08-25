/**
 * LAB — 「Trap the Output」(ε–δ)
 *
 * 玩法一句话:**你给 ε,我找 δ。**
 * 学生拖 δ 直到竖带框住的那段曲线整个落进 ε 带里,然后把 ε 再收紧一档,重来。
 *
 * ⚠️ 形式定义**不在一开始出现**。它由"你在最紧那一档也成功了"解锁 ——
 * 提示词要的就是先有几何直觉再看符号。解锁后它一直在,不是幻灯片的一页。
 *
 * ⚠️ δ = ε/2 这个公式**最后才给**。先让学生自己找到能用的 δ,
 * 再告诉他有个现成的配方 —— 顺序反了,这一节就退化成套公式。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrapGraph } from './TrapGraph';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import {
  A,
  ALGEBRA_TEX,
  DEFINITION_TEX,
  DELTA_RANGE,
  DELTA_TEX,
  EPS_LADDER,
  EPS_RANGE,
  INPUT_TEX,
  L,
  OUTPUT_TEX,
  SLOPE,
  clampDelta,
  clampEpsilon,
  isTightest,
  isTrapped,
  outputReach,
  requiredDelta,
  show,
  showTight,
  tighten,
} from '../../math/epsilonDelta';

export function TrapLab() {
  const [epsilon, setEpsilon] = useState(EPS_LADDER[0]!);
  const [delta, setDelta] = useState(0.9);
  /** 在最紧那一档也成功过 —— 形式定义由此解锁 */
  const [earned, setEarned] = useState(false);
  /** 揭示 δ = ε/2 的配方(学生自己按) */
  const [showFormula, setShowFormula] = useState(false);

  const trapped = isTrapped(epsilon, delta);
  const need = useMemo(() => requiredDelta(epsilon), [epsilon]);

  useEffect(() => {
    if (trapped && isTightest(epsilon)) setEarned(true);
  }, [trapped, epsilon]);

  const onTighten = useCallback(() => setEpsilon((e) => tighten(e)), []);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Interactive definition</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">The Epsilon-Delta Definition</h1>
        <p className="mt-3 text-base text-slate-400">
          Trap the output. You choose how close the answer must be; then find how close the input has to be.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <p className="font-mono text-xs text-slate-400">
            f(x) = {SLOPE}x + 1 &nbsp;·&nbsp; a = {A} &nbsp;·&nbsp; L = {L}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              data-action="tighten"
              onClick={onTighten}
              disabled={isTightest(epsilon)}
              className="rounded-lg border border-amber-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/10 disabled:opacity-35"
            >
              Tighten ε →
            </button>
            <button
              type="button"
              data-action="best-delta"
              onClick={() => setDelta(clampDelta(need))}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              Snap δ to the edge
            </button>
            <button
              type="button"
              data-action="restart"
              onClick={() => { setEpsilon(EPS_LADDER[0]!); setDelta(0.9); }}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <TrapGraph epsilon={epsilon} delta={delta} />

            {/* 两根滑块。ε 是"要求",δ 是"我们的选择" —— 颜色和带子对上。 */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {([
                { id: 'epsilon', label: 'ε — how close the OUTPUT must be', value: epsilon, range: EPS_RANGE, set: (v: number) => setEpsilon(clampEpsilon(v)), color: LAB.x2 },
                { id: 'delta', label: 'δ — how close the INPUT may be', value: delta, range: DELTA_RANGE, set: (v: number) => setDelta(clampDelta(v)), color: LAB.x1 },
              ] as const).map((s) => (
                <label key={s.id} className="rounded-xl border border-slate-700 bg-slate-950/60 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: s.color }}>{s.label}</span>
                  <span data-readout={s.id} className="ml-2 font-mono text-sm" style={{ color: s.color }}>{show(s.value)}</span>
                  <input
                    type="range"
                    aria-label={s.id}
                    min={s.range.from}
                    max={s.range.to}
                    step={0.005}
                    value={s.value}
                    onChange={(e) => s.set(Number(e.target.value))}
                    className="mt-2 w-full accent-current"
                    style={{ color: s.color }}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {/* 判定 */}
            <section
              data-panel="verdict"
              data-trapped={trapped ? 'yes' : 'no'}
              data-epsilon={show(epsilon, 3)}
              data-delta={show(delta, 3)}
              className="rounded-2xl border p-4 transition"
              style={{ borderColor: trapped ? `${LAB.pass}66` : `${LAB.fail}55`, background: trapped ? `${LAB.pass}12` : `${LAB.fail}0d` }}
            >
              <p className="text-2xl font-bold leading-none" style={{ color: trapped ? LAB.pass : LAB.fail }}>
                {trapped ? 'TRAPPED ✓' : 'IT ESCAPES ×'}
              </p>
              <p className="mt-2 font-mono text-xs text-slate-400">
                inputs within {show(delta)} → outputs within {show(outputReach(delta))}
              </p>
              <p className="mt-1 font-mono text-xs" style={{ color: trapped ? LAB.pass : LAB.fail }}>
                {trapped ? `${show(outputReach(delta))} ≤ ${show(epsilon)}` : `${show(outputReach(delta))} > ${show(epsilon)}`}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                {trapped
                  ? 'Every input in the cyan band lands inside the amber band.'
                  : 'Some inputs in the cyan band land outside the amber band. Narrow δ.'}
              </p>
            </section>

            {/* 两个区域说的是什么 */}
            <section data-panel="zones" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The two zones</p>
              <p className="mt-2.5 text-sm" style={{ color: LAB.x1 }}>
                <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em]">input</span>
                <Tex src={INPUT_TEX} />
              </p>
              <p className="mt-2 text-sm" style={{ color: LAB.x2 }}>
                <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.12em]">output</span>
                <Tex src={OUTPUT_TEX} />
              </p>
            </section>

            {/* 代数 —— 为什么 δ = ε/2 一定管用 */}
            <section data-panel="algebra" data-revealed={showFormula ? 'yes' : 'no'} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Why a δ always exists</p>
              <div className="mt-2.5 space-y-1 text-sm text-slate-200">
                {ALGEBRA_TEX.map((line) => (
                  <p key={line}><Tex src={line} /></p>
                ))}
              </div>
              {showFormula ? (
                <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: `${LAB.pass}66` }}>
                  <p className="text-base text-slate-100"><Tex src={DELTA_TEX} /></p>
                  <p className="mt-1.5 font-mono text-xs" style={{ color: LAB.pass }}>
                    ε = {showTight(epsilon)} → δ = {showTight(need)}
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  data-action="reveal-formula"
                  onClick={() => setShowFormula(true)}
                  className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                >
                  So how small must δ be?
                </button>
              )}
            </section>

            {/* 形式定义 —— 玩通了才出现 */}
            <section data-panel="definition" data-earned={earned ? 'yes' : 'no'} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The definition</p>
              {earned ? (
                <>
                  <p className="mt-2.5 text-slate-100"><Tex src={DEFINITION_TEX} /></p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    <span style={{ color: LAB.x2 }}>ε</span> is the amber band, <span style={{ color: LAB.x1 }}>δ</span> is the
                    cyan band, a is the target input, L is the target output. Nothing in that line is new to you now.
                  </p>
                </>
              ) : (
                <p className="mt-2.5 text-sm leading-relaxed text-slate-500">
                  Trap it at ε = {showTight(EPS_LADDER[EPS_LADDER.length - 1]!)} and the symbols show up here — by then you
                  will have already done what they say.
                </p>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
