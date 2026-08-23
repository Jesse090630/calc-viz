/**
 * LAB — 对称性右栏的读数与结论卡
 *
 * ⚠️ 无障碍:成立与否同时给**符号**(✓ ×)、**文字**和颜色。颜色是第三重信道,不是唯一信道。
 */
import { LAB, STATE } from '../shared/theme';
import { Tex } from '../shared/Tex';
import { showNumber, type MirrorSample, type SymmetryKind } from '../../math/symmetry';

/** 一行:标题 + 符号式 + 代入当前数值 */
export function ReadoutRow({
  eyebrow,
  symbolic,
  substituted,
  accent,
  state,
}: {
  eyebrow: string;
  symbolic: string;
  substituted: string;
  accent: string;
  state?: 'pass' | 'fail';
}) {
  return (
    <div className="rounded-xl border bg-slate-950/60 px-4 py-2.5" style={{ borderColor: `${accent}40` }}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
          {eyebrow}
        </span>
        {state && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              color: STATE[state].color,
              backgroundColor: `${STATE[state].color}1f`,
              border: `1px solid ${STATE[state].color}55`,
            }}
          >
            <span aria-hidden="true">{STATE[state].symbol}</span>
            {STATE[state].text}
          </span>
        )}
      </div>
      <div className="mt-1.5 text-base text-slate-100">
        <Tex src={symbolic} />
      </div>
      <div className="mt-0.5 font-mono text-sm tabular-nums text-slate-400">{substituted}</div>
    </div>
  );
}

function Arrow({ active }: { active: boolean }) {
  return (
    <div className="flex justify-center py-0.5" aria-hidden="true">
      <svg width="16" height="20" viewBox="0 0 16 20">
        <line x1="8" y1="0" x2="8" y2="13" stroke={active ? STATE.pass.color : STATE.idle.color} strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M4 12 L8 18 L12 12" fill="none" stroke={active ? STATE.pass.color : STATE.idle.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/**
 * 「选一个 x → 取相反数 → 比较两个输出」三段式。
 * `test` 决定第三行比的是偶性还是奇性。
 */
export function MirrorPanel({ sample, test }: { sample: MirrorSample; test: 'even' | 'odd' }) {
  const holds = test === 'even' ? sample.evenHolds : sample.oddHolds;
  const rightHand = test === 'even' ? showNumber(sample.fx) : showNumber(-sample.fx);
  return (
    <div>
      <ReadoutRow
        eyebrow="Choose x"
        symbolic="x"
        substituted={`x = ${showNumber(sample.x)}`}
        accent={LAB.x2}
      />
      <Arrow active />
      <ReadoutRow
        eyebrow="Mirror the input"
        symbolic="-x"
        substituted={`−x = ${showNumber(sample.negX)}`}
        accent={LAB.x1}
      />
      <Arrow active />
      <ReadoutRow
        eyebrow="Compare the outputs"
        symbolic={test === 'even' ? 'f(-x) = f(x)' : 'f(-x) = -f(x)'}
        substituted={`f(${showNumber(sample.negX)}) = ${showNumber(sample.fNegX)}   ${
          holds ? '=' : '≠'
        }   ${rightHand}`}
        accent={holds ? STATE.pass.color : STATE.fail.color}
        state={holds ? 'pass' : 'fail'}
      />
    </div>
  );
}

/** 结论卡。**只在学生已经看过多个 x 之后**才由上层放出来。 */
export function VerdictCard({ kind }: { kind: 'even' | 'odd' }) {
  const even = kind === 'even';
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: `${STATE.pass.color}55`, backgroundColor: `${STATE.pass.color}0f` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: STATE.pass.color }}>
        {even ? 'Even function' : 'Odd function'}
      </p>
      <div className="mt-2 text-lg text-slate-100">
        <Tex src={even ? 'f(-x) = f(x)' : 'f(-x) = -f(x)'} />
      </div>
      <p className="mt-2 text-sm text-slate-300">
        {even ? 'Mirror symmetry across the y-axis.' : 'Symmetric about the origin.'}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {even
          ? 'Flip left to right — the height stays the same.'
          : 'Rotate 180° through the origin — both coordinates change sign.'}
      </p>
    </div>
  );
}

/** EVEN | ODD 切换 */
export function ModeToggle({
  mode,
  onSelect,
}: {
  mode: 'even' | 'odd';
  onSelect: (m: 'even' | 'odd') => void;
}) {
  return (
    <div role="tablist" aria-label="Choose a symmetry type" className="inline-flex rounded-xl border border-slate-700 p-1">
      {(['even', 'odd'] as const).map((m) => (
        <button
          key={m}
          role="tab"
          type="button"
          aria-selected={mode === m}
          onClick={() => onSelect(m)}
          className={
            'rounded-lg px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ' +
            (mode === m ? 'bg-amber-400/15 text-amber-100' : 'text-slate-400 hover:text-slate-200')
          }
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export function LabButton({
  children,
  onClick,
  tone = 'default',
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary';
  disabled?: boolean;
}) {
  const styles: Record<string, string> = {
    default: 'border-slate-600 text-slate-200 hover:border-slate-400 hover:bg-slate-800/60',
    primary: 'border-amber-400/60 bg-amber-400/10 text-amber-100 hover:border-amber-300 hover:bg-amber-400/20',
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

/** 滑块 —— 拖不动的人走这条路 */
export function XSlider({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="symmetry-x" className="w-4 shrink-0 font-mono text-xs font-bold" style={{ color: LAB.x2 }}>
        x
      </label>
      <input
        id="symmetry-x"
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700"
        style={{ color: LAB.x2, accentColor: LAB.x2 }}
      />
      <output htmlFor="symmetry-x" className="w-11 shrink-0 text-right font-mono text-xs tabular-nums text-slate-300">
        {showNumber(value)}
      </output>
    </div>
  );
}

const KIND_LABEL: Readonly<Record<SymmetryKind, string>> = {
  even: 'Even',
  odd: 'Odd',
  neither: 'Neither',
};

export { KIND_LABEL };
