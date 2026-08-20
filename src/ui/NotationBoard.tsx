import katex from 'katex';
import { useMemo, useState } from 'react';
import {
  NOTATION_CATEGORIES,
  searchNotationEntries,
  type NotationCategory,
  type NotationEntry,
} from '../data/notation';
import { BackLink } from './Home';

const CATEGORY_ACCENTS: Readonly<Record<NotationCategory, string>> = {
  operators: 'border-cyan-400/45 bg-cyan-400/10 text-cyan-200',
  change: 'border-sky-400/45 bg-sky-400/10 text-sky-200',
  relations: 'border-violet-400/45 bg-violet-400/10 text-violet-200',
  structure: 'border-emerald-400/45 bg-emerald-400/10 text-emerald-200',
  greek: 'border-rose-400/45 bg-rose-400/10 text-rose-200',
};

const CATEGORY_LABELS: Readonly<Record<NotationCategory, string>> = {
  operators: 'Operators',
  change: 'Change & limits',
  relations: 'Relations & logic',
  structure: 'Functions & structure',
  greek: 'Greek alphabet',
};

function Tex({ src, displayMode = false }: { src: string; displayMode?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(src, { throwOnError: false, displayMode }),
    [src, displayMode],
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function NotationCard({ entry }: { entry: NotationEntry }) {
  return (
    <article
      data-notation-card={entry.id}
      className="group relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/70 p-4 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-900 sm:p-5"
    >
      <div aria-hidden="true" className="absolute -right-3 -top-5 select-none text-[5rem] font-black leading-none text-white/[0.025]">
        {entry.name.slice(0, 1)}
      </div>
      <header className="relative flex items-start gap-4">
        <div className={`flex min-h-16 min-w-16 items-center justify-center rounded-2xl border px-3 text-2xl ${CATEGORY_ACCENTS[entry.category]}`}>
          <Tex src={entry.symbol} />
        </div>
        <div className="min-w-0 pt-0.5">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">{CATEGORY_LABELS[entry.category]}</p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-slate-100">{entry.name}</h2>
          <p className="mt-2 inline-flex rounded-full border border-cyan-400/35 bg-cyan-400/10 px-2.5 py-1 text-xs font-semibold text-cyan-200">
            Say it: {entry.say}
          </p>
        </div>
      </header>

      <dl className="relative mt-4 space-y-3 text-sm leading-relaxed">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">It means</dt>
          <dd className="mt-1 text-slate-300">{entry.means}</dd>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-950/50 px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">In context</dt>
          <dd className="mt-1 overflow-x-auto py-0.5 text-[15px] text-slate-100"><Tex src={entry.example} /></dd>
        </div>
        <div className="rounded-xl border-l-2 border-amber-400/75 bg-amber-400/[0.07] px-3 py-2.5">
          <dt className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-300">Common confusion</dt>
          <dd className="mt-1 text-xs leading-relaxed text-slate-300">{entry.confusion}</dd>
        </div>
      </dl>

      {entry.whyLink ? (
        <a
          href={`#/${entry.whyLink}`}
          className="relative mt-4 inline-flex rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300 transition hover:border-amber-300 hover:bg-amber-400/20"
        >
          Why? · watch the derivation →
        </a>
      ) : null}
    </article>
  );
}

export function NotationBoard() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | NotationCategory>('all');
  const entries = useMemo(() => searchNotationEntries(query, category), [query, category]);
  const groups = NOTATION_CATEGORIES.filter((item) => item.id !== 'all')
    .map((item) => ({
      id: item.id,
      label: item.label,
      entries: entries.filter((entry) => entry.category === item.id),
    }))
    .filter((group) => group.entries.length > 0);

  return (
    <main data-notation-board className="min-h-screen bg-[#0b1020] px-4 pb-16 pt-24 text-slate-100 sm:px-6 lg:px-8">
      <BackLink />
      <div className="mx-auto max-w-6xl">
        <header className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-[#0c1326] px-5 py-7 shadow-2xl shadow-black/20 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="absolute -right-5 -top-12 text-[12rem] font-black leading-none text-cyan-300/[0.035]">∫</div>
          <div className="relative max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-300">Calc Type Board</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Learn to read calculus before you calculate it.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Symbols are a language. Hear how each one is said, see what it means in context, and catch the misunderstanding before it follows you into the math.
            </p>
          </div>
        </header>

        <section aria-label="Find a notation card" className="sticky top-16 z-20 mt-6 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-3 shadow-xl shadow-black/25 backdrop-blur sm:p-4">
          <label className="block">
            <span className="sr-only">Search symbols</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ∫, integral, dee ex, stretched S…"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400"
            />
          </label>
          <nav aria-label="Notation categories" className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {NOTATION_CATEGORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={category === item.id}
                onClick={() => setCategory(item.id)}
                className={
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs transition ' +
                  (category === item.id
                    ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                    : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white')
                }
              >
                {item.label}
              </button>
            ))}
          </nav>
        </section>

        <p role="status" className="mb-4 mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {entries.length} symbols · pronunciation first
        </p>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-16 text-center text-sm text-slate-400">
            No matching symbol — try how it sounds, what it looks like, or a shorter word.
          </div>
        ) : (
          <div className="space-y-9">
            {groups.map((group) => (
              <section key={group.id} aria-labelledby={`notation-${group.id}`}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 id={`notation-${group.id}`} className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{group.label}</h2>
                  <div className="h-px flex-1 bg-slate-800" />
                  <span className="text-[10px] text-slate-600">{group.entries.length}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.entries.map((entry) => <NotationCard key={entry.id} entry={entry} />)}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
