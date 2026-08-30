/**
 * `binomial.ts` 的测试。
 *
 * ⭐⭐ 这一课的落点是「系数 = 方案数」,所以最重的一条断言是:
 *   **枚举出来的方案数**与**递推算出来的系数**在每个 (n, k) 上都相等,
 *   而且每个方案里 b 的个数正好是那一项 b 的次数。
 * 图上画的和公式里写的因此是同一件事,不是两件恰好一致的事。
 */
import { describe, it, expect } from 'vitest';
import {
  EXPONENT_WORDS,
  GENERAL_TEX,
  MAIN_IDEA,
  MAX_N,
  SIGMA_WORDS,
  THEOREM_TEX,
  byCounting,
  byFactorial,
  byPascal,
  chooseTex,
  clampK,
  clampN,
  choose,
  expansionTex,
  exponentsAddUp,
  factorsTex,
  generalTerm,
  grewFromAbove,
  pascalRow,
  pascalTriangle,
  powerTitleTex,
  questionFor,
  selections,
  selectionsMatchTerm,
  slotsOf,
  termOf,
  termsOf,
  valueByPower,
  valueByTerms,
} from './binomial';

describe('⭐⭐ 三条独立路径给出同一个系数', () => {
  it('递推 vs 阶乘 vs 枚举 —— 在每个 (n, k) 上都是同一个整数', () => {
    let checked = 0;
    for (let n = 0; n <= MAX_N; n += 1) {
      for (let k = 0; k <= n; k += 1) {
        const pascal = byPascal(n, k);
        expect(byFactorial(n, k), `factorial @ ${n},${k}`).toBe(pascal);
        expect(byCounting(n, k), `counting @ ${n},${k}`).toBe(pascal);
        expect(Number.isInteger(pascal), `${n},${k} 不是整数`).toBe(true);
        checked += 1;
      }
    }
    // 防空跑
    expect(checked).toBe(((MAX_N + 1) * (MAX_N + 2)) / 2);
  });

  it('⭐⭐ 提示词点名的两问:C(4,2) = 6,C(4,1) = 4', () => {
    expect(choose(4, 2)).toBe(6);
    expect(byCounting(4, 2)).toBe(6);
    expect(selections(4, 2)).toHaveLength(6);

    expect(choose(4, 1)).toBe(4);
    expect(selections(4, 1)).toHaveLength(4);

    // n = 7、k = 3 那一组:35 a⁴b³
    const seven = generalTerm(7, 3);
    expect(seven.coefficient).toBe(35);
    expect(seven.aPower).toBe(4);
    expect(seven.bPower).toBe(3);
    expect(seven.tex).toBe('35a^{4}b^{3}');
  });

  it('越界的 k 给 0,不给 NaN', () => {
    for (const [n, k] of [[4, -1], [4, 5], [-1, 0], [3.5, 1], [4, 1.5]] as const) {
      expect(byPascal(n, k), `${n},${k}`).toBe(0);
      expect(byFactorial(n, k), `${n},${k}`).toBe(0);
      expect(byCounting(n, k), `${n},${k}`).toBe(0);
    }
  });

  it('⭐⭐ 阶乘那条路会给出**错的整数**,而且早得出乎意料 —— 主路径因此走递推', () => {
    // ⚠️ 我原本以为要 n 很大才出问题,随手写了 (40, 20) 去演示 —— 结果那一组
    //    误差恰好抵消,两条路给出同一个数,断言反而失败。真去扫一遍才看清楚:
    //    **第一个分歧在 n = 23**,而那里的系数只有 253。
    //    分母不是"结果太大",是**中间量** 23! 早就冲出了安全整数范围。
    expect(byPascal(23, 2)).toBe(253);
    expect(byFactorial(23, 2)).not.toBe(253);
    expect(byFactorial(23, 2)).toBeCloseTo(253, 9); // 差在小数点后十几位,肉眼看不见
    expect(Number.isInteger(byFactorial(23, 2))).toBe(false);

    // ⚠️ 更狠的一档:171! 在 double 里直接是 Infinity,
    //    于是一个真值只有 14535 的系数被算成**无穷大**。
    expect(byPascal(171, 2)).toBe(14535);
    expect(byFactorial(171, 2)).toBe(Number.POSITIVE_INFINITY);

    // 递推一路都是精确整数
    expect(Number.isSafeInteger(byPascal(40, 20))).toBe(true);
    expect(byPascal(40, 20)).toBe(137846528820);
    expect(choose(23, 2)).toBe(byPascal(23, 2));
  });
});

