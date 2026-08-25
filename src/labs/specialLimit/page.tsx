/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { SpecialLimitLab } from './SpecialLimitLab';

export default function SpecialLimitPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <SpecialLimitLab />
    </div>
  );
}
