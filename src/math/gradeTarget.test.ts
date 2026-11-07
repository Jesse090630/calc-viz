import { describe, expect, it } from 'vitest';
import {
  ARTISTIC_SCORES, COMFORTABLE_BELOW, EQUATION_TEX, EXPLANATION_SCORES, GOALS, GUIDELINES,
  HEADLINE, IN_PROGRESS_TEX, MATH_SCORES, METHODS, METHOD_NAME, PROJECT_TEX, SEED_ITEMS,
  SEED_PROJECT, SEED_SETUP, SOLVED_TEX, TIGHT_ABOVE, VERDICT_WORD, WEIGHT_SLOP,
  type Goal, type Item, type Project, type Setup,
  applyProject, clampEarned, clampPossible, cutoffOf, finalNeeded, finalNeededByBisection,
  SATURATING_SCORE, SCENARIOS, gradeWith, inProgressDisplay, scenarioWith, letterFor, lockedGrade, meanOf, migrateItem,
  missBy, percentOf, projectPoints, projectScore, roundedPercent, scoreNeededFor, spareBy,
  targetOf, verdictOf, weightSum, weightsBalanced, weightsOf,
} from './gradeTarget';

const S = SEED_SETUP;
const withS = (o: Partial<Setup>): Setup => ({ ...S, ...o });
const withP = (o: Partial<Project>): Project => ({ ...SEED_PROJECT, ...o });
const pts = (earned: number, possible = 100, muted = false): Item =>
  ({ name: `${earned}/${possible}`, earned, possible, muted });

/** 常用快捷方式:没有项目时,直接按百分比算类目均分。 */
const plainMean = (items: readonly Item[], dropLowest = true, method = S.method) =>
  meanOf(items, items.map(percentOf), dropLowest, method);

/** 一整套走下来:项目 → 百分比 → 丢最低 → 均分 → 期末要多少。 */
function pipeline(items: readonly Item[], setup: Setup, project: Project) {
  const applied = applyProject(items, project, setup.dropLowest, setup.method);
  const counted = meanOf(items, applied.percents, setup.dropLowest, setup.method);
  return { applied, counted, need: finalNeeded(setup, counted.mean) };
}

/* ════════════════════════════════════════════════════════════════
   教学大纲那条式子,两个方向
   ════════════════════════════════════════════════════════════════ */

