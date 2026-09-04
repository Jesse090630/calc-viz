/**
 * LAB — 最优化:「求导等于零」是**筛选**,不是答案。
 *
 * ⭐⭐ 这一页要让人亲眼看见两件事:
 *   ① 那张**有限的候选名单**(导数零点 + 端点)是怎么来的、每个候选值多少;
 *   ② 只按口诀走会在哪里翻车 —— 而且翻车有两种样子:
 *      交白卷(窄地块),和**自信地交出错的答案**(局部峰)。
 *
 * ⚠️ 窄地块那一幕的主视觉是**画到定义域外面去的那一段虚线**:
 *   峰确实存在,导数确实为零,**只是它在地块外面**。
 *   只画界内的一段,这句话就没处安放。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/optimization.ts`。
 */
import { useMemo, useState } from 'react';
import {
  ENDPOINT_NOTE,
  HEADLINE,
  MAIN_IDEA,
  SAME_FUNCTION_NOTE,
  SCENARIOS,
  answerIsAtEndpoint,
  candidates,
  clampX,
  criticalInside,
  criticalOutside,
  noCriticalPointAtAll,
  optimumByDerivative,
  optimumByScan,
  pathsAgree,
  recipeAnswer,
  recipeShortfall,
  recipeWouldSucceed,
  sampleBeyond,
  sampleF,
  scenarioOf,
  show,
  yRange,
  outsideSpan,
} from '../../math/optimization';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 420;
const H = 300;
const L = 52;
const R = 14;
const T = 16;
const B = 34;

