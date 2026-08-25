/**
 * LAB — 「Let h Shrink」(割线 → 切线:导数为什么是一个极限)
 *
 * ⚠️ h **永远到不了 0**,而且界面上要说清为什么:
 * 两点重合时割线根本不存在(过一点的直线有无穷多条)。
 * 学生能把 h 拖到很小,但那条"到不了"的边界不是限制,是这一节的内容。
 *
 * ⚠️ SECANT → TANGENT 的标签切换由 `isTangentish(h)` 决定,不写死 ——
 * 阶梯最小档必须落在阈值以内,有测试钉着,否则那次切换永远看不到。
 */
import { useCallback, useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  A_RANGE, H_LADDER, H_RANGE, VIEW,
  algebraSteps, clampA, clampH, derivativeTex, f, isTangentish, limitTex,
  sampleCurve, secantLine, shrinkH, showNum, showShort, slopeByDifference,
  slopeGap, tangentLine, tangentSlope,
} from '../../math/letHShrink';

const V = makeViewport({
  width: 660, height: 430,
  xMin: VIEW.from, xMax: VIEW.to, yMin: -1.6, yMax: 9.6,
  padLeft: 40, padRight: 24, padTop: 22, padBottom: 36,
});

export function ShrinkLab() {
  const [a, setA] = useState(1);
  const [h, setH] = useState(H_LADDER[0]!);
  const slope = useMemo(() => slopeByDifference(a, h), [a, h]);
  const secant = useMemo(() => secantLine(a, h), [a, h]);
  const tangent = useMemo(() => tangentLine(a), [a]);
  const tangentish = isTangentish(h);
  const steps = useMemo(() => algebraSteps(a), [a]);
  const smaller = useCallback(() => setH((v) => shrinkH(v)), []);

  const P = { x: toSvgX(V, a), y: toSvgY(V, f(a)) };
  const Q = { x: toSvgX(V, a + h), y: toSvgY(V, f(a + h)) };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Interactive definition</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">From Secant to Tangent</h1>
        <p className="mt-3 text-base text-slate-400">
          Let h shrink. Watch a slope that only exists in the limit.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <p className="font-mono text-xs text-slate-400">f(x) = x² &nbsp;·&nbsp; a = <span data-readout="a">{showShort(a)}</span></p>
          <div className="flex flex-wrap items-center gap-1.5">
            <input type="range" aria-label="a" min={A_RANGE.from} max={A_RANGE.to} step={0.05}
              value={a} onChange={(e) => setA(clampA(Number(e.target.value)))} className="w-28 accent-current" style={{ color: LAB.x1 }} />
            <input type="range" aria-label="h" min={H_RANGE.from} max={H_RANGE.to} step={0.01}
              value={h} onChange={(e) => setH(clampH(Number(e.target.value)))} className="w-36 accent-current" style={{ color: LAB.x2 }} />
            <button type="button" data-action="shrink" onClick={smaller}
              className="rounded-lg border border-amber-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/10">
              Shrink h →
            </button>
            <button type="button" data-action="restart" onClick={() => { setA(1); setH(H_LADDER[0]!); }}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <svg viewBox={`0 0 ${V.width} ${V.height}`} className="w-full select-none" role="img"
              aria-label="A parabola with a fixed point P and a moving point Q, and the line through them">
              <g aria-hidden="true">
                <line x1={V.padLeft} y1={toSvgY(V, 0)} x2={V.width - V.padRight} y2={toSvgY(V, 0)} stroke={LAB.axis} strokeWidth={1.1} />
                {ticks(-2, 3, 1).map((t) => (
                  <text key={t} x={toSvgX(V, t)} y={toSvgY(V, 0) + 15} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">{t}</text>
                ))}
              </g>

              <path d={polylinePath(V, sampleCurve())} fill="none" stroke={LAB.curve} strokeWidth={2.3} strokeLinecap="round" />

              {/* 极限那条切线 —— 一直画着,好让学生看见割线在往哪儿转 */}
              <line x1={toSvgX(V, V.xMin)} y1={toSvgY(V, tangent.at(V.xMin))} x2={toSvgX(V, V.xMax)} y2={toSvgY(V, tangent.at(V.xMax))}
                stroke={LAB.pass} strokeWidth={1.4} strokeDasharray="6 5" opacity={0.55} />

              {secant && (
                <line x1={toSvgX(V, V.xMin)} y1={toSvgY(V, secant.at(V.xMin))} x2={toSvgX(V, V.xMax)} y2={toSvgY(V, secant.at(V.xMax))}
                  stroke={tangentish ? LAB.pass : LAB.x2} strokeWidth={2.4} style={{ transition: 'stroke 300ms ease' }} />
              )}

              {/* Δx 与 Δy 两条直角边 */}
              <line x1={P.x} y1={P.y} x2={Q.x} y2={P.y} stroke={LAB.x1} strokeWidth={1.8} opacity={0.9} />
              <line x1={Q.x} y1={P.y} x2={Q.x} y2={Q.y} stroke={LAB.x2} strokeWidth={1.8} opacity={0.9} />

              <circle cx={P.x} cy={P.y} r={6} fill={LAB.x1} stroke="#0b1020" strokeWidth={1.8} />
              <circle cx={Q.x} cy={Q.y} r={5.5} fill={LAB.x2} stroke="#0b1020" strokeWidth={1.8} />
              <text x={P.x - 10} y={P.y + 16} fill={LAB.x1} fontSize={12} fontWeight={700} textAnchor="end"
                fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">P</text>
              <text x={Q.x + 10} y={Q.y - 10} fill={LAB.x2} fontSize={12} fontWeight={700} textAnchor="start"
                fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">Q</text>

              {/* ⚠️ 标签在 h 足够小时从 SECANT 淡入 TANGENT */}
              <text x={V.width - V.padRight} y={V.padTop + 12} fill={tangentish ? LAB.pass : LAB.x2} fontSize={12} fontWeight={700}
                textAnchor="end" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke"
                style={{ transition: 'fill 300ms ease' }}>
                {tangentish ? 'TANGENT LINE' : 'SECANT LINE'}
              </text>
            </svg>
            <p className="mt-1 text-xs text-slate-500">
              Q slides toward P as h shrinks. The dashed green line is where the secant is heading.
            </p>

            <section data-panel="algebra" className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The same slope, three ways to write it</p>
              <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                {steps.map((s) => (
                  <div key={s.tex} className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <p className="text-sm text-slate-100"><Tex src={s.tex} /></p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{s.note}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <section data-panel="slope" data-h={h.toFixed(2)} data-slope={slope === null ? 'undefined' : slope.toFixed(4)}
              data-tangentish={tangentish ? 'yes' : 'no'}
              className="rounded-2xl border p-4" style={{ borderColor: tangentish ? `${LAB.pass}59` : `${LAB.x2}55`, background: tangentish ? `${LAB.pass}0f` : `${LAB.x2}0d` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Slope of the line through P and Q</p>
              <div className="mt-3 space-y-1.5 font-mono text-sm">
                <p className="flex justify-between gap-3"><span style={{ color: LAB.x2 }}>h</span><span data-readout="h" style={{ color: LAB.x2 }}>{showNum(h, 2)}</span></p>
                <p className="flex justify-between gap-3"><span className="text-slate-400">slope</span><span data-readout="slope" className="text-slate-100">{showNum(slope, 4)}</span></p>
                <p className="flex justify-between gap-3"><span className="text-slate-400">still to go</span><span data-readout="gap" style={{ color: LAB.pass }}>{showNum(slopeGap(a, h), 4)}</span></p>
              </div>
              <p className="mt-3 text-2xl font-bold leading-none" style={{ color: tangentish ? LAB.pass : LAB.x2 }}>
                {tangentish ? 'TANGENT' : 'SECANT'}
              </p>
            </section>

            <section data-panel="limit" data-derivative={String(tangentSlope(a))}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Let h go to zero</p>
              <p className="mt-2 text-sm text-slate-100"><Tex src={limitTex(a)} /></p>
              <p className="mt-2 text-base" style={{ color: LAB.pass }}><Tex src={derivativeTex(a)} /></p>
              <div className="mt-3 space-y-1 text-xs leading-relaxed text-slate-400">
                <p>The second point approaches the first.</p>
                <p>The secant slope approaches one value.</p>
                <p className="text-slate-200">That limiting slope is the derivative.</p>
              </div>
            </section>

            {/* ⚠️ 为什么到不了 0 —— 这不是界面限制,是这一节的内容 */}
            <section data-panel="why" data-defined-at-zero="no" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Why h never reaches 0</p>
              <p className="mt-2 font-mono text-xs" style={{ color: LAB.fail }}>
                h = 0 → slope = {showNum(slopeByDifference(a, 0), 4)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                At h = 0 the two points are the same point, and infinitely many lines pass through one point — the
                secant does not exist. The quotient is 0/0. That is precisely why the derivative has to be defined as
                a <span className="text-slate-200">limit</span> rather than a value.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
