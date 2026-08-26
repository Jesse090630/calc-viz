/**
 * LAB — 特殊极限一节的**共用零件**。
 *
 * 六课(sin/x、tan/x、(1−cos)/x、(1−cos)/x²、(eˣ−1)/x、ln(1+x)/x)在版式上
 * 是同一副骨架:
 *   ① 直接代入 → 0/0 → INDETERMINATE
 *   ② 十进位阶梯上的活数字
 *   ③ 放大到 0 附近,曲线与它的局部替身重合
 *   ④ 代数一步一步露
 *   ⑤ 因子表盘 → 乘积
 *   ⑥ 结论
 * 差别只在**换一条 form**,外加每课一块自己的面板(见 `extras.tsx`)。
 *
 * ⚠️ 所以这里放的是零件,不是「另一个通用引擎」:
 * 每个零件只认 `FormId`,不认「第几步」。这一节和别的实验台一样**不走 `src/engine/`**。
 *
 * ⚠️ 屏幕上的每个数字都从 `src/math/specialForms.ts` 出来。
 * 组件里不出现裸算式(禁止 2)。
 */
import { useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { showScientific } from '../../math/format';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  INDETERMINATE_WORDS,
  LADDER,
  NUMERIC_CAVEAT,
  ZOOM_LEVELS,
  formOf,
  naiveBreaksAt,
  ratio,
  relativeGapAt,
  rowsFor,
  sampleCurve,
  showGap,
  showRatio,
  showX,
  spanAt,
  substitutionForm,
  type Curve,
  type FormId,
  type Step,
} from '../../math/specialForms';

/** 曲线角色 → 颜色。subject 用绿(结果色),companion 用琥珀(主角),aside 用青。 */
const ROLE_COLOR = {
  subject: LAB.pass,
  companion: LAB.x2,
  aside: LAB.x1,
} as const;

/* ══ ① 直接代入 ════════════════════════════════════════════════════ */

/**
 * ⚠️ 这块面板的措辞是这一节的地基:
 * `0/0` **不是**答案,是一条「还不够」的警告。所以这里
 *   · 不出现 "= 1" 或 "= 0" 之类的结论;
 *   · INDETERMINATE 不用红色 —— 没有任何东西**失败**了,
 *     只是信息不够。红色留给真的出错(Jesse 的规矩)。
 */
export function SubstitutionPanel({ id }: { id: FormId }) {
  const form = formOf(id);
  return (
    <section
      data-panel="substitution"
      data-form={substitutionForm(id)}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        ① Direct substitution
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-100">
        <Tex src={`\\lim_{x \\to 0} ${form.ratioTex}`} />
        <span className="text-slate-600">→</span>
        <span style={{ color: LAB.x2 }}>
          <Tex src="\frac{0}{0}" />
        </span>
      </div>
      <p
        data-readout="verdict"
        className="mt-2.5 inline-block rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ borderColor: `${LAB.x2}66`, background: `${LAB.x2}12`, color: LAB.x2 }}
      >
        indeterminate
      </p>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{INDETERMINATE_WORDS}</p>
    </section>
  );
}

/* ══ ② 阶梯 ════════════════════════════════════════════════════════ */

/**
 * 十进位阶梯上的活数字。
 *
 * ⚠️ 第三列是**离极限还有多远**,用科学记数。
 * 只看第二列的话,0.9999833 和 0.9999998 都会被读成「差不多是 1」;
 * 第三列写着 1.7×10⁻⁵ 和 1.7×10⁻⁷,那是**两个数量级**的差别 ——
 * 而「一档比一档更近」正是这一节唯一想让人看见的东西。
 *
 * ⚠️ `showNaive` 打开时多一列:教科书写法算出来的同一个数。
 * 两条余弦课要用它 —— 那一列会在最后几档变成 0.0000000,
 * 而正确答案是 0.5。把这件事摆出来,比在注释里说一句有用。
 */
export function LadderTable({
  id,
  showNaive = false,
  xs = LADDER,
}: {
  id: FormId;
  showNaive?: boolean;
  xs?: readonly number[];
}) {
  const form = formOf(id);
  const rows = useMemo(() => rowsFor(id, xs), [id, xs]);
  const breaks = useMemo(() => naiveBreaksAt(id), [id]);

  return (
    <section data-panel="ladder" data-limit={String(form.limit)} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        ② Walk x toward zero
      </p>
      <div
        className={`mt-3 grid gap-x-3 gap-y-1 font-mono text-[11px] ${showNaive ? 'grid-cols-[auto_1fr_1fr_1fr]' : 'grid-cols-[auto_1fr_1fr]'}`}
      >
        <span className="text-slate-500">x</span>
        <span className="text-right text-slate-500">ratio</span>
        {showNaive && <span className="text-right text-slate-500">1 − cos x, naively</span>}
        <span className="text-right text-slate-500">from the limit</span>
        {rows.map((row) => (
          <Row key={row.x} row={row} showNaive={showNaive} />
        ))}
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-slate-400">
        <span style={{ color: LAB.x2 }}>Interesting.</span> {NUMERIC_CAVEAT}
      </p>
      {showNaive && breaks !== null && (
        // ⚠️ 这是**真的算错**,不是风格问题 —— 所以这里用红色是恰当的。
        <p data-readout="naive-note" data-breaks-at={String(breaks)} className="mt-1.5 text-xs leading-relaxed" style={{ color: LAB.fail }}>
          From x = 10⁻{breaks} down, computing 1 − cos x directly loses every significant digit — two
          nearly equal numbers subtracted. The ratio column uses 2 sin²(x/2) instead, which is the same
          quantity computed accurately.
        </p>
      )}
    </section>
  );
}

