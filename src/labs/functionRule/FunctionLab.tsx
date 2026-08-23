/**
 * LAB — 「One Input. One Output.」
 *
 * 三段,都在一屏里,靠一个 tab 切换。没有翻页。
 *
 * ⚠️ 全节压在一个**不对称**上,而学生几乎总是记反:
 *     一个输入 → 两个输出   ✗ 不是函数
 *     两个输入 → 一个输出   ✓ 仍然是函数
 * 所以第二段里"共享输出"那个例子必须**明确判为是函数**,而且要把共享的那个输出
 * 用**非警示色**圈出来 —— 学生看到重复的 5 第一反应就是喊"不是函数",
 * 界面必须抢在那句话之前把它标成"没问题"。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/functionRelation.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MachineView, MappingView, VerticalLineView } from './FunctionViews';
import { Tex } from '../shared/Tex';
import { LAB, STATE } from '../shared/theme';
import {
  CURVES,
  MACHINE,
  MACHINE_DOMAIN,
  RELATIONS,
  hasSharedOutput,
  isFunctionByGrouping,
  machineInputs,
  offendingInput,
  outputsOf,
  showInt,
  showValue,
} from '../../math/functionRelation';

type Part = 'machine' | 'mapping' | 'graph';

const PARTS: readonly { id: Part; label: string }[] = [
  { id: 'machine', label: 'The machine' },
  { id: 'mapping', label: 'Can this be a function?' },
  { id: 'graph', label: 'Vertical line' },
];

/** 小球走完全程的时间。够慢到看得见"进去再出来",够快到连着拖不烦人。 */
const TRAVEL_MS = 720;

