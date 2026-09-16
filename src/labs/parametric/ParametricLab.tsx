/**
 * LAB — 参数方程:**`dy/dt` 不是斜率。**
 *
 * ⭐⭐ 画面上必须同时看得见三样东西,学生才分得开它们:
 *   ① **速度向量** `(dx/dt, dy/dt)` —— 粒子往哪跑、跑多快;
 *   ② **切线** —— 曲线在这一点朝哪个方向;
 *   ③ 两者的关系:切线的斜率是两个分量的**商**,不是其中任何一个。
 *
 * ⚠️ 三个反例都必须**从滑块上点得到**:
 *   · `dx/dt = 0`(椭圆左右两端):斜率不存在,**而速度最大**;
 *   · `dx/dt = dy/dt = 0`(旋轮线的尖点):粒子真的停了;
 *   · `d²y/dx² ≠ (d²y/dt²)/(d²x/dt²)`:并排放着,椭圆上连符号都相反。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/parametric.ts`。
 */
import { useMemo, useState } from 'react';
import {
  CURVES,
  HEADLINE,
  MAIN_IDEA,
  SECOND_TRAP,
  STOPPED_NOTE,
  VERTICAL_NOTE,
  bounds,
  clampT,
  curveOf,
  naiveSecond,
  samplePath,
  secondDeriv,
  show,
  slope,
  slopeBySecant,
  speed,
  stateAt,
} from '../../math/parametric';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 500;
const H = 340;
const PAD = 26;

