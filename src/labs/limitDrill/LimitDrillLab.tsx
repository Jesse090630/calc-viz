/**
 * LAB — 特殊极限练习(不用洛必达)。
 *
 * ⭐⭐ 这一页和站里其他页不一样:它不讲解,它**出题**。
 *   要训练的只有一件事 —— **模式识别**:
 *   「先代入。得到 0/0,就找出哪个式子趋于 0,再看能不能变成一条认识的特殊极限。」
 *
 * ⚠️ 必须挡住的两个坏习惯:
 *   ① 以为 x 一定要趋于 0(等级 3、4 专治);
 *   ② 见 0/0 就套公式(等级 5 里掺了直接代入、纯代数、以及答案是 0 的陷阱题)。
 *
 * ⚠️ 提示分两层:第一层只说**什么东西趋于 0**,不解题;第二层才点名是哪条特殊极限。
 *   一次把话说完,练的就不是识别了。
 *
 * 禁止 2:这里不出现裸算式,题目、答案、解答全部来自 `src/math/limitDrill.ts`。
 */
import { useMemo, useState } from 'react';
import {
  type Attempt,
  type ConceptQuestion,
  type Level,
  MAIN_IDEA,
  HEADLINE,
  NO_LHOPITAL,
  type Problem,
  RULE,
  SPECIALS,
  answerText,
  buildReport,
  makeConcept,
  makeProblem,
  makeRng,
  parseAnswer,
  sameAnswer,
  specialOf,
} from '../../math/limitDrill';
import { LAB } from '../shared/theme';
import { Tex } from '../shared/Tex';

type Card = { readonly sort: 'problem'; readonly p: Problem }
  | { readonly sort: 'concept'; readonly c: ConceptQuestion };

/** ⭐ 大约每六题掺一道概念题 —— 太密会打断手感,太疏又等于没有。 */
function nextCard(level: Level, rng: () => number, index: number): Card {
  const conceptual = index > 0 && index % 6 === 5;
  return conceptual
    ? { sort: 'concept', c: makeConcept(rng) }
    : { sort: 'problem', p: makeProblem(level, rng) };
}

