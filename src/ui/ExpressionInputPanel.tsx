import { useRef } from 'react';
import type { ExpressionCurveResult } from '../math/expression';
import type { ExpressionPreset } from '../math/presets';

export function ExpressionInputPanel({
  idPrefix,
  title,
  functionLabel,
  expression,
  aText,
  bText,
  validation,
  onExpression,
  onA,
  onB,
  onApply,
  onReset,
  readyText,
  presets,
  onPreset,
}: {
  idPrefix: string;
  title: string;
  functionLabel: string;
  expression: string;
  aText: string;
  bText: string;
  validation: ExpressionCurveResult;
  onExpression: (value: string) => void;
  onA: (value: string) => void;
  onB: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  readyText?: string;
  presets?: readonly ExpressionPreset[];
  onPreset?: (preset: ExpressionPreset) => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const apply = () => {
    if (!validation.ok) return;
    onApply();
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return (
    <details ref={detailsRef} className="absolute right-3 top-3 z-20 w-[min(22rem,calc(100vw-7.5rem))] rounded-xl border border-slate-700 bg-slate-950/95 shadow-xl backdrop-blur md:right-[392px]">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-cyan-300">
        {title}
      </summary>
      <div className="border-t border-slate-700 p-3">
        {presets && onPreset && (
          <>
            <label className="block text-[11px] font-medium text-slate-300">
              preset
              <select
                aria-label={`${idPrefix} preset`}
                value=""
                onChange={(event) => {
                  const preset = presets.find((item) => item.id === event.target.value);
                  if (preset) onPreset(preset);
                }}
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-400"
              >
                <option value="">Choose a verified example…</option>
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>{preset.label} · {preset.hint}</option>
                ))}
              </select>
            </label>
            <div className="mt-2">
              <p className="text-[11px] text-slate-400">Try this</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {presets.slice(0, 3).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-label={`${idPrefix} try ${preset.label}`}
                    onClick={() => onPreset(preset)}
                    className="rounded-full border border-slate-600 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-cyan-500 hover:text-cyan-200"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <label className="block text-[11px] font-medium text-slate-300" htmlFor={`${idPrefix}-expression`}>
          {functionLabel}
        </label>
        <input
          id={`${idPrefix}-expression`}
          value={expression}
          onChange={(event) => onExpression(event.target.value)}
          spellCheck={false}
          className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 font-mono text-sm outline-none focus:border-cyan-400"
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[11px] text-slate-300">
            interval a
            <input
              aria-label={`${idPrefix} interval a`}
              inputMode="decimal"
              value={aText}
              onChange={(event) => onA(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-400"
            />
          </label>
          <label className="text-[11px] text-slate-300">
            interval b
            <input
              aria-label={`${idPrefix} interval b`}
              inputMode="decimal"
              value={bText}
              onChange={(event) => onB(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-400"
            />
          </label>
        </div>
        <p
          role="status"
          className={`mt-2 min-h-8 text-xs leading-4 ${validation.ok ? 'text-emerald-300' : 'text-rose-300'}`}
        >
          {validation.ok
            ? validation.range.clamped
              ? `Ready · values above ${validation.range.displayMax} will be clipped in the view.`
              : readyText ?? `Ready · numerical integral ${validation.integral.toFixed(6)}`
            : validation.error.message}
        </p>
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={apply}
            disabled={!validation.ok}
            className="flex-1 rounded-md bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Build the derivation
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-slate-400"
          >
            Reset
          </button>
        </div>
      </div>
    </details>
  );
}
