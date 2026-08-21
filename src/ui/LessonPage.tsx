/**
 * 一节课的外壳:返回链接、无障碍播报、播放器、末步的 "Recommended next"。
 *
 * 从 App.tsx 搬到这里,是为了让 `src/concepts/<id>/page.tsx` 能各自 import 它
 * 而不必反向依赖 App —— 那会让路由级懒加载失效(App 引 page、page 又引 App,
 * 打包器只能把它们塞回同一个 chunk)。
 */
import { useCallback, useEffect } from 'react';
import { ChainPlayer } from '../engine/ChainPlayer';
import { resolveTex, type ChainStoreHook } from '../engine/store';
import type { Chain, SceneProps } from '../engine/types';
import { recommendedAfter } from '../concepts/registry';
import { usePrefersReducedMotion } from '../accessibility/usePrefersReducedMotion';
import { BackLink } from './Home';

export function LessonPage({
  chain,
  useChain,
  renderScene,
  className = '',
}: {
  chain: Chain;
  useChain: ChainStoreHook;
  renderScene: (props: SceneProps) => React.ReactNode;
  className?: string;
}) {
  const index = useChain((state) => state.index);
  const params = useChain((state) => state.params);
  const resetParams = useChain((state) => state.resetParams);
  const reducedMotion = usePrefersReducedMotion();
  const recommendation = recommendedAfter(chain.id);
  const stage = chain.stages[index];

  useEffect(() => {
    resetParams();
  }, [reducedMotion, resetParams]);

  const accessibleScene = useCallback(
    (props: SceneProps) => (
      <>
        <span
          className="sr-only"
          role="img"
          aria-label={props.stage.altText ?? `${props.stage.title}. ${props.stage.narration}`}
        />
        {renderScene(props)}
      </>
    ),
    [renderScene],
  );

  const formulaAnnouncement = stage?.formula
    ?.map((line) => resolveTex(line.tex, params))
    .join('; ');

  return (
    <div className={`relative ${className}`}>
      <BackLink />
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {stage
          ? `${chain.subtitle}. Step ${stage.label} of ${chain.stages.length}. ${formulaAnnouncement ? `Current formula: ${formulaAnnouncement}` : 'No formula in this step.'}`
          : ''}
      </div>
      <ChainPlayer key={chain.id} useChain={useChain} renderScene={accessibleScene} />
      {index === chain.stages.length - 1 ? (
        <a
          data-recommended-next
          aria-label={`Recommended next: ${recommendation.title}`}
          href={`#/${recommendation.id}`}
          className="recommended-next fixed bottom-0 left-[4.75rem] right-[4.75rem] z-[21] flex h-[4.1875rem] flex-col items-center justify-center border-x border-amber-400/30 bg-slate-950/95 px-2 text-center shadow-xl shadow-black/40 backdrop-blur md:left-auto md:right-[4.75rem] md:w-[230px]"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-amber-400">Recommended next</span>
          <strong className="mt-0.5 text-xs text-slate-100">{recommendation.title} →</strong>
        </a>
      ) : null}
    </div>
  );
}
