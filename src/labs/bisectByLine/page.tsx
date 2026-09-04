/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { BisectByLineLab } from './BisectByLineLab';

export default function Page() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <BisectByLineLab />
    </div>
  );
}
