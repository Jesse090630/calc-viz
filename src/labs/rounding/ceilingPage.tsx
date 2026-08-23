/** `#/ceiling` —— 上取整。与 `floorPage` 共用同一个实验台组件,只差默认方向。 */
import { BackLink } from '../../ui/Home';
import { RoundingLab } from './RoundingLab';

export default function CeilingPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <RoundingLab initial="ceiling" />
    </div>
  );
}
