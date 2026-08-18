import katex from 'katex';
import { useEffect, useMemo, useRef, useState } from 'react';
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

export function FormulaDeck() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | FormulaCategory>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const sections = useMemo(() => searchFormulaSections(query, category), [query, category]);
  const resultCount = sections.reduce((total, section) => total + section.entries.length, 0);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Open formula deck"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed right-4 top-4 z-30 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-amber-100 shadow-lg shadow-black/25 backdrop-blur transition hover:border-amber-300 hover:bg-slate-900"
      >
        <span aria-hidden="true" className="text-base leading-none">∫</span>
        <span className="hidden sm:inline">Formula deck</span>
        <span aria-hidden="true" className="text-slate-500">⚙</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" data-formula-deck>
          <button
            type="button"
            aria-label="Close formula deck"
            className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <section
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
                  onClick={() => setOpen(false)}
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
              <nav aria-label="Formula categories" className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
                                onClick={() => setOpen(false)}
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
        </div>
      )}
    </>
  );
}
