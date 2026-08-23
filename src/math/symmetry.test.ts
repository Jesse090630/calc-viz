/**
 * `symmetry.ts` 的测试。
 *
 * 三个重点:
 * ① 两条**推理方式毫无重叠**的判定路径必须一致(数值取样 vs 指数奇偶);
 * ② `neither` 必须真的会出现 —— 否则选项里有个答案永远是错的;
 * ③ x = 0 不能当证据 —— 那里对任何函数都"成立",是最容易骗到人的点。
 */
import { describe, it, expect } from 'vitest';
import {
  CHALLENGE_ORDER,
  SYMMETRY_FUNCTIONS,
  classifyByExponents,
  classifyBySampling,
  evaluatePolynomial,
  informativeStart,
  mirrorAt,
  sampleCurve,
  showNumber,
} from './symmetry';

describe('⭐ 提示词里钉死的那几个数字', () => {
  it('x = 2 时 f(2) = 4 且 f(-2) = 4(偶)', () => {
    const s = mirrorAt(SYMMETRY_FUNCTIONS.square!, 2)!;
    expect(s.fx).toBe(4);
    expect(s.fNegX).toBe(4);
    expect(s.evenHolds).toBe(true);
    expect(s.oddHolds).toBe(false);
  });

  it('x = 2 时 f(2) = 8 且 f(-2) = -8(奇)', () => {
    const s = mirrorAt(SYMMETRY_FUNCTIONS.cube!, 2)!;
    expect(s.fx).toBe(8);
    expect(s.fNegX).toBe(-8);
    expect(s.oddHolds).toBe(true);
    expect(s.evenHolds).toBe(false);
  });

  it('镜像输入就是取相反数', () => {
    expect(mirrorAt(SYMMETRY_FUNCTIONS.square!, 2)!.negX).toBe(-2);
    expect(mirrorAt(SYMMETRY_FUNCTIONS.square!, -1.5)!.negX).toBe(1.5);
  });
});

describe('⭐ 两条独立判定路径必须一致', () => {
  // 路径 A 查数值(取样比较 f(-x) 与 ±f(x));
  // 路径 B 查符号结构(非零项的指数是全偶还是全奇)。两者毫无重叠。
  for (const id of CHALLENGE_ORDER) {
    const fn = SYMMETRY_FUNCTIONS[id]!;
    if (!fn.coefficients) continue;
    it(`${id}:取样判定与指数判定给出同一个答案`, () => {
      expect(classifyBySampling(fn).kind).toBe(classifyByExponents(fn.coefficients!));
    });
  }

  it('系数求值与 at() 一致(否则两条路径其实在算不同的函数)', () => {
    for (const id of CHALLENGE_ORDER) {
      const fn = SYMMETRY_FUNCTIONS[id]!;
      if (!fn.coefficients) continue;
      for (const x of [-2.5, -1, -0.3, 0, 0.7, 1, 2.5]) {
        expect(evaluatePolynomial(fn.coefficients, x), `${id} at x=${x}`).toBeCloseTo(fn.at(x)!, 9);
      }
    }
  });
});

describe('声明的答案要经得起核对', () => {
  for (const id of CHALLENGE_ORDER) {
    it(`${id} 的 expected 与取样判定相符`, () => {
      const fn = SYMMETRY_FUNCTIONS[id]!;
      expect(classifyBySampling(fn).kind).toBe(fn.expected);
    });
  }

  it('|x| 是偶函数(它不是多项式,只有取样这一条路)', () => {
    expect(classifyBySampling(SYMMETRY_FUNCTIONS.absolute!).kind).toBe('even');
    expect(SYMMETRY_FUNCTIONS.absolute!.coefficients).toBeNull();
  });
});

