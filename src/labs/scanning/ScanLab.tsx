/**
 * LAB — 「Scan the Curve」:在一段区间上,函数是增、是减,还是不变?
 *
 * 交互只有一件事:**把窗口拖来拖去,看那一段被点亮的曲线在干什么。**
 * 没有公式要读,没有长段落 —— 结论由画面给出,文字只负责命名。
 *
 * ⚠️ 窗口跨过转折点时给的是 **MIXED**,不是"上升"或"下降"。
 * 这是这一节存在的理由:学生最常犯的错就是比一下两端就下结论,
 * 而那在跨过极值的区间上必然出错(`scanning.ts` 里有一条测试专门钉这个坑)。
 *
 * 结构:
 *   ScanLab —— 唯一的状态持有者(哪条曲线、窗口在哪、挑战有没有过)
 *     ├ ScanGraph   受控,只画
 *     └ Verdict / Split / Intervals / MentalModel  受控,只读
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScanGraph } from './ScanGraph';
import { Intervals, MentalModel, Split, Verdict } from './ScanPanels';
import { BEHAVIOUR_COLOR, LAB, useSweep } from './theme';
import {
  BEHAVIOUR_COPY,
  CURVES,
  CURVE_ORDER,
  clampWindow,
  formatInterval,
  moveLeftEdge,
  moveRightEdge,
  moveWindow,
  readWindow,
  type CurveId,
  type Window,
} from '../../math/scanning';

/** 每条曲线开局把窗口放在哪 —— 挑一段**单一走向**的,先让人看懂读法。 */
const OPENING: Readonly<Record<CurveId, Window>> = {
  wave: { from: 0.6, to: 2.4 },
  plateau: { from: 4, to: 6 },
  challenge: { from: 0.4, to: 1.6 },
};

/** 值得一看的几个位置。省得为了找到转折点来回拖。 */
const PRESETS: Readonly<Record<CurveId, readonly { label: string; win: Window }[]>> = {
  wave: [
    { label: 'A rising stretch', win: { from: 0.6, to: 2.4 } },
    { label: 'A falling stretch', win: { from: 3.6, to: 6.4 } },
    { label: 'Across the top', win: { from: 2, to: 4.4 } },
  ],
  plateau: [
    { label: 'The flat stretch', win: { from: 4, to: 6 } },
    { label: 'Across its edge', win: { from: 2.8, to: 4.6 } },
  ],
  challenge: [{ label: 'Start over', win: { from: 0.4, to: 1.6 } }],
};

export function ScanLab() {
  const [curveId, setCurveId] = useState<CurveId>('wave');
  const curve = CURVES[curveId];
  const [win, setWin] = useState<Window>(() => clampWindow(CURVES.wave, OPENING.wave));
  /** 挑战:亲手选中过一段完全递增的区间就记住 */
  const [solved, setSolved] = useState(false);

  const reading = useMemo(() => readWindow(curve, win), [curve, win]);
  const { t: sweepT, animated } = useSweep();

  const switchCurve = useCallback((id: CurveId) => {
    setCurveId(id);
    setWin(clampWindow(CURVES[id], OPENING[id]));
    setSolved(false);
  }, []);

  const onMoveWindow = useCallback((by: number) => setWin((w) => moveWindow(curve, w, by)), [curve]);
  const onMoveLeft = useCallback((x: number) => setWin((w) => moveLeftEdge(curve, w, x)), [curve]);
  const onMoveRight = useCallback((x: number) => setWin((w) => moveRightEdge(curve, w, x)), [curve]);

  // 挑战过关就记住 —— 拖走了也不该前功尽弃。
  useEffect(() => {
    if (curveId === 'challenge' && reading.behaviour === 'up') setSolved(true);
  }, [curveId, reading.behaviour]);

  const challenge = curveId === 'challenge';
  const color = BEHAVIOUR_COLOR[reading.behaviour];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Increasing and Decreasing Intervals
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Scan the curve. Drag the window and read what happens left to right.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a curve" className="inline-flex flex-wrap rounded-xl border border-slate-700 p-1">
            {CURVE_ORDER.map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                data-curve={id}
                aria-selected={curveId === id}
                onClick={() => switchCurve(id)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition ' +
                  (curveId === id ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
                }
              >
                {CURVES[id].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS[curveId].map((preset) => (
              <button
                key={preset.label}
                type="button"
                data-preset={preset.label}
                onClick={() => setWin(clampWindow(curve, preset.win))}
                className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="min-w-0">
            <p className="mb-1 text-sm text-slate-400">{curve.blurb}</p>
            <ScanGraph
              curve={curve}
              reading={reading}
              sweepT={sweepT}
              onMoveWindow={onMoveWindow}
              onMoveLeft={onMoveLeft}
              onMoveRight={onMoveRight}
            />
            <p className="mt-1 text-xs text-slate-500">
              Drag the band to move the window; drag <span className="text-cyan-300">start</span> or{' '}
              <span className="text-amber-300">end</span> to resize it.
              {!animated && ' Motion is reduced, so the dot is parked at the left.'}
            </p>
            <div className="mt-3">
              <MentalModel />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            <Verdict reading={reading} />
            <Split reading={reading} />
            <Intervals curve={curve} reading={reading} />
          </div>
        </div>

        {/* ── 挑战 ─────────────────────────────────────────────────── */}
        <div className="border-t border-slate-700 px-4 py-4 sm:px-5">
          {!challenge ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">Ready to try one you have not seen?</p>
              <button
                type="button"
                data-action="challenge"
                onClick={() => switchCurve('challenge')}
                className="rounded-xl border border-amber-400/40 px-3 py-2 text-xs font-bold text-amber-200 transition hover:border-amber-300 hover:bg-amber-500/10"
              >
                Find an increasing interval →
              </button>
            </div>
          ) : (
            <div
              data-panel="challenge"
              data-solved={solved ? 'yes' : 'no'}
              data-result={reading.behaviour === 'up' ? 'pass' : reading.behaviour === 'mixed' ? 'mixed' : 'other'}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Find an increasing interval
                </p>
                {/*
                  ⚠️ 三种回答,不是两种。提示词只列了"全程递增"与"中途变向",
                  但学生完全可能选中一段**全程递减**的区间 —— 那既不是对的答案,
                  也不是"行为变了"。含糊地说"behaviour changes"会把他教糊涂。
                */}
                <p className="mt-1 text-sm font-bold" style={{ color }}>
                  {reading.behaviour === 'up' && '✓ Increasing throughout this interval.'}
                  {reading.behaviour === 'mixed' && '× The behaviour changes inside this interval.'}
                  {reading.behaviour === 'down' && '× That interval is decreasing, not increasing.'}
                  {reading.behaviour === 'flat' && '× That interval is constant, not increasing.'}
                </p>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {formatInterval({ from: reading.from, to: reading.to })} ·{' '}
                  {BEHAVIOUR_COPY[reading.behaviour].label}
                  {solved && reading.behaviour !== 'up' && ' · you already found one'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-action="back-to-wave"
                  onClick={() => switchCurve('wave')}
                  className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-slate-500 hover:text-white"
                  style={solved ? { borderColor: `${LAB.pass}66`, color: '#d1fae5' } : undefined}
                >
                  ← Back to the first curve
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
