/**
 * LAB — 「Where Is x Allowed?」
 *
 * 一个实验台,三条曲线切换。没有翻页。
 *
 * ⚠️ 定义域是关于**输入**的事,所以判决卡说的是"这个输入能不能进",
 * 不是"这个点在不在曲线上"。措辞一路统一成过滤器的口吻:
 *   Choose an input → Can the function accept it? → 能就属于定义域,不能就不属于。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/domain.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useMemo, useState } from 'react';
import { DomainView } from './DomainView';
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import {
  DOMAIN_RANGE,
  FUNCTIONS,
  STEP,
  readDomain,
  showX,
  showY,
  snapX,
  type DomainReading,
} from '../../math/domain';

/** 每条曲线配几个一键跳过去的 x:两个合法、一个非法(提示词点名的那些)。 */
const EXAMPLES: Readonly<Record<string, readonly { x: number; bad: boolean }[]>> = {
  sqrt: [
    { x: 4, bad: false },
    { x: 0, bad: false },
    { x: -2, bad: true },
  ],
  reciprocal: [
    { x: 2, bad: false },
    { x: -1, bad: false },
    { x: 0, bad: true },
  ],
  shifted: [
    { x: 6, bad: false },
    { x: 2, bad: false },
    { x: 1, bad: true },
  ],
};

function readOr(fnIndex: number, x: number): DomainReading {
  const fn = FUNCTIONS[fnIndex]!;
  return readDomain(fn, x) ?? readDomain(fn, fn.allowed[0]?.from ?? 0)!;
}

