/**
 * LAB — 「Scan the Curve」的三块面板。
 *
 *   ① Verdict   —— 三行:Move right. / Output rises. / INCREASING
 *   ② Split     —— mixed 时把窗口切成几段列出来,并说清是在哪里换的方向
 *   ③ Intervals —— 整条曲线的单调区间,当前落在哪条就高亮哪条
 *
 * ⚠️ 判定状态一律挂 `data-*`(`data-behaviour` / `data-crossings`),不靠读文案。
 * 这个项目里已经有三次浏览器测试因为读文案而误判的记录。
 */
import { BEHAVIOUR_COLOR, LAB } from './theme';
import {
  BEHAVIOUR_COPY,
  CROSSING_COPY,
  containingInterval,
  formatInterval,
  monotoneIntervals,
  showX,
  type Curve,
  type ScanReading,
} from '../../math/scanning';

/* ── ① 三行判定 ───────────────────────────────────────────────────── */

export function Verdict({ reading }: { reading: ScanReading }) {
  const copy = BEHAVIOUR_COPY[reading.behaviour];
  const color = BEHAVIOUR_COLOR[reading.behaviour];
  const mixed = reading.behaviour === 'mixed';

  return (
    <section
      data-panel="verdict"
      data-behaviour={reading.behaviour}
      className="rounded-2xl border p-4 transition"
      style={{ borderColor: `${color}59`, background: `${color}0f` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        On {formatInterval({ from: reading.from, to: reading.to })}
      </p>

      {/* 三行:动作 → 结果 → 名字。顺序就是读图的顺序。 */}
      <p className="mt-3 font-mono text-sm text-slate-300">Move right.</p>
      <p className="mt-1 font-mono text-sm" style={{ color }}>
        {copy.output}
      </p>
      <p className="mt-3 flex items-center gap-2 text-2xl font-bold leading-none" style={{ color }}>
        <span aria-hidden="true">{copy.arrow}</span>
        <span>{copy.label}</span>
      </p>

      {mixed && (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: LAB.fail }}>
          This interval contains {reading.crossings.map((c) => CROSSING_COPY[c.kind]).join(' and ')}.
          A single answer would be wrong here.
        </p>
      )}
    </section>
  );
}

/* ── ② 切开 ───────────────────────────────────────────────────────── */

export function Split({ reading }: { reading: ScanReading }) {
  if (reading.behaviour !== 'mixed') return null;
  return (
    <section data-panel="split" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Split it at the turn</p>
      <ul className="mt-3 space-y-1.5">
        {reading.parts.map((part) => (
          <li
            key={`${part.from}-${part.to}`}
            data-part={part.behaviour}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-1.5"
          >
            <span className="font-mono text-xs text-slate-300">{formatInterval(part)}</span>
            <span className="font-mono text-xs font-bold" style={{ color: BEHAVIOUR_COLOR[part.behaviour] }}>
              {BEHAVIOUR_COPY[part.behaviour].arrow} {BEHAVIOUR_COPY[part.behaviour].label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Each piece has one answer. The whole window does not.
      </p>
    </section>
  );
}

/* ── ③ 整条曲线的区间 ─────────────────────────────────────────────── */

export function Intervals({ curve, reading }: { curve: Curve; reading: ScanReading }) {
  const here = containingInterval(curve, reading.from, reading.to);
  return (
    <section data-panel="intervals" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The whole curve</p>
      <ul className="mt-3 space-y-1.5">
        {monotoneIntervals(curve).map((interval) => {
          const on = here !== null && here.from === interval.from && here.to === interval.to;
          return (
            <li
              key={`${interval.from}-${interval.to}`}
              data-interval={interval.behaviour}
              data-on={on ? 'yes' : 'no'}
              className={
                'flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 transition ' +
                (on ? 'border-slate-600 bg-slate-800/60' : 'border-slate-800 bg-slate-900/40')
              }
            >
              <span
                className="font-mono text-xs font-bold"
                style={{ color: BEHAVIOUR_COLOR[interval.behaviour], opacity: on ? 1 : 0.6 }}
              >
                {BEHAVIOUR_COPY[interval.behaviour].arrow} {BEHAVIOUR_COPY[interval.behaviour].label}
              </span>
              <span className="font-mono text-xs" style={{ color: on ? '#e2e8f0' : '#64748b' }}>
                {formatInterval(interval)}
              </span>
            </li>
          );
        })}
      </ul>
      {/*
        ⚠️ 端点用**开区间**。转折点本身既不属于"上升的那一段"也不属于"下降的那一段" ——
        在那一点上函数既没升也没降。写成闭区间是最常见的一种小错。
      */}
      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Open at the turning points: at x = {showX(curve.corners[0]!.x)} the graph is neither rising nor
        falling.
      </p>
    </section>
  );
}

/* ── 心智模型:LEFT → RIGHT ───────────────────────────────────────── */

export function MentalModel() {
  const rows = [
    { behaviour: 'up' as const, when: 'graph rises' },
    { behaviour: 'down' as const, when: 'graph falls' },
    { behaviour: 'flat' as const, when: 'graph stays level' },
  ];
  return (
    <section data-panel="mental-model" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Read it left → right</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div
            key={row.behaviour}
            data-rule={row.behaviour}
            className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5 text-center"
          >
            <p className="text-2xl leading-none" aria-hidden="true" style={{ color: BEHAVIOUR_COLOR[row.behaviour] }}>
              {BEHAVIOUR_COPY[row.behaviour].arrow}
            </p>
            <p className="mt-1.5 text-xs text-slate-400">{row.when}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: BEHAVIOUR_COLOR[row.behaviour] }}>
              {BEHAVIOUR_COPY[row.behaviour].label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