function Row({
  row,
  showNaive,
}: {
  row: { x: number; value: number | null; naive: number | null; gap: number | null };
  showNaive: boolean;
}) {
  const naiveWrong =
    showNaive && row.naive !== null && row.value !== null && Math.abs(row.naive - row.value) > 1e-3 * Math.max(1, Math.abs(row.value));
  return (
    <>
      <span data-row-x={String(row.x)} className="text-slate-400">{showX(row.x)}</span>
      <span data-row-value={String(row.x)} className="text-right" style={{ color: LAB.pass }}>
        {showRatio(row.value)}
      </span>
      {showNaive && (
        <span
          data-row-naive={String(row.x)}
          className="text-right"
          style={{ color: naiveWrong ? LAB.fail : LAB.muted }}
        >
          {showRatio(row.naive)}
        </span>
      )}
      <span data-row-gap={String(row.x)} className="text-right text-slate-500">
        {showGap(row.gap)}
      </span>
    </>
  );
}

/* ══ ③ 放大 ════════════════════════════════════════════════════════ */

/**
 * 缩放面板:一条曲线和它在 0 附近的**局部替身**,越放大越贴合。
 *
 * ⚠️ y 轴的范围**从取样值算出来**,不写死。写死的话:
 *   · e^x 那一课的画面中心在 y = 1 附近,y ∈ [−1, 1] 会把整条曲线挤到框外;
 *   · 而放大之后 y 的跨度只有 10⁻³ 量级,固定范围会让两条线永远重合 ——
 *     「一开始不像、放大才像」这句话就没有对照了。
 */
