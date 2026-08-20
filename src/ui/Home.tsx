/**
 * UI — 概念目录
 *
 * 首页先给一个能拖动的“证据”,再按依赖关系陈列静态分镜。学生先看见网站在做什么,
 * 才需要决定从哪条链开始；缩略图不播放,避免七个场景同时争夺注意力。
 */
import { useState } from 'react';
import { RIEMANN_SUM_CHAIN } from '../concepts/riemann-sum/chain';
import { RiemannScene } from '../concepts/riemann-sum/RiemannScene';
import { makeVisible } from '../engine/store';
import { PARABOLA_DOWN } from '../math/curves';
import { definiteIntegralExact, riemannSum } from '../math/riemann';

export type ConceptTrack = 'Foundations' | 'Integration' | '3D Volume' | 'Trigonometry';

export interface ConceptCard {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly steps: number;
  readonly ready: boolean;
  readonly track: ConceptTrack;
}

const TRACKS: readonly { id: ConceptTrack; note: string }[] = [
  { id: 'Foundations', note: 'Approach first, then measure change.' },
  { id: 'Integration', note: 'Trap an area until only one value can remain.' },
  { id: '3D Volume', note: 'Build solids from pieces you can actually measure.' },
  { id: 'Trigonometry', note: 'Carry motion from the circle into functions.' },
];

const THUMBNAILS: Readonly<Record<string, { src: string; alt: string }>> = {
  limits: {
    src: new URL('../../tests/e2e/screenshots/limits-05-not-the-value.png', import.meta.url).href,
    alt: 'A curve approaching a hole while the function value is marked separately.',
  },
  derivative: {
    src: new URL('../../tests/e2e/screenshots/derivative-07-tangent.png', import.meta.url).href,
    alt: 'A tangent line touching a parabola at one highlighted point.',
  },
  'riemann-sum': {
    src: new URL('../../tests/e2e/screenshots/riemann-sum-05-squeezed.png', import.meta.url).href,
    alt: 'Upper and lower rectangle sums squeezing the area under a curve.',
  },
  'shell-method': {
    src: new URL('../../tests/e2e/screenshots/shell-method-05-unroll.png', import.meta.url).href,
    alt: 'A cylindrical shell unrolled into a measurable rectangular sheet.',
  },
  'disk-method': {
    src: new URL('../../tests/e2e/screenshots/disk-method-05-stack.png', import.meta.url).href,
    alt: 'Thin circular disks stacked to form a three-dimensional solid.',
  },
  'unit-circle': {
    src: new URL('../../tests/e2e/screenshots/unit-circle-05-trace.png', import.meta.url).href,
    alt: 'A point on the unit circle carrying its height into a sine wave.',
  },
  'trig-rates': {
    src: new URL('../../tests/e2e/screenshots/trig-rates-05-tangent-vector.png', import.meta.url).href,
    alt: 'A radius and its perpendicular tangent vector on the unit circle.',
  },
};

const HERO_STAGE = (() => {
  const stage = RIEMANN_SUM_CHAIN.stages[4];
  if (!stage) throw new Error('Riemann hero stage is missing');
  return stage;
})();

const HERO_VISIBLE = makeVisible(HERO_STAGE.show);
const HERO_INTERVAL = PARABOLA_DOWN.domain;
const HERO_EXACT = definiteIntegralExact(PARABOLA_DOWN, HERO_INTERVAL);

