/**
 * Phase 0 / Phase 1 自检页。
 *
 * 这一页存在的目的不是"好看",而是让你打开浏览器就能一眼确认三件事:
 *   1. 构建链路通(Vite + React + Tailwind + KaTeX 都活着)
 *   2. src/math/ 的纯函数真的被调用了,数字是算出来的不是写死的
 *   3. 收敛表与方案里独立验算过的表一致
 * Phase 2 开始,这一页会被 ChainPlayer 取代。
 */
import katex from 'katex';
import { PARABOLA_DOWN } from './math/curves';
import { shellVolumeExact, shellVolumeNumeric, shellRiemann } from './math/solids';
import { relativeError } from './math/riemann';

const CURVE = PARABOLA_DOWN;
const EXACT = shellVolumeExact(CURVE);
const NUMERIC = shellVolumeNumeric(CURVE);
const NS = [1, 2, 4, 8, 16, 32, 64, 128];

function Tex({ src }: { src: string }) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(src, { throwOnError: false }),
      }}
    />
  );
}

export default function App() {
  const crossCheckOk = Math.abs(EXACT - NUMERIC) < 1e-9;

  return (
    <main className="mx-auto max-w-3xl px-6 py-14">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Calculus Visual Engine</p>
      <h1 className="mt-2 text-3xl font-bold">Phase 1 — math core self-check</h1>
      <p className="mt-3 leading-relaxed text-slate-300">
        Every number below is computed at runtime by the pure functions in{' '}
        <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm">src/math/</code>. Nothing here
        is hard-coded. If this page renders and the numbers match the plan, Phase 0 and Phase 1 are
        both done.
      </p>

      <section className="mt-10 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h2 className="text-sm uppercase tracking-widest text-slate-400">Shell Method · exact</h2>
        <div className="mt-4 text-lg">
          <Tex src="V = 2\pi\int_0^2 x\left(4-x^2\right)dx = 8\pi" />
        </div>
        <dl className="mt-5 space-y-1.5 text-sm tabular-nums">
          <div className="flex justify-between">
            <dt className="text-slate-400">closed form (curve.xF)</dt>
            <dd>{EXACT.toFixed(12)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">adaptive Simpson (independent path)</dt>
            <dd>{NUMERIC.toFixed(12)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-400">cross-check</dt>
            <dd className={crossCheckOk ? 'text-emerald-400' : 'text-red-400'}>
              {crossCheckOk ? 'agree ✓' : 'MISMATCH ✗'}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h2 className="text-sm uppercase tracking-widest text-slate-400">
          Midpoint Riemann convergence
        </h2>
        <table className="mt-4 w-full text-sm tabular-nums">
          <thead className="text-slate-400">
            <tr className="border-b border-slate-700">
              <th className="py-2 text-left font-medium">n</th>
              <th className="py-2 text-right font-medium">sum</th>
              <th className="py-2 text-right font-medium">error</th>
              <th className="py-2 text-right font-medium">relative</th>
            </tr>
          </thead>
          <tbody>
            {NS.map((n) => {
              const v = shellRiemann(CURVE, n, 'mid');
              return (
                <tr key={n} className="border-b border-slate-800/70">
                  <td className="py-1.5">{n}</td>
                  <td className="py-1.5 text-right">{v.toFixed(6)}</td>
                  <td className="py-1.5 text-right text-slate-400">{(v - EXACT).toFixed(6)}</td>
                  <td className="py-1.5 text-right">{relativeError(v, EXACT).toFixed(4)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          The error drops to roughly a quarter every time n doubles — the midpoint rule is second
          order. That fact becomes a teaching point in stage 7 of the chain.
        </p>
      </section>

      <p className="mt-10 text-sm text-slate-500">
        Next: Phase 2 — the chain engine (Stage / Chain types, store, player shell, formula panel).
      </p>
    </main>
  );
}
