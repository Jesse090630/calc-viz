/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { TrapLab } from './TrapLab';

export default function EpsilonDeltaPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <TrapLab />
    </div>
  );
}
