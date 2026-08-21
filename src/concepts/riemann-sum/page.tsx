/**
 * 路由级懒加载入口。App 只 import() 这个文件,
 * 于是这条链的 chain 数据、Scene、以及它拖着的 Three.js
 * 都只在用户真的进入这一课时才下载。
 *
 * store 在模块级创建:一旦加载过就常驻,来回切链不会丢进度。
 */
import { createChainStore } from '../../engine/store';
import { createReducedMotionChain } from '../../accessibility/reducedMotionChain';
import { LessonPage } from '../../ui/LessonPage';
import { RIEMANN_SUM_CHAIN } from './chain';
import { RiemannScene } from './RiemannScene';

const STORE = createChainStore(createReducedMotionChain(RIEMANN_SUM_CHAIN));

export default function Page() {
  return (
    <LessonPage
      chain={RIEMANN_SUM_CHAIN}
      useChain={STORE}
      renderScene={RiemannScene}
    />
  );
}
