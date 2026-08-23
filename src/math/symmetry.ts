/**
 * MATH — 偶函数与奇函数
 *
 *   偶:f(-x) = f(x)   图像关于 **y 轴** 对称
 *   奇:f(-x) = -f(x)  图像关于 **原点** 对称
 *
 * ⚠️ 和单调性那一节同一条纪律:**有限次取样不能证明 ∀ 命题。**
 * 所以判定函数叫 `classifyBySampling`,返回的字段叫 `evidence` 而不是 `proof`。
 * 但**证否是真的**:找到一个 x 使 f(-x) ≠ f(x),偶就被排除了,一个就够。
 * 界面上要说的是"到目前为止都对得上",不是"所以它是偶函数"。
 *
 * ⚠️ 关于 `neither`:提示词给的五个例子(x²、x³、|x|、x、x²+1)**没有一个是 neither**。
 * 选项里永远有一个答案从不出现,学生很快就学会"闭着眼睛不选 neither"。
 * 所以补了两个真正 neither 的函数,并有测试盯着这件事(见 symmetry.test.ts)。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export type SymmetryKind = 'even' | 'odd' | 'neither';

export interface SymmetryFunction {
  readonly id: string;
  readonly tex: string;
  readonly label: string;
  /** 纯函数。无定义处返回 null,**绝不返回 NaN**。 */
  readonly at: (x: number) => number | null;
  /**
   * 多项式系数,下标即指数:`[1, 0, 1]` 表示 1 + x²。
   * 存在的意义是提供**第二条独立判定路径**(见下面的 `classifyByExponents`)。
   * 非多项式(比如 |x|)没有系数,填 null,那种只能靠取样判。
   */
  readonly coefficients: readonly number[] | null;
  /** 期望的答案。测试会用两条独立路径核对它,不是随手写上的。 */
  readonly expected: SymmetryKind;
}

export const SYMMETRY_FUNCTIONS: Readonly<Record<string, SymmetryFunction>> = {
  square: {
    id: 'square',
    tex: 'f(x) = x^2',
    label: 'x²',
    at: (x) => x * x,
    coefficients: [0, 0, 1],
    expected: 'even',
  },
  cube: {
    id: 'cube',
    tex: 'f(x) = x^3',
    label: 'x³',
    at: (x) => x * x * x,
    coefficients: [0, 0, 0, 1],
    expected: 'odd',
  },
  absolute: {
    id: 'absolute',
    tex: 'f(x) = |x|',
    label: '|x|',
    at: (x) => Math.abs(x),
    coefficients: null, // 不是多项式 —— 只能靠取样判
    expected: 'even',
  },
  identity: {
    id: 'identity',
    tex: 'f(x) = x',
    label: 'x',
    at: (x) => x,
    coefficients: [0, 1],
    expected: 'odd',
  },
  squarePlusOne: {
    id: 'squarePlusOne',
    tex: 'f(x) = x^2 + 1',
    label: 'x² + 1',
    at: (x) => x * x + 1,
    coefficients: [1, 0, 1],
    expected: 'even',
  },
  // ── 下面两个是补的:提示词那五个里一个 neither 都没有 ──
  squarePlusX: {
    id: 'squarePlusX',
    tex: 'f(x) = x^2 + x',
    label: 'x² + x',
    at: (x) => x * x + x,
    coefficients: [0, 1, 1], // 同时含奇次与偶次 ⇒ 两边都不满足
    expected: 'neither',
  },
  cubePlusOne: {
    id: 'cubePlusOne',
    tex: 'f(x) = x^3 + 1',
    label: 'x³ + 1',
    at: (x) => x * x * x + 1,
    coefficients: [1, 0, 0, 1],
    expected: 'neither',
  },
};

export const CHALLENGE_ORDER: readonly string[] = [
  'square',
  'cube',
  'absolute',
  'identity',
  'squarePlusOne',
  'squarePlusX',
  'cubePlusOne',
];

/* ── 一次取样 ─────────────────────────────────────────────────────────────── */

export interface MirrorSample {
  readonly x: number;
  readonly negX: number;
  readonly fx: number;
  readonly fNegX: number;
  /** f(-x) === f(x) ? */
  readonly evenHolds: boolean;
  /** f(-x) === -f(x) ? */
  readonly oddHolds: boolean;
}

/**
 * 比较容差。
 *
 * ⚠️ 这里**不能**用宽容差。`x³ + 1` 在 x = 0 附近的两个输出差得极小,
 * 松一点就会把一个 neither 判成 odd。而这一节的全部意义就是分清这三类。
 * 取 1e-9:够压住 (x*x*x) 这种乘法的舍入误差,又远小于任何真实差异。
 */
const TOLERANCE = 1e-9;

const same = (a: number, b: number) => Math.abs(a - b) <= TOLERANCE;

/** 取一个 x,把它和它的镜像一起算出来。任一端无定义就返回 null。 */
export function mirrorAt(fn: SymmetryFunction, x: number): MirrorSample | null {
  if (!Number.isFinite(x)) return null;
  const fx = fn.at(x);
  const fNegX = fn.at(-x);
  if (fx === null || fNegX === null || !Number.isFinite(fx) || !Number.isFinite(fNegX)) return null;
  return {
    x,
    negX: -x,
    fx,
    fNegX,
    evenHolds: same(fNegX, fx),
    oddHolds: same(fNegX, -fx),
  };
}

