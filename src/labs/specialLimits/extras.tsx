/**
 * LAB — 每一课自己那一块面板。
 *
 * 共用骨架在 `parts.tsx`;这里放的是**只有那一课需要**的东西:
 *   · exp   —— 割线(这条极限本来就是一个斜率)与「为什么偏偏是 e」的底数表
 *   · log   —— 沿 y = x 的镜像
 *   · cos/x —— 乘以共轭的那一下(乘的是 1)
 *   · cos/x² —— 半角恒等式的当场核对,以及「局部行为」那块可选面板
 *
 * ⚠️ 这些不是装饰。每一块都对应提示词里点名的一个 PART,
 * 而且都是那一课**区别于其它课**的地方 —— 共用骨架讲不了它们。
 */
import { useMemo } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, toSvgX, toSvgY } from '../shared/viewport';
import {
  BASES,
  baseSlope,
  baseSlopeExact,
  logOnePlus,
  oneMinusCos,
  ratio,
  sampleCurve,
  showRatio,
  showX,
} from '../../math/specialForms';
import { showNumber, showScientific } from '../../math/format';
import { Disclosure } from './parts';

/* ══ (eˣ − 1)/x —— 割线 ════════════════════════════════════════════ */

/**
 * ⚠️ 这一课的**几何意思**是:那个商就是过 (0, 1) 与 (x, eˣ) 的割线斜率。
 * 不画出来的话,`(eˣ−1)/x` 只是一个碰巧趋于 1 的式子;画出来之后
 * 「x → 0 时割线不再转动」这件事是看得见的。
 *
 * ⚠️ 措辞上**不说「导数」** —— 这一节还没正式讲到。说的是「割线斜率稳定下来」。
 */
export function SecantPanel({ x }: { x: number }) {
  const V = makeViewport({
    width: 340, height: 300,
    xMin: -1.3, xMax: 1.3, yMin: -0.15, yMax: 3.5,
    padLeft: 26, padRight: 18, padTop: 18, padBottom: 28,
  });
  const slope = ratio('exp-over-x', x);
  const curve = useMemo(() => sampleCurve((t) => Math.exp(t), -1.3, 1.3, 160), []);
  const p = { x: toSvgX(V, 0), y: toSvgY(V, 1) };
  const q = { x: toSvgX(V, x), y: toSvgY(V, Math.exp(x)) };
  const line = slope === null ? null : {
    left: { x: toSvgX(V, V.xMin), y: toSvgY(V, 1 + slope * (V.xMin - 0)) },
    right: { x: toSvgX(V, V.xMax), y: toSvgY(V, 1 + slope * (V.xMax - 0)) },
  };

  return (
    <section data-panel="secant" data-slope={slope === null ? 'undefined' : String(slope)} className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        The quotient is a secant slope
      </p>
      <svg
        viewBox={`0 0 ${V.width} ${V.height}`}
        className="mt-2 w-full select-none"
        role="img"
        aria-label="The exponential curve with a secant line from (0, 1) to (x, e to the x)"
      >
        <line x1={V.padLeft} y1={toSvgY(V, 0)} x2={V.width - V.padRight} y2={toSvgY(V, 0)} stroke={LAB.axis} strokeWidth={1} />
        <line x1={toSvgX(V, 0)} y1={V.padTop} x2={toSvgX(V, 0)} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1} opacity={0.6} />
        <path d={polylinePath(V, curve)} fill="none" stroke={LAB.curve} strokeWidth={2.4} strokeLinecap="round" />
        {line && (
          <line x1={line.left.x} y1={line.left.y} x2={line.right.x} y2={line.right.y} stroke={LAB.x2} strokeWidth={2.2} />
        )}
        {/* 固定的那个点先画,会动的 Q 放最后 —— 首页预览踩过这个顺序的坑 */}
        <circle cx={p.x} cy={p.y} r={5} fill={LAB.x1} stroke="#0b1020" strokeWidth={1.6} />
        <text x={p.x + 8} y={p.y + 16} fill={LAB.x1} fontSize={11} fontWeight={700} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
          (0, 1)
        </text>
        <circle cx={q.x} cy={q.y} r={5} fill={LAB.pass} stroke="#0b1020" strokeWidth={1.6} />
      </svg>
      <p className="mt-1 font-mono text-xs text-slate-400">
        secant slope = <span data-readout="secant-slope" style={{ color: LAB.x2 }}>{showRatio(slope)}</span>
      </p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        As x → 0 the second point slides into the first and the line stops turning. The slopes settle.
      </p>
    </section>
  );
}

/**
 * ⭐ 「为什么偏偏是 e」。
 * 对任意底数 b,`(bˣ − 1)/x → ln b`。摆出 2、e、3、10 四个读数,
 * **只有 e 那一行是 1** —— 这比一句「e 很特别」有用得多。
 */
