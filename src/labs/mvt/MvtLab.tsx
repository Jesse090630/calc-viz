/**
 * LAB — 中值定理:前提才是这一课。
 *
 * ⭐⭐ 和 `#/bisect-line` 同一个骨架:**先列定理要什么,再用反例打掉一条。**
 *   学生背得下结论,从不检查前提;所以页面的顺序必须是"前提 → 反例 → 结论",
 *   不能是"结论 → 举例"。
 *
 * 三块图,各答一个问题:
 *   ① f 的图 —— 连线在哪,切线在哪,它们平不平行;
 *   ② f' 的图 —— **这是找 c 的地方**。c 就是 f' 曲线穿过那条水平线的位置,
 *      反例里那条曲线要么跳过去、要么冲向无穷,就是穿不过去。
 *   ③ 手动扫 —— 学生自己拖着找,亲手找不到,比看一句"不存在"有用得多。
 *
 * ⚠️ 死界面自查:三种判定('applies' / 'no-derivative' / 'no-continuity')
 *   各自都有情形按钮能点到;"导数不存在"的读数靠滑块停在尖点上触发,
 *   滑块步长 0.001 能精确落在 0 和 1 上,所以那个分支是真的走得到的。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/mvt.ts`。
 */
import { useMemo, useState } from 'react';
import {
  CASES, HEADLINE, MAIN_IDEA, MVT_NEEDS, NAIVE_NOTE, ROLLE_ALSO_FAILS, ROLLE_NOTE,
  WHY_OPEN_CLOSED,
  caseOf, chordAt, chordSlope, clampX, dfRange, findC, findCNaive, isRolle,
  leftLimitAt, sampleDf, sampleF, show, tangentAt, verdictOf,
} from '../../math/mvt';
import { LAB, STATE } from '../shared/theme';

/**
 * ⚠️⚠️ 这一页**不用** `LAB.curve` 画函数。
 *
 * 全站的语义是:新引入的量 = 青、结果 = 绿、用户在动的 = 琥珀。
 * 这一页里"新引入的量"是**连线斜率**,所以它必须是青的。
 * 而 `LAB.curve` 是 `#38bdf8`,和青 `#22d3ee` 几乎分不开 ——
 * 截图上函数和连线成了同一条颜色,而这一页从头到尾都在比这两样东西。
 *
 * 所以 f 自己退回中性灰:它是舞台,不是论点。论点是那三条线。
 * (这是看截图看出来的 —— 所有测试当时都是绿的。)
 */
const SUBJECT = '#cbd5e1';

const W = 460;
const H = 300;
const PAD_L = 42;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 26;

type Pt = readonly [number, number];

/** 世界坐标 → 画布坐标。两块图共用,所以做成一个工厂。 */
function makeScale(a: number, b: number, lo: number, hi: number, h: number) {
  const px = (x: number) => PAD_L + ((x - a) / (b - a)) * (W - PAD_L - PAD_R);
  const py = (y: number) => h - PAD_B - ((y - lo) / (hi - lo)) * (h - PAD_T - PAD_B);
  return { px, py };
}

/** 一串可能抬笔的点 → 若干条 polyline。 */
function segments(pts: readonly (Pt | null)[]): Pt[][] {
  const out: Pt[][] = [];
  let run: Pt[] = [];
  for (const p of pts) {
    if (p === null) { if (run.length > 1) out.push(run); run = []; continue; }
    run.push(p);
  }
  if (run.length > 1) out.push(run);
  return out;
}