/* ── 判定路径 A:取样 ─────────────────────────────────────────────────────── */

export interface Classification {
  readonly kind: SymmetryKind;
  /** 破坏「偶」的那个 x —— 没有就是 null */
  readonly evenWitness: MirrorSample | null;
  /** 破坏「奇」的那个 x */
  readonly oddWitness: MirrorSample | null;
  readonly samplesChecked: number;
}

/**
 * 在窗口里扫一遍,找**反例**。
 *
 * 取样从 i = 1 开始,避开 x = 0 —— 那里 f(-0) 与 f(0) 恒等,对任何函数都"成立"。
 * ⚠️ 但真正保证不会拿 0 当证据的**不是**这一行,而是下面的"取差距最大者":
 * x = 0 处两点重合、差距为 0,永远竞争不过别的样本。
 * (变异测试证实了这点 —— 把 i 改成 0,测试全绿。留着这行是习惯,不是防线。)
 */
export function classifyBySampling(
  fn: SymmetryFunction,
  radius = 3,
  samples = 400,
): Classification {
  let evenWitness: MirrorSample | null = null;
  let oddWitness: MirrorSample | null = null;
  let evenGap = 0;
  let oddGap = 0;
  let checked = 0;

  for (let i = 1; i <= samples; i += 1) {
    const x = (radius * i) / samples;
    const sample = mirrorAt(fn, x);
    if (!sample) continue;
    checked += 1;

    // ⚠️ 记的是**差距最大**的那个反例,不是第一个撞上的。
    // 取第一个的话,x³+1 给出的证据会是 x ≈ 0.0075 处
    // 「f(-0.0075) = 0.9999996,f(0.0075) = 1.0000004」——
    // 数学上确实是反例,可屏幕上那两个点**完全重合**,学生只会觉得你在骗他。
    // (和上一节"反例落在抛物线顶点上"是同一类错:先想清楚证据要给谁看。)
    if (!sample.evenHolds) {
      const gap = Math.abs(sample.fNegX - sample.fx);
      if (evenWitness === null || gap > evenGap) {
        evenWitness = sample;
        evenGap = gap;
      }
    }
    if (!sample.oddHolds) {
      const gap = Math.abs(sample.fNegX + sample.fx);
      if (oddWitness === null || gap > oddGap) {
        oddWitness = sample;
        oddGap = gap;
      }
    }
  }

  const kind: SymmetryKind =
    evenWitness === null ? 'even' : oddWitness === null ? 'odd' : 'neither';
  return { kind, evenWitness, oddWitness, samplesChecked: checked };
}

/* ── 判定路径 B:看指数的奇偶 ─────────────────────────────────────────────── */

/**
 * 多项式专用,**完全不做数值比较**。
 *
 * 依据:x^n 在 n 为偶数时是偶函数,n 为奇数时是奇函数。
 * 所以一个多项式是偶函数 ⟺ 它的非零项全是偶次;是奇函数 ⟺ 全是奇次。
 * 两种次数都有(且都非零)就两边都不是。
 *
 * 这条路径与取样路径的推理方式毫无重叠 —— 一个查符号结构,一个查数值 ——
 * 因此适合互证。测试断言两者在每个多项式上给出同一个答案。
 */
export function classifyByExponents(coefficients: readonly number[]): SymmetryKind {
  let hasEven = false;
  let hasOdd = false;
  for (let power = 0; power < coefficients.length; power += 1) {
    if ((coefficients[power] ?? 0) === 0) continue;
    if (power % 2 === 0) hasEven = true;
    else hasOdd = true;
  }
  // 零多项式既偶又奇;这里按"偶"处理,并在测试里说明。
  if (hasEven && hasOdd) return 'neither';
  if (hasOdd) return 'odd';
  return 'even';
}

/** 由系数求值,给测试当第三方核对用。 */
export function evaluatePolynomial(coefficients: readonly number[], x: number): number {
  let total = 0;
  for (let power = 0; power < coefficients.length; power += 1) {
    total += (coefficients[power] ?? 0) * Math.pow(x, power);
  }
  return total;
}

/* ── 界面用的小工具 ───────────────────────────────────────────────────────── */

/** 曲线折线点 */
export function sampleCurve(
  fn: SymmetryFunction,
  from: number,
  to: number,
  count = 240,
): readonly { x: number; y: number | null }[] {
  const n = Math.max(2, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    const y = fn.at(x);
    return { x, y: y !== null && Number.isFinite(y) ? y : null };
  });
}

/**
 * 挑一个**能说明问题**的 x 给挑战题当起点。
 *
 * 不能给 0:那里 f(-x) 与 f(x) 对任何函数都相等,学生一看"成立",
 * 立刻得出错误结论。也不能给让两个输出恰好相等的点。
 */
export function informativeStart(fn: SymmetryFunction, candidates = [2, 1.5, 1, 2.5, 0.5]): number {
  for (const x of candidates) {
    const sample = mirrorAt(fn, x);
    if (!sample) continue;
    // 至少要能区分开偶和奇,否则这个点什么也不说明
    if (sample.evenHolds !== sample.oddHolds) return x;
  }
  return 2;
}

export { showNumber };
