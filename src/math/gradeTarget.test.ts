import { describe, expect, it } from 'vitest';
import {
  COMFORTABLE_BELOW, EQUATION_TEX, GOALS, HEADLINE, MAIN_IDEA, SEED_ITEMS, SEED_SETUP, SOLVED_TEX,
  TIGHT_ABOVE, VERDICT_WORD, WEIGHT_SLOP,
  clampScore, countedMean, cutoffOf, finalNeeded, finalNeededByBisection, gradeWith, lockedGrade,
  missBy, spareBy, targetOf, verdictOf, weightSum, weightsBalanced, weightsOf,
  type Item, type Setup,
} from './gradeTarget';

const S = SEED_SETUP;
/** 改一两个字段,别的照抄。 */
const withS = (o: Partial<Setup>): Setup => ({ ...S, ...o });
const item = (score: number, muted = false): Item => ({ name: 'x', score, muted });

describe('the one equation, both directions', () => {
  /**
   * ⭐⭐⭐ 路径② —— 最朴素也最有力的验算:
   *   把解出来的期末分**代回正向公式**,必须正好落在目标上。
   *   反解公式写错一个符号、漏一个权重,这一条立刻红。
   */
  it('⭐⭐⭐ 解出来的期末分代回去,正好等于目标', () => {
    let checked = 0;
    for (const goal of GOALS) {
      for (const wFinal of [5, 20, 25, 40, 60]) {
        for (const mean of [0, 55, 72.5, 88.6667, 100]) {
          const s = withS({ goal, wFinal, wAssess: 100 - 10 - wFinal });
          const need = finalNeeded(s, mean);
          expect(need, `wFinal=${wFinal}`).not.toBeNull();
          expect(gradeWith(s, mean, need!)).toBeCloseTo(targetOf(s), 10);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(GOALS.length * 5 * 5); // 空转防护:循环真的跑满了
  });

  /** ⭐⭐⭐ 路径③ —— 二分正向函数,完全不碰反解公式。 */
  it('⭐⭐⭐ 二分法给出同一个答案', () => {
    let checked = 0;
    for (const wFinal of [5, 25, 50]) {
      for (const mean of [40, 70, 88.6667, 99]) {
        const s = withS({ wFinal, wAssess: 100 - 10 - wFinal });
        const closed = finalNeeded(s, mean)!;
        const searched = finalNeededByBisection(s, mean)!;
        expect(searched, `wFinal=${wFinal} mean=${mean}`).toBeCloseTo(closed, 8);
        checked += 1;
      }
    }
    expect(checked).toBe(12);
  });

  it('⚠️ 两条路径确实是两套算法 —— 二分法只用 gradeWith', () => {
    // 如果二分法内部偷偷调了 finalNeeded,它就不是独立路径了。
    // 这里用一个**反解公式会出错但正向不会**的场景间接验证:
    // 目标高到期末 150 分才够,二分区间必须能跑出 100 以外。
    const s = withS({ wFinal: 25, wAssess: 65, targetA: 89.5 });
    const need = finalNeededByBisection(s, 60)!;
    expect(need).toBeGreaterThan(100);
    expect(gradeWith(s, 60, need)).toBeCloseTo(89.5, 8);
  });

  it('正向公式就是加权平均', () => {
    // 三项都满分,总评就是满分(前提是权重加起来 100)
    expect(gradeWith(S, 100, 100)).toBeCloseTo(100, 10);
    // 三项都 0 分,总评 0
    expect(gradeWith(withS({ assignScore: 0 }), 0, 0)).toBeCloseTo(0, 10);
    // 只有期末满分
    expect(gradeWith(withS({ assignScore: 0 }), 0, 100)).toBeCloseTo(25, 10);
  });
});

describe('the seed numbers', () => {
  /**
   * ⚠️ 期望值在这里**手算一遍**,不是从实现里抄的:
   *   未静音的七条是 83, 91, 85, 88, 92, 88, 88;丢掉最低的 83;
   *   剩下六条和 = 91+85+88+92+88+88 = 532,均分 532/6 = 88.6667。
   *   期末 = (89.5 − 0.10×100 − 0.65×88.6667) / 0.25
   *        = (89.5 − 10 − 57.6333) / 0.25 = 21.8667 / 0.25 = 87.4667
   */
  it('⭐⭐ 默认数据:丢掉 83,均分 532/6,期末要 87.47', () => {
    const c = countedMean(SEED_ITEMS, true);
    expect(c.live).toBe(7);
    expect(c.counted).toBe(6);
    expect(SEED_ITEMS[c.droppedIndex]!.score).toBe(83);
    expect(c.mean).toBeCloseTo(532 / 6, 10);
    expect(finalNeeded(S, c.mean)).toBeCloseTo(21.8666666667 / 0.25, 6);
    expect(finalNeeded(S, c.mean)).toBeCloseTo(87.4666666667, 6);
  });

  it('⚠️ 不丢最低的话,期末要得更多', () => {
    const kept = countedMean(SEED_ITEMS, false);
    expect(kept.counted).toBe(7);
    expect(kept.mean).toBeCloseTo((532 + 83) / 7, 10);
    // 均分低了,期末自然要高 —— 方向必须对
    expect(finalNeeded(S, kept.mean)!).toBeGreaterThan(finalNeeded(S, countedMean(SEED_ITEMS, true).mean)!);
  });
});

describe('⭐⭐⭐ the bug this page was built to fix', () => {
  /**
   * 原稿在"够不到"的时候印的是 `need − 100`,那是**期末卷面**的差距;
   * 问的却是**学期总评**差多少。两者差一个 w_final。
   * 期末占 25% 时,原稿把差距夸大四倍 —— 只差 9 分会被说成差 36 分。
   */
  it('⭐⭐⭐ 差多少算的是总评的分,不是期末卷面的分', () => {
    const s = withS({ wFinal: 25, wAssess: 65, targetA: 89.5 });
    for (const mean of [81.92, 78, 70, 60]) {
      const need = finalNeeded(s, mean)!;
      expect(need).toBeGreaterThan(100); // 前提:确实够不到

      const gap = missBy(s, mean)!;
      // 定义:目标 − 期末满分时的总评
      expect(gap).toBeCloseTo(targetOf(s) - gradeWith(s, mean, 100), 10);
      // 等价写法:权重 × 卷面差距
      expect(gap).toBeCloseTo(0.25 * (need - 100), 10);
      // ⚠️ 而**原稿那个数**正好是它的四倍 —— 这一条把错法本身钉死,
      //    以后谁再写回去,这里就会红。
      expect(need - 100).toBeCloseTo(gap / 0.25, 8);
      expect(need - 100).not.toBeCloseTo(gap, 2);
    }
  });

  it('⭐⭐ 手算的一组:均分 70 时差 9.0 分,不是 36 分', () => {
    const s = withS({ wFinal: 25, wAssess: 65, targetA: 89.5 });
    // 0.10×100 + 0.65×70 + 0.25×100 = 10 + 45.5 + 25 = 80.5;89.5 − 80.5 = 9.0
    expect(gradeWith(s, 70, 100)).toBeCloseTo(80.5, 10);
    expect(missBy(s, 70)).toBeCloseTo(9.0, 10);
    expect(finalNeeded(s, 70)).toBeCloseTo(136, 10);
  });

  it('⚠️ 期末权重越小,同样的卷面差距对总评的影响越小', () => {
    // 这是"为什么不能直接用卷面差"的根本原因,单独钉一条。
    const small = withS({ wFinal: 10, wAssess: 80 });
    const big = withS({ wFinal: 50, wAssess: 40 });
    const gapSmall = missBy(small, 50);
    const gapBig = missBy(big, 50);
    expect(gapSmall).not.toBeNull();
    expect(gapBig).not.toBeNull();
    // 期末占比小 ⇒ 期末救不了你 ⇒ 差得更多
    expect(gapSmall!).toBeGreaterThan(gapBig!);
  });

  it('够得到的时候没有"差多少"这回事', () => {
    expect(missBy(S, 88.6667)).toBeNull();
    expect(missBy(S, 100)).toBeNull();
  });

  it('⭐ 稳了的时候,富余也按总评算', () => {
    const s = withS({ targetA: 60 });
    const spare = spareBy(s, 95)!;
    // 定义:期末 0 分时的总评 − 目标
    expect(spare).toBeCloseTo(gradeWith(s, 95, 0) - 60, 10);
    expect(gradeWith(s, 95, 0)).toBeCloseTo(10 + 0.65 * 95, 10);
    expect(spare).toBeCloseTo(10 + 61.75 - 60, 10);
    // 没稳的时候是 null
    expect(spareBy(S, 88.6667)).toBeNull();
  });
});

describe('countedMean', () => {
  it('⭐⭐ 第二条路径:排序后丢掉第一个,结果一样', () => {
    const sets: Item[][] = [
      [item(83), item(91), item(85)],
      [item(100), item(0), item(50), item(50)],
      [item(70), item(70), item(70)],
      [item(88), item(92, true), item(60), item(75)],
    ];
    for (const items of sets) {
      const got = countedMean(items, true);
      const live = items.filter((i) => !i.muted).map((i) => i.score);
      const bySort = [...live].sort((a, b) => a - b).slice(1);
      const want = bySort.length ? bySort.reduce((a, b) => a + b, 0) / bySort.length : null;
      expect(got.mean).toBeCloseTo(want!, 10);
      expect(got.counted).toBe(bySort.length);
    }
  });

  it('⚠️ 只剩一条时不丢 —— 丢了就算不出均分,那是实现的副作用,不是规则', () => {
    const c = countedMean([item(70), item(90, true)], true);
    expect(c.live).toBe(1);
    expect(c.droppedIndex).toBe(-1);
    expect(c.counted).toBe(1);
    expect(c.mean).toBe(70);
  });

  it('⚠️ 全静音时 mean 是 null,不是 0,也不是 NaN', () => {
    const c = countedMean([item(70, true), item(90, true)], true);
    expect(c.mean).toBeNull();
    expect(c.counted).toBe(0);
    expect(c.live).toBe(0);
    expect(Number.isNaN(c.mean as unknown as number)).toBe(false);
  });

  it('⚠️ 空列表也不炸', () => {
    const c = countedMean([], true);
    expect(c.mean).toBeNull();
    expect(c.droppedIndex).toBe(-1);
  });

  it('⚠️ 并列最低取最靠前的那条,而且是定死的', () => {
    const items = [item(90), item(70), item(70), item(95)];
    const c = countedMean(items, true);
    expect(c.droppedIndex).toBe(1);
    // 跑几次都一样 —— 不许依赖排序的稳定性或遍历顺序
    for (let k = 0; k < 5; k += 1) expect(countedMean(items, true).droppedIndex).toBe(1);
  });

  it('⚠️ 静音的那条永远不会被选中丢掉', () => {
    // 最低分是静音的 0 分;丢掉的必须是未静音里最低的 60
    const items = [item(0, true), item(60), item(80)];
    const c = countedMean(items, true);
    expect(c.droppedIndex).toBe(1);
    expect(c.mean).toBe(80);
  });

  it('关掉丢最低就一条都不丢', () => {
    const c = countedMean([item(10), item(90)], false);
    expect(c.droppedIndex).toBe(-1);
    expect(c.counted).toBe(2);
    expect(c.mean).toBe(50);
  });
});

describe('verdicts', () => {
  it('⭐⭐ 六档都够得着 —— 死界面自查', () => {
    const seen = new Set<string>();
    // no-data:全静音
    seen.add(verdictOf(S, null));
    // final-does-not-count:期末 0 权重
    seen.add(verdictOf(withS({ wFinal: 0, wAssess: 90 }), 80));
    // locked:目标很低
    seen.add(verdictOf(withS({ targetA: 50 }), 95));
    // comfortable / doable / tight:三个不同的均分
    seen.add(verdictOf(S, 95));
    seen.add(verdictOf(S, 88.6667));
    seen.add(verdictOf(S, 84));
    // unreachable:均分太低
    seen.add(verdictOf(S, 60));
    expect([...seen].sort()).toEqual(
      ['comfortable', 'doable', 'final-does-not-count', 'locked', 'no-data', 'tight', 'unreachable'],
    );
  });

  /**
   * ⭐⭐ 变异测试逼出来的:把 `mean === null` 那条判断删掉,41 个变异体里
   *   只有它活了下来 —— 因为单独看,后面 `need === null` 那条会兜住。
   *   可两个条件**同时**成立时(全静音 + 期末不计分)就不一样了:
   *   删掉之后会先返回 "final does not count",而那时候根本没有成绩可言,
   *   页面会显示一个说法却给不出数。没有数据的时候,"没有数据"必须赢。
   */
  it('⭐⭐ 全静音又碰上期末不计分时,"没有数据"优先', () => {
    const noFinal = withS({ wFinal: 0, wAssess: 90 });
    expect(verdictOf(noFinal, null)).toBe('no-data');
    // 而有数据时,才轮到"期末不计分"
    expect(verdictOf(noFinal, 80)).toBe('final-does-not-count');
    // 两个状态都给不出可显示的成绩/分数时,别的读数也必须是 null
    expect(lockedGrade(noFinal, null)).toBeNull();
    expect(missBy(noFinal, null)).toBeNull();
    expect(spareBy(noFinal, null)).toBeNull();
  });

  it('⚠️ 每一档都有一句能显示的话', () => {
    for (const v of Object.keys(VERDICT_WORD)) {
      expect(VERDICT_WORD[v as keyof typeof VERDICT_WORD].length).toBeGreaterThan(4);
    }
    expect(Object.keys(VERDICT_WORD)).toHaveLength(7);
  });

  it('⭐ 分档的界只管措辞,一个数都不改', () => {
    // 同一个均分,改措辞的界,need 必须纹丝不动。
    const need = finalNeeded(S, 88.6667);
    expect(need).toBeCloseTo(87.4666, 3);
    // 界本身的位置关系
    expect(COMFORTABLE_BELOW).toBeLessThan(TIGHT_ABOVE);
    expect(TIGHT_ABOVE).toBeLessThan(100);
    expect(COMFORTABLE_BELOW).toBeGreaterThan(0);
  });

  it('⚠️ 边界两侧确实分到不同的档', () => {
    // 找一个 need 刚好跨过 92 的均分,两侧的档必须不同
    const justOver = withS({ targetA: 89.5 });
    const meanTight = (89.5 - 10 - 0.25 * 93) / 0.65;
    const meanDoable = (89.5 - 10 - 0.25 * 91) / 0.65;
    expect(verdictOf(justOver, meanTight)).toBe('tight');
    expect(verdictOf(justOver, meanDoable)).toBe('doable');
  });

  it('⚠️ need 正好 0 算"稳了",正好 100 不算"够不到"', () => {
    // 端点归哪一边必须说死,否则同一个分数两次刷新显示不同结论。
    const atZero = (89.5 - 10 - 0) / 0.65;
    expect(finalNeeded(S, atZero)).toBeCloseTo(0, 9);
    expect(verdictOf(S, atZero)).toBe('locked');
    const atHundred = (89.5 - 10 - 0.25 * 100) / 0.65;
    expect(finalNeeded(S, atHundred)).toBeCloseTo(100, 9);
    expect(verdictOf(S, atHundred)).toBe('tight');
  });
});

describe('the final not counting', () => {
  it('⭐⭐ 期末 0 权重时:解不出来,但成绩是定死的', () => {
    const s = withS({ wFinal: 0, wAssess: 90 });
    expect(finalNeeded(s, 80)).toBeNull();
    expect(finalNeededByBisection(s, 80)).toBeNull();
    expect(verdictOf(s, 80)).toBe('final-does-not-count');
    // 0.10×100 + 0.90×80 = 10 + 72 = 82
    expect(lockedGrade(s, 80)).toBeCloseTo(82, 10);
  });

  it('⚠️ 期末有权重时 lockedGrade 是 null —— 两个状态不许同时成立', () => {
    expect(lockedGrade(S, 80)).toBeNull();
    expect(lockedGrade(withS({ wFinal: 0 }), null)).toBeNull();
  });

  it('⚠️ 负权重当作不计分处理,不许算出个负数来', () => {
    const s = withS({ wFinal: -10 });
    expect(finalNeeded(s, 80)).toBeNull();
    expect(missBy(s, 80)).toBeNull();
    expect(spareBy(s, 80)).toBeNull();
  });
});

describe('weights', () => {
  it('加起来 100 就不报警', () => {
    expect(weightSum(S)).toBe(100);
    expect(weightsBalanced(S)).toBe(true);
  });

  it('⭐ 加起来不是 100 要能看出来', () => {
    const off = withS({ wAssess: 60 });
    expect(weightSum(off)).toBe(95);
    expect(weightsBalanced(off)).toBe(false);
  });

  it('⚠️ 浮点容差:99.995 还算平,99.9 不算', () => {
    // 不能写 === 100:0.1 + 0.2 那套问题在这里一样会咬人。
    expect(weightsBalanced(withS({ wAssign: 10.005 }))).toBe(true);
    expect(weightsBalanced(withS({ wAssign: 9.9 }))).toBe(false);
    expect(WEIGHT_SLOP).toBeGreaterThan(0);
    expect(WEIGHT_SLOP).toBeLessThan(0.5);
  });

  it('百分数换成小数', () => {
    const w = weightsOf(S);
    expect(w.assign).toBeCloseTo(0.1, 12);
    expect(w.assess).toBeCloseTo(0.65, 12);
    expect(w.final).toBeCloseTo(0.25, 12);
  });
});

describe('targets and clamping', () => {
  it('⭐⭐ 三档都切得动,而且默认分数线是 89.5 / 79.5 / 69.5', () => {
    expect(GOALS).toEqual(['A', 'B', 'C']);
    expect(targetOf(withS({ goal: 'A' }))).toBe(89.5);
    expect(targetOf(withS({ goal: 'B' }))).toBe(79.5);
    expect(targetOf(withS({ goal: 'C' }))).toBe(69.5);
    // `cutoffOf` 查任意一档,`targetOf` 查当前那一档 —— 两者必须一致
    for (const g of GOALS) {
      expect(cutoffOf(S, g)).toBe(targetOf(withS({ goal: g })));
    }
  });

  it('⭐⭐ 目标越低,期末要求越低 —— 三档严格递减', () => {
    // ⚠️ 用精确的 532/6,不用 88.6667 那个截断值:
    //   手算的期望值 7.4666… 是从精确均分来的,拿截断值去对会差在小数第五位,
    //   那是**我抄错了数**,不是代码错了。
    const mean = 532 / 6;
    const needs = GOALS.map((g) => finalNeeded(withS({ goal: g }), mean)!);
    expect(needs[0]).toBeGreaterThan(needs[1]!);
    expect(needs[1]).toBeGreaterThan(needs[2]!);
    // 手算一组:C 档 = (69.5 − 10 − 0.65×88.6667) / 0.25 = 7.4666…
    expect(needs[2]).toBeCloseTo((69.5 - 10 - 0.65 * mean) / 0.25, 9);
    expect(needs[2]).toBeCloseTo(7.4666666667, 6);
  });

  it('⭐ C 档在默认数据下是"稳了" —— 新加的这一档真的会走到别的分支', () => {
    // 加一个选项却只能看到和原来一样的结论,等于没加。
    const c = countedMean(SEED_ITEMS, true);
    expect(verdictOf(withS({ goal: 'C' }), c.mean)).toBe('comfortable');
    expect(verdictOf(withS({ goal: 'A' }), c.mean)).toBe('doable');
  });

  it('⚠️ 分数线之间没有强制的大小关系 —— 模型不管,别有人假设它管', () => {
    // 有人把 C 设成 95 是他自己的事,算出来仍然自洽;
    // 这条写在这里,是防止后来者"顺手"加一个会改变数值的排序假设。
    const odd = withS({ goal: 'C', targetC: 95 });
    expect(targetOf(odd)).toBe(95);
    expect(gradeWith(odd, 80, finalNeeded(odd, 80)!)).toBeCloseTo(95, 9);
  });

  it('⚠️ 分数夹在 0..100', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(105)).toBe(100);
    expect(clampScore(87.5)).toBe(87.5);
    expect(clampScore(0)).toBe(0);
    expect(clampScore(100)).toBe(100);
  });
});

describe('the words on the page', () => {
  it('⭐⭐ 全英文,没有中日韩字符', () => {
    const all = [HEADLINE, MAIN_IDEA, EQUATION_TEX, SOLVED_TEX, ...Object.values(VERDICT_WORD),
      ...SEED_ITEMS.map((i) => i.name)].join(' ');
    expect(all).not.toMatch(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿]/);
  });

  it('⭐ 导语说的是"把式子反过来解",而不是"这是个计算器"', () => {
    expect(MAIN_IDEA.toLowerCase()).toContain('solve');
    expect(HEADLINE.length).toBeGreaterThan(20);
    expect(EQUATION_TEX).toContain('w_');
    expect(SOLVED_TEX).toContain('frac');
  });
});
