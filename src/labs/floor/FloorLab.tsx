/**
 * LAB — 「Drop to the Integer」
 *
 * 一个实验台,刻意做得小:一条数轴(或阶梯图)、一个可拖的 x、一块读数。没有翻页。
 *
 * ⚠️ 全节的重量都压在**负数**上。⌊-1.3⌋ = -2,不是 -1。
 * 所以只要 x 是负的非整数,界面就会:
 *   ① 把上面那个整数 n+1 单独标出来,并写明它 **> x**(所以违反 n ≤ x);
 *   ② 弹出那句 "floor means DOWN, not toward zero"。
 * 不能只在文字里提一句 —— 学生看的是图。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/floorFunction.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useMemo, useState } from 'react';
import { NumberLineView, StepGraphView } from './FloorViews';
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import {
  DOMAIN,
  STEP,
  readFloor,
  showN,
  showX,
  snapX,
  type FloorReading,
} from '../../math/floorFunction';

type Mode = 'line' | 'graph';

/** 提示词点名的三个例子 —— 一键跳过去,负数那个单独染色 */
const EXAMPLES: readonly { x: number; tone: 'plain' | 'warn' }[] = [
  { x: 4.7, tone: 'plain' },
  { x: 5, tone: 'plain' },
  { x: -1.3, tone: 'warn' },
];

/** 算不出来时退回 4.7,**绝不返回 NaN**。 */
function readOr(x: number): FloorReading {
  return readFloor(x) ?? readFloor(4.7)!;
}

export function FloorLab() {
  const [mode, setMode] = useState<Mode>('line');
  const [x, setX] = useState(4.7);
  const reading = useMemo(() => readOr(x), [x]);

  const moveX = useCallback((next: number) => setX(snapX(next)), []);

  /** 负的非整数 —— 唯一会出错的情形 */
  const trap = reading.x < 0 && !reading.exact;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Drop to the Integer
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Pick a number. Look downward. Find the greatest integer that does not pass it.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a view" className="inline-flex rounded-xl border border-slate-700 p-1">
            {([
              { id: 'line', label: 'Number line' },
              { id: 'graph', label: 'Graph' },
            ] as const).map((v) => (
              <button
                key={v.id}
                role="tab"
                type="button"
                aria-selected={mode === v.id}
                onClick={() => setMode(v.id)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ' +
                  (mode === v.id ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
                }
              >
                {v.label}
              </button>
            ))}
          </div>
          <div className="text-lg text-slate-100">
            <Tex src="f(x) = \lfloor x \rfloor" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {mode === 'line' ? (
              <NumberLineView reading={reading} onChangeX={moveX} />
            ) : (
              <StepGraphView reading={reading} onChangeX={moveX} />
            )}

            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <label htmlFor="floor-x" className="w-3 shrink-0 font-mono text-xs font-bold" style={{ color: LAB.x2 }}>
                  x
                </label>
                <input
                  id="floor-x"
                  type="range"
                  min={DOMAIN.a}
                  max={DOMAIN.b}
                  step={STEP}
                  value={reading.x}
                  onChange={(e) => moveX(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700"
                  style={{ accentColor: LAB.x2 }}
                  aria-valuetext={`x equals ${showX(reading.x)}`}
                />
                <output htmlFor="floor-x" className="w-11 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
                  {showX(reading.x)}
                </output>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-slate-500">Try:</span>
                {EXAMPLES.map((e) => (
                  <button
                    key={e.x}
                    type="button"
                    data-example={showX(e.x)}
                    onClick={() => moveX(e.x)}
                    className={
                      'rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition ' +
                      (e.tone === 'warn'
                        ? 'border-red-400/50 text-red-200 hover:border-red-300 hover:bg-red-500/10'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white')
                    }
                  >
                    x = {showX(e.x)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Drag the amber dot, use the slider, or focus the dot and press ← →.
              </p>
            </div>
          </div>

          {/* 读数 */}
          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            <div className="rounded-xl border bg-slate-950/60 px-4 py-3" style={{ borderColor: `${LAB.x2}40` }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: LAB.x2 }}>
                Pick a number
              </span>
              <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums" style={{ color: LAB.x2 }}>
                x = {showX(reading.x)}
              </div>
            </div>

            <div className="flex justify-center py-1" aria-hidden="true">
              <svg width="16" height="22" viewBox="0 0 16 22">
                <line x1="8" y1="0" x2="8" y2="14" stroke={STATE.pass.color} strokeWidth="1.6" strokeDasharray="3 3" />
                <path d="M4 13 L8 20 L12 13" fill="none" stroke={STATE.pass.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <div
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: `${STATE.pass.color}55`, backgroundColor: `${STATE.pass.color}0f` }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: STATE.pass.color }}>
                Drop to the integer
              </span>
              <div className="mt-2 text-2xl text-slate-100">
                <Tex src={`\\lfloor ${showX(reading.x)} \\rfloor = ${showN(reading.n)}`} />
              </div>
              <p className="mt-2 text-sm" style={{ color: STATE.pass.color }}>
                Greatest integer ≤ {showX(reading.x)}
              </p>
            </div>

            {/* 定义的两个条件,逐条对照 */}
            <div className="mt-3 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 font-mono text-xs tabular-nums">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300">
                  {showN(reading.n)} ≤ {showX(reading.x)}
                </span>
                <span style={{ color: STATE.pass.color }}>✓ does not pass x</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-300">
                  {showN(reading.n + 1)} &gt; {showX(reading.x)}
                </span>
                <span style={{ color: STATE.fail.color }}>× next one passes it</span>
              </div>
            </div>

            {reading.exact && (
              <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                x is already an integer, so it does not need to drop. An integer is{' '}
                <em>less than or equal to</em> itself.
              </p>
            )}

            {/*
              ⚠️ 负数警告。这是这一节存在的理由,所以给它最强的视觉分量,
              而且**同时**在图上把 n+1 标红 —— 只写文字学生不会读。
            */}
            {trap && (
              <div
                className="mt-3 rounded-xl border px-4 py-3"
                style={{ borderColor: `${STATE.fail.color}66`, backgroundColor: `${STATE.fail.color}12` }}
              >
                <p className="text-sm font-bold" style={{ color: STATE.fail.color }}>
                  <span aria-hidden="true">×</span> Be careful: floor means DOWN, not toward zero.
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                  Chopping off the decimals would give{' '}
                  <strong className="font-mono text-red-200">{showN(reading.n + 1)}</strong> — but{' '}
                  <span className="font-mono">
                    {showN(reading.n + 1)} &gt; {showX(reading.x)}
                  </span>
                  , so it passes x and is not allowed. Going down to{' '}
                  <strong className="font-mono text-green-300">{showN(reading.n)}</strong> keeps{' '}
                  <span className="font-mono">
                    {showN(reading.n)} ≤ {showX(reading.x)}
                  </span>
                  .
                </p>
              </div>
            )}

            {mode === 'graph' && (
              <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                The highlighted step covers{' '}
                <span className="font-mono text-slate-200">
                  {showN(reading.stepFrom)} ≤ x &lt; {showN(reading.stepTo)}
                </span>
                . Filled circle on the left — that endpoint belongs to this step. Hollow on the
                right — that one already belongs to the next.
              </p>
            )}
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        4.7 drops to 4. But −1.3 drops to −2, not −1.
      </p>
    </main>
  );
}