describe('⚠️ neither 必须真的会出现', () => {
  // 提示词给的五个例子(x²、x³、|x|、x、x²+1)里**一个 neither 都没有**。
  // 三选一里永远有一个答案不会是正确答案,学生两三题就学会不选它了 ——
  // 那不是学会了定义,是学会了猜题。
  it('题库里至少有两个 neither', () => {
    const neither = CHALLENGE_ORDER.filter((id) => SYMMETRY_FUNCTIONS[id]!.expected === 'neither');
    expect(neither.length).toBeGreaterThanOrEqual(2);
  });

  it('三个答案都在题库里出现过', () => {
    const kinds = new Set(CHALLENGE_ORDER.map((id) => SYMMETRY_FUNCTIONS[id]!.expected));
    expect([...kinds].sort()).toEqual(['even', 'neither', 'odd']);
  });

  it('x² + x 既不是偶也不是奇,而且两个反例都找得到', () => {
    const result = classifyBySampling(SYMMETRY_FUNCTIONS.squarePlusX!);
    expect(result.kind).toBe('neither');
    expect(result.evenWitness).not.toBeNull();
    expect(result.oddWitness).not.toBeNull();
  });

  it('x³ + 1 是 neither', () => {
    expect(classifyBySampling(SYMMETRY_FUNCTIONS.cubePlusOne!).kind).toBe('neither');
  });
});

describe('⭐ 反例要看得见 —— 不是"第一个撞上的"', () => {
  // 变异测试逼出来的一条。原来取第一个失败样本,x³+1 给出的证据是 x ≈ 0.0075:
  // f(-0.0075) = 0.9999996 vs f(0.0075) = 1.0000004。数学上没错,
  // 屏幕上那两个点**完全重合**,拿它当"看,不相等"只会让人觉得被骗。
  it('每个反例的两个输出在屏幕上分得开', () => {
    for (const id of CHALLENGE_ORDER) {
      const result = classifyBySampling(SYMMETRY_FUNCTIONS[id]!);
      if (result.evenWitness) {
        expect(
          Math.abs(result.evenWitness.fNegX - result.evenWitness.fx),
          `${id} 的偶性反例两个输出几乎相等,看不出区别`,
        ).toBeGreaterThan(0.5);
      }
      if (result.oddWitness) {
        expect(
          Math.abs(result.oddWitness.fNegX + result.oddWitness.fx),
          `${id} 的奇性反例两个输出几乎对称,看不出区别`,
        ).toBeGreaterThan(0.5);
      }
    }
  });

  it('反例的 x 不能挤在原点附近', () => {
    for (const id of CHALLENGE_ORDER) {
      const result = classifyBySampling(SYMMETRY_FUNCTIONS[id]!);
      for (const witness of [result.evenWitness, result.oddWitness]) {
        if (witness) expect(Math.abs(witness.x), `${id} 的反例贴着原点`).toBeGreaterThan(0.3);
      }
    }
  });

  it('反例仍然是货真价实的反例 —— 好看不能以不正确为代价', () => {
    for (const id of CHALLENGE_ORDER) {
      const result = classifyBySampling(SYMMETRY_FUNCTIONS[id]!);
      if (result.evenWitness) expect(result.evenWitness.evenHolds).toBe(false);
      if (result.oddWitness) expect(result.oddWitness.oddHolds).toBe(false);
    }
  });
});

describe('⚠️ x = 0 不能当证据', () => {
  it('在 x = 0 处,任何函数的偶性都"成立"', () => {
    for (const id of CHALLENGE_ORDER) {
      const s = mirrorAt(SYMMETRY_FUNCTIONS[id]!, 0)!;
      expect(s.evenHolds, `${id} 在 0 处竟然不满足偶性,取样逻辑有问题`).toBe(true);
    }
  });

  it('所以判定时不许把 0 算进取样点', () => {
    // ⚠️ 这条原来用 x²+x 试,抓不到问题:它在 0 处 f(0)=0,奇偶两条恰好都"成立",
    //    根本不会被记成证据。要用 x²+1 —— 它在 0 处 f(0)=1 ≠ -f(0),
    //    一旦把 0 算进取样点,给出的"奇性反例"就是 x=0 这个两点重合的废点。
    for (const id of CHALLENGE_ORDER) {
      const result = classifyBySampling(SYMMETRY_FUNCTIONS[id]!);
      for (const witness of [result.evenWitness, result.oddWitness]) {
        if (witness) expect(witness.x, `${id} 拿 x=0 当证据了`).toBeGreaterThan(0);
      }
    }
  });

  it('挑战题的起始 x 必须能区分偶与奇', () => {
    for (const id of CHALLENGE_ORDER) {
      const fn = SYMMETRY_FUNCTIONS[id]!;
      const x = informativeStart(fn);
      expect(x, `${id} 的起始点不能是 0`).not.toBe(0);
      const s = mirrorAt(fn, x)!;
      // neither 的函数两条都不成立,这本身就区分开了
      expect(s.evenHolds && s.oddHolds, `${id} 的起始点两条都成立,什么也说明不了`).toBe(false);
    }
  });
});

