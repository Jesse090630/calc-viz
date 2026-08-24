/** 路由入口。和其他实验台一样,不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { ScanLab } from './ScanLab';

export default function ScanningPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <ScanLab />
    </div>
  );
}
