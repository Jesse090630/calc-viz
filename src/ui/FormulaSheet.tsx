/**
 * UI — 整张公式表,按**纸上的页**排。
 *
 * ⚠️ 站里已经有一个 Formula Deck(工具条上的 ∫,搜索用)。这一页不是它的替代品,
 * 两者分工不同,页面上也把这句话说出来:
 *   · Deck  —— **找**某一条:搜索、按类筛、随时从任何一课里拉出来;
 *   · 这一页 —— **通读**或打印:按纸上的顺序铺开,一眼看得到整片地形。
 * 同一份数据(`formulaCatalog.ts`)喂两个视图,所以不可能一处对一处错。
 *
 * ⚠️ PDF 放在 `public/`,链接必须走 `import.meta.env.BASE_URL` ——
 * GitHub Pages 把站点挂在 `/calc-viz/` 子路径下,写死 `/xxx.pdf` 在线上是 404。
 */
import { useMemo, useState } from 'react';
import { FORMULA_SECTIONS, type FormulaEntry, type FormulaSection } from '../math/formulaCatalog';
import { texHtml, warmTexCache } from './texCache';

/** ⚠️ 同 `FormulaDeck` —— 在模块顶层预渲染,别搬进组件。理由见 `texCache.ts`。 */
warmTexCache(FORMULA_SECTIONS.flatMap((section) => section.entries.flatMap((entry) => entry.tex)));

function Tex({ src }: { src: string }) {
  return <span dangerouslySetInnerHTML={{ __html: texHtml(src) }} />;
}

/** 八页表每页的标题 —— 和纸上一致,好对照着翻。 */
const PAGE_TITLES: Readonly<Record<number, string>> = {
  1: 'Derivatives: definition, meaning & summation',
  2: 'Derivative rules, special limits, logs',
  3: 'Theorems, continuity & curve analysis',
  4: 'Indefinite & definite integrals',
  5: 'The definite integral, FTC & applications',
  6: 'Reading the notation',
  7: 'Trigonometry',
  8: 'Series, parametric, polar & differential equations',
};

/** PDF 的地址。⚠️ 必须带 base,否则线上子路径下 404。 */
// ⚠️ 站上已经有这份 PDF(首页那条黄带子用的就是它,md5 一致)——
//    别再放一个同内容的副本进 public/,那是 651KB 的纯重复。
const PDF_HREF = `${import.meta.env.BASE_URL}Jesse'sSecretFormula.pdf`;

function Card({ entry }: { entry: FormulaEntry }) {
  return (
    <article
      data-formula={entry.id}
      className="min-w-0 rounded-xl border border-slate-700/80 bg-slate-900/60 p-3.5 transition hover:border-slate-600"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold text-slate-300">{entry.title}</h3>
        <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">
          p.{entry.sourcePage}
        </span>
      </div>
      <div className="mt-2 space-y-1.5 overflow-x-auto text-[14px] leading-relaxed text-slate-100">
        {entry.tex.map((line, i) => (
          <div key={i}><Tex src={line} /></div>
        ))}
      </div>
      {entry.note && <p className="mt-2 text-xs leading-relaxed text-slate-400">{entry.note}</p>}
      {entry.deriveRoute && (
        <a
          data-derive={entry.deriveRoute}
          href={`#/${entry.deriveRoute}`}
          className="mt-3 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:border-amber-300 hover:bg-amber-400/20"
        >
          Why? · watch the derivation →
        </a>
      )}
    </article>
  );
}

