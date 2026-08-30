/**
 * `geometricSeries.ts` 的测试。
 *
 * ⭐⭐ 两条硬约束:
 *   ① **抵消是结构性的** —— 中间每一列上下都是同一项,只有头尾两块活下来;
 *      `sumBySurvivors` 只看列的结构,却必须和逐项相加、闭形式给出同一个数;
 *   ② **`r = 1` 不许变成 NaN** —— 闭形式在那里是 0/0,必须单独给出 na。
 */
import { describe, it, expect } from 'vitest';
import {
  CANCEL_WORDS,
  FINITE_CAVEAT,
  FINITE_TEX,
  INFINITE_CAVEAT,
  INFINITE_TEX,
  MAX_TERMS,
  R_RANGE,
  SAMPLE_RATIOS,
  blocks,
  clampA,
  clampN,
  clampR,
  converges,
  finiteWorkedTex,
  infiniteSum,
  partialSums,
  regimeOf,
  shiftRows,
  show,
  shrinksBelow,
  sumByAdding,
  sumByFormula,
  sumBySurvivors,
  survivors,
  tailWeight,
  termAt,
  termTex,
  terms,
  termsPlain,
} from './geometricSeries';

const RATIOS = [0.5, -0.5, 0.25, 2, -2, 1.2, 0.9, -0.9, 3];

