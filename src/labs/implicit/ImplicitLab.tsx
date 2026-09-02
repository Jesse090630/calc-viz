/**
 * LAB — 隐函数求导:「那个 dy/dx 就是链式法则」。
 *
 * 学生卡住的是那个凭空冒出来的 `dy/dx`:
 * 为什么 `x²` 求导得 `2x`,而 `y²` 求导得 `2y·(dy/dx)`?
 * 这一课把逐项求导摆出来,并指着那一项说:**因为只有它是复合的**。
 *
 * ⚠️ 圆的最左最右两点必须留着:那里 `F_y = 0`,`dy/dx` **不存在** ——
 * 不是"很大",是没有定义。屏幕上要画成竖线,读数要写 `undefined`,
 * 不能显示成 `1e16`。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/implicit.ts`。
 */
import { useMemo, useState } from 'react';
import {
  CURVES,
  GENERAL_TEX,
  HEADLINE,
  MAIN_IDEA,
  VERTICAL_NOTE,
  chainSteps,
  clampX,
  curveOf,
  isOnCurve,
  pointOn,
  sampleBranch,
  show,
  slopeImplicit,
  slopeOnBranch,
  tangentAt,
  verticalTangentPoints,
  type BranchId,
} from '../../math/implicit';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 400;
const H = 340;
const PAD = 26;

