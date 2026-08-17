import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { ExpressionInputPanel } from '../../ui/ExpressionInputPanel';
import { EXPRESSION_PRESETS, type ExpressionPreset } from '../../math/presets';

const DEFAULT_INPUT: ExpressionCurveInput = { expression: '4 - x^2', a: 0, b: 2 };

function numericInput(value: string): number {
  return value.trim() === '' ? Number.NaN : Number(value);
}

export function RiemannExperience() {
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
    if (validation.ok) setApplied(validation);
  };
  const restore = () => {
    setExpression(DEFAULT_INPUT.expression);
    setAText(String(DEFAULT_INPUT.a));
    setBText(String(DEFAULT_INPUT.b));
    setValidation(compileExpressionCurve(DEFAULT_INPUT));
    setApplied(null);
  };
  const choosePreset = (preset: ExpressionPreset) => {
    setExpression(preset.expression);
    setAText(String(preset.a));
    setBText(String(preset.b));
    setValidation(compileExpressionCurve(preset));
  };

  return (
    <>
      <ChainPlayer key={chain.id} useChain={store} renderScene={renderScene} />
      <ExpressionInputPanel
        idPrefix="riemann"
        title="Try your own function"
        functionLabel="f(x)"
        expression={expression}
        aText={aText}
        bText={bText}
        validation={validation}
        onExpression={setExpression}
        onA={setAText}
        onB={setBText}
        onApply={apply}
        onReset={restore}
        presets={EXPRESSION_PRESETS.riemann}
        onPreset={choosePreset}
      />
    </>
  );
}
