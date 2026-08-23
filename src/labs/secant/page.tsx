/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { SecantLab } from './SecantLab';

export default function SecantPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <SecantLab />
    </div>
  );
}
