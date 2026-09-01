/**
 * LAB — 微积分基本定理:「那条细缝就是一个矩形」。
 *
 * 上下两张图共用同一个横轴:
 *   上:f 本身,从 a 到 x 的区域被填上,右端多出一条**细缝**(宽 h);
 *   下:面积函数 A(x),随着 x 滑动被一路描出来。
 * 细缝的面积 ≈ f(x)·h,所以 A 的增长速度就是 f(x) —— 这就是定理的全部内容。
 *
 * ⚠️ 阶梯那一档必须留着:f 跳的地方,A 长出一个**折角** ——
 * 仍然连续(面积不会瞬移),但没有单一斜率。
 * "f 要连续"这个前提不该只是一行没人读的小字。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/ftc.ts`。
 */
import { useMemo, useState } from 'react';
import {
  CORNER_NOTE,
  HEADLINE,
  H_LADDER,
  INTEGRANDS,
  MAIN_IDEA,
  PART1_TEX,
  PART2_TEX,
  SLIVER_TEX,
  areaByAntiderivative,
  areaByQuadrature,
  clampX,
  definiteWithShiftedAntiderivative,
  derivativeExistsAt,
  integrandOf,
  oneSidedRates,
  rateLadder,
  sampleArea,
  sampleF,
  show,
  sliver,
} from '../../math/ftc';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 560;
const H = 168;
const PAD = { l: 30, r: 14, t: 10, b: 20 };

function useScale(lo: number, hi: number, top: number, bottom: number) {
  return {
    px: (t: number) => PAD.l + ((t - lo) / (hi - lo || 1)) * (W - PAD.l - PAD.r),
    py: (y: number) => H - PAD.b - ((y - bottom) / (top - bottom || 1)) * (H - PAD.t - PAD.b),
  };
}

/** 上图:f 与被填满的区域,外加右端那条细缝。 */
function CurveView({ id, x, h }: { id: string; x: number; h: number }) {
  const f = integrandOf(id);
  const pts = sampleF(f);
  const hi = Math.max(...pts.map((p) => p.y ?? 0), 0.1) * 1.15;
  const { px, py } = useScale(f.a, f.b, hi, 0);

  // 已累积的区域:从 a 到 x 的填充多边形。⚠️ 跳跃处断笔,所以逐段构造。
  const filled = pts.filter((p) => p.t <= x && p.y !== null);
  const area = filled.length > 1
    ? `M${px(filled[0]!.t)} ${py(0)} ` +
      filled.map((p) => `L${px(p.t).toFixed(1)} ${py(p.y!).toFixed(1)}`).join(' ') +
      ` L${px(filled[filled.length - 1]!.t)} ${py(0)} Z`
    : '';

  // 细缝
  const sliverPts = pts.filter((p) => p.t >= x && p.t <= x + h && p.y !== null);
  const sliverPath = sliverPts.length > 1
    ? `M${px(sliverPts[0]!.t)} ${py(0)} ` +
      sliverPts.map((p) => `L${px(p.t).toFixed(1)} ${py(p.y!).toFixed(1)}`).join(' ') +
      ` L${px(sliverPts[sliverPts.length - 1]!.t)} ${py(0)} Z`
    : '';

  // 断笔折线
  let d = ''; let down = false;
  for (const p of pts) {
    if (p.y === null) { down = false; continue; }
    d += `${down ? 'L' : 'M'}${px(p.t).toFixed(1)} ${py(p.y).toFixed(1)} `;
    down = true;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="The curve with the accumulated region shaded and a thin sliver at the right edge">
      {area && <path d={area} fill={LAB.interval} fillOpacity={0.35} />}
      {/* 细缝:整节课的主角,用主角色 */}
      {sliverPath && <path data-sliver d={sliverPath} fill={LAB.x2} fillOpacity={0.85} />}
      {/* 把细缝当矩形的那个估计,用虚线框出来 —— 两者的差就是这一课要看的 */}
      <rect data-rect x={px(x)} y={py(f.at(x))} width={Math.max(px(x + h) - px(x), 0.5)}
        height={Math.max(py(0) - py(f.at(x)), 0)} fill="none" stroke={LAB.pass}
        strokeWidth={1.4} strokeDasharray="3 2" />
      <path d={d.trim()} fill="none" stroke={LAB.curve} strokeWidth={2} strokeLinecap="round" />
      <line x1={PAD.l} y1={py(0)} x2={W - PAD.r} y2={py(0)} stroke={LAB.axis} strokeWidth={1.2} />
      <line data-cursor x1={px(x)} y1={PAD.t} x2={px(x)} y2={py(0)} stroke={LAB.x2} strokeWidth={1} opacity={0.6} />
      <text x={4} y={py(0) + 4} fill="#64748b" fontSize={10} fontFamily="ui-monospace, monospace">0</text>
    </svg>
  );
}

