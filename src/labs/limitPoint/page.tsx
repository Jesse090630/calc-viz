/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { PointLab } from './PointLab';

export default function LimitPointPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <PointLab />
    </div>
  );
}