export function FunctionLab() {
  const [part, setPart] = useState<Part>('machine');

  /* ── Part 1 ── */
  const [input, setInput] = useState(2);
  const [progress, setProgress] = useState(1);
  const frame = useRef<number | null>(null);
  const output = MACHINE.at(input);

  const send = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / TRAVEL_MS);
      setProgress(t);
      if (t < 1) frame.current = requestAnimationFrame(tick);
      else frame.current = null;
    };
    setProgress(0);
    frame.current = requestAnimationFrame(tick);
  }, []);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const chooseInput = useCallback(
    (next: number) => {
      setInput(Math.round(next));
      send();
    },
    [send],
  );

  /* ── Part 2 ── */
  const [relationIndex, setRelationIndex] = useState(0);
  const relation = RELATIONS[relationIndex % RELATIONS.length]!;
  const isFn = isFunctionByGrouping(relation.pairs);
  const bad = offendingInput(relation.pairs);
  const shared = hasSharedOutput(relation.pairs);
  const badOutputs = bad === null ? [] : outputsOf(relation.pairs, bad);

  /* ── Part 3 ── */
  const [curveIndex, setCurveIndex] = useState(0);
  const curve = CURVES[curveIndex % CURVES.length]!;
  const [lineX, setLineX] = useState(1.5);
  const hits = useMemo(() => curve.yAt(lineX), [curve, lineX]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Definition of a Function
        </h1>
        <p className="mt-3 text-base text-slate-400">
          A function gives every input exactly one output. Not “only one input per output”.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a part" className="inline-flex flex-wrap rounded-xl border border-slate-700 p-1">
            {PARTS.map((p) => (
              <button
                key={p.id}
                role="tab"
                type="button"
                data-part={p.id}
                aria-selected={part === p.id}
                onClick={() => setPart(p.id)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ' +
                  (part === p.id ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="text-lg text-slate-100">
            {part === 'machine' && <Tex src={MACHINE.tex} />}
            {part === 'graph' && <Tex src={curve.tex} />}
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,1fr)]">
          {/* ── 左:图形 ── */}
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            {part === 'machine' && (
              <>
                <MachineView input={input} output={output} progress={progress} />
                <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="fn-input" className="w-3 shrink-0 font-mono text-xs font-bold" style={{ color: LAB.x1 }}>
                      x
                    </label>
                    <input
                      id="fn-input"
                      type="range"
                      min={MACHINE_DOMAIN.a}
                      max={MACHINE_DOMAIN.b}
                      step={1}
                      value={input}
                      onChange={(e) => chooseInput(Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700"
                      style={{ accentColor: LAB.x1 }}
                      aria-valuetext={`input ${showInt(input)}`}
                    />
                    <output htmlFor="fn-input" className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
                      {showInt(input)}
                    </output>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-[11px] text-slate-500">Try:</span>
                    {[2, 3, 4].map((v) => (
                      <button
                        key={v}
                        type="button"
                        data-input={v}
                        onClick={() => chooseInput(v)}
                        className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
                      >
                        x = {v}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={send}
                      className="rounded-xl border border-amber-400/60 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/20"
                    >
                      ▶ Send it through
                    </button>
                  </div>
                </div>
              </>
            )}

            {part === 'mapping' && (
              <div className="flex justify-center py-2">
                <MappingView pairs={relation.pairs} offending={bad} sharedOutputs={shared} />
              </div>
            )}

            {part === 'graph' && (
              <>
                <VerticalLineView curve={curve} x={lineX} hits={hits} onChangeX={setLineX} />
                <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <label htmlFor="fn-line" className="w-3 shrink-0 font-mono text-xs font-bold" style={{ color: LAB.x2 }}>
                      x
                    </label>
                    <input
                      id="fn-line"
                      type="range"
                      min={-3.1}
                      max={4.2}
                      step={0.05}
                      value={lineX}
                      onChange={(e) => setLineX(Number(e.target.value))}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700"
                      style={{ accentColor: LAB.x2 }}
                      aria-valuetext={`vertical line at ${showValue(lineX)}`}
                    />
                    <output htmlFor="fn-line" className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
                      {showValue(lineX)}
                    </output>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Drag the amber line, use the slider, or focus it and press ← →.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ── 右:读数 ── */}
          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            {part === 'machine' && (
              <>
                <div className="rounded-xl border bg-slate-950/60 px-4 py-3" style={{ borderColor: `${LAB.x1}40` }}>
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: LAB.x1 }}>
                    One input
                  </span>
                  <div className="mt-1.5 font-mono text-2xl font-bold tabular-nums" style={{ color: LAB.x1 }}>
                    x = {showInt(input)}
                  </div>
                </div>
                <div className="flex justify-center py-1" aria-hidden="true">
                  <svg width="18" height="22" viewBox="0 0 18 22">
                    <line x1="9" y1="0" x2="9" y2="14" stroke={STATE.pass.color} strokeWidth="1.6" strokeDasharray="3 3" />
                    <path d="M5 13 L9 20 L13 13" fill="none" stroke={STATE.pass.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: `${STATE.pass.color}55`, backgroundColor: `${STATE.pass.color}0f` }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: STATE.pass.color }}>
                    Exactly one output
                  </span>
                  <div className="mt-2 text-2xl text-slate-100">
                    <Tex src={`f(${showInt(input)}) = ${showInt(output)}`} />
                  </div>
                  <p className="mt-2 font-mono text-sm tabular-nums" style={{ color: STATE.pass.color }}>
                    {showInt(input)} → f → {showInt(output)}
                  </p>
                </div>
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Ask again, same answer
                  </p>
                  <div className="mt-1.5 space-y-1 font-mono text-xs tabular-nums text-slate-300">
                    {machineInputs()
                      .filter((v) => Math.abs(v - input) <= 1)
                      .map((v) => (
                        <div key={v} className={v === input ? 'text-amber-200' : ''}>
                          {showInt(v)} → f → {showInt(MACHINE.at(v))}
                        </div>
                      ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Send the same input twice and the same output comes back. That is the whole
                    promise.
                  </p>
                </div>
              </>
            )}

            {part === 'mapping' && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {RELATIONS.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      data-relation={r.id}
                      onClick={() => setRelationIndex(i)}
                      className={
                        'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ' +
                        (i === relationIndex
                          ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div
                  /*
                    ⚠️ 判决单独挂一个属性。页面**底部那张对照表里永远写着**
                    "One input → two outputs × not a function",
                    靠搜文字判断当前结论会被它带偏(第一版的测试就是这么误报的)。
                    结论是状态,不该靠读文案反推。
                  */
                  data-verdict={isFn ? 'function' : 'not-function'}
                  className="mt-3 rounded-xl border px-4 py-3"
                  style={{
                    borderColor: `${isFn ? STATE.pass.color : STATE.fail.color}55`,
                    backgroundColor: `${isFn ? STATE.pass.color : STATE.fail.color}0f`,
                    transition: 'background-color 220ms ease, border-color 220ms ease',
                  }}
                >
                  <p
                    className="text-base font-bold uppercase tracking-[0.14em]"
                    style={{ color: isFn ? STATE.pass.color : STATE.fail.color }}
                  >
                    <span aria-hidden="true">{isFn ? '✓' : '×'}</span>{' '}
                    {isFn ? 'Function' : 'Not a function'}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{relation.note}</p>
                </div>

                {/* 违规时:把那两条出去的箭头写成数字 */}
                {!isFn && bad !== null && (
                  <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                    <p className="text-xs font-semibold text-red-200">
                      One input produced two outputs.
                    </p>
                    <div className="mt-1.5 space-y-1 font-mono text-sm tabular-nums text-slate-300">
                      {badOutputs.map((o) => (
                        <div key={o}>
                          {showInt(bad)} → {showInt(o)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/*
                  ⚠️ 共享输出时**主动**说明它没问题。
                  学生看到重复的输出第一反应就是喊"不是函数",
                  界面必须抢在那句话之前把它标成合法。
                */}
                {isFn && shared && (
                  <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-400/5 px-3 py-2.5">
                    <p className="text-xs font-semibold text-cyan-200">
                      Different inputs may share the same output.
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                      The dashed circle marks the shared output. The rule only says each{' '}
                      <strong className="text-slate-200">input</strong> gets one output — it never
                      says outputs must be unique.
                    </p>
                  </div>
                )}

                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                  <div className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-xs">
                    <span className="text-slate-300">One input → two outputs</span>
                    <span className="font-bold" style={{ color: STATE.fail.color }}>× not a function</span>
                    <span className="text-slate-300">Two inputs → one output</span>
                    <span className="font-bold" style={{ color: STATE.pass.color }}>✓ still a function</span>
                  </div>
                </div>
              </>
            )}

            {part === 'graph' && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {CURVES.map((c, i) => (
                    <button
                      key={c.id}
                      type="button"
                      data-curve={c.id}
                      onClick={() => setCurveIndex(i)}
                      className={
                        'rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold transition ' +
                        (i === curveIndex
                          ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
                      }
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div
                  className="mt-3 rounded-xl border px-4 py-3"
                  style={{
                    borderColor: `${hits.length > 1 ? STATE.fail.color : STATE.pass.color}55`,
                    backgroundColor: `${hits.length > 1 ? STATE.fail.color : STATE.pass.color}0f`,
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    At x = {showValue(lineX)}
                  </span>
                  <p
                    className="mt-1.5 text-lg font-bold"
                    style={{ color: hits.length > 1 ? STATE.fail.color : STATE.pass.color }}
                  >
                    <span aria-hidden="true">{hits.length > 1 ? '×' : '✓'}</span> {hits.length}{' '}
                    {hits.length === 1 ? 'output' : 'outputs'}
                  </p>
                  {hits.length > 0 && (
                    <div className="mt-1.5 font-mono text-xs tabular-nums text-slate-300">
                      {hits.map((y) => `y = ${showValue(y)}`).join('   and   ')}
                    </div>
                  )}
                  {hits.length === 0 && (
                    <p className="mt-1.5 text-xs text-slate-400">
                      This x is not in the domain — the line misses the curve entirely.
                    </p>
                  )}
                </div>

                <p className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-xs leading-relaxed text-slate-400">
                  {curve.note}
                </p>

                {!curve.isFunction && hits.length > 1 && (
                  <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-400/5 px-3 py-2 text-xs leading-relaxed text-amber-100">
                    This is why the vertical line test works: a vertical line <em>is</em> one input.
                    If it meets the curve twice, that input has two outputs.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        One x → one y. Not one y → one x.
      </p>
    </main>
  );
}