/** 下图:面积函数 A 被描出来。 */
function AreaView({ id, x }: { id: string; x: number }) {
  const f = integrandOf(id);
  const pts = sampleArea(f);
  const hi = Math.max(...pts.map((p) => p.y)) * 1.12 || 1;
  const { px, py } = useScale(f.a, f.b, hi, 0);
  const drawn = pts.filter((p) => p.t <= x);
  const line = (list: readonly { t: number; y: number }[]) =>
    list.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.t).toFixed(1)} ${py(p.y).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="The area function being traced out as x moves">
      <path d={line(pts)} fill="none" stroke={LAB.muted} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      <path data-area-curve d={line(drawn)} fill="none" stroke={LAB.pass} strokeWidth={2.4} strokeLinecap="round" />
      <line x1={PAD.l} y1={py(0)} x2={W - PAD.r} y2={py(0)} stroke={LAB.axis} strokeWidth={1.2} />
      <circle cx={px(x)} cy={py(areaByAntiderivative(f, x))} r={4.5} fill={LAB.pass} />
      <line x1={px(x)} y1={PAD.t} x2={px(x)} y2={py(0)} stroke={LAB.x2} strokeWidth={1} opacity={0.6} />
      <text x={4} y={py(0) + 4} fill="#64748b" fontSize={10} fontFamily="ui-monospace, monospace">0</text>
    </svg>
  );
}

