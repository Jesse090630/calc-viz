/**
 * LAB — 相关变化率:钉在一起的两块圆盘。
 *
 * ⭐⭐⭐ 这一页要打掉的那句话:**「角速度是常数,所以面积的变化率也是常数。」**
 *   所以页面上**同时**摆两个读数:`dα/dt` 一动不动地写着 0.5,
 *   而 `dA/dt` 在旁边一路往下掉到 0。两个数并排放着,那句话自己就站不住了。
 *
 * ⭐⭐ 图是这一页的主角,而且它**不是示意图**:
 *   两个圆心、第二交点 M、阴影边界,全部由 `src/math/rotatingDisks.ts` 按真实几何算出来。
 *   ⚠️ 阴影那条边界还被测试用鞋带公式量过,要求等于闭式面积 ——
 *     也就是说**画歪了测试会红**。第一版就是弧取反了,鞋带当场抓住(0.67 画成了 4.64)。
 *
 * ⭐ 菱形那一步单独标出来:题面说「可以假设弦平分 α」,其实四条边都是半径,
 *   `N O₁ M O₂` 是菱形,对角线自然平分内角 —— 能证的东西不该让学生去假设。
 *
 * ⚠️ 死界面自查:滑块能走到 α = 0(完全重合)和 α = π(相切)两个端点,
 *   两端的特殊措辞都点得到;α = π 时 M 退回 N,半角读数显示 undefined。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/rotatingDisks.ts`。
 */
import { useMemo, useState } from 'react';
import {
  ALPHA_MAX, ANSWER_NOTE, GIVEN, GIVEN_NOTE, HEADLINE, MAIN_IDEA, N, NEED, OMEGA,
  RHOMBUS_NOTE, STEPS, TRAP, coefficient, substitution,
  type Pt,
  centerBottom, centerTop, centerDistance, centralAngle, circlePoints, degrees,
  diskArea, halfAngleAtNail, overlapClosed, polygonArea, rate, secondPoint,
  shadedBoundary, shadedByDistance, shadedClosed, show,
} from '../../math/rotatingDisks';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const R = 1;                       // 画图用的半径;答案里 r 是符号,不是数
const W = 460;
const H = 360;
const PAD = 18;
/**
 * ⚠️⚠️ 视野按**整个 α 区间**上两个盘能到达的范围固定下来,不随 α 伸缩。
 *
 *   下盘恒在 `x ∈ [−2r, 0]`、`y ∈ [−r, r]`;
 *   上盘圆心跑遍以 N 为心、半径 r 的上半圆,于是它最远能到
 *   `x = 2r`(α = π 时圆心在 `(r, 0)`)、`y = 2r`(α = π/2 时圆心在 `(0, r)`)。
 *   合起来是 `x ∈ [−2r, 2r]`、`y ∈ [−r, 2r]`,**4r × 3r**。
 *
 * ⭐ 固定视野是有意的:下盘是**不动的那一块**,画面里它就不该动。
 *   视野跟着内容缩放的话,静止的盘会在屏幕上漂,学生会以为两块都在转。
 * ⚠️ 第一版把 SPAN 拍成 2.9,圆的半径只有 50px,整张图缩在画布左上角,
 *   三分之二的地方是空的 —— 截图一看就知道。现在按真实范围铺满。
 */
const VIEW = { x0: -2 * R, x1: 2 * R, y0: -R, y1: 2 * R } as const;
const K = Math.min(
  (W - 2 * PAD) / (VIEW.x1 - VIEW.x0),
  (H - 2 * PAD) / (VIEW.y1 - VIEW.y0),
);
const CX = W / 2 - ((VIEW.x0 + VIEW.x1) / 2) * K;
const CY = H / 2 + ((VIEW.y0 + VIEW.y1) / 2) * K;
const sx = (x: number) => CX + x * K;
const sy = (y: number) => CY - y * K;
const poly = (pts: readonly Pt[]) => pts.map((p) => `${sx(p[0]).toFixed(2)},${sy(p[1]).toFixed(2)}`).join(' ');

