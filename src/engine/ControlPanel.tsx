/**
 * ENGINE — 控件面板
 *
 * 完全由 Stage.controls 这份数据生成。加一个可拖参数 = 在链数据里加一行,
 * 不需要写任何 UI 代码 —— 这是"Stage 是数据"这个设计真正省力的地方。
 */
import type { ControlSpec, Params } from './types';

const defaultFormat = (v: number): string => v.toFixed(2);

export function ControlPanel({
  controls,
  params,
  setParam,
}: {
  controls: readonly ControlSpec[];
  params: Params;
  setParam: (key: string, value: number) => void;
}) {
  if (controls.length === 0) return null;

  return (
    <section>
      <h2 className="border-t border-slate-700 pt-3.5 text-[10px] font-normal uppercase tracking-[0.14em] text-slate-400">
        Interact
      </h2>
      <div className="mt-2">
        {controls.map((c) => {
          const value = params[c.param] ?? c.min;
          const fmt = c.format ?? defaultFormat;
          return (
            <div key={c.param} className="mb-3">
              <label
                htmlFor={`ctl-${c.param}`}
                className="mb-1 flex justify-between text-xs text-slate-400"
              >
                <span>{c.label}</span>
                <b className="font-semibold tabular-nums text-slate-100">{fmt(value)}</b>
              </label>
              <input
                id={`ctl-${c.param}`}
                type="range"
                min={c.min}
                max={c.max}
                step={c.step}
                value={value}
                onChange={(e) => setParam(c.param, Number(e.target.value))}
                className="w-full cursor-pointer accent-amber-500"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