export function FtcLab() {
  const [id, setId] = useState(INTEGRANDS[0]!.id);
  const f = integrandOf(id);
  const [x, setX] = useState(1.4);
  const [hIndex, setHIndex] = useState(2);
  const h = H_LADDER[hIndex]!;

  const s = useMemo(() => sliver(f, x, h), [f, x, h]);
  /**
   * ⚠️ 在跳跃点上,前向细缝只探得到**右半边** —— 它的 gap 会恒为 0,
   * 屏幕上看起来"完美收敛",却和"A 在这里不可导"直接打架。
   * 所以跳跃点上必须把反方向也算出来并显示,否则数字会替我们撒谎。
   */
  const back = useMemo(() => sliver(f, x, -h), [f, x, h]);
  const rungs = useMemo(() => rateLadder(f, x), [f, x]);
  const differentiable = derivativeExistsAt(f, x);
  const sides = oneSidedRates(f, x);
  const quad = areaByQuadrature(f, x);
  const shifted = definiteWithShiftedAntiderivative(f, f.a, x, 17.5);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · The main theorem
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          The Fundamental Theorem
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {INTEGRANDS.map((g) => (
            <button
              key={g.id} type="button" data-integrand={g.id}
              data-active={g.id === id ? 'yes' : 'no'}
              onClick={() => { setId(g.id); setX(clampX(g, 1.4)); }}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (g.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {g.id === 'step' ? 'a step' : <Tex src={g.tex} />}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          x = <span data-readout="x" className="text-amber-300">{show(x, 3)}</span>
          <input type="range" min={f.a} max={f.b} step={0.01} value={x}
            onChange={(e) => setX(clampX(f, Number(e.target.value)))}
            className="w-44 accent-amber-400" aria-label="Move x" />
        </label>
        <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          h = <span data-readout="h" className="text-cyan-300">{show(h, 3)}</span>
          <input type="range" min={0} max={H_LADDER.length - 1} step={1} value={hIndex}
            onChange={(e) => setHIndex(Number(e.target.value))}
            className="w-28 accent-cyan-400" aria-label="Shrink the sliver" />
        </label>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.15fr_1fr]">
        <section data-panel="curve" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① The region, and one sliver
          </p>
          <div className="mt-2"><CurveView id={id} x={x} h={h} /></div>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            The amber strip is the extra area from widening by h. The dashed box is{' '}
            <Tex src="f(x)\cdot h" /> — a plain rectangle.
          </p>
        </section>

        <section data-panel="numbers" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ② The sliver, measured
          </p>
          {!differentiable && (
            <p data-readout="one-sided-warning" className="mt-1 text-[11px] leading-relaxed" style={{ color: LAB.x2 }}>
              ⚠ These forward numbers only look to the <em>right</em> of x. At a jump that is only half
              the story — the leftward rate is different, so there is no single slope.
            </p>
          )}
          {s && (
            <div className="mt-2 space-y-1 font-mono text-xs">
              <p style={{ color: LAB.x2 }}>sliver area = <span data-readout="exact">{show(s.exact)}</span></p>
              <p style={{ color: LAB.pass }}>f(x)·h&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span data-readout="rect">{show(s.rectangle)}</span></p>
              <p className="border-t border-slate-700 pt-1 text-slate-300">
                rate = area/h = <span data-readout="rate">{show(s.rate)}</span>
              </p>
              <p className="text-slate-300">f(x)&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span data-readout="height">{show(s.height)}</span></p>
              <p style={{ color: LAB.muted }}>gap&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span data-readout="gap">{show(s.gap)}</span></p>
              {!differentiable && back && (
                <p data-readout="back-rate" style={{ color: LAB.fail }} className="border-t border-slate-700 pt-1">
                  ← rate from the left = {show(back.rate)}
                </p>
              )}
            </div>
          )}
          <p className="mt-2 text-sm text-slate-200"><Tex src={SLIVER_TEX} /></p>
          <table className="mt-3 w-full font-mono text-[11px]">
            <thead className="text-slate-500"><tr><th className="text-left font-normal">h</th><th className="text-right font-normal">rate</th></tr></thead>
            <tbody>
              {rungs.map((r) => (
                <tr key={r.h} data-rung={String(r.h)} className={r.h === h ? 'text-amber-200' : 'text-slate-400'}>
                  <td>{show(r.h, 3)}</td><td className="text-right">{show(r.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section data-panel="area" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ③ The area function
          </p>
          <div className="mt-2"><AreaView id={id} x={x} /></div>
          <p className="mt-1 font-mono text-xs" style={{ color: LAB.pass }}>
            A(x) = <span data-readout="area">{show(areaByAntiderivative(f, x))}</span>
            {quad !== null && (
              <> · by quadrature = <span data-readout="quad">{show(quad)}</span></>
            )}
            {quad === null && (
              <span data-readout="no-quad" className="text-slate-500"> · quadrature declines: f jumps</span>
            )}
          </p>
        </section>

        <section
          data-panel="result" className="rounded-2xl border p-4"
          style={{
            borderColor: differentiable ? `${LAB.pass}59` : `${LAB.x2}59`,
            background: differentiable ? `${LAB.pass}0f` : `${LAB.x2}0f`,
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">④ So</p>
          <p className="mt-2 text-base text-slate-100"><Tex src={PART1_TEX} /></p>
          <p className="mt-2 text-sm text-slate-300">
            and therefore, for any antiderivative at all: <Tex src={PART2_TEX} />
          </p>
          <p className="mt-2 font-mono text-[11px] text-slate-400">
            with F shifted by +17.5 → <span data-readout="shifted">{show(shifted)}</span>{' '}
            (the constant cancels)
          </p>
          {!differentiable && sides && (
            <p data-readout="corner-note" className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100">
              {CORNER_NOTE}
              {' '}Left slope <span data-readout="left">{show(sides.left, 2)}</span>, right slope{' '}
              <span data-readout="right">{show(sides.right, 2)}</span>.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
