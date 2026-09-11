/**
 * LAB — Taylor 级数:**项数越多 ≠ 越准。**
 *
 * ⭐⭐ 这一页的支点是那个反例:`1/(1−x)` 在 `x = 2` 处,
 *   部分和是 1, 3, 7, 15, 31 … 而真值是 **−1**。每加一项,误差**翻一倍**。
 *   所以一打开页面,默认就停在半径**外面** —— 这个反例不该藏在某个角落里等人发现。
 *
 * 三块画面对应三件要讲的事:
 *   ① 函数与 Sₙ 画在一起,收敛区间亮着,区间外是红的 —— 看见"只在这一段里像";
 *   ② 固定 x,把 S₀…Sₙ 一个个点出来 —— 看见它**落下去**还是**飞出去**;
 *   ③ 真实误差 vs 两条上界 —— 看见上界确实罩得住,也看见它有多松。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/taylor.ts`。
 */
import { useMemo, useState } from 'react';
import {
  BOUND_NOTE,
  DIVERGE_NOTE,
  ENDPOINT_NOTE,
  HEADLINE,
  MAIN_IDEA,
  NO_THEOREM_NOTE,
  SERIES,
  alternatingBound,
  clampX,
  converges,
  lagrangeBound,
  partialSum,
  partialSumTrail,
  sampleF,
  sampleSn,
  seriesOf,
  taylorApplies,
  show,
  trueError,
  verdictAt,
} from '../../math/taylor';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 470;
const H = 300;
const PAD = 34;

