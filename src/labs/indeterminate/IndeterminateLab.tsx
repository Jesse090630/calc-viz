/**
 * LAB — 「0/0 Tells You Nothing Yet」(不定式)
 *
 * ⚠️⚠️ 这一节要打掉的是 `0/0 = 1` 和 `0/0 = 0`。
 * 打掉的办法**不是**给一个正确答案,而是把四个**代入结果完全相同、结局完全不同**
 * 的例子并排摆出来,让「代入这一步丢掉了信息」变成一件当场看得见的事。
 *
 * ⚠️ 颜色纪律:INDETERMINATE **不用红色**。没有任何东西失败了,
 * 只是信息不够。红色留给真的出错(例子 C 里那句「不能写成 = ∞」是提醒,也不是失败)。
 *
 * ⚠️ 这不是幻灯片。四张小图一直在页面上,划掉箭头那一下是**叠加**上去的,
 * 不是翻到下一页 —— 学生要能同时看见「四个答案」和「所以还不够」。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';
import { showScientific } from '../../math/format';
import {
  BAR_SCALE_NOTE,
  CASES,
  CASE_LABEL,
  NOT_ENOUGH,
  OTHER_FORMS,
  OTHER_FORMS_NOTE,
  RACE_COPY,
  UNDEFINED_WORDS,
  VIEW,
  WARNING_WORDS,
  answerOf,
  barLength,
  limitTex,
  partsOf,
  raceBars,
  raceOf,
  sampleQuotient,
  showValue,
  showX,
  sideDirection,
  sideValue,
  substitutionForm,
  type CaseId,
} from '../../math/indeterminate';

/* ══ 一张小图 ══════════════════════════════════════════════════════ */

/** 每个例子的纵向取景。C 要裁,不然 1/x 会把别的都压扁。 */
const Y_RANGE: Readonly<Record<CaseId, readonly [number, number]>> = {
  same: [-0.6, 2.1],
  'faster-top': [-2.3, 2.3],
  'faster-bottom': [-6.5, 6.5],
  'sign-jump': [-2.1, 2.1],
};

function CaseGraph({ id, width = 300, height = 168 }: { id: CaseId; width?: number; height?: number }) {
  const [yMin, yMax] = Y_RANGE[id];
  const V = makeViewport({
    width, height,
    xMin: VIEW.from, xMax: VIEW.to, yMin, yMax,
    padLeft: 16, padRight: 14, padTop: 12, padBottom: 20,
  });
  const points = useMemo(() => sampleQuotient(id), [id]);
  const left = sideValue(id, 'left');
  const right = sideValue(id, 'right');
  const zeroX = toSvgX(V, 0);

  return (
    <svg
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`The graph of ${partsOf(id).simplifiedTex} with a hole at x equals zero`}
    >
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={toSvgY(V, 0)} x2={V.width - V.padRight} y2={toSvgY(V, 0)} stroke={LAB.axis} strokeWidth={1} />
        <line x1={zeroX} y1={V.padTop} x2={zeroX} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1} opacity={0.6} />
      </g>
      <path d={polylinePath(V, points)} fill="none" stroke={LAB.curve} strokeWidth={2.3} strokeLinecap="round" />
      {/* ⚠️ 洞画成**空心**圈 —— 实心圈等于说那里有值。 */}
      {left !== null && (
        <circle cx={zeroX} cy={toSvgY(V, left)} r={4.5} fill="#0b1020" stroke={LAB.x2} strokeWidth={2} />
      )}
      {right !== null && right !== left && (
        <circle cx={zeroX} cy={toSvgY(V, right)} r={4.5} fill="#0b1020" stroke={LAB.x2} strokeWidth={2} />
      )}
    </svg>
  );
}

/* ══ ① 直接代入 ════════════════════════════════════════════════════ */

