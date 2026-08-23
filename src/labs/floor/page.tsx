/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { FloorLab } from './FloorLab';

export default function FloorPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <FloorLab />
    </div>
  );
}
