/**
 * LAB — 「Trapped From Both Sides」(夹逼定理)
 *
 * ⚠️ 中间那条**故意选了看不出趋势的**:`1 + x² sin(5/x)` 在 0 附近摆动越来越快。
 * 盯着它看只会觉得"没有极限" —— 而那正是需要夹逼的场合:
 * 推理能给出观察给不出的答案。选一条老实的中间曲线,这一节就白教了。
 *
 * ⚠️ 结论那一行来自 `squeezedLimit()`,而它**一个参数都不接** ——
 * 拿不到 f 的任何一个值。中间那条走到哪儿都不影响结论,这一点在类型上就锁死了。
 */
import { useCallback, useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { showScientific } from '../../math/format';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  A, CHAIN_TEX, L, LOWER_TEX, MIDDLE_TEX, SQUEEZE_TEX, UPPER_TEX, VIEW,
  halveDistance, read, sampleBound, sampleMiddle, showX, showY,
  squeezedLimit, trappedBySampling,
} from '../../math/squeeze';

const V = makeViewport({
  width: 660, height: 420,
  xMin: VIEW.from, xMax: VIEW.to, yMin: L - 1.25, yMax: L + 1.25,
  padLeft: 44, padRight: 24, padTop: 22, padBottom: 34,
});

