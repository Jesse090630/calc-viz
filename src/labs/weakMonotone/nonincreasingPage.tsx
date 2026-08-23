/** 路由入口:非递增。和 `nondecreasingPage` 共用同一个实验台,只差方向。 */
import { BackLink } from '../../ui/Home';
import { WeakMonotoneLab } from './WeakMonotoneLab';

export default function NonincreasingPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <WeakMonotoneLab direction="nonincreasing" />
    </div>
  );
}
