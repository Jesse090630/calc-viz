/**
 * LAB — 分部积分:「乘积法则,挪了个位置」。
 *
 * ⭐⭐ 这一课的论点不是"怎么选 u",是**选错不是错的,是没用的**。
 *   页面把两种选法**并排算完**:两边的等号都成立(数字一样),
 *   但一边剩下 `∫eˣ`(做完了),另一边剩下 `∫(x²/2)eˣ`(更糟了)。
 *   看见这一点,比背一个 LIATE 首字母缩写有用。
 *
 * 禁止 2:这里不出现裸算式,数值全部来自 `src/math/byParts.ts`。
 */
import { useMemo, useState } from 'react';
import {
  CASES,
  DERIVATION_TEX,
  HEADLINE,
  MAIN_IDEA,
  NO_PROGRESS_NOTE,
  RULE_TEX,
  betterChoice,
  byPartsFormula,
  byQuadrature,
  caseOf,
  isProgress,
  originalDegree,
  roundsNeeded,
  show,
  split,
  type ChoiceId,
} from '../../math/byParts';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

/** 一种选法的完整账目。两边并排,好比较。 */
function ChoicePanel({ caseId, choice }: { caseId: string; choice: ChoiceId }) {
  const c = caseOf(caseId);
  const s = split(c, choice);
  const good = isProgress(c, choice);
  const before = originalDegree(c);
  const truth = byQuadrature(c);
  const result = byPartsFormula(c, choice);
  const holds = Math.abs(result - truth) < 1e-6;

  return (
    <section
      data-panel={`choice-${choice}`}
      data-progress={good ? 'yes' : 'no'}
      className="rounded-2xl border p-4"
      style={{
        borderColor: good ? `${LAB.pass}59` : `${LAB.muted}59`,
        background: good ? `${LAB.pass}0d` : 'transparent',
      }}
    >
      {/* ⚠️ 这一行不能整体 uppercase:它会把 KaTeX 里的 x 变成 X、e^x 变成 E^X。
          数学里 x 和 X 是两个不同的符号,大小写不是排版口味,是**写错了**。
          所以只让纯文字的部分大写,公式保持原样。 */}
      <p className="text-[10px] font-bold tracking-[0.18em] text-slate-500">
        <span className="uppercase">take</span>{' '}
        <span className="text-slate-300 normal-case"><Tex src={s.u.tex} /></span>{' '}
        <span className="uppercase">as u</span>
      </p>

      <div className="mt-2 space-y-1 text-sm text-slate-200">
        <p><Tex src={`u = ${s.u.tex}`} /> · <Tex src={`v' = ${s.dv.tex}`} /></p>
      </div>

      <div className="mt-2 space-y-1 font-mono text-xs">
        <p className="text-slate-300">
          boundary [uv] = <span data-readout={`boundary-${choice}`}>{show(s.boundary)}</span>
        </p>
        <p className="text-slate-300">
          − ∫u′v&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; = <span data-readout={`remaining-${choice}`}>{show(-s.remaining)}</span>
        </p>
        <p className="border-t border-slate-700 pt-1" style={{ color: holds ? LAB.pass : LAB.fail }}>
          total = <span data-readout={`total-${choice}`}>{show(result)}</span>
          {holds ? '  ✓ matches' : '  × mismatch'}
        </p>
      </div>

      {/* ⭐ 这一栏才是重点:剩下的积分变简单了还是变难了 */}
      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/50 px-2.5 py-2">
        <p className="font-mono text-[11px] text-slate-400">
          polynomial degree left:{' '}
          <span data-readout={`degree-${choice}`} style={{ color: good ? LAB.pass : LAB.fail }}>
            {before ?? '—'} → {s.remainingDegree ?? '—'}
          </span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed" style={{ color: good ? LAB.pass : LAB.muted }}>
          {good
            ? 'Lower than it started. This one gets you somewhere.'
            : 'Not lower. Legal, but it hands back a harder integral.'}
        </p>
      </div>
    </section>
  );
}

export function ByPartsLab() {
  const [caseId, setCaseId] = useState(CASES[0]!.id);
  const c = caseOf(caseId);
  const truth = useMemo(() => byQuadrature(c), [c]);
  const better = betterChoice(c);
  const rounds = roundsNeeded(c);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Integration
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Integration by Parts
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {CASES.map((k) => (
            <button
              key={k.id} type="button" data-case={k.id}
              data-active={k.id === caseId ? 'yes' : 'no'}
              onClick={() => setCaseId(k.id)}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (k.id === caseId
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              <Tex src={`\\int ${k.integrandTex}`} />
            </button>
          ))}
        </div>
        <p className="ml-auto font-mono text-[11px] text-slate-400">
          true value = <span data-readout="truth" style={{ color: LAB.pass }}>{show(truth)}</span>
        </p>
      </div>

      {/* ① 它是从哪来的 */}
      <section data-panel="derivation" className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          ① It is the product rule, moved
        </p>
        <div className="mt-2 space-y-1.5 text-slate-200">
          {DERIVATION_TEX.map((line, i) => (
            <p key={i} data-step={i} className="text-sm">
              <Tex src={line} />
              <span className="ml-3 font-mono text-[10px] text-slate-500">
                {['product rule', 'integrate both sides', 'move one term across'][i]}
              </span>
            </p>
          ))}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Nothing new is introduced anywhere in those three lines.
        </p>
      </section>

      {/* ②③ 两种选法并排 */}
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        ② Both choices are legal — compare what each leaves behind
      </p>
      <div className="mt-2 grid items-start gap-4 lg:grid-cols-2">
        <ChoicePanel caseId={caseId} choice="first" />
        <ChoicePanel caseId={caseId} choice="second" />
      </div>

      {/* ④ 结论 */}
      <section
        data-panel="verdict" className="mt-4 rounded-2xl border p-4"
        style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">③ So</p>
        <p className="mt-2 text-base text-slate-100"><Tex src={RULE_TEX} /></p>
        <p className="mt-2 text-sm text-slate-300">
          Both columns above hit <span className="font-mono">{show(truth)}</span>. The identity never
          cared which factor you called u.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-400" data-readout="verdict">
          {better === null
            ? 'Neither choice lowers a polynomial degree here — this one works because u′v happens to simplify, not because anything got smaller.'
            : <>Only one of them lowers the polynomial degree, and that is the whole selection rule.
                This integrand needs <span className="text-amber-300" data-readout="rounds">{rounds}</span>{' '}
                round{rounds === 1 ? '' : 's'} to finish.</>}
        </p>
        <p className="mt-2 rounded-lg border border-slate-700 bg-slate-900/50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-400">
          {NO_PROGRESS_NOTE}
        </p>
      </section>
    </main>
  );
}
