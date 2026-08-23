/**
 * 路由入口。default export 供 `App.tsx` 里的 `lazy()` 使用。
 * 这一节不走 `src/engine/`,所以没有 store,也不需要 `LessonPage` 的那套装配。
 */
import { BackLink } from '../../ui/Home';
import { IncreasingLab } from './IncreasingLab';

export default function IncreasingPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <IncreasingLab />
    </div>
  );
}
