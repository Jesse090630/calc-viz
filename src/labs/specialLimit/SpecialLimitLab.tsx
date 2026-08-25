/**
 * LAB — 「Squeeze the Special Limit」(`lim sin x / x = 1` 的几何推导)
 *
 * 链条:**几何 → 不等式 → 夹逼 → 特殊极限**。四块面板依次对应。
 *
 * ⚠️ 代数**一步一步露**,不一次倒出来(提示词点名要求)。
 * 但这不是幻灯片:已经露出来的一直留在页面上,可以随时回头看。
 *
 * ⚠️ 「为什么必须用弧度」不靠叮嘱,靠**把角度制的答案摆出来**:
 * π/180 ≈ 0.01745。看见那个数,比听十遍"记得用弧度"管用。
 */
import { useCallback, useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  DEGREE_TEX, FLIPPED_TEX, RESULT_TEX, STEPS, THETA_RANGE,
  arcOf, bounds, clampTheta, degreeVersionLimit, halveTheta, inequalityHolds,
  ratio, sampleCos, sampleRatio, showGeometry, showTheta, showValue, sinOf, squeezedLimit, tanOf,
} from '../../math/specialLimit';

/** 单位圆的取景:半径 1,右上角够放 tan θ。 */
const C = makeViewport({
  width: 330, height: 330,
  xMin: -0.25, xMax: 1.75, yMin: -0.25, yMax: 1.75,
  padLeft: 14, padRight: 14, padTop: 14, padBottom: 14,
});

function UnitCircle({ theta }: { theta: number }) {
  const o = { x: toSvgX(C, 0), y: toSvgY(C, 0) };
  const p = { x: toSvgX(C, Math.cos(theta)), y: toSvgY(C, Math.sin(theta)) };
  const t = { x: toSvgX(C, 1), y: toSvgY(C, tanOf(theta)) };
  const one = { x: toSvgX(C, 1), y: toSvgY(C, 0) };
  const r = toSvgX(C, 1) - toSvgX(C, 0);

  return (
    <svg viewBox={`0 0 ${C.width} ${C.height}`} className="w-full select-none" role="img"
      aria-label="A unit circle showing the inner triangle, the sector and the outer triangle">
      {/* 外切三角形(最大) */}
      <path d={`M${o.x} ${o.y} L${one.x} ${one.y} L${t.x} ${t.y} Z`} fill={LAB.x2} opacity={0.13} />
      {/* 扇形(中间) */}
      <path d={`M${o.x} ${o.y} L${one.x} ${one.y} A${r} ${r} 0 0 0 ${p.x} ${p.y} Z`} fill={LAB.pass} opacity={0.16} />
      {/* 内接三角形(最小) */}
      <path d={`M${o.x} ${o.y} L${one.x} ${one.y} L${p.x} ${p.y} Z`} fill={LAB.x1} opacity={0.2} />

      <path d={polylinePath(C, Array.from({ length: 60 }, (_, i) => {
        const a = (Math.PI / 2) * (i / 59);
        return { x: Math.cos(a), y: Math.sin(a) };
      }))} fill="none" stroke={LAB.curve} strokeWidth={1.8} />
      <line x1={o.x} y1={o.y} x2={one.x} y2={one.y} stroke={LAB.axis} strokeWidth={1.2} />
      <line x1={o.x} y1={o.y} x2={p.x} y2={p.y} stroke={LAB.curve} strokeWidth={1.6} />
      <line x1={one.x} y1={one.y} x2={t.x} y2={t.y} stroke={LAB.x2} strokeWidth={2.2} />
      <line x1={p.x} y1={p.y} x2={toSvgX(C, Math.cos(theta))} y2={o.y} stroke={LAB.x1} strokeWidth={2.2} />

      <text x={toSvgX(C, Math.cos(theta)) - 6} y={(p.y + o.y) / 2} fill={LAB.x1} fontSize={11} fontWeight={700}
        textAnchor="end" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">sin θ</text>
      <text x={t.x + 6} y={(one.y + t.y) / 2} fill={LAB.x2} fontSize={11} fontWeight={700}
        textAnchor="start" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">tan θ</text>
      <text x={toSvgX(C, Math.cos(theta / 2) * 1.14)} y={toSvgY(C, Math.sin(theta / 2) * 1.14)} fill={LAB.pass} fontSize={11}
        fontWeight={700} textAnchor="middle" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">θ</text>
    </svg>
  );
}

/** 三条曲线:cos x、sin x / x、常数 1。 */
function SqueezeGraph({ theta }: { theta: number }) {
  const span = Math.max(0.25, theta * 2.2);
  const V = makeViewport({
    width: 330, height: 330,
    xMin: -span, xMax: span, yMin: 1 - span * span * 0.62 - 0.02, yMax: 1.035,
    padLeft: 34, padRight: 16, padTop: 18, padBottom: 26,
  });
  const one = toSvgY(V, 1);
  return (
    <svg viewBox={`0 0 ${V.width} ${V.height}`} className="w-full select-none" role="img"
      aria-label="cos x below, sin x over x in the middle, and the constant 1 above">
      <line x1={V.padLeft} y1={one} x2={V.width - V.padRight} y2={one} stroke={LAB.x2} strokeWidth={1.6} />
      <text x={V.width - V.padRight} y={one - 6} fill={LAB.x2} fontSize={11} fontWeight={700} textAnchor="end"
        fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">y = 1</text>
      <path d={polylinePath(V, sampleCos(-span, span))} fill="none" stroke={LAB.x1} strokeWidth={1.8} />
      <path d={polylinePath(V, sampleRatio(-span, span))} fill="none" stroke={LAB.pass} strokeWidth={2.4} />
      <line x1={toSvgX(V, theta)} y1={V.padTop} x2={toSvgX(V, theta)} y2={V.height - V.padBottom}
        stroke={LAB.muted} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.7} />
      <circle cx={toSvgX(V, theta)} cy={toSvgY(V, ratio(theta) ?? 1)} r={4.5} fill={LAB.pass} stroke="#0b1020" strokeWidth={1.6} />
      <text x={V.padLeft + 3} y={V.height - V.padBottom - 4} fill={LAB.x1} fontSize={11} fontWeight={700}
        fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">y = cos x</text>
    </svg>
  );
}

