/**
 * LAB — 「Special Limit Explorer」(Which One Do You Recognize?)
 *
 * ⚠️⚠️ 提示词点名:**不要做成闪卡**。
 * 所以这里没有「翻面看答案」。有的是一条动作链:
 *   认模板 → 定 u → 看分母差了什么 → 修 → 读答案。
 * 答案在最后,而且是**算出来**的一行,不是背面印着的一个数。
 *
 * ⚠️ 选错模板时用红色是恰当的:那确实是一个**不成立**的匹配。
 * 但页面不会因此拦住人 —— 它给出「为什么不是这条」,然后让人接着选。
 *
 * ⚠️ 参考卡在这一页的**最底下**,而且默认收起(见 `ReferenceCard.tsx`)。
 */
import { useCallback, useMemo, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { ReferenceCard } from './ReferenceCard';
import {
  ASK_INSTEAD,
  PROBLEM_IDS,
  answerByLadder,
  answerTex,
  answerValue,
  needOf,
  problemOf,
  repairSteps,
  rowsFor,
  showValue,
  showX,
} from '../../math/patternMatch';
import { FORM_IDS, formOf, type FormId } from '../../math/specialForms';

type Guess = { readonly picked: FormId; readonly right: boolean } | null;

export function ExplorerLab() {
  const [problemId, setProblemId] = useState(PROBLEM_IDS[0]!);
  const [guess, setGuess] = useState<Guess>(null);
  const [revealed, setRevealed] = useState(0);

  const problem = problemOf(problemId);
  const need = needOf(problemId);
  const steps = useMemo(() => repairSteps(problemId), [problemId]);
  const matched = guess?.right === true;

  const choose = useCallback(
    (id: string) => {
      setProblemId(id);
      setGuess(null);
      setRevealed(0);
    },
    [],
  );

  const pick = useCallback(
    (picked: FormId) => {
      setGuess({ picked, right: picked === problem.template });
      if (picked === problem.template) setRevealed(1);
    },
    [problem.template],
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Special limits
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Special Limit Explorer
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Which one do you recognise? Transform it into a limit you already know.
        </p>
      </header>

      {/* 题目选择 */}
      <div data-panel="problems" className="mt-7 flex flex-wrap gap-2">
        {PROBLEM_IDS.map((id) => (
          <button
            key={id}
            type="button"
            data-problem={id}
            data-current={id === problemId ? 'yes' : 'no'}
            onClick={() => choose(id)}
            className={
              'rounded-lg border px-2.5 py-1.5 text-xs transition ' +
              (id === problemId
                ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-slate-100')
            }
          >
            <Tex src={problemOf(id).tex.replace('\\lim_{x \\to 0} ', '')} />
          </button>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.1fr_1fr]">
          {/* 左:题面 + 认模板 + 修分母 */}
          <div className="flex min-w-0 flex-col gap-4">
            <section
              data-panel="problem"
              data-template={problem.template}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                ① The problem
              </p>
              <p className="mt-2.5 text-xl text-slate-100">
                <Tex src={problem.tex} display />
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{problem.note}</p>
            </section>

            <section
              data-panel="match"
              data-state={guess === null ? 'unanswered' : guess.right ? 'right' : 'wrong'}
              data-picked={guess?.picked ?? ''}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                ② Which template is this?
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {FORM_IDS.map((id) => (
                  <TemplateChip
                    key={id}
                    id={id}
                    state={
                      guess === null
                        ? 'idle'
                        : id === problem.template && guess.right
                          ? 'right'
                          : id === guess.picked
                            ? 'wrong'
                            : 'idle'
                    }
                    onPick={() => pick(id)}
                  />
                ))}
              </div>
              {guess !== null && !guess.right && (
                // ⚠️ 红色用在这里是恰当的:这个匹配**确实不成立**。
                //    但话说的是「为什么不是」,不是「你错了」。
                <p data-readout="why-not" className="mt-3 text-xs leading-relaxed" style={{ color: LAB.fail }}>
                  The numerator here is <Tex src={problem.tex.replace(/^\\lim_\{x \\to 0\} \\frac\{(.*?)\}\{.*\}$/, '$1')} />
                  {' '}— that is not the shape of <Tex src={formOf(guess.picked).templateTex} />. Look at what is on top.
                </p>
              )}
              {matched && (
                <p data-readout="matched" className="mt-3 text-xs leading-relaxed" style={{ color: LAB.pass }}>
                  Yes. Set <Tex src={`u = ${problem.uTex}`} /> and the numerator is exactly the template&rsquo;s.
                </p>
              )}
            </section>

            {matched && (
              <section data-panel="need" data-matched={need.matched ? 'yes' : 'no'} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  ③ Repair the denominator
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">currently have</p>
                    <p className="mt-1 text-sm" style={{ color: LAB.x1 }}><Tex src={need.have} /></p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">template needs</p>
                    <p className="mt-1 text-sm" style={{ color: LAB.x2 }}><Tex src={need.want} /></p>
                  </div>
                </div>
                <p data-readout="fix" className="mt-2.5 text-xs leading-relaxed text-slate-400">{need.fix}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-100">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500">target</span>
                  <span style={{ color: LAB.x2 }}><Tex src={problem.templateInstanceTex} /></span>
                  <span className="text-slate-600">→</span>
                  <span style={{ color: LAB.pass }}><Tex src={String(formOf(problem.template).limitDisplay)} /></span>
                </div>
              </section>
            )}
          </div>

          {/* 右:变形步骤 + 数值验证 + 答案 */}
          <div className="flex min-w-0 flex-col gap-4">
            <section
              data-panel="steps"
              data-revealed={String(revealed)}
              data-total={String(steps.length)}
              className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                ④ Morph it into the template
              </p>
              {revealed === 0 ? (
                <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
                  Pick the template first. The transformation only makes sense once you know what you are
                  aiming at.
                </p>
              ) : (
                <>
                  <div className="mt-2.5 space-y-2.5">
                    {steps.slice(0, revealed).map((step, i) => (
                      <div key={step.tex} data-step={String(i + 1)}>
                        <p className="text-sm text-slate-100"><Tex src={step.tex} /></p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{step.note}</p>
                      </div>
                    ))}
                  </div>
                  {revealed < steps.length && (
                    <button
                      type="button"
                      data-action="next-step"
                      onClick={() => setRevealed((n) => n + 1)}
                      className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
                    >
                      Then what? →
                    </button>
                  )}
                </>
              )}
            </section>

            <section data-panel="numbers" className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Check it numerically
              </p>
              <div className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px]">
                <span className="text-slate-500">x</span>
                <span className="text-right text-slate-500">value</span>
                {rowsFor(problemId).map((row) => (
                  <NumberRow key={row.x} x={row.x} value={row.value} />
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                Confirms the algebra. It does not replace it — sampling never proves a limit.
              </p>
            </section>

            {revealed >= steps.length && (
              <section
                data-panel="answer"
                data-value={String(answerValue(problemId))}
                data-tex={answerTex(problemId)}
                className="rounded-2xl border p-4"
                style={{ borderColor: `${LAB.pass}59`, background: `${LAB.pass}0f` }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">⑤ The answer</p>
                <p className="mt-2 text-2xl text-slate-100">
                  <Tex src={`${problem.tex} = ${answerTex(problemId)}`} display />
                </p>
                <p data-readout="ladder-check" className="mt-1 font-mono text-[11px] text-slate-500">
                  at x = 10⁻⁶ the expression reads {showValue(answerByLadder(problemId))}
                </p>
              </section>
            )}
          </div>
        </div>
      </section>

      <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed" style={{ color: LAB.x2 }}>
        {ASK_INSTEAD}
      </p>

      <div className="mt-6">
        <ReferenceCard />
      </div>
    </main>
  );
}

function NumberRow({ x, value }: { x: number; value: number | null }) {
  return (
    <>
      <span className="text-slate-400">{showX(x)}</span>
      <span data-number-row={String(x)} className="text-right" style={{ color: LAB.pass }}>
        {showValue(value)}
      </span>
    </>
  );
}

function TemplateChip({
  id,
  state,
  onPick,
}: {
  id: FormId;
  state: 'idle' | 'right' | 'wrong';
  onPick: () => void;
}) {
  const form = formOf(id);
  const border =
    state === 'right' ? `${LAB.pass}` : state === 'wrong' ? `${LAB.fail}` : '#334155';
  const background =
    state === 'right' ? `${LAB.pass}14` : state === 'wrong' ? `${LAB.fail}12` : 'transparent';
  return (
    <button
      type="button"
      data-template-chip={id}
      data-state={state}
      onClick={onPick}
      className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition hover:border-slate-500"
      style={{ borderColor: border, background }}
    >
      <span className="text-sm text-slate-100">
        <Tex src={form.templateTex} />
      </span>
      <span className="font-mono text-[11px] text-slate-500">→ {form.limitDisplay}</span>
    </button>
  );
}
