import { ChainPlayer } from './engine/ChainPlayer';
import { createChainStore } from './engine/store';
import { SHELL_METHOD_CHAIN } from './concepts/shell-method/chain';
import { PlaceholderScene } from './concepts/shell-method/PlaceholderScene';

// 一条链一个 store。Phase 7 有多条链时,这里会换成按路由创建。
const useShellChain = createChainStore(SHELL_METHOD_CHAIN);

export default function App() {
  return <ChainPlayer useChain={useShellChain} renderScene={PlaceholderScene} />;
}
