import { useEffect, useState } from 'react';
import { ChainPlayer } from './engine/ChainPlayer';
import { createChainStore } from './engine/store';
import { SHELL_METHOD_CHAIN } from './concepts/shell-method/chain';
import { ShellScene } from './concepts/shell-method/ShellScene';
import { DISK_METHOD_CHAIN } from './concepts/disk-method/chain';
import { DiskScene } from './concepts/disk-method/DiskScene';
import { RIEMANN_SUM_CHAIN } from './concepts/riemann-sum/chain';
import { RiemannExperience } from './concepts/riemann-sum/RiemannExperience';
import { DERIVATIVE_CHAIN } from './concepts/derivative/chain';
import { DerivativeScene } from './concepts/derivative/DerivativeScene';
import { LIMITS_CHAIN } from './concepts/limits/chain';
import { LimitsScene } from './concepts/limits/LimitsScene';
import { UNIT_CIRCLE_CHAIN } from './concepts/unit-circle/chain';
import { UnitCircleScene } from './concepts/unit-circle/UnitCircleScene';
import { Home, BackLink, type ConceptCard } from './ui/Home';

// 每条链一个 store,模块级创建一次。切页面时不重建,所以来回切不会丢进度。
const CHAINS = [
  { chain: SHELL_METHOD_CHAIN, store: createChainStore(SHELL_METHOD_CHAIN), Scene: ShellScene },
  { chain: DISK_METHOD_CHAIN, store: createChainStore(DISK_METHOD_CHAIN), Scene: DiskScene },
  { chain: DERIVATIVE_CHAIN, store: createChainStore(DERIVATIVE_CHAIN), Scene: DerivativeScene },
  { chain: LIMITS_CHAIN, store: createChainStore(LIMITS_CHAIN), Scene: LimitsScene },
  { chain: UNIT_CIRCLE_CHAIN, store: createChainStore(UNIT_CIRCLE_CHAIN), Scene: UnitCircleScene },
] as const;

// 顺序 = 依赖顺序,不是完成顺序。Riemann 是 Shell 的前置知识
// (Shell 第 6–7 步的 Σ→∫ 直接建立在它上面),所以它排第一。
const CARDS: ConceptCard[] = [
  {
    id: 'riemann-sum',
    title: 'Riemann Sums → the Integral',
    question: 'Why does adding up rectangles turn into an integral sign?',
    steps: RIEMANN_SUM_CHAIN.stages.length,
    ready: true,
  },
  {
    id: 'shell-method',
    title: 'The Shell Method',
    question: 'Why is there a 2πx in the integral? Where does that come from?',
    steps: SHELL_METHOD_CHAIN.stages.length,
    ready: true,
  },
  {
    id: 'disk-method',
    title: 'The Disk Method',
    question: 'How am I supposed to know which method to use?',
    steps: DISK_METHOD_CHAIN.stages.length,
    ready: true,
  },
  {
    id: 'derivative',
    title: 'Secant → Tangent',
    question: 'What does it actually mean for two points to “become” one?',
    steps: DERIVATIVE_CHAIN.stages.length,
    ready: true,
  },
  {
    id: 'limits',
    title: 'Left and Right Limits',
    question: 'If the function has no value there, what is the limit even describing?',
    steps: LIMITS_CHAIN.stages.length,
    ready: true,
  },
  {
    id: 'unit-circle',
    title: 'The Unit Circle and sin / cos',
    question: 'Why does going around a circle produce a wave?',
    steps: UNIT_CIRCLE_CHAIN.stages.length,
    ready: true,
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
  if (route === 'riemann-sum') {
    return (
      <div className="relative">
        <BackLink />
        <RiemannExperience />
      </div>
    );
  }
  const active = CHAINS.find((c) => c.chain.id === route);

  if (!active) return <Home concepts={CARDS} />;

  return (
    <div className="relative">
      <BackLink />
      <ChainPlayer key={active.chain.id} useChain={active.store} renderScene={active.Scene} />
    </div>
  );
}
