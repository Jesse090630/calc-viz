/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { FunctionLab } from './FunctionLab';

export default function FunctionPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <FunctionLab />
    </div>
  );
}