export function RotatingDisksLab() {
  const [alpha, setAlpha] = useState(1.0);

  const o1 = centerBottom(R);
  const o2 = centerTop(R, alpha);
  const m = secondPoint(R, alpha);
  const area = shadedClosed(R, alpha);
  const dAdt = rate(R, alpha, OMEGA);
  const half = halfAngleAtNail(R, alpha);

  const shaded = useMemo(() => shadedBoundary(R, alpha, 220), [alpha]);
  const bottom = useMemo(() => circlePoints(o1, R, 240), [o1]);
  const top = useMemo(() => circlePoints(o2, R, 240), [o2]);

  /** 变化率曲线:α 从 0 到 π。⭐ 它一路往下,而 ω 是平的。 */
  const curve = useMemo(() => {
    const out: { a: number; v: number }[] = [];
    for (let i = 0; i <= 120; i += 1) {
      const a = (ALPHA_MAX * i) / 120;
      out.push({ a, v: rate(R, a, OMEGA) });
    }
    return out;
  }, []);
  const GW = 460;
  const GH = 150;
  const gx = (a: number) => 38 + (a / ALPHA_MAX) * (GW - 54);
  const maxRate = rate(R, 0, OMEGA);
  const gy = (v: number) => GH - 26 - (v / maxRate) * (GH - 42);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Related Rates
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Two Nailed Disks
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ⭐⭐ 论点前置:要打掉的那句话 */}
      <section data-panel="trap" className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
          The assumption to kill
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{TRAP}</p>
      </section>

      {/* ⭐ 相关变化率的第一步永远是把已知和所求分开写。
          学生卡住的地方通常不是求导,是没分清哪个量在变、哪个是常数。 */}
      <section data-panel="setup" className="mt-4 grid gap-4 sm:grid-cols-2">
        <div data-panel="given" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Given</p>
          <ul className="mt-2 space-y-2">
            {GIVEN.map((f) => (
              <li key={f.symbol} data-given={f.symbol} data-kind={f.kind}
                className="rounded-lg border border-slate-800 px-2.5 py-1.5">
                <p className="font-mono text-[11px]">
                  <span className="text-slate-200">{f.symbol}</span>
                  <span className="ml-2 text-[10px]"
                    style={{ color: f.kind === 'constant' ? LAB.x1 : LAB.x2 }}>
                    {f.kind === 'constant' ? 'constant' : 'changing'}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div data-panel="need" className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">Need</p>
          <p className="mt-2 font-mono text-[13px] text-amber-100" data-need-symbol>{NEED.symbol}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{NEED.text}</p>
          <p className="mt-3 border-t border-amber-400/20 pt-2 text-[11px] leading-relaxed text-slate-400">
            {GIVEN_NOTE}
          </p>
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(0,19rem)]">
        {/* ── 几何图 ─────────────────────────────────────────── */}
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
          <p className="mb-1 font-mono text-[10px] text-slate-500">
            every point below is computed, not sketched
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
            aria-label="Two equal disks pinned at N, the top one rotated by alpha, with the exposed part of the bottom disk shaded">
            {/* 阴影:下盘里没被盖住的那块。边界由真实圆弧拼成。 */}
            <polygon data-shaded points={poly(shaded)} fill={LAB.pass} fillOpacity={0.3} stroke="none" />

            {/* 两个圆 */}
            <polyline data-circle="bottom" points={poly(bottom)} fill="none"
              stroke={LAB.curve} strokeWidth={1.9} />
            <polyline data-circle="top" points={poly(top)} fill="none"
              stroke={LAB.x2} strokeWidth={1.9} strokeDasharray="6 4" />

            {/* 菱形 N O₁ M O₂ —— 四条边都是半径,这一步是提示的证明 */}
            <polygon data-rhombus points={poly([N, o1, m, o2])} fill="none"
              stroke={LAB.muted} strokeWidth={1.1} strokeDasharray="3 3" />

            {/* 弦 NM:它平分 α */}
            <line data-chord x1={sx(N[0])} y1={sy(N[1])} x2={sx(m[0])} y2={sy(m[1])}
              stroke={LAB.x1} strokeWidth={1.8} />

            {/* 两条半径 N→O₁、N→O₂,夹角就是 α */}
            <line x1={sx(N[0])} y1={sy(N[1])} x2={sx(o1[0])} y2={sy(o1[1])}
              stroke={LAB.curve} strokeWidth={1.4} />
            <line x1={sx(N[0])} y1={sy(N[1])} x2={sx(o2[0])} y2={sy(o2[1])}
              stroke={LAB.x2} strokeWidth={1.4} />

            {/* α 的角弧,画在 N 上 */}
            {(() => {
              const rad = 0.3 * K;
              const a0 = Math.atan2(o1[1] - N[1], o1[0] - N[0]);
              const a1 = Math.atan2(o2[1] - N[1], o2[0] - N[0]);
              const pts: string[] = [];
              for (let i = 0; i <= 48; i += 1) {
                const t = a0 + ((a1 - a0) * i) / 48;
                pts.push(`${sx(N[0]) + rad * Math.cos(t)},${sy(N[1]) - rad * Math.sin(t)}`);
              }
              /**
               * ⚠️ α 的标签放在**角平分线**方向上(也就是 NM 那条弦的方向)。
               *   第一版固定放在 N 左边 44px 处,正好压在 `O₁` 的标签上,
               *   两个字叠在一起 —— 截图看出来的。
               *   顺着平分线放,它永远落在这个角的**里面**,和任何顶点标签都不会撞。
               */
              const bis = (a0 + a1) / 2;
              const lx = sx(N[0]) + (rad + 15) * Math.cos(bis);
              const ly = sy(N[1]) - (rad + 15) * Math.sin(bis);
              return (
                <g>
                  <polyline data-angle-arc points={pts.join(' ')} fill="none"
                    stroke={LAB.x2} strokeWidth={1.5} />
                  <text data-alpha-label x={lx} y={ly + 4} textAnchor="middle" fill={LAB.x2}
                    className="font-mono text-[13px]">α</text>
                </g>
              );
            })()}

            {/* 点与标注 */}
            {/* ⚠️⚠️ 端点上会有点**重合**,标签就会叠成一团:
                  · α = 0:两盘完全重合,`O₁ = O₂`;
                  · α = π:两盘相切,第二个交点并回钉子,`M = N`。
                这不是渲染故障,是几何本身 —— 所以把重合的点合成一个,
                标签写成「A = B」,**把这件事说出来**,而不是让它看起来像个 bug。
                做成通用的合并,而不是对这两种情况各打一个补丁。 */}
            {(() => {
              const raw: readonly (readonly [Pt, string])[] =
                [[N, 'N'], [o1, 'O₁'], [o2, 'O₂'], [m, 'M']];
              const groups: { p: Pt; labels: string[] }[] = [];
              for (const [p, label] of raw) {
                const hit = groups.find((g) => Math.hypot(g.p[0] - p[0], g.p[1] - p[1]) < 0.02 * R);
                if (hit) hit.labels.push(label);
                else groups.push({ p, labels: [label] });
              }
              return groups.map((g) => {
                const label = g.labels.join(' = ');
                const isNail = g.labels.includes('N');
                return (
                  <g key={label} data-point={label}>
                    <circle cx={sx(g.p[0])} cy={sy(g.p[1])} r={isNail ? 4.2 : 3.2}
                      fill={isNail ? LAB.fail : LAB.muted} />
                    <text x={sx(g.p[0]) + (isNail ? 9 : 7)} y={sy(g.p[1]) - 6} fill="#cbd5e1"
                      className="font-mono text-[11px]">{label}</text>
                  </g>
                );
              });
            })()}
          </svg>

          <div className="mt-2 border-t border-slate-800 pt-2">
            <label className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
              α =
              {/* ⚠️⚠️ 滑块走**整数度**,不走弧度。
                  原先写的是 `max={π}` `step={π/180}`,而 `180 × (π/180)` 在浮点下
                  比 `π` **大一丁点**,于是最后一档被判为越界 —— 滑块最远只到 **179°**,
                  `α = 180°`(两盘相切、`dA/dt` 恰好为 0)**永远点不到**。
                  那正是这一课的落点,却成了一个走不到的状态。
                  改成整数度之后两个端点都落得准准的。 */}
              <input type="range" min={0} max={180} step={1} value={Math.round(degrees(alpha))}
                onChange={(e) => setAlpha((Number.parseFloat(e.target.value) * Math.PI) / 180)}
                className="h-1 flex-1 accent-amber-400" aria-label="Rotation angle alpha" />
              <span data-readout="alpha" className="w-20 text-right text-amber-300">
                {show(degrees(alpha), 1)}°
              </span>
            </label>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-500">
              <span style={{ color: LAB.curve }}>——</span> bottom disk (fixed)
              {'  '}<span style={{ color: LAB.x2 }}>- -</span> top disk (rotating)
              {'  '}<span style={{ color: LAB.x1 }}>——</span> chord NM
              {'  '}<span style={{ color: LAB.muted }}>- -</span> rhombus
            </p>
          </div>
        </section>

        {/* ── 读数 ───────────────────────────────────────────── */}
        <section className="space-y-3">
          {/* ⭐⭐⭐ 两个率并排:一个不动,一个在掉 */}
          <div data-panel="rates" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">the two rates, side by side</p>
            <p className="mt-1.5 font-mono text-[12px]" style={{ color: LAB.x2 }}>
              dα/dt = <span data-readout="omega">{show(OMEGA, 3)}</span> rad/s
              <span className="ml-1.5 text-[10px] text-slate-500">— never changes</span>
            </p>
            <p className="mt-1 font-mono text-[12px]" style={{ color: LAB.pass }}>
              dA/dt = <span data-readout="rate">{show(dAdt, 4)}</span> r²/s
              <span className="ml-1.5 text-[10px] text-slate-500">— falls to zero</span>
            </p>
            <p className="mt-2 border-t border-slate-800 pt-2 text-[12px] text-slate-300">
              <Tex src={String.raw`\frac{dA}{dt}=\frac{r^2}{2}\bigl(1+\cos\alpha\bigr)`} />
            </p>
          </div>

          {/* 面积本身,两条路径并排 */}
          <div data-panel="area" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">exposed area, two ways</p>
            <p className="mt-1.5 font-mono text-[11px] text-slate-300">
              from the formula<span data-readout="area" className="ml-1.5"
                style={{ color: LAB.pass }}>{show(area, 4)}</span>
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-300">
              from the centre distance<span data-readout="area-alt" className="ml-1.5"
                style={{ color: LAB.x1 }}>{show(shadedByDistance(R, alpha), 4)}</span>
            </p>
            <p className="mt-0.5 font-mono text-[11px] text-slate-300">
              from the shaded outline<span data-readout="area-poly" className="ml-1.5"
                style={{ color: LAB.muted }}>{show(polygonArea(shaded), 4)}</span>
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
              Three routes that share no reasoning: the closed form, the generic two-circle lens
              formula using only the distance between centres, and the shoelace area of the outline
              actually drawn above.
            </p>
          </div>

          {/* 几何读数 */}
          <div data-panel="geometry" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">the geometry behind it</p>
            <ul className="mt-1.5 space-y-0.5 font-mono text-[11px] text-slate-300">
              <li>central angle θ = <span data-readout="theta" style={{ color: LAB.x1 }}>
                {show(degrees(centralAngle(R, alpha)), 1)}°</span>
                <span className="ml-1 text-slate-500">(π − α)</span></li>
              <li>chord splits α into <span data-readout="half" style={{ color: LAB.x1 }}>
                {half === null ? 'undefined' : `${show(degrees(half), 1)}°`}</span>
                <span className="ml-1 text-slate-500">(α/2)</span></li>
              <li>centre distance = <span data-readout="dist" style={{ color: LAB.x1 }}>
                {show(centerDistance(R, alpha), 3)}</span>
                <span className="ml-1 text-slate-500">(2r sin α/2)</span></li>
              <li>overlap = <span data-readout="overlap" style={{ color: LAB.fail }}>
                {show(overlapClosed(R, alpha), 4)}</span>
                <span className="ml-1 text-slate-500">of {show(diskArea(R), 4)}</span></li>
            </ul>
            <p data-note="rhombus" className="mt-2 border-t border-slate-800 pt-2 text-[11px] leading-relaxed text-slate-400">
              {RHOMBUS_NOTE}
            </p>
          </div>
        </section>
      </div>

      {/* ── ⭐⭐ 变化率曲线:ω 是平的,dA/dt 不是 ──────────────── */}
      <section data-panel="curve" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          dA/dt against α — the angular velocity is flat, this is not
        </p>
        <svg viewBox={`0 0 ${GW} ${GH}`} className="mt-1 w-full" role="img"
          aria-label="The rate of change of area falling from its maximum at alpha zero to zero at alpha pi">
          <line x1={38} y1={gy(0)} x2={GW - 16} y2={gy(0)} stroke={LAB.axis} strokeWidth={1} />
          {[0, 0.5, 1].map((f) => (
            <text key={f} x={33} y={gy(f * maxRate) + 3.5} textAnchor="end" fill="#64748b"
              className="font-mono text-[9px]">{show(f * maxRate, 2)}</text>
          ))}
          {[0, 45, 90, 135, 180].map((d) => (
            <text key={d} x={gx((d * Math.PI) / 180)} y={GH - 8} textAnchor="middle" fill="#64748b"
              className="font-mono text-[9px]">{d}°</text>
          ))}
          {/* ω 那条水平线,给对照 */}
          <line data-omega-line x1={38} y1={gy(OMEGA)} x2={GW - 16} y2={gy(OMEGA)}
            stroke={LAB.x2} strokeWidth={1.4} strokeDasharray="6 4" />
          <text x={GW - 18} y={gy(OMEGA) - 6} textAnchor="end" fill={LAB.x2}
            className="font-mono text-[10px]">dα/dt = 0.5, constant</text>
          <polyline data-rate-curve points={curve.map((p) => `${gx(p.a)},${gy(p.v)}`).join(' ')}
            fill="none" stroke={LAB.pass} strokeWidth={2.2} />
          <circle data-rate-dot cx={gx(alpha)} cy={gy(dAdt)} r={4} fill={LAB.pass} />
        </svg>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          The dashed line is the angular velocity, which never moves. The solid curve is dA/dt. They
          start apart, cross, and end apart — two rates in the same problem, only one of them constant.
        </p>
      </section>

      {/* ── ⭐⭐⭐ 把答案真的算出来 ──────────────────────────── */}
      <section data-panel="answer" className="mt-4 rounded-2xl border border-green-500/40 bg-green-500/5 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-300">
          The answer, substituted and worked out — at the angle the slider is on
        </p>
        <p className="mt-2 text-[14px] text-slate-200">
          <Tex src={String.raw`\frac{dA}{dt}=r^2\bigl(1+\cos\alpha\bigr)\frac{d\alpha}{dt}`} display />
        </p>
        <ol className="mt-2 space-y-1">
          {substitution(alpha, OMEGA).map((l, i) => (
            <li key={i} data-sub={i} className="font-mono text-[11px] leading-relaxed text-slate-300">
              {l.text}
              {l.value !== undefined && (
                <span data-sub-value={l.value} className="ml-1.5"
                  style={{ color: l.perRSquared ? LAB.pass : LAB.x1 }}>
                  {show(l.value, l.places ?? 4)}{l.perRSquared ? ' r²' : ''}
                </span>
              )}
            </li>
          ))}
        </ol>
        <p data-final-answer className="mt-3 border-t border-green-500/20 pt-2.5 font-mono text-[14px]"
          style={{ color: LAB.pass }}>
          dA/dt = {show(coefficient(alpha, OMEGA), 4)} r² square units per second
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{ANSWER_NOTE}</p>
      </section>

      {/* ── 推导八步 ─────────────────────────────────────────── */}
      <section data-panel="steps" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          The derivation, and where each step goes wrong
        </p>
        <ol className="mt-2 space-y-2.5">
          {STEPS.map((s) => (
            <li key={s.n} data-step={s.n} className="rounded-lg border border-slate-800 px-3 py-2">
              <p className="font-mono text-[11px] text-slate-200">{s.n}. {s.title}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{s.body}</p>
              {s.tex && (
                <p className="mt-1.5 overflow-x-auto text-[13px] text-slate-200">
                  <Tex src={s.tex} display />
                </p>
              )}
              {s.watch && (
                <p data-watch className="mt-1 text-[11px] leading-relaxed" style={{ color: '#fca5a5' }}>
                  <span aria-hidden>× </span>{s.watch}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
