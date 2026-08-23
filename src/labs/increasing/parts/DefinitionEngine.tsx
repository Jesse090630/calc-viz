/**
 * LAB — 右栏的「定义引擎」
 *
 * 三行:输入 → 输出 → 定义。每一行都同时给出**符号形式**和**代入当前数值**的形式,
 * 学生因此能把 `f(x_1) < f(x_2)` 和 `0.64 < 4.41` 对上号。
 *
 * ⚠️ 措辞纪律:一对成立时只说 “This pair works.”,
 * **绝不说** “f is increasing”。那一步的跳跃正是这一节要拆掉的东西。
 */
import { STATE, type StateKey } from '../theme';
import { Tex } from '../../shared/Tex';
import { showNumber, type EvaluatedPair, type Relation } from '../../../math/monotonicity';

function StateBadge({ state }: { state: StateKey }) {
  const s = STATE[state];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ color: s.color, backgroundColor: `${s.color}1f`, border: `1px solid ${s.color}55` }}
    >
      {/* 符号 + 文字,颜色只是第三重信道 */}
      <span aria-hidden="true">{s.symbol}</span>
      {s.text}
    </span>
  );
}

export function InequalityRow({
  eyebrow,
  symbolic,
  substituted,
  state,
  accent,
}: {
  eyebrow: string;
  symbolic: string;
  substituted: string;
  state: StateKey;
  accent: string;
}) {
  return (
    <div
      className="rounded-xl border bg-slate-950/60 px-4 py-3"
      style={{ borderColor: `${accent}40` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {eyebrow}
        </span>
        <StateBadge state={state} />
      </div>
      <div className="mt-2 text-lg text-slate-100">
        <Tex src={symbolic} />
      </div>
      <div className="mt-1 font-mono text-sm tabular-nums text-slate-400">{substituted}</div>
    </div>
  );
}

/** 两行之间那条向下的连接线 —— 让"因为…所以…"看起来是一条链 */
function Connector({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <svg width="18" height="26" viewBox="0 0 18 26">
        <line
          x1="9"
          y1="0"
          x2="9"
          y2="18"
          stroke={active ? STATE.pass.color : STATE.idle.color}
          strokeWidth="1.6"
          strokeDasharray="3 3"
          style={{ transition: 'stroke 300ms ease' }}
        />
        <path
          d="M4 17 L9 24 L14 17"
          fill="none"
          stroke={active ? STATE.pass.color : STATE.idle.color}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: 'stroke 300ms ease' }}
        />
      </svg>
    </div>
  );
}

export function DefinitionEngine({
  pair,
  relation,
  passes,
  x1Color,
  x2Color,
}: {
  pair: EvaluatedPair;
  relation: Relation;
  passes: boolean;
  x1Color: string;
  x2Color: string;
}) {
  const inputsOk = pair.x1 < pair.x2; // 结构上恒真,但显式判断,不假设
  return (
    <div>
      <InequalityRow
        eyebrow="Inputs"
        symbolic="x_1 < x_2"
        substituted={`${showNumber(pair.x1)} < ${showNumber(pair.x2)}`}
        state={inputsOk ? 'pass' : 'idle'}
        accent={x1Color}
      />
      <Connector active={inputsOk} />
      <InequalityRow
        eyebrow="Outputs"
        symbolic={relation.consequentTex}
        substituted={`${showNumber(pair.y1)} ${relation.symbol} ${showNumber(pair.y2)}`}
        state={passes ? 'pass' : 'fail'}
        accent={x2Color}
      />
      <Connector active={passes} />
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: passes ? `${STATE.pass.color}55` : `${STATE.fail.color}55`,
          backgroundColor: passes ? `${STATE.pass.color}0f` : `${STATE.fail.color}0f`,
          transition: 'background-color 300ms ease, border-color 300ms ease',
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Definition
        </span>
        <div className="mt-2 text-base text-slate-100">
          <Tex src={relation.tex} />
        </div>
        <p
          className="mt-2 text-sm font-semibold"
          style={{ color: passes ? STATE.pass.color : STATE.fail.color }}
        >
          <span aria-hidden="true">{passes ? STATE.pass.symbol : STATE.fail.symbol}</span>{' '}
          {passes ? 'Works for this pair.' : 'Fails for this pair.'}
        </p>
      </div>
    </div>
  );
}
