/**
 * LAB — 「Shift, Subtract, Collapse」(等比级数)
 *
 * ⭐⭐ 有限公式**不是给出来的,是逼出来的**:
 *   把整条式子乘 r,每一项往右挪一格;两式对齐相减,中间**全部成对抵消**,
 *   只剩头尾两块。那串抵消是这一课的画面。
 *
 * ⭐ 无穷公式**不另起炉灶**:有限公式 + 一句 `rⁿ → 0`。
 *   所以 `|r| < 1` 不是武断的规矩,它恰好是让 `rⁿ → 0` 成立的条件 ——
 *   界面上让学生自己试 r = 0.5 / −0.5 / 1 / 1.2 / −1,五种结局各不相同。
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
  Toggle,
  useTween,
} from './shared';
import {
  CANCEL_WORDS,
  FINITE_CAVEAT,
  FINITE_TEX,
  HEADLINE,
  INFINITE_CAVEAT,
  INFINITE_TEX,
  MAX_TERMS,
  R_RANGE,
  SAMPLE_RATIOS,
  blocks,
  clampN,
  clampR,
  converges,
  finiteWorkedTex,
  infiniteSum,
  partialSums,
  regimeOf,
  shiftRows,
  show,
  shrinksBelow,
  sumByAdding,
  sumByFormula,
  tailWeight,
  termTex,
  terms,
  termsPlain,
} from '../../math/geometricSeries';

type Mode = 'finite' | 'infinite';

const MODES = [
  { id: 'finite' as const, label: 'Finite' },
  { id: 'infinite' as const, label: 'Infinite' },
];

/* ══ 项的条形图 ════════════════════════════════════════════════════ */

