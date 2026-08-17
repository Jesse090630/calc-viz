import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChainPlayer } from '../../engine/ChainPlayer';
import { createChainStore } from '../../engine/store';
import type { SceneProps } from '../../engine/types';
import {
  INPUT_DEBOUNCE_MS,
  compileExpressionCurve,
  createDebouncedTask,
  fitCurveForDisplay,
  type ExpressionCurveInput,
  type ExpressionCurveResult,
} from '../../math/expression';
import { ExpressionInputPanel } from '../../ui/ExpressionInputPanel';
import { DISK_METHOD_CHAIN } from '../disk-method/chain';
import { makeCustomDiskChain } from '../disk-method/customChain';
import { DiskScene } from '../disk-method/DiskScene';
import { SHELL_METHOD_CHAIN } from '../shell-method/chain';
import { makeCustomShellChain } from '../shell-method/customChain';
import { ShellScene } from '../shell-method/ShellScene';

type SolidMethod = 'shell' | 'disk';

const DEFAULTS: Record<SolidMethod, ExpressionCurveInput> = {
  shell: { expression: '4 - x^2', a: 0, b: 2 },
  disk: { expression: 'sqrt(4 - x)', a: 0, b: 4 },
};

function numericInput(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

function validate(method: SolidMethod, input: ExpressionCurveInput): ExpressionCurveResult {
  return compileExpressionCurve(
    input,
    method === 'shell' ? { requireNonNegativeDomain: true } : {},
  );
}

export function SolidExperience({ method }: { method: SolidMethod }) {
  const initial = DEFAULTS[method];
  const [expression, setExpression] = useState(initial.expression);
  const [aText, setAText] = useState(String(initial.a));
  const [bText, setBText] = useState(String(initial.b));
  const [validation, setValidation] = useState<ExpressionCurveResult>(() => validate(method, initial));
  const [applied, setApplied] = useState<ExpressionCurveResult | null>(null);

  useEffect(() => {
    const task = createDebouncedTask(
      (input: ExpressionCurveInput) => setValidation(validate(method, input)),
      INPUT_DEBOUNCE_MS,
    );
    task.schedule({ expression, a: numericInput(aText), b: numericInput(bText) });
    return task.cancel;
  }, [method, expression, aText, bText]);

  const active = applied?.ok ? applied : null;
  const chain = useMemo(() => {
    if (!active) return method === 'shell' ? SHELL_METHOD_CHAIN : DISK_METHOD_CHAIN;
    return method === 'shell'
      ? makeCustomShellChain(active.curve)
      : makeCustomDiskChain(active.curve);
  }, [active, method]);
  const store = useMemo(() => createChainStore(chain), [chain]);
  const viewport = useMemo(() => {
    if (!active) return null;
    return method === 'shell'
      ? fitCurveForDisplay(active.curve, active.range, { xSpan: 2, ySpan: 4, preserveZeroX: true })
      : fitCurveForDisplay(active.curve, active.range, { xSpan: 4, ySpan: 2 });
  }, [active, method]);

  const renderScene = useCallback((props: SceneProps) => {
    if (!active || !viewport) {
      return method === 'shell' ? <ShellScene {...props} /> : <DiskScene {...props} />;
    }
    return method === 'shell' ? (
      <ShellScene
        {...props}
        sourceCurve={active.curve}
        sourceInterval={active.interval}
        viewport={viewport}
        displayTop={active.range.displayMax}
        clamped={active.range.clamped}
      />
    ) : (
      <DiskScene
        {...props}
        sourceRadius={active.curve}
        sourceInterval={active.interval}
        viewport={viewport}
        displayTop={active.range.displayMax}
        clamped={active.range.clamped}
      />
    );
  }, [active, method, viewport]);

  const apply = () => {
    if (validation.ok) setApplied(validation);
  };
  const restore = () => {
    setExpression(initial.expression);
    setAText(String(initial.a));
    setBText(String(initial.b));
    setValidation(validate(method, initial));
    setApplied(null);
  };

  return (
    <>
      <ChainPlayer key={chain.id} useChain={store} renderScene={renderScene} />
      <ExpressionInputPanel
        idPrefix={method}
        title={method === 'shell' ? 'Try your own shell region' : 'Try your own disk radius'}
        functionLabel={method === 'shell' ? 'height f(x)' : 'radius r(t) · type t as x'}
        expression={expression}
        aText={aText}
        bText={bText}
        validation={validation}
        readyText="Ready · the profile is finite throughout the interval."
        onExpression={setExpression}
        onA={setAText}
        onB={setBText}
        onApply={apply}
        onReset={restore}
      />
    </>
  );
}