function SubstitutionAct() {
  const [frozen, setFrozen] = useState(false);
  return (
    <section
      data-panel="substitution"
      data-frozen={frozen ? 'yes' : 'no'}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        ① Direct substitution
      </p>
      <p className="mt-2 text-lg text-slate-100">
        <Tex src={limitTex('same')} />
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: LAB.x1 }}>numerator</p>
          <p className="mt-1 font-mono text-sm text-slate-200">x → 0</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: LAB.x2 }}>denominator</p>
          <p className="mt-1 font-mono text-sm text-slate-200">x → 0</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-slate-100">
        <Tex src="\frac{x}{x}" />
        <span className="text-slate-600">→</span>
        <span data-readout="form" style={{ color: LAB.x2 }}>
          <Tex src="\frac{0}{0}" />
        </span>
      </div>

      {frozen ? (
        <div className="mt-4 space-y-2">
          <Question ask="Can we conclude the limit is 0?" />
          <Question ask="Can we conclude it is 1?" />
          <p
            data-readout="verdict"
            className="mt-3 inline-block rounded-lg border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.14em]"
            style={{ borderColor: `${LAB.x2}66`, background: `${LAB.x2}12`, color: LAB.x2 }}
          >
            indeterminate
          </p>
          <p className="text-sm text-slate-300">Not enough information yet.</p>
          <p className="text-xs leading-relaxed text-slate-500">{UNDEFINED_WORDS}</p>
        </div>
      ) : (
        <button
          type="button"
          data-action="freeze"
          onClick={() => setFrozen(true)}
          className="mt-4 rounded-lg border border-cyan-400/40 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10"
        >
          Freeze here →
        </button>
      )}
    </section>
  );
}

function Question({ ask }: { ask: string }) {
  return (
    <p className="flex flex-wrap items-baseline gap-2 text-sm">
      <span className="text-slate-300">{ask}</span>
      {/* ⚠️ 这个 NO 用红色是对的:它标的是一个**确实错**的结论。 */}
      <span data-readout="no" className="font-mono text-xs font-bold" style={{ color: LAB.fail }}>NO</span>
    </p>
  );
}

/* ══ ② 四个例子 ════════════════════════════════════════════════════ */

function CasePanel({ id }: { id: CaseId }) {
  const parts = partsOf(id);
  const answer = answerOf(id);
  const left = sideValue(id, 'left');
  const right = sideValue(id, 'right');

  return (
    <section
      data-case={id}
      data-verdict={answer.verdict}
      data-substitution={substitutionForm(id)}
      className="flex min-w-0 flex-col rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[11px] font-bold" style={{ color: LAB.x1 }}>{CASE_LABEL[id]}</span>
        {/* ⭐ 四张卡的这一行**完全一样** —— 那正是这一节的支点 */}
        <span data-readout="substitution" className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
          substitution: {substitutionForm(id)}
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-100">
        <Tex src={limitTex(id)} />
      </p>
      <p className="mt-1.5 text-xs text-slate-500">
        for x ≠ 0 this is <span className="text-slate-300"><Tex src={parts.simplifiedTex} /></span>
      </p>

      <div className="mt-2">
        <CaseGraph id={id} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 font-mono text-[11px]">
        <span className="text-slate-500">from the left</span>
        <span data-readout="left" className="text-right" style={{ color: LAB.x1 }}>
          {left === null ? `${sideDirection(id, 'left') === 'up' ? 'grows' : 'falls'} without bound` : showValue(left)}
        </span>
        <span className="text-slate-500">from the right</span>
        <span data-readout="right" className="text-right" style={{ color: LAB.x2 }}>
          {right === null ? `${sideDirection(id, 'right') === 'up' ? 'grows' : 'falls'} without bound` : showValue(right)}
        </span>
      </div>

      <p
        data-readout="answer"
        className="mt-3 rounded-xl border px-3 py-2 text-center text-sm"
        style={{
          borderColor: answer.verdict === 'value' ? `${LAB.pass}59` : `${LAB.muted}59`,
          background: answer.verdict === 'value' ? `${LAB.pass}0f` : 'transparent',
          color: answer.verdict === 'value' ? LAB.pass : LAB.muted,
        }}
      >
        <Tex src={answer.tex} />
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{answer.headline}</p>
    </section>
  );
}

/* ══ ③ 划掉箭头 ════════════════════════════════════════════════════ */

/**
 * ⭐⭐ 这一节的**主视觉时刻**。
 * 四行 `0/0 ⇒ 某个结局` 并排,然后把四个箭头一起划掉,
 * 换成一行 `0/0 ⇒ WE NEED MORE INFORMATION`。
 *
 * ⚠️ 划掉的红线用红色是**恰当**的:那四个蕴含号确实是错的。
 * 但四个结局本身不变红 —— 它们各自都对,错的只是「代入能推出它们」这件事。
 */