export function TaylorLab() {
  const [id, setId] = useState(SERIES[0]!.id);
  const s = seriesOf(id);
  const [x, setX] = useState(s.startX);
  const [deg, setDeg] = useState(4);

  const verdict = verdictAt(s, x);
  const ok = converges(s, x);
  const fx = s.f(x);
  const sn = partialSum(s, deg, x);
  const err = trueError(s, deg, x);
  const lag = lagrangeBound(s, deg, x);
  const alt = alternatingBound(s, deg, x);
  const applies = taylorApplies(s, x);
  const trail = useMemo(() => partialSumTrail(s, x, Math.max(deg, 12)), [s, x, deg]);

  const curve = useMemo(() => sampleF(s), [s]);
  const approx = useMemo(() => sampleSn(s, deg), [s, deg]);

  // ① 的坐标。⚠️ 纵轴用这个级数**自己的**量级(`yCap`),
  //    不要按样本里的极端值来定 —— 几何级数在 x → 1 附近能冲到几十,
  //    照那个定范围会把整条曲线压成一条缝。
  const yLo = -s.yCap;
  const yHi = s.yCap;
  const [xLo, xHi] = s.xRange;
  const px = (v: number) => PAD + ((v - xLo) / (xHi - xLo)) * (W - PAD - 14);
  const py = (v: number) => 14 + (1 - (v - yLo) / (yHi - yLo)) * (H - 14 - PAD);
  const clip = (v: number) => Math.min(Math.max(v, yLo - 1), yHi + 1);
  const path = (pts: readonly { x: number; y: number }[]) => {
    const out: string[] = [];
    let pen = false;
    for (const p of pts) {
      // ⚠️ 超出画面就抬笔,不要拿一条假的直线把奇点两边连起来
      if (p.y < yLo - 1 || p.y > yHi + 1) { pen = false; continue; }
      out.push(`${pen ? 'L' : 'M'}${px(p.x).toFixed(1)} ${py(clip(p.y)).toFixed(1)}`);
      pen = true;
    }
    return out.join(' ');
  };

  // ② 部分和轨迹的坐标
  const TW = 470;
  const TH = 150;
  const finite = trail.filter((v) => Number.isFinite(v));
  const tSpan = Math.max(...finite.map((v) => Math.abs(v)), Math.abs(fx) || 1, 1);
  const tx = (i: number) => 30 + (i / Math.max(trail.length - 1, 1)) * (TW - 44);
  const ty = (v: number) => TH / 2 - (Math.max(Math.min(v, tSpan), -tSpan) / tSpan) * (TH / 2 - 14);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus BC · Series
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Taylor Series
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SERIES.map((k) => (
            <button
              key={k.id} type="button" data-series={k.id} data-active={k.id === id ? 'yes' : 'no'}
              onClick={() => { setId(k.id); setX(k.startX); setDeg(4); }}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (k.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          x = <span data-readout="x" data-x-exact={x} className="text-amber-300">{show(x, 3)}</span>
          <input
            type="range" min={s.xRange[0]} max={s.xRange[1]} step={0.01} value={x}
            onChange={(e) => setX(clampX(s, Number(e.target.value)))}
            className="w-32 accent-amber-400" aria-label="Move the point where the series is evaluated"
          />
        </label>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          terms up to x<sup>n</sup>, n = <span data-readout="deg" className="text-cyan-300">{deg}</span>
          <input
            type="range" min={0} max={24} step={1} value={deg}
            onChange={(e) => setDeg(Number(e.target.value))}
            className="w-32 accent-cyan-400" aria-label="Add more terms to the polynomial"
          />
        </label>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        {/* ① 函数与部分和 */}
        <section data-panel="graph" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① The function, and the polynomial trying to be it
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img"
            aria-label="A function and its Taylor polynomial, with the interval of convergence marked">
            {/* 收敛区间亮着,外面压暗 */}
            {Number.isFinite(s.radius) ? (
              <>
                <rect data-inside x={px(-s.radius)} y={14} width={px(s.radius) - px(-s.radius)}
                  height={H - 14 - PAD} fill={LAB.pass} opacity={0.07} />
                {[-s.radius, s.radius].map((r) => (
                  <line key={r} x1={px(r)} y1={14} x2={px(r)} y2={H - PAD}
                    stroke={LAB.pass} strokeWidth={1.2} strokeDasharray="4 3" opacity={0.75} />
                ))}
                <text x={px(s.radius) + 4} y={24} fill={LAB.pass} fontSize={9}
                  fontFamily="ui-monospace, monospace">R = {show(s.radius, 2)}</text>
              </>
            ) : (
              <text x={PAD + 4} y={24} fill={LAB.pass} fontSize={9}
                fontFamily="ui-monospace, monospace" data-inside>R = ∞ — converges everywhere</text>
            )}

            {/* 坐标轴 */}
            <line x1={PAD} y1={py(0)} x2={W - 14} y2={py(0)} stroke={LAB.axis} strokeWidth={1.3} />
            <line x1={px(0)} y1={14} x2={px(0)} y2={H - PAD} stroke={LAB.axis} strokeWidth={1.3} />

            {/* 当前的 x —— 灰色,别和两条曲线抢颜色 */}
            <line x1={px(x)} y1={14} x2={px(x)} y2={H - PAD}
              stroke={LAB.muted} strokeWidth={1} strokeDasharray="2 3" opacity={0.7} />

            {/* ⚠️ 真函数用天蓝,多项式用琥珀 —— 第一版两条都是蓝的(#38bdf8 和 #22d3ee),
                而这一页**全部的意义**就是比较这两条线,屏幕上却分不开。
                琥珀是全站"你正在动的那个"的颜色,多项式正是它。 */}
            <path data-curve d={path(curve)} fill="none" stroke={LAB.curve} strokeWidth={2.6} />
            <path data-approx d={path(approx)} fill="none" stroke={LAB.x2} strokeWidth={2} />

            {Number.isFinite(fx) && Math.abs(fx) < 1e6 && (
              <circle cx={px(x)} cy={py(clip(fx))} r={4} fill={LAB.curve} />
            )}
            {Number.isFinite(sn) && (
              Math.abs(sn) <= s.yCap ? (
                <circle data-sn cx={px(x)} cy={py(sn)} r={4.5} fill={LAB.x2}
                  stroke="#0b1220" strokeWidth={1.4} />
              ) : (
                /* ⚠️ Sₙ 飞出画面时**要说一声**。第一版直接把它夹到边上再画,
                   于是那个点悄悄消失 —— 屏幕上看不出"它已经跑到 31 去了"。*/
                <g data-sn data-offscale="yes">
                  <text x={px(x)} y={sn > 0 ? 26 : H - PAD - 6} textAnchor="middle"
                    fill={LAB.x2} fontSize={10} fontFamily="ui-monospace, monospace">
                    {sn > 0 ? '▲' : '▼'} {show(sn, 1)}
                  </text>
                </g>
              )
            )}
          </svg>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            <p className="text-slate-300"><Tex src={s.tex} /></p>
            <p style={{ color: LAB.curve }}>
              f(x) = <span data-readout="fx">{show(fx)}</span>
            </p>
            <p style={{ color: LAB.x2 }}>
              S<sub>{deg}</sub>(x) = <span data-readout="sn">{show(sn)}</span>
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          {/* ② 部分和的轨迹 —— 反例就在这里 */}
          <section
            data-panel="trail" className="rounded-2xl border p-4"
            style={{
              borderColor: ok ? `${LAB.pass}59` : `${LAB.fail}59`,
              background: ok ? `${LAB.pass}0f` : `${LAB.fail}0f`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② The running total, term by term
            </p>
            <svg viewBox={`0 0 ${TW} ${TH}`} className="mt-2 w-full" role="img"
              aria-label="Successive partial sums, either settling on the true value or running away from it">
              {/* 真值那条线 */}
              {Number.isFinite(fx) && Math.abs(fx) <= tSpan && (
                <>
                  <line x1={24} y1={ty(fx)} x2={TW - 12} y2={ty(fx)}
                    stroke={LAB.curve} strokeWidth={1.4} strokeDasharray="5 4" />
                  <text x={TW - 12} y={ty(fx) - 5} textAnchor="end" fill={LAB.curve} fontSize={9}
                    fontFamily="ui-monospace, monospace">f(x) = {show(fx, 3)}</text>
                </>
              )}
              {/* 部分和的点 */}
              {trail.map((v, i) => (
                Number.isFinite(v) ? (
                  <circle
                    key={i} data-trail={i} cx={tx(i)} cy={ty(v)} r={i === deg ? 4.5 : 2.6}
                    fill={i === deg ? LAB.x2 : (ok ? LAB.x1 : LAB.fail)}
                    opacity={i <= deg ? 1 : 0.28}
                  />
                ) : null
              ))}
              <text x={24} y={TH - 3} fill={LAB.muted} fontSize={9}
                fontFamily="ui-monospace, monospace">n = 0</text>
              <text x={TW - 12} y={TH - 3} textAnchor="end" fill={LAB.muted} fontSize={9}
                fontFamily="ui-monospace, monospace">n = {trail.length - 1}</text>
            </svg>
            <p data-readout="verdict" data-state={verdict} className="mt-1 font-mono text-[11px]"
              style={{ color: ok ? LAB.pass : LAB.fail }}>
              {verdict === 'inside' ? '✓ inside the radius — the sums settle onto f(x)'
                : verdict === 'endpoint-converges' ? '✓ exactly at the endpoint, and this end converges'
                  : verdict === 'endpoint-diverges' ? '× exactly at the endpoint, and this end does not converge'
                    : '× outside the radius — the sums are running away'}
            </p>
            {!ok && (
              <p data-readout="diverge-note" className="mt-2 text-xs leading-relaxed text-slate-300">
                {verdict === 'outside' ? DIVERGE_NOTE : ENDPOINT_NOTE}
              </p>
            )}
          </section>

          {/* ③ 误差与上界 */}
          <section data-panel="error" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ How far off are you, and what bounds it
            </p>
            <div className="mt-2 space-y-1 font-mono text-[11px]">
              <p style={{ color: LAB.x2 }}>
                actual error = <span data-readout="err">{show(err)}</span>
              </p>
              <p className="text-slate-400">
                Lagrange bound ={' '}
                <span data-readout="lagrange" data-applies={applies ? 'yes' : 'no'}>
                  {applies ? show(lag) : "the theorem does not apply here"}
                </span>
                {lag !== null && err !== null && err > 0 && (
                  <span className="ml-2 text-slate-600">
                    ({show(lag / err, 1)}× the error)
                  </span>
                )}
              </p>
              <p className="text-slate-400">
                alternating bound ={' '}
                <span data-readout="alternating">
                  {alt === null ? 'does not apply here' : show(alt)}
                </span>
              </p>
              <p data-readout="holds" data-ok={lag === null || err === null || lag >= err - 1e-12 ? 'yes' : 'no'}
                className="border-t border-slate-700 pt-1"
                style={{ color: lag === null || err === null || lag >= err - 1e-12 ? LAB.pass : LAB.fail }}>
                {!applies
                  ? '· f is not differentiable all the way from 0 to x'
                  : lag === null || err === null
                    ? '· no bound to check at this point'
                    : lag >= err - 1e-12 ? '✓ the bound holds' : '× the error escaped the bound'}
              </p>
            </div>
            <p data-readout="bound-note" className="mt-2 text-xs leading-relaxed text-slate-400">
              {applies ? BOUND_NOTE : NO_THEOREM_NOTE}
            </p>
          </section>
        </div>
      </div>

      {/* ④ 半径的来历 */}
      <section data-panel="why" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Where the radius comes from
        </p>
        <p data-readout="why" className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-400">
          {s.why}
        </p>
      </section>
    </main>
  );
}
