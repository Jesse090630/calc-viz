/**
 * LAB — 斜率场:被除掉的那个解。
 *
 * ⭐⭐ 页面顺序就是论证顺序:
 *   ① 分离变量的四步摆在最上面,**第二步单独标红**(那一步有代价);
 *   ② 斜率场 —— 方程给的是每点一个方向,解是顺着方向走出来的那条线;
 *   ③ 平衡解那几条横线,每条标明**通解够不够得到它**。
 *
 * ⭐⭐⭐ 整页的支点在 ③:
 *   `y² ` 和 logistic 上,点到 `y = 0` 那个初值时,曲线照样画得出来
 *   (数值那条路从来没出过问题),而"通解里的 C"那一栏会说 **没有**。
 *   **解在那儿,公式里没有它的位置。**
 *
 * ⚠️ 两条路径都画出来:实线是沿方向走出来的,虚线是代通解得到的。
 *   它们该严丝合缝地重合 —— 而在丢掉的那个解上,**虚线根本不出现**。
 *   这是"两条独立路径"第一次被直接画在页面上,而不是只写在测试里。
 *
 * ⚠️ 死界面自查:没有 C 的那一支(square/logistic 的 y = 0)、
 *   场里空掉的那一行(circles)、"分不了离"的标记(linear)、
 *   解曲线提前到头(circles)—— 四个特殊状态都有按钮点得到。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/slopeField.ts`。
 */
import { useMemo, useState } from 'react';
import {
  EQS, FIELD_NOTE, HEADLINE, LOST, MAIN_IDEA, RECOVERED, SEPARATION,
  type Eq, type Pt,
  clampTo, constantC, curveByFormula, curveByStepping, eqOf,
  equilibriumAt, field, lostEquilibria, show,
} from '../../math/slopeField';
import { LAB, STATE } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 520;
const H = 380;
const PAD = 34;
/** 场里每一小段的**屏幕**长度。⚠️ 固定值,绝不随斜率变。 */
const TICK = 12;

/**
 * 画框里的整数刻度。
 * ⚠️ 横轴跳过 0(那里就是纵轴本身,再标一个 0 只会和纵轴的刻度打架);
 *   纵轴**保留** 0 —— 在 `y² ` 和 logistic 那两屏上,`y = 0` 正是被丢掉的那条解,
 *   把它的高度标出来是有话要说的,不是装饰。
 */
function axisTicks(lo: number, hi: number, keepZero: boolean): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo); v <= Math.floor(hi); v += 1) {
    if (v === 0 && !keepZero) continue;
    out.push(v);
  }
  return out;
}

function makeScale(e: Eq) {
  const [x0, x1, y0, y1] = e.window;
  const kx = (W - 2 * PAD) / (x1 - x0);
  const ky = (H - 2 * PAD) / (y1 - y0);
  return {
    px: (x: number) => PAD + (x - x0) * kx,
    py: (y: number) => H - PAD - (y - y0) * ky,
    kx, ky,
  };
}