function CurveView({
  curveId,
  x,
  branch,
}: {
  curveId: string;
  x: number;
  branch: BranchId;
}) {
  const c = curveOf(curveId);
  const [x0, x1] = c.xRange;
  const [y0, y1] = c.yRange;
  // ⚠️ 等比例:圆必须画成圆。以较紧的那个方向定尺度。
  const scale = Math.min((W - PAD * 2) / (x1 - x0), (H - PAD * 2) / (y1 - y0));
  const px = (v: number) => W / 2 + v * scale;
  const py = (v: number) => H / 2 - v * scale;

  const point = pointOn(c, x, branch);
  const tangent = point ? tangentAt(c, point.x, point.y) : null;
  const verticals = verticalTangentPoints(c);

  const line = (pts: readonly { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="The implicit curve with a draggable point and its tangent line">
      {/* 坐标轴 */}
      <line x1={px(x0) - 6} y1={py(0)} x2={px(x1) + 6} y2={py(0)} stroke={LAB.axis} strokeWidth={1} />
      <line x1={px(0)} y1={py(y0) + 6} x2={px(0)} y2={py(y1) - 6} stroke={LAB.axis} strokeWidth={1} />

      {/* 两个分支 */}
      <path d={line(sampleBranch(c, 'upper'))} fill="none" stroke={LAB.curve} strokeWidth={2} strokeLinecap="round" />
      <path d={line(sampleBranch(c, 'lower'))} fill="none" stroke={LAB.curve} strokeWidth={2} strokeLinecap="round" />

      {/* 竖直切线的那两点 —— 标出来,它们是这一课的例外 */}
      {verticals.map((v, i) => (
        <g key={i}>
          <line data-vertical={i} x1={px(v.x)} y1={py(y0) + 4} x2={px(v.x)} y2={py(y1) - 4}
            stroke={LAB.fail} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          <circle cx={px(v.x)} cy={py(v.y)} r={3} fill={LAB.fail} opacity={0.8} />
        </g>
      ))}

      {/* 切线 */}
      {point && tangent && (
        tangent.vertical ? (
          <line data-tangent="vertical" x1={px(point.x)} y1={py(y0) - 4} x2={px(point.x)} y2={py(y1) + 4}
            stroke={LAB.fail} strokeWidth={2.4} />
        ) : (
          <line data-tangent="sloped"
            x1={px(x0 - 1)} y1={py(tangent.at(x0 - 1)!)}
            x2={px(x1 + 1)} y2={py(tangent.at(x1 + 1)!)}
            stroke={LAB.pass} strokeWidth={2} />
        )
      )}

      {/* 当前点 */}
      {point && <circle data-point cx={px(point.x)} cy={py(point.y)} r={5} fill={LAB.x2} />}
    </svg>
  );
}

export function ImplicitLab() {
  const [curveId, setCurveId] = useState(CURVES[0]!.id);
  const c = curveOf(curveId);
  const [x, setX] = useState(c.startX);
  const [branch, setBranch] = useState<BranchId>(c.startBranch);

  const point = useMemo(() => pointOn(c, x, branch), [c, x, branch]);
  const implicitSlope = point ? slopeImplicit(c, point.x, point.y) : null;
  const numericSlope = slopeOnBranch(c, x, branch);
  const steps = chainSteps(c);
  const vertical = point !== null && implicitSlope === null;
  const agree =
    implicitSlope !== null && numericSlope !== null &&
    Math.abs(implicitSlope - numericSlope) < 1e-3;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Derivatives
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Implicit Differentiation
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CURVES.map((k) => (
            <button
              key={k.id} type="button" data-curve={k.id}
              data-active={k.id === curveId ? 'yes' : 'no'}
              onClick={() => { setCurveId(k.id); setX(k.startX); setBranch(k.startBranch); }}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (k.id === curveId
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              <Tex src={k.relationTex} />
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['upper', 'lower'] as const).map((b) => (
            <button
              key={b} type="button" data-branch={b}
              data-active={b === branch ? 'yes' : 'no'}
              onClick={() => setBranch(b)}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (b === branch
                  ? 'border-cyan-400/60 bg-cyan-400/10 text-cyan-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500')
              }
            >
              {b}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          x = <span data-readout="x" className="text-amber-300">{show(x, 3)}</span>
          <input type="range" min={c.xRange[0]} max={c.xRange[1]} step={0.01} value={x}
            onChange={(e) => setX(clampX(c, Number(e.target.value)))}
            className="w-44 accent-amber-400" aria-label="Move the point along the curve" />
        </label>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section data-panel="curve" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① The curve and its tangent
          </p>
          <div className="mt-2"><CurveView curveId={curveId} x={x} branch={branch} /></div>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            point ={' '}
            <span data-readout="point">
              {point ? `(${show(point.x, 3)}, ${show(point.y, 3)})` : 'off the curve'}
            </span>
            {point && (
              <span data-readout="on-curve" className="ml-2" style={{ color: LAB.pass }}>
                {isOnCurve(c, point.x, point.y) ? '✓ on the curve' : '× not on the curve'}
              </span>
            )}
          </p>
        </section>

        <div className="grid gap-4">
          {/* ② 逐项求导:dy/dx 从哪来 */}
          <section data-panel="terms" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② Differentiate each term with respect to x
            </p>
            <div className="mt-2 space-y-2">
              {steps.map((s, i) => (
                <div key={i} data-term={i} data-carries={s.carriesDydx ? 'yes' : 'no'}
                  className={
                    'rounded-lg border px-2.5 py-2 ' +
                    (s.carriesDydx ? 'border-amber-400/50 bg-amber-400/10' : 'border-slate-800')
                  }
                >
                  <p className="text-sm text-slate-200">
                    <Tex src={s.termTex} />
                    <span className="mx-2 text-slate-500">→</span>
                    <Tex src={s.afterTex} />
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed"
                    style={{ color: s.carriesDydx ? '#fcd34d' : '#64748b' }}>
                    {s.why}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Only the y-term picks up a <Tex src="\frac{dy}{dx}" />, and it picks one up for exactly the
              reason the chain rule says it should.
            </p>
          </section>

          {/* ③ 解出来 + 两条路径对照 */}
          <section
            data-panel="slope" className="rounded-2xl border p-4"
            style={{
              borderColor: vertical ? `${LAB.fail}59` : `${LAB.pass}59`,
              background: vertical ? `${LAB.fail}0f` : `${LAB.pass}0f`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ Solve for dy/dx
            </p>
            <p className="mt-2 text-base text-slate-100"><Tex src={c.slopeTex} /></p>
            <p className="mt-1 text-xs text-slate-400">in general: <Tex src={GENERAL_TEX} /></p>

            <div className="mt-3 space-y-1 font-mono text-xs">
              <p style={{ color: LAB.pass }}>
                implicit&nbsp;&nbsp;= <span data-readout="implicit">{show(implicitSlope)}</span>
              </p>
              <p style={{ color: LAB.x1 }}>
                numeric&nbsp;&nbsp;&nbsp;= <span data-readout="numeric">{show(numericSlope)}</span>
              </p>
              <p data-readout="agree" data-ok={agree ? 'yes' : 'no'} className="border-t border-slate-700 pt-1 text-slate-400">
                {agree
                  ? '✓ the two agree'
                  : vertical
                    ? '— no slope to compare here'
                    : '· not comparable at this point'}
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {/* ⚠️ 这句话必须跟着状态走。原来是无条件显示的,于是在竖直切线那一档
                  它说"两者一致",而正上方的读数写着"没有斜率可比" —— 同一屏两块打架。 */}
              {agree
                ? 'The numeric column differentiates the explicit branch and never touches the implicit relation. They agree, so implicit differentiation is checked here, not assumed.'
                : 'Neither column has a number to report at this point, so there is nothing to cross-check here — move x off the edge and the two will line up again.'}
            </p>

            {vertical && (
              <p data-readout="vertical-note" className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-100">
                {VERTICAL_NOTE}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
