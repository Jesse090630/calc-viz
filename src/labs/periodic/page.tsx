/** 路由入口。和另外两节一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { PeriodicLab } from './PeriodicLab';

export default function PeriodicPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <PeriodicLab />
    </div>
  );
}
