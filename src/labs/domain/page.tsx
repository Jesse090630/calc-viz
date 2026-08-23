/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { DomainLab } from './DomainLab';

export default function DomainPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <DomainLab />
    </div>
  );
}
