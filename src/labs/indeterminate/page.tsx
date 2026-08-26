/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { IndeterminateLab } from './IndeterminateLab';

export default function IndeterminatePage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <IndeterminateLab />
    </div>
  );
}
