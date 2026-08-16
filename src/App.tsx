import { useEffect, useState } from 'react';
import { ChainPlayer } from './engine/ChainPlayer';
import { createChainStore } from './engine/store';
import { SHELL_METHOD_CHAIN } from './concepts/shell-method/chain';
import { ShellScene } from './concepts/shell-method/ShellScene';
import { DISK_METHOD_CHAIN } from './concepts/disk-method/chain';
import { DiskScene } from './concepts/disk-method/DiskScene';
import { Home, BackLink, type ConceptCard } from './ui/Home';

// 每条链一个 store,模块级创建一次。切页面时不重建,所以来回切不会丢进度。
const CHAINS = [
  { chain: SHELL_METHOD_CHAIN, store: createChainStore(SHELL_METHOD_CHAIN), Scene: ShellScene },
  { chain: DISK_METHOD_CHAIN, store: createChainStore(DISK_METHOD_CHAIN), Scene: DiskScene },
] as const;

const CARDS: ConceptCard[] = [
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
    id: 'riemann-sum',
    title: 'Riemann Sums → the Integral',
    question: 'Why does adding up rectangles turn into an integral sign?',
    steps: 0,
    ready: false,
  },
  {
    id: 'derivative',
    title: 'Secant → Tangent',
    question: 'What does it actually mean for two points to “become” one?',
    steps: 0,
    ready: false,
  },
  {
    id: 'unit-circle',
    title: 'The Unit Circle and sin / cos',
    question: 'Why does going around a circle produce a wave?',
    steps: 0,
    ready: false,
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
  const active = CHAINS.find((c) => c.chain.id === route);

  if (!active) return <Home concepts={CARDS} />;

  return (
    <div className="relative">
      <BackLink />
      <ChainPlayer useChain={active.store} renderScene={active.Scene} />
    </div>
  );
}
