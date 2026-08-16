/**
 * ENGINE — 公式面板
 *
 * 产品的核心承诺是"几何动作和符号变化同时发生",所以这个面板必须能:
 *   ① 随参数实时更新数值  ② 高亮正在变化的那一行
 * 高亮用背景 + 左侧色条,不用闪烁 —— 闪烁会抢走用户对图形的注意力。
 */
import katex from 'katex';
import { useMemo } from 'react';
import type { FormulaLine, Params } from './types';
import { resolveTex } from './store';

function Tex({ src }: { src: string }) {
  const html = useMemo(
    () => katex.renderToString(src, { throwOnError: false, displayMode: false }),
    [src],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function FormulaPanel({
  lines,
  params,
}: {
  lines: readonly FormulaLine[];
  params: Params;
}) {
  if (lines.length === 0) return null;

  return (
    <section>
      <h2 className="border-t border-slate-700 pt-3.5 text-[10px] font-normal uppercase tracking-[0.14em] text-slate-400">
        Formula
      </h2>
      <div className="mt-2 flex flex-col gap-1.5">
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              'rounded-lg border-l-[3px] px-2.5 py-1.5 text-[15px] ' +
              (line.highlight
                ? 'border-amber-500 bg-amber-500/15 text-white'
                : 'border-transparent bg-white/[0.03] text-slate-200')
            }
          >
            <Tex src={resolveTex(line.tex, params)} />
          </div>
        ))}
      </div>
    </section>
  );
}
