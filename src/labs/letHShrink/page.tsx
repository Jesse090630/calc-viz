/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { ShrinkLab } from './ShrinkLab';

export default function LetHShrinkPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <ShrinkLab />
    </div>
  );
}
