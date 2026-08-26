/** 路由入口。五节课共用 `RatioLab`,只差一个 form id。不走 `src/engine/`。 */
import { BackLink } from '../../ui/Home';
import { RatioLab } from './RatioLab';

export default function Page() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <RatioLab id="log-over-x" />
    </div>
  );
}
