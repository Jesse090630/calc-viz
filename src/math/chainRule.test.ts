/**
 * 链式法则的测试。
 *
 * 重点不在"公式抄对了没有",而在两件事:
 *   ① 两条**互不相干**的路径给出同一个导数(解析相乘 vs 只看复合函数的差商);
 *   ② `Δu = 0` 那个洞被老老实实地报成"没有定义",而不是 NaN / 0 / 悄悄跳过。
 */
import { describe, expect, it } from 'vitest';
import {
  DX_LADDER,
  PAIRS,
  byChainRule,
  byNumericLimit,
  clampX,
  composed,
  forgettingInner,
  innerIsFlat,
  isUsable,
  ladder,
  missingFactor,
  pairOf,
  settlesBelow,
  show,
  stretchFactors,
  type Fn,
  type Pair,
} from './chainRule';

/* ── 手算的锚 ─────────────────────────────────────────────────────
 * y = (2x)² = 4x²  →  dy/dx = 8x。在 x = 0.9 上是 7.2。
 * 链式法则拆开:外层 u² 在 u = 1.8 处导数 2u = 3.6,内层导数 2,3.6 × 2 = 7.2。✓
 */
describe('⭐ 手算对得上', () => {
  const pair = pairOf('double-then-square');

  it('(2x)² 在 x = 0.9 处导数是 8x = 7.2', () => {
    expect(byChainRule(pair, 0.9)).toBeCloseTo(7.2, 12);
  });

  it('复合出来的确实是 4x²', () => {
    const f = composed(pair);
    for (const x of [-1.5, -0.3, 0, 0.7, 1.9]) expect(f(x)).toBeCloseTo(4 * x * x, 12);
  });

  it('sin(x²) 在 x = 1.1 处导数是 cos(x²)·2x', () => {
    const p = pairOf('square-then-sine');
    expect(byChainRule(p, 1.1)).toBeCloseTo(Math.cos(1.21) * 2.2, 12);
  });

  it('√(3x+1) 在 x = 1 处导数是 3/(2√4) = 0.75', () => {
    const p = pairOf('affine-then-root');
    expect(byChainRule(p, 1)).toBeCloseTo(0.75, 12);
  });
});

describe('⭐⭐ 两条独立路径必须一致', () => {
  /**
   * 路径 ① 用了链式法则,路径 ② 完全没有(只把复合函数当黑箱做差商)。
   * 所以它们一致**本身就是**对链式法则的数值检验,不是同义反复。
   */
  it('每一对函数、在整个可用区间上,公式与数值差商一致', () => {
    let checked = 0;
    for (const pair of PAIRS) {
      for (let x = -1.8; x <= 1.8; x += 0.05) {
        if (!isUsable(pair, x)) continue;
        const formula = byChainRule(pair, x);
        const numeric = byNumericLimit(pair, x);
        expect(numeric, `${pair.id} at x=${x.toFixed(2)}`).toBeCloseTo(formula, 5);
        checked += 1;
      }
    }
    // ⚠️ 防空跑:如果 isUsable 把所有点都挡掉了,上面的循环一条断言都不会跑
    expect(checked).toBeGreaterThan(200);
  });

  it('⭐ 「忘了乘内层」在内层导数 ≠ 1 时确实给出不同的答案 —— 否则这一课没得讲', () => {
    const pair = pairOf('double-then-square');
    const x = 0.9;
    expect(forgettingInner(pair, x)).not.toBeCloseTo(byChainRule(pair, x), 6);
    // 差的正好是内层导数这个因子
    expect(byChainRule(pair, x) / forgettingInner(pair, x)).toBeCloseTo(missingFactor(pair, x)!, 12);
  });
});

