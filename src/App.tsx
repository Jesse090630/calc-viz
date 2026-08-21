import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ChainPlayer } from './engine/ChainPlayer';
import { createChainStore, type ChainStoreHook } from './engine/store';
import { resolveTex } from './engine/store';
import type { Chain, SceneProps } from './engine/types';
import { SHELL_METHOD_CHAIN } from './concepts/shell-method/chain';
import { ShellScene } from './concepts/shell-method/ShellScene';
import { DISK_METHOD_CHAIN } from './concepts/disk-method/chain';
import { DiskScene } from './concepts/disk-method/DiskScene';
import { RIEMANN_SUM_CHAIN } from './concepts/riemann-sum/chain';
import { RiemannScene } from './concepts/riemann-sum/RiemannScene';
import { DERIVATIVE_CHAIN } from './concepts/derivative/chain';
import { DerivativeScene } from './concepts/derivative/DerivativeScene';
import { LIMITS_CHAIN } from './concepts/limits/chain';
import { LimitsScene } from './concepts/limits/LimitsScene';
import { UNIT_CIRCLE_CHAIN } from './concepts/unit-circle/chain';
import { UnitCircleScene } from './concepts/unit-circle/UnitCircleScene';
import { Home, BackLink, type ConceptCard } from './ui/Home';
import { FormulaDeck } from './ui/FormulaDeck';
import { NotationBoard } from './ui/NotationBoard';
import { TRIG_RATES_CHAIN } from './concepts/trig-rates/chain';
import { TrigRatesScene } from './concepts/trig-rates/TrigRatesScene';
import { FEATURES } from './config';
import { createReducedMotionChain } from './accessibility/reducedMotionChain';
import { usePrefersReducedMotion } from './accessibility/usePrefersReducedMotion';

const CustomRiemannExperience = lazy(() =>
  import('./concepts/riemann-sum/RiemannExperience').then(({ RiemannExperience }) => ({
    default: RiemannExperience,
  })),
);
const CustomSolidExperience = lazy(() =>
  import('./concepts/solid-input/SolidExperience').then(({ SolidExperience }) => ({
    default: SolidExperience,
  })),
);

const RIEMANN_STORE = createChainStore(createReducedMotionChain(RIEMANN_SUM_CHAIN));
const SHELL_STORE = createChainStore(createReducedMotionChain(SHELL_METHOD_CHAIN));
const DISK_STORE = createChainStore(createReducedMotionChain(DISK_METHOD_CHAIN));

interface Recommendation {
  readonly id: string;
  readonly title: string;
}

const RECOMMENDED_NEXT: Readonly<Record<string, Recommendation>> = {
  limits: { id: 'derivative', title: 'Secant → Tangent' },
  derivative: { id: 'riemann-sum', title: 'Riemann Sums → the Integral' },
  'riemann-sum': { id: 'shell-method', title: 'The Shell Method' },
  'shell-method': { id: 'disk-method', title: 'The Disk Method' },
  'disk-method': { id: 'unit-circle', title: 'The Unit Circle and sin / cos' },
  'unit-circle': { id: 'trig-rates', title: 'Trig Derivatives ↔ Integrals' },
  'trig-rates': { id: 'limits', title: 'Left and Right Limits' },
};

function recommendedAfter(chainId: string): Recommendation {
  const recommendation = RECOMMENDED_NEXT[chainId];
  if (!recommendation) throw new Error(`Missing recommendation after ${chainId}`);
  return recommendation;
}

function LessonPage({
  chain,
  useChain,
  renderScene,
  className = '',
}: {
  chain: Chain;
  useChain: ChainStoreHook;
  renderScene: (props: SceneProps) => React.ReactNode;
  className?: string;
}) {
  const index = useChain((state) => state.index);
  const params = useChain((state) => state.params);
  const resetParams = useChain((state) => state.resetParams);
  const reducedMotion = usePrefersReducedMotion();
  const recommendation = recommendedAfter(chain.id);
  const stage = chain.stages[index];

  useEffect(() => {
    resetParams();
  }, [reducedMotion, resetParams]);

  const accessibleScene = useCallback(
    (props: SceneProps) => (
      <>
        <span
          className="sr-only"
          role="img"
          aria-label={props.stage.altText ?? `${props.stage.title}. ${props.stage.narration}`}
        />
        {renderScene(props)}
      </>
    ),
    [renderScene],
  );

  const formulaAnnouncement = stage?.formula
    ?.map((line) => resolveTex(line.tex, params))
    .join('; ');

  return (
    <div className={`relative ${className}`}>
      <BackLink />
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stage
          ? `${chain.subtitle}. Step ${stage.label} of ${chain.stages.length}. ${formulaAnnouncement ? `Current formula: ${formulaAnnouncement}` : 'No formula in this step.'}`
          : ''}
      </div>
      <ChainPlayer key={chain.id} useChain={useChain} renderScene={accessibleScene} />
      {index === chain.stages.length - 1 ? (
        <a
          data-recommended-next
          aria-label={`Recommended next: ${recommendation.title}`}
          href={`#/${recommendation.id}`}
          className="recommended-next fixed bottom-0 left-[4.75rem] right-[4.75rem] z-[21] flex h-[4.1875rem] flex-col items-center justify-center border-x border-amber-400/30 bg-slate-950/95 px-2 text-center shadow-xl shadow-black/40 backdrop-blur md:left-auto md:right-[4.75rem] md:w-[230px]"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">Recommended next</span>
          <strong className="mt-0.5 text-xs text-slate-100">{recommendation.title} →</strong>
        </a>
      ) : null}
    </div>
  );
}

