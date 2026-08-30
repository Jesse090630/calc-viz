/**
 * LAB — 「Watch the Pattern Grow」(二项式定理)
 *
 * ⭐⭐ 这一课的落点不是「查帕斯卡三角」,是**系数从哪来**:
 *   `(a+b)⁴` 是四个括号相乘;要凑出 `a²b²`,得从**恰好两个**括号里取 b。
 *   取法有 6 种,所以系数是 6。系数**就是**方案数。
 *   界面上那 6 行小格子是 `selections(4,2)` 直接画出来的 ——
 *   图上画的和公式里算的是**同一件事**,不是两件恰好一致的事。
 *
 * ⚠️ 定理(带 Σ 的那一行)**放在最后**。先看见规律,再给记号。
 */
import { useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import {
  ActionButton,
  IntSlider,
  LessonHead,
  Panel,
  QuietButton,
  RevealButton,
} from './shared';
import {
  EXPONENT_WORDS,
  GENERAL_TEX,
  HEADLINE,
  MAIN_IDEA,
  MAX_N,
  SIGMA_WORDS,
  THEOREM_TEX,
  choose,
  chooseTex,
  clampK,
  clampN,
  expansionTex,
  factorsTex,
  generalTerm,
  pascalRow,
  pascalTriangle,
  powerTitleTex,
  questionFor,
  selections,
  slotsOf,
  termsOf,
  valueByPower,
  valueByTerms,
} from '../../math/binomial';

/* ══ ① 展开式,一项一项长出来 ══════════════════════════════════════ */

function Expansion({ n, revealed, onReveal }: { n: number; revealed: number; onReveal: () => void }) {
  const terms = termsOf(n);
  const done = revealed >= terms.length;
  return (
    <Panel
      name="expansion"
      label="① Build the terms"
      extra={{ 'data-n': String(n), 'data-revealed': String(Math.min(revealed, terms.length)), 'data-total': String(terms.length) }}
    >
      <p className="text-base text-slate-100"><Tex src={powerTitleTex(n)} /></p>
      <p className="mt-1 font-mono text-[11px] text-slate-500">{n === 0 ? 'an empty product is 1' : factorsTex(n)}</p>

      <p className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
        {terms.slice(0, revealed).map((term, i) => (
          <span key={term.k} data-term={String(term.k)} className="inline-flex items-baseline gap-2">
            {i > 0 && <span className="text-slate-600">+</span>}
            <span className="text-slate-100"><Tex src={term.tex} /></span>
          </span>
        ))}
        {!done && revealed > 0 && <span className="text-slate-600">+ …</span>}
      </p>

      {!done && <RevealButton onClick={onReveal} label={revealed === 0 ? 'First term →' : 'Next term →'} />}
      {done && (
        <p data-readout="full-expansion" className="mt-2 text-xs leading-relaxed text-slate-500">
          <Tex src={`${powerTitleTex(n)} = ${expansionTex(n)}`} />
        </p>
      )}
    </Panel>
  );
}

/* ══ ② 帕斯卡三角 ══════════════════════════════════════════════════ */

function Pascal({ n }: { n: number }) {
  const triangle = useMemo(() => pascalTriangle(MAX_N + 1), []);
  return (
    <Panel name="pascal" label="② Pascal's triangle" extra={{ 'data-highlight': String(n) }}>
      <div className="flex flex-col items-center gap-1">
        {triangle.map((row, r) => (
          <div
            key={r}
            data-pascal-row={String(r)}
            data-active={r === n ? 'yes' : 'no'}
            className="flex gap-1.5 rounded-lg px-1.5 py-0.5 transition"
            style={r === n ? { background: `${LAB.x2}1a` } : undefined}
          >
            {row.map((value, k) => (
              <span
                key={k}
                data-pascal-cell={`${r}-${k}`}
                className="inline-block min-w-[1.9rem] text-center font-mono text-xs"
                style={{ color: r === n ? LAB.x2 : LAB.muted, fontWeight: r === n ? 700 : 400 }}
              >
                {value}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
        Row {n} is <span data-readout="row" style={{ color: LAB.x2 }}>{pascalRow(n).join(' ')}</span> — the same numbers
        standing in front of the terms above. Each entry is the sum of the two above it.
      </p>
    </Panel>
  );
}

/* ══ ③ 为什么是这些数:数一数 ══════════════════════════════════════ */

function WhyPanel({ n, k }: { n: number; k: number }) {
  const question = questionFor(n, k);
  const all = selections(n, k);
  return (
    <Panel
      name="why"
      label="③ Where the coefficient comes from"
      extra={{ 'data-n': String(n), 'data-k': String(k), 'data-ways': String(all.length) }}
    >
      <p className="text-sm text-slate-300">{question.ask}</p>
      <p className="mt-1 text-base text-slate-100">
        target: <Tex src={question.targetTex} />
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {all.map((picked, index) => (
          <div key={picked.join('-')} data-selection={String(index)} className="flex gap-0.5">
            {slotsOf(n, picked).map((slot, i) => (
              <span
                key={i}
                data-slot={slot}
                className="inline-flex h-6 w-6 items-center justify-center rounded border font-mono text-[11px]"
                style={{
                  borderColor: slot === 'b' ? LAB.x2 : '#334155',
                  background: slot === 'b' ? `${LAB.x2}1f` : 'transparent',
                  color: slot === 'b' ? LAB.x2 : LAB.muted,
                }}
              >
                {slot}
              </span>
            ))}
          </div>
        ))}
      </div>

      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
        <span className="text-slate-400">ways to do it:</span>
        <span data-readout="ways" className="font-mono text-base" style={{ color: LAB.pass }}>{all.length}</span>
        <span className="text-slate-600">=</span>
        <span style={{ color: LAB.pass }}><Tex src={chooseTex(n, k)} /></span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{MAIN_IDEA}</p>
    </Panel>
  );
}

/* ══ ④ 指数机 ══════════════════════════════════════════════════════ */

function ExponentStrip({ n }: { n: number }) {
  const terms = termsOf(n);
  return (
    <Panel name="exponents" label="④ The exponent machine" extra={{ 'data-n': String(n) }}>
      <div className="overflow-x-auto">
        <div
          className="grid gap-x-2 gap-y-1 text-center font-mono text-xs"
          style={{ gridTemplateColumns: `auto repeat(${terms.length}, minmax(2.6rem, 1fr))` }}
        >
          <span className="text-left text-slate-500">a</span>
          {terms.map((term) => (
            <span key={`a${term.k}`} data-a-power={String(term.k)} style={{ color: LAB.x1 }}>{term.aPower}</span>
          ))}
          <span className="text-left text-slate-500">term</span>
          {terms.map((term) => (
            <span key={`t${term.k}`} className="text-slate-200"><Tex src={term.tex} /></span>
          ))}
          <span className="text-left text-slate-500">b</span>
          {terms.map((term) => (
            <span key={`b${term.k}`} data-b-power={String(term.k)} style={{ color: LAB.x2 }}>{term.bPower}</span>
          ))}
          <span className="text-left text-slate-500">sum</span>
          {terms.map((term) => (
            <span key={`s${term.k}`} data-power-sum={String(term.k)} style={{ color: LAB.pass }}>
              {term.aPower + term.bPower}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: LAB.pass }}>{EXPONENT_WORDS}</p>
    </Panel>
  );
}

/* ══ ⑤ 通项 ════════════════════════════════════════════════════════ */

function GeneralTerm({ n, k, onK }: { n: number; k: number; onK: (next: number) => void }) {
  const term = generalTerm(n, k);
  return (
    <Panel name="general" label="⑤ One term at a time" extra={{ 'data-k': String(term.k) }}>
      <p className="text-base text-slate-100"><Tex src={GENERAL_TEX} /></p>
      <div className="mt-3">
        <IntSlider name="k" label="k" value={term.k} min={0} max={n} onChange={onK} colour={LAB.pass} />
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">coefficient</span>
        <span data-readout="gt-coefficient" className="text-right" style={{ color: LAB.pass }}>{term.coefficient}</span>
        <span className="text-slate-500">a exponent (n − k)</span>
        <span data-readout="gt-a" className="text-right" style={{ color: LAB.x1 }}>{term.aPower}</span>
        <span className="text-slate-500">b exponent (k)</span>
        <span data-readout="gt-b" className="text-right" style={{ color: LAB.x2 }}>{term.bPower}</span>
      </div>
      <p data-readout="gt-term" className="mt-3 text-xl text-slate-100"><Tex src={term.tex} /></p>
    </Panel>
  );
}

/* ══ ⑥ 定理 ════════════════════════════════════════════════════════ */

function Theorem({ n }: { n: number }) {
  const [shown, setShown] = useState(false);
  if (!shown) {
    return (
      <Panel name="theorem" label="⑥ The theorem" extra={{ 'data-shown': 'no' }}>
        <p className="text-xs leading-relaxed text-slate-500">
          You have the coefficients, the exponents, and the reason behind both. The compact way of writing all
          of it is one line — worth reading only now.
        </p>
        <ActionButton name="show-theorem" onClick={() => setShown(true)}>Show the formula →</ActionButton>
      </Panel>
    );
  }
  return (
    <Panel name="theorem" label="⑥ The theorem" tone="good" extra={{ 'data-shown': 'yes' }}>
      <p className="text-base text-slate-100"><Tex src={THEOREM_TEX} display /></p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{SIGMA_WORDS}</p>
      <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">terms it generates</span>
        <span data-readout="term-count" className="text-right" style={{ color: LAB.pass }}>{n + 1}</span>
        <span className="text-slate-500">sum of the row</span>
        <span data-readout="row-total" className="text-right" style={{ color: LAB.x2 }}>{2 ** n}</span>
      </div>
    </Panel>
  );
}

/* ══ 数值自检 ══════════════════════════════════════════════════════ */

function NumericCheck({ n }: { n: number }) {
  const a = 2;
  const b = 3;
  const byTerms = valueByTerms(n, a, b);
  const byPower = valueByPower(n, a, b);
  const agree = Math.abs(byTerms - byPower) < 1e-9;
  return (
    <Panel name="check" label="Does it actually work?" extra={{ 'data-agree': agree ? 'yes' : 'no' }}>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">(2 + 3)^{n}</span>
        <span data-readout="by-power" className="text-right" style={{ color: LAB.x1 }}>{byPower}</span>
        <span className="text-slate-500">sum of the terms</span>
        <span data-readout="by-terms" className="text-right" style={{ color: agree ? LAB.pass : LAB.fail }}>{byTerms}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Expanding and then adding gives the same number as raising the bracket directly. It has to — the
        expansion is only a rearrangement.
      </p>
    </Panel>
  );
}

/* ══ 页面 ══════════════════════════════════════════════════════════ */

export function PatternGrowLab() {
  const [rawN, setRawN] = useState(4);
  const [rawK, setRawK] = useState(2);
  const [revealed, setRevealed] = useState(0);
  const n = clampN(rawN);
  const k = clampK(n, rawK);

  const setN = (next: number) => { setRawN(next); setRevealed(0); };

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <LessonHead
        title="The Binomial Theorem"
        headline={HEADLINE}
        lede="Where the coefficients come from, before the formula that packages them."
      />

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <IntSlider name="n" label="n" value={n} min={0} max={MAX_N} onChange={setN} colour={LAB.x2} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-slate-500">
              coefficient of <Tex src={generalTerm(n, k).tex} />
            </span>
            <QuietButton name="restart" onClick={() => { setRawN(4); setRawK(2); setRevealed(0); }}>Start over</QuietButton>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr_0.95fr]">
          <div className="flex min-w-0 flex-col gap-4">
            <Expansion n={n} revealed={revealed} onReveal={() => setRevealed((v) => v + 1)} />
            <Pascal n={n} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <WhyPanel n={n} k={k} />
            <ExponentStrip n={n} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <GeneralTerm n={n} k={k} onK={setRawK} />
            <NumericCheck n={n} />
            <Theorem n={n} />
          </div>
        </div>
      </section>
    </main>
  );
}

/** 保持 `choose` 被引用 —— 它是这一课全部系数的来源。 */
export const COEFFICIENT_SOURCE = choose;
