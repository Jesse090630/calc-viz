/**
 * LAB — 链式法则:「倍率相乘」。
 *
 * 走的是全站那条固定的路子:
 *   先给出**最常见的错答案** → 用数字打掉它 → 把机制画出来(两级放大) →
 *   量出每一级的倍率 → 发现乘积**在取极限之前**就已经等于总倍率 →
 *   让 Δx 缩下去 → 得到公式。
 *
 * ⚠️ 这一课有一个别处不讲的诚实之处:那条
 *   `Δy/Δx = (Δy/Δu)·(Δu/Δx)` 的推导,在 `Δu = 0` 处**是断的**。
 *   界面必须把 `Δy/Δu` 显示成 undefined,并说清楚断的是**这条路径**、
 *   不是结论本身。数学不能因为不好讲就被藏起来。
 *
 * 禁止 2:这里不出现裸算式,所有数值都来自 `src/math/chainRule.ts`。
 */
import { useMemo, useState } from 'react';
import {
  DX_LADDER,
  FLAT_WARNING,
  HEADLINE,
  IDENTITY_TEX,
  LIMIT_TEX,
  MAIN_IDEA,
  PAIRS,
  X_RANGE,
  byChainRule,
  byNumericLimit,
  clampX,
  forgettingInner,
  isUsable,
  ladder,
  missingFactor,
  pairOf,
  show,
  stretchFactors,
} from '../../math/chainRule';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 560;
const ROW_H = 74;

