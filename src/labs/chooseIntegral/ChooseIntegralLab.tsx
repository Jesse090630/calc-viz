/**
 * LAB — 选哪个积分方法。
 *
 * ⭐⭐⭐ 这一页的主角是**中间那张验算图**,不是上面的题目卡。
 *   图上同时画三条:被积函数、正确答案求导回来、错答案求导回来。
 *   正确的那条严丝合缝地压在被积函数上;错的那条肉眼可见地岔开。
 *   学生要带走的不是"这五种方法",而是"**答案对不对,求导回去一看就知道**"。
 *
 * ⭐⭐ 结构固定,顺序不许变:
 *   ① 一对题并排 —— 先让人看见它们有多像。
 *   ② 判定问题 —— 分开它们的那一句。
 *   ③ 验算图 —— 可拖的游标,三条曲线,四个读数。
 *   ④ 怎么做 + 错在哪 —— 两栏对照。
 *   ⑤ 卡住时按什么顺序问 —— 六步。
 *
 * ⚠️ 死界面自查:
 *   · 五对都能从按钮条点到;一对里两道题都能点到。
 *   · 错答案那条线在**每一道题**上都有"既在框里又明显岔开"的一段
 *     (`plotWindow` 的单元测试钉死了这件事)。
 *   · "这个点上刚好也对上了"那句提醒只在 `wrongMatchesHere` 为真时出现,
 *     而曲线必然交叉,所以它确实会出现。
 *   · "站内还有一课"只在真有课的两种工具上出现;另三种**明说还没有**。
 *
 * 禁止 2:这里不出现裸算式。所有数值、曲线、窗口都来自 `src/math/chooseIntegral.ts`。
 */
import { useMemo, useRef, useState } from 'react';
import {
  CHECK_NOTE, HEADLINE, MAIN_IDEA, ORDER, PAIRS, TOOL_NAME,
  type Curve, type Problem,
  checkAt, curveOf, openAt, pairOf, plotWindow, problemOf, routeFor, worstGap,
} from '../../math/chooseIntegral';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';
import { niceTicks } from '../shared/ticks';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';

/** 三条曲线的画法。⚠️ 颜色不是唯一信道:每条都带符号和文字。 */
const CURVES: readonly {
  readonly key: Curve;
  readonly label: string;
  readonly symbol: string;
  readonly color: string;
  readonly width: number;
  readonly dash?: string;
}[] = [
  { key: 'integrand', label: 'what you are integrating', symbol: '—', color: LAB.x2, width: 3.4 },
  // ⭐ 正确答案画成虚线压在上面:重合的时候看得出是**两条**线在重合,
  //   而不是一条线自己画了一遍。实线盖实线分不清有没有压住。
  { key: 'answer', label: 'the answer, differentiated back', symbol: '✓', color: LAB.pass, width: 2, dash: '7 5' },
  { key: 'wrong', label: 'the wrong answer, differentiated back', symbol: '×', color: LAB.fail, width: 1.8, dash: '2 4' },
];

/**
 * ⚠️ 画的先后顺序:错的最先(压在底下),正确答案最后(压在最上面)。
 *   这个常量存在的唯一理由,就是让顺序**写出来**而不是靠 reverse 推出来 ——
 *   第一版用 reverse 推,推反了,绿线整条被盖掉而没人发现。
 */
const DRAW_ORDER: readonly Curve[] = ['wrong', 'integrand', 'answer'];

function ProblemCard({
  p, chosen, onPick,
}: {
  readonly p: Problem;
  readonly chosen: boolean;
  readonly onPick: () => void;
}) {
  return (
    <button
      type="button" data-problem={p.id} data-active={chosen ? 'yes' : 'no'} onClick={onPick}
      className={
        'rounded-2xl border px-4 py-3 text-left transition ' +
        (chosen
          ? 'border-amber-400/60 bg-amber-400/10'
          : 'border-slate-700 bg-slate-900/40 hover:border-slate-500')
      }
    >
      <span className="block overflow-x-auto text-[15px] text-slate-100">
        <Tex src={p.tex} display />
      </span>
      <span
        data-tool={p.tool}
        className={
          'mt-1 block font-mono text-[11px] ' + (chosen ? 'text-amber-200' : 'text-slate-400')
        }
      >
        {TOOL_NAME[p.tool]}
      </span>
    </button>
  );
}