export function LimitDrillLab() {
  const [level, setLevel] = useState<Level>(1);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9) + 1);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [choice, setChoice] = useState<number | null>(null);
  const [shown, setShown] = useState(0);          // 已经放出几条提示
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory] = useState<readonly Attempt[]>([]);

  // ⚠️ 题目由 (seed, level, index) 唯一决定 —— 重渲染不会换题。
  const rng = useMemo(() => {
    const r = makeRng(seed + level * 7919);
    for (let i = 0; i < index; i += 1) nextCard(level, r, i);
    return r;
  }, [seed, level, index]);
  const card = useMemo(() => nextCard(level, rng, index), [rng, index, level]);

  const parsed = card.sort === 'problem' ? parseAnswer(typed) : null;
  const right = submitted && (card.sort === 'problem'
    ? parsed !== null && sameAnswer(parsed, card.p.answer)
    : choice === card.c.correct);

  const done = history.length;
  const roundDone = done > 0 && done % 10 === 0;
  const report = useMemo(
    () => (roundDone ? buildReport(history.slice(-10)) : null),
    [roundDone, history],
  );

  const submit = () => {
    if (submitted) return;
    if (card.sort === 'problem' && parsed === null) return;
    if (card.sort === 'concept' && choice === null) return;
    const ok = card.sort === 'problem'
      ? parsed !== null && sameAnswer(parsed, card.p.answer)
      : choice === card.c.correct;
    setHistory((h) => [...h, {
      kind: card.sort === 'problem' ? card.p.kind : 'concept',
      level: card.sort === 'problem' ? card.p.level : null,
      right: ok,
    }]);
    setSubmitted(true);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setTyped(''); setChoice(null); setShown(0); setSubmitted(false);
  };

  const restart = (lv: Level) => {
    setLevel(lv);
    setSeed(Math.floor(Math.random() * 1e9) + 1);
    setIndex(0); setTyped(''); setChoice(null); setShown(0);
    setSubmitted(false); setHistory([]);
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus BC · Unit 1 · Practice
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Special Limits Drill
        </h1>
        <p className="mt-3 text-base text-slate-400">{HEADLINE}. {MAIN_IDEA}</p>
      </header>

      {/* 规则常驻:这一页教的就是这一句 */}
      <p data-readout="rule"
        className="mt-5 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm leading-relaxed text-amber-100">
        {RULE}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {([1, 2, 3, 4, 5] as const).map((lv) => (
            <button
              key={lv} type="button" data-level={lv} data-active={lv === level ? 'yes' : 'no'}
              onClick={() => restart(lv)}
              className={
                'rounded-lg border px-2.5 py-1 font-mono text-[11px] transition ' +
                (lv === level
                  ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200')
              }
            >
              Level {lv}
            </button>
          ))}
        </div>
        <p className="ml-auto font-mono text-[11px] text-slate-500">
          <span data-readout="answered">{done}</span> answered ·{' '}
          <span data-readout="correct">{history.filter((h) => h.right).length}</span> correct
        </p>
      </div>

      {/* ── 题目 ── */}
      <section data-panel="question" data-sort={card.sort}
        className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
        {card.sort === 'problem' ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Question {done + 1} · Level {card.p.level}
            </p>
            <div data-readout="prompt" className="mt-3 text-2xl text-slate-100">
              <Tex src={card.p.tex} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                data-input="answer" type="text" value={typed} disabled={submitted}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
                placeholder="e.g. 3  or  1/2  or  DNE"
                aria-label="Your answer"
                className="w-52 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-1.5 font-mono text-sm text-slate-100 outline-none focus:border-amber-400/60 disabled:opacity-60"
              />
              {!submitted ? (
                <button
                  type="button" data-action="submit" onClick={submit} disabled={parsed === null}
                  className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 font-mono text-[11px] text-emerald-100 transition hover:border-emerald-300 disabled:opacity-40"
                >
                  Submit
                </button>
              ) : (
                <button
                  type="button" data-action="next" onClick={next}
                  className="rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 font-mono text-[11px] text-amber-100 transition hover:border-amber-300"
                >
                  Next question →
                </button>
              )}
              {!submitted && shown < 2 && (
                <button
                  type="button" data-action="hint" onClick={() => setShown((n) => n + 1)}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 font-mono text-[11px] text-slate-300 transition hover:border-slate-400"
                >
                  {shown === 0 ? 'Hint' : 'Another hint'}
                </button>
              )}
              {typed !== '' && parsed === null && !submitted && (
                <span data-readout="unparsed" className="font-mono text-[11px] text-slate-500">
                  type a number, a fraction like 3/4, or DNE
                </span>
              )}
            </div>

            {/* 提示 */}
            {shown >= 1 && (
              <p data-readout="hint-1" className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs leading-relaxed text-slate-300">
                {card.p.hints[0]}
              </p>
            )}
            {shown >= 2 && (
              <p data-readout="hint-2" className="mt-2 rounded-lg border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 text-xs leading-relaxed text-cyan-100">
                {card.p.hints[1]}
              </p>
            )}

            {/* 判定与解答 */}
            {submitted && (
              <div className="mt-4">
                <p data-readout="verdict" data-ok={right ? 'yes' : 'no'}
                  className="font-mono text-sm" style={{ color: right ? LAB.pass : LAB.fail }}>
                  {right
                    ? '✓ Correct'
                    : `× Not quite — the answer is ${answerText(card.p.answer)}`}
                </p>

                {card.p.substitution && (
                  <p data-readout="substitution"
                    className="mt-2 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 font-mono text-[11px] text-amber-100">
                    {card.p.substitution}
                  </p>
                )}

                <ol data-readout="steps" className="mt-3 space-y-1.5">
                  {card.p.steps.map((st, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                      <span className="font-mono text-slate-600">{i + 1}.</span>
                      <span>
                        {st.say}
                        {st.tex && (
                          <span className="ml-2 text-slate-200"><Tex src={st.tex} /></span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Question {done + 1} · Concept check
            </p>
            <p data-readout="prompt" className="mt-3 text-lg leading-relaxed text-slate-100">
              {card.c.prompt}
            </p>
            <div className="mt-3 grid gap-1.5">
              {card.c.choices.map((ch, i) => (
                <button
                  key={i} type="button" data-choice={i} disabled={submitted}
                  data-state={submitted ? (i === card.c.correct ? 'right' : (i === choice ? 'wrong' : 'idle')) : (i === choice ? 'picked' : 'idle')}
                  onClick={() => setChoice(i)}
                  className={
                    'rounded-lg border px-3 py-2 text-left text-sm transition ' +
                    (submitted && i === card.c.correct
                      ? 'border-emerald-400/60 bg-emerald-400/10 text-emerald-100'
                      : submitted && i === choice
                        ? 'border-red-400/60 bg-red-400/10 text-red-100'
                        : i === choice
                          ? 'border-amber-400/60 bg-amber-400/10 text-amber-100'
                          : 'border-slate-700 text-slate-300 hover:border-slate-500')
                  }
                >
                  {ch}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {!submitted ? (
                <button
                  type="button" data-action="submit" onClick={submit} disabled={choice === null}
                  className="rounded-lg border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 font-mono text-[11px] text-emerald-100 transition hover:border-emerald-300 disabled:opacity-40"
                >
                  Submit
                </button>
              ) : (
                <button
                  type="button" data-action="next" onClick={next}
                  className="rounded-lg border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 font-mono text-[11px] text-amber-100 transition hover:border-amber-300"
                >
                  Next question →
                </button>
              )}
            </div>
            {submitted && (
              <>
                <p data-readout="verdict" data-ok={right ? 'yes' : 'no'}
                  className="mt-3 font-mono text-sm" style={{ color: right ? LAB.pass : LAB.fail }}>
                  {right ? '✓ Correct' : '× Not quite'}
                </p>
                <p data-readout="why" className="mt-2 text-xs leading-relaxed text-slate-300">
                  {card.c.why}
                </p>
              </>
            )}
          </>
        )}
      </section>

      {/* ── 十题小结 ── */}
      {report && (
        <section data-panel="report"
          className="mt-4 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            Round complete
          </p>
          <p className="mt-2 font-mono text-lg text-amber-100">
            <span data-readout="score">{report.score}</span> / {report.outOf}
          </p>
          <p className="mt-2 font-mono text-[11px] text-slate-300">
            missed:{' '}
            <span data-readout="weakest">
              {report.weakest.length === 0
                ? 'no special limit missed'
                : report.weakest.map((k) => specialOf(k)?.label ?? 'no special limit needed').join(' · ')}
            </span>
          </p>
          <p data-readout="advice" className="mt-2 text-sm leading-relaxed text-slate-200">
            {report.advice}
          </p>
        </section>
      )}

      {/* ── 八条参考 ── */}
      <section data-panel="reference" className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          The eight, for reference
        </p>
        <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {SPECIALS.map((s) => (
            <p key={s.kind} data-special={s.kind} className="text-sm text-slate-300">
              <Tex src={s.tex} />
            </p>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-500">{NO_LHOPITAL}</p>
      </section>
    </main>
  );
}
