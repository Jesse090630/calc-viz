/**
 * LAB — 「Every Pair Must Work」
 *
 * 这不是一条推导链,所以**不走 `src/engine/`**,也没有上一步/下一步。
 * 它是一个实验台:先动手,再看见规律,最后才给规律起名字。
 * 顺序是 SEE IT → MOVE IT → COMPARE IT → BREAK IT → NAME IT。
 *
 * 结构上只有一条规则:**下面的段落靠"做过什么"解锁,不靠翻页。**
 * `stage` 只增不减,渲染时按 `stage >= n` 决定某一段出不出现。
 * 好处是学生永远能往回看已经解锁的内容,而不是被推着走。
 *
 * ⚠️ 屏幕上每个数字都来自 `src/math/monotonicity.ts`;这个文件里不出现裸算式。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractiveGraph } from './parts/InteractiveGraph';
import { DefinitionEngine } from './parts/DefinitionEngine';
import { PairSpaceMap, type PairDot } from './parts/PairSpaceMap';
import {
  Beat,
  CounterexampleState,
  DefinitionSwitcher,
  HandleSlider,
  IntervalSplitPanel,
  LabButton,
  PairCounter,
  QuantifierReveal,
} from './parts/Panels';
import { Tex } from '../shared/Tex';
import { COPY, LAB } from './theme';
import { moveX1 as pairMoveX1, moveX2 as pairMoveX2 } from './pairState';
import {
  FUNCTIONS,
  RELATIONS,
  evaluatePair,
  suggestCounterexample,
  monotoneBreakpoints,
  orderPair,
  pairFromSequence,
  pairSatisfies,
  showNumber,
  sweepSequence,
  type EvaluatedPair,
  type Interval,
  type RelationId,
} from '../../math/monotonicity';

const SQUARE = FUNCTIONS.square!;
const INCREASING = RELATIONS['strictly-increasing'];
const I_SAFE: Interval = { a: 0, b: 3 };
const I_BROKEN: Interval = { a: -2, b: 2 };

/** 各关系用哪条曲线来展示 —— 平坦段必须真的看得见,否则 ≤ 和 < 的差别无从谈起 */
const RELATION_EXAMPLE: Readonly<Record<RelationId, string>> = {
  'strictly-increasing': 'identity',
  'strictly-decreasing': 'negated',
  constant: 'level',
  nondecreasing: 'flatThenUp',
  nonincreasing: 'downThenFlat',
};

/** 把一对 x 值算成带输出的一对。算不出来时回退到区间两端,**绝不返回 NaN**。 */
function evaluateOrFallback(fnId: string, x1: number, x2: number, interval: Interval): EvaluatedPair {
  const fn = FUNCTIONS[fnId] ?? SQUARE;
  const ordered = orderPair(x1, x2) ?? orderPair(interval.a, interval.b)!;
  const evaluated = evaluatePair(fn, ordered);
  if (evaluated) return evaluated;
  return evaluatePair(fn, orderPair(interval.a, interval.b)!)!;
}

