/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { WallLab } from './WallLab';

export default function InfiniteLimitsPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <WallLab />
    </div>
  );
}