describe('⭐⭐ 系数就是「b 从哪几个括号来」的方案数', () => {
  it('每个方案里 b 的个数正好是那一项 b 的次数', () => {
    for (let n = 0; n <= MAX_N; n += 1) {
      for (let k = 0; k <= n; k += 1) {
        expect(selectionsMatchTerm(n, k), `${n},${k}`).toBe(true);
      }
    }
  });

  it('方案两两不同,而且都是升序的下标', () => {
    for (let n = 0; n <= MAX_N; n += 1) {
      for (let k = 0; k <= n; k += 1) {
        const all = selections(n, k);
        expect(new Set(all.map((s) => s.join(','))).size, `${n},${k} 有重复方案`).toBe(all.length);
        for (const picked of all) {
          for (let i = 1; i < picked.length; i += 1) {
            expect(picked[i]!, `${n},${k}`).toBeGreaterThan(picked[i - 1]!);
          }
          expect(picked.every((i) => i >= 0 && i < n)).toBe(true);
        }
      }
    }
  });

  it('⭐ n = 4、k = 2 的六个方案就是那六种选法', () => {
    const shown = selections(4, 2).map((s) => slotsOf(4, s).join(''));
    expect(shown).toEqual(['bbaa', 'baba', 'baab', 'abba', 'abab', 'aabb']);
    expect(new Set(shown).size).toBe(6);
    for (const row of shown) {
      expect(row.split('').filter((c) => c === 'b')).toHaveLength(2);
    }
  });

  it('一行里所有 k 的方案数加起来是 2ⁿ —— 每个括号各自二选一', () => {
    for (let n = 0; n <= MAX_N; n += 1) {
      const total = pascalRow(n).reduce((s, c) => s + c, 0);
      expect(total, `n = ${n}`).toBe(2 ** n);
    }
  });

  it('问题的措辞问的是**方案数**,不是「查表」', () => {
    const q = questionFor(4, 2);
    expect(q.answer).toBe(6);
    expect(q.ask).toContain('How many ways');
    expect(q.targetTex).toBe('a^{2}b^{2}');
    expect(MAIN_IDEA.toLowerCase()).toContain('number of ways');
    expect(MAIN_IDEA.toLowerCase()).not.toContain('memoriz');
  });
});

describe('帕斯卡三角', () => {
  it('前六行就是那六行', () => {
    expect(pascalTriangle(6).map((r) => r.join(' '))).toEqual([
      '1', '1 1', '1 2 1', '1 3 3 1', '1 4 6 4 1', '1 5 10 10 5 1',
    ]);
  });

  it('⭐ 每个数都是上面两个之和', () => {
    expect(grewFromAbove()).toBe(true);
    expect(grewFromAbove(12)).toBe(true);
  });

  it('每一行首尾都是 1,而且左右对称', () => {
    for (let n = 0; n <= MAX_N; n += 1) {
      const row = pascalRow(n);
      expect(row).toHaveLength(n + 1);
      expect(row[0]).toBe(1);
      expect(row[n]).toBe(1);
      expect([...row].reverse(), `n = ${n} 不对称`).toEqual([...row]);
    }
  });
});