export function BasePanel() {
  return (
    <Disclosure name="bases" label="Why e and not some other base?">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">b</span>
        <span className="text-right text-slate-500">(bˣ − 1)/x near 0</span>
        <span className="text-right text-slate-500">ln b</span>
        {BASES.map((base) => {
          const isE = base.label === 'e';
          return (
            <ReadRow
              key={base.label}
              label={base.label}
              measured={baseSlope(base.value)}
              exact={baseSlopeExact(base.value)}
              highlight={isE}
            />
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        Every base gives <em>some</em> limit. Only one gives exactly 1, and that is what the letter e
        names. The clean answer is a fact about the base, not about exponentials in general.
      </p>
    </Disclosure>
  );
}

function ReadRow({
  label,
  measured,
  exact,
  highlight,
}: {
  label: string;
  measured: number;
  exact: number;
  highlight: boolean;
}) {
  const color = highlight ? LAB.pass : LAB.muted;
  return (
    <>
      <span data-base={label} style={{ color, fontWeight: highlight ? 700 : 400 }}>
        {label}
      </span>
      <span data-base-slope={label} className="text-right" style={{ color }}>
        {showRatio(measured)}
      </span>
      <span className="text-right text-slate-500">{showNumber(exact, 7)}</span>
    </>
  );
}

/* ══ ln(1+x)/x —— 沿 y = x 的镜像 ══════════════════════════════════ */

/**
 * ⚠️ 镜像的对象是 `y = eˣ − 1`,**不是** `y = eˣ`。
 * `ln(1+x)` 的反函数正是 `eˣ − 1`(由 `u = ln(1+x) ⟺ x = eᵘ − 1` 读出来),
 * 两条曲线都过原点、都在原点与 `y = x` 相切 —— 那个共同的切点就是这一课的全部内容。
 * 拿 `eˣ` 去照镜子会得到 `ln x`,过 (1, 0),对不上这一课要说的事。
 */
export function ReflectionPanel() {
  const V = makeViewport({
    width: 340, height: 300,
    xMin: -1.4, xMax: 2.4, yMin: -1.4, yMax: 2.4,
    padLeft: 24, padRight: 18, padTop: 18, padBottom: 26,
  });
  const expCurve = useMemo(() => sampleCurve((t) => Math.exp(t) - 1, -1.4, 1.3, 180), []);
  const logCurve = useMemo(
    () => sampleCurve((t) => (t <= -1 ? null : logOnePlus(t)), -0.98, 2.4, 180),
    [],
  );

  return (
    <section data-panel="reflection" className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Two curves, one mirror
      </p>
      <svg
        viewBox={`0 0 ${V.width} ${V.height}`}
        className="mt-2 w-full select-none"
        role="img"
        aria-label="e to the x minus one and the natural log of one plus x, mirrored across the line y equals x"
      >
        <line x1={V.padLeft} y1={toSvgY(V, 0)} x2={V.width - V.padRight} y2={toSvgY(V, 0)} stroke={LAB.axis} strokeWidth={1} />
        <line x1={toSvgX(V, 0)} y1={V.padTop} x2={toSvgX(V, 0)} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1} />
        {/* 镜子 */}
        <line
          x1={toSvgX(V, -1.4)} y1={toSvgY(V, -1.4)} x2={toSvgX(V, 2.4)} y2={toSvgY(V, 2.4)}
          stroke={LAB.muted} strokeWidth={1.4} strokeDasharray="6 5"
        />
        <path d={polylinePath(V, expCurve)} fill="none" stroke={LAB.x2} strokeWidth={2.3} strokeLinecap="round" />
        <path d={polylinePath(V, logCurve)} fill="none" stroke={LAB.x1} strokeWidth={2.3} strokeLinecap="round" />
        <circle cx={toSvgX(V, 0)} cy={toSvgY(V, 0)} r={5} fill={LAB.pass} stroke="#0b1020" strokeWidth={1.6} />
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
        <span style={{ color: LAB.x2 }}><Tex src="y = e^x - 1" /></span>
        <span style={{ color: LAB.x1 }}><Tex src="y = \ln(1 + x)" /></span>
        <span className="text-slate-500"><Tex src="y = x" /></span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        Fold the picture along the dashed line and the two curves land on each other — they are inverses.
        Both leave the origin along y = x, which is why both quotients go to 1.
      </p>
    </section>
  );
}

/* ══ (1 − cos x)/x —— 乘以共轭 ═════════════════════════════════════ */

/**
 * ⚠️ 「乘以共轭」最容易被学生记成一个咒语。
 * 所以这块面板只强调一件事:**乘的是 1**。左边那个分式的分子分母一模一样,
 * 于是整个式子的值没变 —— 变的只是它的样子。
 */
export function ConjugatePanel({ x }: { x: number }) {
  const before = ratio('cos-over-x', x);
  const factor = (1 + Math.cos(x)) / (1 + Math.cos(x));
  const after = before === null ? null : before * factor;
  const unchanged = before !== null && after !== null && Math.abs(before - after) < 1e-15;

  return (
    <section
      data-panel="conjugate"
      data-unchanged={unchanged ? 'yes' : 'no'}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        The conjugate is just a 1
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-100">
        <Tex src="\frac{1 - \cos x}{x}" />
        <span className="text-slate-600">×</span>
        <span style={{ color: LAB.x2 }}>
          <Tex src="\frac{1 + \cos x}{1 + \cos x}" />
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">the multiplier</span>
        <span data-readout="one" className="text-right" style={{ color: LAB.x2 }}>{showNumber(factor, 7)}</span>
        <span className="text-slate-500">before</span>
        <span data-readout="before" className="text-right" style={{ color: LAB.pass }}>{showRatio(before)}</span>
        <span className="text-slate-500">after</span>
        <span data-readout="after" className="text-right" style={{ color: LAB.pass }}>{showRatio(after)}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        The value never moved. Only the shape did — and the new shape has a factor we already know.
      </p>
    </section>
  );
}

/* ══ (1 − cos x)/x² —— 半角恒等式与局部行为 ════════════════════════ */

/**
 * 半角恒等式**当场核对**:左边 `1 − cos x`,右边 `2 sin²(x/2)`,同一个 x 上两个读数。
 * ⚠️ 这不是走过场 —— 整节课的算术都建立在这条恒等式上,
 * 而且它同时是这一课躲开浮点灾难的办法(见 `specialForms.ts` 开头)。
 */
export function HalfAnglePanel({ x }: { x: number }) {
  const left = 1 - Math.cos(x);
  const right = oneMinusCos(x);
  const agree = Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(right));

  return (
    <section
      data-panel="half-angle"
      data-agree={agree ? 'yes' : 'no'}
      className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Check the identity at this x
      </p>
      <div className="mt-2.5 text-sm text-slate-100">
        <Tex src="1 - \cos x = 2\sin^2\!\left(\tfrac{x}{2}\right)" />
      </div>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">left side</span>
        <span data-readout="identity-left" className="text-right" style={{ color: LAB.x1 }}>{showNumber(left, 9)}</span>
        <span className="text-slate-500">right side</span>
        <span data-readout="identity-right" className="text-right" style={{ color: LAB.x2 }}>{showNumber(right, 9)}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        Equal everywhere, not just near 0 — that is what makes it an identity rather than an approximation.
      </p>
    </section>
  );
}

/** 「局部行为」。⚠️ 提示词点名:**不主动**讲泰勒展开,要看的人自己点开。 */
export function LocalBehaviourPanel({ x }: { x: number }) {
  const actual = oneMinusCos(x);
  const model = (x * x) / 2;
  const relative = actual === 0 ? 0 : Math.abs(actual - model) / Math.max(Math.abs(actual), 1e-300);
  return (
    <Disclosure name="local" label="Local behaviour (optional)">
      <p className="text-sm text-slate-100">
        <Tex src="1 - \cos x \approx \frac{x^2}{2} \quad \text{near } 0" />
      </p>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-slate-500">1 − cos x at x = {showX(x)}</span>
        <span data-readout="local-actual" className="text-right" style={{ color: LAB.x1 }}>{showNumber(actual, 10)}</span>
        <span className="text-slate-500">x²/2</span>
        <span data-readout="local-model" className="text-right" style={{ color: LAB.x2 }}>{showNumber(model, 10)}</span>
        <span className="text-slate-500">relative difference</span>
        <span data-readout="local-gap" className="text-right text-slate-500">
          {relative === 0 ? '0' : showScientific(relative, 1)}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-slate-400">
        This is a statement about behaviour near 0, not an equation. The limit ½ is exact; the
        approximation is what the limit <em>feels</em> like. Where that x²/2 comes from is a later topic.
      </p>
    </Disclosure>
  );
}

/* ══ tan x / x —— 三条线的读数 ═════════════════════════════════════ */

/**
 * ⚠️ 「sin x、x、tan x 在 0 附近几乎一样」在图上是看得见的,
 * 但看得见不等于**量得出**。这块面板把三个数并排摆出来,
 * 让「几乎一样」变成三个只在第几位上才分开的读数。
 */
export function ThreeWayPanel({ x }: { x: number }) {
  const rows: readonly [string, number][] = [
    ['\\sin x', Math.sin(x)],
    ['x', x],
    ['\\tan x', Math.tan(x)],
  ];
  const spread = Math.abs(Math.tan(x) - Math.sin(x));
  return (
    <section data-panel="three-way" data-spread={spread.toExponential(3)} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Three numbers at x = {showX(x)}
      </p>
      <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
        {rows.map(([tex, value], i) => (
          <ThreeWayRow key={tex} tex={tex} value={value} index={i} />
        ))}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        tan x − sin x = <span style={{ color: LAB.x2 }}>{showScientific(spread, 1)}</span>. Halve x and
        that gap falls by about eight.
      </p>
    </section>
  );
}

function ThreeWayRow({ tex, value, index }: { tex: string; value: number; index: number }) {
  const color = [LAB.x1, LAB.muted, LAB.x2][index] ?? LAB.muted;
  return (
    <>
      <span className="text-sm text-slate-100">
        <Tex src={tex} />
      </span>
      <span data-three-way={String(index)} className="text-right" style={{ color }}>
        {showNumber(value, 9)}
      </span>
    </>
  );
}