export function OptimizationLab() {
  const [id, setId] = useState(SCENARIOS[0]!.id);
  const s = scenarioOf(id);
  const [x, setX] = useState(s.startX);

  const list = candidates(s);
  const best = optimumByDerivative(s);
  const scan = optimumByScan(s);
  const agree = pathsAgree(s);
  const guess = recipeAnswer(s);
  const shortfall = recipeShortfall(s);
  const worksHere = recipeWouldSucceed(s);
  const beyond = useMemo(() => sampleBeyond(s), [s]);
  const span = outsideSpan(s);

  // 横轴范围:有界外零点时把它也框进来,好让"够不着"这件事看得见
  const [xLo, xHi] = span ?? s.domain;
  const [yLo, yHi] = yRange(s);
  const px = (v: number) => L + ((v - xLo) / (xHi - xLo)) * (W - L - R);
  const py = (v: number) => T + (1 - (v - yLo) / (yHi - yLo)) * (H - T - B);
  const path = (pts: readonly { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.x).toFixed(2)} ${py(p.y).toFixed(2)}`).join(' ');

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Applications
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Optimization
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((k) => (
            <button
              key={k.id} type="button" data-scenario={k.id}
              data-active={k.id === id ? 'yes' : 'no'}
              onClick={() => { setId(k.id); setX(k.startX); }}
              className={
                'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
                (k.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          {s.xLabel.split(' ')[0]} ={' '}
          <span data-readout="x" data-x-exact={x} className="text-amber-300">{show(x, 3)}</span>
          <input
            type="range" min={s.domain[0]} max={s.domain[1]} step={0.001} value={x}
            onChange={(e) => setX(clampX(s, Number(e.target.value)))}
            className="w-40 accent-amber-400" aria-label="Move the design variable"
          />
        </label>
      </div>

      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300" data-readout="question">
        {s.question}
      </p>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[1fr_1fr]">
        {/* ① 图 —— 主视觉 */}
        <section data-panel="graph" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① The objective over its interval
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img"
            aria-label="The objective function drawn over its allowed interval, with the candidates marked">
            {/* 定义域之外:能到达的地方以外,画淡虚线 */}
            {beyond.length > 0 && (
              <>
                <path d={path(beyond)} fill="none" stroke={LAB.muted} strokeWidth={1.5}
                  strokeDasharray="5 4" opacity={0.55} data-beyond />
                <rect x={px(s.domain[1])} y={T} width={Math.max(px(xHi) - px(s.domain[1]), 0)}
                  height={H - T - B} fill="#0f172a" opacity={0.55} />
                <line x1={px(s.domain[1])} y1={T} x2={px(s.domain[1])} y2={H - B}
                  stroke={LAB.fail} strokeWidth={1.5} strokeDasharray="3 3" />
                <text x={px(s.domain[1]) + 5} y={T + 12} fill={LAB.fail} fontSize={9}
                  fontFamily="ui-monospace, monospace">out of reach</text>
              </>
            )}

            {/* 坐标轴 */}
            <line x1={L} y1={H - B} x2={W - R} y2={H - B} stroke={LAB.axis} strokeWidth={1.5} />
            {/* ⚠️ 纵轴画在**定义域的左端**上,不是画框边上。
                有界外那一段时 xLo < domain[0],把线画在 L 会让人以为那里是起点。*/}
            {/* ⚠️ 从 T + 10 起画,给纵轴名字空出一行 ——
                写在 x = 4 的「area (sq ft)」有 60 px 宽,会横穿这条线。*/}
            <line x1={px(s.domain[0])} y1={T + 10} x2={px(s.domain[0])} y2={H - B}
              stroke={LAB.axis} strokeWidth={1.5} />

            {/* 定义域内的曲线 */}
            <path d={path(sampleF(s))} fill="none" stroke={LAB.curve} strokeWidth={2.5} data-curve />

            {/* 候选点 */}
            {list.map((c) => (
              <g key={c.x} data-candidate={c.origin}>
                <line x1={px(c.x)} y1={py(c.value)} x2={px(c.x)} y2={H - B}
                  stroke={c.origin === 'critical' ? LAB.x1 : LAB.muted} strokeWidth={1}
                  strokeDasharray="2 3" opacity={0.7} />
                <circle cx={px(c.x)} cy={py(c.value)} r={c.x === best.x ? 6 : 4}
                  fill={c.x === best.x ? LAB.pass : c.origin === 'critical' ? LAB.x1 : LAB.muted}
                  stroke="#0b1220" strokeWidth={1.5} />
              </g>
            ))}

            {/* 界外那个够不着的零点 */}
            {criticalOutside(s).map((r) => (
              <g key={r} data-unreachable>
                <circle cx={px(r)} cy={py(s.f(r))} r={5} fill="none" stroke={LAB.fail}
                  strokeWidth={1.8} strokeDasharray="3 2" />
                <text x={px(r)} y={py(s.f(r)) - 10} textAnchor="middle" fill={LAB.fail}
                  fontSize={9} fontFamily="ui-monospace, monospace">
                  {show(r, 2)}
                </text>
              </g>
            ))}

            {/* 用户拖的那个点 */}
            <circle data-cursor cx={px(x)} cy={py(s.f(x))} r={4.5} fill={LAB.x2} />
            <text x={px(x)} y={py(s.f(x)) + 16} textAnchor="middle" fill={LAB.x2} fontSize={9}
              fontFamily="ui-monospace, monospace">{show(s.f(x), 1)}</text>

            <text x={L} y={H - 12} fill={LAB.muted} fontSize={9}
              fontFamily="ui-monospace, monospace">{s.xLabel}</text>
            <text x={4} y={T + 4} fill={LAB.muted} fontSize={9}
              fontFamily="ui-monospace, monospace">{s.yLabel}</text>
          </svg>
          <div className="mt-1 space-y-0.5 font-mono text-[11px] text-slate-400">
            <p><Tex src={s.objectiveTex} /></p>
            <p><Tex src={s.derivativeTex} /></p>
            <p data-readout="domain-why" className="text-[10px] leading-relaxed text-slate-500">
              interval [{show(s.domain[0], 2)}, {show(s.domain[1], 2)}] — {s.domainWhy}
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          {/* ② 候选名单 */}
          <section data-panel="candidates" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② The whole candidate list
            </p>
            <table className="mt-2 w-full font-mono text-[11px]">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="pb-1 font-normal">{s.xLabel.split(' ')[0]}</th>
                  <th className="pb-1 font-normal">why it is here</th>
                  <th className="pb-1 text-right font-normal">{s.yLabel}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.x} data-row={c.origin} data-winner={c.x === best.x ? 'yes' : 'no'}
                    className={c.x === best.x ? 'text-emerald-300' : 'text-slate-400'}>
                    <td className="py-0.5">{show(c.x, 3)}</td>
                    <td className="py-0.5">
                      {c.origin === 'critical' ? "derivative is zero" : 'end of the interval'}
                      {c.shape !== null && (
                        <span className="ml-1 text-slate-500">
                          ({c.shape === 'flat' ? 'second derivative says nothing' : c.shape})
                        </span>
                      )}
                    </td>
                    <td className="py-0.5 text-right">{show(c.value, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 border-t border-slate-800 pt-2 font-mono text-[11px]" style={{ color: LAB.pass }}>
              answer = <span data-readout="best-x">{show(best.x, 3)}</span>{' '}
              → <span data-readout="best-value">{show(best.value, 3)}</span>{' '}
              <span data-readout="best-origin" className="text-slate-500">({best.origin})</span>
            </p>
            <p className="mt-1 font-mono text-[11px] text-slate-500">
              dense scan, no derivative = <span data-readout="scan">{show(scan.value, 3)}</span>{' '}
              <span data-readout="agree" data-ok={agree ? 'yes' : 'no'}>
                {agree ? '✓ agrees' : '× disagrees'}
              </span>
            </p>
          </section>

          {/* ③ 口诀 */}
          <section
            data-panel="recipe" className="rounded-2xl border p-4"
            style={{
              borderColor: worksHere ? `${LAB.pass}59` : `${LAB.fail}59`,
              background: worksHere ? `${LAB.pass}0f` : `${LAB.fail}0f`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ What “set the derivative to zero” gives on its own
            </p>
            <p className="mt-2 font-mono text-[11px]">
              <span className="text-slate-400">zeros inside the interval = </span>
              <span data-readout="inside">
                {criticalInside(s).length === 0 ? 'none' : criticalInside(s).map((r) => show(r, 3)).join(', ')}
              </span>
            </p>
            <p className="mt-1 font-mono text-[11px]">
              <span className="text-slate-400">the recipe answers </span>
              <span data-readout="recipe" style={{ color: worksHere ? LAB.pass : LAB.fail }}>
                {guess === null ? 'nothing at all' : show(guess, 3)}
              </span>
              {shortfall !== null && shortfall > 1e-9 && (
                <span className="text-slate-400">
                  {' '}— short by <span data-readout="shortfall">{show(shortfall, 3)}</span>
                </span>
              )}
            </p>
            <p data-readout="verdict" data-ok={worksHere ? 'yes' : 'no'}
              className="mt-2 text-xs leading-relaxed text-slate-300">
              {worksHere
                ? 'Here the recipe happens to land on the right point. It works because a zero of the derivative exists inside the interval and it beats both ends — not because the recipe checked.'
                : noCriticalPointAtAll(s)
                  ? ENDPOINT_NOTE
                  : 'The recipe returns a real critical point, and it is a genuine local peak. It is still the wrong answer, because an end of the interval is higher. This is the dangerous failure: it hands you a confident number.'}
            </p>
            {answerIsAtEndpoint(s) && (
              <p data-readout="endpoint-flag"
                className="mt-2 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-2 font-mono text-[10px] text-red-100">
                the answer is at an end of the interval
              </p>
            )}
            {s.id === 'narrow' && (
              <p data-readout="same-function" className="mt-2 text-xs leading-relaxed text-slate-400">
                {SAME_FUNCTION_NOTE}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