export function SpecialLimitLab() {
  const [theta, setTheta] = useState(1);
  const [revealed, setRevealed] = useState(1);
  const [showDegrees, setShowDegrees] = useState(false);
  const r = useMemo(() => ratio(theta), [theta]);
  const b = useMemo(() => bounds(theta), [theta]);
  const smaller = useCallback(() => setTheta((t) => halveTheta(t)), []);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Interactive derivation</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Why sin x / x → 1</h1>
        <p className="mt-3 text-base text-slate-400">
          Squeeze the special limit. Geometry → inequality → squeeze → the answer.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <p className="font-mono text-xs" style={{ color: LAB.x2 }}>θ in RADIANS &nbsp;·&nbsp; θ = <span data-readout="theta">{showTheta(theta)}</span></p>
          <div className="flex flex-wrap items-center gap-1.5">
            <input type="range" aria-label="theta" min={THETA_RANGE.from} max={THETA_RANGE.to} step={0.001}
              value={theta} onChange={(e) => setTheta(clampTheta(Number(e.target.value)))}
              className="w-40 accent-current" style={{ color: LAB.pass }} />
            <button type="button" data-action="smaller" onClick={smaller}
              className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10">
              Halve θ →
            </button>
            <button type="button" data-action="restart" onClick={() => { setTheta(1); setRevealed(1); }}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr_0.95fr]">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">① The picture</p>
            <UnitCircle theta={theta} />
            <div data-panel="geometry" data-holds={inequalityHolds(theta) ? 'yes' : 'no'}
              className="mt-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 font-mono text-xs">
              <p style={{ color: LAB.x1 }}>sin θ = <span data-readout="sin">{showGeometry(sinOf(theta))}</span></p>
              <p style={{ color: LAB.pass }}>θ &nbsp;&nbsp;&nbsp;&nbsp;= <span data-readout="arc">{showGeometry(arcOf(theta))}</span></p>
              <p style={{ color: LAB.x2 }}>tan θ = <span data-readout="tan">{showGeometry(tanOf(theta))}</span></p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">③ The squeeze</p>
            <SqueezeGraph theta={theta} />
            <div data-panel="squeeze" data-within={r !== null && r >= b.low - 1e-12 && r <= 1 + 1e-12 ? 'yes' : 'no'}
              className="mt-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 font-mono text-xs">
              <p style={{ color: LAB.x1 }}>cos x&nbsp;&nbsp;&nbsp;&nbsp;= <span data-readout="cos">{showValue(b.low)}</span></p>
              <p style={{ color: LAB.pass }}>sin x / x = <span data-readout="ratio">{showValue(r)}</span></p>
              <p style={{ color: LAB.x2 }}>1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1.000000</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {/* ② 代数,一步一步露 */}
            <section data-panel="algebra" data-revealed={String(revealed)}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">② The algebra</p>
              <div className="mt-2.5 space-y-2.5">
                {STEPS.slice(0, revealed).map((s) => (
                  <div key={s.tex}>
                    <p className="text-sm text-slate-100"><Tex src={s.tex} /></p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.note}</p>
                  </div>
                ))}
              </div>
              {revealed < STEPS.length && (
                <button type="button" data-action="next-step" onClick={() => setRevealed((n) => n + 1)}
                  className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
                  Then what? →
                </button>
              )}
            </section>

            <section data-panel="result" data-limit={String(squeezedLimit())}
              className="rounded-2xl border p-4" style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">④ The answer</p>
              <p className="mt-2 text-sm text-slate-200"><Tex src={FLIPPED_TEX} /></p>
              <p className="mt-2 text-base text-slate-100"><Tex src={RESULT_TEX} /></p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                cos x → 1 and 1 → 1, so the thing between them has nowhere else to go.
              </p>
            </section>

            {/* ⚠️ 弧度不靠叮嘱,靠把另一个答案摆出来 */}
            <section data-panel="radians" data-open={showDegrees ? 'yes' : 'no'}
              data-degree-limit={degreeVersionLimit().toFixed(6)}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Why radians?</p>
              {showDegrees ? (
                <>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    On the unit circle the arc length <em>is</em> θ — but only when θ is measured in radians. In
                    degrees the same limit comes out as
                  </p>
                  <p className="mt-2 text-sm text-slate-100"><Tex src={DEGREE_TEX} /></p>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
                    Not 1. The clean answer is a fact about radians, not about sine.
                  </p>
                </>
              ) : (
                <button type="button" data-action="why-radians" onClick={() => setShowDegrees(true)}
                  className="mt-2 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
                  What if we used degrees?
                </button>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