describe('⭐⭐ 那条恒等式在取极限之前就成立', () => {
  it('只要 Δu ≠ 0,(Δy/Δu)·(Δu/Δx) 就**精确**等于 Δy/Δx', () => {
    let checked = 0;
    for (const pair of PAIRS) {
      for (const x of [-1.3, -0.4, 0.6, 1.2]) {
        for (const dx of [0.5, 0.1, 0.01]) {
          if (!isUsable(pair, x) || !isUsable(pair, x + dx)) continue;
          const s = stretchFactors(pair, x, dx);
          if (!s || s.du === 0) continue;
          expect(s.identityHolds, `${pair.id} x=${x} dx=${dx}`).toBe(true);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });
});

describe('⭐⭐ Δu = 0 的洞必须被报出来,不能是 NaN', () => {
  /**
   * 构造一个内层**局部完全平坦**的函数对。真实教科书从不提这一点:
   * 那条 `Δy/Δx = (Δy/Δu)(Δu/Δx)` 的推导在 Δu = 0 处**是断的**。
   * 结论仍然成立,但要换一种论证 —— 课件必须诚实地显示"没有定义"。
   */
  const CONSTANT: Fn = { id: 'const', label: '1', tex: '1', at: () => 1, d: () => 0 };
  const SQ: Fn = { id: 'sq', label: 'u²', tex: 'u^2', at: (t) => t * t, d: (t) => 2 * t };
  const flatPair: Pair = {
    id: 'flat',
    inner: CONSTANT,
    outer: SQ,
    composedTex: 'y = 1',
    startX: 0,
  };

  it('内层是常数时,Δu 恰好是 0', () => {
    expect(innerIsFlat(flatPair, 0.3, 0.1)).toBe(true);
    expect(stretchFactors(flatPair, 0.3, 0.1)!.du).toBe(0);
  });

  it('外层倍率与乘积都返回 null —— 不是 NaN,不是 0', () => {
    const s = stretchFactors(flatPair, 0.3, 0.1)!;
    expect(s.outer).toBeNull();
    expect(s.product).toBeNull();
    // ⚠️ NaN 在 JS 里是沉默的:任何比较都是 false,会一路溜到屏幕上
    expect(Number.isNaN(s.outer as unknown as number)).toBe(false);
  });

  it('但 Δy/Δx 仍然有定义(是 0)—— 断的只是那条推导路径,不是导数本身', () => {
    const s = stretchFactors(flatPair, 0.3, 0.1)!;
    expect(s.direct).toBe(0);
    expect(s.identityHolds).toBe(false);
  });

  it('而链式法则给出的答案照样是对的', () => {
    expect(byChainRule(flatPair, 0.3)).toBe(0);
    expect(byNumericLimit(flatPair, 0.3)).toBeCloseTo(0, 10);
  });

  it('显示成 "undefined" 这四个字,不显示成数字', () => {
    expect(show(null)).toBe('undefined');
    expect(show(2.5)).not.toBe('undefined');
  });
});

/**
 * ⚠️ `frozen-then-square` 的内层是常数,`Δu` 恒为 0 —— 那条乘积路径在它身上
 * **根本不存在**,自然谈不上收敛。它是这一课特意摆出来的**反例**,不是漏网之鱼。
 *
 * 所以下面的收敛测试要把它排除掉。但**不能默默排除** ——
 * 静默的 skip 会让"以后又混进来一个退化的对"这件事无人察觉。
 * 先断言:退化的**有且只有**它一个。
 */
const DEGENERATE = 'frozen-then-square';
const CONVERGING = PAIRS.filter((p) => p.id !== DEGENERATE);

describe('⭐ 退化的那一对,必须是唯一的一个', () => {
  it('只有 frozen-then-square 的乘积路径不可用', () => {
    const broken = PAIRS.filter((p) => stretchFactors(p, p.startX, 0.1)?.product == null);
    expect(broken.map((p) => p.id)).toEqual([DEGENERATE]);
  });

  it('⭐ 而它是**能从界面上点到**的 —— 否则那段 Δu = 0 的警告就是死界面', () => {
    // 这一条是"防死界面"的守卫:警告文案必须有真实可达的触发路径
    const p = pairOf(DEGENERATE);
    expect(PAIRS).toContain(p);
    expect(innerIsFlat(p, p.startX, 0.1)).toBe(true);
    expect(stretchFactors(p, p.startX, 0.1)!.outer).toBeNull();
  });
});

describe('⭐⭐ 梯子的收敛**速度**,不是"看着像"', () => {
  /**
   * ⚠️ 第一版这里写的是「能收到 1e-3 以内」,结果 `4x²` 那一对怎么也过不去 ——
   * 而那**不是 bug**。前向差商是**一阶**收敛的:
   *     Δy/Δx = 8x + 4Δx      (对 y = 4x²,精确)
   * 误差恰好是 `4Δx`;梯子最小一档 Δx = 0.001,误差就是 0.004,永远进不了 1e-3。
   *
   * 教训和等比级数那次一样:**容差不是凭手感定的**。
   * 与其猜一个数字,不如钉住那个**结构性事实** —— Δx 减半,误差跟着减半。
   * 那比"最后离得够近"强得多,而且不会因为换一对函数就失效。
   */
  it('Δx 减半,误差就减半 —— 前向差商是一阶的', () => {
    for (const pair of CONVERGING) {
      const x = pair.startX;
      const target = byChainRule(pair, x);
      const errorAt = (dx: number) => {
        const s = stretchFactors(pair, x, dx);
        return s?.product == null ? Number.NaN : Math.abs(s.product - target);
      };
      // 取一段够小、又还没被浮点噪声吃掉的区间
      const e1 = errorAt(0.02);
      const e2 = errorAt(0.01);
      const e3 = errorAt(0.005);
      expect(Number.isFinite(e1) && Number.isFinite(e2) && Number.isFinite(e3)).toBe(true);
      expect(e1 / e2, `${pair.id}:0.02 → 0.01 的误差比`).toBeGreaterThan(1.6);
      expect(e1 / e2, `${pair.id}`).toBeLessThan(2.4);
      expect(e2 / e3, `${pair.id}:0.01 → 0.005 的误差比`).toBeGreaterThan(1.6);
      expect(e2 / e3, `${pair.id}`).toBeLessThan(2.4);
    }
  });

  it('每一对(退化的那个除外)都能落进梯子够得着的容差里', () => {
    for (const pair of CONVERGING) {
      // ⚠️ 1e-2 不是随手挑的:梯子最小 Δx = 0.001,而误差 ≈ C·Δx。
      //    `4x²` 那一对的 C 是 4,所以能达到的最好成绩是 4e-3 —— 1e-2 够得着,1e-3 够不着。
      const dx = settlesBelow(pair, pair.startX, 1e-2);
      expect(dx, `${pair.id} 连 1e-2 都收不到`).not.toBeNull();
      expect(DX_LADDER).toContain(dx!);
    }
  });

  it('容差收紧,需要的 Δx 只会更小或相等 —— 不会更大', () => {
    for (const pair of CONVERGING) {
      const loose = settlesBelow(pair, pair.startX, 5e-2);
      const tight = settlesBelow(pair, pair.startX, 1e-2);
      if (loose === null || tight === null) continue;
      expect(tight).toBeLessThanOrEqual(loose);
    }
  });

  it('⭐ 「4x² 的误差恰好是 4Δx」—— 把上面那个手算事实本身也钉住', () => {
    const pair = pairOf('double-then-square');
    for (const dx of [0.5, 0.1, 0.01, 0.001]) {
      const s = stretchFactors(pair, 0.9, dx)!;
      expect(s.product! - byChainRule(pair, 0.9)).toBeCloseTo(4 * dx, 10);
    }
  });

  /**
   * ⚠️ 变异测试抓出来的洞:把 `settlesBelow` 的判据放松到几乎恒真,
   * 原来那几条断言**照样全绿** —— 因为它们只问"返回了吗、在梯子上吗、
   * 收紧容差后是不是没变大",都不检查**返回的那一档是否真的达标**。
   * 一个只验证"有答案"的测试,挡不住"答案是错的"。
   */
  it('⭐ settlesBelow 返回的那一档,必须**真的**把误差压到容差以下', () => {
    for (const pair of CONVERGING) {
      const tol = 1e-2;
      const dx = settlesBelow(pair, pair.startX, tol);
      expect(dx).not.toBeNull();
      const s = stretchFactors(pair, pair.startX, dx!)!;
      const err = Math.abs(s.product! - byChainRule(pair, pair.startX));
      expect(err, `${pair.id} 返回 dx=${dx} 但误差是 ${err}`).toBeLessThan(tol);
    }
  });

  it('⭐ 而比它更早(更大)的每一档,都还没达标 —— 它返回的是**第一个**达标的', () => {
    for (const pair of CONVERGING) {
      const tol = 1e-2;
      const dx = settlesBelow(pair, pair.startX, tol)!;
      for (const bigger of DX_LADDER) {
        if (bigger <= dx) continue;
        const s = stretchFactors(pair, pair.startX, bigger);
        if (s?.product == null) continue;
        const err = Math.abs(s.product - byChainRule(pair, pair.startX));
        expect(err, `${pair.id}: dx=${bigger} 其实已经达标了,不该跳过`).toBeGreaterThanOrEqual(tol);
      }
    }
  });

  it('梯子每一档都有内层倍率(内层处处可导)', () => {
    for (const pair of PAIRS) {   // 这条对退化的那一对也成立:常数的导数是 0,仍然是有限值
      for (const rung of ladder(pair, pair.startX)) {
        expect(Number.isFinite(rung.inner), `${pair.id} dx=${rung.dx}`).toBe(true);
      }
    }
  });
});

describe('取值与边界', () => {
  it('clampX 挡住非有限值,并夹在范围内', () => {
    expect(clampX(Number.NaN)).toBe(1);
    expect(clampX(Number.POSITIVE_INFINITY)).toBe(1);
    expect(clampX(99)).toBe(2);
    expect(clampX(-99)).toBe(-2);
  });

  it('stretchFactors 在 Δx = 0 时返回 null,不返回 0/0', () => {
    expect(stretchFactors(PAIRS[0]!, 0.5, 0)).toBeNull();
    expect(stretchFactors(PAIRS[0]!, 0.5, Number.NaN)).toBeNull();
  });

  it('√(3x+1) 在 3x+1 ≤ 0 的地方被 isUsable 挡住', () => {
    const p = pairOf('affine-then-root');
    expect(isUsable(p, -1)).toBe(false);      // 3(−1)+1 = −2 < 0
    expect(isUsable(p, -1 / 3)).toBe(false);  // u = 0,导数发散
    expect(isUsable(p, 1)).toBe(true);
  });

  /**
   * ⚠️ 也是变异测试抓出来的:`missingFactor` 里那句 `g === 0 ? null : g`
   * 拿掉之后没有任何测试报警 —— 因为没有一条测试走到内层导数为 0 的点。
   * 而那个点恰恰是最该讲的:x = 0 处 `sin(x²)` 的内层导数 2x 正好是 0,
   * "忘了乘内层"和"没忘"差的那个因子是 0,**比值没有意义**。
   */
  it('⭐ 内层导数为 0 时,missingFactor 返回 null 而不是 0', () => {
    const p = pairOf('square-then-sine');   // 内层 x²,g′(0) = 0
    expect(p.inner.d(0)).toBe(0);
    expect(missingFactor(p, 0)).toBeNull();
    // 而在别处它就是内层导数本身
    expect(missingFactor(p, 0.7)).toBeCloseTo(1.4, 12);
  });

  it('⭐ 那一点上真导数是 0,而"忘了乘内层"给出的是 1 —— 错得很具体', () => {
    const p = pairOf('square-then-sine');
    expect(byChainRule(p, 0)).toBe(0);
    expect(forgettingInner(p, 0)).toBeCloseTo(1, 12);
  });

  it('pairOf 认不出的 id 回落到第一对,而不是 undefined', () => {
    expect(pairOf('nope')).toBe(PAIRS[0]);
  });

  it('每一对的 startX 都是可用的 —— 否则一打开就是空白', () => {
    for (const pair of PAIRS) expect(isUsable(pair, pair.startX), pair.id).toBe(true);
  });
});