export function ChooseIntegralLab() {
  const [pairId, setPairId] = useState(PAIRS[0]!.id);
  const [problemId, setProblemId] = useState(PAIRS[0]!.a.id);
  const pair = pairOf(pairId);
  const p = problemOf(problemId);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [lo, hi] = p.safe;
  // ⭐ 开局停在"错答案错得最明显"的地方,不是中点。原因见 `openAt`。
  const [cursor, setCursor] = useState(() => openAt(PAIRS[0]!.a));
  // ⚠️ 换题之后窗口和定义域都变了,游标必须跟着夹回去,否则会落到定义域外面。
  const x = Math.min(hi, Math.max(lo, cursor));

  const win = useMemo(() => plotWindow(p), [p]);
  const V = useMemo(
    () => makeViewport({
      width: 760, height: 330, xMin: lo, xMax: hi, yMin: win.yMin, yMax: win.yMax,
      padLeft: 54, padRight: 18, padTop: 16, padBottom: 34,
    }),
    [lo, hi, win],
  );

  const paths = useMemo(
    () => CURVES.map((c) => ({ ...c, d: polylinePath(V, curveOf(p, c.key, 240)) })),
    [V, p],
  );
  const check = checkAt(p, x);
  const miss = useMemo(() => worstGap(p.wrong.at, p.f, lo, hi), [p, lo, hi]);

  const xTicks = niceTicks(lo, hi, false, 7);
  const yTicks = niceTicks(win.yMin, win.yMax, false, 5);
  const lesson = routeFor(p.tool);

  function pickPair(id: string) {
    setPairId(id);
    const next = pairOf(id);
    setProblemId(next.a.id);
    setCursor(openAt(next.a));
  }

  function pickProblem(q: Problem) {
    setProblemId(q.id);
    setCursor(openAt(q));
  }

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Integration
        </p>
        {/* ⚠️ H1 用能被搜到的正名 —— 学生搜的是「integration technique」。 */}
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Choosing an Integration Technique
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ── 五对 ─────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        {PAIRS.map((q) => (
          <button
            key={q.id} type="button" data-pair={q.id} data-active={q.id === pairId ? 'yes' : 'no'}
            onClick={() => pickPair(q.id)}
            className={
              'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
              (q.id === pairId
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
            }
          >
            {q.title}
          </button>
        ))}
      </div>

      {/* ── ① 并排,先看它们多像 ────────────────────────────── */}
      <section data-panel="pair" className="mt-4 grid gap-3 sm:grid-cols-2">
        <ProblemCard p={pair.a} chosen={pair.a.id === problemId} onPick={() => pickProblem(pair.a)} />
        <ProblemCard p={pair.b} chosen={pair.b.id === problemId} onPick={() => pickProblem(pair.b)} />
      </section>

      {/* ── ② 判定问题 ──────────────────────────────────────── */}
      <section data-panel="test" className="mt-3 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          They look alike
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-400">{pair.look}</p>
        <p data-test className="mt-3 border-t border-slate-800 pt-3 text-sm leading-relaxed font-medium text-amber-200">
          {pair.test}
        </p>
        {/* ⚠️ 只有真有坑的那一对才有这段,别的对不许凭空长出一句话来。 */}
        {pair.trap && (
          <p data-trap className="mt-2.5 rounded-lg border border-amber-400/40 bg-amber-400/5 px-3 py-2 text-[12px] leading-relaxed text-amber-100">
            {pair.trap}
          </p>
        )}
      </section>

      {/* ── ③ 验算图:这一页的主角 ──────────────────────────── */}
      <section data-panel="check" className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Differentiate both answers and look
          </p>
          <p className="font-mono text-[10px] text-slate-500">
            drag the dot · arrow keys work too
          </p>
        </div>

        <svg
          ref={svgRef} viewBox={`0 0 ${V.width} ${V.height}`} className="mt-2 w-full touch-none"
          role="img"
          aria-label={
            `The integrand of ${p.tex}, with both the correct and an incorrect antiderivative ` +
            'differentiated back. The correct one lies exactly on the integrand.'
          }
        >
          {/* 刻度 */}
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line
                x1={toSvgX(V, t)} y1={V.padTop} x2={toSvgX(V, t)} y2={V.height - V.padBottom}
                stroke="#1e293b" strokeWidth={1}
              />
              <text
                x={toSvgX(V, t)} y={V.height - V.padBottom + 15} textAnchor="middle"
                fill="#64748b" className="font-mono text-[9px]"
              >
                {t}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line
                x1={V.padLeft} y1={toSvgY(V, t)} x2={V.width - V.padRight} y2={toSvgY(V, t)}
                stroke="#1e293b" strokeWidth={1}
              />
              <text
                x={V.padLeft - 7} y={toSvgY(V, t) + 3.5} textAnchor="end"
                fill="#64748b" className="font-mono text-[9px]"
              >
                {t}
              </text>
            </g>
          ))}
          {/* y = 0 画粗一点,但只在它落在窗口里的时候 */}
          {win.yMin < 0 && win.yMax > 0 && (
            <line
              x1={V.padLeft} y1={toSvgY(V, 0)} x2={V.width - V.padRight} y2={toSvgY(V, 0)}
              stroke={LAB.axis} strokeWidth={1.4}
            />
          )}

          {/*
            ⚠️ **画的先后顺序就是看不看得见。** 第一版写的是 `[...paths].reverse()`,
              注释还写着"正确的压在最上面" —— 可 reverse 之后顺序是
              错的 → 正确 → 被积函数,把**被积函数**放到了最上面,
              而它是三条里最粗的(3.4),正好把正确答案那条绿虚线整条盖住。
              截图上一点绿色都看不到,而"绿虚线压在琥珀实线上"正是这一页的论点。
              正确顺序:错的 → 被积函数 → 正确答案。
          */}
          {DRAW_ORDER.map((key) => paths.find((c) => c.key === key)!).map((c) => (
            <path
              key={c.key} data-curve={c.key} d={c.d} fill="none"
              stroke={c.color} strokeWidth={c.width} strokeDasharray={c.dash}
              strokeLinecap="round"
            />
          ))}

          {/* 游标竖线和三个点 */}
          <line
            x1={toSvgX(V, x)} y1={V.padTop} x2={toSvgX(V, x)} y2={V.height - V.padBottom}
            stroke="#475569" strokeWidth={1} strokeDasharray="3 4"
          />
          {CURVES.map((c) => {
            const y = c.key === 'integrand' ? check.integrand
              : c.key === 'answer' ? check.answerSlope : check.wrongSlope;
            if (y < win.yMin || y > win.yMax) return null;
            return (
              <circle
                key={c.key} data-dot={c.key} cx={toSvgX(V, x)} cy={toSvgY(V, y)} r={4}
                fill={c.color} stroke="#0b1020" strokeWidth={1.5}
              />
            );
          })}

          <DraggableXPoint
            svgRef={svgRef} viewport={V} value={x} onChange={setCursor}
            /*
              ⚠️ 标签往右挪开。手柄钉在 y = 0 的轴上,而三个读数圆点就画在游标那条竖线上;
                某条曲线在游标处经过 0 附近时,圆点会正好压到 "x" 这个字上
                (实测 `x·e^{x²}` 和 `∫√(9−x²)dx` 两道都撞上了)。
                圆点只占游标竖线左右各 4px,标签横着挪开 16px 就彻底分开。
            */
            interval={{ a: lo, b: hi }} color={LAB.x1} label="x" step={(hi - lo) / 100} labelDx={16}
            describe={(v) => `x is ${v.toFixed(2)}`}
          />
        </svg>

        {/* 图例 —— 颜色之外还有符号和文字 */}
        <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          {CURVES.map((c) => (
            <li key={c.key} data-legend={c.key} className="flex items-center gap-1.5 font-mono text-[10px]" style={{ color: c.color }}>
              <span aria-hidden>{c.symbol}</span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>

        {/* 四个读数 */}
        <div className="mt-3 grid gap-2 border-t border-slate-800 pt-3 sm:grid-cols-4">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">at x</p>
            <p data-read="x" data-value={x} className="font-mono text-[13px]" style={{ color: LAB.x1 }}>
              {x.toFixed(3)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">integrand</p>
            <p data-read="integrand" data-value={check.integrand} className="font-mono text-[13px]" style={{ color: LAB.x2 }}>
              {check.integrand.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <span aria-hidden>✓ </span>answer differentiated
            </p>
            <p data-read="answer" data-value={check.answerSlope} className="font-mono text-[13px]" style={{ color: LAB.pass }}>
              {check.answerSlope.toFixed(4)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[9px] uppercase tracking-wider text-slate-500">
              <span aria-hidden>× </span>wrong one differentiated
            </p>
            <p data-read="wrong" data-value={check.wrongSlope} className="font-mono text-[13px]" style={{ color: LAB.fail }}>
              {check.wrongSlope.toFixed(4)}
            </p>
          </div>
        </div>

        <p
          data-verdict data-matches={check.answerMatches ? 'yes' : 'no'}
          className="mt-3 text-[12px] leading-relaxed" style={{ color: LAB.pass }}
        >
          <span aria-hidden>✓ </span>
          The answer differentiates back to the integrand everywhere on this interval, not just here.
        </p>
        <p data-miss data-value={miss} className="mt-1 text-[12px] leading-relaxed" style={{ color: LAB.fail }}>
          <span aria-hidden>× </span>
          The wrong one misses by as much as {miss.toFixed(2)} somewhere on this interval.
        </p>
        {/*
          ⭐⭐ 两条曲线必然交叉,交叉点上错答案"刚好也对上了"。
            不说这句话,学生在那个点上会以为错答案其实也行 ——
            而"在一个点上对上"恰恰是最该警惕的那种假验证。
        */}
        {check.wrongMatchesHere && (
          <p data-coincidence className="mt-1.5 rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-[12px] leading-relaxed text-slate-300">
            Careful: at this one x the wrong answer happens to agree too. Two curves that cross
            have to agree where they cross. Checking a single point is not checking.
          </p>
        )}
        {p.domain && (
          <p data-domain className="mt-1.5 font-mono text-[11px] text-slate-500">{p.domain}</p>
        )}
      </section>

      {/* ── ④ 怎么做 / 错在哪 ──────────────────────────────── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section data-panel="how" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {TOOL_NAME[p.tool]}
            </p>
            {lesson !== null ? (
              <a data-lesson-link href={`#/${lesson}`}
                className="rounded-lg border border-slate-700 px-2 py-0.5 font-mono text-[10px] text-amber-300 hover:border-amber-400/60">
                interactive lesson →
              </a>
            ) : (
              /* ⚠️ 站内还没有这一课。标出来,不假装有,也不给死链。 */
              <span data-no-lesson className="font-mono text-[10px] text-slate-500">
                no lesson on this site yet
              </span>
            )}
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-slate-300">{p.because}</p>
          <ol className="mt-3 space-y-1.5">
            {p.work.map((w, i) => (
              <li key={i} data-work={i} className="rounded-lg px-2.5 py-1.5 text-[12px] leading-relaxed text-slate-300">
                <span className="font-mono text-slate-500">{i + 1}. </span>{w}
              </li>
            ))}
          </ol>
          <p data-answer className="mt-3 overflow-x-auto border-t border-slate-800 pt-3 text-[15px]" style={{ color: LAB.pass }}>
            <Tex src={p.answerTex} display />
          </p>
        </section>

        <section data-panel="mistake" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            What people write instead
          </p>
          <p data-wrong-tex className="mt-2 overflow-x-auto text-[15px]" style={{ color: LAB.fail }}>
            <Tex src={p.wrong.tex} display />
          </p>
          <p data-mistake className="mt-2 text-[12px] leading-relaxed" style={{ color: '#fca5a5' }}>
            <span aria-hidden>× </span>{p.wrong.mistake}
          </p>
          <p className="mt-3 border-t border-slate-800 pt-3 text-[12px] leading-relaxed text-slate-400">
            {CHECK_NOTE}
          </p>
        </section>
      </div>

      {/* ── ⑤ 卡住时按什么顺序问 ───────────────────────────── */}
      <section data-panel="order" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          When you are stuck, ask these in this order
        </p>
        <ol className="mt-2 space-y-2">
          {ORDER.map((s) => (
            <li key={s.n} data-step={s.n} className="rounded-lg border border-slate-800 px-2.5 py-2">
              <p className="text-[12px] leading-relaxed text-slate-200">
                <span className="font-mono text-slate-500">{s.n}. </span>{s.ask}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {s.then}
                {s.tool !== null && (
                  <span data-step-tool={s.tool} className="ml-1.5 font-mono text-[10px] text-amber-300">
                    [{TOOL_NAME[s.tool]}]
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
        {/* ⭐ 顺序本身就是内容:便宜的问题先问。 */}
        <p className="mt-2.5 border-t border-slate-800 pt-2.5 text-[11px] leading-relaxed text-slate-400">
          The order is the point. Asking about a table first and a triangle last means the cheapest
          route is always tried first — which is exactly what the pair about the square root is
          there to show.
        </p>
      </section>
    </main>
  );
}
