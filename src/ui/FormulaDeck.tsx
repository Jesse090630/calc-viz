/**
 * Formula Deck 弹窗。
 *
 * ⚠️ 它**只是弹窗**,触发按钮在 App 里。以前按钮和弹窗打包在一起,
 * 于是这个组件在每个页面都被渲染,它 import 的 KaTeX(gzip 75 kB)
 * 也就在首页被无条件下载 —— 哪怕用户从没点开过参考板。
 * 现在与 NotationBoard 形态一致:受控的 open/onClose/returnFocusRef,
 * App 只在 open 为真时才 lazy 挂载它。
 */
import katex from 'katex';
import { useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useModalAccessibility } from '../accessibility/useModalAccessibility';
import {
  FORMULA_CATEGORIES,
  searchFormulaSections,
  type FormulaCategory,
} from '../math/formulaCatalog';

function Tex({ src }: { src: string }) {
  const html = useMemo(
    () => katex.renderToString(src, { throwOnError: false, displayMode: false }),
    [src],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function FormulaDeck({
  open,
  onClose,
  returnFocusRef,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | FormulaCategory>('all');
  const dialogRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sections = useMemo(() => searchFormulaSections(query, category), [query, category]);
  const resultCount = sections.reduce((total, section) => total + section.entries.length, 0);
  const close = onClose;

  useModalAccessibility({
    open,
    dialogRef,
    initialFocusRef: searchRef,
    returnFocusRef,
    onClose: close,
  });

  return (
    <>

      {open && createPortal(
        <div className="fixed inset-0 z-50" data-formula-deck>
          <div
            aria-hidden="true"
            className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm"
            onClick={close}
          />
          <section
            ref={dialogRef}
            id="formula-deck-dialog"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="formula-deck-title"
            className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col border-l border-slate-700 bg-[#0c1326] shadow-2xl shadow-black/50"
          >
            <header className="border-b border-slate-700 bg-slate-950/55 px-4 pb-3 pt-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-400">Jesse’s AP Calculus cards</p>
                  <h1 id="formula-deck-title" className="mt-1 text-2xl font-bold tracking-tight">Formula deck</h1>
                  <p className="mt-1 text-xs text-slate-400">All five pages, searchable · amber tags open the “why”.</p>
                </div>
                <button
                  type="button"
                  aria-label="Close formula deck"
                  onClick={close}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <label className="mt-4 block">
                <span className="sr-only">Search formulas</span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search sin, product rule, area…"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-400"
                />
              </label>
              <div className="relative mt-3">
                <nav aria-label="Formula categories" className="flex gap-2 overflow-x-auto pb-1 pr-9">
                  {FORMULA_CATEGORIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={category === item.id}
                      onClick={() => setCategory(item.id)}
                      className={
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs transition ' +
                        (category === item.id
                          ? 'border-amber-400 bg-amber-400/15 text-amber-100'
                          : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white')
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
                <div
                  aria-hidden="true"
                  data-category-scroll-hint
                  className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-slate-950 via-slate-950/85 to-transparent"
                >
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs text-amber-300">→</span>
                </div>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <p role="status" className="mb-4 text-xs text-slate-500">{resultCount} cards</p>
              {sections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center text-sm text-slate-400">
                  No matching formula — try a shorter word or another category.
                </div>
              ) : (
                <div className="space-y-7">
                  {sections.map((section) => (
                    <section key={section.id}>
                      <div className="mb-2 flex items-center gap-3">
                        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-300">{section.title}</h2>
                        <div className="h-px flex-1 bg-slate-800" />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {section.entries.map((item) => (
                          <article key={item.id} className="group relative overflow-hidden rounded-xl border border-slate-700/80 bg-slate-900/70 p-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-xs font-semibold text-slate-300">{item.title}</h3>
                              <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">p.{item.sourcePage}</span>
                            </div>
                            <div className="mt-2 space-y-1.5 overflow-x-auto text-[14px] leading-relaxed text-slate-100">
                              {item.tex.map((line, index) => <div key={index}><Tex src={line} /></div>)}
                            </div>
                            {item.note && <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.note}</p>}
                            {item.deriveRoute && (
                              <a
                                href={`#/${item.deriveRoute}`}
                                onClick={close}
                                className="mt-3 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300 hover:border-amber-300 hover:bg-amber-400/20"
                              >
                                Why? · watch the derivation →
                              </a>
                            )}
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