export function ZoomPanel({
  id,
  level,
  onLevel,
  width = 340,
  height = 300,
}: {
  id: FormId;
  level: number;
  onLevel: (next: number) => void;
  width?: number;
  height?: number;
}) {
  const form = formOf(id);
  const span = spanAt(id, level);
  const gap = relativeGapAt(id, level);

  const series = useMemo(
    () => form.curves.map((curve) => ({ curve, points: sampleCurve(curve.at, -span, span, 240) })),
    [form, span],
  );

  const { yMin, yMax } = useMemo(() => {
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (const { points } of series) {
      for (const p of points) {
        if (p.y === null || !Number.isFinite(p.y)) continue;
        low = Math.min(low, p.y);
        high = Math.max(high, p.y);
      }
    }
    if (!Number.isFinite(low) || !Number.isFinite(high) || high - low < 1e-12) {
      return { yMin: -1, yMax: 1 };
    }
    const pad = (high - low) * 0.14;
    return { yMin: low - pad, yMax: high + pad };
  }, [series]);

  const V = makeViewport({
    width, height,
    xMin: -span, xMax: span, yMin, yMax,
    padLeft: 20, padRight: 18, padTop: 20, padBottom: 30,
  });
  const zeroY = toSvgY(V, 0);
  const zeroX = toSvgX(V, 0);

  return (
    <section data-panel="zoom" data-level={String(level)} data-gap={gap.toExponential(3)} className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          ③ Zoom toward zero
        </p>
        <div className="flex items-center gap-2">
          <input
            type="range"
            aria-label="zoom"
            min={0}
            max={ZOOM_LEVELS}
            step={1}
            value={level}
            onChange={(e) => onLevel(Number(e.target.value))}
            className="w-28 accent-current"
            style={{ color: LAB.x2 }}
          />
          <button
            type="button"
            data-action="zoom-in"
            onClick={() => onLevel(Math.min(ZOOM_LEVELS, level + 1))}
            disabled={level >= ZOOM_LEVELS}
            className="rounded-lg border border-cyan-400/40 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:opacity-35"
          >
            Closer →
          </button>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${V.width} ${V.height}`}
        className="mt-2 w-full select-none"
        role="img"
        aria-label={`${form.numeratorTex} and its local companion near zero`}
      >
        <g aria-hidden="true">
          {yMin < 0 && yMax > 0 && (
            <line x1={V.padLeft} y1={zeroY} x2={V.width - V.padRight} y2={zeroY} stroke={LAB.axis} strokeWidth={1} />
          )}
          <line x1={zeroX} y1={V.padTop} x2={zeroX} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1} opacity={0.6} />
        </g>

        {series.map(({ curve, points }) => (
          <path
            key={curve.key}
            data-curve={curve.key}
            d={polylinePath(V, points)}
            fill="none"
            stroke={ROLE_COLOR[curve.role]}
            strokeWidth={curve.role === 'subject' ? 2.6 : 1.8}
            strokeDasharray={curve.role === 'companion' ? '6 4' : undefined}
            strokeLinecap="round"
            opacity={curve.role === 'aside' ? 0.75 : 1}
          />
        ))}

        <text
          x={V.width - V.padRight}
          y={V.height - 10}
          fill={LAB.muted}
          fontSize={11}
          fontWeight={700}
          textAnchor="end"
          fontFamily="ui-monospace, monospace"
          stroke="#0b1020"
          strokeWidth={3.5}
          paintOrder="stroke"
        >
          |x| ≤ {showX(span)}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
        {form.curves.map((curve) => (
          <Legend key={curve.key} curve={curve} />
        ))}
      </div>
      {/* ⚠️ 「越放大越像」要给个**数**,不能只靠眼睛。 */}
      <p data-readout="zoom-gap" className="mt-1.5 text-xs text-slate-500">
        Widest gap between them, as a fraction of the window: <span style={{ color: LAB.x2 }}>{showScientific(gap, 1)}</span>
      </p>
    </section>
  );
}

function Legend({ curve }: { curve: Curve }) {
  return (
    <span className="flex items-center gap-1.5" style={{ color: ROLE_COLOR[curve.role] }}>
      <span
        aria-hidden="true"
        className="inline-block h-0 w-5 border-t-2"
        style={{
          borderColor: ROLE_COLOR[curve.role],
          borderTopStyle: curve.role === 'companion' ? 'dashed' : 'solid',
        }}
      />
      <Tex src={curve.tex} />
    </span>
  );
}

/* ══ ④ 代数,一步一步露 ════════════════════════════════════════════ */

/**
 * ⚠️ 一步一步露,但**已经露出来的不收回去**。
 * 这是这个项目对「no slideshow」的读法:进度是加法,不是翻页 ——
 * 学生随时能回头看第一步,不用倒回去。
 */
export function StepReveal({
  steps,
  label,
  revealed,
  onReveal,
}: {
  steps: readonly Step[];
  label: string;
  revealed: number;
  onReveal: () => void;
}) {
  return (
    <section
      data-panel="algebra"
      data-revealed={String(revealed)}
      data-total={String(steps.length)}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-2.5 space-y-2.5">
        {steps.slice(0, revealed).map((step, i) => (
          <div key={step.tex} data-step={String(i + 1)}>
            <p className="text-sm text-slate-100">
              <Tex src={step.tex} />
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.note}</p>
          </div>
        ))}
      </div>
      {revealed < steps.length && (
        <button
          type="button"
          data-action="next-step"
          onClick={onReveal}
          className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          Then what? →
        </button>
      )}
    </section>
  );
}

/* ══ ⑤ 因子表盘 ════════════════════════════════════════════════════ */

/**
 * 每个因子一个表盘,底下一行乘积。
 *
 * ⚠️ 表盘量的是「离自己的极限还有多远」,**不是**「值有多大」。
 * `sin x / (1 + cos x)` 的极限是 0,它越接近 0 表盘越满 ——
 * 用「值有多大」画的话这个因子会看起来一直在变空,方向正好反了。
 */
export function FactorGauges({ id, x }: { id: FormId; x: number }) {
  const form = formOf(id);
  if (form.factors.length === 0) return null;

  const values = form.factors.map((factor) => factor.at(x));
  const product = values.reduce<number | null>(
    (acc, v) => (acc === null || v === null || !Number.isFinite(v) ? null : acc * v),
    1,
  );

  return (
    <section data-panel="factors" data-count={String(form.factors.length)} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        ⑤ Each factor, right now
      </p>
      <div className="mt-3 space-y-3">
        {form.factors.map((factor, i) => (
          <Gauge
            key={factor.tex}
            index={i}
            tex={factor.tex}
            note={factor.note}
            value={values[i] ?? null}
            target={factor.limit}
          />
        ))}
      </div>
      <div
        data-readout="product"
        data-value={product === null ? 'undefined' : String(product)}
        className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: LAB.pass }}>
          product
        </span>
        <span className="font-mono text-sm" style={{ color: LAB.pass }}>
          {showRatio(product)}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        And that product is the whole quotient — not just in the limit, but at this exact x.
      </p>
    </section>
  );
}

function Gauge({
  index,
  tex,
  note,
  value,
  target,
}: {
  index: number;
  tex: string;
  note: string;
  value: number | null;
  target: number;
}) {
  // 离目标还有多远 → 表盘的充盈程度。1 表示已经到位。
  const distance = value === null ? 1 : Math.abs(value - target);
  const fill = Math.max(0, Math.min(1, 1 - distance / Math.max(0.35, Math.abs(target) || 1)));
  return (
    <div data-gauge={String(index)} data-value={value === null ? 'undefined' : String(value)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm text-slate-100">
          <Tex src={tex} />
        </span>
        <span className="font-mono text-xs" style={{ color: LAB.x1 }}>
          {showRatio(value)} <span className="text-slate-600">→ {target}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${(fill * 100).toFixed(1)}%`, background: LAB.x1 }}
        />
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{note}</p>
    </div>
  );
}

