/**
 * LAB — u-换元:「那个 du 是从哪来的」。
 *
 * 学生卡住的从来不是"会不会换",是**为什么要乘 g′(x)**。
 * 这一课的回答是画出来的:同一批竖条,在 x 上和在 u 上各画一次 ——
 * 条数一样多,**宽度不一样**。宽度的比就是 `g′`。
 * 忘了乘它,你积的是另一块面积,而这一课把那块面积的数字直接摆出来。
 *
 * ⚠️ 掉头那个案例(g 在区间上先升后降)必须留着:换元之后上下限重合、
 * 积分为 0,而曲线明明有起伏。那是"有向积分"的真面目,不是 bug。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/substitution.ts`。
 */
import { useMemo, useState } from 'react';
import {
  BACKWARDS_TEX,
  CASES,
  COLLAPSE_NOTE,
  HEADLINE,
  MAIN_IDEA,
  RULE_TEX,
  SLICE_LADDER,
  WIDTH_TEX,
  byQuadrature,
  bySubstitution,
  caseOf,
  integrand,
  jacobianGap,
  limitsCollapse,
  limitsFor,
  riemannInU,
  riemannInX,
  show,
  slices,
  widthIsExact,
  widthMismatch,
  withoutJacobian,
} from '../../math/substitution';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 520;
const H = 150;
const PAD = { l: 34, r: 14, t: 12, b: 24 };

/** 一张竖条图。`axis` 决定横轴是 x 还是 u —— 两张图**条数相同、宽度不同**。 */
function Strips({
  caseId,
  n,
  axis,
}: {
  caseId: string;
  n: number;
  axis: 'x' | 'u';
}) {
  const c = caseOf(caseId);
  const list = slices(c, n);
  if (list.length === 0) return null;

  // 横向范围
  const lo = axis === 'x' ? c.a : Math.min(...list.map((s) => Math.min(s.u0, s.u1)));
  const hi = axis === 'x' ? c.b : Math.max(...list.map((s) => Math.max(s.u0, s.u1)));
  const span = hi - lo || 1;

  // 每条的高度:x 图上是 f(g(x))·g′(x),u 图上是 f(u)
  const heights = list.map((s) =>
    axis === 'x'
      ? integrand(c)((s.x0 + s.x1) / 2)
      : c.outer.at((s.u0 + s.u1) / 2),
  );
  const top = Math.max(...heights.map(Math.abs), 1e-9);

  const px = (v: number) => PAD.l + ((v - lo) / span) * (W - PAD.l - PAD.r);
  const py = (v: number) => H - PAD.b - (v / top) * (H - PAD.t - PAD.b) * 0.5 - (H - PAD.t - PAD.b) * 0.25;
  const zero = py(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label={axis === 'x' ? 'Strips in x, each weighted by the derivative factor' : 'The same strips redrawn in u, with converted widths'}>
      {list.map((s, i) => {
        const a = axis === 'x' ? s.x0 : s.u0;
        const b = axis === 'x' ? s.x1 : s.u1;
        const left = Math.min(px(a), px(b));
        const width = Math.abs(px(b) - px(a));
        const h = heights[i]!;
        const yTop = Math.min(zero, py(h));
        return (
          <rect key={i} data-strip={String(i)}
            x={left} y={yTop} width={Math.max(width, 0.4)} height={Math.abs(py(h) - zero)}
            fill={h >= 0 ? LAB.interval : LAB.fail} fillOpacity={0.45}
            stroke={axis === 'x' ? LAB.x1 : LAB.x2} strokeWidth={0.6} />
        );
      })}
      <line x1={PAD.l} y1={zero} x2={W - PAD.r} y2={zero} stroke={LAB.axis} strokeWidth={1.2} />
      <text x={4} y={zero + 4} fill="#64748b" fontSize={10} fontFamily="ui-monospace, monospace">0</text>
      <text x={PAD.l} y={H - 6} fill="#64748b" fontSize={10} fontFamily="ui-monospace, monospace">
        {axis} = {show(lo, 2)}
      </text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end" fill="#64748b" fontSize={10} fontFamily="ui-monospace, monospace">
        {show(hi, 2)}
      </text>
    </svg>
  );
}

