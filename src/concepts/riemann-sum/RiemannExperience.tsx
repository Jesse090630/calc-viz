import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SceneProps } from '../../engine/types';
import { ChainPlayer } from '../../engine/ChainPlayer';
import { createChainStore } from '../../engine/store';
import {
  INPUT_DEBOUNCE_MS,
  compileExpressionCurve,
  createDebouncedTask,
  fitCurveForDisplay,
  type ExpressionCurveInput,
  type ExpressionCurveResult,
} from '../../math/expression';
import { RIEMANN_SUM_CHAIN } from './chain';
import { makeCustomRiemannChain } from './customChain';
import { RiemannScene } from './RiemannScene';

const DEFAULT_INPUT: ExpressionCurveInput = { expression: '4 - x^2', a: 0, b: 2 };

function numericInput(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export function RiemannExperience() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [expression, setExpression] = useState(DEFAULT_INPUT.expression);
  const [aText, setAText] = useState(String(DEFAULT_INPUT.a));
  const [bText, setBText] = useState(String(DEFAULT_INPUT.b));
  const [validation, setValidation] = useState<ExpressionCurveResult>(() =>
    compileExpressionCurve(DEFAULT_INPUT),
  );
  const [applied, setApplied] = useState<ExpressionCurveResult | null>(null);

  useEffect(() => {
    const task = createDebouncedTask(
      (input: ExpressionCurveInput) => setValidation(compileExpressionCurve(input)),
      INPUT_DEBOUNCE_MS,
    );
    task.schedule({ expression, a: numericInput(aText), b: numericInput(bText) });
    return task.cancel;
  }, [expression, aText, bText]);

  const active = applied?.ok ? applied : null;
  const chain = useMemo(
    () => (active ? makeCustomRiemannChain(active.curve, active.integral) : RIEMANN_SUM_CHAIN),
    [active],
  );
  const store = useMemo(() => createChainStore(chain), [chain]);
  const fitted = useMemo(
    () => (active ? fitCurveForDisplay(active.curve, active.range) : null),
    [active],
  );
  const renderScene = useCallback(
    (props: SceneProps) =>
      active && fitted ? (
        <RiemannScene
          {...props}
          curve={fitted.curve}
          interval={fitted.interval}
          exact={active.integral}
          sourceInterval={active.interval}
          custom
          clamped={active.range.clamped}
          displayTop={active.range.displayMax}
        />
      ) : (
        <RiemannScene {...props} />
      ),
    [active, fitted],
  );

  const apply = () => {
    if (validation.ok) {
      setApplied(validation);
      if (detailsRef.current) detailsRef.current.open = false;
    }
  };
  const restore = () => {
    setExpression(DEFAULT_INPUT.expression);
    setAText(String(DEFAULT_INPUT.a));
    setBText(String(DEFAULT_INPUT.b));
    setValidation(compileExpressionCurve(DEFAULT_INPUT));
    setApplied(null);
  };

  return (
    <>
      <ChainPlayer key={chain.id} useChain={store} renderScene={renderScene} />
      <details ref={detailsRef} className="absolute right-3 top-3 z-20 w-[min(22rem,calc(100vw-7.5rem))] rounded-xl border border-slate-700 bg-slate-950/95 shadow-xl backdrop-blur">
        <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold text-cyan-300">
          Try your own function
        </summary>
        <div className="border-t border-slate-700 p-3">
          <label className="block text-[11px] font-medium text-slate-300" htmlFor="riemann-expression">
            f(x)
          </label>
          <input
            id="riemann-expression"
            value={expression}
            onChange={(event) => setExpression(event.target.value)}
            spellCheck={false}
            className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 font-mono text-sm outline-none focus:border-cyan-400"
          />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-[11px] text-slate-300">
              interval a
              <input
                aria-label="interval a"
                inputMode="decimal"
                value={aText}
                onChange={(event) => setAText(event.target.value)}
                className="mt-1 w-full rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 text-sm outline-none focus:border-cyan-400"
              />
            </label>
            <label className="text-[11px] text-slate-300">
              interval b
              <input
                aria-label="interval b"
                inputMode="decimal"
                value={bText}
                onChange={(event) => setBText(event.target.value)}
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
                : `Ready · numerical integral ${validation.integral.toFixed(6)}`
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
              onClick={restore}
              className="rounded-md border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:border-slate-400"
            >
              Reset
            </button>
          </div>
        </div>
      </details>
    </>
  );
}