export function DomainLab() {
  const [fnIndex, setFnIndex] = useState(0);
  const [x, setX] = useState(4);
  const fn = FUNCTIONS[fnIndex]!;
  const reading = useMemo(() => readOr(fnIndex, x), [fnIndex, x]);

  const moveX = useCallback((next: number) => setX(snapX(next)), []);

  const switchFn = useCallback((index: number) => {
    setFnIndex(index);
    // 换函数时跳到一个**合法**的起点,免得一上来就是红叉
    const first = EXAMPLES[FUNCTIONS[index]!.id]?.[0]?.x ?? 4;
    setX(snapX(first));
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Where Is x Allowed?
        </h1>
        <p className="mt-3 text-base text-slate-400">
          The domain is a filter on inputs. Choose one and see whether the function can accept it.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a function" className="inline-flex flex-wrap rounded-xl border border-slate-700 p-1">
            {FUNCTIONS.map((f, i) => (
              <button
                key={f.id}
                role="tab"
                type="button"
                data-function={f.id}
                aria-selected={fnIndex === i}
                onClick={() => switchFn(i)}
                className={
                  'rounded-lg px-3 py-1.5 font-mono text-xs font-bold transition ' +
                  (fnIndex === i ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-lg text-slate-100">
            <Tex src={fn.tex} />
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <DomainView fn={fn} reading={reading} onChangeX={moveX} />

            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="domain-x"
                  className="w-3 shrink-0 font-mono text-xs font-bold"
                  style={{ color: reading.allowed ? LAB.x2 : LAB.fail }}
                >
                  x
                </label>
                <input
                  id="domain-x"
                  type="range"
                  min={DOMAIN_RANGE.a}
                  max={DOMAIN_RANGE.b}
                  step={STEP}
                  value={reading.x}
                  onChange={(e) => moveX(Number(e.target.value))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700"
                  style={{ accentColor: reading.allowed ? LAB.x2 : LAB.fail }}
                  aria-valuetext={`x equals ${showX(reading.x)}, ${reading.allowed ? 'allowed' : 'not allowed'}`}
                />
                <output
                  htmlFor="domain-x"
                  className="w-11 shrink-0 text-right font-mono text-xs tabular-nums"
                  style={{ color: reading.allowed ? LAB.x2 : LAB.fail }}
                >
                  {showX(reading.x)}
                </output>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="text-[11px] text-slate-500">Try:</span>
                {(EXAMPLES[fn.id] ?? []).map((e) => (
                  <button
                    key={e.x}
                    type="button"
                    data-example={showX(e.x)}
                    onClick={() => moveX(e.x)}
                    className={
                      'rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition ' +
                      (e.bad
                        ? 'border-red-400/50 text-red-200 hover:border-red-300 hover:bg-red-500/10'
                        : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white')
                    }
                  >
                    x = {showX(e.x)}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Drag the dot, use the slider, or focus the dot and press ← →.
              </p>
            </div>
          </div>

          {/* ── 判决 ── */}
          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            <div
              className="rounded-xl border bg-slate-950/60 px-4 py-3"
              style={{ borderColor: `${reading.allowed ? LAB.x2 : STATE.fail.color}40` }}
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Choose an input
              </span>
              <div
                className="mt-1.5 font-mono text-2xl font-bold tabular-nums"
                style={{ color: reading.allowed ? LAB.x2 : STATE.fail.color }}
              >
                x = {showX(reading.x)}
              </div>
            </div>

            <div className="flex justify-center py-1" aria-hidden="true">
              <svg width="16" height="22" viewBox="0 0 16 22">
                <line
                  x1="8"
                  y1="0"
                  x2="8"
                  y2="14"
                  stroke={reading.allowed ? STATE.pass.color : STATE.fail.color}
                  strokeWidth="1.6"
                  strokeDasharray="3 3"
                />
                <path
                  d="M4 13 L8 20 L12 13"
                  fill="none"
                  stroke={reading.allowed ? STATE.pass.color : STATE.fail.color}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div
              data-verdict={reading.allowed ? 'valid' : 'invalid'}
              className="rounded-xl border px-4 py-3"
              style={{
                borderColor: `${reading.allowed ? STATE.pass.color : STATE.fail.color}55`,
                backgroundColor: `${reading.allowed ? STATE.pass.color : STATE.fail.color}0f`,
                transition: 'background-color 220ms ease, border-color 220ms ease',
              }}
            >
              <p
                className="text-base font-bold uppercase tracking-[0.14em]"
                style={{ color: reading.allowed ? STATE.pass.color : STATE.fail.color }}
              >
                <span aria-hidden="true">{reading.allowed ? '✓' : '×'}</span>{' '}
                {reading.allowed ? 'Valid input' : 'Invalid input'}
              </p>

              {reading.allowed ? (
                <>
                  <div className="mt-2 text-xl text-slate-100">
                    <Tex src={`f(${showX(reading.x)}) = ${showY(reading.y)}`} />
                  </div>
                  <p className="mt-2 text-sm" style={{ color: STATE.pass.color }}>
                    The function accepted it, so x belongs to the domain.
                  </p>
                </>
              ) : (
                <>
                  {/*
                    ⚠️ 先把**没法算的那个式子**摆出来,再说结论。
                    直接写 "undefined" 学生不知道卡在哪一步。
                  */}
                  <div className="mt-2 font-mono text-lg text-red-100">
                    {fn.id === 'reciprocal' ? (
                      <Tex src={`\\dfrac{1}{${showX(reading.x)}}`} />
                    ) : (
                      <Tex
                        src={
                          fn.id === 'sqrt'
                            ? `\\sqrt{${showX(reading.x)}}`
                            : `\\sqrt{${showX(reading.x)} - 2}`
                        }
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm font-semibold" style={{ color: STATE.fail.color }}>
                    {fn.id === 'reciprocal' ? 'Undefined.' : 'Not a real number.'}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                    {fn.reason} So x does not belong to the domain.
                  </p>
                </>
              )}
            </div>

            {/* 边界时刻:正好踩在闭端点上 */}
            {reading.onClosedEdge && (
              <p className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-3 py-2 text-xs leading-relaxed text-cyan-100">
                This is the edge — and it <strong>is</strong> included. The square root of zero is
                zero, so the bracket is square: <Tex src={fn.intervalTex} />
              </p>
            )}

            {/* 边界时刻:正好踩在被挖掉的那个点上 */}
            {reading.onHole && (
              <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/5 px-3 py-2 text-xs leading-relaxed text-red-100">
                Exactly one input is missing. Everything on both sides is fine — which is why the
                domain is written as two pieces, each with a round bracket at 0.
              </p>
            )}

            {/* 定义域本身 */}
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Domain
              </p>
              <div className="mt-2 text-lg text-slate-100">
                <Tex src={fn.conditionTex} />
              </div>
              <div className="mt-1.5 text-base text-cyan-200">
                <Tex src={fn.intervalTex} />
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-xs">
                <span className="text-slate-300">The function can accept it</span>
                <span className="font-bold" style={{ color: STATE.pass.color }}>✓ in the domain</span>
                <span className="text-slate-300">It cannot</span>
                <span className="font-bold" style={{ color: STATE.fail.color }}>× not in the domain</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        The domain is not part of the formula. It is the list of inputs the formula survives.
      </p>
    </main>
  );
}
