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
import { LadderTable, SubstitutionPanel } from '../specialLimits/parts';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  DEGREE_TEX, FLIPPED_TEX, RESULT_TEX, STEPS, THETA_RANGE,
  arcOf, bounds, clampTheta, degreeVersionLimit, halveTheta, inequalityHolds,
  ratio, sampleCos, sampleRatio, showGeometry, showTheta, showValue, sinOf, squeezedLimit, tanOf,
} from '../../math/specialLimit';
import { formOf, type FormId } from '../../math/specialForms';

/** 这一课在共用目录里的 id。① ② 两块面板从那里取数,和另外五课同一个源。 */
const FORM: FormId = 'sin-over-x';

/** 单位圆的取景:半径 1,右上角够放 tan θ。 */
const C = makeViewport({
  width: 330, height: 330,
  xMin: -0.25, xMax: 1.85, yMin: -0.32, yMax: 1.78,
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

      {/*
        ⚠️ 三个标签的位置**不能**直接跟着各自的线段走。
        θ 小的时候 sin θ、θ、tan θ 三段全都缩到 (1, 0) 那一点附近,
        三个标签于是叠成一团 —— 而这一课的滑块**本来就是要人把 θ 拖小**。
        (浏览器检查在 θ = 0.02 上抓到 "tan θ" 与 "θ" 重叠;
         原来的检查每次比对前都重新加载页面,θ 回到 1,所以一直没看见。)
        改成:sin θ 钉在轴**下方**、tan θ 钉在轴**上方**,各自离轴至少 0.14;
        θ 挪到角平分线上半径 0.42 处 —— 那里横坐标离 x = 1 足够远。
        标签的作用是**指认**那条线段,不必贴着它。
      */}
      <text x={toSvgX(C, Math.cos(theta)) - 6} y={toSvgY(C, -0.14)} fill={LAB.x1} fontSize={11} fontWeight={700}
        textAnchor="end" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">sin θ</text>
      <text x={t.x + 6} y={toSvgY(C, Math.max(tanOf(theta) / 2, 0.16))} fill={LAB.x2} fontSize={11} fontWeight={700}
        textAnchor="start" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">tan θ</text>
      <text x={toSvgX(C, Math.cos(theta / 2) * 0.42)} y={toSvgY(C, Math.sin(theta / 2) * 0.42 + 0.06)} fill={LAB.pass} fontSize={11}
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
      {/*
        ⚠️ (0, 1) 处画一个**空心**圈。sin x / x 在 0 处没有值 ——
        实心点等于说「这里等于 1」,而这一整节要证的恰恰是「它趋于 1」。
        上一节(Limit vs Function Value)刚立的规矩,这里必须守住。
      */}
      <circle data-hole cx={toSvgX(V, 0)} cy={toSvgY(V, 1)} r={4.5} fill="#0b1020" stroke={LAB.pass} strokeWidth={2} />
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
        {/* ⚠️ 和同一节的另外六课统一。这一课比它们早写,眉标一直是旧的那句。 */}
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Special limits</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Why sin x / x → 1</h1>
        <p className="mt-3 text-base text-slate-400">
          0/0 → a numerical mystery → geometry → an inequality → the squeeze → 1.
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

        {/*
          ⚠️ 这两块是后加的,而且**必须在几何之前**。
          原来这一课直接从单位圆开始 —— 那等于先给答案再讲为什么。
          提示词要的顺序是:代入失败 → 数值上的悬念 → 才轮到几何。
          「Interesting. But numerical evidence is not a proof.」那句话是这两块的落点。
        */}
        <div className="grid gap-4 border-b border-slate-700 p-4 sm:p-5 md:grid-cols-2">
          <SubstitutionPanel id={FORM} />
          <LadderTable id={FORM} />
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr_0.95fr]">
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">③ The picture</p>
            <UnitCircle theta={theta} />
            <div data-panel="geometry" data-holds={inequalityHolds(theta) ? 'yes' : 'no'}
              className="mt-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 font-mono text-xs">
              <p style={{ color: LAB.x1 }}>sin θ = <span data-readout="sin">{showGeometry(sinOf(theta))}</span></p>
              <p style={{ color: LAB.pass }}>θ &nbsp;&nbsp;&nbsp;&nbsp;= <span data-readout="arc">{showGeometry(arcOf(theta))}</span></p>
              <p style={{ color: LAB.x2 }}>tan θ = <span data-readout="tan">{showGeometry(tanOf(theta))}</span></p>
            </div>
          </div>

          {/*
            ⚠️ 代数移到中栏、排在夹逼图**上面**。
            原来它在最右栏,于是三栏从左到右读出来是 ③ ⑤ ④ —— 编号跳着走。
            (截图上一眼看见的:标着 ⑤ 的面板排在标着 ④ 的左边。)
            现在按栏读是 ③ | ④⑤ | ⑥,和推导顺序一致。
          */}
          <div className="flex min-w-0 flex-col gap-3">
            <section data-panel="algebra" data-revealed={String(revealed)} data-total={String(STEPS.length)}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">④ The algebra</p>
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

            <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">⑤ The squeeze</p>
            <SqueezeGraph theta={theta} />
            <div data-panel="squeeze" data-within={r !== null && r >= b.low - 1e-12 && r <= 1 + 1e-12 ? 'yes' : 'no'}
              className="mt-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 font-mono text-xs">
              <p style={{ color: LAB.x1 }}>cos x&nbsp;&nbsp;&nbsp;&nbsp;= <span data-readout="cos">{showValue(b.low)}</span></p>
              <p style={{ color: LAB.pass }}>sin x / x = <span data-readout="ratio">{showValue(r)}</span></p>
              <p style={{ color: LAB.x2 }}>1&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= 1.000000</p>
            </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <section data-panel="result" data-limit={String(squeezedLimit())}
              className="rounded-2xl border p-4" style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">⑥ The answer</p>
              <p className="mt-2 text-sm text-slate-200"><Tex src={FLIPPED_TEX} /></p>
              <p className="mt-2 text-base text-slate-100"><Tex src={RESULT_TEX} /></p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                cos x → 1 and 1 → 1, so the thing between them has nowhere else to go.
              </p>
              {/* ⚠️ 「这条立在什么上面」和另外五课一样,写在结论旁边 ——
                  这一课是**根**:它不由更早的极限推出,而是由几何推出。 */}
              <p data-readout="provenance" className="mt-2 border-t border-slate-700/60 pt-2 text-xs leading-relaxed text-slate-500">
                Not derived from an earlier limit. It rests on {formOf(FORM).groundedIn}.
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
