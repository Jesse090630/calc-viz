/**
 * LAB — 「Two Sides. One Destination.」(左极限与右极限)
 *
 * 交互只有一件事:**把两个点分别从左、从右推向 x = a,看它们各自停在什么高度。**
 * 一致 → 双侧极限存在;不一致 → 不存在。
 *
 * ⚠️ 提示词里的「Part 1 / 2 / 3」在这里不是幻灯片,而是一个 **focus 开关**:
 * 三个模式随时可切、互相不锁,只改变哪一侧被压暗。
 * 做成必须按顺序过的步骤就成了 slideshow —— 那是明令禁止的。
 *
 * ⚠️ f(a) 一次都不参与判定(见 `oneSidedLimits.ts` 文件头)。
 * 这一节把空心/实心画对,下一节整节课讲它。
 *
 * 结构:
 *   OneSidedLab —— 唯一的状态持有者(哪条函数、两个点在哪、焦点)
 *     ├ OneSidedGraph                          受控,只画
 *     └ SidePanel ×2 / Verdict / MentalModel    受控,只读
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { OneSidedGraph, type Focus } from './OneSidedGraph';
import { MentalModel, SidePanel, Verdict } from './OneSidedPanels';
import { LAB } from '../shared/theme';
import {
  FUNCTIONS,
  FUNCTION_ORDER,
  SIDE_COPY,
  clampToSide,
  readApproach,
  resetApproach,
  sidesAgree,
  stepCloser,
  type FunctionId,
  type Side,
} from '../../math/oneSidedLimits';

const SIDES: readonly Side[] = ['left', 'right'];
const FOCUS_ORDER: readonly Focus[] = ['left', 'right', 'both'];
const FOCUS_LABEL: Readonly<Record<Focus, string>> = {
  left: 'From the left',
  right: 'From the right',
  both: 'Both at once',
};

export function OneSidedLab() {
  const [fnId, setFnId] = useState<FunctionId>('square');
  const fn = FUNCTIONS[fnId];
  const [focus, setFocus] = useState<Focus>('left');
  const [xs, setXs] = useState<Record<Side, number>>(() => ({
    left: resetApproach(FUNCTIONS.square, 'left'),
    right: resetApproach(FUNCTIONS.square, 'right'),
  }));

  const left = useMemo(() => readApproach(fn, 'left', xs.left), [fn, xs.left]);
  const right = useMemo(() => readApproach(fn, 'right', xs.right), [fn, xs.right]);
  const agree = sidesAgree(fn);

  // ⚠️ 换函数时把两个点搬回起点。不搬的话新图上的点会停在半路,
  //    而这一节的第一印象应该是"从远处走过来"。
  useEffect(() => {
    setXs({ left: resetApproach(fn, 'left'), right: resetApproach(fn, 'right') });
  }, [fn]);

  const move = useCallback(
    (side: Side, x: number) => setXs((prev) => ({ ...prev, [side]: clampToSide(fn, side, x) })),
    [fn],
  );

  /** 「再近一点」:只推当前焦点那一侧;both 时两侧一起走。 */
  const closer = useCallback(() => {
    setXs((prev) => {
      const next = { ...prev };
      for (const side of SIDES) {
        if (focus === 'both' || focus === side) next[side] = stepCloser(fn, side, prev[side]);
      }
      return next;
    });
  }, [fn, focus]);

  const restart = useCallback(() => {
    setXs({ left: resetApproach(fn, 'left'), right: resetApproach(fn, 'right') });
  }, [fn]);

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Calculus · Interactive definition
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          One-Sided Limits
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Two sides. One destination — or two. Walk in from each side and see where you land.
        </p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div role="tablist" aria-label="Choose a function" className="inline-flex rounded-xl border border-slate-700 p-1">
            {FUNCTION_ORDER.map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                data-function={id}
                aria-selected={fnId === id}
                onClick={() => setFnId(id)}
                className={
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition ' +
                  (fnId === id
                    ? id === 'jump'
                      ? 'bg-red-400/15 text-red-100'
                      : 'bg-amber-400/15 text-amber-100'
                    : 'text-slate-400 hover:text-slate-200')
                }
              >
                {FUNCTIONS[id].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* focus:不是步骤,是取景。随时可切。 */}
            <div role="tablist" aria-label="Which side to watch" className="inline-flex rounded-xl border border-slate-700 p-1">
              {FOCUS_ORDER.map((f) => (
                <button
                  key={f}
                  role="tab"
                  type="button"
                  data-focus={f}
                  aria-selected={focus === f}
                  onClick={() => setFocus(f)}
                  className={
                    'rounded-lg px-2.5 py-1 text-[11px] font-bold transition ' +
                    (focus === f ? 'bg-slate-700/70 text-slate-100' : 'text-slate-400 hover:text-slate-200')
                  }
                >
                  {FOCUS_LABEL[f]}
                </button>
              ))}
            </div>
            <button
              type="button"
              data-action="closer"
              onClick={closer}
              className="rounded-lg border border-cyan-400/40 px-2.5 py-1 font-mono text-[11px] font-bold text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-400/10"
            >
              Closer →
            </button>
            <button
              type="button"
              data-action="restart"
              onClick={restart}
              className="rounded-lg border border-slate-700 px-2.5 py-1 font-mono text-[11px] text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
            >
              Start over
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.55fr_1fr]">
          <div className="min-w-0">
            <p className="mb-1 text-sm text-slate-400">{fn.blurb}</p>
            <OneSidedGraph
              fn={fn}
              left={left}
              right={right}
              focus={focus}
              onMoveLeft={(x) => move('left', x)}
              onMoveRight={(x) => move('right', x)}
            />
            <p className="mt-1 text-xs text-slate-500">
              Drag <span style={{ color: LAB.x1 }}>{SIDE_COPY.left.word}</span> or{' '}
              <span style={{ color: LAB.x2 }}>{SIDE_COPY.right.word}</span> — neither one can reach
              x&nbsp;=&nbsp;{fn.a}.
            </p>
            <div className="mt-3">
              <MentalModel agree={agree} />
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {SIDES.map((side) => (
              <SidePanel
                key={side}
                fn={fn}
                side={side}
                approach={side === 'left' ? left : right}
                dimmed={focus !== 'both' && focus !== side}
              />
            ))}
            <Verdict fn={fn} />
          </div>
        </div>
      </section>
    </main>
  );
}