function CrossOutAct() {
  const [crossed, setCrossed] = useState(false);
  return (
    <section
      data-panel="cross-out"
      data-crossed={crossed ? 'yes' : 'no'}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          ③ Four answers, one substitution
        </p>
        <button
          type="button"
          data-action="cross-out"
          onClick={() => setCrossed((v) => !v)}
          className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10"
        >
          {crossed ? 'Put the arrows back' : 'So does 0/0 imply any of these?'}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {CASES.map((id) => (
          <ImplicationRow key={id} id={id} crossed={crossed} />
        ))}
      </div>

      {crossed && (
        <div
          data-readout="conclusion"
          className="mt-5 rounded-2xl border px-4 py-4 text-center transition"
          style={{ borderColor: `${LAB.x2}66`, background: `${LAB.x2}12` }}
        >
          <p className="text-lg text-slate-100">
            <Tex src="\frac{0}{0} \;\Longrightarrow\;" />{' '}
            <span
              className="ml-1 inline-block rounded-lg border px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.14em] align-middle"
              style={{ borderColor: LAB.x2, color: LAB.x2 }}
            >
              {NOT_ENOUGH}
            </span>
          </p>
          <p className="mx-auto mt-3 max-w-xl text-xs leading-relaxed text-slate-400">{WARNING_WORDS}</p>
        </div>
      )}
    </section>
  );
}

function ImplicationRow({ id, crossed }: { id: CaseId; crossed: boolean }) {
  const answer = answerOf(id);
  const label = answer.verdict === 'value' ? String(answer.value)
    : answer.verdict === 'unbounded' ? 'unbounded behaviour'
      : 'DNE';
  return (
    <div
      data-implication={id}
      data-crossed={crossed ? 'yes' : 'no'}
      className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 transition"
      style={{ opacity: crossed ? 0.55 : 1 }}
    >
      <span className="text-sm text-slate-200"><Tex src="\frac{0}{0}" /></span>
      {/* 箭头本体 + 划掉它的那道红线 */}
      <span className="relative inline-flex items-center px-1">
        <span className="text-base text-slate-400" aria-hidden="true">⇒</span>
        <span
          aria-hidden="true"
          data-strike={crossed ? 'on' : 'off'}
          className="pointer-events-none absolute left-0 top-1/2 h-[2px] origin-left -rotate-12 rounded-full transition-[width] duration-500 ease-out"
          style={{ width: crossed ? '100%' : '0%', background: LAB.fail }}
        />
      </span>
      <span data-readout="implied" className="font-mono text-xs" style={{ color: crossed ? LAB.muted : LAB.pass }}>
        {label}
      </span>
    </div>
  );
}

/* ══ ④ 竞速 ════════════════════════════════════════════════════════ */

/** 竞速用的三个例子。⚠️ 提示词点名的正是这三个。 */
const RACERS: readonly CaseId[] = ['faster-top', 'faster-bottom', 'same'];

const RACE_MIN = 0.004;
const RACE_MAX = 1;

