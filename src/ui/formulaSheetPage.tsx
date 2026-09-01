/** 路由入口。整张公式表按纸上的页排,外加 PDF 下载。 */
import { BackLink } from './Home';
import { FormulaSheet } from './FormulaSheet';

export default function FormulaSheetPage() {
  return (
    <div className="relative min-h-dvh">
      <BackLink />
      <FormulaSheet />
    </div>
  );
}
