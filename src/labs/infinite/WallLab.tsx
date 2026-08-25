/**
 * LAB — 「Approach the Wall」(无穷极限与铅直渐近线)
 *
 * ⚠️ 这一节最容易教坏的一句话是"极限等于无穷"。
 * 界面上因此**没有任何**"= ∞"的说法当成一个值来用:
 * 右边那块面板问的是"你给个界",答的是"我走到第几档就超过它"。
 *
 * ⚠️ 画面**跟着档位重新标度**(y 轴一档比一档高十倍),
 * 否则第 3 档以后曲线就贴到轴上,"爆炸"这件事反而消失了。
 * 放大了就在角上写出来 —— 悄悄放大是骗人。
 */
import { useCallback, useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  A,
  GROWTH_COPY,
  MAX_DECADE,
  TWO_SIDED_TEX,
  approachTex,
  beats,
  closerDecade,
  decade,
  decadeX,
  growthBySign,
  growthTex,
  read,
  showX,
  showY,
  valueAt,
  viewHalfHeight,
  viewHalfWidth,
  type Side,
} from '../../math/infiniteLimits';

const SIDES: readonly Side[] = ['left', 'right'];
const SIDE_COLOR: Readonly<Record<Side, string>> = { left: LAB.x1, right: LAB.x2 };
const BOUNDS: readonly number[] = [10, 100, 1000, 1e6];

function Graph({ k }: { k: number }) {
  const halfY = viewHalfHeight(k);
  const halfX = viewHalfWidth(k);
  const V = makeViewport({
    width: 660, height: 420,
    xMin: -halfX, xMax: halfX, yMin: -halfY, yMax: halfY,
    padLeft: 46, padRight: 24, padTop: 22, padBottom: 34,
  });
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);

  /** 两支各自取样,**中间不连过去** —— 那道断裂就是渐近线。 */
  const branch = (side: Side) => {
    const sign = side === 'left' ? -1 : 1;
    const near = halfX / 400;
    return Array.from({ length: 160 }, (_, i) => {
      const t = i / 159;
      const x = sign * (near + t * (halfX - near));
      return { x, y: valueAt(x) ?? 0 };
    });
  };

  return (
    <svg viewBox={`0 0 ${V.width} ${V.height}`} className="w-full select-none" role="img" aria-label="One over x near zero, with a vertical asymptote">
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.1} />
      </g>

      {/* 铅直渐近线 —— 曲线**永远碰不到**它 */}
      <line x1={x0} y1={V.padTop} x2={x0} y2={V.height - V.padBottom} stroke={LAB.fail} strokeWidth={1.6} strokeDasharray="7 5" opacity={0.85} />
      <text x={x0 + 8} y={V.padTop + 12} fill={LAB.fail} fontSize={11} fontWeight={700} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
        x = 0
      </text>

      {SIDES.map((side) => (
        <path key={side} d={polylinePath(V, branch(side))} fill="none" stroke={LAB.curve} strokeWidth={2.4} strokeLinecap="round" />
      ))}

      {SIDES.map((side) => {
        const r = read(side, decadeX(side, k));
        const px = toSvgX(V, r.x);
        const py = toSvgY(V, r.y);
        const color = SIDE_COLOR[side];
        return (
          <g key={`p-${side}`}>
            <line x1={px} y1={y0} x2={px} y2={py} stroke={color} strokeWidth={1.1} strokeDasharray="4 4" opacity={0.55} />
            <circle cx={px} cy={py} r={9} fill={color} opacity={0.16} />
            <circle cx={px} cy={py} r={5} fill={color} stroke="#0b1020" strokeWidth={1.6} />
            <text
              x={px + (side === 'left' ? 10 : -10)}
              y={py + (side === 'left' ? 16 : -10)}
              fill={color}
              fontSize={12}
              fontWeight={700}
              textAnchor={side === 'left' ? 'start' : 'end'}
              fontFamily="ui-monospace, monospace"
              stroke="#0b1020"
              strokeWidth={3.5}
              paintOrder="stroke"
            >
              {showY(r.y)}
            </text>
          </g>
        );
      })}

      {k > 0 && (
        <text x={V.width - V.padRight} y={V.padTop + 12} fill={LAB.muted} fontSize={11} fontWeight={700} textAnchor="end" fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
          y-axis now reaches ±{showY(viewHalfHeight(k))}
        </text>
      )}
    </svg>
  );
}