/** 三条数轴:x → u → y。每条自己定比例,因为三者量纲完全不同。 */
function Ladders({
  pairId,
  x,
  dx,
}: {
  pairId: string;
  x: number;
  dx: number;
}) {
  const pair = pairOf(pairId);
  const s = stretchFactors(pair, x, dx);
  if (!s) return null;

  const u = pair.inner.at(x);
  const y = pair.outer.at(u);
  const rows = [
    { label: 'x', from: x, to: x + dx, delta: s.dx, color: LAB.x1 },
    { label: 'u = g(x)', from: u, to: u + s.du, delta: s.du, color: LAB.x2 },
    { label: 'y = f(u)', from: y, to: y + s.dy, delta: s.dy, color: LAB.pass },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${ROW_H * 3 + 16}`} className="w-full" role="img"
      aria-label="Three number lines showing how a step in x becomes a step in u and then a step in y">
      {rows.map((row, i) => {
        // 每条轴按自己那一步的大小定比例 —— 让"这一跳有多大"看得见,
        // 而不是被另外两条的量纲压扁。
        const span = Math.max(Math.abs(row.delta) * 2.6, 1e-9);
        const mid = W / 2;
        const px = (v: number) => mid + ((v - row.from) / span) * (W * 0.38);
        const yy = 34 + i * ROW_H;
        return (
          <g key={row.label} data-axis={row.label.split(' ')[0]}>
            <text x={4} y={yy - 14} fill="#64748b" fontSize={11} fontFamily="ui-monospace, monospace">{row.label}</text>
            {/* ⚠️ 轴线要在读数之前收住 —— 否则线会从 "Δ = …" 的字里穿过去 */}
            <line x1={20} y1={yy} x2={W - 108} y2={yy} stroke={LAB.axis} strokeWidth={1.2} />
            {/* 起点 → 终点那一跳 */}
            <line x1={px(row.from)} y1={yy} x2={px(row.to)} y2={yy} stroke={row.color} strokeWidth={4} strokeLinecap="round" />
            <circle cx={px(row.from)} cy={yy} r={4.5} fill="#0b1020" stroke={row.color} strokeWidth={2} />
            <circle cx={px(row.to)} cy={yy} r={4.5} fill={row.color} />
            <text x={W - 100} y={yy + 4} fill={row.color} fontSize={11} fontFamily="ui-monospace, monospace"
              data-delta={row.label.split(' ')[0]}>
              Δ = {show(row.delta, 4)}
            </text>
          </g>
        );
      })}
      {/* 两个"放大 k 倍"的箭头 */}
      {[0, 1].map((i) => {
        const factor = i === 0 ? s.inner : s.outer;
        return (
          <g key={i}>
            <line x1={W / 2} y1={34 + i * ROW_H + 10} x2={W / 2} y2={34 + (i + 1) * ROW_H - 10}
              stroke={LAB.muted} strokeWidth={1.2} strokeDasharray="3 3" />
            <text x={W / 2 + 10} y={34 + i * ROW_H + ROW_H / 2 + 4} fill={LAB.muted} fontSize={11}
              fontFamily="ui-monospace, monospace"
              data-factor={i === 0 ? 'inner' : 'outer'}>
              × {show(factor, 4)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ChainRuleLab() {
  const [pairId, setPairId] = useState(PAIRS[0]!.id);
  const pair = pairOf(pairId);
  const [x, setX] = useState(pair.startX);
  const [dxIndex, setDxIndex] = useState(2);
  const dx = DX_LADDER[dxIndex]!;

  const usable = isUsable(pair, x) && isUsable(pair, x + dx);
  const s = useMemo(() => (usable ? stretchFactors(pair, x, dx) : null), [pair, x, dx, usable]);
  const truth = usable ? byChainRule(pair, x) : null;
  const wrong = usable ? forgettingInner(pair, x) : null;
  const factor = usable ? missingFactor(pair, x) : null;
  const rungs = useMemo(() => (usable ? ladder(pair, x) : []), [pair, x, usable]);
  const flat = s?.du === 0;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Derivative rules
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          The Chain Rule
        </h1>
        <p className="mt-3 text-base text-slate-400">
          {HEADLINE}. {MAIN_IDEA}
        </p>
      </header>

      {/* ── 控制条 ─────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {PAIRS.map((p) => (
            <button
              key={p.id}
              type="button"
              data-pair={p.id}
              data-active={p.id === pairId ? 'yes' : 'no'}
              onClick={() => { setPairId(p.id); setX(p.startX); }}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (p.id === pairId
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              <Tex src={p.composedTex.replace('y = ', '')} />
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          x = <span data-readout="x" className="text-amber-300">{show(x, 3)}</span>
          <input
            type="range" min={X_RANGE.min} max={X_RANGE.max} step={0.01} value={x}
            onChange={(e) => setX(clampX(Number(e.target.value)))}
            className="w-40 accent-amber-400"
            aria-label="Move x"
          />
        </label>
        <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          Δx = <span data-readout="dx" className="text-cyan-300">{show(dx, 4)}</span>
          <input
            type="range" min={0} max={DX_LADDER.length - 1} step={1} value={dxIndex}
            onChange={(e) => setDxIndex(Number(e.target.value))}
            className="w-32 accent-cyan-400"
            aria-label="Shrink the step in x"
          />
        </label>
      </div>

      {!usable && (
        <p data-panel="unusable" className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          This pair is not defined at x = {show(x, 3)} (or at x + Δx). Move x back into range.
        </p>
      )}

      {usable && s && (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          {/* ① 错答案 */}
          <section data-panel="wrong-guess" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ① The usual mistake
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Differentiate the outside and stop:
            </p>
            <p className="mt-2 font-mono text-sm">
              <span className="text-red-300">
                f′(g(x)) = <span data-readout="wrong">{show(wrong)}</span>
              </span>
            </p>
            <p className="mt-1 font-mono text-sm">
              <span style={{ color: LAB.pass }}>
                actual = <span data-readout="truth">{show(truth)}</span>
              </span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {factor === null
                ? 'Here the inner derivative is exactly 0, so the true answer is 0 no matter what the outside does.'
                : <>Off by a factor of <span data-readout="factor" className="text-amber-300">{show(factor)}</span> — exactly the inner derivative g′(x).</>}
            </p>
          </section>

          {/* ② 两级放大 */}
          <section data-panel="stages" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4 lg:row-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② Two stages of stretching
            </p>
            <div className="mt-2">
              <Ladders pairId={pairId} x={x} dx={dx} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              One step in x becomes a step in u, and that becomes a step in y. Each arrow carries its own
              magnification.
            </p>
          </section>

          {/* ③ 量一量 */}
          <section data-panel="measure" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ Multiply them
            </p>
            <div className="mt-2 space-y-1 font-mono text-xs">
              <p style={{ color: LAB.x1 }}>Δu/Δx = <span data-readout="inner">{show(s.inner)}</span></p>
              <p style={{ color: LAB.x2 }}>Δy/Δu = <span data-readout="outer">{show(s.outer)}</span></p>
              <p className="border-t border-slate-700 pt-1" style={{ color: LAB.pass }}>
                product = <span data-readout="product">{show(s.product)}</span>
              </p>
              <p style={{ color: LAB.pass }}>Δy/Δx&nbsp; = <span data-readout="direct">{show(s.direct)}</span></p>
            </div>
            <p className="mt-2 text-sm"><Tex src={IDENTITY_TEX} /></p>
            <p
              data-readout="identity"
              data-holds={s.identityHolds ? 'yes' : 'no'}
              className="mt-2 text-xs leading-relaxed"
              style={{ color: s.identityHolds ? LAB.pass : LAB.fail }}
            >
              {s.identityHolds
                ? '✓ exact — and no limit has been taken yet.'
                : '× this route is broken here.'}
            </p>
            {flat && (
              <p data-readout="flat-warning" className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-amber-100">
                {FLAT_WARNING}
              </p>
            )}
          </section>

          {/* ④ 缩下去 */}
          <section data-panel="ladder" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ④ Let Δx shrink
            </p>
            <table className="mt-2 w-full font-mono text-[11px]">
              <thead className="text-slate-500">
                <tr><th className="text-left font-normal">Δx</th><th className="text-right font-normal">product</th></tr>
              </thead>
              <tbody>
                {rungs.map((r) => (
                  <tr key={r.dx} data-rung={String(r.dx)} className={r.dx === dx ? 'text-amber-200' : 'text-slate-400'}>
                    <td>{show(r.dx, 4)}</td>
                    <td className="text-right">{show(r.product)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* ⑤ 答案 */}
          <section
            data-panel="result"
            className="rounded-2xl border p-4 lg:col-span-2"
            style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">⑤ The rule</p>
            <p className="mt-2 text-base text-slate-100"><Tex src={LIMIT_TEX} /></p>
            <p className="mt-2 font-mono text-xs text-slate-300">
              formula = <span data-readout="formula">{show(truth)}</span>
              {'   ·   '}
              numeric = <span data-readout="numeric">{show(byNumericLimit(pair, x))}</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              The right column never uses the chain rule — it just measures the composite as a black box.
              They agree, so the rule is not an assumption here; it is something the numbers confirm.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
