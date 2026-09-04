/**
 * LAB — 相关变化率:「把关系式对 t 求导」。
 *
 * ⭐⭐ 和隐函数求导是同一句话,只是自变量换成了 t:
 *   关系式里每一个随时间变的量,求导时都挂上自己的变化率 ——
 *   和 `#/implicit` 里每个 y 项挂上 `dy/dx` 一模一样。
 *
 * ⚠️ 梯子那个情景要跑到失效点:`y → 0` 时公式给出 `dy/dt → −∞`。
 *   那不是算错,是**模型的边界到了**。页面必须把这句话说出来,
 *   而不是显示一个巨大的数字了事。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/relatedRates.ts`。
 */
import { useMemo, useState } from 'react';
import {
  HEADLINE,
  KINSHIP_NOTE,
  MAIN_IDEA,
  SCENARIOS,
  clampT,
  isValid,
  pathsAgree,
  rateNumeric,
  scenarioOf,
  show,
  terms,
  timeLeft,
  timeExceeding,
} from '../../math/relatedRates';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

const W = 360;
const H = 260;
const PAD = 30;
/**
 * ⚠️ 梯子那一幕左边要留更多空:y 的标签是 `textAnchor="end"` 贴着墙写的,
 * 只留 30 的话「y = 4.14」会被 viewBox 左边切掉,屏幕上只剩「4.14」——
 * 一个没有名字的数字。截图才看得出来,测试读的是 DOM,永远不会报。
 */
const LPAD = 56;

/** 梯子情景画一个直角三角形;别的情景画一个随时间长大的圆。 */
function Stage({ scenarioId, t }: { scenarioId: string; t: number }) {
  const s = scenarioOf(scenarioId);
  const tracked = s.trackedAt(t);

  if (s.id === 'ladder') {
    const x = s.driverAt(t);
    const y = tracked;
    const k = (W - LPAD - PAD) / 5.6;              // 5 是梯长,留点边
    const ox = LPAD;
    const oy = H - PAD;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label="A ladder leaning on a wall, sliding down as its foot moves out">
        {/* 墙与地 */}
        <line x1={ox} y1={PAD - 8} x2={ox} y2={oy} stroke={LAB.axis} strokeWidth={2} />
        <line x1={ox} y1={oy} x2={W - 8} y2={oy} stroke={LAB.axis} strokeWidth={2} />
        {y === null ? (
          <text x={W / 2} y={H / 2} textAnchor="middle" fill={LAB.fail} fontSize={12}
            fontFamily="ui-monospace, monospace" data-collapsed>
            the model has run out
          </text>
        ) : (
          <>
            {/* x 与 y 两条腿 */}
            <line x1={ox} y1={oy} x2={ox + x * k} y2={oy} stroke={LAB.x1} strokeWidth={3} />
            <line x1={ox} y1={oy} x2={ox} y2={oy - y * k} stroke={LAB.pass} strokeWidth={3} />
            {/* ⚠️ 梯子**最后**画。y → 0 时梯子几乎躺平,和 x 那条腿重合;
                先画梯子就会被 x 盖住 —— 主角被配角挡住了。*/}
            <line data-ladder x1={ox} y1={oy - y * k} x2={ox + x * k} y2={oy}
              stroke={LAB.x2} strokeWidth={3.5} strokeLinecap="round" />
            <circle cx={ox} cy={oy - y * k} r={4.5} fill={LAB.pass} />
            <circle cx={ox + x * k} cy={oy} r={4.5} fill={LAB.x1} />
            <text x={ox + (x * k) / 2} y={oy + 15} textAnchor="middle" fill={LAB.x1}
              fontSize={10} fontFamily="ui-monospace, monospace">x = {show(x, 2)}</text>
            <text x={ox - 6} y={oy - (y * k) / 2} textAnchor="end" fill={LAB.pass}
              fontSize={10} fontFamily="ui-monospace, monospace">y = {show(y, 2)}</text>
          </>
        )}
      </svg>
    );
  }

  // 气球 / 涟漪:一个长大的圆
  const r = s.id === 'balloon' ? tracked! : s.driverAt(t);
  const rMax = s.id === 'balloon'
    ? s.trackedAt(s.tRange[1])!
    : s.driverAt(s.tRange[1]);
  const k = (Math.min(W, H) / 2 - PAD) / rMax;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="A circle growing steadily outward">
      <circle cx={W / 2} cy={H / 2} r={rMax * k} fill="none" stroke={LAB.muted}
        strokeWidth={1} strokeDasharray="4 4" opacity={0.4} />
      <circle data-growing cx={W / 2} cy={H / 2} r={Math.max(r * k, 1)} fill={LAB.interval}
        fillOpacity={0.28} stroke={LAB.x1} strokeWidth={2} />
      <line x1={W / 2} y1={H / 2} x2={W / 2 + r * k} y2={H / 2} stroke={LAB.pass} strokeWidth={2.4} />
      <text x={W / 2 + (r * k) / 2} y={H / 2 - 6} textAnchor="middle" fill={LAB.pass}
        fontSize={10} fontFamily="ui-monospace, monospace">r = {show(r, 2)}</text>
    </svg>
  );
}

