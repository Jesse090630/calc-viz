/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { TaylorLab } from './TaylorLab';

export default function Page() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <TaylorLab />
    </div>
  );
}
