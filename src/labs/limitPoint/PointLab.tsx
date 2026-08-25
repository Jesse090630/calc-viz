/**
 * LAB — 「The Point Doesn't Decide the Limit」(极限 vs 函数值)
 *
 * 一句话:**把 f(1) 拖到任何高度,极限都还是 2。**
 * 这是整个交互的目的,也是它唯一需要说服的事。
 *
 * ⚠️ 极限那一行由 `limitAtHole()` 出,而那个函数**接不到** f(1)(见数学模块)。
 * 于是"拖动改变了极限"在代码里根本写不出来 —— 界面不可能说错。
 */
import { useCallback, useMemo, useState } from 'react';
import { PointGraph } from './PointGraph';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import {
  HOLE_Y,
  LIMIT_TEX,
  RAW_TEX,
  SIMPLIFIED_TEX,
  clampPointY,
  clampToSide,
  limitAtHole,
  pointSitsOnHole,
  readApproach,
  resetApproach,
  showShort,
  stepCloser,
  valueAtA,
  valueTex,
  type PointMode,
  type Side,
} from '../../math/limitVsValue';

const SIDES: readonly Side[] = ['left', 'right'];
const MODES: readonly { id: PointMode; label: string; blurb: string }[] = [
  { id: 'hole', label: 'f(1) undefined', blurb: 'The formula divides by zero at x = 1, so there is no point there at all.' },
  { id: 'isolated', label: 'f(1) defined elsewhere', blurb: 'Now f(1) exists — and you can drag it anywhere. Watch the limit.' },
];

export function PointLab() {
  const [mode, setMode] = useState<PointMode>('hole');
  const [pointY, setPointY] = useState(5);
  const [xs, setXs] = useState<Record<Side, number>>(() => ({
    left: resetApproach('left'),
    right: resetApproach('right'),
  }));

  const left = useMemo(() => readApproach('left', xs.left), [xs.left]);
  const right = useMemo(() => readApproach('right', xs.right), [xs.right]);
  const value = valueAtA(mode, pointY);
  const onHole = pointSitsOnHole(mode, pointY);

  const move = useCallback(
    (side: Side, x: number) => setXs((prev) => ({ ...prev, [side]: clampToSide(side, x) })),
    [],
  );
  const closer = useCallback(
    () => setXs((prev) => ({ left: stepCloser('left', prev.left), right: stepCloser('right', prev.right) })),
    [],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Calculus · Interactive definition</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Limit vs Function Value</h1>
        <p className="mt-3 text-base text-slate-400">
          The point doesn&rsquo;t decide the limit. Move f(1) wherever you like and watch what refuses to change.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="What happens at x = 1" className="inline-flex rounded-xl border border-slate-700 p-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                type="button"
                data-mode={m.id}
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={'rounded-lg px-3 py-1.5 text-xs font-bold transition ' + (mode === m.id ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" data-action="closer" onClick={closer} className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10">Closer →</button>
            {mode === 'isolated' && (
              <button type="button" data-action="on-hole" onClick={() => setPointY(HOLE_Y)} className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">Put it on the hole</button>
            )}
            <button type="button" data-action="restart" onClick={() => { setXs({ left: resetApproach('left'), right: resetApproach('right') }); setPointY(5); }} className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200">Start over</button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <p className="mb-1 text-sm text-slate-400">{MODES.find((m) => m.id === mode)!.blurb}</p>
            <PointGraph
              mode={mode}
              pointY={pointY}
              left={left}
              right={right}
              onMoveLeft={(x) => move('left', x)}
              onMoveRight={(x) => move('right', x)}
              onMovePoint={(y) => setPointY(clampPointY(y))}
            />
            <p className="mt-1 text-xs text-slate-500">
              {mode === 'isolated' ? 'Drag the green point up and down. The dashed green line stays where it is.' : 'Drag either approaching point — neither can reach x = 1.'}
            </p>

            {/* 两个写法并排:除了 x = 1,它们处处相同 */}
            <section data-panel="forms" className="mt-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Same function, two ways to write it</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-100">
                <span className="text-lg"><Tex src={`f(x) = ${RAW_TEX}`} /></span>
                <span className="text-slate-500">=</span>
                <span className="text-lg"><Tex src={SIMPLIFIED_TEX} /></span>
                <span className="font-mono text-xs text-slate-500">for every x except 1</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Cancelling <span className="font-mono">(x − 1)</span> is only legal when it is not zero. That single
                excluded input is the hole.
              </p>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {/* 两个走近的点 */}
            <section data-panel="approach" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Both sides head for the hole</p>
              <div className="mt-3 space-y-1.5 font-mono text-sm">
                {SIDES.map((side) => {
                  const a = side === 'left' ? left : right;
                  return (
                    <p key={side} data-side={side} className="flex items-baseline justify-between gap-3">
                      <span style={{ color: side === 'left' ? LAB.x1 : LAB.x2 }} data-readout="x">{a.x.toFixed(3)}</span>
                      <span className="text-slate-600">→</span>
                      <span style={{ color: side === 'left' ? LAB.x1 : LAB.x2 }} data-readout="y">{a.y.toFixed(3)}</span>
                    </p>
                  );
                })}
              </div>
            </section>

            {/* ⭐ 这一节的核心对照 */}
            <section
              data-panel="contrast"
              data-limit={String(limitAtHole())}
              data-value={value === null ? 'undefined' : String(Number(value.toFixed(3)))}
              data-same={onHole ? 'yes' : 'no'}
              className="rounded-2xl border p-4"
              style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0d` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Put them side by side</p>

              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Function value · the exact point</p>
                <p className="mt-1 text-base text-slate-100"><Tex src={valueTex(mode, pointY)} /></p>
              </div>

              <p className="my-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">but</p>

              <div className="rounded-xl border px-3 py-2.5" style={{ borderColor: `${LAB.pass}66` }}>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: LAB.pass }}>Limit · nearby behaviour</p>
                <p className="mt-1 text-base text-slate-100"><Tex src={LIMIT_TEX} /></p>
              </div>

              <p className="mt-3 text-sm leading-relaxed" style={{ color: LAB.pass }}>
                {mode === 'hole'
                  ? 'Nothing is there. The limit does not care.'
                  : onHole
                    ? `They happen to match at ${showShort(limitAtHole())} — they are allowed to. They just do not have to.`
                    : 'The point moved. The limit did not.'}
              </p>
            </section>

            <section data-panel="mental-model" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The whole idea</p>
              <div className="mt-3 grid gap-2">
                <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
                  <span className="font-bold" style={{ color: LAB.pass }}>LIMIT</span>
                  <span className="text-slate-400"> — where the function is heading</span>
                </p>
                <p className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs">
                  <span className="font-bold text-slate-200">FUNCTION VALUE</span>
                  <span className="text-slate-400"> — what happens at the exact point</span>
                </p>
                <p className="px-1 text-xs text-slate-500">They may be equal. They do not have to be.</p>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
