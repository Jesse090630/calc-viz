/**
 * LAB — 极坐标面积:**扇形不是矩形。**
 *
 * ⭐⭐ 整页的支点是一个不用编的反例:**拿单位圆算一遍。**
 *   `∫ r dθ = 2π` —— 那是**周长**,不是面积(面积是 `π`)。
 *   错的公式算出来的东西连**量纲**都不对。
 *   所以默认就停在圆上,两个数并排摆着,一打开就看得见。
 *
 * ⚠️ 画面上必须能看见那一个**扇形**:它有一条弧、两条半径,
 *   面积是 `½r²dθ`;而"矩形"那种想象对应的 `r dθ` 其实就是**那条弧的长度**。
 *   把弧单独描一遍,学生才明白错的那个量到底是什么。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/polar.ts`。
 */
import { useMemo, useState } from 'react';
import {
  HEADLINE,
  MAIN_IDEA,
  NEGATIVE_NOTE,
  POLAR_CURVES,
  UNITS_NOTE,
  ZERO_NOTE,
  areaByIntegral,
  areaByShoelace,
  clampTheta,
  polarOf,
  reach,
  runningArea,
  samplePolar,
  show,
  toXY,
  wedgeArea,
  wedgePath,
  wrongIntegral,
  wrongWedge,
} from '../../math/polar';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 460;
const H = 400;

