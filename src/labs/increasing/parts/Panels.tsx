/**
 * LAB — 各幕的说明面板
 *
 * 全部是**受控的展示组件**。逻辑与状态在 `IncreasingLab.tsx`,这里只管呈现。
 */
import { COPY, LAB, STATE } from '../theme';
import { Tex } from '../../shared/Tex';
import {
  RELATIONS,
  RELATION_ORDER,
  showNumber,
  type EvaluatedPair,
  type RelationId,
} from '../../../math/monotonicity';

/** 一句会淡入的小标语。逐条出现,不要一次砸一段。 */
export function Beat({ children, tone = 'plain' }: {
  children: React.ReactNode;
  tone?: 'plain' | 'loud' | 'pass' | 'fail';
}) {
  const color =
    tone === 'pass' ? STATE.pass.color : tone === 'fail' ? STATE.fail.color : undefined;
  return (
    <p
      className={
        'lab-beat ' +
        (tone === 'loud'
          ? 'text-lg font-bold tracking-tight text-amber-300'
          : 'text-sm leading-relaxed text-slate-300')
      }
      style={color ? { color } : undefined}
    >
      {children}
    </p>
  );
}

/** Part 3 的计数器 + 逐条揭示 */
export function PairCounter({ tested, sweptExtra }: { tested: number; sweptExtra: number }) {
  const total = tested + sweptExtra;
  return (
    <div className="flex items-baseline gap-2 font-mono text-sm text-slate-400">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        Pairs tested
      </span>
      <strong className="text-2xl tabular-nums text-slate-100">{total.toLocaleString()}</strong>
      {sweptExtra > 0 && <span className="text-xs text-slate-500">({sweptExtra.toLocaleString()} from the sweep)</span>}
    </div>
  );
}

/** ∀ 的登场:先把英文变成符号,再解释符号 */
export function QuantifierReveal() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-400/5 px-4 py-3">
      <p className="text-xs text-slate-400">
        <span className="line-through decoration-slate-600">for any choice of x₁, x₂ in I</span>
      </p>
      <div className="mt-1.5 text-xl text-amber-200">
        <Tex src="\forall\, x_1, x_2 \in I" />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">{COPY.forAll}</p>
    </div>
  );
}

/** Part 5 的结论卡 */
export function CounterexampleState({ found }: { found: EvaluatedPair | null }) {
  if (!found) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
        <p className="text-sm text-slate-300">{COPY.findCounter}</p>
        <p className="mt-1.5 text-xs text-slate-500">
          Hint: the rule only cares about order. Where does this curve come back down?
        </p>
      </div>
    );
  }
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: `${STATE.fail.color}66`, backgroundColor: `${STATE.fail.color}12` }}
    >
      <p className="text-base font-bold" style={{ color: STATE.fail.color }}>
        <span aria-hidden="true">×</span> {COPY.counterFound}
      </p>
      <div className="mt-2 space-y-1 font-mono text-sm tabular-nums text-slate-300">
        <div>
          {showNumber(found.x1)} &lt; {showNumber(found.x2)}{' '}
          <span style={{ color: STATE.pass.color }}>✓ true</span>
        </div>
        <div>
          f({showNumber(found.x1)}) = {showNumber(found.y1)}, f({showNumber(found.x2)}) ={' '}
          {showNumber(found.y2)}
        </div>
        <div>
          {showNumber(found.y1)} &lt; {showNumber(found.y2)}{' '}
          <span style={{ color: STATE.fail.color }}>× false</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-amber-300">{COPY.oneIsEnough}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{COPY.asymmetry}</p>
    </div>
  );
}

/** Part 6:同一条曲线,两段不同的行为 */
export function IntervalSplitPanel() {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
        On an interval
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-3">
          <div className="text-sm text-slate-200"><Tex src="(-\infty,\, 0]" /></div>
          <p className="mt-1 text-xs font-semibold text-red-300">decreasing</p>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-3">
          <div className="text-sm text-slate-200"><Tex src="[0,\, \infty)" /></div>
          <p className="mt-1 text-xs font-semibold text-green-300">increasing</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-300">{COPY.onAnInterval}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
        That is why the definition names an interval <Tex src="I" /> at all. “Increasing” is not a
        property of the function alone — it is a property of the function <em>on a set</em>.
      </p>
    </div>
  );
}

/** Part 7:五个定义之间切换 */
export function DefinitionSwitcher({
  active,
  onSelect,
}: {
  active: RelationId;
  onSelect: (id: RelationId) => void;
}) {
  const relation = RELATIONS[active];
  return (
    <div>
      <div role="tablist" aria-label="Compare the definitions" className="flex flex-wrap gap-1.5">
        {RELATION_ORDER.map((id) => {
          const selected = id === active;
          return (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => onSelect(id)}
              className={
                'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ' +
                (selected
                  ? 'border-amber-400/70 bg-amber-400/15 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              {RELATIONS[id].label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3">
        <div className="text-base text-slate-100">
          <Tex src={relation.tex} />
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{relation.note}</p>
        {relation.allowsFlat && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-2 py-1 text-[11px] font-semibold text-cyan-200">
            <span aria-hidden="true">≤</span> flat sections allowed
          </p>
        )}
        {!relation.allowsFlat && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800/60 px-2 py-1 text-[11px] font-semibold text-slate-300">
            <span aria-hidden="true">&lt;</span> strict — no flat sections
          </p>
        )}
      </div>
    </div>
  );
}

/** 主按钮 */
export function LabButton({
  children,
  onClick,
  tone = 'default',
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    default: 'border-slate-600 text-slate-200 hover:border-slate-400 hover:bg-slate-800/60',
    primary: 'border-amber-400/60 bg-amber-400/10 text-amber-100 hover:border-amber-300 hover:bg-amber-400/20',
    danger: 'border-red-400/50 bg-red-500/10 text-red-200 hover:border-red-300 hover:bg-red-500/20',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${styles[tone]}`}
    >
      {children}
    </button>
  );
}

/** 无障碍备份:每个手柄都配一个原生滑块,拖不动的人用这个 */
export function HandleSlider({
  label,
  value,
  min,
  max,
  color,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
  onChange: (v: number) => void;
}) {
  const id = `slider-${label}`;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-8 shrink-0 font-mono text-xs font-bold" style={{ color }}>
        {label}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-current"
        style={{ color }}
      />
      <output htmlFor={id} className="w-11 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
        {showNumber(value)}
      </output>
    </div>
  );
}

export { LAB };
