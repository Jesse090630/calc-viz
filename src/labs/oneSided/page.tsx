/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { OneSidedLab } from './OneSidedLab';

export default function OneSidedPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <OneSidedLab />
    </div>
  );
}
