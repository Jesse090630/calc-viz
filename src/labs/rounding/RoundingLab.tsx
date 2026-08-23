/**
 * LAB — 「Drop to the Integer」/「Jump to the Integer」
 *
 * **一个组件,两节课。** `#/floor` 与 `#/ceiling` 只差一个默认方向和标题;
 * 视图、读数、比较模式全部共用。做成两份迟早只改一处。
 *
 * ⚠️ 两个方向的陷阱位置**正好相反**,这是这一对课最值钱的地方:
 *   下取整:朝零截断在**负数**上错(⌊-1.3⌋ = -2,不是 -1)
 *   上取整:朝零截断在**正数**上错(⌈4.2⌉ = 5,不是 4)
 * 所以警告文案不是写死的,而是跟着方向走 —— 各自指向自己那一侧的坑。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/rounding.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useMemo, useState } from 'react';
import { NumberLineView, StepGraphView } from './RoundingViews';
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import {
  DOMAIN,
  ROUND,
  STEP,
  readRounding,
  showN,
  showX,
  snapX,
  type Direction,
  type RoundingReading,
} from '../../math/rounding';

type View = 'line' | 'graph';

/** 每个方向自己的门面文字 */
const FACE: Readonly<Record<Direction, {
  title: string;
  lede: string;
  /** 一键跳过去的例子。第三个刻意是"截断会给错"的那一侧。 */
  examples: readonly { x: number; warn: boolean }[];
  /** 截断给出的错误答案落在哪一侧 */
  trapWhen: (r: RoundingReading) => boolean;
  footer: string;
}>> = {
  floor: {
    title: 'Drop to the Integer',
    lede: 'Pick a number. Look downward. Find the greatest integer that does not pass it.',
    examples: [
      { x: 4.7, warn: false },
      { x: 5, warn: false },
      { x: -1.3, warn: true },
    ],
    // 朝零截断在负数上给出 n+1 —— 错的那一侧
    trapWhen: (r) => r.x < 0 && !r.exact,
    footer: '4.7 drops to 4. But −1.3 drops to −2, not −1.',
  },
  ceiling: {
    title: 'Jump to the Integer',
    lede: 'Pick a number. Look upward. Find the smallest integer it does not pass.',
    examples: [
      { x: 4.2, warn: true },
      { x: 5, warn: false },
      { x: -1.3, warn: false },
    ],
    // 朝零截断在正数上给出 n−1 —— 错的那一侧
    trapWhen: (r) => r.x > 0 && !r.exact,
    footer: '4.2 jumps to 5. And −1.3 jumps to −1, not −2.',
  },
};

function readOr(x: number, direction: Direction): RoundingReading {
  return readRounding(x, direction) ?? readRounding(4.2, direction)!;
}