export function FormulaSheet() {
  const [openPage, setOpenPage] = useState<number | 'all'>('all');

  /** 按纸上的页分组。⚠️ 页内保持 `FORMULA_SECTIONS` 的原顺序。 */
  const pages = useMemo(() => {
    const byPage = new Map<number, { section: FormulaSection; entries: FormulaEntry[] }[]>();
    for (const section of FORMULA_SECTIONS) {
      for (const entry of section.entries) {
        const list = byPage.get(entry.sourcePage) ?? [];
        const bucket = list.find((b) => b.section.id === section.id);
        if (bucket) bucket.entries.push(entry);
        else list.push({ section, entries: [entry] });
        byPage.set(entry.sourcePage, list);
      }
    }
    return [...byPage.entries()].sort((a, b) => a[0] - b[0]);
  }, []);

  const total = FORMULA_SECTIONS.reduce((n, s) => n + s.entries.length, 0);
  const shown = openPage === 'all' ? pages : pages.filter(([page]) => page === openPage);

  /**
   * ⚠️ 页码条列的是**纸上真实存在的八页**,不是「恰好有卡片的那几页」。
   * 第一版从数据里推页码,于是 p.6 直接消失了 —— 那一页讲的是**读符号**,
   * 站里由 Type board(∂)承担,一条公式卡都没有。
   * 但标题写着「整张表,按页铺开」,却少一页而且不说一声,那是页面在骗人。
   * 现在 p.6 照样列出来,点进去告诉你它去哪了。
   */
  const pageNumbers = Object.keys(PAGE_TITLES).map(Number).sort((a, b) => a - b);
  const emptyPage = openPage !== 'all' && !pages.some(([page]) => page === openPage);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Reference</p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">Formula Sheet</h1>
        <p className="mt-3 text-base text-slate-400">
          The whole sheet, laid out page by page. <span data-readout="count">{total}</span> formulas.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {/* ⚠️ 下载链接带 base。写死 `/…pdf` 在 GitHub Pages 的子路径下是 404。 */}
        <a
          data-action="download-pdf"
          href={PDF_HREF}
          download="Jesse'sSecretFormula.pdf"
          className="rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20"
        >
          ↓ Download the PDF
        </a>
        <a
          data-action="open-pdf"
          href={PDF_HREF}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-700 px-3 py-1.5 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          Open to print
        </a>
        <p className="text-[11px] leading-relaxed text-slate-600">
          Looking for one specific formula? The <span className="text-amber-300">∫ Formula deck</span> in
          the corner searches all of these from any page.
        </p>
      </div>

      {/* 页码导航 */}
      <nav aria-label="Sheet pages" data-panel="pages" className="mt-5 flex flex-wrap gap-1.5">
        <button
          type="button"
          data-page="all"
          data-active={openPage === 'all' ? 'yes' : 'no'}
          onClick={() => setOpenPage('all')}
          className={
            'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
            (openPage === 'all'
              ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
              : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
          }
        >
          All pages
        </button>
        {pageNumbers.map((page) => (
          <button
            key={page}
            type="button"
            data-page={String(page)}
            data-active={openPage === page ? 'yes' : 'no'}
            onClick={() => setOpenPage(page)}
            className={
              'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
              (openPage === page
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
            }
          >
            p.{page}
          </button>
        ))}
      </nav>

      {emptyPage && (
        <div data-empty-page={String(openPage)} className="mt-6 rounded-2xl border border-dashed border-slate-700 px-6 py-10 text-center">
          <p className="font-mono text-xs font-bold text-amber-400">p.{openPage}</p>
          <h2 className="mt-2 text-lg font-bold text-slate-200">{PAGE_TITLES[openPage as number]}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            This page of the sheet is about reading the symbols, not about formulas to look up — so it
            lives in the <span className="text-cyan-300">∂ Type board</span> instead, where every piece of
            notation is shown next to what it is read aloud as.
          </p>
          <a
            href="#/notation"
            className="mt-4 inline-flex rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/20"
          >
            Open the Type board →
          </a>
        </div>
      )}

      <div className="mt-6 space-y-10">
        {shown.map(([page, buckets]) => (
          <section key={page} data-sheet-page={String(page)}>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="font-mono text-xs font-bold text-amber-400">p.{page}</span>
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">
                {PAGE_TITLES[page] ?? 'More'}
              </h2>
              <div className="h-px flex-1 bg-slate-800" />
            </div>
            <div className="space-y-6">
              {buckets.map(({ section, entries }) => (
                <div key={section.id} data-sheet-section={section.id}>
                  <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {section.title}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {entries.map((entry) => (
                      <Card key={entry.id} entry={entry} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
