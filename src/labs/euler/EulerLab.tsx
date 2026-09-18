/**
 * LAB — 欧拉法:它不会告诉你它错了。
 *
 * ⭐⭐ 页面顺序就是论证顺序:
 *   ① 三个想当然摆在最上面,每个配一句纠正;
 *   ② 图 —— 真解(青)和欧拉折线(琥珀),折线每一步都点出来;
 *   ③ 右栏三条读数,各对应一个想当然:偏向、放大因子、走过尽头;
 *   ④ 底下的表 —— 步数翻倍,比值那一列**全是 2**。
 *
 * ⭐⭐⭐ 滑块是这一页的主角。`y′ = −20(y − 1)` 上把 h 从 0.05 拖到 0.15,
 *   折线会当场从"乖乖趋向 1"翻成"上下震荡并炸开",而门槛 `h = 0.1`
 *   滑块正好踩得到。**学生自己把它推过临界点,比读十行字管用。**
 *
 * ⚠️ 死界面自查(建之前就查过一遍,见 `src/math/euler.ts` 里 `log` 的注释):
 *   偏向三档 below / above / mixed 各有方程走得到;
 *   稳定性四档 stable / marginal / unstable / n/a 也都走得到;
 *   "走过尽头"只在 `y′ = y²` 上出现,而它是默认可点的一个方程。
 *
 * ⚠️ 折线在**不稳定**或**走过尽头**时改用失败色 —— 和 `#/slope-field` 学的:
 *   右栏说"这段是假的",画面就不能同时用"成立"的颜色画它。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/euler.ts`。
 */
import { useMemo, useState } from 'react';
import {
  CLAIMS, EQS, HEADLINE, MAIN_IDEA, ORDER_NOTE,
  type Eq, type Pt,
  amplification, biasOf, eqOf, eulerPath, exactAt, exactPath,
  observedOrder, orderTable, pastTheEnd, show, stabilityOf, stableLimit,
} from '../../math/euler';
import { LAB, STATE } from '../shared/theme';
import { Tex } from '../shared/Tex';
import { niceTicks } from '../shared/ticks';

const W = 520;
const H = 340;
const PAD_L = 42;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 28;

function makeScale(e: Eq) {
  const [x0, x1, y0, y1] = e.window;
  return {
    px: (x: number) => PAD_L + ((x - x0) / (x1 - x0)) * (W - PAD_L - PAD_R),
    py: (y: number) => H - PAD_B - ((y - y0) / (y1 - y0)) * (H - PAD_T - PAD_B),
  };
}

const BIAS_TEXT = {
  below: 'every step lands below the true curve — the errors add up',
  above: 'every step lands above the true curve — the errors add up',
  mixed: 'the polygon crosses the curve, so these errors partly cancel',
} as const;

/**
 * ⚠️⚠️ 不稳定的时候折线当然也"两边都有" —— 可原因完全不是误差在抵消,
 *   是它在发散。照搬 `mixed` 那句安慰话,等于给一场灾难配了句"没事"。
 *   (截图看出来的:`h = 0.15` 那一屏右上角就写着 "errors partly cancel"。)
 */
const DIVERGING_TEXT =
  'the polygon is on both sides of the curve because it is diverging, not because anything is cancelling';

const STABILITY_TEXT = {
  stable: 'each step shrinks the distance to the true value',
  marginal: 'neither amplified nor damped — each error simply carries forward',
  unstable: 'each step grows the distance and flips its sign',
  'n/a': 'no constant df/dy here, so there is no single amplification factor',
} as const;