// 每条链一个 store,模块级创建一次。切页面时不重建,所以来回切不会丢进度。
const CHAINS = [
  { chain: LIMITS_CHAIN, store: createChainStore(createReducedMotionChain(LIMITS_CHAIN)), Scene: LimitsScene },
  { chain: DERIVATIVE_CHAIN, store: createChainStore(createReducedMotionChain(DERIVATIVE_CHAIN)), Scene: DerivativeScene },
  { chain: UNIT_CIRCLE_CHAIN, store: createChainStore(createReducedMotionChain(UNIT_CIRCLE_CHAIN)), Scene: UnitCircleScene },
  { chain: TRIG_RATES_CHAIN, store: createChainStore(createReducedMotionChain(TRIG_RATES_CHAIN)), Scene: TrigRatesScene },
] as const;

// 顺序 = 依赖顺序,不是完成顺序。Limits 是 derivative 的语言地基,
// Riemann 则是 Shell 第 6–7 步 Σ→∫ 的前置知识。
const CARDS: ConceptCard[] = [
  {
    id: 'limits',
    title: 'Left and Right Limits',
    question: 'If the function has no value there, what is the limit even describing?',
    steps: LIMITS_CHAIN.stages.length,
    ready: true,
    track: 'Foundations',
  },
  {
    id: 'derivative',
    title: 'Secant → Tangent',
    question: 'What does it actually mean for two points to “become” one?',
    steps: DERIVATIVE_CHAIN.stages.length,
    ready: true,
    track: 'Foundations',
  },
  {
    id: 'riemann-sum',
    title: 'Riemann Sums → the Integral',
    question: 'Why does adding up rectangles turn into an integral sign?',
    steps: RIEMANN_SUM_CHAIN.stages.length,
    ready: true,
    track: 'Integration',
  },
  {
    id: 'shell-method',
    title: 'The Shell Method',
    question: 'Why is there a 2πx in the integral? Where does that come from?',
    steps: SHELL_METHOD_CHAIN.stages.length,
    ready: true,
    track: '3D Volume',
  },
  {
    id: 'disk-method',
    title: 'The Disk Method',
    question: 'How am I supposed to know which method to use?',
    steps: DISK_METHOD_CHAIN.stages.length,
    ready: true,
    track: '3D Volume',
  },
  {
    id: 'unit-circle',
    title: 'The Unit Circle and sin / cos',
    question: 'Why does going around a circle produce a wave?',
    steps: UNIT_CIRCLE_CHAIN.stages.length,
    ready: true,
    track: 'Trigonometry',
  },
  {
    id: 'trig-rates',
    title: 'Trig Derivatives ↔ Integrals',
    question: 'Why do sin and cos keep turning into each other?',
    steps: TRIG_RATES_CHAIN.stages.length,
    ready: true,
    track: 'Trigonometry',
  },
];

/** 极简 hash 路由。没有依赖、没有构建配置,静态托管上刷新也不会 404。 */
function useHashRoute(): string {
  const read = (): string => window.location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export default function App() {
  const route = useHashRoute();
  const notationTriggerRef = useRef<HTMLAnchorElement>(null);
  const closeNotation = useCallback(() => {
    window.location.hash = '#/';
  }, []);
  let page: React.ReactNode;
  if (route === 'riemann-sum') {
    page = FEATURES.customFunctionInput ? (
      <div className="relative">
        <BackLink />
        <Suspense fallback={null}>
          <CustomRiemannExperience />
        </Suspense>
      </div>
    ) : (
      <LessonPage chain={RIEMANN_SUM_CHAIN} useChain={RIEMANN_STORE} renderScene={RiemannScene} />
    );
  } else if (route === 'shell-method' || route === 'disk-method') {
    const shell = route === 'shell-method';
    page = FEATURES.customFunctionInput ? (
      <div className="relative">
        <BackLink />
        <Suspense fallback={null}>
          <CustomSolidExperience method={shell ? 'shell' : 'disk'} />
        </Suspense>
      </div>
    ) : (
      <LessonPage
        chain={shell ? SHELL_METHOD_CHAIN : DISK_METHOD_CHAIN}
        useChain={shell ? SHELL_STORE : DISK_STORE}
        renderScene={shell ? ShellScene : DiskScene}
      />
    );
  } else {
    const active = CHAINS.find((c) => c.chain.id === route);
    page = active ? (
      <LessonPage
        chain={active.chain}
        useChain={active.store}
        renderScene={active.Scene}
        className={active.chain.id === 'unit-circle' ? 'unit-circle-page' : ''}
      />
    ) : <Home concepts={CARDS} />;
  }

  return (
    <>
      {page}
      <div data-learning-tools className="fixed right-4 top-4 z-30 flex items-center gap-2">
        <a
          ref={notationTriggerRef}
          href="#/notation"
          aria-label="Open calc type board"
          aria-current={route === 'notation' ? 'page' : undefined}
          aria-expanded={route === 'notation'}
          aria-controls="notation-board-dialog"
          className={
            'flex items-center gap-2 rounded-xl border bg-slate-950/90 px-3 py-2 text-xs font-semibold shadow-lg shadow-black/25 backdrop-blur transition hover:bg-slate-900 ' +
            (route === 'notation'
              ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100'
              : 'border-cyan-400/40 text-cyan-100 hover:border-cyan-300')
          }
        >
          <span aria-hidden="true" className="text-base leading-none">∂</span>
          <span className="hidden sm:inline">Type board</span>
        </a>
        <FormulaDeck />
      </div>
      <NotationBoard
        open={route === 'notation'}
        onClose={closeNotation}
        returnFocusRef={notationTriggerRef}
      />
    </>
  );
}
