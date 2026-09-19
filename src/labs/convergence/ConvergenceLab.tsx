/**
 * LAB — 收敛判别法:判别法没说话的时候,它还是没说话。
 *
 * ⭐⭐⭐ 整页的支点是**并排的那一对**:`Σ1/n` 和 `Σ1/n²`。
 *   两个判别法给出**一模一样**的输出("什么也没说"),而结论相反。
 *   这一对必须**并排画在同一张图、同一个纵轴上**,一眼能看出
 *   一条爬个没完、一条早就躺平 —— 否则"判别法失效"就还只是一句话。
 *
 * ⭐⭐ 第二根支柱是 `S(2N) − S(N)` 那个读数。
 *   它只做加法,完全不看任何声明,而调和级数上它**卡在 0.693 纹丝不动**。
 *   那是"调和级数发散"最短的证明,而且学生自己推得动:
 *   那一块有 N 项,每项至少 1/(2N),所以永远 ≥ 1/2。
 *
 * ⚠️ 死界面自查:
 *   判别法三档输出(converges / diverges / says nothing)都有级数点得到;
 *   条件收敛那一块只在 `Σ(−1)ⁿ⁺¹/n` 上出现,而它是七个按钮之一。
 *
 * ⚠️ "什么也没说"绝不能用成功色或失败色画 —— 它既不是好消息也不是坏消息,
 *   它是**没有消息**。用中性色 + 中性符号,和另外两档区分开。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/convergence.ts`。
 */
import { useMemo, useState } from 'react';
import {
  BLOCK_NOTE, HEADLINE, MAIN_IDEA, PAIR_NOTE, SERIES, TESTS,
  type Series, type TestSays,
  blockShrinks, isConditional, nthTermTest, ratioTest, seriesOf, sharedView,
  show, sumPoints, tailBlock,
} from '../../math/convergence';
import { LAB, STATE } from '../shared/theme';
import { Tex } from '../shared/Tex';
import { niceTicks } from '../shared/ticks';

const W = 520;
const H = 300;
const PAD_L = 40;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 26;

/** 每一档配一个**符号 + 文字**,颜色不是唯一信道。 */
const SAYS = {
  converges: { ...STATE.pass, word: 'converges' },
  diverges: { ...STATE.fail, word: 'diverges' },
  /** ⚠️ 中性档。它不是坏消息,是**没有消息**。 */
  'says nothing': { color: LAB.muted, symbol: '–', text: 'no information', word: 'says nothing' },
} as const satisfies Record<TestSays, { color: string; symbol: string; text: string; word: string }>;

function scale(nMax: number, lo: number, hi: number) {
  return {
    px: (n: number) => PAD_L + ((n - 1) / Math.max(1, nMax - 1)) * (W - PAD_L - PAD_R),
    py: (v: number) => H - PAD_B - ((v - lo) / (hi - lo)) * (H - PAD_T - PAD_B),
  };
}

const BLOCK_N = 512;

