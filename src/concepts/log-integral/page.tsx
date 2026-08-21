/**
 * 路由级懒加载入口(W6 之后每条链都是这个形态)。
 */
import { createChainStore } from '../../engine/store';
import { createReducedMotionChain } from '../../accessibility/reducedMotionChain';
import { LessonPage } from '../../ui/LessonPage';
import { LOG_INTEGRAL_CHAIN } from './chain';
import { LogIntegralScene } from './LogIntegralScene';

const STORE = createChainStore(createReducedMotionChain(LOG_INTEGRAL_CHAIN));

export default function Page() {
  return (
    <LessonPage
      chain={LOG_INTEGRAL_CHAIN}
      useChain={STORE}
      renderScene={LogIntegralScene}
    />
  );
}
