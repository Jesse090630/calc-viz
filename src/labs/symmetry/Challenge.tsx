/**
 * LAB — Part 3 小挑战
 *
 * ⚠️ 提示词给的五个函数(x²、x³、|x|、x、x²+1)里**一个 neither 都没有**。
 * 三个选项里永远有一个不会是正确答案,学生两三题就学会不选它 —— 那学到的是猜题,不是定义。
 * 所以题库补了 x²+x 和 x³+1(见 `math/symmetry.ts`),并有测试盯着三种答案都出现过。
 *
 * ⚠️ 答完之后的解释**不靠背图形**,而是把那个具体的反例 x 摆出来:
 * "在 x = 2.1 这里,f(-x) = 2.31 而 f(x) = 6.51,两者不等,所以不是偶函数。"
 * 学生可以自己把点拖到那里验证。
 */
import { LAB, STATE } from '../shared/theme';
import { Tex } from '../shared/Tex';
import { KIND_LABEL } from './Panels';
import {
  classifyBySampling,
  showNumber,
  type MirrorSample,
  type SymmetryFunction,
  type SymmetryKind,
} from '../../math/symmetry';

const CHOICES: readonly SymmetryKind[] = ['even', 'odd', 'neither'];

function WitnessLine({ witness, test }: { witness: MirrorSample; test: 'even' | 'odd' }) {
  const right = test === 'even' ? showNumber(witness.fx) : showNumber(-witness.fx);
  return (
    <div className="font-mono text-xs tabular-nums text-slate-300">
      at x = {showNumber(witness.x)}: f({showNumber(witness.negX)}) = {showNumber(witness.fNegX)} ≠{' '}
      {right} {test === 'even' ? '= f(x)' : '= −f(x)'}
    </div>
  );
}

export function Challenge({
  fn,
  answer,
  onAnswer,
  onNext,
  sample,
  reachableRadius,
}: {
  fn: SymmetryFunction;
  answer: SymmetryKind | null;
  onAnswer: (kind: SymmetryKind) => void;
  onNext: () => void;
  sample: MirrorSample;
  /** 滑块能到达的最大 |x|。反例必须落在这个范围里,否则"拖过去看看"是句空话。 */
  reachableRadius: number;
}) {
  /**
   * ⚠️ 半径必须传滑块的实际行程,不能用默认的 3。
   * 默认值给出的反例是 x = 3.00,而滑块最远只到 2.2 ——
   * 界面上白纸黑字写着"把 x 拖到那里看看",学生拖到头也到不了。
   * 给出一个够不着的证据,比不给还糟。
   */
  const truth = classifyBySampling(fn, reachableRadius);
  const correct = answer === truth.kind;

  return (
    <div>
      <p className="text-sm text-slate-300">
        Drag <span className="font-mono font-bold" style={{ color: LAB.x2 }}>x</span> and watch both
        outputs before you answer.
      </p>
      <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 font-mono text-xs tabular-nums text-slate-300">
        f({showNumber(sample.negX)}) = {showNumber(sample.fNegX)}
        <span className="mx-2 text-slate-600">|</span>
        f({showNumber(sample.x)}) = {showNumber(sample.fx)}
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-200">Even, odd, or neither?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CHOICES.map((choice) => {
          const chosen = answer === choice;
          const isTruth = choice === truth.kind;
          const revealed = answer !== null;
          let cls = 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white';
          if (revealed && isTruth) cls = 'border-green-400/70 bg-green-400/15 text-green-100';
          else if (revealed && chosen) cls = 'border-red-400/70 bg-red-400/15 text-red-100';
          else if (revealed) cls = 'border-slate-800 text-slate-500';
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onAnswer(choice)}
              disabled={revealed}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-default ${cls}`}
            >
              {KIND_LABEL[choice]}
              {revealed && isTruth && <span aria-hidden="true"> ✓</span>}
              {revealed && chosen && !isTruth && <span aria-hidden="true"> ×</span>}
            </button>
          );
        })}
      </div>

      {answer !== null && (
        <div
          className="mt-4 rounded-xl border px-4 py-3"
          style={{
            borderColor: correct ? `${STATE.pass.color}55` : `${STATE.fail.color}55`,
            backgroundColor: correct ? `${STATE.pass.color}0f` : `${STATE.fail.color}0f`,
          }}
        >
          <p
            className="text-sm font-bold"
            style={{ color: correct ? STATE.pass.color : STATE.fail.color }}
          >
            <span aria-hidden="true">{correct ? '✓' : '×'}</span>{' '}
            {correct ? 'Correct.' : `Not quite — it is ${KIND_LABEL[truth.kind].toLowerCase()}.`}
          </p>

          <div className="mt-2.5 space-y-2 text-xs leading-relaxed text-slate-300">
            {truth.kind === 'even' && (
              <>
                <p>
                  Every x we sampled gave <Tex src="f(-x) = f(x)" /> — the mirror point always
                  landed at the same height.
                </p>
                {truth.oddWitness && (
                  <div>
                    <p className="text-slate-400">It is not odd, and here is one x that shows it:</p>
                    <WitnessLine witness={truth.oddWitness} test="odd" />
                  </div>
                )}
              </>
            )}

            {truth.kind === 'odd' && (
              <>
                <p>
                  Every x we sampled gave <Tex src="f(-x) = -f(x)" /> — the mirror point landed at
                  the opposite height, so the origin sits at the midpoint.
                </p>
                {truth.evenWitness && (
                  <div>
                    <p className="text-slate-400">It is not even, and here is one x that shows it:</p>
                    <WitnessLine witness={truth.evenWitness} test="even" />
                  </div>
                )}
              </>
            )}

            {truth.kind === 'neither' && (
              <>
                <p>Both conditions fail, and one x is enough to kill each of them:</p>
                {truth.evenWitness && (
                  <div>
                    <p className="text-slate-400">Not even:</p>
                    <WitnessLine witness={truth.evenWitness} test="even" />
                  </div>
                )}
                {truth.oddWitness && (
                  <div>
                    <p className="text-slate-400">Not odd:</p>
                    <WitnessLine witness={truth.oddWitness} test="odd" />
                  </div>
                )}
                <p className="text-slate-400">
                  Drag x to that value and watch the two points refuse to line up.
                </p>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onNext}
            className="mt-3 rounded-xl border border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300 hover:bg-amber-400/20"
          >
            Next function →
          </button>
        </div>
      )}
    </div>
  );
}