export function PolarAreaLab() {
  const [id, setId] = useState(POLAR_CURVES[0]!.id);
  const c = polarOf(id);
  const [theta, setTheta] = useState(c.startTheta);
  const [dTheta, setDTheta] = useState(0.35);

  const R = useMemo(() => reach(c), [c]);
  const k = Math.min(W, H) / 2 / R * 0.92;
  const px = (x: number) => W / 2 + x * k;
  const py = (y: number) => H / 2 - y * k;
  const pts = useMemo(() => samplePolar(c), [c]);

  const rHere = c.r(theta + dTheta / 2);
  const right = wedgeArea(rHere, dTheta);
  const wrong = wrongWedge(rHere, dTheta);

  const total = useMemo(() => areaByIntegral(c), [c]);
  const shoelace = useMemo(() => areaByShoelace(c), [c]);
  const totalWrong = useMemo(() => wrongIntegral(c), [c]);
  const run = useMemo(() => runningArea(c, c.sweep[1], 220), [c]);

  const wedge = wedgePath(c, theta, dTheta, 40);
  const arc = wedge.slice(1, -1);                 // 只有弧的那一段
  const negative = rHere < 0;

  // 累计曲线的画布
  const GW = 460;
  const GH = 132;
  const span = Math.max(total, totalWrong, 1e-6);
  const gx = (th: number) => 28 + ((th - c.sweep[0]) / (c.sweep[1] - c.sweep[0])) * (GW - 42);
  const gy = (a: number) => GH - 16 - (a / span) * (GH - 30);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus BC · Unit 9 · Polar
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Polar Area
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {POLAR_CURVES.map((q) => (
            <button
              key={q.id} type="button" data-curve={q.id} data-active={q.id === id ? 'yes' : 'no'}
              onClick={() => { setId(q.id); setTheta(q.startTheta); }}
              className={
                'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
                (q.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {q.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          θ = <span data-readout="theta" className="text-amber-300">{show(theta, 3)}</span>
          <input
            type="range" min={c.sweep[0]} max={c.sweep[1] - 0.01} step={0.005} value={theta}
            onChange={(e) => setTheta(clampTheta(c, Number(e.target.value)))}
            className="w-32 accent-amber-400" aria-label="Sweep the ray"
          />
        </label>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          dθ = <span data-readout="dtheta" className="text-cyan-300">{show(dTheta, 3)}</span>
          <input
            type="range" min={0.02} max={0.8} step={0.005} value={dTheta}
            onChange={(e) => setDTheta(Number(e.target.value))}
            className="w-28 accent-cyan-400" aria-label="Width of the wedge"
          />
        </label>
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        {/* ① 图 */}
        <section data-panel="stage" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① One wedge, swept through dθ
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img"
            aria-label="A polar curve with one thin wedge highlighted, and the arc along its outer edge traced separately">
            {/* 极坐标网格:几圈同心圆,提醒这是极坐标 */}
            {[0.25, 0.5, 0.75, 1].map((f) => (
              <circle key={f} cx={px(0)} cy={py(0)} r={R * f * k} fill="none"
                stroke={LAB.axis} strokeWidth={0.7} opacity={0.3} />
            ))}
            <line x1={px(-R)} y1={py(0)} x2={px(R)} y2={py(0)} stroke={LAB.axis} strokeWidth={0.9} opacity={0.5} />
            <line x1={px(0)} y1={py(-R)} x2={px(0)} y2={py(R)} stroke={LAB.axis} strokeWidth={0.9} opacity={0.5} />

            {/* 已经扫过的那一块 */}
            <polygon data-swept fill={LAB.pass} fillOpacity={0.1} stroke="none"
              points={[[0, 0] as readonly [number, number],
                ...samplePolar(c, 600).filter((_, i, a) =>
                  i / a.length <= (theta - c.sweep[0]) / (c.sweep[1] - c.sweep[0])),
              ].map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')} />

            {/* 曲线本身 */}
            <polyline data-curve fill="none" stroke={LAB.curve} strokeWidth={2}
              points={pts.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')} />

            {/* ⭐⭐ 那一个扇形 —— 这一课的主角 */}
            <polygon data-wedge fill={LAB.x2} fillOpacity={0.36} stroke={LAB.x2} strokeWidth={1.4}
              points={wedge.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')} />

            {/* ⚠️ 弧单独描一遍 —— 错的那个公式算的正是**它的长度** */}
            <polyline data-arc fill="none" stroke={LAB.fail} strokeWidth={3}
              points={arc.map((p) => `${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join(' ')} />

            {/* 半径那条线 */}
            <line x1={px(0)} y1={py(0)}
              x2={px(toXY(rHere, theta + dTheta / 2)[0])}
              y2={py(toXY(rHere, theta + dTheta / 2)[1])}
              stroke={LAB.x2} strokeWidth={1.6} strokeDasharray="3 3" opacity={0.85} />
            <circle cx={px(0)} cy={py(0)} r={3} fill={LAB.muted} />
          </svg>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            <p className="text-slate-300"><Tex src={c.rTex} /></p>
            <p style={{ color: LAB.x2 }}>
              r at this wedge = <span data-readout="r">{show(rHere, 4)}</span>
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          {/* ② 一个扇形:对 vs 错 */}
          <section data-panel="wedge" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② This one wedge
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-2">
                <p className="text-[10px] text-emerald-200">the wedge's area</p>
                <p className="mt-1 text-slate-200"><Tex src="\tfrac{1}{2}r^2\,d\theta" /></p>
                <p className="mt-1 font-mono text-sm" style={{ color: LAB.pass }}>
                  <span data-readout="wedge-right">{show(right, 5)}</span>
                </p>
              </div>
              <div className="rounded-lg border border-red-400/50 bg-red-400/10 px-2.5 py-2">
                <p className="text-[10px] text-red-200">r · dθ — the arc, in red</p>
                <p className="mt-1 text-slate-200"><Tex src="r\,d\theta" /></p>
                <p className="mt-1 font-mono text-sm" style={{ color: LAB.fail }}>
                  <span data-readout="wedge-wrong">{show(wrong, 5)}</span>
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{UNITS_NOTE}</p>
            {negative && (
              <p data-readout="negative-note"
                className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100">
                {NEGATIVE_NOTE}
              </p>
            )}
          </section>

          {/* ③ 扫完整圈 */}
          <section data-panel="total" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ Sweep all the way round
            </p>
            <svg viewBox={`0 0 ${GW} ${GH}`} className="mt-2 w-full" role="img"
              aria-label="Running totals for both formulas as the ray sweeps">
              <line x1={22} y1={gy(0)} x2={GW - 12} y2={gy(0)} stroke={LAB.axis} strokeWidth={1} />
              <line x1={22} y1={gy(total)} x2={GW - 12} y2={gy(total)}
                stroke={LAB.pass} strokeWidth={1} strokeDasharray="4 3" opacity={0.7} />
              <polyline data-run-right fill="none" stroke={LAB.pass} strokeWidth={2.2}
                points={run.map((p) => `${gx(p.theta).toFixed(1)},${gy(p.right).toFixed(1)}`).join(' ')} />
              <polyline data-run-wrong fill="none" stroke={LAB.fail} strokeWidth={2.2}
                points={run.map((p) => `${gx(p.theta).toFixed(1)},${gy(p.wrong).toFixed(1)}`).join(' ')} />
              <line x1={gx(theta)} y1={10} x2={gx(theta)} y2={GH - 14}
                stroke={LAB.x2} strokeWidth={1} strokeDasharray="2 3" opacity={0.8} />
              {/* ⚠️ 横轴得说清是什么 —— 一条没标注的曲线读者只能猜 */}
              <text x={24} y={GH - 3} fill={LAB.muted} fontSize={9}
                fontFamily="ui-monospace, monospace">θ = 0</text>
              <text x={GW - 12} y={GH - 3} textAnchor="end" fill={LAB.muted} fontSize={9}
                fontFamily="ui-monospace, monospace">θ = 2π</text>
            </svg>
            <div className="mt-1 space-y-1 font-mono text-[11px]">
              <p style={{ color: LAB.pass }}>
                ∫ ½r² dθ = <span data-readout="total-right">{show(total, 4)}</span>
                <span className="ml-2 text-slate-500">
                  exact: <Tex src={c.exactTex} />
                </span>
              </p>
              <p className="text-slate-500">
                shoelace on the Cartesian trace = <span data-readout="shoelace">{show(shoelace, 4)}</span>
              </p>
              <p style={{ color: LAB.fail }}>
                ∫ r dθ = <span data-readout="total-wrong">{show(totalWrong, 4)}</span>
                {id === 'circle' && (
                  <span data-readout="circumference" className="ml-2 text-slate-400">
                    ← that is this circle's circumference
                  </span>
                )}
              </p>
              {/* ⭐⭐⭐ 玫瑰上那条错公式的总和恰好是 0 —— 比圆那个反例更狠,
                  而它是画出来之后才注意到的。 */}
              {Math.abs(totalWrong) < 1e-3 && (
                <p data-readout="zero-note"
                  className="mt-1 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-100">
                  {ZERO_NOTE}
                </p>
              )}
            </div>
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
