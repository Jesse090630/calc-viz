/**
 * KaTeX 包装。与 `engine/FormulaPanel` 里的 `Tex` 同源,但这一节不走引擎,
 * 所以独立一份而不是从引擎里导出 —— 禁止 3 要求引擎不认识具体概念。
 */
import katex from 'katex';
import { useMemo } from 'react';

export function Tex({ src, display = false }: { src: string; display?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(src, { throwOnError: false, displayMode: display }),
    [src, display],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