describe('取样与格式', () => {
  it('曲线端点精确', () => {
    const pts = sampleCurve(SYMMETRY_FUNCTIONS.cube!, -3, 3, 60);
    expect(pts[0]!.x).toBeCloseTo(-3, 12);
    expect(pts[pts.length - 1]!.x).toBeCloseTo(3, 12);
  });

  it('遍历整个拖动行程都不产生 NaN', () => {
    for (const id of CHALLENGE_ORDER) {
      for (let i = -200; i <= 200; i += 1) {
        const s = mirrorAt(SYMMETRY_FUNCTIONS[id]!, i / 100);
        expect(s === null || (Number.isFinite(s.fx) && Number.isFinite(s.fNegX))).toBe(true);
      }
    }
  });

  it('非有限输入返回 null', () => {
    expect(mirrorAt(SYMMETRY_FUNCTIONS.square!, Number.NaN)).toBeNull();
    expect(mirrorAt(SYMMETRY_FUNCTIONS.square!, Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('showNumber 不产生 -0.00', () => {
    expect(showNumber(-0.0001)).toBe('0.00');
    expect(showNumber(-8)).toBe('-8.00');
  });
});

describe('指数判定的边界', () => {
  it('常数项是偶次,所以常函数是偶函数', () => {
    expect(classifyByExponents([5])).toBe('even');
  });

  it('零多项式按偶处理(它其实既偶又奇,这里不展开)', () => {
    expect(classifyByExponents([0, 0, 0])).toBe('even');
  });

  it('系数为 0 的项不参与判断', () => {
    // 0·x³ 不该把 x² 拖成 neither
    expect(classifyByExponents([0, 0, 1, 0])).toBe('even');
  });

  it('混合次数就是 neither', () => {
    expect(classifyByExponents([0, 1, 1])).toBe('neither');
    expect(classifyByExponents([1, 0, 0, 1])).toBe('neither');
  });
});

describe('⚠️ 反例必须在滑块够得着的范围内', () => {
  // 浏览器实测抓到的:默认 radius = 3,给出的反例是 x = 3.00,
  // 而实验台的滑块最远只到 2.2。界面上还写着"把 x 拖过去看看" —— 学生拖到头也到不了。
  // 给出一个够不着的证据,比不给还糟。
  const REACHABLE = 2.2;

  it('把可达半径传进去之后,每个反例都落在范围内', () => {
    for (const id of CHALLENGE_ORDER) {
      const result = classifyBySampling(SYMMETRY_FUNCTIONS[id]!, REACHABLE);
      for (const witness of [result.evenWitness, result.oddWitness]) {
        if (witness) {
          expect(Math.abs(witness.x), `${id} 的反例 x=${witness.x} 超出滑块行程`).toBeLessThanOrEqual(
            REACHABLE,
          );
        }
      }
    }
  });

  it('缩小半径不会改变分类结论', () => {
    for (const id of CHALLENGE_ORDER) {
      const fn = SYMMETRY_FUNCTIONS[id]!;
      expect(classifyBySampling(fn, REACHABLE).kind, id).toBe(classifyBySampling(fn, 3).kind);
    }
  });

  it('缩小半径后反例仍然看得见', () => {
    for (const id of CHALLENGE_ORDER) {
      const result = classifyBySampling(SYMMETRY_FUNCTIONS[id]!, REACHABLE);
      if (result.evenWitness) {
        expect(Math.abs(result.evenWitness.fNegX - result.evenWitness.fx)).toBeGreaterThan(0.5);
      }
      if (result.oddWitness) {
        expect(Math.abs(result.oddWitness.fNegX + result.oddWitness.fx)).toBeGreaterThan(0.5);
      }
    }
  });
});