export function RelatedRatesLab() {
  const [id, setId] = useState(SCENARIOS[0]!.id);
  const s = scenarioOf(id);
  const [t, setT] = useState(s.startT);

  const valid = isValid(s, t);
  const exact = s.rateExact(t);
  const numeric = rateNumeric(s, t);
  const agree = pathsAgree(s, t);
  const stepList = terms(s);
  // ⭐ 「要多大有多大」:构造一个让率超过 1000 的时刻,给个按钮跳过去
  const wildTime = useMemo(() => timeExceeding(s, 1000), [s]);
  const left = timeLeft(s, t);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Derivatives
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Related Rates
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {SCENARIOS.map((k) => (
            <button
              key={k.id} type="button" data-scenario={k.id}
              data-active={k.id === id ? 'yes' : 'no'}
              onClick={() => { setId(k.id); setT(k.startT); }}
              className={
                'rounded-lg border px-2.5 py-1 text-[11px] transition ' +
                (k.id === id
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {k.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-400">
          {/* ⚠️ data-t-exact 是**未取整**的时刻。文字读数只留两位,而这一课有意思的
              地方只有 1e-4 宽(率超过 1000 的那一刻在 6.66666,显示成 6.67);
              滑块 step=0.01 也会把自己的 value 吸附到 6.67。断言必须读这个属性,
              照着 6.67 比大小会误判成越过了失效点。*/}
          t = <span data-readout="t" data-t-exact={t} className="text-amber-300">{show(t, 2)}</span>
          <input type="range" min={s.tRange[0]} max={s.tRange[1]} step={0.01} value={t}
            onChange={(e) => setT(clampT(s, Number(e.target.value)))}
            className="w-44 accent-amber-400" aria-label="Move time forward" />
        </label>
      </div>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <section data-panel="stage" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            ① The situation at time t
          </p>
          <div className="mt-2"><Stage scenarioId={id} t={t} /></div>
          <div className="mt-1 space-y-0.5 font-mono text-[11px]">
            <p style={{ color: LAB.x1 }}>
              {s.driverLabel} = <span data-readout="driver">{show(s.driverAt(t), 3)}</span>
            </p>
            <p style={{ color: LAB.pass }}>
              {s.trackedLabel} = <span data-readout="tracked">{show(s.trackedAt(t), 3)}</span>
            </p>
          </div>
        </section>

        <div className="grid gap-4">
          <section data-panel="terms" className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ② Differentiate the relation with respect to t
            </p>
            <p className="mt-2 text-sm text-slate-200"><Tex src={s.relationTex} /></p>
            <div className="mt-2 space-y-2">
              {stepList.map((step, i) => (
                <div key={i} data-term={i} data-carries={step.carriesRate ? 'yes' : 'no'}
                  className={
                    'rounded-lg border px-2.5 py-2 ' +
                    (step.carriesRate ? 'border-amber-400/50 bg-amber-400/10' : 'border-slate-800')
                  }
                >
                  <p className="text-sm text-slate-200">
                    <Tex src={step.beforeTex} />
                    <span className="mx-2 text-slate-500">→</span>
                    <Tex src={step.afterTex} />
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed"
                    style={{ color: step.carriesRate ? '#fcd34d' : '#64748b' }}>
                    {step.why}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-slate-200"><Tex src={s.differentiatedTex} /></p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">{KINSHIP_NOTE}</p>
          </section>

          <section
            data-panel="rate" className="rounded-2xl border p-4"
            style={{
              borderColor: valid ? `${LAB.pass}59` : `${LAB.fail}59`,
              background: valid ? `${LAB.pass}0f` : `${LAB.fail}0f`,
            }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              ③ Solve for {s.wantedLabel}
            </p>
            <p className="mt-2 text-base text-slate-100"><Tex src={s.solvedTex} /></p>
            <div className="mt-3 space-y-1 font-mono text-xs">
              <p className="text-slate-400">
                given {s.givenLabel} = <span data-readout="given">{show(s.givenRate, 3)}</span>
              </p>
              <p style={{ color: LAB.pass }}>
                from the relation = <span data-readout="exact">{show(exact)}</span>
              </p>
              <p style={{ color: LAB.x1 }}>
                numeric d/dt&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span data-readout="numeric">{show(numeric)}</span>
              </p>
              <p data-readout="agree" data-ok={agree ? 'yes' : 'no'}
                className="border-t border-slate-700 pt-1 text-slate-400">
                {agree ? '✓ the two agree' : valid ? '· not comparable here' : '— the model has run out'}
              </p>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {agree
                ? 'The numeric row differentiates the tracked quantity in time and never touches the relation. They agree, so the move is checked, not assumed.'
                : valid
                  ? 'The numeric check needs a little room on both sides of this instant, and this close to the break there is none. Saying nothing is the honest answer here — a finite difference across the break would agree by accident, not by right.'
                  : 'Past the break there is no quantity left to differentiate.'}
            </p>

            {s.breaksAt !== null && (
              <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/50 px-2.5 py-2">
                <p className="font-mono text-[11px] text-slate-400">
                  the model runs out at t ={' '}
                  <span data-readout="breaks" style={{ color: LAB.fail }}>{show(s.breaksAt, 3)}</span>
                </p>
                {/* ⭐ 率大约正比于 1/剩余时间 —— 并排放着,爆炸就不神秘了 */}
                {left !== null && (
                  <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                    time still left ={' '}
                    <span data-readout="left" className="text-slate-300">{show(left, 7)}</span>
                  </p>
                )}
                {wildTime !== null && (
                  <button
                    type="button" data-action="go-wild"
                    onClick={() => setT(clampT(s, wildTime))}
                    className="mt-1.5 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-1 font-mono text-[10px] text-red-100 transition hover:border-red-300"
                  >
                    jump to where the rate passes 1000 →
                  </button>
                )}
              </div>
            )}

            {!valid && (
              <p data-readout="break-note" className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-2.5 py-2 text-[11px] leading-relaxed text-red-100">
                {s.breakNote}
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