describe('the syllabus formula, both directions', () => {
  it('⭐⭐⭐ 路径②:解出来的期末分代回去,正好等于目标', () => {
    let checked = 0;
    for (const goal of GOALS) {
      for (const wFinal of [5, 20, 25, 40, 60]) {
        for (const m of [0, 55, 87.25, 95.25, 100]) {
          const s = withS({ goal, wFinal, wAssess: 100 - 10 - wFinal });
          const need = finalNeeded(s, m);
          expect(need, `wFinal=${wFinal}`).not.toBeNull();
          expect(gradeWith(s, m, need!)).toBeCloseTo(targetOf(s), 10);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(GOALS.length * 5 * 5);
  });

  it('⭐⭐⭐ 路径③:二分正向函数,给出同一个答案', () => {
    let checked = 0;
    for (const wFinal of [5, 25, 50]) {
      for (const m of [40, 70, 87.25, 99]) {
        const s = withS({ wFinal, wAssess: 100 - 10 - wFinal });
        expect(finalNeededByBisection(s, m)!).toBeCloseTo(finalNeeded(s, m)!, 8);
        checked += 1;
      }
    }
    expect(checked).toBe(12);
  });

  it('⚠️ 权重就是 10 / 65 / 25,作业按 100 分算', () => {
    expect(S.wAssign).toBe(10);
    expect(S.wAssess).toBe(65);
    expect(S.wFinal).toBe(25);
    expect(S.assignScore).toBe(100);
    expect(weightsBalanced(S)).toBe(true);
  });

  it('⚠️ A 线是 89.5,不是 90 —— 成绩四舍五入到整数', () => {
    expect(S.targetA).toBe(89.5);
    expect(roundedPercent(89.5)).toBe(90);
    expect(letterFor(89.5)).toBe('A');
    expect(letterFor(89.49)).toBe('B');
  });
});

/* ════════════════════════════════════════════════════════════════
   当前真实处境 —— 交接文档里的数,全部手算核对
   ════════════════════════════════════════════════════════════════ */

describe('⭐⭐⭐ where the grade actually stands', () => {
  /**
   * ⚠️ 期望值在这里**手算一遍**,不是从实现里抄的:
   *   四场测验 83, 91, 85, 90 → (83+91+85+90)/4 = 349/4 = 87.25
   */
  it('⭐⭐ 四场测验的均分是 87.25', () => {
    // ⚠️ 推子里只放**已经进成绩册**的四场;还没考的交给 `scenarioWith`。
    expect(SEED_ITEMS).toHaveLength(4);
    expect(SEED_ITEMS.every((i) => !i.muted)).toBe(true);
    const live = SEED_ITEMS;
    expect(live.map((i) => i.earned)).toEqual([83, 91, 85, 90]);
    expect(plainMean(SEED_ITEMS, false).mean).toBeCloseTo(349 / 4, 10);
    expect(plainMean(SEED_ITEMS, false).mean).toBeCloseTo(87.25, 10);
  });

  it('⭐⭐ PowerSchool 现在显示 88.95 → 89.0(B)', () => {
    // (0.10×100 + 0.65×87.25) / 0.75 = (10 + 56.7125) / 0.75 = 88.95
    const shown = inProgressDisplay(S, 87.25)!;
    expect(shown).toBeCloseTo(88.95, 10);
    expect(roundedPercent(shown)).toBe(89);
    expect(letterFor(shown)).toBe('B');
  });

  it('⚠️ 那个 0.75 是算出来的,不是写死的', () => {
    // 改权重时它必须跟着变,否则就会悄悄给出错的数
    const odd = withS({ wAssign: 20, wAssess: 55 });
    expect(inProgressDisplay(odd, 87.25)).toBeCloseTo((20 * 100 + 55 * 87.25) / 75, 10);
    const other = withS({ wAssign: 30, wAssess: 30, wFinal: 40 });
    expect(inProgressDisplay(other, 80)).toBeCloseTo((30 * 100 + 30 * 80) / 60, 10);
  });

  it('⭐⭐ 丢掉最低之后是 88.67,显示 90.2(A)', () => {
    // 丢 83 → (91+85+90)/3 = 266/3 = 88.6667
    const c = plainMean(SEED_ITEMS, true);
    expect(SEED_ITEMS[c.droppedIndex]!.earned).toBe(83);
    expect(c.mean).toBeCloseTo(266 / 3, 10);
    expect(c.mean).toBeCloseTo(88.6667, 4);
    const shown = inProgressDisplay(S, c.mean)!;
    expect(shown).toBeCloseTo(90.18, 2);
    expect(roundedPercent(shown)).toBe(90);
    expect(letterFor(shown)).toBe('A');
  });

  it('⭐ 丢最低现在值 1.2 个点', () => {
    const without = inProgressDisplay(S, plainMean(SEED_ITEMS, false).mean)!;
    const withDrop = inProgressDisplay(S, plainMean(SEED_ITEMS, true).mean)!;
    expect(withDrop - without).toBeCloseTo(1.23, 2);
  });

  it('⭐ 不做项目、丢最低成立时,期末要 87.5', () => {
    // (89.5 − 10 − 0.65×88.6667) / 0.25 = 21.8667 / 0.25 = 87.4667
    const need = finalNeeded(S, plainMean(SEED_ITEMS, true).mean)!;
    expect(need).toBeCloseTo(87.4667, 4);
  });
});


/* ════════════════════════════════════════════════════════════════
   还剩几场没考 —— 丢最低只能保一场
   ════════════════════════════════════════════════════════════════ */

describe('⭐⭐⭐ scenarios for the tests still to come', () => {
  const twenty = withP({ doing: true, math: 8, artistic: 4, explanation: 2, target: 'auto' });

  it('⭐⭐ 只剩一场、预估 90:期末要 76.85', () => {
    // 项目 +20 把 83 顶到 100 → {100, 91, 85, 90, 90},丢 85 → 371/4 = 92.75
    const sc = scenarioWith(SEED_ITEMS, twenty, S, 90, 1);
    expect(sc.mean).toBeCloseTo(371 / 4, 10);
    expect(sc.need).toBeCloseTo(76.85, 2);
    expect(sc.droppedPercent).toBe(85);
  });

  it('⭐⭐ 还有两场、都预估 90:期末要 78.28 —— 多考一场反而更难', () => {
    // {100, 91, 85, 90, 90, 90},丢 85 → 461/5 = 92.2
    const sc = scenarioWith(SEED_ITEMS, twenty, S, 90, 2);
    expect(sc.mean).toBeCloseTo(461 / 5, 10);
    expect(sc.need).toBeCloseTo(78.28, 2);
    // ⭐ 多出来的那场把那个 100 稀释了,所以期末要求反而上去
    expect(sc.need!).toBeGreaterThan(scenarioWith(SEED_ITEMS, twenty, S, 90, 1).need!);
  });

  /**
   * ⭐⭐⭐ 这一条是整块的要害:**丢最低只能保一场。**
   *   只剩一场时,它考多差都会被丢掉,期末需求有地板(80.1);
   *   一旦变成两场,地板就没了。
   */
  it('⭐⭐⭐ 只剩一场时有地板,剩两场时没有', () => {
    const one = [85, 70, 50, 0].map((p) => scenarioWith(SEED_ITEMS, twenty, S, p, 1).need!);
    for (const n of one) expect(n).toBeCloseTo(80.1, 1);
    for (const n of one) expect(n).toBeCloseTo(one[0]!, 10);

    const two = [85, 70, 50, 0].map((p) => scenarioWith(SEED_ITEMS, twenty, S, p, 2).need!);
    // 两场时每差一分都会落到期末上 —— 严格递增,没有地板
    for (let i = 1; i < two.length; i += 1) expect(two[i]!).toBeGreaterThan(two[i - 1]!);
    /**
     * ⭐⭐⭐ 两场都 70 时是 **89.72**,不是手算的 91.3。
     *   我手推时默认把 +20 加在 83 上(→100,但封顶吃掉了 3 分);
     *   自动挑发现加在**其中一个 70** 上更划算:+20 一分不浪费地变成 90,
     *   而另一个 70 反正要被丢掉。87.8 的均分胜过 87.2。
     *   —— 这正是"落点交给代码试"的理由:人会默认去补最低的那一个。
     */
    expect(two[1]).toBeCloseTo(89.72, 2);
    // 负向对照:硬加在 83 上确实更差
    const forced = scenarioWith(SEED_ITEMS, withP({ ...twenty, target: 0 }), S, 70, 2).need!;
    expect(forced).toBeGreaterThan(two[1]!);
    expect(forced).toBeCloseTo(91.28, 2);
  });

  it('⚠️ 预估分被夹在 0..100', () => {
    expect(scenarioWith(SEED_ITEMS, twenty, S, 150, 1).need)
      .toBeCloseTo(scenarioWith(SEED_ITEMS, twenty, S, 100, 1).need!, 10);
    expect(scenarioWith(SEED_ITEMS, twenty, S, -20, 1).need)
      .toBeCloseTo(scenarioWith(SEED_ITEMS, twenty, S, 0, 1).need!, 10);
  });

  it('⚠️ 两种情形都要算,而且确实不同', () => {
    expect(SCENARIOS).toEqual([1, 2]);
    const a = scenarioWith(SEED_ITEMS, twenty, S, 90, 1).need!;
    const b = scenarioWith(SEED_ITEMS, twenty, S, 90, 2).need!;
    expect(Math.abs(a - b)).toBeGreaterThan(1);
  });

  it('⚠️ extra = 0 时就是现在的状态', () => {
    const none = scenarioWith(SEED_ITEMS, twenty, S, 90, 0);
    const applied = applyProject(SEED_ITEMS, twenty, S.dropLowest, S.method);
    expect(none.mean).toBeCloseTo(meanOf(SEED_ITEMS, applied.percents, S.dropLowest, S.method).mean!, 10);
  });
});

/**
 * ⭐⭐⭐ PowerSchool **今天**显示的数,必须用**没丢最低**的均分算。
 *   丢最低是学期末才发生的 —— 拿丢完的去算"今天显示多少",
 *   会把一个预测说成现状(90 vs 真实的 89)。
 */
describe('⭐⭐⭐ today versus end of term', () => {
  it('⭐⭐⭐ 今天 PowerSchool 是 88.95(89, B),不是 90', () => {
    const noDrop = plainMean(SEED_ITEMS, false).mean!;
    expect(noDrop).toBeCloseTo(87.25, 10);
    const today = inProgressDisplay(S, noDrop)!;
    expect(today).toBeCloseTo(88.95, 10);
    expect(roundedPercent(today)).toBe(89);
    expect(letterFor(today)).toBe('B');
  });

  it('⭐⭐ 丢完之后是 90.18(90, A)—— 那是预测,不是现状', () => {
    const dropped = plainMean(SEED_ITEMS, true).mean!;
    const later = inProgressDisplay(S, dropped)!;
    expect(later).toBeCloseTo(90.18, 2);
    expect(roundedPercent(later)).toBe(90);
    expect(letterFor(later)).toBe('A');
    // 两个数必须不一样 —— 否则这条区分就是空的
    expect(Math.abs(later - inProgressDisplay(S, plainMean(SEED_ITEMS, false).mean!)!)).toBeGreaterThan(1);
  });
});

/* ════════════════════════════════════════════════════════════════
   项目
   ════════════════════════════════════════════════════════════════ */

describe('⭐⭐⭐ the project', () => {
  /**
   * ⚠️ 式子里那个"五条准则的乘积"现在**固定为 1**:Jesse 说过违规拿 −50
   *   对他不会发生,所以不按那种情形规划。五条仍然列在页面上当清单。
   *   这条测试守住的是:那个假设**被写出来了**,而且清单没丢。
   */
  it('⚠️ 五条准则仍然列着,但不再参与计算', () => {
    expect(GUIDELINES).toHaveLength(5);
    for (const g of GUIDELINES) expect(g.text.length).toBeGreaterThan(25);
    // 同样的 SCORE,点数只由 SCORE 决定
    const a = withP({ doing: true, math: 8, artistic: 4, explanation: 2 });
    expect(projectPoints(a)).toBe(20);
    expect(projectPoints({ ...a })).toBe(20);
  });

  it('⭐⭐⭐ 点数恒为 10 的倍数,范围 −50..+50 —— 没有"38 分"', () => {
    const seen = new Set<number>();
    for (const math of MATH_SCORES) {
      for (const artistic of ARTISTIC_SCORES) {
        for (const explanation of EXPLANATION_SCORES) {
          const p = withP({ doing: true, math, artistic, explanation });
          const pt = projectPoints(p);
          // ⚠️ `-50 % 10` 在 JS 里是 `-0`,Object.is 下不等于 0 —— 取绝对值。
          expect(Math.abs(pt % 10), `${math}+${artistic}+${explanation}`).toBe(0);
          expect(pt).toBeGreaterThanOrEqual(-50);
          expect(pt).toBeLessThanOrEqual(50);
          seen.add(pt);
        }
      }
    }
    // 三个分项全是偶数 ⇒ SCORE 偶数 ⇒ 5×SCORE 是 10 的倍数
    expect([...seen].sort((a, b) => a - b)).toEqual([-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]);
  });

  /**
   * ⭐⭐ 唯一真正的决策:够不够到饱和线。
   *   最低那场是 83,离 100% 差 17;点数是 10 的倍数,所以 SCORE 14(+20)
   *   一步顶满,再往上一分钱都买不到东西。
   */
  it('⭐⭐ 饱和线就是 SCORE 14,而且它确实让最低那场刚好顶到 100', () => {
    expect(SATURATING_SCORE).toBe(14);
    expect(scoreNeededFor(20)).toBe(SATURATING_SCORE);
    const lowest = Math.min(...SEED_ITEMS.filter((i) => !i.muted).map(percentOf));
    expect(lowest).toBe(83);
    // 差 17 分,而点数只能是 10 的倍数 ⇒ 20 是第一个够的
    expect(100 - lowest).toBe(17);
    expect(Math.ceil(17 / 10) * 10).toBe(20);
  });

  it('⭐⭐ +20 需要 SCORE 14(math 8 + art 4 + paper 2)', () => {
    expect(scoreNeededFor(20)).toBe(14);
    const aim = withP({ doing: true, math: 8, artistic: 4, explanation: 2 });
    expect(projectScore(aim)).toBe(14);
    expect(projectPoints(aim)).toBe(20);
    // 种子就是这条推荐线
    expect(projectScore(SEED_PROJECT)).toBe(14);
  });

  /**
   * ⭐⭐ 变异测试逼出来的:去掉 `points === 0` 的提前返回之后,
   *   百分比一个都没变(加 0 等于没加),所以数值断言全过 ——
   *   但 `targetIndex` 会被设成某一场,页面于是会写出
   *   "Applied to Precalc",而用户**根本没在做这个项目**。
   */
  it('⭐⭐ 不做项目时,不许声称把点数加在了哪一场上', () => {
    const a = applyProject(SEED_ITEMS, withP({ doing: false }), true, S.method);
    expect(a.points).toBe(0);
    expect(a.targetIndex).toBe(-1);
    expect(a.ties).toEqual([]);
    expect(a.percents).toEqual(SEED_ITEMS.map(percentOf));
  });

  it('⚠️ 不做项目是 0,不是 −50 —— "没交"和"交了但违规"是两回事', () => {
    expect(projectPoints(withP({ doing: false }))).toBe(0);
    expect(projectPoints(withP({ doing: false }))).toBe(0);
    expect(SEED_PROJECT.doing).toBe(false);
  });

  it('⭐⭐⭐ 点数加到某一场的**百分比**上,封顶 100', () => {
    const items = [pts(83), pts(91)];
    const p = withP({ doing: true, math: 12, artistic: 6, explanation: 2, target: 0 }); // +50
    const a = applyProject(items, p, false, S.method);
    expect(a.points).toBe(50);
    expect(a.targetIndex).toBe(0);
    expect(a.percents[0]).toBe(100); // 83 + 50 = 133 → 封到 100
    expect(a.percents[1]).toBe(91);  // 别的场不动
  });

  /**
   * ⚠️ 点数仍然可能是负的 —— SCORE 低于 10 时 `5·S − 50 < 0`。
   *   (违规那条路已经不建模了,但这条还在,所以 0 下限必须守住。)
   */
  it('⚠️ SCORE 很低时点数为负,分数被压下去但不低于 0', () => {
    const weak = withP({ doing: true, math: 0, artistic: 0, explanation: 0, target: 0 });
    expect(projectPoints(weak)).toBe(-50);
    const a = applyProject([pts(83), pts(91)], weak, false, S.method);
    expect(a.percents[0]).toBe(33); // 83 − 50
    const tiny = applyProject([pts(20)], weak, false, S.method);
    expect(tiny.percents[0]).toBe(0); // 20 − 50 → 夹到 0,不是 −30
  });

  /**
   * ⭐⭐⭐ 饱和:最低的那场是 83,离 100% 只差 17 分。
   *   点数是 10 的倍数,所以 +20 一步就顶满 —— 再往上一分钱都买不到东西。
   */
  /**
   * ⭐⭐⭐ 饱和:最低的那场是 83,离 100% 只差 17 分。
   *   点数是 10 的倍数,所以 +20 一步就顶满 —— 再往上一分钱都买不到东西。
   */
  it('⭐⭐⭐ +20 之后就饱和了:+20 / +30 / +40 / +50 结果完全一样', () => {
    /** 造一个**恰好**值这么多点数的项目。 */
    const worth = (points: number): Project => {
      const score = (points + 50) / 5;
      const math = Math.min(12, Math.floor(score / 4) * 4);
      const rest = score - math;
      const artistic = Math.min(6, Math.floor(rest / 2) * 2);
      const explanation = rest - artistic >= 2 ? 2 : 0;
      const p = withP({ doing: true, math, artistic, explanation, target: 'auto' });
      expect(projectPoints(p), `could not build a project worth ${points}`).toBe(points);
      return p;
    };
    const need = (points: number) => pipeline(SEED_ITEMS, S, worth(points)).need!;

    const twenty = need(20);
    for (const more of [30, 40, 50]) {
      expect(need(more), `+${more} should be identical to +20`).toBeCloseTo(twenty, 10);
    }
    // ⚠️ 而 +10 **不**一样 —— 否则上面那条断言是空转的
    expect(need(10)).toBeGreaterThan(twenty + 0.5);
  });
});

/* ════════════════════════════════════════════════════════════════
   点数加到哪一场 —— 交接文档里推错的地方
   ════════════════════════════════════════════════════════════════ */

describe('⭐⭐⭐ which assessment to put the points on', () => {
  const projectWorth = (points: number, target: Project['target'] = 'auto'): Project => {
    const score = (points + 50) / 5;
    const math = Math.min(12, Math.floor(score / 4) * 4);
    const rest = score - math;
    const artistic = Math.min(6, Math.floor(rest / 2) * 2);
    const explanation = rest - artistic >= 2 ? 2 : 0;
    const p = withP({ doing: true, math, artistic, explanation, target });
    expect(projectPoints(p)).toBe(points);
    return p;
  };

  it('⭐⭐ +20 时,加在 83 还是 85 上完全一样(两者都封顶到 100)', () => {
    const items: Item[] = [...SEED_ITEMS, pts(90)]; // 反导数 90
    const a = pipeline(items, S, projectWorth(20, 0)).need!;
    const b = pipeline(items, S, projectWorth(20, 2)).need!;
    expect(b).toBeCloseTo(a, 10);
    // 自动挑出来的也必须是这个最优值,并且把并列的那个报出来
    const auto = applyProject(items, projectWorth(20), S.dropLowest, S.method);
    expect([0, 2]).toContain(auto.targetIndex);
    expect(auto.ties.length).toBeGreaterThan(0);
  });

  /**
   * ⭐⭐⭐ 但这只在**封顶**时成立。
   *   +10 的时候:83→93 会把"被丢的"换成 85(丢 85,留 93);
   *               85→95 则仍然丢 83,留 95、91、90。后者更好。
   */
  it('⭐⭐⭐ +10 时,加在 85 上严格更好 —— "两者一样"只在封顶时成立', () => {
    const items: Item[] = [...SEED_ITEMS, pts(90)];
    const on83 = pipeline(items, S, projectWorth(10, 0)).need!;
    const on85 = pipeline(items, S, projectWorth(10, 2)).need!;
    expect(on85).toBeLessThan(on83);
    // 自动挑的时候不能挑错
    const auto = applyProject(items, projectWorth(10), S.dropLowest, S.method);
    const autoNeed = finalNeeded(S, meanOf(items, auto.percents, S.dropLowest, S.method).mean)!;
    expect(autoNeed).toBeCloseTo(on85, 10);
  });

  /**
   * ⭐⭐⭐ 而当还没考的那场**自己成了被丢的那条**时,又反过来:
   *   这时候 83 留在计分集里,把它顶到 100 才划算。
   */
  it('⭐⭐⭐ 反导数考砸(70)时,+20 要加在 83 上,不是 85 上', () => {
    const items: Item[] = [...SEED_ITEMS, pts(70)];
    const on83 = pipeline(items, S, projectWorth(20, 0)).need!;
    const on85 = pipeline(items, S, projectWorth(20, 2)).need!;
    expect(on83).toBeLessThan(on85);
    expect(on83).toBeCloseTo(80.1, 1);
    const auto = applyProject(items, projectWorth(20), S.dropLowest, S.method);
    expect(auto.targetIndex).toBe(0);
    expect(auto.ties).toEqual([]);
  });

  it('⚠️ 加在 90 或 91 上永远更差', () => {
    const items: Item[] = [...SEED_ITEMS, pts(90)];
    const best = pipeline(items, S, projectWorth(20)).need!;
    for (const bad of [1, 3]) {
      expect(pipeline(items, S, projectWorth(20, bad)).need!).toBeGreaterThan(best);
    }
  });

  it('⚠️ 自动挑永远不比任何一个手选的差', () => {
    const items: Item[] = [...SEED_ITEMS, pts(90)];
    for (const points of [10, 20, 30, 50, -50]) {
      const auto = pipeline(items, S, projectWorth(points)).need!;
      for (let i = 0; i < items.length; i += 1) {
        const manual = pipeline(items, S, projectWorth(points, i)).need!;
        expect(auto, `points=${points} target=${i}`).toBeLessThanOrEqual(manual + 1e-9);
      }
    }
  });

  it('⚠️ 指到一场静音的测验上时,退回自动,而不是算出个错的', () => {
    const items: Item[] = [...SEED_ITEMS, pts(90, 100, true)];
    const a = applyProject(items, projectWorth(20, 4), S.dropLowest, S.method);
    expect(a.targetIndex).not.toBe(4);
    expect(items[a.targetIndex]!.muted).toBe(false);
  });
});

/* ════════════════════════════════════════════════════════════════
   规划表 —— 交接文档里中间几行是错的
   ════════════════════════════════════════════════════════════════ */

describe('⭐⭐⭐ the planning table', () => {
  const projectTwenty = withP({ doing: true, math: 8, artistic: 4, explanation: 2, target: 'auto' });
  /** ⚠️ 种子里只剩已考的四场,所以这里是**追加**一场,不是改第 5 条。 */
  const withTest = (T: number): Item[] => [...SEED_ITEMS, pts(T)];

  /**
   * ⚠️ 期望值全部手算:项目 +20 把 83 顶到 100,
   *   计分集随 T 变化,期末 = (89.5 − 10 − 0.65×均分) / 0.25。
   *
   * ⭐ 交接文档里这张表的**中间几行偏乐观**(最多少算 5.9 分),
   *   斜率用成了 0.26/分,而四项计分时真实斜率是 0.65/分。
   */
  it('⭐⭐⭐ T=100 → 70.3', () => {
    // 计分集 {100, 91, 90, 100} → 381/4 = 95.25
    const { counted, need } = pipeline(withTest(100), S, projectTwenty);
    expect(counted.mean).toBeCloseTo(381 / 4, 10);
    expect(need).toBeCloseTo(70.35, 2);
  });

  it('⭐⭐⭐ T=95 → 73.6(交接文档写的是 71.6)', () => {
    // 计分集 {100, 91, 90, 95} → 376/4 = 94
    const { counted, need } = pipeline(withTest(95), S, projectTwenty);
    expect(counted.mean).toBeCloseTo(94, 10);
    expect(need).toBeCloseTo(73.6, 2);
    expect(need).not.toBeCloseTo(71.6, 1);
  });

  it('⭐⭐⭐ T=90 → 76.8(交接文档写的是 72.9)', () => {
    // 计分集 {100, 91, 90, 90} → 371/4 = 92.75
    const { counted, need } = pipeline(withTest(90), S, projectTwenty);
    expect(counted.mean).toBeCloseTo(371 / 4, 10);
    expect(need).toBeCloseTo(76.85, 2);
    expect(need).not.toBeCloseTo(72.9, 1);
  });

  /**
   * ⭐⭐⭐ 曲线在 **T ≤ 85** 处就变平了,不是交接文档说的 T ≤ 70。
   *   低于 85 时,那场自己成了被丢掉的一条,再低也不影响结果。
   */
  it('⭐⭐⭐ T ≤ 85 时结果完全不变,都是 80.1', () => {
    const flat = [85, 80, 70, 50, 0].map((T) => pipeline(withTest(T), S, projectTwenty).need!);
    for (const f of flat) expect(f).toBeCloseTo(80.1, 1);
    for (const f of flat) expect(f).toBeCloseTo(flat[0]!, 10);
    // 而 86 已经不一样了 —— 分界点确实在 85
    expect(pipeline(withTest(86), S, projectTwenty).need!).toBeLessThan(flat[0]! - 0.5);
  });

  it('⭐⭐ 斜率:T 每高 1 分,期末要求低 0.65 分(四项计分)', () => {
    const a = pipeline(withTest(90), S, projectTwenty).need!;
    const b = pipeline(withTest(100), S, projectTwenty).need!;
    expect((a - b) / 10).toBeCloseTo(0.65, 10);
  });

  it('⭐⭐ 两边同分(T = F)时是 80.1', () => {
    let lo = 0;
    let hi = 120;
    for (let k = 0; k < 200; k += 1) {
      const T = (lo + hi) / 2;
      if (pipeline(withTest(T), S, projectTwenty).need! > T) lo = T;
      else hi = T;
    }
    expect((lo + hi) / 2).toBeCloseTo(80.1, 1);
  });

  it('⭐⭐ 不做项目时:两边同分是 87.9,T=90 时期末要 86.6(文档写的 84.8 是错的)', () => {
    const none = withP({ doing: false });
    let lo = 0;
    let hi = 120;
    for (let k = 0; k < 200; k += 1) {
      const T = (lo + hi) / 2;
      if (pipeline(withTest(T), S, none).need! > T) lo = T;
      else hi = T;
    }
    expect((lo + hi) / 2).toBeCloseTo(87.9, 1);
    const at90 = pipeline(withTest(90), S, none).need!;
    expect(at90).toBeCloseTo(86.6, 1);
    expect(at90).not.toBeCloseTo(84.8, 1);
  });

  it('⭐⭐ 项目值大约 7.8 分的"所需表现"', () => {
    const solve = (p: Project) => {
      let lo = 0;
      let hi = 120;
      for (let k = 0; k < 200; k += 1) {
        const T = (lo + hi) / 2;
        if (pipeline(withTest(T), S, p).need! > T) lo = T;
        else hi = T;
      }
      return (lo + hi) / 2;
    };
    expect(solve(withP({ doing: false })) - solve(projectTwenty)).toBeCloseTo(7.8, 1);
  });

});

/* ════════════════════════════════════════════════════════════════
   类目均分、丢最低、两种算法
   ════════════════════════════════════════════════════════════════ */

describe('meanOf', () => {
  it('⭐⭐ 第二条路径:排序后丢掉第一个,结果一样', () => {
    const sets: Item[][] = [
      [pts(83), pts(91), pts(85)],
      [pts(100), pts(0), pts(50), pts(50)],
      [pts(70), pts(70), pts(70)],
      [pts(88), pts(92, 100, true), pts(60), pts(75)],
    ];
    for (const items of sets) {
      const got = plainMean(items);
      const live = items.filter((i) => !i.muted).map(percentOf);
      const bySort = [...live].sort((a, b) => a - b).slice(1);
      expect(got.mean).toBeCloseTo(bySort.reduce((a, b) => a + b, 0) / bySort.length, 10);
      expect(got.counted).toBe(bySort.length);
    }
  });

  it('⭐⭐⭐ 丢的是百分比最低的那条,不是卷面分最低的那条', () => {
    // 46/50 = 92% 不该因为"46 < 83"而被丢掉
    const items = [pts(83), pts(46, 50), pts(91)];
    expect(plainMean(items).droppedIndex).toBe(0);
    // 最低百分比(75% = 30/40)不等于任何一条卷面分时,照样挑得对
    const tricky = [pts(46, 50), pts(30, 40), pts(90)];
    expect(tricky.some((i) => i.earned === 75)).toBe(false);
    expect(plainMean(tricky).droppedIndex).toBe(1);
  });

  it('⚠️ 只剩一条时不丢;全静音时 mean 是 null 而不是 NaN', () => {
    expect(plainMean([pts(70), pts(90, 100, true)]).droppedIndex).toBe(-1);
    const none = plainMean([pts(70, 100, true)]);
    expect(none.mean).toBeNull();
    expect(Number.isNaN(none.mean as unknown as number)).toBe(false);
    expect(plainMean([]).mean).toBeNull();
  });

  it('⚠️ 并列最低取最靠前的那条,而且是定死的', () => {
    const items = [pts(90), pts(70), pts(70), pts(95)];
    for (let k = 0; k < 5; k += 1) expect(plainMean(items).droppedIndex).toBe(1);
  });

  it('⚠️ 静音的那条永远不会被选中丢掉', () => {
    expect(plainMean([pts(0, 100, true), pts(60), pts(80)]).droppedIndex).toBe(1);
  });

  /**
   * ⭐⭐⭐ 两种算法:每一项满分相同时**逐位相同**。
   *   这是个真的代数恒等式,而两边代码路径完全不同 ——
   *   目前全部测验都是 100 分制,所以这个开关现在不影响任何数字。
   */
  it('⭐⭐⭐ 全是 100 分制时,两种算法给出同一个数', () => {
    let checked = 0;
    for (const drop of [true, false]) {
      for (const m of METHODS) {
        const got = plainMean(SEED_ITEMS, drop, m).mean!;
        expect(got).toBeCloseTo(plainMean(SEED_ITEMS, drop, 'mean-of-grades').mean!, 12);
        checked += 1;
      }
    }
    expect(checked).toBe(4);
  });

  it('⭐⭐ 一旦出现别的分值,两种算法就分开了', () => {
    const mixed = [pts(46, 50), pts(80), pts(80)];
    const a = plainMean(mixed, false, 'mean-of-grades').mean!;
    const b = plainMean(mixed, false, 'total-points').mean!;
    expect(a).toBeCloseTo((92 + 80 + 80) / 3, 10);
    expect(b).toBeCloseTo(((46 + 80 + 80) / 250) * 100, 10);
    expect(Math.abs(a - b)).toBeGreaterThan(1);
  });

  it('⚠️ 两种算法都有名字可显示', () => {
    expect(METHODS).toEqual(['mean-of-grades', 'total-points']);
    for (const m of METHODS) expect(METHOD_NAME[m].length).toBeGreaterThan(5);
    expect(S.method).toBe('mean-of-grades'); // 大纲原文
  });
});

/* ════════════════════════════════════════════════════════════════
   结论、夹取、迁移、文字
   ════════════════════════════════════════════════════════════════ */

describe('verdicts', () => {
  it('⭐⭐ 七档都够得着 —— 死界面自查', () => {
    const seen = new Set<string>();
    seen.add(verdictOf(S, null));
    seen.add(verdictOf(withS({ wFinal: 0, wAssess: 90 }), 80));
    seen.add(verdictOf(withS({ targetA: 50 }), 95));
    seen.add(verdictOf(S, 97));
    seen.add(verdictOf(S, 88.6667));
    seen.add(verdictOf(S, 84));
    seen.add(verdictOf(S, 60));
    expect([...seen].sort()).toEqual(
      ['comfortable', 'doable', 'final-does-not-count', 'locked', 'no-data', 'tight', 'unreachable'],
    );
  });

  it('⚠️ 期末权重为 0 时反解不出来 —— 返回 null,不是 Infinity', () => {
    // 不拦住的话这里会除以 0。`verdictOf` 碰巧会先返回别的档,
    // 所以只测 verdict 是测不到这一条的。
    const noFinal = withS({ wFinal: 0, wAssess: 90 });
    expect(finalNeeded(noFinal, 80)).toBeNull();
    expect(finalNeededByBisection(noFinal, 80)).toBeNull();
    expect(missBy(noFinal, 80)).toBeNull();
    expect(spareBy(noFinal, 80)).toBeNull();
    // 负权重同理
    expect(finalNeeded(withS({ wFinal: -5 }), 80)).toBeNull();
  });

  it('⭐⭐ 全静音又碰上期末不计分时,"没有数据"优先', () => {
    const noFinal = withS({ wFinal: 0, wAssess: 90 });
    expect(verdictOf(noFinal, null)).toBe('no-data');
    expect(verdictOf(noFinal, 80)).toBe('final-does-not-count');
    expect(lockedGrade(noFinal, 80)).toBeCloseTo(0.1 * 100 + 0.9 * 80, 10);
  });

  it('⚠️ need 正好 0 算"稳了",正好 100 不算"够不到"', () => {
    const atZero = (89.5 - 10) / 0.65;
    expect(finalNeeded(S, atZero)).toBeCloseTo(0, 9);
    expect(verdictOf(S, atZero)).toBe('locked');
    const atHundred = (89.5 - 10 - 25) / 0.65;
    expect(finalNeeded(S, atHundred)).toBeCloseTo(100, 9);
    expect(verdictOf(S, atHundred)).toBe('tight');
  });

  it('⭐⭐ 够不到时报的是总评的差距,不是期末卷面的差距', () => {
    const mean = 70;
    expect(finalNeeded(S, mean)).toBeCloseTo(136, 10);
    expect(gradeWith(S, mean, 100)).toBeCloseTo(80.5, 10);
    expect(missBy(S, mean)).toBeCloseTo(9, 10);
    // 把错法本身钉死:谁再写回 need − 100,这条就红
    expect(finalNeeded(S, mean)! - 100).not.toBeCloseTo(missBy(S, mean)!, 2);
  });

  it('⭐ 稳了的时候,富余也按总评算', () => {
    const s = withS({ targetA: 60 });
    expect(spareBy(s, 95)).toBeCloseTo(gradeWith(s, 95, 0) - 60, 10);
    expect(missBy(S, 95)).toBeNull();
    expect(spareBy(S, 88.6667)).toBeNull();
  });

  it('⭐ 分档的界只管措辞', () => {
    expect(COMFORTABLE_BELOW).toBeLessThan(TIGHT_ABOVE);
    expect(TIGHT_ABOVE).toBeLessThan(100);
    expect(Object.keys(VERDICT_WORD)).toHaveLength(7);
    for (const w of Object.values(VERDICT_WORD)) expect(w.length).toBeGreaterThan(4);
  });
});

describe('targets, clamping, migration', () => {
  it('⭐⭐ 三档 89.5 / 79.5 / 69.5,越低期末要求越低', () => {
    expect(GOALS).toEqual(['A', 'B', 'C']);
    expect(GOALS.map((g) => cutoffOf(S, g))).toEqual([89.5, 79.5, 69.5]);
    const needs = GOALS.map((g: Goal) => finalNeeded(withS({ goal: g }), 88.6667)!);
    expect(needs[0]).toBeGreaterThan(needs[1]!);
    expect(needs[1]).toBeGreaterThan(needs[2]!);
  });

  it('⚠️ 得分夹在 0..满分,满分至少 1', () => {
    expect(clampEarned(-5, 100)).toBe(0);
    expect(clampEarned(105, 100)).toBe(100);
    expect(clampEarned(52, 50)).toBe(50);
    expect(clampEarned(Number.NaN, 50)).toBe(0);
    expect(clampPossible(0)).toBe(1);
    expect(clampPossible(-20)).toBe(1);
    expect(clampPossible(Number.NaN)).toBe(1);
  });

  it('⚠️ 权重浮点容差', () => {
    expect(weightSum(S)).toBe(100);
    expect(weightsBalanced(withS({ wAssign: 10.005 }))).toBe(true);
    expect(weightsBalanced(withS({ wAssign: 9.9 }))).toBe(false);
    expect(WEIGHT_SLOP).toBeGreaterThan(0);
    const w = weightsOf(S);
    expect([w.assign, w.assess, w.final]).toEqual([0.1, 0.65, 0.25]);
  });

  it('⚠️ 旧存档迁移:百分制的 score 变成 earned/100,百分比不变', () => {
    expect(migrateItem({ name: 'A', score: 83, muted: false }))
      .toEqual({ name: 'A', earned: 83, possible: 100, muted: false });
    expect(migrateItem({ name: 'P', earned: 46, possible: 50, muted: false }).possible).toBe(50);
    for (const junk of [null, undefined, 42, 'nope', {}, { earned: 'x', possible: 'y' },
      { name: 'z', earned: 5, possible: 0 }]) {
      const it = migrateItem(junk);
      expect(Number.isFinite(percentOf(it)), JSON.stringify(junk)).toBe(true);
      expect(it.possible).toBeGreaterThanOrEqual(1);
      expect(it.name.length).toBeGreaterThan(0);
    }
  });
});

describe('the words on the page', () => {
  it('⭐⭐ 全英文,没有中日韩字符', () => {
    const all = [HEADLINE, EQUATION_TEX, SOLVED_TEX, IN_PROGRESS_TEX, PROJECT_TEX,
      ...Object.values(VERDICT_WORD), ...Object.values(METHOD_NAME),
      ...GUIDELINES.map((g) => g.text), ...SEED_ITEMS.map((i) => i.name)].join(' ');
    expect(all).not.toMatch(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿]/);
  });

  it('⭐ 五条准则都写出来了,而且写的是"做到了什么"', () => {
    expect(GUIDELINES).toHaveLength(5);
    for (const g of GUIDELINES) expect(g.text.length).toBeGreaterThan(25);
    expect(new Set(GUIDELINES.map((g) => g.key)).size).toBe(5);
  });

  it('⭐ 公式里该出现的东西都在', () => {
    expect(EQUATION_TEX).toContain('0.65');
    expect(SOLVED_TEX).toContain('frac');
    expect(IN_PROGRESS_TEX).toContain('0.75');
    expect(PROJECT_TEX).toContain('prod'); // 那个乘积是要害
    expect(HEADLINE.toLowerCase()).toContain('solve');
  });
});