describe('⭐⭐ 三条独立路径给出同一个有限和', () => {
  it('逐项相加 vs 闭形式 vs 「只剩头尾两项」', () => {
    let checked = 0;
    for (const r of RATIOS) {
      for (const a of [1, 3, -2, 0.5]) {
        for (let n = 1; n <= MAX_TERMS; n += 1) {
          const byAdding = sumByAdding(a, r, n);
          expect(sumByFormula(a, r, n), `formula @ a=${a} r=${r} n=${n}`).toBeCloseTo(byAdding, 9);
          expect(sumBySurvivors(a, r, n), `survivors @ a=${a} r=${r} n=${n}`).toBeCloseTo(byAdding, 9);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it('⭐⭐ 提示词点名的那组:a=3, r=2, n=5 → 3+6+12+24+48 = 93', () => {
    expect(terms(3, 2, 5)).toEqual([3, 6, 12, 24, 48]);
    expect(termsPlain(3, 2, 5)).toBe('3 + 6 + 12 + 24 + 48');
    expect(sumByAdding(3, 2, 5)).toBe(93);
    expect(sumByFormula(3, 2, 5)).toBe(93);
    expect(sumBySurvivors(3, 2, 5)).toBe(93);
    // 公式那一行写出来的就是这个算式
    expect(finiteWorkedTex(3, 2, 5)).toContain('93');
  });

  it('⚠️ 抓得住写错的公式(分母写成 1 + r)', () => {
    const wrong = (a: number, r: number, n: number) => (a * (1 - r ** n)) / (1 + r);
    expect(wrong(3, 2, 5)).not.toBe(93);
  });
});

describe('⭐⭐ r = 1 不许变成 NaN', () => {
  it('先证明这个坑存在:闭形式在 r = 1 处是 0/0', () => {
    const naive = (a: number, r: number, n: number) => (a * (1 - r ** n)) / (1 - r);
    expect(naive(3, 1, 5)).toBeNaN();
  });

  it('而模块给出 n·a', () => {
    for (const a of [1, 3, -2, 0.5]) {
      for (let n = 1; n <= MAX_TERMS; n += 1) {
        expect(sumByFormula(a, 1, n), `a=${a} n=${n}`).toBe(n * a);
        expect(sumByAdding(a, 1, n)).toBeCloseTo(n * a, 9);
        expect(sumBySurvivors(a, 1, n)).toBe(n * a);
        expect(Number.isFinite(sumByFormula(a, 1, n))).toBe(true);
      }
    }
    expect(finiteWorkedTex(3, 1, 5)).toBe('S_{5} = 5 \\times 3 = 15');
  });

  it('公式旁边那句 "for r ≠ 1" 说的就是这件事', () => {
    expect(FINITE_CAVEAT).toBe('for r \\ne 1');
    expect(FINITE_TEX).toContain('1 - r');
  });
});

describe('⭐⭐ 移位相减:中间全部成对', () => {
  it('n + 1 列里,只有头尾两列不成对', () => {
    for (let n = 1; n <= MAX_TERMS; n += 1) {
      const rows = shiftRows(n);
      expect(rows).toHaveLength(n + 1);
      const lonely = rows.filter((row) => !row.cancels);
      expect(lonely, `n = ${n}`).toHaveLength(2);
      // 第一列只有上式,最后一列只有下式
      expect(rows[0]!.top).toBe(0);
      expect(rows[0]!.bottom).toBeNull();
      expect(rows[n]!.top).toBeNull();
      expect(rows[n]!.bottom).toBe(n);
    }
  });

  it('⭐ 中间每一列上下是**同一项** —— 这才是它们相减为零的理由', () => {
    for (let n = 2; n <= MAX_TERMS; n += 1) {
      for (const row of shiftRows(n)) {
        if (!row.cancels) continue;
        expect(row.top, `n = ${n}`).toBe(row.bottom);
        // 数值上也确实抵消
        for (const r of RATIOS) {
          expect(termAt(2, r, row.top!) - termAt(2, r, row.bottom!)).toBe(0);
        }
      }
    }
  });

  it('活下来的正好是 +a 与 −arⁿ', () => {
    for (let n = 1; n <= MAX_TERMS; n += 1) {
      const left = survivors(n);
      expect(left).toHaveLength(2);
      expect(left[0]).toEqual({ power: 0, sign: 1 });
      expect(left[1]).toEqual({ power: n, sign: -1 });
    }
  });

  it('那句解说说的是「上下各出现一次」,不是「记住会消掉」', () => {
    expect(CANCEL_WORDS).toContain('once on top and once underneath');
    expect(CANCEL_WORDS.toLowerCase()).not.toContain('memoriz');
  });
});

describe('无穷', () => {
  it('|r| < 1 时给出 a/(1−r),否则给 null', () => {
    expect(infiniteSum(1, 0.5)).toBe(2);
    expect(infiniteSum(3, 0.5)).toBe(6);
    expect(infiniteSum(1, -0.5)).toBeCloseTo(2 / 3, 12);
    for (const r of [1, -1, 1.2, -2, 5]) {
      expect(infiniteSum(1, r), `r = ${r}`).toBeNull();
    }
    expect(infiniteSum(Number.NaN, 0.5)).toBeNull();
    expect(infiniteSum(1, Number.NaN)).toBeNull();
  });

  it('⭐⭐ 提示词点名的那串部分和:0.5、0.75、0.875、0.9375、0.96875 → 1', () => {
    // ⚠️ 提示词写的是 1 + ½ + ¼ + …,而它的和是 2;
    //    那串 0.5、0.75… 是从 ½ 起步的那一条(a = ½)。两条都摆出来才不打架。
    const halves = partialSums(0.5, 0.5, 5);
    expect(halves.map((s) => Number(s.toFixed(5)))).toEqual([0.5, 0.75, 0.875, 0.9375, 0.96875]);
    expect(infiniteSum(0.5, 0.5)).toBe(1);

    const fromOne = partialSums(1, 0.5, 5);
    expect(fromOne.map((s) => Number(s.toFixed(5)))).toEqual([1, 1.5, 1.75, 1.875, 1.9375]);
    expect(infiniteSum(1, 0.5)).toBe(2);
  });

  it('⭐ 剩下的差距每走一步就乘以 |r| —— 这是收敛的**结构**,不是一句形容', () => {
    // ⚠️ 我原先随手写了「12 项之后差距小于 0.35」。那条对 r = 0.9 是错的:
    //    极限是 10,12 项才走到 7.18,还差 2.82 —— 而这**完全正确**,
    //    r 越接近 1 收敛越慢。用一个拍脑袋的阈值去判收敛,判的是我的直觉不是数学。
    //    真正成立的是:S − Sₙ = a·rⁿ/(1−r),所以相邻两个差距的比**恰好**是 |r|。
    for (const r of [0.5, -0.5, 0.9, 0.25, 0.99]) {
      const limit = infiniteSum(1, r)!;
      const sums = partialSums(1, r, MAX_TERMS);
      let previous = Number.POSITIVE_INFINITY;
      let moved = 0;
      const ratios: number[] = [];
      for (const s of sums) {
        const gap = Math.abs(s - limit);
        expect(gap, `r = ${r} 走远了`).toBeLessThanOrEqual(previous + 1e-12);
        if (gap < previous) moved += 1;
        if (Number.isFinite(previous)) ratios.push(gap / previous);
        previous = gap;
      }
      expect(moved, `r = ${r} 的部分和没动过`).toBeGreaterThan(5);
      for (const ratio of ratios) expect(ratio, `r = ${r}`).toBeCloseTo(Math.abs(r), 9);
    }
  });

  it('⭐ 走**够多**步之后差距是真的会变小的 —— 步数由 |r| 决定,不是由我猜', () => {
    for (const r of [0.5, -0.5, 0.9, 0.99]) {
      const limit = infiniteSum(1, r)!;
      const need = shrinksBelow(r, 1e-3)!;
      const sums = partialSums(1, r, need + 1);
      // ⚠️ 剩下的差距是 `|a·rⁿ / (1−r)|` —— 尾巴要**再除以 (1−r)**。
      //    r = 0.99 时那是放大一百倍:rⁿ 小到 10⁻³,差距却还有 0.1。
      //    拿一个固定的 10⁻² 去卡,卡的是"极限有多大",不是"收敛了没有"。
      const allowed = 1e-3 * Math.abs(limit) * 1.001;
      expect(Math.abs(sums[need]! - limit), `r = ${r} 走了 ${need} 步`).toBeLessThanOrEqual(allowed);
    }
    // r 越接近 1,要走的步数越多
    expect(shrinksBelow(0.99, 1e-3)!).toBeGreaterThan(shrinksBelow(0.5, 1e-3)!);
  });

  it('⭐⭐ |r| < 1 **恰好**是让 rⁿ → 0 的条件 —— 用构造证明', () => {
    for (const r of [0.5, -0.5, 0.9, 0.99]) {
      for (const bound of [1e-2, 1e-4, 1e-8]) {
        const n = shrinksBelow(r, bound);
        expect(n, `r = ${r} bound = ${bound}`).not.toBeNull();
        expect(tailWeight(r, n!)).toBeLessThan(bound);
      }
    }
    // 而 |r| ≥ 1 时任何界都下不去
    for (const r of [1, -1, 1.2, -3]) {
      expect(shrinksBelow(r, 0.5), `r = ${r}`).toBeNull();
    }
  });

  it('界越紧,需要走得越远', () => {
    let previous = 0;
    for (const bound of [1e-1, 1e-3, 1e-6, 1e-9]) {
      const n = shrinksBelow(0.5, bound)!;
      expect(n).toBeGreaterThan(previous);
      previous = n;
    }
  });

  it('无穷公式旁边那句 "for |r| < 1"', () => {
    expect(INFINITE_CAVEAT).toBe('for |r| < 1');
    expect(INFINITE_TEX).toContain('\\frac{a}{1 - r}');
  });
});

describe('五种脾气', () => {
  it('提示词点名的五个 r 各归各的类', () => {
    expect(SAMPLE_RATIOS).toEqual([0.5, -0.5, 1, 1.2, -1]);
    expect(regimeOf(0.5).behaviour).toBe('converges');
    expect(regimeOf(-0.5).behaviour).toBe('alternates');
    expect(regimeOf(1).behaviour).toBe('constant');
    expect(regimeOf(1.2).behaviour).toBe('grows');
    expect(regimeOf(-1).behaviour).toBe('oscillates');
  });

  it('⭐ 分类与 converges 一致,而且五种说法互不相同', () => {
    for (const r of [...SAMPLE_RATIOS, 0.9, -0.99, 2, -2, 0.01]) {
      expect(regimeOf(r).converges, `r = ${r}`).toBe(converges(r));
    }
    const words = SAMPLE_RATIOS.map((r) => regimeOf(r).words);
    expect(new Set(words).size).toBe(5);
  });

  it('⭐ r = 1 与 r = −1 都不收敛,但**不是同一种**不收敛', () => {
    // 一个是和一路涨,一个是和在两个值之间跳。混成一句话就把区别抹掉了。
    expect(regimeOf(1).behaviour).not.toBe(regimeOf(-1).behaviour);
    expect(partialSums(1, 1, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(partialSums(1, -1, 6)).toEqual([1, 0, 1, 0, 1, 0]);
  });

  it('r = 1.2 的项一项比一项大', () => {
    const list = terms(1, 1.2, 8);
    for (let i = 1; i < list.length; i += 1) {
      expect(Math.abs(list[i]!)).toBeGreaterThan(Math.abs(list[i - 1]!));
    }
  });

  it('r = −0.5 的项变号但越来越小', () => {
    const list = terms(1, -0.5, 8);
    for (let i = 1; i < list.length; i += 1) {
      expect(Math.sign(list[i]!), `${i}`).toBe(-Math.sign(list[i - 1]!));
      expect(Math.abs(list[i]!)).toBeLessThan(Math.abs(list[i - 1]!));
    }
  });
});

describe('画块与取值', () => {
  it('每块带着自己的部分和,而且第一块的比例是 1', () => {
    const list = blocks(3, 0.5, 5);
    expect(list).toHaveLength(5);
    expect(list[0]!.fraction).toBeCloseTo(1, 12);
    expect(list.map((b) => b.value)).toEqual([3, 1.5, 0.75, 0.375, 0.1875]);
    expect(list[4]!.running).toBeCloseTo(sumByAdding(3, 0.5, 5), 12);
    for (const block of list) {
      expect(Number.isFinite(block.fraction)).toBe(true);
      expect(block.fraction).toBeGreaterThan(0);
    }
  });

  it('⚠️ a = 0 不会让比例变成 NaN', () => {
    for (const block of blocks(0, 0.5, 4)) {
      expect(Number.isFinite(block.fraction)).toBe(true);
    }
  });

  it('⭐ 滑块够得到提示词点名的 r = 2', () => {
    // ⚠️ 第一版上界是 1.6,那组 a=3 r=2 n=5 → 93 的例子在页面上做不出来。
    expect(clampR(2)).toBe(2);
    expect(R_RANGE.max).toBeGreaterThanOrEqual(2);
    expect(R_RANGE.min).toBeLessThanOrEqual(-2);
    expect(sumByFormula(3, clampR(2), 5)).toBe(93);
  });

  it('滑块的夹取', () => {
    expect(clampR(99)).toBe(2.5);
    expect(clampR(-99)).toBe(-2.5);
    expect(clampR(Number.NaN)).toBe(0.5);
    expect(clampN(0)).toBe(1);
    expect(clampN(99)).toBe(MAX_TERMS);
    expect(clampN(Number.NaN)).toBe(5);
    expect(clampA(0)).toBe(1);
    expect(clampA(Number.NaN)).toBe(1);
    expect(clampA(-2.5)).toBe(-2.5);
  });

  it('项的写法:a、ar、ar²…', () => {
    expect(termTex(0)).toBe('a');
    expect(termTex(1)).toBe('ar');
    expect(termTex(4)).toBe('ar^{4}');
    expect(show(0.9375)).toBe('0.9375');
  });
});