export function WallLab() {
  const [k, setK] = useState(0);
  const [bound, setBound] = useState(BOUNDS[0]!);
  const needed = useMemo(() => beats('right', bound), [bound]);
  const closer = useCallback(() => setK((v) => closerDecade(v)), []);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Interactive definition</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Infinite Limits</h1>
        <p className="mt-3 text-base text-slate-400">
          Approach the wall. The graph gets arbitrarily close to x = 0 without ever touching it.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <p className="font-mono text-xs text-slate-400">f(x) = 1/x &nbsp;·&nbsp; near x = {A}</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" data-action="closer" onClick={closer} disabled={k >= MAX_DECADE}
              className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:opacity-35">
              Closer to zero ×10 →
            </button>
            <button type="button" data-action="restart" onClick={() => setK(0)}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <Graph k={k} />
            <p className="mt-1 text-xs text-slate-500">
              Each press divides |x| by ten. The y-axis rescales to keep up — that is the point.
            </p>

            {/* 十进位表:一眼看见每近十倍、输出就大十倍 */}
            <section data-panel="decades" className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Ten times closer, ten times bigger</p>
              <div className="mt-3 grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                <span className="text-slate-500">x</span>
                <span className="text-right text-slate-500">from the left</span>
                <span className="text-right text-slate-500">from the right</span>
                {Array.from({ length: k + 1 }, (_, i) => i).map((row) => (
                  <FragmentRow key={row} row={row} current={row === k} />
                ))}
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {SIDES.map((side) => {
              const g = growthBySign(side);
              const color = SIDE_COLOR[side];
              const r = read(side, decadeX(side, k));
              return (
                <section key={side} data-panel="side" data-side={side} data-growth={g}
                  className="rounded-2xl border p-4" style={{ borderColor: `${color}55`, background: `${color}0d` }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>{side}</p>
                  <p className="mt-2 font-mono text-sm text-slate-300">
                    x = <span data-readout="x">{showX(r.x)}</span>
                  </p>
                  <p className="font-mono text-sm" style={{ color }}>
                    f(x) = <span data-readout="y">{showY(r.y)}</span>
                  </p>
                  <p className="mt-3 text-sm text-slate-200"><Tex src={approachTex(side)} /></p>
                  <p className="mt-1 text-sm" style={{ color }}><Tex src={growthTex(side)} /></p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    f(x) {GROWTH_COPY[g].words}. That describes behaviour — it does not name a number it reaches.
                  </p>
                </section>
              );
            })}

            {/* ⭐ "你给个界,我超过它" —— 这才是无界的论证方式 */}
            <section data-panel="bound" data-needed={needed === null ? 'none' : String(needed)}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Name a bound</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {BOUNDS.map((b) => (
                  <button key={b} type="button" data-bound={b} onClick={() => setBound(b)}
                    className={'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' + (bound === b ? 'border-amber-400/60 bg-amber-400/10 text-amber-100' : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')}>
                    {showY(b)}
                  </button>
                ))}
              </div>
              {needed !== null && (
                <p className="mt-3 font-mono text-xs" style={{ color: LAB.pass }}>
                  x = {showX(decade(needed))} → f(x) = {showY(valueAt(decade(needed)))} &gt; {showY(bound)}
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Pick any bound at all. There is always an x close enough to beat it. That is what &ldquo;without
                bound&rdquo; means.
              </p>
            </section>

            {/*
              ⚠️ 结论也挂成属性。那一行是 KaTeX 渲染的,`innerText` 读出来什么形状不受控 ——
              这个项目里因为读渲染后的文案误判过多次,不再犯。
            */}
            <section data-panel="two-sided" data-two-sided="dne" data-tex={TWO_SIDED_TEX} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Both sides at once</p>
              <p className="mt-2 text-slate-100"><Tex src={TWO_SIDED_TEX} /></p>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                One side runs up, the other runs down. They disagree — so there is no two-sided limit, and it is not
                &ldquo;infinity&rdquo; either.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function FragmentRow({ row, current }: { row: number; current: boolean }) {
  const x = decade(row);
  return (
    <>
      <span data-row={row} style={{ color: current ? '#e2e8f0' : '#64748b' }}>±{showX(x)}</span>
      <span className="text-right" style={{ color: current ? LAB.x1 : '#475569' }}>{showY(valueAt(-x))}</span>
      <span className="text-right" style={{ color: current ? LAB.x2 : '#475569' }}>{showY(valueAt(x))}</span>
    </>
  );
}