export function EulerLab() {
  const [id, setId] = useState(EQS[0]!.id);
  const e = eqOf(id);
  const [h, setH] = useState(e.hRange[1]);

  const step = Math.min(Math.max(h, e.hRange[0]), e.hRange[1]);
  const walk = useMemo(() => eulerPath(e, step), [e, step]);
  const truth = useMemo(() => exactPath(e), [e]);
  const bias = useMemo(() => biasOf(e, step), [e, step]);
  const stab = stabilityOf(e, step);
  const amp = amplification(e, step);
  const limit = stableLimit(e);
  const past = useMemo(() => pastTheEnd(e, step), [e, step]);
  const rows = useMemo(() => orderTable(e), [e]);
  const order = useMemo(() => observedOrder(e), [e]);

  const s = makeScale(e);
  const poly = (list: readonly Pt[]) =>
    list.map((q) => `${s.px(q[0]).toFixed(2)},${s.py(q[1]).toFixed(2)}`).join(' ');

  /** 真解里被抬笔切开的几段。 */
  const truthRuns = useMemo(() => {
    const out: Pt[][] = [];
    let run: Pt[] = [];
    for (const q of truth) {
      if (q === null) { if (run.length > 1) out.push(run); run = []; continue; }
      run.push(q);
    }
    if (run.length > 1) out.push(run);
    return out;
  }, [truth]);

  /** ⚠️ 折线此刻描述的是不是假的东西。 */
  const lying = stab === 'unstable' || past.length > 0;
  const walkColor = lying ? LAB.fail : LAB.x2;

  const stabState = stab === 'unstable' ? STATE.fail
    : stab === 'stable' ? STATE.pass : STATE.idle;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Differential Equations
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Euler&rsquo;s Method
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ⭐⭐ 论点前置:三个想当然,各配一句纠正。 */}
      <section data-panel="claims" className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          What students assume, and what is actually true
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {CLAIMS.map((c) => (
            <div key={c.n} data-claim={c.n} className="rounded-lg border border-slate-800 px-2.5 py-2">
              <p className="font-mono text-[11px] text-red-300">
                <span aria-hidden>× </span>&ldquo;{c.said}&rdquo;
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{c.truth}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        {EQS.map((k) => (
          <button
            key={k.id} type="button" data-eq={k.id} data-active={k.id === id ? 'yes' : 'no'}
            onClick={() => { setId(k.id); setH(k.hRange[1]); }}
            className={
              'rounded-lg border px-2.5 py-1 text-left text-[11px] transition ' +
              (k.id === id
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
            }
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(0,19rem)]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
          <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[13px] text-slate-200"><Tex src={e.tex} /></span>
            <span data-legend className="font-mono text-[10px] text-slate-500">
              <span style={{ color: LAB.x1 }}>——</span> the true solution
              {' · '}
              <span style={{ color: walkColor }}>——</span> Euler with this h
            </span>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
            aria-label="The true solution curve and the Euler polygon for the chosen step size">
            <line x1={PAD_L} y1={s.py(0)} x2={W - PAD_R} y2={s.py(0)} stroke={LAB.axis} strokeWidth={1} />
            {niceTicks(e.window[0], e.window[1], true).map((v) => (
              <text key={`x${v}`} x={s.px(v)} y={H - PAD_B + 13} textAnchor="middle"
                fill="#64748b" className="font-mono text-[9px]">{String(v)}</text>
            ))}
            {/* ⚠️ 纵轴要密一档(want = 8)。`y′ = −20(y − 1)` 的画框是 [−3, 5],
                按默认密度步距取 2,刻度是 −2 / 0 / 2 / 4 —— **正好漏掉 1**,
                而 `y = 1` 是这一屏的全部内容(真解停在那儿,放大因子量的是
                "离 1 有多远")。读者没法确认那条青线停在哪。 */}
            {niceTicks(e.window[2], e.window[3], false, 8).map((v) => (
              <text key={`y${v}`} x={PAD_L - 5} y={s.py(v) + 3} textAnchor="end"
                fill="#64748b" className="font-mono text-[9px]">{String(v)}</text>
            ))}

            {/* ⭐ 解到此为止的那条竖线(只有 y′ = y² 有) */}
            {e.validUntil !== null && e.validUntil < e.window[1] && (
              <g data-end-marker>
                <line
                  x1={s.px(e.validUntil)} y1={PAD_T} x2={s.px(e.validUntil)} y2={H - PAD_B}
                  stroke={LAB.fail} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.8}
                />
                <text x={s.px(e.validUntil) + 5} y={PAD_T + 10} fill={LAB.fail}
                  className="font-mono text-[9px]">solution ends</text>
              </g>
            )}

            {/* 真解(青 = 要逼近的那个量) */}
            {truthRuns.map((run, i) => (
              <polyline key={i} data-truth={i} points={poly(run)}
                fill="none" stroke={LAB.x1} strokeWidth={2.4} strokeLinecap="round" />
            ))}

            {/* 欧拉折线 + 每一步的点 */}
            <polyline data-curve="euler" data-lying={lying ? 'yes' : 'no'} points={poly(walk.pts)}
              fill="none" stroke={walkColor} strokeWidth={1.8} strokeLinejoin="round" />
            {walk.pts.map((q, i) => (
              <circle key={i} data-node={i} cx={s.px(q[0])} cy={s.py(q[1])} r={2.6} fill={walkColor} />
            ))}
          </svg>

          <div className="mt-2 border-t border-slate-800 pt-2">
            <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              h =
              <input
                type="range" min={e.hRange[0]} max={e.hRange[1]} step={e.hRange[2]} value={step}
                onChange={(ev) => setH(Number.parseFloat(ev.target.value))}
                className="h-1 flex-1 accent-amber-400" aria-label="Step size"
              />
              <span data-readout="h" className="w-14 text-right text-amber-300">{show(step, 3)}</span>
              <span data-readout="steps" className="w-16 text-right text-slate-500">
                {walk.pts.length - 1} steps
              </span>
            </label>
            {walk.cut && (
              <p data-note="cut" className="mt-1 font-mono text-[10px] text-slate-500">
                the polygon left the frame — it did not stop on its own
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          {/* ❶ 偏向 */}
          <div data-panel="bias" data-bias={stab === 'unstable' ? 'diverging' : bias}
            className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">where the steps land</p>
            <p className="mt-1 font-mono text-[11px] text-slate-300">
              {stab === 'unstable' ? DIVERGING_TEXT : BIAS_TEXT[bias]}
            </p>
          </div>

          {/* ❸ 稳定性 */}
          <div data-panel="stability" data-stability={stab}
            className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">amplification per step</p>
            <p className="mt-1 flex items-start gap-1.5 font-mono text-[11px]"
              style={{ color: stabState.color }}>
              <span aria-hidden>{stabState.symbol}</span>
              <span data-readout="amp">
                {amp === null ? STABILITY_TEXT[stab] : `|1 + h·∂f/∂y| = ${show(amp, 3)} — ${STABILITY_TEXT[stab]}`}
              </span>
            </p>
            {limit !== null && (
              <p data-readout="limit" className="mt-1 font-mono text-[10px] text-slate-500">
                stays honest while h ≤ {show(limit, 3)}
              </p>
            )}
          </div>

          {/* ❹ 走过尽头 */}
          {past.length > 0 && (
            <div data-panel="past" className="rounded-2xl border border-red-500/40 bg-red-500/5 p-3">
              <p className="font-mono text-[11px]" style={{ color: LAB.fail }}>
                <span aria-hidden>× </span>
                {past.length} {past.length === 1 ? 'step is' : 'steps are'} past x = {show(e.validUntil, 0)},
                where this solution no longer exists
              </p>
              <p className="mt-1 font-mono text-[10px] text-slate-400">
                it reported {show(past[0]![1], 3)} at x = {show(past[0]![0], 2)}; the true solution has no value there
              </p>
            </div>
          )}

          <p className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-400">
            {e.note}
          </p>
        </section>
      </div>

      {/* ❷ ⭐⭐ 一阶的代价,摆成一列数字 */}
      <section data-panel="order" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Halving the step, at x = {show(e.checkAt, 3)}
          </p>
          <p data-readout="order" className="font-mono text-[11px] text-amber-300">
            measured order ≈ {show(order, 2)}
          </p>
        </div>
        <table className="mt-2 w-full font-mono text-[11px]">
          <thead>
            <tr className="text-slate-500">
              <th className="py-1 text-left font-normal">steps</th>
              <th className="py-1 text-right font-normal">h</th>
              <th className="py-1 text-right font-normal">Euler</th>
              <th className="py-1 text-right font-normal">error</th>
              <th className="py-1 text-right font-normal">previous ÷ this</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.n} data-row={r.n} className="border-t border-slate-800 text-slate-300">
                <td className="py-1">{r.n}</td>
                <td className="py-1 text-right">{show(r.h, 4)}</td>
                <td className="py-1 text-right">{show(r.value, 6)}</td>
                <td className="py-1 text-right">{show(r.error, 6)}</td>
                <td data-ratio className="py-1 text-right text-amber-300">
                  {r.ratio === null ? '—' : show(r.ratio, 3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{ORDER_NOTE}</p>
        <p className="mt-1 font-mono text-[11px] text-slate-500">
          the true value there is <span className="text-cyan-300">{show(exactAt(e, e.checkAt), 6)}</span>
          {' · '}<Tex src={e.exactTex} />
        </p>
      </section>
    </main>
  );
}
