/**
 * ENGINE — 播放器外壳
 *
 * 只负责:布局、导航(按钮/键盘/进度点)、把当前 stage 交给外部注入的场景渲染器。
 * 它不知道自己在播什么概念 —— renderScene 是 prop,不是 import。
 */
import { useCallback, useEffect, type ReactNode } from 'react';
import type { ChainStoreHook } from './store';
import { makeVisible } from './store';
import type { SceneProps } from './types';
import { FormulaPanel } from './FormulaPanel';
import { ControlPanel } from './ControlPanel';
import { useAutoplay } from './useAutoplay';

export function ChainPlayer({
  useChain,
  renderScene,
}: {
  useChain: ChainStoreHook;
  renderScene: (props: SceneProps) => ReactNode;
}) {
  const chain = useChain((s) => s.chain);
  const index = useChain((s) => s.index);
  const params = useChain((s) => s.params);
  const goto = useChain((s) => s.goto);
  const next = useChain((s) => s.next);
  const prev = useChain((s) => s.prev);
  const setParam = useChain((s) => s.setParam);

  const stage = chain.stages[index];

  useAutoplay(stage?.autoplay, setParam, index);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      // 焦点在滑块上时,左右键属于滑块,别抢
      if (document.activeElement instanceof HTMLInputElement) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    },
    [next, prev],
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  if (!stage) return null;

  return (
    <div className="flex h-dvh w-dvw flex-col md:flex-row">
      {/* 场景区 */}
      <div className="relative min-h-0 min-w-0 flex-1">
        {renderScene({ stage, params, visible: makeVisible(stage.show) })}
      </div>

      {/* 面板区 */}
      <aside className="flex max-h-[52dvh] shrink-0 flex-col overflow-y-auto border-t border-slate-700 bg-slate-900 px-5 pb-4 pt-5 md:max-h-none md:w-[380px] md:border-l md:border-t-0">
        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
          {chain.subtitle} · step {stage.label} of {chain.stages.length}
        </p>
        <h1 className="mt-2 text-xl font-bold leading-tight">{stage.title}</h1>
        <p className="mb-4 mt-2.5 text-sm leading-relaxed text-slate-300 md:min-h-[6.5rem]">
          {stage.narration}
        </p>

        <FormulaPanel lines={stage.formula ?? []} params={params} />
        <ControlPanel controls={stage.controls ?? []} params={params} setParam={setParam} />

        <div className="min-h-2 flex-1" />

        <nav className="flex items-center gap-2.5 border-t border-slate-700 pt-3.5">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            aria-label="Previous step"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 font-semibold hover:bg-slate-700 disabled:opacity-35 disabled:hover:bg-slate-800"
          >
            ←
          </button>
          <div className="flex flex-1 justify-center gap-1.5">
            {chain.stages.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goto(i)}
                aria-label={`Go to step ${s.label}: ${s.title}`}
                aria-current={i === index}
                className={
                  'h-2.5 w-2.5 rounded-full transition ' +
                  (i === index
                    ? 'scale-125 bg-amber-500'
                    : i < index
                      ? 'bg-slate-500'
                      : 'bg-slate-700')
                }
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            disabled={index === chain.stages.length - 1}
            aria-label="Next step"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 font-semibold hover:bg-slate-700 disabled:opacity-35 disabled:hover:bg-slate-800"
          >
            →
          </button>
        </nav>
        <p className="mt-2 text-center text-[11px] text-slate-500">Use ← → arrow keys</p>
      </aside>
    </div>
  );
}