function RiemannHero() {
  const [n, setN] = useState(4);
  const lower = riemannSum(PARABOLA_DOWN.f, HERO_INTERVAL, n, 'right');
  const upper = riemannSum(PARABOLA_DOWN.f, HERO_INTERVAL, n, 'left');

  return (
    <section
      data-home-hero
      aria-labelledby="home-hero-title"
      className="overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-950 shadow-2xl shadow-black/25"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        <span>Live derivation · Riemann step 5 of 8</span>
        <span className="text-amber-300">One slider · no autoplay</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)]">
        <div className="relative h-[17rem] min-w-0 border-b border-slate-700 lg:h-[27rem] lg:border-b-0 lg:border-r">
          <RiemannScene
            stage={HERO_STAGE}
            params={{ ...RIEMANN_SUM_CHAIN.defaultParams, ...HERO_STAGE.params, n }}
            visible={HERO_VISIBLE}
          />
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-full border border-slate-700 bg-slate-950/85 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300 backdrop-blur">
            same curve · thinner rectangles
          </div>
        </div>

        <div className="flex flex-col justify-center px-5 py-6 sm:px-7 lg:py-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Try the idea</p>
          <h1 id="home-hero-title" className="mt-2 text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl">
            Drag the picture. Watch the formula tighten.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            The blue and amber rectangles trap the same curved area. Increase their count and the
            two estimates close around one unavoidable number.
          </p>

          <div aria-live="polite" className="mt-5 grid gap-1.5 rounded-xl border border-slate-700 bg-slate-900/70 p-3 font-mono text-xs tabular-nums">
            <div className="flex justify-between gap-4 text-cyan-300"><span>lower Rₙ</span><strong>{lower.toFixed(6)}</strong></div>
            <div className="flex justify-between gap-4 text-green-400"><span>true area</span><strong>{HERO_EXACT.toFixed(6)}</strong></div>
            <div className="flex justify-between gap-4 text-amber-300"><span>upper Lₙ</span><strong>{upper.toFixed(6)}</strong></div>
          </div>

          <label htmlFor="home-riemann-n" className="mt-5 flex justify-between text-xs text-slate-300">
            <span>number of rectangles  n</span>
            <strong className="tabular-nums text-white">{n}</strong>
          </label>
          <input
            id="home-riemann-n"
            aria-label="Hero number of rectangles n"
            type="range"
            min="4"
            max="32"
            step="4"
            value={n}
            onChange={(event) => setN(Number(event.target.value))}
            className="mt-2 w-full cursor-pointer accent-amber-500"
          />

          <a href="#/riemann-sum" className="mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 hover:border-amber-300 hover:bg-amber-400/20">
            Open the full 8-step derivation <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

function ConceptLink({ concept }: { concept: ConceptCard }) {
  const thumbnail = THUMBNAILS[concept.id];
  if (!thumbnail) throw new Error(`Missing home thumbnail for ${concept.id}`);

  return concept.ready ? (
    <a
      data-concept-card={concept.id}
      href={`#/${concept.id}`}
      className="group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60 transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900 hover:shadow-xl hover:shadow-black/20"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-slate-700 bg-slate-950">
        <img
          src={thumbnail.src}
          alt={thumbnail.alt}
          loading="lazy"
          className="h-full w-full object-cover object-left transition duration-300 group-hover:scale-[1.02]"
        />
        <span className="absolute bottom-2 left-2 rounded-full border border-slate-600 bg-slate-950/85 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-300 backdrop-blur">
          {concept.steps} steps
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="text-lg font-semibold group-hover:text-amber-400">{concept.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-400">“{concept.question}”</p>
      </div>
    </a>
  ) : (
    <div data-concept-card={concept.id} className="rounded-2xl border border-dashed border-slate-800 p-5 opacity-45">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-lg font-semibold">{concept.title}</h3>
        <span className="shrink-0 text-xs text-slate-500">soon</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">“{concept.question}”</p>
    </div>
  );
}

export function Home({ concepts }: { concepts: readonly ConceptCard[] }) {
  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 lg:px-8">
      <RiemannHero />

      <header className="mb-8 mt-16 max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Choose a path</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">See each formula happen, one dependency at a time.</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          These are derivations, not answer buttons. Start with the question that feels unresolved;
          each card opens the exact visual step where the idea becomes visible.
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-x-8 lg:gap-y-12">
        {TRACKS.map((track) => {
          const cards = concepts.filter((concept) => concept.track === track.id);
          const trackId = `track-${track.id.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <section key={track.id} aria-labelledby={trackId}>
              <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-700 pb-3">
                <div>
                  <h2 id={trackId} className="text-sm font-bold uppercase tracking-[0.14em] text-slate-100">
                    {track.id}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">{track.note}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-slate-500">{cards.length} {cards.length === 1 ? 'chain' : 'chains'}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {cards.map((concept) => <ConceptLink key={concept.id} concept={concept} />)}
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-16 border-t border-slate-800 pt-6 text-sm text-slate-500">
        Every number on this site is computed at runtime from pure functions that are unit-tested
        against a second, independent derivation. Nothing is hard-coded.
      </p>
    </main>
  );
}

/** 链页面顶部的返回链接 */
export function BackLink() {
  return (
    <a
      href="#/"
      className="absolute left-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur hover:text-white"
    >
      ← all topics
    </a>
  );
}