export function ConvergenceLab() {
  const [id, setId] = useState(SERIES[0]!.id);
  const s = seriesOf(id);

  const nth = nthTermTest(s);
  const ratio = ratioTest(s);
  const block = tailBlock(s, BLOCK_N);
  const conditional = isConditional(s);

  const pts = useMemo(() => sumPoints(s), [s]);
  const k = scale(s.plotN, s.yView[0], s.yView[1]);
  const path = pts.map((p) => `${k.px(p[0]).toFixed(2)},${k.py(p[1]).toFixed(2)}`).join(' ');

  const truth = s.verdict === 'converges' ? STATE.pass : STATE.fail;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Infinite Series
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Convergence Tests
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ⭐⭐ 论点前置:每个判别法能证明什么,以及**证明不了**什么。
          第二栏才是这一课的内容。 */}
      <section data-panel="tests" className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          What each test proves, and what it does not
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {TESTS.map((t) => (
            <div key={t.n} data-test={t.n} className="rounded-lg border border-slate-800 px-2.5 py-2">
              <p className="font-mono text-[11px] text-slate-300">{t.n}. {t.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{t.proves}</p>
              <p data-cannot className="mt-1.5 border-t border-slate-800 pt-1.5 text-[11px] leading-relaxed"
                style={{ color: '#fca5a5' }}>
                <span aria-hidden>× </span>{t.cannot}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ⭐⭐⭐ 并排的那一对 —— 整页的支点,放在最显眼的地方 */}
      <PairPanel />

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        {SERIES.map((q) => (
          <button
            key={q.id} type="button" data-series={q.id} data-active={q.id === id ? 'yes' : 'no'}
            onClick={() => setId(q.id)}
            className={
              'rounded-lg border px-2.5 py-1 text-left text-[11px] transition ' +
              (q.id === id
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
            }
          >
            {q.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
          <div className="mb-1 flex flex-wrap items-center gap-x-4">
            <span className="text-[14px] text-slate-200"><Tex src={s.tex} /></span>
            <span className="font-mono text-[10px] text-slate-500">running total after n terms</span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
            aria-label="The partial sums of the chosen series, plotted against the number of terms">
            {s.yView[0] <= 0 && s.yView[1] >= 0 && (
              <line x1={PAD_L} y1={k.py(0)} x2={W - PAD_R} y2={k.py(0)}
                stroke={LAB.axis} strokeWidth={1} />
            )}
            {niceTicks(1, s.plotN, false).map((v) => (
              <text key={`x${v}`} x={k.px(v)} y={H - PAD_B + 13} textAnchor="middle"
                fill="#64748b" className="font-mono text-[9px]">{String(v)}</text>
            ))}
            {niceTicks(s.yView[0], s.yView[1], false).map((v) => (
              <text key={`y${v}`} x={PAD_L - 5} y={k.py(v) + 3} textAnchor="end"
                fill="#64748b" className="font-mono text-[9px]">{String(v)}</text>
            ))}

            {/* 收敛时把和画成一条水平线 —— 部分和要不要停在上面,一眼可见 */}
            {s.sum !== null && (
              <g data-limit-line>
                <line x1={PAD_L} y1={k.py(s.sum)} x2={W - PAD_R} y2={k.py(s.sum)}
                  stroke={LAB.x1} strokeWidth={1.5} strokeDasharray="6 4" />
                <text x={W - PAD_R} y={k.py(s.sum) - 5} textAnchor="end"
                  fill={LAB.x1} className="font-mono text-[10px]">{show(s.sum, 4)}</text>
              </g>
            )}

            <polyline data-sums points={path} fill="none"
              stroke={truth.color} strokeWidth={2.2} strokeLinejoin="round" />
          </svg>
        </section>

        <section className="space-y-3">
          {/* 判别法各自说了什么 */}
          <div data-panel="says" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">what the tests report</p>
            <ul className="mt-1.5 space-y-1.5">
              {([['nth-term', nth], ['ratio (L = ' + show(s.ratioL, 2) + ')', ratio]] as const).map(
                ([name, says]) => (
                  <li key={name} data-says={says} className="font-mono text-[11px]"
                    style={{ color: SAYS[says].color }}>
                    <span aria-hidden>{SAYS[says].symbol}</span> {name}: {SAYS[says].word}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* ⭐⭐ 只做加法的那条路 */}
          {/* ⚠️ "缩不缩"用模块里那个**比较式**判据(N 放大十六倍之后小了一个数量级),
              不在这里就地拍一个绝对阈值 —— 那样换个级数就不准了。 */}
          <div data-panel="block" data-shrinks={blockShrinks(s) ? 'yes' : 'no'}
            className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">
              the block S({2 * BLOCK_N}) − S({BLOCK_N})
            </p>
            {/* ⚠️ 这里要 6 位小数。`Σ1/n²` 的块是 0.000977,按 4 位显示成 "0.001" ——
                看上去像是"约等于千分之一",而它真正想说的是"正在归零"。
                和调和级数那个 0.693 摆在一起,位数不够就比不出七百倍的差距。 */}
            <p data-readout="block" className="mt-1 font-mono text-[13px]"
              style={{ color: truth.color }}>
              {show(block, 6)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{BLOCK_NOTE}</p>
          </div>

          {/* 真相,以及凭什么 */}
          <div data-panel="truth" data-verdict={s.verdict}
            className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="flex items-start gap-1.5 font-mono text-[11px]" style={{ color: truth.color }}>
              <span aria-hidden>{truth.symbol}</span>
              <span>it {s.verdict}</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{s.why}</p>
            {s.sumTex !== null && (
              <p className="mt-1.5 text-[12px] text-slate-300">
                <span className="font-mono text-[10px] text-slate-500">sum = </span>
                <Tex src={s.sumTex} />
              </p>
            )}
            {conditional && (
              <p data-note="conditional" className="mt-2 border-t border-slate-800 pt-2 font-mono text-[11px]"
                style={{ color: LAB.x2 }}>
                <span aria-hidden>! </span>
                conditionally — take absolute values and it diverges
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p data-note="series" className="text-sm leading-relaxed text-slate-300">{s.note}</p>
      </section>
    </main>
  );
}

/**
 * ⭐⭐⭐ `Σ1/n` 对 `Σ1/n²`,同一张图、**同一个纵轴**。
 *
 * ⚠️ 纵轴必须共用。各画各的轴就等于把"一条爬个没完、一条躺平"这件事
 *   用两套刻度抹平了 —— 而那正是这一整页要让人看见的东西。
 */
function PairPanel() {
  const a = seriesOf('harmonic');
  const b = seriesOf('psquare');
  const [lo, hi] = sharedView(a, b);
  const n = Math.max(a.plotN, b.plotN);
  const k = scale(n, lo, hi);
  const line = (q: Series) =>
    sumPoints(q).map((p) => `${k.px(p[0]).toFixed(2)},${k.py(p[1]).toFixed(2)}`).join(' ');

  return (
    <section data-panel="pair" className="mt-4 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
        Two series, identical test results, opposite answers
      </p>
      <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_minmax(0,18rem)]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
          aria-label="The partial sums of 1/n and 1/n squared drawn on one shared vertical axis">
          {niceTicks(1, n, false).map((v) => (
            <text key={`x${v}`} x={k.px(v)} y={H - PAD_B + 13} textAnchor="middle"
              fill="#64748b" className="font-mono text-[9px]">{String(v)}</text>
          ))}
          {niceTicks(lo, hi, false).map((v) => (
            <text key={`y${v}`} x={PAD_L - 5} y={k.py(v) + 3} textAnchor="end"
              fill="#64748b" className="font-mono text-[9px]">{String(v)}</text>
          ))}
          <line x1={PAD_L} y1={k.py(b.sum!)} x2={W - PAD_R} y2={k.py(b.sum!)}
            stroke={LAB.pass} strokeWidth={1.2} strokeDasharray="6 4" opacity={0.7} />
          <polyline data-pair="harmonic" points={line(a)} fill="none"
            stroke={LAB.fail} strokeWidth={2.4} />
          <polyline data-pair="psquare" points={line(b)} fill="none"
            stroke={LAB.pass} strokeWidth={2.4} />
          {/* ⚠️ 标签要**离开曲线**。第一版把红色那条压在 6.2 上,
              而调和级数的部分和在右端正好是 6.28 —— 字直接印在线上了。
              放到画框顶端附近(曲线够不到的地方),绿色那条则压在它自己那条线下方。 */}
          <text x={W - PAD_R - 4} y={k.py(a.yView[1] - 0.25)} textAnchor="end" fill={LAB.fail}
            className="font-mono text-[11px]">Σ 1/n — still climbing</text>
          <text x={W - PAD_R - 4} y={k.py(b.sum!) + 18} textAnchor="end" fill={LAB.pass}
            className="font-mono text-[11px]">Σ 1/n² — settled</text>
        </svg>

        <div className="space-y-2 font-mono text-[11px]">
          {[a, b].map((q) => (
            <div key={q.id} data-pair-row={q.id} className="rounded-lg border border-slate-800 px-2.5 py-2">
              <p className="text-[13px] text-slate-200"><Tex src={q.tex} /></p>
              <p className="mt-1" style={{ color: SAYS[nthTermTest(q)].color }}>
                nth-term: {SAYS[nthTermTest(q)].word}
              </p>
              <p style={{ color: SAYS[ratioTest(q)].color }}>
                ratio (L = {show(q.ratioL, 0)}): {SAYS[ratioTest(q)].word}
              </p>
              <p className="mt-1 border-t border-slate-800 pt-1"
                style={{ color: q.verdict === 'converges' ? LAB.pass : LAB.fail }}>
                <span aria-hidden>{q.verdict === 'converges' ? '✓' : '×'}</span> it {q.verdict}
              </p>
            </div>
          ))}
          <p className="leading-relaxed text-slate-400">{PAIR_NOTE}</p>
        </div>
      </div>
    </section>
  );
}