export function RoundingLab({ initial }: { initial: Direction }) {
  const [direction, setDirection] = useState<Direction>(initial);
  const [compare, setCompare] = useState(false);
  const [view, setView] = useState<View>('line');
  const [x, setX] = useState(initial === 'floor' ? 4.7 : 4.2);

  const reading = useMemo(() => readOr(x, direction), [x, direction]);
  const opposite: Direction = direction === 'floor' ? 'ceiling' : 'floor';
  const otherReading = useMemo(() => readOr(x, opposite), [x, opposite]);
  const meta = ROUND[direction];
  const face = FACE[direction];

  const moveX = useCallback((next: number) => setX(snapX(next)), []);
  const trap = !compare && face.trapWhen(reading);

  /** 比较模式里两个方向按 ⌊⌋ / ⌈⌉ 固定顺序排,不跟着当前方向变 —— 否则读者要重新找位置 */
  const both = useMemo(
    () => [readOr(x, 'floor'), readOr(x, 'ceiling')] as const,
    [x],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {face.title}
        </h1>
        <p className="mt-3 text-base text-slate-400">{face.lede}</p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            {/* FLOOR | CEILING */}
            <div role="tablist" aria-label="Choose a function" className="inline-flex rounded-xl border border-slate-700 p-1">
              {(['floor', 'ceiling'] as const).map((d) => (
                <button
                  key={d}
                  role="tab"
                  type="button"
                  data-direction={d}
                  aria-selected={!compare && direction === d}
                  onClick={() => {
                    setDirection(d);
                    setCompare(false);
                  }}
                  className={
                    'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ' +
                    (!compare && direction === d
                      ? 'bg-amber-400/15 text-amber-100'
                      : 'text-slate-400 hover:text-slate-200')
                  }
                >
                  {ROUND[d].label}
                </button>
              ))}
              <button
                role="tab"
                type="button"
                data-direction="compare"
                aria-selected={compare}
                onClick={() => setCompare(true)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ' +
                  (compare ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-400 hover:text-slate-200')
                }
              >
                Compare
              </button>
            </div>

            {/* NUMBER LINE | GRAPH */}
            <div role="tablist" aria-label="Choose a view" className="inline-flex rounded-xl border border-slate-700 p-1">
              {([
                { id: 'line', label: 'Number line' },
                { id: 'graph', label: 'Graph' },
              ] as const).map((v) => (
                <button
                  key={v.id}
                  role="tab"
                  type="button"
                  aria-selected={view === v.id}
                  onClick={() => setView(v.id)}
                  className={
                    'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ' +
                    (view === v.id ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
                  }
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-lg text-slate-100">
            {compare ? (
              <Tex src="\lfloor x \rfloor \quad\text{vs}\quad \lceil x \rceil" />
            ) : (
              <Tex src={`f(x) = ${meta.tex('x')}`} />
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {view === 'line' ? (
              <NumberLineView
                reading={reading}
                onChangeX={moveX}
                other={compare ? otherReading : null}
              />
            ) : (
              <StepGraphView reading={reading} onChangeX={moveX} />
            )}

            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <label htmlFor="round-x" className="w-3 shrink-0 font-mono text-xs font-bold" style={{ color: LAB.x2 }}>
                  x
                </label>
                <input
                  id="round-x"
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
                <output htmlFor="round-x" className="w-11 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
                  {showX(reading.x)}
                </output>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-slate-500">Try:</span>
                {face.examples.map((e) => (
                  <button
                    key={e.x}
                    type="button"
                    data-example={showX(e.x)}
                    onClick={() => moveX(e.x)}
                    className={
                      'rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition ' +
                      (e.warn && !compare
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

          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            <div className="rounded-xl border bg-slate-950/60 px-4 py-3" style={{ borderColor: `${LAB.x2}40` }}>
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: LAB.x2 }}>
                Pick a number
              </span>
              <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums" style={{ color: LAB.x2 }}>
                x = {showX(reading.x)}
              </div>
            </div>

            {compare ? (
              /* ── 比较模式:同一个 x,两个结果并排 ── */
              <>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {both.map((r, i) => (
                    <div
                      key={r.direction}
                      data-compare={r.direction}
                      className="rounded-xl border px-3 py-3 text-center"
                      style={{
                        borderColor: `${i === 0 ? STATE.pass.color : LAB.x1}55`,
                        backgroundColor: `${i === 0 ? STATE.pass.color : LAB.x1}0f`,
                      }}
                    >
                      <p
                        className="text-[10px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: i === 0 ? STATE.pass.color : LAB.x1 }}
                      >
                        {ROUND[r.direction].label} {ROUND[r.direction].arrow}
                      </p>
                      <div className="mt-2 text-xl text-slate-100">
                        <Tex src={`${ROUND[r.direction].tex(showX(r.x))} = ${showN(r.n)}`} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                  <div className="text-center text-base text-slate-100">
                    <Tex
                      src={`${showN(both[0].n)} \\le ${showX(reading.x)} \\le ${showN(both[1].n)}`}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {reading.exact ? (
                      <>x is already an integer, so both land on it — the only time they agree.</>
                    ) : (
                      <>
                        Floor goes <strong className="text-green-300">down</strong>, ceiling goes{' '}
                        <strong className="text-cyan-300">up</strong>. They sit on either side of x
                        and are always exactly 1 apart unless x is an integer.
                      </>
                    )}
                  </p>
                </div>
                <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                  Neither one is “chop off the decimals”. At{' '}
                  <span className="font-mono text-slate-200">x = -1.3</span> chopping gives −1,
                  which is the <em>ceiling</em>. At{' '}
                  <span className="font-mono text-slate-200">x = 4.2</span> chopping gives 4, which
                  is the <em>floor</em>. It changes sides — that is why it is not a definition.
                </p>
              </>
            ) : (
              /* ── 单方向模式 ── */
              <>
                <div className="flex justify-center py-1" aria-hidden="true">
                  <svg width="16" height="22" viewBox="0 0 16 22">
                    <line x1="8" y1={direction === 'floor' ? 0 : 8} x2="8" y2={direction === 'floor' ? 14 : 22} stroke={STATE.pass.color} strokeWidth="1.6" strokeDasharray="3 3" />
                    <path
                      d={direction === 'floor' ? 'M4 13 L8 20 L12 13' : 'M4 9 L8 2 L12 9'}
                      fill="none"
                      stroke={STATE.pass.color}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: `${STATE.pass.color}55`, backgroundColor: `${STATE.pass.color}0f` }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: STATE.pass.color }}>
                    {direction === 'floor' ? 'Drop to the integer' : 'Jump to the integer'}
                  </span>
                  <div className="mt-2 text-2xl text-slate-100">
                    <Tex src={`${meta.tex(showX(reading.x))} = ${showN(reading.n)}`} />
                  </div>
                  <p className="mt-2 text-sm" style={{ color: STATE.pass.color }}>
                    {direction === 'floor' ? 'Greatest' : 'Smallest'} integer {meta.relation}{' '}
                    {showX(reading.x)}
                  </p>
                </div>

                <div className="mt-3 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 font-mono text-xs tabular-nums">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">
                      {showN(reading.n)} {meta.relation} {showX(reading.x)}
                    </span>
                    <span style={{ color: STATE.pass.color }}>✓ allowed</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">
                      {showN(reading.rejected)} {direction === 'floor' ? '>' : '<'} {showX(reading.x)}
                    </span>
                    <span style={{ color: STATE.fail.color }}>
                      × {direction === 'floor' ? 'passes it' : 'falls short'}
                    </span>
                  </div>
                </div>

                {reading.exact && (
                  <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                    x is already an integer, so it does not need to move. An integer is{' '}
                    <em>{direction === 'floor' ? 'less than or equal to' : 'greater than or equal to'}</em>{' '}
                    itself.
                  </p>
                )}

                {/*
                  ⚠️ 陷阱警告跟着方向走。
                  下取整的坑在负数,上取整的坑在正数 —— 写死一种就会在另一节课里指错地方。
                */}
                {trap && (
                  <div
                    className="mt-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: `${STATE.fail.color}66`, backgroundColor: `${STATE.fail.color}12` }}
                  >
                    <p className="text-sm font-bold" style={{ color: STATE.fail.color }}>
                      <span aria-hidden="true">×</span> Careful:{' '}
                      {direction === 'floor'
                        ? 'floor means DOWN, not toward zero.'
                        : 'ceiling means UP, not away from the decimals.'}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                      Chopping off the decimals would give{' '}
                      <strong className="font-mono text-red-200">{showN(reading.rejected)}</strong> —
                      but{' '}
                      <span className="font-mono">
                        {showN(reading.rejected)} {direction === 'floor' ? '>' : '<'}{' '}
                        {showX(reading.x)}
                      </span>
                      , so it {direction === 'floor' ? 'passes x' : 'falls short of x'} and is not
                      allowed. Going {direction === 'floor' ? 'down' : 'up'} to{' '}
                      <strong className="font-mono text-green-300">{showN(reading.n)}</strong> keeps{' '}
                      <span className="font-mono">
                        {showN(reading.n)} {meta.relation} {showX(reading.x)}
                      </span>
                      .
                    </p>
                  </div>
                )}
              </>
            )}

            {view === 'graph' && !compare && (
              <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed text-slate-400">
                The highlighted step covers{' '}
                <span className="font-mono text-slate-200">
                  {direction === 'floor'
                    ? `${showN(reading.stepFrom)} ≤ x < ${showN(reading.stepTo)}`
                    : `${showN(reading.stepFrom)} < x ≤ ${showN(reading.stepTo)}`}
                </span>
                .{' '}
                {direction === 'floor'
                  ? 'Filled circle on the left — that endpoint belongs to this step. Hollow on the right.'
                  : 'Hollow circle on the left, filled on the right — the endpoints swap sides compared with floor.'}
              </p>
            )}
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        {compare
          ? 'Chopping decimals is the floor for positives and the ceiling for negatives. Neither is a definition.'
          : face.footer}
      </p>
    </main>
  );
}
