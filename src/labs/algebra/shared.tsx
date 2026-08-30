/**
 * LAB — 四节代数课(平方差 / 立方差 / 二项式 / 等比级数)的共用零件。
 *
 * 这四节和极限那一节共用同一套视觉:深底、细蓝灰边、青与琥珀做数学重音、
 * 绿表示**已验证的相等**、红只在真的不成立时出现。
 *
 * ⚠️ 这四节都有一个共同的动作:**一步一步露代数,而且露过的不收回去**。
 * 所以 `TermRow` 与 `RevealButton` 放在这里,四节共用一份。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';

/** 一节课的页头。 */
export function LessonHead({
  title,
  headline,
  lede,
}: {
  title: string;
  headline: string;
  lede: string;
}) {
  return (
    <header className="max-w-2xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
        Algebra · Interactive
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 text-base text-slate-400">
        {headline}. {lede}
      </p>
    </header>
  );
}

/** 一块带小标题的面板。 */
export function Panel({
  name,
  label,
  children,
  tone = 'plain',
  extra,
}: {
  name: string;
  label: string;
  children: React.ReactNode;
  tone?: 'plain' | 'good';
  extra?: Record<string, string>;
}) {
  const style = tone === 'good'
    ? { borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }
    : undefined;
  return (
    <section
      data-panel={name}
      {...extra}
      className={
        'rounded-2xl border p-4 ' +
        (tone === 'good' ? '' : 'border-slate-700 bg-slate-950/60')
      }
      style={style}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/** 整数滑块。 */
export function IntSlider({
  name,
  label,
  value,
  min,
  max,
  onChange,
  colour = LAB.x2,
}: {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  colour?: string;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-xs text-slate-400">
        {label} = <span data-readout={name} style={{ color: colour }}>{value}</span>
      </span>
      <input
        type="range"
        aria-label={name}
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 accent-current"
        style={{ color: colour }}
      />
    </label>
  );
}

/** 一个两选一的开关(GEOMETRY | ALGEBRA 那种)。 */
export function Toggle<T extends string>({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: readonly { readonly id: T; readonly label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div data-toggle={name} data-value={value} className="inline-flex rounded-xl border border-slate-700 p-0.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          data-option={option.id}
          data-active={option.id === value ? 'yes' : 'no'}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={
            'rounded-lg px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition ' +
            (option.id === value
              ? 'bg-amber-400/15 text-amber-200'
              : 'text-slate-500 hover:text-slate-300')
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * 一项:可以标成「会抵消」。
 * ⚠️ 抵消用**划掉 + 变暗**表示,不用红色 ——
 * 没有任何东西出错了,只是两项相加为零。红色留给真的不成立的地方。
 */
export function TermChip({
  tex,
  sign,
  cancelled,
  index,
}: {
  tex: string;
  sign: 1 | -1;
  cancelled: boolean;
  index: number;
}) {
  return (
    <span
      data-term={String(index)}
      data-cancelled={cancelled ? 'yes' : 'no'}
      className="inline-flex items-baseline gap-1 transition"
      style={{ opacity: cancelled ? 0.4 : 1 }}
    >
      <span className="text-slate-500">{index === 0 ? (sign < 0 ? '−' : '') : sign < 0 ? '−' : '+'}</span>
      <span
        className="text-slate-100"
        style={cancelled ? { textDecoration: 'line-through', textDecorationColor: LAB.x2 } : undefined}
      >
        <Tex src={tex} />
      </span>
    </span>
  );
}

/** 「下一步」按钮。露过的不收回去。 */
export function RevealButton({ onClick, label = 'Then what? →' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      data-action="next-step"
      onClick={onClick}
      className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
    >
      {label}
    </button>
  );
}

/** 主按钮(触发那个主要动作:重排、展开…)。 */
export function ActionButton({
  name,
  onClick,
  disabled = false,
  children,
}: {
  name: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-action={name}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

export function QuietButton({
  name,
  onClick,
  children,
}: {
  name: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      data-action={name}
      onClick={onClick}
      className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
    >
      {children}
    </button>
  );
}

/**
 * 一段 0 → 1 的补间,用来驱动「重排 / 拆开 / 相减」那类动作。
 *
 * ⚠️ `prefers-reduced-motion` 时**不启动 rAF**,直接跳到终点。
 * 不是"动得慢一点" —— 要的是不动,而且结果得看得见。
 */
export function useTween(durationMs = 1400): {
  t: number;
  play: () => void;
  reset: () => void;
  playing: boolean;
  animated: boolean;
} {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    if (reduced) { setT(1); setPlaying(false); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const raw = Math.min(1, (now - start) / durationMs);
      // 缓入缓出,收敛到 1
      setT(raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2);
      if (raw < 1) frame.current = requestAnimationFrame(tick);
      else { setT(1); setPlaying(false); }
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [playing, reduced, durationMs]);

  const play = useCallback(() => { setT(0); setPlaying(true); }, []);
  const reset = useCallback(() => { setPlaying(false); setT(0); }, []);
  return { t, play, reset, playing, animated: !reduced };
}

/** 一行「左边 = 右边」,相等时用绿色标出来。 */
export function EqualityRow({
  name,
  leftTex,
  rightTex,
  agree,
  note,
}: {
  name: string;
  leftTex: string;
  rightTex: string;
  agree: boolean;
  note?: string;
}) {
  return (
    <div
      data-equality={name}
      data-agree={agree ? 'yes' : 'no'}
      className="rounded-xl border px-3 py-2"
      style={{
        borderColor: agree ? `${LAB.pass}4d` : '#334155',
        background: agree ? `${LAB.pass}0d` : 'transparent',
      }}
    >
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-100">
        <span><Tex src={leftTex} /></span>
        <span style={{ color: agree ? LAB.pass : LAB.muted }}>=</span>
        <span><Tex src={rightTex} /></span>
      </p>
      {note && <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{note}</p>}
    </div>
  );
}
