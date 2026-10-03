/**
 * LAB — 定理与推论:前提、证明、用法。
 *
 * ⭐⭐⭐ 这一页的主角是**最上面那张依赖图**,不是下面的条目。
 *   九条定理不是九件事,是一条链:最值定理交给你一个最大值,费马引理把它压平,
 *   Rolle 是这两条拼起来,中值定理是 Rolle 转个角度,Cauchy 是中值定理换两个函数,
 *   线性近似的误差界从 Cauchy 来,牛顿法是线性近似反复用。
 *   图上的节点**可以点**,点哪条下面就展开哪条 —— 图是目录,不是插画。
 *
 * ⭐⭐ 每条的结构固定三段,顺序不许变:
 *   ① 条件 —— 每条都附"去掉它会怎样"。**一个条件只有在你知道它挡住了什么之后才算说清楚。**
 *   ② 证明 —— 分步;用到实数完备性的那一步**单独标红**。
 *   ③ 例题 —— 数字全部由 `src/math/theorems.ts` 算出来,一个都不是手敲的。
 *
 * ⚠️ 完备性那两步是这一页唯一"BC 范围内证不完"的地方。
 *   不假装证完了,也不含糊带过:标出来,并在旁边写清它是公理、以及有理数上会怎样。
 *
 * ⚠️ 死界面自查:九条都能从图上和按钮条上点到;
 *   "要用完备性"那个标记只出现在介值定理和最值定理上(测试钉死);
 *   "站内还有一课"那个链接只在挂了 route 的四条上出现。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/theorems.ts`。
 */
import { useState } from 'react';
import {
  COMPLETENESS_NOTE, HEADLINE, MAIN_IDEA, THEOREMS,
  ancestorsOf, edges, needsCompleteness, restsOnCompleteness, showLine, theoremOf,
} from '../../math/theorems';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

/* ── 依赖图的几何 ────────────────────────────────────────────── */
const COLS = 6;
const ROWS = 4;
/**
 * ⚠️ 画布要够宽、方块要够窄,**格子之间得留得下一支箭头**。
 *   第一版 `GW = 760`、`BOX_W = 96`、七列:格宽 108.6,方块占 96,
 *   相邻两列之间只剩 12.6px —— Rolle → MVT 那支箭头被挤得看不见,
 *   而那正是这张图最该让人看见的一步。现在六列、格宽 130,留 38px。
 */
const GW = 780;
const GH = 230;
const CELL_W = GW / COLS;
const CELL_H = GH / ROWS;
const BOX_W = 92;
const BOX_H = 34;

const cx = (col: number) => col * CELL_W + CELL_W / 2;
const cy = (row: number) => row * CELL_H + CELL_H / 2;

