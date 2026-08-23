/** 路由入口:非递减。和 `nonincreasingPage` 共用同一个实验台,只差方向。 */
import { BackLink } from '../../ui/Home';
import { WeakMonotoneLab } from './WeakMonotoneLab';

export default function NondecreasingPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <WeakMonotoneLab direction="nondecreasing" />
    </div>
  );
}