function Bars({ a, r, n }: { a: number; r: number; n: number }) {
  const list = blocks(a, r, n);
  const widest = Math.max(...list.map((b) => b.fraction), 1);
  return (
    <div data-panel="bars" className="space-y-1.5">
      {list.map((block) => (
        <div key={block.index} data-bar={String(block.index)} data-value={String(block.value)}>
          <div className="flex items-baseline justify-between gap-2 font-mono text-[10px]">
            <span style={{ color: block.index === 0 ? LAB.x1 : LAB.x2 }}>
              <Tex src={termTex(block.index)} />
            </span>
            <span className="text-slate-500">{show(block.value, 4)}</span>
          </div>
          <div className="mt-0.5 h-2.5 w-full rounded-full bg-slate-800">
            <div
              data-bar-fill
              className="h-full rounded-full transition-[width] duration-200 ease-out"
              style={{
                width: `${Math.min(100, (block.fraction / widest) * 100).toFixed(2)}%`,
                // 负项用青,正项用琥珀 —— 交错的时候一眼看得出在变号
                background: block.value < 0 ? LAB.x1 : LAB.x2,
              }}
            />
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] leading-relaxed text-slate-600">
        Each bar is <span style={{ color: LAB.x2 }}>r</span> times the one above it.
      </p>
    </div>
  );
}

/* ══ 移位相减 ══════════════════════════════════════════════════════ */

function ShiftSubtract({ n }: { n: number }) {
  const [step, setStep] = useState(0);
  const rows = useMemo(() => shiftRows(n), [n]);
  const { t, play, reset, animated } = useTween(1200);
  const shifted = step >= 1 && t > 0.05;
  const struck = step >= 2;

  const cell = (index: number | null, muted: boolean) => (
    <span
      className="inline-block min-w-[3.2rem] text-center text-sm transition"
      style={{
        opacity: index === null ? 0 : muted ? 0.32 : 1,
        textDecoration: muted ? 'line-through' : undefined,
        textDecorationColor: LAB.x2,
        color: '#e2e8f0',
      }}
    >
      {index === null ? '·' : <Tex src={termTex(index)} />}
    </span>
  );

  return (
    <Panel name="shift" label="② Shift, subtract, collapse" extra={{ 'data-step': String(step), 'data-struck': struck ? 'yes' : 'no' }}>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full space-y-1">
          {/* 上式 */}
          <div className="flex items-center gap-1" data-row="top">
            <span className="w-14 shrink-0 font-mono text-[11px]" style={{ color: LAB.x1 }}>S<sub>n</sub> =</span>
            {rows.map((row, i) => (
              <span key={`t${i}`} data-cell-top={String(i)} data-cancelled={struck && row.cancels ? 'yes' : 'no'}>
                {cell(row.top, struck && row.cancels)}
              </span>
            ))}
          </div>
          {/* 下式:step ≥ 1 时整行右移一格 */}
          <div
            className="flex items-center gap-1 transition-transform duration-500 ease-out"
            data-row="bottom"
            data-shifted={shifted ? 'yes' : 'no'}
            style={{ transform: shifted ? 'translateX(0)' : 'translateX(-3.45rem)' }}
          >
            <span className="w-14 shrink-0 font-mono text-[11px]" style={{ color: LAB.x2 }}>rS<sub>n</sub> =</span>
            {rows.map((row, i) => (
              <span key={`b${i}`} data-cell-bottom={String(i)} data-cancelled={struck && row.cancels ? 'yes' : 'no'}>
                {cell(row.bottom, struck && row.cancels)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {step >= 2 && (
        <p data-readout="cancel-note" className="mt-3 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
          {CANCEL_WORDS} Only the first and the last have no partner.
        </p>
      )}

      {step >= 3 && (
        <div data-readout="collapsed" className="mt-3 space-y-2">
          <p className="text-base text-slate-100"><Tex src="S_n - rS_n = a - ar^{n}" /></p>
          <p className="text-base text-slate-100"><Tex src="S_n(1 - r) = a(1 - r^{n})" /></p>
        </div>
      )}

      {step >= 4 && (
        <div data-readout="formula" className="mt-3 rounded-xl border px-3 py-2.5"
          style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}>
          <p className="text-base text-slate-100"><Tex src={FINITE_TEX} display /></p>
          <p className="mt-1 text-center font-mono text-[11px] text-slate-500"><Tex src={FINITE_CAVEAT} /></p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {step < 4 && (
          <RevealButton
            onClick={() => { if (step === 0) play(); setStep((s) => s + 1); }}
            label={['Multiply by r →', 'Subtract →', 'What is left? →', 'Solve for Sₙ →'][step] ?? 'Next →'}
          />
        )}
        {step > 0 && <QuietButton name="shift-reset" onClick={() => { setStep(0); reset(); }}>Start over</QuietButton>}
        {!animated && step === 0 && (
          <span className="self-center font-mono text-[10px] text-slate-600">motion reduced — the shift jumps</span>
        )}
      </div>
    </Panel>
  );
}

/* ══ 无穷模式 ══════════════════════════════════════════════════════ */

function InfiniteMode({ a, r }: { a: number; r: number }) {
  const limit = infiniteSum(a, r);
  const sums = partialSums(a, r, MAX_TERMS);
  const regime = regimeOf(r);
  const need = shrinksBelow(r, 1e-3);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="flex min-w-0 flex-col gap-4">
        <Panel name="fill" label="④ Filling the space" extra={{ 'data-converges': regime.converges ? 'yes' : 'no' }}>
          {/* 一条固定长度的槽,部分和一段段填进去 */}
          <div className="relative h-8 w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900/50">
            {limit !== null && terms(a, r, MAX_TERMS).map((value, i) => {
              const before = i === 0 ? 0 : sums[i - 1]!;
              const left = (before / limit) * 100;
              const width = (value / limit) * 100;
              if (!Number.isFinite(left) || !Number.isFinite(width) || width <= 0) return null;
              return (
                <div
                  key={i}
                  data-slice={String(i)}
                  className="absolute inset-y-0"
                  style={{
                    left: `${Math.max(0, Math.min(100, left))}%`,
                    width: `${Math.max(0, Math.min(100 - left, width))}%`,
                    background: i % 2 === 0 ? `${LAB.x2}bb` : `${LAB.x1}bb`,
                    borderRight: '1px solid #0b1020',
                  }}
                />
              );
            })}
          </div>
          {limit === null && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
              Nothing to fill — with this r the partial sums never settle on a number.
            </p>
          )}
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px]">
            <span className="text-slate-500">partial sums</span>
            <span data-readout="partials" className="text-right text-slate-300">
              {sums.slice(0, 6).map((s) => show(s, 5)).join(', ')}…
            </span>
            <span className="text-slate-500">limit</span>
            <span data-readout="limit" className="text-right" style={{ color: limit === null ? LAB.muted : LAB.pass }}>
              {limit === null ? 'no limit' : show(limit, 5)}
            </span>
          </div>
        </Panel>

        <Panel name="regime" label="⑤ Try a different r" extra={{ 'data-behaviour': regime.behaviour }}>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_RATIOS.map((sample) => (
              <span key={sample} data-sample={String(sample)} data-active={sample === r ? 'yes' : 'no'}
                className="rounded-lg border px-2 py-1 font-mono text-[11px]"
                style={{
                  borderColor: sample === r ? `${LAB.x2}99` : '#334155',
                  color: sample === r ? LAB.x2 : LAB.muted,
                  background: sample === r ? `${LAB.x2}14` : 'transparent',
                }}
              >
                r = {sample}
              </span>
            ))}
          </div>
          <p data-readout="behaviour-words" className="mt-2.5 text-sm leading-relaxed text-slate-300">{regime.words}</p>
          {/* ⚠️ 不收敛不是"错误",所以这里**不用红色**。 */}
          <p className="mt-1 font-mono text-[11px]" style={{ color: regime.converges ? LAB.pass : LAB.x2 }}>
            {regime.converges ? 'the sums settle' : 'the sums never settle'}
          </p>
        </Panel>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <Panel name="tail" label="⑥ Why |r| < 1" extra={{ 'data-tail': String(tailWeight(r, MAX_TERMS)) }}>
          <p className="text-sm text-slate-300">
            Start from the finite formula and let n grow.
          </p>
          <p className="mt-2 text-base text-slate-100"><Tex src={FINITE_TEX} /></p>
          <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px]">
            <span className="text-slate-500">|r|<sup>4</sup></span>
            <span className="text-right text-slate-300">{show(tailWeight(r, 4), 6)}</span>
            <span className="text-slate-500">|r|<sup>8</sup></span>
            <span className="text-right text-slate-300">{show(tailWeight(r, 8), 6)}</span>
            <span className="text-slate-500">|r|<sup>{MAX_TERMS}</sup></span>
            <span data-readout="tail" className="text-right" style={{ color: converges(r) ? LAB.pass : LAB.x2 }}>
              {show(tailWeight(r, MAX_TERMS), 6)}
            </span>
          </div>
          <p data-readout="tail-words" className="mt-2.5 text-xs leading-relaxed text-slate-400">
            {need === null
              ? 'This rⁿ never gets small, so the a·rⁿ term never goes away and there is nothing to drop.'
              : `Ask for |rⁿ| below 0.001 and n = ${need} does it. Ask for less and a larger n does it. That is what rⁿ → 0 means.`}
          </p>
        </Panel>

        {converges(r) ? (
          <Panel name="infinite-result" label="Drop the term that vanishes" tone="good" extra={{ 'data-limit': String(limit) }}>
            <p className="text-base text-slate-100"><Tex src={INFINITE_TEX} display /></p>
            <p className="mt-1 text-center font-mono text-[11px] text-slate-500"><Tex src={INFINITE_CAVEAT} /></p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Nothing new was proved. The finite formula lost one term, because that term goes to zero — and it
              only goes to zero when |r| &lt; 1.
            </p>
          </Panel>
        ) : (
          <Panel name="infinite-result" label="No formula here" extra={{ 'data-limit': 'none' }}>
            <p className="text-sm leading-relaxed text-slate-300">
              With |r| ≥ 1 the term <Tex src="ar^{n}" /> does not disappear, so there is nothing to drop and no
              infinite sum to state. The rule is not a restriction bolted on afterwards — it is the exact
              condition the derivation needs.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

/* ══ 页面 ══════════════════════════════════════════════════════════ */

export function ShiftSubtractLab() {
  const [rawA, setRawA] = useState(3);
  const [rawR, setRawR] = useState(2);
  const [rawN, setRawN] = useState(5);
  const [mode, setMode] = useState<Mode>('finite');

  const a = rawA;
  const r = clampR(rawR);
  const n = clampN(rawN);
  const byAdding = sumByAdding(a, r, n);
  const byFormula = sumByFormula(a, r, n);
  const agree = Math.abs(byAdding - byFormula) < 1e-9;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <LessonHead
        title="Geometric Series"
        headline={HEADLINE}
        lede="Multiply by r, line the two rows up, and watch the middle disappear."
      />

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <IntSlider name="a" label="a" value={a} min={1} max={6} onChange={setRawA} colour={LAB.x1} />
            <label className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-400">
                r = <span data-readout="r" style={{ color: LAB.x2 }}>{r}</span>
              </span>
              <input
                type="range" aria-label="r"
                min={R_RANGE.min} max={R_RANGE.max} step={0.1}
                value={r} onChange={(e) => setRawR(Number(e.target.value))}
                className="w-28 accent-current" style={{ color: LAB.x2 }}
              />
            </label>
            {mode === 'finite' && (
              <IntSlider name="n" label="n" value={n} min={1} max={MAX_TERMS} onChange={setRawN} colour={LAB.pass} />
            )}
          </div>
          <Toggle name="mode" options={MODES} value={mode} onChange={setMode} />
        </div>

        {mode === 'finite' ? (
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[0.85fr_1.15fr_0.9fr]">
            <Panel name="terms" label="① See the pattern" extra={{ 'data-n': String(n) }}>
              <Bars a={a} r={r} n={n} />
            </Panel>

            <ShiftSubtract n={n} />

            <div className="flex min-w-0 flex-col gap-4">
              <Panel name="check" label="③ Both ways agree" tone={agree ? 'good' : 'plain'} extra={{ 'data-agree': agree ? 'yes' : 'no' }}>
                <p className="font-mono text-[11px] leading-relaxed text-slate-400">
                  {termsPlain(a, r, n, Number.isInteger(r) ? 0 : 3)}
                </p>
                <div className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                  <span className="text-slate-500">added up</span>
                  <span data-readout="by-adding" className="text-right" style={{ color: LAB.x1 }}>{show(byAdding, 4)}</span>
                  <span className="text-slate-500">by formula</span>
                  <span data-readout="by-formula" className="text-right" style={{ color: agree ? LAB.pass : LAB.fail }}>
                    {show(byFormula, 4)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-200"><Tex src={finiteWorkedTex(a, r, n)} /></p>
                {r === 1 && (
                  // ⚠️ r = 1 时闭形式是 0/0。页面上说清楚,而不是让一个 NaN 溜上屏。
                  <p data-readout="r-one" className="mt-2 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
                    At r = 1 the formula would divide by zero, so this case is handled on its own: every term is
                    a, and there are n of them.
                  </p>
                )}
              </Panel>

              <Panel name="next" label="Then what?">
                <p className="text-xs leading-relaxed text-slate-400">
                  Let n run forever and one term in that formula does the deciding. Switch to{' '}
                  <span style={{ color: LAB.x2 }}>Infinite</span> to see which.
                </p>
                <ActionButton name="go-infinite" onClick={() => setMode('infinite')}>Infinite mode →</ActionButton>
              </Panel>
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <InfiniteMode a={a} r={r} />
          </div>
        )}
      </section>
    </main>
  );
}