export function TheoremsLab() {
  const [id, setId] = useState(THEOREMS[0]!.id);
  const t = theoremOf(id);
  const needs = needsCompleteness(t);
  const rests = restsOnCompleteness(t.id);
  const via = ancestorsOf(t.id).filter((a) => needsCompleteness(theoremOf(a)));

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Theorems
        </p>
        {/* ⚠️ H1 用能被搜到的正名,俏皮话退到副标题 —— 和 `#/mvt` 一个写法。
            学生找的是「theorem」这几个字,不是「where each one comes from」。 */}
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Theorems and Corollaries
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ⭐⭐⭐ 图就是目录 */}
      <section data-panel="chain" className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Follow the arrows — click any box
        </p>
        <svg viewBox={`0 0 ${GW} ${GH}`} className="mt-2 w-full" role="img"
          aria-label="A diagram showing which theorems are proved from which others">
          <defs>
            <marker id="thm-arrow" viewBox="0 0 10 10" refX="9" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={LAB.muted} />
            </marker>
          </defs>

          {/* 箭头先画,压在方块下面 */}
          {edges().map((e) => {
            const a = theoremOf(e.from).at;
            const b = theoremOf(e.to).at;
            const x1 = cx(a[0]) + BOX_W / 2;
            const y1 = cy(a[1]);
            const x2 = cx(b[0]) - BOX_W / 2;
            const y2 = cy(b[1]);
            const mid = (x1 + x2) / 2;
            const lit = e.from === t.id || e.to === t.id;
            return (
              <path
                key={`${e.from}-${e.to}`} data-edge={`${e.from}-${e.to}`}
                d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                fill="none" stroke={lit ? LAB.x2 : LAB.muted}
                strokeWidth={lit ? 2 : 1.2} opacity={lit ? 1 : 0.5}
                markerEnd="url(#thm-arrow)"
              />
            );
          })}

          {THEOREMS.map((q) => {
            const on = q.id === id;
            const related = ancestorsOf(t.id).includes(q.id) || t.dependsOn.includes(q.id);
            return (
              <g key={q.id} data-node={q.id} data-active={on ? 'yes' : 'no'}
                onClick={() => setId(q.id)} style={{ cursor: 'pointer' }}>
                <rect
                  x={cx(q.at[0]) - BOX_W / 2} y={cy(q.at[1]) - BOX_H / 2}
                  width={BOX_W} height={BOX_H} rx={7}
                  fill={on ? 'rgba(245,158,11,0.16)' : '#0f172a'}
                  stroke={on ? LAB.x2 : related ? LAB.muted : '#334155'}
                  strokeWidth={on ? 2 : 1.2}
                />
                <text
                  x={cx(q.at[0])} y={cy(q.at[1]) + 3.5} textAnchor="middle"
                  fill={on ? '#fcd34d' : related ? '#cbd5e1' : '#94a3b8'}
                  className="font-mono text-[9px]"
                >
                  {q.short}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Squeeze and the intermediate value theorem stand on their own; everything from the extreme
          value theorem rightward is one chain, and each arrow is a proof that actually uses the box
          behind it.
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        {THEOREMS.map((q) => (
          <button
            key={q.id} type="button" data-theorem={q.id} data-active={q.id === id ? 'yes' : 'no'}
            onClick={() => setId(q.id)}
            className={
              'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
              (q.id === id
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
            }
          >
            {q.name}
          </button>
        ))}
      </div>

      {/* ── 结论 ─────────────────────────────────────────────── */}
      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{t.name}</h2>
          {t.also && <span className="font-mono text-[11px] text-slate-500">also called the {t.also}</span>}
          {t.route && (
            <a data-lesson-link href={`#/${t.route}`}
              className="rounded-lg border border-slate-700 px-2 py-0.5 font-mono text-[10px] text-amber-300 hover:border-amber-400/60">
              interactive lesson →
            </a>
          )}
        </div>
        <p className="mt-2 overflow-x-auto text-[15px] text-slate-200"><Tex src={t.tex} display /></p>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{t.gives}</p>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* ── ① 条件 ────────────────────────────────────────── */}
        <section data-panel="conditions" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Conditions — and what each one rules out
          </p>
          <ol className="mt-2 space-y-2.5">
            {t.conditions.map((c) => (
              <li key={c.n} data-condition={c.n} className="rounded-lg border border-slate-800 px-2.5 py-2">
                <p className="font-mono text-[11px] text-slate-200">{c.n}. {c.text}</p>
                {/* ⭐ 一个条件只有在你知道它挡住了什么之后才算说清楚了。 */}
                <p data-without className="mt-1.5 text-[11px] leading-relaxed" style={{ color: '#fca5a5' }}>
                  <span aria-hidden>× </span>{c.without}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── ② 证明 ────────────────────────────────────────── */}
        <section data-panel="proof" data-needs-completeness={needs ? 'yes' : 'no'}
          className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Proof</p>
          <ol className="mt-2 space-y-2">
            {t.proof.map((p) => (
              <li key={p.n} data-step={p.n} data-gap={p.needsCompleteness ? 'yes' : 'no'}
                className={
                  'rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed ' +
                  (p.needsCompleteness
                    ? 'border border-amber-400/50 bg-amber-400/10 text-amber-100'
                    : 'text-slate-300')
                }
              >
                <span className="font-mono text-slate-500">{p.n}. </span>
                {p.needsCompleteness && (
                  <span className="font-mono text-[10px] text-amber-300">[beyond BC] </span>
                )}
                {p.text}
              </li>
            ))}
          </ol>
          {/* ⚠️ 直接用到、还是顺着链间接用到 —— 两种说法不一样,不许混 */}
          {rests && (
            <p data-rests className="mt-2.5 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-400">
              {needs
                ? COMPLETENESS_NOTE
                : `This proof is ordinary algebra, but it leans on the ${via
                  .map((a) => theoremOf(a).name.toLowerCase())
                  .join(' and the ')}, so it stands on the completeness of the reals at one remove.`}
            </p>
          )}
        </section>
      </div>

      {/* ── ③ 例题 ──────────────────────────────────────────── */}
      <section data-panel="example" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Worked example
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{t.example.setup}</p>
        <p className="mt-1 font-mono text-[12px] text-amber-300">{t.example.ask}</p>
        <ul className="mt-2.5 space-y-1.5">
          {t.example.lines.map((l, i) => (
            <li key={i} data-line={i} className="font-mono text-[11px] leading-relaxed text-slate-300">
              {l.text}
              {l.value !== undefined && (
                /* ⚠️ `data-value` 带的是**原始数**,不是显示出来的字符串。
                   断言要从属性上读 —— 这个项目在"拿渲染出来的文字当状态"上栽过。 */
                <span data-value={l.value} className="ml-1.5 text-[12px]" style={{ color: LAB.x1 }}>
                  {showLine(l)}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p data-answer className="mt-3 border-t border-slate-800 pt-2.5 text-sm leading-relaxed"
          style={{ color: LAB.pass }}>
          {t.example.answer}
        </p>
      </section>
    </main>
  );
}