export function ParametricLab() {
  const [id, setId] = useState(CURVES[0]!.id);
  const c = curveOf(id);
  const [t, setT] = useState(c.startT);

  const st = stateAt(c, t);
  const m = slope(c, t);
  const mSecant = slopeBySecant(c, t);
  const v = speed(c, t);
  const d2 = secondDeriv(c, t);
  const d2naive = naiveSecond(c, t);

  const path = useMemo(() => samplePath(c), [c]);
  const [x0, x1, y0, y1] = useMemo(() => bounds(c), [c]);

  // ⚠️ 等比例映射 —— 参数曲线的形状是内容,拉伸了就不是那条曲线了
  const k = Math.min((W - PAD * 2) / (x1 - x0), (H - PAD * 2) / (y1 - y0));
  const cx0 = (x0 + x1) / 2;
  const cy0 = (y0 + y1) / 2;
  const px = (x: number) => W / 2 + (x - cx0) * k;
  const py = (y: number) => H / 2 - (y - cy0) * k;

  const P: readonly [number, number] = [c.x(t), c.y(t)];
  const vx = c.dx(t);
  const vy = c.dy(t);
  // 速度向量画多长:按全程最大速度归一,免得某条曲线的箭头长到出画面
  const vMax = useMemo(() => {
    let best = 1e-9;
    const [lo, hi] = c.tRange;
    for (let i = 0; i <= 300; i += 1) best = Math.max(best, speed(c, lo + ((hi - lo) * i) / 300));
    return best;
  }, [c]);
  const arrow = 62 / vMax;                       // 像素 per 单位速度

  /** 切线画成一条穿过画面的线段(斜率存在时);竖直时单独画竖线。 */
  const tangent = () => {
    if (st === 'stopped') return null;
    if (m === null) {
      return <line data-tangent data-vertical="yes" x1={px(P[0])} y1={PAD} x2={px(P[0])} y2={H - PAD}
        stroke={LAB.fail} strokeWidth={2} strokeDasharray="5 4" />;
    }
    const reach = (x1 - x0) * 0.42;
    /**
     * ⚠️ 切线画成**暗色的背景线**,不跟速度分量抢颜色。
     *   第一版切线是绿的、纵向分量也是绿的,而速度向量本来就**贴在切线上**
     *   (它必然如此 —— 速度就是沿切线方向的),
     *   于是屏幕上三样东西叠成一团,而这一页的论点恰恰是"它们不是一回事"。
     * ⭐ 真正分得开它们的是那个**直角三角形**:斜率 = 竖直腿 ÷ 水平腿。
     *   所以三角形要抢眼,切线退成背景。
     */
    return (
      <line data-tangent data-vertical="no"
        x1={px(P[0] - reach)} y1={py(P[1] - reach * m)}
        x2={px(P[0] + reach)} y2={py(P[1] + reach * m)}
        stroke={LAB.muted} strokeWidth={1.6} strokeDasharray="7 5" />
    );
  };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus BC · Unit 9 · Parametric
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Parametric Motion
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CURVES.map((k2) => (
            <button
              key={k2.id} type="button" data-curve={k2.id} data-active={k2.id === id ? 'yes' : 'no'}
              onClick={() => { setId(k2.id); setT(k2.startT); }}
              className={
                'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
                (k2.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {k2.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          t = <span data-readout="t" data-t-exact={t} className="text-amber-300">{show(t, 3)}</span>
          <input
            type="range" min={c.tRange[0]} max={c.tRange[1]} step={0.001} value={t}
            onChange={(e) => setT(clampT(c, Number(e.target.value)))}
            className="w-44 accent-amber-400" aria-label="Move the particle along the curve"
          />
        </label>
      </div>

      {/* ⭐ 把那几个值得停下来看的 t 做成按钮 —— 例外要点得到 */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {c.marks.map((mk) => (
          <button
            key={mk.t} type="button" data-mark={mk.t.toFixed(4)}
            onClick={() => setT(clampT(c, mk.t))}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[10px] text-slate-400 transition hover:border-amber-400/60 hover:text-amber-100"
          >
            jump to t = {show(mk.t, 3)} →
          </button>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        {/* ① 图 */}
        <section data-panel="stage" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① The path, the velocity, and the tangent
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img"
            aria-label="A point moving along a parametric curve, with its velocity vector and the tangent line">
            <polyline data-path fill="none" stroke={LAB.curve} strokeWidth={2.2}
              points={path.map((p) => `${px(p.x).toFixed(1)},${py(p.y).toFixed(1)}`).join(' ')} />

            {tangent()}

            {/* ⭐⭐ 直角三角形:水平腿是 dx/dt,竖直腿是 dy/dt,斜率就是竖÷横。
                这是整幅图里**唯一**能把"速度"和"斜率"分开的东西,所以它最抢眼。 */}
            {v > 1e-9 && (
              <g data-components>
                <polygon
                  points={([
                    [px(P[0]), py(P[1])],
                    [px(P[0]) + vx * arrow, py(P[1])],
                    [px(P[0]) + vx * arrow, py(P[1]) - vy * arrow],
                  ] as readonly (readonly [number, number])[])
                    .map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ')}
                  fill={LAB.x1} fillOpacity={0.12} stroke="none"
                />
                {/* 水平腿 = dx/dt */}
                <line data-leg="dx" x1={px(P[0])} y1={py(P[1])}
                  x2={px(P[0]) + vx * arrow} y2={py(P[1])}
                  stroke={LAB.x2} strokeWidth={2.4} />
                {Math.abs(vx * arrow) > 26 && (
                  <text x={px(P[0]) + (vx * arrow) / 2} y={py(P[1]) + (vy > 0 ? 14 : -7)}
                    textAnchor="middle" fill={LAB.x2} fontSize={10}
                    fontFamily="ui-monospace, monospace">dx/dt</text>
                )}
                {/* 竖直腿 = dy/dt */}
                <line data-leg="dy" x1={px(P[0]) + vx * arrow} y1={py(P[1])}
                  x2={px(P[0]) + vx * arrow} y2={py(P[1]) - vy * arrow}
                  stroke={LAB.pass} strokeWidth={2.4} />
                {Math.abs(vy * arrow) > 22 && (
                  <text x={px(P[0]) + vx * arrow + (vx >= 0 ? 6 : -6)}
                    y={py(P[1]) - (vy * arrow) / 2} textAnchor={vx >= 0 ? 'start' : 'end'}
                    fill={LAB.pass} fontSize={10} fontFamily="ui-monospace, monospace">dy/dt</text>
                )}
              </g>
            )}

            {/* ⭐ 速度向量:三角形的斜边,带箭头。
                ⚠️ 它**必然**贴在切线上 —— 速度就是沿切线的。
                两者的区别不在方向,在于速度有**大小**,而斜率只是个比值。 */}
            {v > 1e-9 && (
              <g data-velocity>
                <line x1={px(P[0])} y1={py(P[1])}
                  x2={px(P[0]) + vx * arrow} y2={py(P[1]) - vy * arrow}
                  stroke={LAB.x1} strokeWidth={2.8} />
                <polygon
                  points={(() => {
                    const ex = px(P[0]) + vx * arrow;
                    const ey = py(P[1]) - vy * arrow;
                    const ux = (vx * arrow) / (v * arrow);
                    const uy = (-vy * arrow) / (v * arrow);
                    const a = 9;
                    const b = 4.5;
                    const tri: readonly (readonly [number, number])[] = [
                      [ex, ey],
                      [ex - a * ux - b * uy, ey - a * uy + b * ux],
                      [ex - a * ux + b * uy, ey - a * uy - b * ux],
                    ];
                    return tri.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
                  })()}
                  fill={LAB.x1}
                />
              </g>
            )}

            <circle data-point cx={px(P[0])} cy={py(P[1])} r={5.5} fill={LAB.x2}
              stroke="#0b1220" strokeWidth={1.6} />
            {st === 'stopped' && (
              <text data-stopped x={px(P[0])} y={py(P[1]) - 14} textAnchor="middle"
                fill={LAB.fail} fontSize={10} fontFamily="ui-monospace, monospace">
                stopped
              </text>
            )}
          </svg>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            <p className="text-slate-300"><Tex src={c.xTex} /> · <Tex src={c.yTex} /></p>
            <p style={{ color: LAB.x1 }}>
              speed |v| = <span data-readout="speed">{show(v, 3)}</span>
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          {/* ② 商 */}
          <section data-panel="slope" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② The slope is the quotient, not either rate
            </p>
            <div className="mt-2 space-y-1 font-mono text-[11px]">
              <p style={{ color: LAB.x2 }}>
                dx/dt = <span data-readout="dxdt">{show(vx, 4)}</span>
              </p>
              <p style={{ color: LAB.pass }}>
                dy/dt = <span data-readout="dydt">{show(vy, 4)}</span>
              </p>
              <p className="border-t border-slate-700 pt-1 text-slate-200">
                dy/dx = <span data-readout="slope" data-defined={m === null ? 'no' : 'yes'}>
                  {show(m, 4)}
                </span>
              </p>
              <p className="text-slate-500">
                measured straight off the curve = <span data-readout="secant">{show(mSecant, 4)}</span>
              </p>
            </div>

            {st === 'vertical' && (
              <p data-readout="vertical-note"
                className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-100">
                {VERTICAL_NOTE}
              </p>
            )}
            {st === 'stopped' && (
              <p data-readout="stopped-note"
                className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-100">
                {STOPPED_NOTE}
              </p>
            )}
          </section>

          {/* ③ 二阶导的陷阱 */}
          <section data-panel="second" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ The second derivative, and the way it is usually got wrong
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-2">
                <p className="text-[10px] text-emerald-200">correct</p>
                <p className="mt-1 text-[11px] text-slate-300">
                  <Tex src="\frac{d}{dt}\!\left(\frac{dy}{dx}\right) \div \frac{dx}{dt}" />
                </p>
                <p className="mt-1 font-mono text-sm" style={{ color: LAB.pass }}>
                  <span data-readout="second">{show(d2, 4)}</span>
                </p>
              </div>
              <div className="rounded-lg border border-red-400/50 bg-red-400/10 px-2.5 py-2">
                <p className="text-[10px] text-red-200">what students write</p>
                <p className="mt-1 text-[11px] text-slate-300">
                  <Tex src="\frac{d^2y/dt^2}{d^2x/dt^2}" />
                </p>
                <p className="mt-1 font-mono text-sm" style={{ color: LAB.fail }}>
                  <span data-readout="second-naive">{show(d2naive, 4)}</span>
                </p>
              </div>
            </div>
            {d2 !== null && d2naive !== null && (
              <p data-readout="gap" data-sign={Math.sign(d2) !== Math.sign(d2naive) ? 'opposite' : 'same'}
                className="mt-2 font-mono text-[11px]"
                style={{ color: Math.sign(d2) !== Math.sign(d2naive) ? LAB.fail : LAB.muted }}>
                {Math.sign(d2) !== Math.sign(d2naive)
                  ? '↑ not even the same sign'
                  : `↑ off by ${show(Math.abs(d2 - d2naive), 3)}`}
              </p>
            )}
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{SECOND_TRAP}</p>
          </section>
        </div>
      </div>

      <section data-panel="note" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          About this curve
        </p>
        <p data-readout="note" className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-400">
          {c.note}
        </p>
      </section>
    </main>
  );
}