/* ══ ⑥ 结论 ════════════════════════════════════════════════════════ */

export function ResultPanel({ id, children }: { id: FormId; children?: React.ReactNode }) {
  const form = formOf(id);
  return (
    <section
      data-panel="result"
      data-limit={String(form.limit)}
      data-display={form.limitDisplay}
      className="rounded-2xl border p-4"
      style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">⑥ The answer</p>
      <p className="mt-2 text-base text-slate-100">
        <Tex src={form.limitTex} display />
      </p>
      {/* ⚠️ 「由哪条推出」是这一节的骨架,必须写在结论旁边,不是藏在别处。 */}
      <p data-readout="provenance" className="mt-2 text-xs leading-relaxed text-slate-400">
        {form.provenBy.length > 0 ? (
          <>
            Proved from{' '}
            <span style={{ color: LAB.x2 }}>
              {form.provenBy.map((parent) => formOf(parent).title.replace(/^Why /, '')).join(' and ')}
            </span>{' '}
            — no new proof needed.
          </>
        ) : (
          <>Not derived from an earlier limit. It rests on {form.groundedIn}.</>
        )}
      </p>
      {children}
    </section>
  );
}

/* ══ 页头 ══════════════════════════════════════════════════════════ */

export function LabHeader({ id, kicker = 'Calculus · Special limits' }: { id: FormId; kicker?: string }) {
  const form = formOf(id);
  return (
    <header className="max-w-2xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">{kicker}</p>
      <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{form.title}</h1>
      {/* ⚠️ headline 有的自带问号(「How Fast Does Cosine Flatten?」),
          无脑接一个句号会写出 "…Flatten?." —— 截图上一眼就看见了。 */}
      <p className="mt-3 text-base text-slate-400">
        {/[.?!]$/.test(form.headline) ? form.headline : `${form.headline}.`} {form.lede}
      </p>
    </header>
  );
}

/* ══ 滑块 ══════════════════════════════════════════════════════════ */

/** 一条把 x 拉向 0 的滑块。⚠️ 走的是**对数**刻度,线性刻度的最后一半全是 0 附近。 */
export function XSlider({
  id,
  x,
  onX,
  minDecade = 4,
}: {
  id: FormId;
  x: number;
  onX: (next: number) => void;
  minDecade?: number;
}) {
  const form = formOf(id);
  const maxDecade = -Math.log10(form.startSpan);
  const decadeNow = -Math.log10(Math.abs(x));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs text-slate-400">
        x = <span data-readout="x" style={{ color: LAB.x2 }}>{showX(x)}</span>
      </span>
      <input
        type="range"
        aria-label="x"
        min={maxDecade}
        max={minDecade}
        step={0.02}
        value={decadeNow}
        onChange={(e) => onX(10 ** -Number(e.target.value))}
        className="w-32 accent-current"
        style={{ color: LAB.x2 }}
      />
      {/* ⚠️ 同时给出**显示值**与**全精度值**。
          浏览器检查要拿因子的乘积和它比,拿七位小数的显示值去比全精度乘积
          会得到一堆假失败(第一版就是这么写的)。显示归显示,比对归比对。 */}
      <span className="font-mono text-xs" style={{ color: LAB.pass }}>
        ratio = <span data-readout="ratio" data-value={String(ratio(id, x) ?? 'undefined')}>{showRatio(ratio(id, x))}</span>
      </span>
    </div>
  );
}

/** 一个只在按下之后才展开的小面板。给「optional / advanced」那几块用。 */
export function Disclosure({
  name,
  label,
  children,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section
      data-panel={name}
      data-open={open ? 'yes' : 'no'}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      {open ? (
        <div className="mt-2 space-y-2">{children}</div>
      ) : (
        <button
          type="button"
          data-action={`open-${name}`}
          onClick={() => setOpen(true)}
          className="mt-2 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          Show me →
        </button>
      )}
    </section>
  );
}