export function SqueezeLab() {
  const [scan, setScan] = useState(0.9);
  const r = useMemo(() => read(scan), [scan]);
  const closer = useCallback(() => setScan((x) => halveDistance(x)), []);
  const ok = useMemo(() => trappedBySampling(), []);

  const sx = toSvgX(V, r.x);
  const y0 = toSvgY(V, L);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Interactive definition</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">The Squeeze Theorem</h1>
        <p className="mt-3 text-base text-slate-400">
          Trapped from both sides. The middle curve has nowhere left to go.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <p className="font-mono text-xs text-slate-400">a = {A} &nbsp;·&nbsp; L = {L}</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" data-action="closer" onClick={closer}
              className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10">
              Halve the distance →
            </button>
            <button type="button" data-action="restart" onClick={() => setScan(0.9)}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <svg viewBox={`0 0 ${V.width} ${V.height}`} className="w-full select-none" role="img"
              aria-label="Two parabolas closing in on y = 1 with a wiggling curve trapped between them">
              <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.pass} strokeWidth={1} strokeDasharray="6 5" opacity={0.5} />
              <text x={V.padLeft + 4} y={y0 - 7} fill={LAB.pass} fontSize={11} fontWeight={700} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">L = {L}</text>

              {/* 上下界之间的那块空间 —— 它一路收窄到 0 */}
              <path
                d={
                  polylinePath(V, sampleBound('upper')).replace(/^M/, 'M') +
                  ' L' + [...sampleBound('lower')].reverse().map((p) => `${toSvgX(V, p.x).toFixed(2)} ${toSvgY(V, p.y).toFixed(2)}`).join(' L') + ' Z'
                }
                fill={LAB.pass}
                opacity={0.07}
              />
              {(['upper', 'lower'] as const).map((which) => (
                <path key={which} d={polylinePath(V, sampleBound(which))} fill="none"
                  stroke={which === 'upper' ? LAB.x2 : LAB.x1} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
              ))}

              {/* 中间那条 —— 摆动的主角 */}
              <path d={polylinePath(V, sampleMiddle())} fill="none" stroke={LAB.curve} strokeWidth={1.6} strokeLinecap="round" />

              {/* 扫描线 */}
              <line x1={sx} y1={V.padTop} x2={sx} y2={V.height - V.padBottom} stroke={LAB.muted} strokeWidth={1.3} strokeDasharray="5 4" opacity={0.8} />
              {/* 三个点始终画出来 */}
              {([['h', r.h, LAB.x2], ['f', r.f, LAB.curve], ['g', r.g, LAB.x1]] as const).map(([name, value, color]) =>
                value === null ? null : (
                  <circle key={name} cx={sx} cy={toSvgY(V, value)} r={5} fill={color} stroke="#0b1020" strokeWidth={1.6} />
                ),
              )}

              {/*
                ⚠️ 三个标签在**收拢之后必然叠在一起** —— 它们本来就趋于同一个高度。
                那时不该硬挤三行(浏览器的文字碰撞检查抓到过),而是画**一行**:
                "三个已经分不开了" 恰恰就是这一节的结论,不是显示故障。
              */}
              {toSvgY(V, r.g) - toSvgY(V, r.h) < 26 ? (
                <text x={sx + (r.x > 0 ? -12 : 12)} y={toSvgY(V, L) - 12} fill={LAB.pass} fontSize={11} fontWeight={700}
                  textAnchor={r.x > 0 ? 'end' : 'start'} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
                  g = f = h to {showScientific(r.gap, 0)}
                </text>
              ) : (
                ([['h', r.h, LAB.x2], ['f', r.f, LAB.curve], ['g', r.g, LAB.x1]] as const).map(([name, value, color]) =>
                  value === null ? null : (
                    <text key={name} x={sx + (r.x > 0 ? -10 : 10)} y={toSvgY(V, value) + 4} fill={color} fontSize={11} fontWeight={700}
                      textAnchor={r.x > 0 ? 'end' : 'start'} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
                      {name} = {showY(value)}
                    </text>
                  ),
                )
              )}
            </svg>
            <p className="mt-1 text-xs text-slate-500">
              Drag the scanner with the button, or watch the room between the bounds shrink as x → 0.
            </p>

            <section data-panel="curves" className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The three curves</p>
              <p className="mt-2 text-sm" style={{ color: LAB.x2 }}><Tex src={UPPER_TEX} /> &nbsp;<span className="text-xs text-slate-500">above it</span></p>
              <p className="mt-1 text-sm text-slate-100"><Tex src={MIDDLE_TEX} /> &nbsp;<span className="text-xs text-slate-500">the one we care about</span></p>
              <p className="mt-1 text-sm" style={{ color: LAB.x1 }}><Tex src={LOWER_TEX} /> &nbsp;<span className="text-xs text-slate-500">below it</span></p>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <section data-panel="scan" data-ordered={r.ordered ? 'yes' : 'no'} data-gap={r.gap.toExponential(3)}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">At x = <span data-readout="x">{showX(r.x)}</span></p>
              <div className="mt-3 space-y-1.5 font-mono text-sm">
                <p className="flex justify-between gap-3"><span style={{ color: LAB.x2 }}>h(x)</span><span data-readout="h" style={{ color: LAB.x2 }}>{showY(r.h)}</span></p>
                <p className="flex justify-between gap-3"><span className="text-slate-300">f(x)</span><span data-readout="f" className="text-slate-100">{showY(r.f)}</span></p>
                <p className="flex justify-between gap-3"><span style={{ color: LAB.x1 }}>g(x)</span><span data-readout="g" style={{ color: LAB.x1 }}>{showY(r.g)}</span></p>
              </div>
              <p className="mt-3 text-sm text-slate-200"><Tex src={CHAIN_TEX} /></p>
              <p className="mt-2 font-mono text-xs" style={{ color: LAB.pass }}>
                room left: <span data-readout="gap">{showScientific(r.gap, 2)}</span>
              </p>
            </section>

            <section data-panel="story" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Where can f(x) go?</p>
              <div className="mt-2.5 space-y-1.5 text-sm">
                <p style={{ color: LAB.x1 }}>Below it — g is always underneath.</p>
                <p style={{ color: LAB.x2 }}>Above it — h is always on top.</p>
                <p className="text-slate-300">Both are closing in.</p>
                <p className="font-bold" style={{ color: LAB.pass }}>Nowhere else.</p>
              </div>
            </section>

            <section data-panel="verdict" data-limit={String(squeezedLimit())} data-trapped={ok ? 'yes' : 'no'}
              className="rounded-2xl border p-4" style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Squeeze theorem</p>
              <p className="mt-2 text-slate-100"><Tex src={SQUEEZE_TEX} /></p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Notice what we never did: look at where f seemed to be heading. It wiggles forever. The two bounds
                settled the question without it.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
