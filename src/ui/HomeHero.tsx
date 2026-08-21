/**
 * 首页 hero —— 唯一一处在首页就渲染 3D 的地方。
 *
 * ⚠️ 它被单独拆成一个模块,是因为 `RiemannScene` 会把整个 Three.js 拉进来。
 * 以前它直接写在 Home.tsx 里,于是**任何人打开首页都要先下载完整 3D 引擎**,
 * 哪怕他只想看看有哪些课。现在 Home 用 React.lazy 加载它:
 * 页面骨架、卡片、文字先出来,3D 随后补上。
 *
 * 这也是 W6 里体积下降最大的一刀。
 */
import { useState } from 'react';
import { RIEMANN_SUM_CHAIN } from '../concepts/riemann-sum/chain';
import { RiemannScene } from '../concepts/riemann-sum/RiemannScene';
import { makeVisible } from '../engine/store';
import { PARABOLA_DOWN } from '../math/curves';
import { definiteIntegralExact, riemannSum } from '../math/riemann';

const HERO_STAGE = (() => {
  const stage = RIEMANN_SUM_CHAIN.stages[4];
  if (!stage) throw new Error('Riemann hero stage is missing');
  return stage;
})();

const HERO_VISIBLE = makeVisible(HERO_STAGE.show);
const HERO_INTERVAL = PARABOLA_DOWN.domain;
const HERO_EXACT = definiteIntegralExact(PARABOLA_DOWN, HERO_INTERVAL);

export default function RiemannHero() {
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
