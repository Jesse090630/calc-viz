/** `#/floor` —— 下取整。与 `ceilingPage` 共用同一个实验台组件,只差默认方向。 */
import { BackLink } from '../../ui/Home';
import { RoundingLab } from './RoundingLab';

export default function FloorPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <RoundingLab initial="floor" />
    </div>
  );
}
