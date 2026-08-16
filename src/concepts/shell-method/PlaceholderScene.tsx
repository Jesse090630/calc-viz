/**
 * 临时占位场景 —— Phase 3(2D SVG)和 Phase 4(3D)会把它整个替换掉。
 *
 * 它现在存在的唯一目的:让整条链在没有任何图形代码的情况下就能点着走一遍,
 * 这样"分镜和讲解文字对不对"可以先被验收,而不是等 3D 写完才发现第 5 步讲不通。
 * 便宜的错误要在便宜的时候犯。
 */
import type { SceneProps } from '../../engine/types';
import { OBJ } from './chain';

const ALL_OBJECTS = Object.values(OBJ);

export function PlaceholderScene({ stage, params, visible }: SceneProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-xl border border-dashed border-slate-600 px-8 py-6 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
          scene placeholder · phase 3–4 replaces this
        </p>
        <p className="mt-3 font-mono text-2xl text-amber-500">{stage.id}</p>
        <p className="mt-1 text-xs text-slate-400">camera: {stage.camera}</p>
      </div>

      <div className="grid w-full max-w-lg grid-cols-2 gap-x-8 gap-y-1 text-xs">
        <div>
          <p className="mb-1.5 uppercase tracking-widest text-slate-500">objects</p>
          {ALL_OBJECTS.map((id) => (
            <p key={id} className={visible(id) ? 'text-emerald-400' : 'text-slate-700'}>
              {visible(id) ? '●' : '○'} {id}
            </p>
          ))}
        </div>
        <div>
          <p className="mb-1.5 uppercase tracking-widest text-slate-500">params</p>
          {Object.entries(params).map(([k, v]) => (
            <p key={k} className="tabular-nums text-slate-300">
              {k} = <span className="text-slate-100">{v.toFixed(3)}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