function RaceAct() {
  const reduced = usePrefersReducedMotion();
  const [x, setX] = useState(RACE_MAX);
  const [running, setRunning] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!running || reduced) return;
    const start = performance.now();
    const from = Math.log10(RACE_MAX);
    const to = Math.log10(RACE_MIN);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 4200);
      setX(10 ** (from + (to - from) * t));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        setRunning(false);
      }
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [running, reduced]);

  const run = useCallback(() => {
    setX(RACE_MAX);
    setRunning(true);
  }, []);

  return (
    <section data-panel="race" data-x={String(x)} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ④ A quotient compares rates
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Both shrink to zero. What matters is which one gets there faster.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-slate-400">
            x = <span data-readout="race-x" style={{ color: LAB.x2 }}>{showX(x)}</span>
          </span>
          <input
            type="range"
            aria-label="race x"
            min={Math.log10(RACE_MIN)}
            max={Math.log10(RACE_MAX)}
            step={0.01}
            value={Math.log10(x)}
            onChange={(e) => {
              setRunning(false);
              setX(10 ** Number(e.target.value));
            }}
            className="w-32 accent-current"
            style={{ color: LAB.x2 }}
          />
          <button
            type="button"
            data-action="run-race"
            onClick={run}
            disabled={reduced}
            className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:opacity-35"
          >
            {reduced ? 'Use the slider' : 'Run the race →'}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {RACERS.map((id) => (
          <RaceCard key={id} id={id} x={x} />
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-600">{BAR_SCALE_NOTE}</p>
    </section>
  );
}

function RaceCard({ id, x }: { id: CaseId; x: number }) {
  const bars = raceBars(id, x);
  const race = raceOf(id);
  const copy = RACE_COPY[race];
  const parts = partsOf(id);

  return (
    <div data-racer={id} data-race={race} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <p className="text-sm text-slate-100">
        <Tex src={parts.ratioTex} />
      </p>
      <div className="mt-3 space-y-2">
        <Bar
          which="top"
          tex={parts.numeratorTex}
          color={LAB.x1}
          fraction={bars.topFraction}
          value={bars.top}
        />
        <Bar
          which="bottom"
          tex={parts.denominatorTex}
          color={LAB.x2}
          fraction={bars.bottomFraction}
          value={bars.bottom}
        />
      </div>
      <p className="mt-2.5 font-mono text-[11px]" style={{ color: LAB.pass }}>
        ratio = <span data-readout="race-ratio">{showValue(bars.ratio, 4)}</span>
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
        <span className="text-slate-300">{copy.words}</span> — {copy.then}.
      </p>
    </div>
  );
}

function Bar({
  which,
  tex,
  color,
  fraction,
  value,
}: {
  which: 'top' | 'bottom';
  tex: string;
  color: string;
  fraction: number;
  value: number;
}) {
  return (
    <div data-bar={which} data-fraction={String(fraction)}>
      <div className="flex items-baseline justify-between gap-2 font-mono text-[10px]">
        <span style={{ color }}><Tex src={tex} /></span>
        <span className="text-slate-500">{showScientific(value, 1)}</span>
      </div>
      {/* ⚠️ 轨道与填充各带一个 data-* —— 浏览器检查按属性找元素,不按 DOM 结构猜。
          第一版没有这两个属性,检查用 `div > div` 选,选中的是上面那行标签,
          于是三根条量出来都是 312 px,断言全绿却什么也没验。 */}
      <div data-bar-track className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          data-bar-fill
          className="h-full rounded-full transition-[width] duration-150 ease-linear"
          style={{ width: `${(barLength(fraction) * 100).toFixed(2)}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ══ ⑤ 别的不定式 ══════════════════════════════════════════════════ */

function OtherFormsAct() {
  const [open, setOpen] = useState(false);
  return (
    <section
      data-panel="other-forms"
      data-open={open ? 'yes' : 'no'}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          ⑤ Other indeterminate forms
        </p>
        {!open && (
          <button
            type="button"
            data-action="open-other-forms"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            There are others →
          </button>
        )}
      </div>
      {open && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {OTHER_FORMS.map((form) => (
              <span
                key={form.tex}
                data-other-form={form.name}
                className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-sm text-slate-200"
              >
                <Tex src={form.tex} />
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">{OTHER_FORMS_NOTE}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            This lesson stays with 0/0. The rest come later — the point here is only that a form is a
            question, not an answer.
          </p>
        </>
      )}
    </section>
  );
}

/* ══ 页面 ══════════════════════════════════════════════════════════ */

export function IndeterminateLab() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Special limits
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Indeterminate Forms
        </h1>
        <p className="mt-3 text-base text-slate-400">
          0/0 tells you nothing yet. It is a warning, not an answer.
        </p>
      </header>

      <div className="mt-8 space-y-4">
        <SubstitutionAct />

        <section className="rounded-[1.5rem] border border-slate-700 bg-slate-950/70 p-4 shadow-2xl shadow-black/30 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ② Same form. Different answers.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Every one of these substitutes to 0/0. Read the four answers.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {CASES.map((id) => (
              <CasePanel key={id} id={id} />
            ))}
          </div>
        </section>

        <CrossOutAct />
        <RaceAct />
        <OtherFormsAct />
      </div>
    </main>
  );
}