export function SubstitutionLab() {
  const [caseId, setCaseId] = useState(CASES[0]!.id);
  const [nIndex, setNIndex] = useState(2);
  const c = caseOf(caseId);
  const n = SLICE_LADDER[nIndex]!;

  const right = useMemo(() => bySubstitution(c), [c]);
  const numeric = useMemo(() => byQuadrature(c), [c]);
  const wrong = useMemo(() => withoutJacobian(c), [c]);
  const gap = useMemo(() => jacobianGap(c), [c]);
  const { uLow, uHigh } = limitsFor(c);
  const collapsed = limitsCollapse(c);
  const mismatch = useMemo(() => widthMismatch(c, n), [c, n]);
  // ⭐ 两张图各自的面积 —— 这一课的落点必须能读出数字
  const areaX = useMemo(() => riemannInX(c, n), [c, n]);
  const areaU = useMemo(() => riemannInU(c, n), [c, n]);
  const exact = widthIsExact(c);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Integration
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          u-Substitution
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CASES.map((k) => (
            <button
              key={k.id} type="button" data-case={k.id}
              data-active={k.id === caseId ? 'yes' : 'no'}
              onClick={() => setCaseId(k.id)}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (k.id === caseId
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              <Tex src={k.integrandTex} />
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          strips = <span data-readout="n" className="text-cyan-300">{n}</span>
          <input
            type="range" min={0} max={SLICE_LADDER.length - 1} step={1} value={nIndex}
            onChange={(e) => setNIndex(Number(e.target.value))}
            className="w-32 accent-cyan-400" aria-label="Number of strips"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {/* ① x 上的条 */}
        <section data-panel="in-x" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① In x — width Δx
          </p>
          <p className="mt-1 text-sm text-slate-300"><Tex src={c.integrandTex} /></p>
          <div className="mt-2"><Strips caseId={caseId} n={n} axis="x" /></div>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            from {show(c.a, 3)} to {show(c.b, 3)}
          </p>
          <p className="mt-1 font-mono text-xs" style={{ color: LAB.x1 }}>
            area = <span data-readout="area-x">{show(areaX)}</span>
          </p>
        </section>

        {/* ② u 上的条 */}
        <section data-panel="in-u" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ② In u — width Δu
          </p>
          <p className="mt-1 text-sm text-slate-300"><Tex src={c.substitutedTex} /></p>
          <div className="mt-2"><Strips caseId={caseId} n={n} axis="u" /></div>
          <p className="mt-1 font-mono text-[11px] text-slate-500">
            limits became <span data-readout="ulow">{show(uLow, 3)}</span> →{' '}
            <span data-readout="uhigh">{show(uHigh, 3)}</span>
          </p>
          <p className="mt-1 font-mono text-xs" style={{ color: LAB.x2 }}>
            area = <span data-readout="area-u">{show(areaU)}</span>
          </p>
        </section>

        {/* ③ 宽度换算 */}
        <section data-panel="widths" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ③ Same strips, different widths
          </p>
          <p className="mt-2 text-sm text-slate-200"><Tex src={WIDTH_TEX} /></p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Both pictures use <span className="text-cyan-300">{n}</span> strips. They are not the same width.
            The ratio of the widths is exactly what <Tex src="g'(x)" /> measures — so the factor in the
            integrand is a width conversion, not decoration.
          </p>
          <p className="mt-2 font-mono text-xs" style={{ color: LAB.pass }}>
            the two areas differ by{' '}
            <span data-readout="area-gap">{show(Math.abs(areaU - areaX))}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Taller and narrower on one side, shorter and wider on the other — and the totals land on
            the same number. That trade is the whole content of the substitution.
          </p>
          <p className="mt-2 font-mono text-[11px]">
            worst width error = <span data-readout="mismatch" style={{ color: exact ? LAB.pass : LAB.x2 }}>
              {show(mismatch, 10)}
            </span>
          </p>
          {exact && (
            <p data-readout="exact-note" className="mt-1 text-[11px] leading-relaxed" style={{ color: LAB.pass }}>
              Zero, at every strip count — for a linear or quadratic inside, the secant slope equals
              the derivative at the midpoint exactly. Nothing is being approximated here.
            </p>
          )}
        </section>

        {/* ④ 忘了乘 */}
        <section data-panel="forgot" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ④ Drop the g′(x) and see
          </p>
          <div className="mt-2 space-y-1 font-mono text-xs">
            <p style={{ color: LAB.pass }}>with g′&nbsp;&nbsp;&nbsp;= <span data-readout="right">{show(right)}</span></p>
            <p className="text-red-300">without = <span data-readout="wrong">{show(wrong)}</span></p>
            <p className="border-t border-slate-700 pt-1 text-slate-400">
              gap&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <span data-readout="gap">{show(gap)}</span>
            </p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            Not a rounding difference — a different area entirely.
          </p>
        </section>

        {/* ⑤ 结论 */}
        <section
          data-panel="result" className="rounded-2xl border p-4 lg:col-span-2"
          style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">⑤ The rule</p>
          <p className="mt-2 text-base text-slate-100"><Tex src={RULE_TEX} /></p>
          <p className="mt-2 text-sm text-slate-300">
            which is just the chain rule read backwards: <Tex src={BACKWARDS_TEX} />
          </p>
          <p className="mt-2 font-mono text-xs text-slate-300">
            substitution = <span data-readout="sub">{show(right)}</span>
            {'   ·   '}
            quadrature in x = <span data-readout="quad">{show(numeric)}</span>
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">
            The right-hand number never substitutes anything — it integrates the original x-expression
            numerically. They agree, so the substitution is checked, not assumed.
          </p>
          {collapsed && (
            <p data-readout="collapse-note" className="mt-3 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100">
              {COLLAPSE_NOTE}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
