/**
 * 路由入口。default export 供 `App.tsx` 里的 `lazy()` 使用。
 * 和 increasing 一样,这一节不走 `src/engine/`。
 */
import { BackLink } from '../../ui/Home';
import { SymmetryLab } from './SymmetryLab';

export default function SymmetryPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <SymmetryLab />
    </div>
  );
}
