/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { SqueezeLab } from './SqueezeLab';

export default function SqueezePage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <SqueezeLab />
    </div>
  );
}