describe('展开式', () => {
  it('⭐ 逐项求和 vs 直接乘方 —— 对好几组 a、b 都一致', () => {
    for (let n = 0; n <= MAX_N; n += 1) {
      for (const [a, b] of [[1, 1], [2, 3], [5, -2], [0.5, 1.5], [-1, 4]] as const) {
        expect(valueByTerms(n, a, b), `n=${n} a=${a} b=${b}`).toBeCloseTo(valueByPower(n, a, b), 9);
      }
    }
  });

  it('提示词点名的两个展开式', () => {
    expect(expansionTex(2)).toBe('a^{2} + 2ab + b^{2}');
    expect(expansionTex(3)).toBe('a^{3} + 3a^{2}b + 3ab^{2} + b^{3}');
    expect(expansionTex(4)).toBe('a^{4} + 4a^{3}b + 6a^{2}b^{2} + 4ab^{3} + b^{4}');
  });

  it('n = 0 与 n = 1 不写出多余的指数', () => {
    expect(expansionTex(0)).toBe('1');
    expect(expansionTex(1)).toBe('a + b');
    expect(termOf(1, 0).tex).toBe('a');
    expect(termOf(5, 5).tex).toBe('b^{5}');
  });

  it('系数是 1 时不写那个 1', () => {
    expect(termOf(4, 0).tex).toBe('a^{4}');
    expect(termOf(4, 0).tex.startsWith('1')).toBe(false);
    expect(termOf(4, 2).tex).toBe('6a^{2}b^{2}');
  });

  it('⭐ 两个指数永远加到 n', () => {
    for (let n = 0; n <= MAX_N; n += 1) {
      expect(exponentsAddUp(n), `n = ${n}`).toBe(true);
      const terms = termsOf(n);
      // a 的次数从 n 数到 0,b 的次数从 0 数到 n
      expect(terms.map((t) => t.aPower)).toEqual(Array.from({ length: n + 1 }, (_, i) => n - i));
      expect(terms.map((t) => t.bPower)).toEqual(Array.from({ length: n + 1 }, (_, i) => i));
    }
    expect(EXPONENT_WORDS).toBe('The exponents always add to n.');
  });

  it('n 个括号真的摆出 n 个', () => {
    expect(factorsTex(4)).toBe('(a+b)(a+b)(a+b)(a+b)');
    expect(factorsTex(1)).toBe('(a+b)');
    expect(factorsTex(0)).toBe('1');
  });
});

describe('通项与定理', () => {
  it('通项骨架里**没有**具体数字 —— 那是给学生看结构的', () => {
    expect(GENERAL_TEX).toContain('\\binom{n}{k}');
    expect(GENERAL_TEX).not.toMatch(/\d/);
    expect(THEOREM_TEX).toContain('\\sum_{k=0}^{n}');
  });

  it('k 被夹在 0 与 n 之间', () => {
    for (const [n, k] of [[4, -3], [4, 99], [0, 5], [6, 3]] as const) {
      const term = generalTerm(n, k);
      expect(term.k).toBeGreaterThanOrEqual(0);
      expect(term.k).toBeLessThanOrEqual(term.n);
      expect(term.aPower + term.bPower).toBe(term.n);
      expect(Number.isFinite(term.coefficient)).toBe(true);
    }
    expect(generalTerm(Number.NaN, Number.NaN).n).toBe(0);
  });

  it('滑块的夹取', () => {
    expect(clampN(-4)).toBe(0);
    expect(clampN(99)).toBe(MAX_N);
    expect(clampN(Number.NaN)).toBe(2);
    expect(clampK(3, 99)).toBe(3);
    expect(clampK(3, -1)).toBe(0);
  });

  it('sigma 的解释是「每个 k 生一项」,不是吓人的符号', () => {
    expect(SIGMA_WORDS).toContain('one term for every k');
    expect(chooseTex(7, 3)).toBe('\\binom{7}{3}');
    expect(powerTitleTex(5)).toBe('(a+b)^{5}');
  });
});