export function IncreasingLab() {
  /* ── 主实验台 ─────────────────────────────────────────────── */
  const [interval, setInterval] = useState<Interval>(I_SAFE);
  const [x1, setX1] = useState(0.8);
  const [x2, setX2] = useState(2.1);
  const [stage, setStage] = useState(0); // 只增不减
  const [tested, setTested] = useState(1);
  const [dots, setDots] = useState<readonly PairDot[]>([]);
  const [sweeping, setSweeping] = useState(false);
  const [broken, setBroken] = useState(false);

  const unlock = useCallback((n: number) => setStage((s) => (s < n ? n : s)), []);

  const pair = useMemo(
    () => evaluateOrFallback('square', x1, x2, interval),
    [x1, x2, interval],
  );
  const passes = pairSatisfies(INCREASING, pair);

  /**
   * 拖动时保持 x₁ < x₂。逻辑在 `pairState.ts` 里,因为它需要被单测覆盖 ——
   * 早先写在这里的版本会在拖到区间尽头时让两点相等,进而把整对弹回区间两头。
   */
  const moveX1 = useCallback(
    (next: number) => {
      const s = pairMoveX1({ x1, x2 }, next, interval);
      setX1(s.x1);
      setX2(s.x2);
    },
    [x1, x2, interval],
  );
  const moveX2 = useCallback(
    (next: number) => {
      const s = pairMoveX2({ x1, x2 }, next, interval);
      setX1(s.x1);
      setX2(s.x2);
    },
    [x1, x2, interval],
  );

  /* ── Part 3:再来一对 ─────────────────────────────────────── */
  const tryAnotherPair = useCallback(() => {
    const next = pairFromSequence(tested * 7 + 3, interval);
    if (!next) return;
    setX1(next.x1);
    setX2(next.x2);
    setTested((t) => t + 1);
    setDots((d) => {
      const evaluated = evaluatePair(SQUARE, next);
      if (!evaluated) return d;
      return [...d, { x1: next.x1, x2: next.x2, passes: pairSatisfies(INCREASING, evaluated) }];
    });
    unlock(1);
  }, [tested, interval, unlock]);

  /* ── Part 4:扫描 ────────────────────────────────────────── */
  const sweepFrame = useRef<number | null>(null);
  const startSweep = useCallback(() => {
    if (sweeping) return;
    setSweeping(true);
    const pairs = sweepSequence(interval, 1200);
    let index = 0;
    const tick = () => {
      const batch = pairs.slice(index, index + 22);
      index += 22;
      if (batch.length === 0) {
        setSweeping(false);
        sweepFrame.current = null;
        unlock(3);
        return;
      }
      const last = batch[batch.length - 1]!;
      setX1(last.x1);
      setX2(last.x2);
      setDots((d) => [
        ...d,
        ...batch.flatMap((p) => {
          const evaluated = evaluatePair(SQUARE, p);
          return evaluated
            ? [{ x1: p.x1, x2: p.x2, passes: pairSatisfies(INCREASING, evaluated) }]
            : [];
        }),
      ]);
      sweepFrame.current = requestAnimationFrame(tick);
    };
    sweepFrame.current = requestAnimationFrame(tick);
  }, [sweeping, interval, unlock]);

  useEffect(
    () => () => {
      if (sweepFrame.current !== null) cancelAnimationFrame(sweepFrame.current);
    },
    [],
  );

  /* ── Part 5:换区间 ─────────────────────────────────────── */
  const breakIt = useCallback(() => {
    setInterval(I_BROKEN);
    setBroken(true);
    setDots([]);
    setX1(-0.6);
    setX2(1.4); // 故意先给一对**成立**的,让学生自己去找失败的那对
    unlock(4);
  }, [unlock]);

  const counterexampleFound = broken && !passes ? pair : null;
  useEffect(() => {
    if (counterexampleFound) unlock(5);
  }, [counterexampleFound, unlock]);

  /** 找不到的话给一个提示用的答案 */
  const suggested = useMemo(
    () => suggestCounterexample(SQUARE, INCREASING, I_BROKEN, 400),
    [],
  );
  const revealCounterexample = useCallback(() => {
    if (!suggested) return;
    setX1(suggested.x1);
    setX2(suggested.x2);
  }, [suggested]);

  const splitAt = useMemo(() => monotoneBreakpoints(SQUARE, { a: -3, b: 3.4 }, 800)[0] ?? null, []);

  /* ── Part 7:定义对照 ───────────────────────────────────── */
  const [relationId, setRelationId] = useState<RelationId>('strictly-increasing');
  const [cx1, setCx1] = useState(0.5);
  const [cx2, setCx2] = useState(2.4);
  const compareInterval: Interval = { a: 0, b: 3 };
  const compareFnId = RELATION_EXAMPLE[relationId];
  const comparePair = useMemo(
    () => evaluateOrFallback(compareFnId, cx1, cx2, compareInterval),
    [compareFnId, cx1, cx2],
  );
  const comparePasses = pairSatisfies(RELATIONS[relationId], comparePair);

  /* ── Part 8:小挑战 ─────────────────────────────────────── */
  // 用「先平后升」而不是 x²:学生看到曲线在往上,会觉得"当然是递增的"。
  // 但平坦段上两点的输出**相等**,`f(x₁) < f(x₂)` 是假的 —— 这一关考的正是 < 与 ≤。
  const challengeInterval: Interval = { a: 0, b: 3 };
  const [hx1, setHx1] = useState(0.4);
  const [hx2, setHx2] = useState(2.6);
  const challengePair = useMemo(
    () => evaluateOrFallback('flatThenUp', hx1, hx2, challengeInterval),
    [hx1, hx2],
  );
  const challengePasses = pairSatisfies(INCREASING, challengePair);

  const sweptExtra = Math.max(0, dots.length - (tested - 1));

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          {COPY.title}
        </h1>
        <p className="mt-3 text-base text-slate-400">{COPY.subtitle}</p>
      </header>

      {/* ── 主实验台 ── */}
      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="grid lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
          <div className="min-w-0 border-b border-slate-700 p-4 sm:p-5 lg:border-b-0 lg:border-r">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-lg text-slate-100">
                <Tex src={SQUARE.tex} />
              </div>
              <div className="font-mono text-xs text-slate-400">
                <Tex src={`I = [${interval.a},\\, ${interval.b}]`} />
              </div>
            </div>

            <InteractiveGraph
              fn={SQUARE}
              interval={interval}
              intervalLabel={`I = [${interval.a}, ${interval.b}]`}
              pair={pair}
              onChangeX1={moveX1}
              onChangeX2={moveX2}
              pairPasses={passes}
              trail={dots}
              splitAt={stage >= 6 ? splitAt : null}
            />

            {/* 滑块 —— 拖不动的人走这条路 */}
            <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
              <HandleSlider label="x₁" value={pair.x1} min={interval.a} max={interval.b} color={LAB.x1} onChange={moveX1} />
              <HandleSlider label="x₂" value={pair.x2} min={interval.a} max={interval.b} color={LAB.x2} onChange={moveX2} />
              <p className="pt-0.5 text-[11px] text-slate-500">
                Drag the dots, use the sliders, or focus a dot and press ← →. Shift for bigger steps.
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LabButton onClick={tryAnotherPair} tone="primary" disabled={sweeping}>
                Try another pair
              </LabButton>
              {stage >= 2 && (
                <LabButton onClick={startSweep} disabled={sweeping}>
                  {sweeping ? 'Sweeping…' : 'Show all pairs'}
                </LabButton>
              )}
              {stage >= 3 && !broken && (
                <LabButton onClick={breakIt} tone="danger">
                  Can you break it?
                </LabButton>
              )}
              {broken && !counterexampleFound && (
                <LabButton onClick={revealCounterexample}>Show me one</LabButton>
              )}
            </div>
          </div>

          {/* 右栏:定义引擎 */}
          <div className="min-w-0 bg-slate-950/40 p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <PairCounter tested={tested} sweptExtra={sweptExtra} />
              <PairSpaceMap
                interval={interval}
                dots={dots}
                current={{ x1: pair.x1, x2: pair.x2, passes }}
                showFailRegion={broken}
              />
            </div>
            <DefinitionEngine
              pair={pair}
              relation={INCREASING}
              passes={passes}
              x1Color={LAB.x1}
              x2Color={LAB.x2}
            />
            <div className="mt-3 space-y-1.5">
              {!broken && passes && <Beat tone="pass">{COPY.largerLarger}</Beat>}
              {stage === 0 && <Beat>{COPY.pickTwo} {COPY.keepOrder} {COPY.nowCompare}</Beat>}
            </div>
          </div>
        </div>
      </section>

      {/* ── Part 3:一对不够 ── */}
      {stage >= 1 && (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Beat tone="loud">{COPY.notEnoughOne}</Beat>
          {tested >= 3 && <Beat tone="loud">{COPY.notEnoughTen}</Beat>}
          {tested >= 4 && <Beat tone="loud">{COPY.everyPair}</Beat>}
          {tested >= 4 && <QuantifierReveal />}
          {tested >= 4 && stage < 2 && <StageUnlocker onMount={() => unlock(2)} />}
        </section>
      )}

      {/* ── Part 4:扫描之后 ── */}
      {stage >= 3 && (
        <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-950/60 p-5">
          <div className="text-lg text-slate-100">
            <Tex src={INCREASING.tex} />
          </div>
          <Beat tone="pass">{COPY.sweepDone}</Beat>
          <Beat>{COPY.stillNotProof}</Beat>
          {/*
            ⚠️ 这段文案改过一次。原来写的是"打了这么多点,三角形still almost entirely empty"——
            结果截图一看,1,200 个点把三角形铺得**满满当当**。文字和画面对着干,
            学生只会相信眼睛,然后顺理成章地得出"那就是全试过了"这个正好相反的结论。
            现在改成先承认它看起来是满的,再说明为什么满不等于全 —— 这比嘴硬有说服力得多。
          */}
          <p className="mt-2 text-sm text-slate-300">
            The map looks full. It is not. Those are{' '}
            {dots.length.toLocaleString()} dots on a region containing infinitely many points —
            between any two of them sit infinitely many pairs we never checked. Zoom in anywhere
            and it is mostly gaps again.
          </p>
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-400/5 px-3 py-2 text-sm text-amber-100">
            A sweep can <strong>illustrate</strong> the claim. Proving it needs algebra:
            {' '}
            <Tex src="0 \le x_1 < x_2 \implies x_2^2 - x_1^2 = (x_2-x_1)(x_2+x_1) > 0" />
          </p>
        </section>
      )}

      {/* ── Part 5:反例 ── */}
      {stage >= 4 && (
        <section className="mt-10 rounded-2xl border border-slate-700 bg-slate-950/60 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
            Counterexample mode
          </p>
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight">{COPY.breakIt}</h2>
          <p className="mt-1 text-sm text-slate-400">
            The function is still <Tex src="f(x)=x^2" />. Only the interval changed, from{' '}
            <Tex src="[0,3]" /> to <Tex src="[-2,2]" />.
          </p>
          <div className="mt-4">
            <CounterexampleState found={counterexampleFound} />
          </div>
        </section>
      )}

      {/* ── Part 6:在区间上 ── */}
      {stage >= 5 && (
        <section className="mt-10">
          <div className="mb-3 flex justify-center">
            <LabButton onClick={() => unlock(6)} tone="primary">
              Split the curve into its two behaviours
            </LabButton>
          </div>
          {stage >= 6 && <IntervalSplitPanel />}
        </section>
      )}

      {/* ── Part 7:定义对照 ── */}
      {stage >= 5 && (
        <section className="mt-10 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/60">
          <div className="border-b border-slate-700 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
              Name it
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Five conditions, one shape</h2>
            <p className="mt-1 text-sm text-slate-400">
              Only the consequent changes. The antecedent is always <Tex src="x_1 < x_2" />.
            </p>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
            <div className="min-w-0 border-b border-slate-700 p-4 lg:border-b-0 lg:border-r">
              <InteractiveGraph
                fn={FUNCTIONS[compareFnId] ?? SQUARE}
                interval={compareInterval}
                intervalLabel="I = [0, 3]"
                pair={comparePair}
                onChangeX1={(v) => {
                  const s = pairMoveX1({ x1: cx1, x2: cx2 }, v, compareInterval);
                  setCx1(s.x1);
                  setCx2(s.x2);
                }}
                onChangeX2={(v) => {
                  const s = pairMoveX2({ x1: cx1, x2: cx2 }, v, compareInterval);
                  setCx1(s.x1);
                  setCx2(s.x2);
                }}
                pairPasses={comparePasses}
              />
            </div>
            <div className="min-w-0 p-4">
              <DefinitionSwitcher active={relationId} onSelect={setRelationId} />
              <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2.5">
                <div className="font-mono text-sm tabular-nums text-slate-300">
                  f({showNumber(comparePair.x1)}) = {showNumber(comparePair.y1)}
                  {'  '}
                  {RELATIONS[relationId].symbol}
                  {'  '}
                  f({showNumber(comparePair.x2)}) = {showNumber(comparePair.y2)}
                </div>
                <p
                  className="mt-1.5 text-xs font-bold"
                  style={{ color: comparePasses ? LAB.pass : LAB.fail }}
                >
                  <span aria-hidden="true">{comparePasses ? '✓' : '×'}</span>{' '}
                  {comparePasses ? 'holds for this pair' : 'fails for this pair'}
                </p>
              </div>
              {RELATIONS[relationId].allowsFlat && (
                <p className="mt-3 text-xs leading-relaxed text-cyan-200">
                  Try putting both dots on the flat part. The outputs come out{' '}
                  <strong>equal</strong> — which <Tex src="\le" /> allows and{' '}
                  <Tex src="<" /> does not.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Part 8:小挑战 ── */}
      {stage >= 6 && (
        <section className="mt-10 overflow-hidden rounded-2xl border border-amber-500/30 bg-slate-950/60">
          <div className="border-b border-amber-500/20 px-5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
              Your turn
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Can this pair prove the function is NOT strictly increasing?
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Position both dots yourself. This curve never goes down — so is it strictly
              increasing on <Tex src="[0,3]" />?
            </p>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
            <div className="min-w-0 border-b border-slate-700 p-4 lg:border-b-0 lg:border-r">
              <InteractiveGraph
                fn={FUNCTIONS.flatThenUp!}
                interval={challengeInterval}
                intervalLabel="I = [0, 3]"
                pair={challengePair}
                onChangeX1={(v) => {
                  const s = pairMoveX1({ x1: hx1, x2: hx2 }, v, challengeInterval);
                  setHx1(s.x1);
                  setHx2(s.x2);
                }}
                onChangeX2={(v) => {
                  const s = pairMoveX2({ x1: hx1, x2: hx2 }, v, challengeInterval);
                  setHx1(s.x1);
                  setHx2(s.x2);
                }}
                pairPasses={challengePasses}
              />
            </div>
            <div className="min-w-0 p-4">
              {challengePasses ? (
                <div className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-200">
                    <span aria-hidden="true">✓</span> This pair works — but that proves nothing.
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    One successful pair never establishes a statement about every pair. Keep
                    looking: is there anywhere on this curve where moving right does{' '}
                    <em>not</em> raise the output?
                  </p>
                </div>
              ) : (
                <div
                  className="rounded-xl border px-4 py-3"
                  style={{ borderColor: `${LAB.fail}66`, backgroundColor: `${LAB.fail}12` }}
                >
                  <p className="text-sm font-bold" style={{ color: LAB.fail }}>
                    <span aria-hidden="true">×</span> Counterexample. Nicely found.
                  </p>
                  <div className="mt-2 font-mono text-xs tabular-nums text-slate-300">
                    {showNumber(challengePair.x1)} &lt; {showNumber(challengePair.x2)}, but f gives{' '}
                    {showNumber(challengePair.y1)} and {showNumber(challengePair.y2)}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    The outputs are <strong>equal</strong>, so{' '}
                    <Tex src="f(x_1) < f(x_2)" /> is false. The curve never falls, so this function{' '}
                    <em>is</em> nondecreasing — but a flat step is enough to disqualify{' '}
                    <strong>strictly</strong> increasing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/** 挂载即解锁下一段。把"解锁"这件事留在渲染树里,而不是散在各个回调中。 */
function StageUnlocker({ onMount }: { onMount: () => void }) {
  useEffect(onMount, [onMount]);
  return null;
}