export function MvtLab() {
  const [id, setId] = useState(CASES[0]!.id);
  const c = caseOf(id);
  const [x, setX] = useState((c.a + c.b) / 2);

  const m = chordSlope(c);
  const verdict = verdictOf(c);
  const cs = useMemo(() => findC(c), [c]);
  const naive = useMemo(() => findCNaive(c), [c]);
  const fPts = useMemo(() => sampleF(c), [c]);
  const dPts = useMemo(() => sampleDf(c), [c]);
  const [dLo, dHi] = dfRange(c);

  const at = clampX(c, x);
  const slopeHere = c.df(at);
  const rolle = isRolle(c);

  const f = makeScale(c.a, c.b, c.yView[0], c.yView[1], H);
  const d = makeScale(c.a, c.b, dLo, dHi, 190);

  const line = (pts: readonly Pt[], s: { px: (v: number) => number; py: (v: number) => number }) =>
    pts.map((p) => `${s.px(p[0]).toFixed(2)},${s.py(p[1]).toFixed(2)}`).join(' ');

  const state = verdict === 'applies' ? STATE.pass : STATE.fail;
  const verdictText = verdict === 'applies'
    ? `both hypotheses hold — the theorem guarantees ${cs.length === 1 ? 'a point' : `${cs.length} points`}`
    : verdict === 'no-derivative'
      ? `no derivative at x = ${show(c.badPoints[0]!, 2)} — the theorem does not apply`
      : `not continuous at x = ${show(c.badPoints[0]!, 2)} — the theorem does not apply`;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Mean Value Theorem
        </p>
        {/* ⚠️ H1 用定理的**正名**,不用那句俏皮话。
            学生在单元 5 里找的是「Mean Value Theorem」这几个字;
            标题栏要是只写"One Missing Point Is Enough",按名字就找不着了。
            俏皮话退到副标题第一句 —— 和 `#/bisect-line` 一个写法。 */}
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Mean Value Theorem
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ⭐⭐ 论点前置:两条前提,以及"为什么一个闭一个开"。 */}
      <section data-panel="needs" className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          To use the Mean Value Theorem on [a, b] you must check
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {MVT_NEEDS.map((need) => (
            <div key={need.n} data-need={need.n} className="rounded-lg border border-slate-800 px-2.5 py-2">
              <p className="font-mono text-[11px] text-slate-300">{need.n}. {need.what}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{need.detail}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">{WHY_OPEN_CLOSED}</p>
      </section>

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        {CASES.map((k) => (
          <button
            key={k.id} type="button" data-case={k.id} data-active={k.id === id ? 'yes' : 'no'}
            onClick={() => { setId(k.id); setX((k.a + k.b) / 2); }}
            className={
              'rounded-lg border px-2.5 py-1 text-left text-[11px] transition ' +
              (k.id === id
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
            }
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* 判定条:颜色不是唯一信道,符号和文字一起给。 */}
      <p
        data-verdict={verdict}
        data-c-count={cs.length}
        className="mt-3 flex items-center gap-2 font-mono text-[12px]"
        style={{ color: state.color }}
      >
        <span aria-hidden>{state.symbol}</span>
        <span>{verdictText}</span>
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── ① f、连线、切线 ─────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-1 font-mono text-[11px] text-slate-400">
            the function and the chord
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
            aria-label="The function with the chord joining its endpoints, and a tangent line the slider moves">
            {/* ⚠️ 切线可以很陡(x³ − 3x 在 0 处斜率是 −3),不裁就会画到画框外面去。
                但又不能只画一小段 —— 判断"平不平行"要靠长线。所以裁,不截短。 */}
            <clipPath id="mvt-plot">
              <rect x={PAD_L} y={PAD_T} width={W - PAD_L - PAD_R} height={H - PAD_T - PAD_B} />
            </clipPath>
            {/* 坐标轴 */}
            <line x1={PAD_L} y1={f.py(0)} x2={W - PAD_R} y2={f.py(0)} stroke={LAB.axis} strokeWidth={1} />
            <line x1={f.px(c.a)} y1={PAD_T} x2={f.px(c.a)} y2={H - PAD_B} stroke={LAB.axis} strokeWidth={1} />
            <line x1={f.px(c.b)} y1={PAD_T} x2={f.px(c.b)} y2={H - PAD_B}
              stroke={LAB.axis} strokeWidth={1} strokeDasharray="3 3" />

            {/* 手动扫出来的那条切线(琥珀 = 用户在动的东西)*/}
            {slopeHere !== null && (
              <line
                clipPath="url(#mvt-plot)"
                data-sweep="tangent"
                x1={f.px(c.a)} y1={f.py(tangentAt(c, at, c.a)!)}
                x2={f.px(c.b)} y2={f.py(tangentAt(c, at, c.b)!)}
                stroke={LAB.x2} strokeWidth={1.6} strokeDasharray="5 4" opacity={0.9}
              />
            )}

            {/* 连线(青 = 要匹配的那个量)*/}
            <line
              clipPath="url(#mvt-plot)"
              data-chord="line"
              x1={f.px(c.a)} y1={f.py(chordAt(c, c.a))}
              x2={f.px(c.b)} y2={f.py(chordAt(c, c.b))}
              stroke={LAB.x1} strokeWidth={2}
            />

            {/* f 自己 —— 最后画,压在所有辅助线上面 */}
            {segments(fPts).map((run, i) => (
              <polyline key={i} data-curve={i} points={line(run, f)}
                fill="none" stroke={SUBJECT} strokeWidth={2.4} strokeLinecap="round" />
            ))}

            {/* 定理给的那些 c:绿点 + 平行切线 */}
            {cs.map((cx, i) => (
              <g key={i} data-c-mark={i}>
                <line
                  clipPath="url(#mvt-plot)"
                  x1={f.px(c.a)} y1={f.py(tangentAt(c, cx, c.a)!)}
                  x2={f.px(c.b)} y2={f.py(tangentAt(c, cx, c.b)!)}
                  stroke={LAB.pass} strokeWidth={1.6}
                />
                <circle cx={f.px(cx)} cy={f.py(c.f(cx))} r={4} fill={LAB.pass} />
              </g>
            ))}

            {/* 端点 */}
            {[c.a, c.b].map((e, i) => (
              <circle key={i} cx={f.px(e)} cy={f.py(c.f(e))} r={3.4} fill={LAB.x1} />
            ))}

            {/* 拖标。⚠️ 画在"前提破掉的记号"**之前** ——
                尖点那一课滑块默认就停在尖点上,两个记号同位置,
                必须让红叉压在上面,否则糊成一团看不出是什么。 */}
            <circle data-sweep="dot" cx={f.px(at)} cy={f.py(c.f(at))} r={3.6} fill={LAB.x2} />

            {/* ⚠️ 前提破掉的位置。不连续 → 空心圈 + 实心点;尖点 → 红叉。 */}
            {c.badPoints.map((p, i) => {
              const hole = leftLimitAt(c, p);
              return (
                <g key={i} data-bad={i}>
                  {hole !== null ? (
                    <>
                      <circle cx={f.px(p)} cy={f.py(hole)} r={4} fill="#0f172a"
                        stroke={LAB.fail} strokeWidth={1.8} />
                      <circle cx={f.px(p)} cy={f.py(c.f(p))} r={4} fill={LAB.fail} />
                    </>
                  ) : (
                    <>
                      <line x1={f.px(p) - 5} y1={f.py(c.f(p)) - 5} x2={f.px(p) + 5} y2={f.py(c.f(p)) + 5}
                        stroke={LAB.fail} strokeWidth={2.2} />
                      <line x1={f.px(p) - 5} y1={f.py(c.f(p)) + 5} x2={f.px(p) + 5} y2={f.py(c.f(p)) - 5}
                        stroke={LAB.fail} strokeWidth={2.2} />
                    </>
                  )}
                </g>
              );
            })}


            <text x={f.px(c.a)} y={H - 10} textAnchor="middle" fill="#64748b" className="font-mono text-[10px]">a</text>
            <text x={f.px(c.b)} y={H - 10} textAnchor="middle" fill="#64748b" className="font-mono text-[10px]">b</text>
          </svg>
        </section>

        {/* ── ② f' —— 找 c 的地方 ────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-1 font-mono text-[11px] text-slate-400">
            the slope, and the height it has to reach
          </p>
          <svg viewBox={`0 0 ${W} 190`} className="w-full" role="img"
            aria-label="The derivative plotted against x, with a horizontal line at the chord slope">
            <line x1={PAD_L} y1={d.py(0)} x2={W - PAD_R} y2={d.py(0)} stroke={LAB.axis} strokeWidth={1} />

            {/* 连线斜率:同一个量,同一个颜色 */}
            <line data-target="line" x1={PAD_L} y1={d.py(m)} x2={W - PAD_R} y2={d.py(m)}
              stroke={LAB.x1} strokeWidth={2} />
            <text x={PAD_L - 5} y={d.py(m) + 3.5} textAnchor="end" fill={LAB.x1}
              className="font-mono text-[10px]">{show(m, 2)}</text>

            {segments(dPts).map((run, i) => (
              <polyline key={i} data-df={i} points={line(run, d)}
                fill="none" stroke={SUBJECT} strokeWidth={2.2} strokeLinecap="round" />
            ))}

            {cs.map((cx, i) => (
              <circle key={i} data-c-cross={i} cx={d.px(cx)} cy={d.py(m)} r={4} fill={LAB.pass} />
            ))}

            {slopeHere !== null && slopeHere > dLo && slopeHere < dHi && (
              <circle data-sweep="df" cx={d.px(at)} cy={d.py(slopeHere)} r={3.6} fill={LAB.x2} />
            )}
          </svg>

          {/* ── ③ 自己去找 ─────────────────────────────────────── */}
          <div className="mt-2 border-t border-slate-800 pt-2">
            <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              x =
              <input
                type="range" min={c.a} max={c.b} step={0.001} value={at}
                onChange={(e) => setX(Number.parseFloat(e.target.value))}
                className="h-1 flex-1 accent-amber-400" aria-label="Sweep the tangent point"
              />
              <span data-readout="x" className="w-14 text-right text-amber-300">{show(at, 3)}</span>
            </label>
            <p className="mt-1.5 font-mono text-[11px] text-slate-400">
              slope there = <span data-readout="slope" style={{ color: LAB.x2 }}>{show(slopeHere, 4)}</span>
              {'  ·  '}needs to be <span style={{ color: LAB.x1 }}>{show(m, 4)}</span>
            </p>
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p data-note="case" className="text-sm leading-relaxed text-slate-300">{c.note}</p>
        {/* ⚠️ 连线水平时说什么,取决于前提**成不成立**:
            成立 → Rolle 就是这一情形;不成立 → 同一个反例把 Rolle 一起推翻。
            两句话不能混用,混用就是在示范这一页正在批评的毛病。 */}
        {rolle && (
          <p
            data-note="rolle"
            data-rolle={verdict === 'applies' ? 'holds' : 'fails'}
            className="mt-3 border-t border-slate-800 pt-3 text-xs leading-relaxed text-slate-400"
          >
            {verdict === 'applies' ? ROLLE_NOTE : ROLLE_ALSO_FAILS}
          </p>
        )}
      </section>

      {/* ⭐⭐ 只有尖点那两课才出现:差商会编一个答案给你。
          它的可达性靠 findCNaive 与 findC 结果不同来判定,不是写死的情形名单。 */}
      {naive.length > cs.length && (
        <section data-panel="naive" className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/5 p-4">
          <p className="font-mono text-[11px]" style={{ color: LAB.fail }}>
            <span aria-hidden>× </span>
            a numerical search reports c = {show(naive[0]!, 3)}, and there is no derivative there
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{NAIVE_NOTE}</p>
        </section>
      )}
    </main>
  );
}
