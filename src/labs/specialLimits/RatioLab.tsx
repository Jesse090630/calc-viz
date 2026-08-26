/**
 * LAB — **一个**组件驱动五节课:
 *   tan x / x · (1−cos x)/x · (1−cos x)/x² · (eˣ−1)/x · ln(1+x)/x
 *
 * ⚠️ 提示词点名要求「reuse instead of creating another long proof」。
 * 这里的读法不是「五个页面长得像」,而是**同一个组件、换一个 `FormId`** ——
 * 和非递减/非递增那两课共用一个实验台是同一条路子。
 * 版式一旦漂,五节课一起漂;修一次,五节课一起修。
 *
 * ⚠️ 每课自己那一块从 `extras.tsx` 插进来。共用骨架讲不了
 * 「割线」「镜像」「共轭」这些**只属于一课**的东西,硬塞进骨架会把骨架撑坏。
 *
 * ⚠️ 不走 `src/engine/` —— 这里没有「第几步」。
 */
import { useCallback, useMemo, useState } from 'react';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';
import {
  Disclosure,
  FactorGauges,
  LabHeader,
  LadderTable,
  ResultPanel,
  StepReveal,
  SubstitutionPanel,
  XSlider,
  ZoomPanel,
} from './parts';
import {
  BasePanel,
  ConjugatePanel,
  HalfAnglePanel,
  LocalBehaviourPanel,
  ReflectionPanel,
  SecantPanel,
  ThreeWayPanel,
} from './extras';
import { DEEP_LADDER, clampX, formOf, halve, type FormId } from '../../math/specialForms';

/** 每课的起始 x。挑的是「一眼看得出还没到位」的那个尺度。 */
const START_X: Readonly<Record<FormId, number>> = {
  'sin-over-x': 1,
  'tan-over-x': 0.9,
  'cos-over-x': 0.9,
  'cos-over-x2': 0.9,
  'exp-over-x': 0.9,
  'log-over-x': 0.6,
};

export function RatioLab({ id }: { id: FormId }) {
  const form = formOf(id);
  const [x, setX] = useState(() => clampX(id, START_X[id]));
  const [level, setLevel] = useState(0);
  const [revealed, setRevealed] = useState(1);

  const onX = useCallback((next: number) => setX(clampX(id, next)), [id]);
  const smaller = useCallback(() => setX((v) => halve(id, v)), [id]);
  const restart = useCallback(() => {
    setX(clampX(id, START_X[id]));
    setLevel(0);
    setRevealed(1);
  }, [id]);

  /**
   * ⚠️ 「教科书写法」那一列**只给 (1−cos x)/x² 摆**。
   * (1−cos x)/x 的极限是 0,两列在七位小数下写出来一模一样 ——
   * 摆一列看不出差别的数字等于什么都没演示。(浏览器检查量出「最大差 0」时发现的。)
   * 而 x² 那一课的极限是 ½,教科书那列会一路塌到 0.0000000,对比是刺眼的。
   */
  const showNaive = id === 'cos-over-x2';

  const leftColumn = useMemo(() => {
    if (id === 'exp-over-x') return <SecantPanel x={x} />;
    if (id === 'log-over-x') return <ReflectionPanel />;
    return null;
  }, [id, x]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <LabHeader id={id} />

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <p className="font-mono text-xs text-slate-400">
            <Tex src={form.ratioTex} /> &nbsp;·&nbsp; near x = 0 &nbsp;·&nbsp; radians
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <XSlider id={id} x={x} onX={onX} />
            <button
              type="button"
              data-action="halve"
              onClick={smaller}
              className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10"
            >
              Halve x →
            </button>
            <button
              type="button"
              data-action="restart"
              onClick={restart}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr_0.95fr]">
          {/*
            左栏:① 代入 → 那一课自己的画面(没有就用缩放面板顶上)。
            ⚠️ 顺序是从截图上改的:原来缩放面板排在代入**上面**,
            于是同一栏里先看到 ③ 再看到 ① —— 编号和阅读顺序打架。
          */}
          <div className="flex min-w-0 flex-col gap-4">
            <SubstitutionPanel id={id} />
            {leftColumn ?? <ZoomPanel id={id} level={level} onLevel={setLevel} />}
            {id === 'tan-over-x' && <ThreeWayPanel x={x} />}
            {id === 'cos-over-x' && <ConjugatePanel x={x} />}
            {id === 'cos-over-x2' && <HalfAnglePanel x={x} />}
          </div>

          {/* 中栏:阶梯 + 缩放(左栏已经占用时缩放挪到这里) */}
          <div className="flex min-w-0 flex-col gap-4">
            {leftColumn ? <ZoomPanel id={id} level={level} onLevel={setLevel} /> : null}
            {/* ⚠️ `exactOptionalPropertyTypes` 下不能传 `undefined` 当"不传" ——
                两个分支各写一次,比给 prop 的类型加上 `| undefined` 诚实。 */}
            {showNaive ? (
              <LadderTable id={id} showNaive xs={DEEP_LADDER} />
            ) : (
              <LadderTable id={id} />
            )}
            {id === 'cos-over-x2' && <LocalBehaviourPanel x={x} />}
            {id === 'exp-over-x' && <BasePanel />}
          </div>

          {/* 右栏:代数 → 因子 → 结论 */}
          <div className="flex min-w-0 flex-col gap-4">
            <StepReveal
              steps={form.steps}
              label="④ The algebra"
              revealed={revealed}
              onReveal={() => setRevealed((n) => n + 1)}
            />
            <FactorGauges id={id} x={x} />
            <ResultPanel id={id}>
              <NextUp id={id} />
            </ResultPanel>
          </div>
        </div>
      </section>
    </main>
  );
}

/** 结论底下的一句「所以呢」。⚠️ 说的是这条极限**接下来能干什么**,不是复述它。 */
function NextUp({ id }: { id: FormId }) {
  const COPY: Readonly<Record<FormId, string>> = {
    'sin-over-x': 'Three of the other five limits in this section are built on this one.',
    'tan-over-x': 'One known limit plus one identity produced a second limit. No new proof was needed.',
    'cos-over-x': 'Change the denominator to x² and the answer stops being 0. That is the next lesson.',
    'cos-over-x2': 'Same numerator, different denominator, different answer — because a quotient compares rates.',
    'exp-over-x': 'Reflect this across y = x and you get the logarithm version for free.',
    'log-over-x': 'Six limits, two roots. Everything else was reuse.',
  };
  return (
    <p data-readout="next-up" className="mt-2 border-t border-slate-700/60 pt-2 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
      {COPY[id]}
    </p>
  );
}

/** 每节课一个薄薄的路由入口。 */
export function ratioPage(id: FormId) {
  return function Page() {
    return <RatioLab id={id} />;
  };
}

/** 「advanced」那种可选块,给页面外部复用。 */
export { Disclosure };