export function SlopeFieldLab() {
  const [id, setId] = useState(EQS[0]!.id);
  const e = eqOf(id);
  const [p, setP] = useState<Pt>(e.starts[0]!);

  const at = clampTo(e, p);
  const ticks = useMemo(() => field(e), [e]);
  const walked = useMemo(() => curveByStepping(e, at), [e, at]);
  const formula = useMemo(() => curveByFormula(e, at), [e, at]);
  const C = e.cFrom(at);
  const lost = useMemo(() => lostEquilibria(e), [e]);
  const onEquilibrium = equilibriumAt(e, at);

  const s = makeScale(e);
  const pts = (list: readonly Pt[]) =>
    list.map((q) => `${s.px(q[0]).toFixed(2)},${s.py(q[1]).toFixed(2)}`).join(' ');

  /** 把通解那条(带抬笔的)点列切成几段。 */
  const formulaRuns = useMemo(() => {
    const out: Pt[][] = [];
    let run: Pt[] = [];
    for (const q of formula) {
      if (q === null) { if (run.length > 1) out.push(run); run = []; continue; }
      run.push(q);
    }
    if (run.length > 1) out.push(run);
    return out;
  }, [formula]);

  const found = C !== null && Number.isFinite(C);
  const state = found ? STATE.pass : STATE.fail;
  /**
   * ⚠️⚠️ 当前这条解**就是**通解够不到的那一条吗。
   *
   * 点到 `y² ` 或 logistic 的 `y = 0` 时,解曲线和那条红色的平衡线完全重合,
   * 实线画在上面就把红线盖住了 —— 而且用的还是"成立"的绿色。
   * 于是整屏在说"这条解被丢了",画面却用绿色画着它。
   * 所以这种时候实线改用失败色,和右边那一栏、和那条平衡线说同一句话。
   * (截图看出来的;当时所有测试都是绿的。)
   */
  const onLost = onEquilibrium !== null && constantC(e, onEquilibrium) === null;
  const curveColor = onLost ? LAB.fail : LAB.pass;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Differential Equations
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Slope Fields
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* ⭐⭐ 论点前置:四步里只有一步有代价,把它标出来。 */}
      <section data-panel="recipe" className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Separating variables, and what each step costs
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          {SEPARATION.map((step) => (
            <div
              key={step.n} data-step={step.n} data-costly={step.cost ? 'yes' : 'no'}
              className={
                'rounded-lg border px-2.5 py-2 ' +
                (step.cost ? 'border-red-500/50 bg-red-500/10' : 'border-slate-800')
              }
            >
              <p className="font-mono text-[11px]" style={{ color: step.cost ? '#fca5a5' : '#94a3b8' }}>
                {step.n}. {step.what}
              </p>
              {step.cost && (
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{step.cost}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap gap-1.5 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        {EQS.map((k) => (
          <button
            key={k.id} type="button" data-eq={k.id} data-active={k.id === id ? 'yes' : 'no'}
            onClick={() => { setId(k.id); setP(k.starts[0]!); }}
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

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_minmax(0,20rem)]">
        <section className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
          <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-[13px] text-slate-200"><Tex src={e.tex} /></span>
            {/* ⭐ 图例。两条线是**两条互不相干的路径**算出来的,
                不说清楚,学生只会看见一条缝过的绿线,不知道那是重合。 */}
            <span data-legend className="font-mono text-[10px] text-slate-500">
              <span style={{ color: curveColor }}>——</span> followed the arrows
              {' · '}
              <span className="text-slate-300">- - -</span> from the formula
              {' · '}they should coincide
            </span>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
            aria-label="A slope field, with the solution curve through the chosen starting point">
            {/* 坐标轴 */}
            <line x1={PAD} y1={s.py(0)} x2={W - PAD} y2={s.py(0)} stroke={LAB.axis} strokeWidth={1} />
            <line x1={s.px(0)} y1={PAD} x2={s.px(0)} y2={H - PAD} stroke={LAB.axis} strokeWidth={1} />

            {/* ⚠️⚠️ 刻度数字不是装饰。
                两个轴的**单位长度不一样**(logistic 那一屏纵向是横向的两倍多),
                所以屏幕上看到的倾角并不是斜率本身。不标数字,学生没法察觉这件事,
                会把"看起来 45°"当成"斜率是 1"。 */}
            {axisTicks(e.window[0], e.window[1], false).map((v) => (
              <text key={`x${v}`} x={s.px(v)} y={H - PAD + 13} textAnchor="middle"
                fill="#64748b" className="font-mono text-[9px]">{show(v, 0)}</text>
            ))}
            {axisTicks(e.window[2], e.window[3], true).map((v) => (
              <text key={`y${v}`} x={PAD - 5} y={s.py(v) + 3} textAnchor="end"
                fill="#64748b" className="font-mono text-[9px]">{show(v, 0)}</text>
            ))}

            {/* ⚠️ 斜率场。方向是世界坐标里的单位向量,但两个轴的比例不同,
                所以要**换到屏幕上再归一化**,否则纵横比一变线就长短不一。 */}
            {ticks.map((t, i) => {
              if (t.dir === null) return null;
              const dx = t.dir[0] * s.kx;
              const dy = -t.dir[1] * s.ky;
              const n = Math.hypot(dx, dy);
              const ux = (dx / n) * (TICK / 2);
              const uy = (dy / n) * (TICK / 2);
              const cx = s.px(t.at[0]);
              const cy = s.py(t.at[1]);
              return (
                <line
                  key={i} data-tick={i}
                  x1={cx - ux} y1={cy - uy} x2={cx + ux} y2={cy + uy}
                  stroke="#64748b" strokeWidth={1.3} strokeLinecap="round"
                />
              );
            })}

            {/* 平衡解:每条都标明通解够不够得到它 */}
            {e.equilibria.map((k) => {
              const inFamily = constantC(e, k) !== null;
              return (
                <g key={k} data-equilibrium={k} data-in-formula={inFamily ? 'yes' : 'no'}>
                  <line
                    x1={PAD} y1={s.py(k)} x2={W - PAD} y2={s.py(k)}
                    stroke={inFamily ? LAB.pass : LAB.fail}
                    strokeWidth={1.6} strokeDasharray="7 5" opacity={0.75}
                  />
                  <text
                    x={W - PAD} y={s.py(k) - 8} textAnchor="end"
                    fill={inFamily ? LAB.pass : LAB.fail} className="font-mono text-[10px]"
                  >
                    {inFamily ? '✓' : '×'} y = {show(k, 0)}
                  </text>
                </g>
              );
            })}

            {/* 路径 ② —— 沿方向走出来的那条(实线,总是画得出来) */}
            {walked.length > 1 && (
              <polyline data-curve="walked" data-lost={onLost ? 'yes' : 'no'} points={pts(walked)}
                fill="none" stroke={curveColor} strokeWidth={2.6} strokeLinecap="round" />
            )}

            {/* 路径 ① —— 代通解得到的那条(虚线,压在上面)。
                ⚠️ 丢掉的那个解上它**不存在** —— 那个空缺就是这一页的结论。 */}
            {formulaRuns.map((run, i) => (
              <polyline key={i} data-curve="formula" points={pts(run)}
                fill="none" stroke="#0f172a" strokeWidth={1.4} strokeDasharray="4 4" />
            ))}

            {/* 初值点 */}
            <circle data-start-dot cx={s.px(at[0])} cy={s.py(at[1])} r={4.5} fill={LAB.x2} />
          </svg>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-2">
            <span className="font-mono text-[11px] text-slate-500">start at</span>
            {e.starts.map((q, i) => {
              const isEq = equilibriumAt(e, q) !== null;
              const on = q[0] === at[0] && q[1] === at[1];
              return (
                <button
                  key={i} type="button" data-start={i} data-active={on ? 'yes' : 'no'}
                  onClick={() => setP(q)}
                  className={
                    'rounded-lg border px-2 py-0.5 font-mono text-[11px] transition ' +
                    (on
                      ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
                  }
                >
                  ({show(q[0], 2)}, {show(q[1], 2)}){isEq ? ' ·' : ''}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          {/* ⭐⭐ 这一格就是整页的结论 */}
          <div data-panel="verdict" data-found={found ? 'yes' : 'no'}
            className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
            <p className="font-mono text-[11px] text-slate-500">general solution</p>
            {/* ⚠️ 用 `Tex` 渲染。第一版直接把字符串塞进 <p>,屏幕上是一串
                `y = \frac{1}{1 + Ce^{-x}}` 的源码 —— 截图看出来的。 */}
            <p className="mt-1 text-[13px] text-slate-300"><Tex src={e.familyTex} /></p>
            <p className="mt-2 flex items-start gap-1.5 font-mono text-[11px]"
              style={{ color: state.color }}>
              <span aria-hidden>{state.symbol}</span>
              <span data-readout="c">
                {found
                  ? `C = ${show(C, 3)} gives the curve through this point`
                  : onEquilibrium !== null
                    ? `no finite C gives y = ${show(onEquilibrium, 0)} — and yet the curve is right there`
                    : 'no C for this starting point'}
              </span>
            </p>
            {!e.separable && (
              <p data-note="not-separable" className="mt-2 text-[11px] leading-relaxed text-slate-400">
                This one does not separate at all, so the recipe above never starts. The field and the
                solution through a point are unaffected.
              </p>
            )}
          </div>

          {/* 丢掉的平衡解清单 */}
          {e.equilibria.length > 0 && (
            <div data-panel="equilibria" data-lost={lost.length}
              className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3">
              <p className="font-mono text-[11px] text-slate-500">constant solutions</p>
              <ul className="mt-1.5 space-y-1.5">
                {e.equilibria.map((k) => {
                  const inFamily = constantC(e, k) !== null;
                  return (
                    <li key={k} data-row={k} data-in-formula={inFamily ? 'yes' : 'no'}
                      className="font-mono text-[11px]"
                      style={{ color: inFamily ? LAB.pass : LAB.fail }}>
                      <span aria-hidden>{inFamily ? '✓' : '×'}</span> y = {show(k, 0)}
                      <span className="ml-1 text-slate-400">— {inFamily ? RECOVERED : LOST}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="rounded-2xl border border-slate-700 bg-slate-900/40 p-3 text-xs leading-relaxed text-slate-400">
            {FIELD_NOTE}
          </p>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p data-note="eq" className="text-sm leading-relaxed text-slate-300">{e.note}</p>
      </section>
    </main>
  );
}
