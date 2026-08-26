/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { ExplorerLab } from './ExplorerLab';

export default function ExplorerPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <ExplorerLab />
    </div>
  );
}
