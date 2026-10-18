import { describe, expect, it } from 'vitest';
import {
  ANSWER_TOL, CHECK_NOTE, COINCIDENCE, DIFF_H, HEADLINE, MAIN_IDEA, ORDER, PAIRS, PROBLEMS,
  TOOL_NAME, WRONG_FLOOR,
  areaCheck, areaOf, checkAt, curveOf, pairOf, problemOf, problemsOf, routeFor, slopeOf, valueAt,
  worstGap, plotWindow, openAt, MAX_SQUASH, OPEN_INSET,
} from './chooseIntegral';

/**
 * 变异测试记录:50 个变异体,杀死 48,剩下两个是**等价变异体**。
 * 记在这里,下次跑的时候不用重新想一遍:
 *
 *   ① `checkAt` 里 `answerGap <= ANSWER_TOL` 改成 `<`。
 *      偏差恰好等于 1e-7 是零测集事件,实测十道题的偏差都在 1e-10 量级。
 *      而且两种写法的语义选择("刚好等于容差算不算吻合")都站得住。
 *
 *   ② `worstGap` 里 `if (d > worst)` 改成 `>=`。
 *      求最大值的扫描对此免疫 —— 相等时更不更新,最大值都一样。
 *
 * ⚠️ **更正**:我一度把"`worstGap` 把端点重新跳掉"也记成了等价变异体。
 *   它不是 —— 下面那条 `⚠️ 端点也要扫` 用一个偏差严格递增的人造例子
 *   (|2x| 在 [0,1] 上只在右端点取到 2)把它杀掉了。跳过端点会得到 1.99。
 *   写"这是等价变异体"之前得先真的跑一遍,不能凭感觉。
 */

/**
 * ⭐⭐⭐ 这一份测试的两条主线,就是这一课教的两种验算:
 *   ① 把答案求导回去,逐点比(差商)。
 *   ② 对被积函数数值积分,和 F(b)−F(a) 比(Simpson)。
 *   两条互不相干:一条逐点、靠差商;一条整体、靠求积。都过才算对。
 */

describe('every stated answer really is an antiderivative', () => {
  it('⭐⭐⭐ 路径①:求导回去,逐点压在被积函数上', () => {
    for (const p of PROBLEMS) {
      expect(worstGap(p.F, p.f, p.safe[0], p.safe[1]), p.id).toBeLessThan(ANSWER_TOL);
    }
  });

  /**
   * ⭐⭐⭐ 这一条抓的是一个**测不出来的假检查**。
   *
   *   `valueAt(p, 'answer', x)` 必须真的去求导 `p.F`。可是正确答案求导回去
   *   本来就等于被积函数,所以要是这个函数偷懒直接 `return p.f(x)`,
   *   上面每一条断言都照样通过 —— 页面上那两条线也照样严丝合缝地压住。
   *   于是整页最核心的那句话("看,求导回去就是它")变成了**无法被证伪的**:
   *   画的是被积函数本身,和答案对不对毫无关系。
   *
   *   区别在于:差商是算出来的,闭式是写出来的,两者相差几个 ULP。
   *   所以"处处逐位相同"恰恰说明没在求导。
   *
   * ⚠️ 不能要求"每个点都不同":奇函数在 x = 0 上两边都正好是 0,
   *   `x e^{x²}`、`x/(x²+1)`、`2x/√(9−x²)` 这三道在 0 点上确实逐位相同。
   *   所以要求的是"存在不同的点",不是"处处不同"。
   */
  it('⭐⭐⭐ answer 那条线是求导算出来的,不是把被积函数抄了一遍', () => {
    for (const p of PROBLEMS) {
      const [lo, hi] = p.safe;
      let differsSomewhere = false;
      let checked = 0;
      for (let i = 1; i < 40; i += 1) {
        const x = lo + ((hi - lo) * i) / 40;
        checked += 1;
        if (valueAt(p, 'answer', x) !== p.f(x)) differsSomewhere = true;
        // 同时:它还得和被积函数一致 —— 只是不逐位相同
        expect(Math.abs(valueAt(p, 'answer', x) - p.f(x)), p.id).toBeLessThan(ANSWER_TOL);
      }
      expect(checked).toBe(39);
      expect(
        differsSomewhere,
        `${p.id}: the "answer" curve is bit-for-bit the integrand everywhere, so nothing is being differentiated`,
      ).toBe(true);
    }
  });

  it('⭐⭐⭐ 路径②:数值积分 = F(b) − F(a)', () => {
    for (const p of PROBLEMS) {
      const { numeric, byAntiderivative } = areaCheck(p);
      // Simpson 在这些光滑函数上,2000 段的误差远小于 1e-9;
      // 这里只要求 1e-6,目的是抓"答案写错了",不是量求积的精度。
      expect(Math.abs(numeric - byAntiderivative), p.id).toBeLessThan(1e-6);
    }
  });

  it('⚠️ 两条路径不许同时都靠差商 —— 否则只是同一条路走两遍', () => {
    // 用一个已知的积分核对 Simpson 自己:∫₀^1 x² dx = 1/3,与差商无关。
    expect(areaOf((x) => x * x, 0, 1)).toBeCloseTo(1 / 3, 12);
    expect(areaOf(Math.sin, 0, Math.PI)).toBeCloseTo(2, 10);
  });
});

describe('every wrong answer really is wrong', () => {
  /**
   * ⭐⭐⭐ 空转防护。整页的教学效果都压在这一条上:
   *   如果某个 `wrong` 其实是对的,那一格画出来两条线重合,
   *   学生学到的就是"这两种方法都行"—— 和要教的东西正好相反。
   */
  it('⭐⭐⭐ 每个 wrong 求导回去都明显偏离被积函数', () => {
    for (const p of PROBLEMS) {
      expect(
        worstGap(p.wrong.at, p.f, p.safe[0], p.safe[1]),
        `${p.id}: the "wrong" answer is not wrong`,
      ).toBeGreaterThan(WRONG_FLOOR);
    }
  });

  /**
   * ⚠️ 阈值要两头都钉住,只钉一头是钉不住的:
   *   `WRONG_FLOOR` 调成 0,上面那条照样全过(偏差都是正数),
   *   可那时候这道防护什么都不要求了 —— 一个其实对的"错答案"能大摇大摆走过去。
   *   所以既要求它**不小到没意义**,也要求它**不大到贴着实测值**。
   */
  it('⚠️ WRONG_FLOOR 两头都钉住:不许小到没意义,也不许贴着实测值', () => {
    const gaps = PROBLEMS.map((p) => worstGap(p.wrong.at, p.f, p.safe[0], p.safe[1]));
    const smallest = Math.min(...gaps);
    // 下界:阈值本身必须要求一个"肉眼看得见"的偏差。
    expect(WRONG_FLOOR).toBeGreaterThanOrEqual(0.01);
    // 上界:实测最小偏差至少是阈值的 5 倍,否则就是调到刚好能过。
    expect(smallest).toBeGreaterThan(WRONG_FLOOR * 5);
  });

  it('⚠️ 错答案和对答案不是同一个式子', () => {
    for (const p of PROBLEMS) {
      expect(p.wrong.tex, p.id).not.toBe(p.answerTex);
    }
  });

  it('⭐ 每个错答案都说清了错在哪一步,而不是"算错了"', () => {
    for (const p of PROBLEMS) {
      expect(p.wrong.mistake.length, p.id).toBeGreaterThan(30);
      // 空话清单:只说"错了"没有信息量。
      for (const empty of ['made a mistake', 'did it wrong', 'incorrect answer']) {
        expect(p.wrong.mistake.toLowerCase(), p.id).not.toContain(empty);
      }
    }
  });
});

describe('the pairs really are minimal pairs', () => {
  it('⭐⭐ 五对,每对两道,一共十道,id 不重复', () => {
    expect(PAIRS).toHaveLength(5);
    expect(PROBLEMS).toHaveLength(10);
    const ids = PROBLEMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(10);
    expect(new Set(PAIRS.map((p) => p.id)).size).toBe(5);
  });

  it('⭐⭐⭐ 一对里两道题必须用不同的工具 —— 否则就不叫"选哪个方法"', () => {
    for (const pair of PAIRS) {
      expect(pair.a.tool, pair.id).not.toBe(pair.b.tool);
    }
  });

  it('⭐⭐ 一对里两道题的外形必须真的接近', () => {
    // 外形接近"用什么量"是个真问题。这里用一个粗但不骗人的度量:
    // 去掉空白之后,两个积分的 TeX 长度不该差一倍以上。
    // 差一倍以上就说明它们看起来根本不像,这一对就没有存在的理由。
    for (const pair of PAIRS) {
      const la = pair.a.tex.replace(/\s/g, '').length;
      const lb = pair.b.tex.replace(/\s/g, '').length;
      const ratio = Math.max(la, lb) / Math.min(la, lb);
      expect(ratio, `${pair.id}: ${la} vs ${lb}`).toBeLessThan(2);
    }
  });

  it('⭐⭐ 三对的错答案就是同伴的答案 —— 这正是这一页要治的病', () => {
    const swapped = PAIRS.filter(
      (pair) => pair.a.wrong.tex === pair.b.answerTex && pair.b.wrong.tex === pair.a.answerTex,
    );
    // 「上面是什么」「一个符号」「1/x 在不在」这三对
    expect(swapped.map((p) => p.id)).toEqual(['top', 'sign', 'log']);
  });

  it('⚠️ 每对都带一个判定问题,而且是个问句', () => {
    for (const pair of PAIRS) {
      expect(pair.test.length, pair.id).toBeGreaterThan(20);
      expect(pair.test.trim().endsWith('?'), `${pair.id}: ${pair.test}`).toBe(true);
    }
  });

  it('⚠️ 「为什么用这个工具」必须真的回答那个判定问题,不是复述工具名', () => {
    for (const p of PROBLEMS) {
      expect(p.because.length, p.id).toBeGreaterThan(60);
      expect(p.work.length, p.id).toBeGreaterThanOrEqual(3);
    }
  });

  it('⭐ 五种工具一个都不缺,十道题覆盖全部五种', () => {
    const used = new Set(PROBLEMS.map((p) => p.tool));
    expect([...used].sort()).toEqual(
      ['by-parts', 'partial-fractions', 'standard-form', 'trig-sub', 'u-sub'],
    );
    // 每种工具都有名字可显示
    for (const tool of used) expect(TOOL_NAME[tool].length).toBeGreaterThan(5);
  });
});

describe('safe intervals are strictly inside the domain', () => {
  it('⭐⭐ 被积函数和两个答案在整段上都给得出有限数', () => {
    for (const p of PROBLEMS) {
      const [lo, hi] = p.safe;
      expect(hi, p.id).toBeGreaterThan(lo);
      let checked = 0;
      for (let i = 0; i <= 60; i += 1) {
        const x = lo + ((hi - lo) * i) / 60;
        // ⚠️ 差商要算到 x ± DIFF_H,所以定义域得在 safe 段再外扩一点点。
        for (const v of [p.f(x), p.F(x), p.wrong.at(x), p.F(x + DIFF_H), p.F(x - DIFF_H)]) {
          expect(Number.isFinite(v), `${p.id} at x=${x}`).toBe(true);
        }
        checked += 1;
      }
      expect(checked).toBe(61); // 空转防护:循环真的跑了
    }
  });

  it('⚠️ 定义域有讲究的那几道必须写出来', () => {
    // 不是每道都需要,但凡是会在某处失效的,页面必须说。
    const mustSay = ['one-over-x2-minus-1', 'two-x-over-root', 'root-alone', 'ln-over-x', 'ln-alone'];
    for (const id of mustSay) {
      expect(problemOf(id).domain, id).toBeTruthy();
    }
  });
});

describe('checkAt', () => {
  it('⭐⭐⭐ 对答案在每道题的每个采样点上都吻合', () => {
    for (const p of PROBLEMS) {
      const [lo, hi] = p.safe;
      let seen = 0;
      for (let i = 1; i < 40; i += 1) {
        const c = checkAt(p, lo + ((hi - lo) * i) / 40);
        expect(c.answerMatches, `${p.id} at x=${c.x}`).toBe(true);
        expect(c.answerGap).toBeLessThan(ANSWER_TOL);
        seen += 1;
      }
      expect(seen).toBe(39);
    }
  });

  it('⭐⭐ 错答案在大多数点上不吻合,但确实存在碰巧吻合的点', () => {
    // ⭐ 这一条是 UI 必须说实话的理由:两条曲线总要交叉,
    //   交叉点上"错答案也对上了"。页面不能让人在那个点上以为错答案是对的。
    const anyCoincidence: string[] = [];
    for (const p of PROBLEMS) {
      const [lo, hi] = p.safe;
      let off = 0;
      let on = 0;
      for (let i = 0; i <= 400; i += 1) {
        const c = checkAt(p, lo + ((hi - lo) * i) / 400);
        if (c.wrongMatchesHere) on += 1; else off += 1;
      }
      expect(off, `${p.id}: the wrong answer matches everywhere`).toBeGreaterThan(300);
      if (on > 0) anyCoincidence.push(p.id);
    }
    // 至少有一道题存在交叉点 —— 否则 `wrongMatchesHere` 这个字段就是死代码,
    // 页面上那句提醒也永远不会出现。
    expect(anyCoincidence.length).toBeGreaterThan(0);
  });

  it('⚠️ gap 是绝对值,永远非负', () => {
    for (const p of PROBLEMS) {
      const c = checkAt(p, (p.safe[0] + p.safe[1]) / 2);
      expect(c.answerGap).toBeGreaterThanOrEqual(0);
      expect(c.wrongGap).toBeGreaterThanOrEqual(0);
      expect(c.answerGap).toBe(Math.abs(c.answerSlope - c.integrand));
      expect(c.wrongGap).toBe(Math.abs(c.wrongSlope - c.integrand));
    }
  });

  it('⚠️ 判对错用 ANSWER_TOL,判"画面上看起来一样"用 COINCIDENCE —— 两个数不是一回事', () => {
    expect(COINCIDENCE).toBeGreaterThan(ANSWER_TOL);
    // 对答案的误差远在 ANSWER_TOL 以下,所以它当然也在 COINCIDENCE 以下;
    // 反过来不成立,这才是两个常数分开的意义。
    const p = problemOf('x-exp-x2');
    const c = checkAt(p, 0.5);
    expect(c.answerMatches).toBe(true);
    expect(c.answerGap).toBeLessThan(COINCIDENCE);
  });
});

describe('valueAt and curveOf', () => {
  it('三条曲线各取各的东西', () => {
    const p = problemOf('x-exp-x');
    expect(valueAt(p, 'integrand', 0.7)).toBe(p.f(0.7));
    expect(valueAt(p, 'answer', 0.7)).toBeCloseTo(p.f(0.7), 7);
    expect(valueAt(p, 'wrong', 0.7)).not.toBeCloseTo(p.f(0.7), 2);
  });

  it('⚠️ 采样点落在 safe 段上,端点刚好是端点', () => {
    for (const p of PROBLEMS) {
      const pts = curveOf(p, 'integrand', 24);
      expect(pts).toHaveLength(25);
      expect(pts[0]!.x).toBeCloseTo(p.safe[0], 12);
      expect(pts[24]!.x).toBeCloseTo(p.safe[1], 12);
      for (const q of pts) expect(Number.isFinite(q.y)).toBe(true);
    }
  });

  it('⭐ 对答案那条和被积函数那条逐点重合;错答案那条不重合', () => {
    for (const p of PROBLEMS) {
      const f = curveOf(p, 'integrand', 80);
      const good = curveOf(p, 'answer', 80);
      const bad = curveOf(p, 'wrong', 80);
      let maxGood = 0;
      let maxBad = 0;
      for (let i = 0; i < f.length; i += 1) {
        // ⚠️ 端点上差商可能不准(定义域边界),跳过首尾。
        if (i === 0 || i === f.length - 1) continue;
        maxGood = Math.max(maxGood, Math.abs(good[i]!.y - f[i]!.y));
        maxBad = Math.max(maxBad, Math.abs(bad[i]!.y - f[i]!.y));
      }
      expect(maxGood, p.id).toBeLessThan(ANSWER_TOL);
      expect(maxBad, p.id).toBeGreaterThan(WRONG_FLOOR);
    }
  });
});

describe('plotWindow', () => {
  it('⭐⭐ 被积函数和正确答案整条都在窗口里', () => {
    for (const p of PROBLEMS) {
      const { yMin, yMax } = plotWindow(p);
      for (const curve of ['integrand', 'answer'] as const) {
        for (const q of curveOf(p, curve)) {
          expect(q.y, `${p.id} ${curve} at x=${q.x}`).toBeGreaterThanOrEqual(yMin);
          expect(q.y, `${p.id} ${curve} at x=${q.x}`).toBeLessThanOrEqual(yMax);
        }
      }
    }
  });

  /**
   * ⭐⭐⭐ 死界面自查 —— 这一页最要紧的一条。
   *
   *   整页的说服力都在"错答案那条线肉眼看得出岔开"。可窗口是算出来的,
   *   万一某道题的错答案整条都落在框外(或者反过来,和正确答案近到画不开),
   *   那一格画面上就什么都没发生 —— 测试照样全绿,学生照样什么都没学到。
   *   所以要求:每道题都存在**既在窗口里、又离被积函数足够远**的采样点。
   *   "足够远"用窗口高度的 8% 衡量 —— 那是画面上分得开的尺度,不是数值尺度。
   */
  it('⭐⭐⭐ 每道题的错答案都在画面里真的岔开了', () => {
    for (const p of PROBLEMS) {
      const { yMin, yMax } = plotWindow(p);
      const height = yMax - yMin;
      const f = curveOf(p, 'integrand');
      const bad = curveOf(p, 'wrong');
      let visibleAndApart = 0;
      for (let i = 0; i < f.length; i += 1) {
        const y = bad[i]!.y;
        const inside = y >= yMin && y <= yMax;
        const apart = Math.abs(y - f[i]!.y) > height * 0.08;
        if (inside && apart) visibleAndApart += 1;
      }
      // 至少十分之一的采样点要同时满足,否则屏幕上看不出名堂。
      expect(
        visibleAndApart,
        `${p.id}: the wrong curve is never both on screen and visibly apart`,
      ).toBeGreaterThan(f.length / 10);
    }
  });

  it('⚠️ 错答案再离谱也不许把正确答案压扁', () => {
    // ∫√(9−x²)dx 是这条的来由:错答案值域 ±9,被积函数只有 1.66~3。
    const p = problemOf('root-alone');
    const fy = curveOf(p, 'integrand').map((q) => q.y);
    const h = Math.max(...fy) - Math.min(...fy);
    const { yMin, yMax } = plotWindow(p);
    // 封顶之后高度就**恰好**是 MAX_SQUASH × h,再加两侧各 8% 边距。
    // 写成等式而不是不等式 —— 不等式在这里刚好贴在边界上,等于没约束。
    expect(yMax - yMin).toBeCloseTo(MAX_SQUASH * h * 1.16, 9);
    // 而且确实触发了封顶 —— 否则这条常数是死的
    const wy = curveOf(p, 'wrong').map((q) => q.y);
    expect(Math.max(...wy) - Math.min(...wy)).toBeGreaterThan(MAX_SQUASH * h);
  });

  it('⚠️ 窗口非空,上界严格大于下界', () => {
    for (const p of PROBLEMS) {
      const { yMin, yMax } = plotWindow(p);
      expect(yMax, p.id).toBeGreaterThan(yMin);
      expect(Number.isFinite(yMin) && Number.isFinite(yMax), p.id).toBe(true);
    }
  });
});

describe('openAt — 打开页面时游标停在哪', () => {
  /**
   * ⭐⭐⭐ 这一条是截图逼出来的。
   *   原来用区间中点,而 `∫x·e^{x²}dx` 的中点正好是 x = 0,
   *   三条曲线在那里一起等于 0 —— 页面一打开四个读数全是 0.0000,
   *   还挂着"这个点上碰巧也对上了"的提醒。单元测试全绿,
   *   因为"读数正确"和"读数有用"是两回事。
   */
  it('⭐⭐⭐ 开局那个点上,错答案必须明显地错', () => {
    for (const p of PROBLEMS) {
      const c = checkAt(p, openAt(p));
      expect(c.wrongGap, `${p.id}: the page opens on a point where nothing is visible`)
        .toBeGreaterThan(WRONG_FLOOR);
      // 而且开局绝不能落在"碰巧对上"的点上
      expect(c.wrongMatchesHere, `${p.id}: opens on a coincidence`).toBe(false);
    }
  });

  it('⭐⭐ 开局那个点上,错答案的圆点在画面里 —— 否则还是什么都看不见', () => {
    for (const p of PROBLEMS) {
      const { yMin, yMax } = plotWindow(p);
      const c = checkAt(p, openAt(p));
      expect(c.wrongSlope, p.id).toBeGreaterThanOrEqual(yMin);
      expect(c.wrongSlope, p.id).toBeLessThanOrEqual(yMax);
    }
  });

  it('⚠️ 停在定义域里', () => {
    for (const p of PROBLEMS) {
      const x = openAt(p);
      expect(x, p.id).toBeGreaterThanOrEqual(p.safe[0]);
      expect(x, p.id).toBeLessThanOrEqual(p.safe[1]);
    }
  });

  /**
   * ⭐⭐ 也是截图逼出来的第二条:第一版不限范围,于是 `x·e^{x²}` 开在
   *   **左端点** x = −1.2 上 —— 手柄有一半露在画框外面,而且只能往一个方向拖。
   */
  it('⭐⭐ 开局的手柄离两端都有距离,不贴边', () => {
    for (const p of PROBLEMS) {
      const [lo, hi] = p.safe;
      const x = openAt(p);
      const inset = (hi - lo) * OPEN_INSET;
      expect(x, `${p.id} opens on the left edge`).toBeGreaterThanOrEqual(lo + inset - 1e-9);
      expect(x, `${p.id} opens on the right edge`).toBeLessThanOrEqual(hi - inset + 1e-9);
    }
  });

  it('⚠️ 它在允许的范围里取的是最大偏差,不是随便一个够大的点', () => {
    for (const p of PROBLEMS) {
      const { yMin, yMax } = plotWindow(p);
      const best = Math.abs(checkAt(p, openAt(p)).wrongGap);
      const [lo, hi] = p.safe;
      for (let i = Math.round(200 * OPEN_INSET); i <= 200 - Math.round(200 * OPEN_INSET); i += 1) {
        const x = lo + ((hi - lo) * i) / 200;
        const c = checkAt(p, x);
        if (c.wrongSlope < yMin || c.wrongSlope > yMax) continue;
        expect(c.wrongGap, `${p.id} at x=${x} beats the opening point`).toBeLessThanOrEqual(best + 1e-9);
      }
    }
  });
});

describe('worstGap', () => {
  it('⭐ 斜率处处对上时是 0', () => {
    // g = x³/3 的导数就是 x²
    expect(worstGap((x) => (x * x * x) / 3, (x) => x * x, -2, 2)).toBeLessThan(1e-8);
  });

  it('⭐⭐ 取的是最大偏差,不是最小、也不是最后一个', () => {
    // g' = 2x,f = 0 ⇒ 偏差 |2x|,在 [1, 3] 上最大是 6(x = 3 的端点上)。
    expect(worstGap((x) => x * x, () => 0, 1, 3)).toBeCloseTo(6, 6);
    // 反过来:偏差在中间最大的情形 —— g' = 0,f = 1 − x² ⇒ 偏差 |1 − x²|,
    // 在 [-0.5, 0.5] 上最大是 1(x = 0),端点上只有 0.75。
    expect(worstGap(() => 0, (x) => 1 - x * x, -0.5, 0.5)).toBeCloseTo(1, 6);
  });

  it('⭐⭐ 偏差取绝对值 —— 差成负的也算差', () => {
    // g' = 0,f = 5 ⇒ slope − f 恒等于 −5。不取绝对值就会得到 0。
    expect(worstGap(() => 0, () => 5, 0, 1)).toBeCloseTo(5, 9);
    // 同一个大小、符号相反,结果必须一样。
    expect(worstGap(() => 0, () => -5, 0, 1)).toBeCloseTo(5, 9);
  });

  it('⚠️ 端点也要扫 —— 最大偏差经常就在端点上', () => {
    // 偏差 |2x| 在 [0, 1] 上严格递增,最大值只在右端点取到。
    // 跳过端点的话,200 段的扫描会得到 1.99 而不是 2。
    expect(worstGap((x) => x * x, () => 0, 0, 1)).toBeCloseTo(2, 6);
  });

  it('空转防护:n 给 0 时不许静悄悄返回 0', () => {
    // n = 0 时循环只跑 i = 0 这一次,扫的是左端点 —— 这是合理的退化行为,
    // 但必须真的扫了那一个点,而不是一个点都没扫。
    expect(worstGap(() => 0, () => 7, 2, 5, 0)).toBeCloseTo(7, 9);
  });
});

describe('slopeOf and areaOf', () => {
  it('差商在已知导数上对得上', () => {
    expect(slopeOf((x) => x * x * x, 2)).toBeCloseTo(12, 7);
    expect(slopeOf(Math.sin, 0)).toBeCloseTo(1, 9);
    expect(slopeOf(Math.exp, 1)).toBeCloseTo(Math.E, 7);
  });

  it('⚠️ Simpson 的段数是奇数时要补成偶数,而不是算出个错数', () => {
    // 公式本身要求偶数段。给奇数不该静悄悄给出错的结果。
    const odd = areaOf((x) => x * x, 0, 1, 101);
    const even = areaOf((x) => x * x, 0, 1, 102);
    expect(odd).toBeCloseTo(1 / 3, 12);
    expect(odd).toBe(even);
  });

  it('⚠️ 常数函数的积分就是底乘高 —— 最笨的那条也要对', () => {
    expect(areaOf(() => 3, 1, 5)).toBeCloseTo(12, 12);
  });
});

describe('routeFor', () => {
  it('⭐ 有课的工具给链接,没课的诚实留空', () => {
    expect(routeFor('u-sub')).toBe('u-substitution');
    expect(routeFor('by-parts')).toBe('by-parts');
    // ⚠️ 站内还没有这两课。不假装有。
    expect(routeFor('partial-fractions')).toBeNull();
    expect(routeFor('trig-sub')).toBeNull();
    expect(routeFor('standard-form')).toBeNull();
  });

  it('⭐⭐ 死界面自查:两种分支都能从这十道题里走到', () => {
    const withLesson = PROBLEMS.filter((p) => routeFor(p.tool) !== null);
    const without = PROBLEMS.filter((p) => routeFor(p.tool) === null);
    expect(withLesson.length).toBeGreaterThan(0);
    expect(without.length).toBeGreaterThan(0);
  });

  it('⚠️ 给出来的 route 必须是 App.tsx 里真有的那两个名字', () => {
    // 写错一个字母就是个死链,而死链在这个项目里是黑屏的近亲。
    for (const p of PROBLEMS) {
      const r = routeFor(p.tool);
      if (r !== null) expect(['u-substitution', 'by-parts']).toContain(r);
    }
  });
});

describe('the order of questions', () => {
  it('⭐⭐ 六步,编号连续', () => {
    expect(ORDER).toHaveLength(6);
    expect(ORDER.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('⭐⭐⭐ 先问便宜的 —— 换元必须排在三角换元前面', () => {
    // 第四对那个坑(2x/√(9−x²))就是违反这个顺序造成的:
    // 看见根号就上三角换元,而换元一行就完了。顺序本身是教学内容。
    const sub = ORDER.findIndex((s) => s.tool === 'u-sub');
    const trig = ORDER.findIndex((s) => s.tool === 'trig-sub');
    const table = ORDER.findIndex((s) => s.tool === 'standard-form');
    expect(table).toBeLessThan(sub);
    expect(sub).toBeLessThan(trig);
  });

  it('⭐⭐ 最后一步是"求导验算",而且它不对应任何工具', () => {
    const last = ORDER[ORDER.length - 1]!;
    expect(last.tool).toBeNull();
    expect(last.ask.toLowerCase()).toContain('differentiate');
  });

  it('⚠️ 每一步都既有问句也有"然后怎么办"', () => {
    for (const s of ORDER) {
      expect(s.ask.trim().endsWith('?'), `step ${s.n}`).toBe(true);
      expect(s.then.length, `step ${s.n}`).toBeGreaterThan(30);
    }
  });

  it('⭐ 五种工具在这六步里各出现恰好一次', () => {
    const tools = ORDER.map((s) => s.tool).filter((t): t is NonNullable<typeof t> => t !== null);
    expect(tools).toHaveLength(5);
    expect(new Set(tools).size).toBe(5);
  });
});

describe('the words on the page', () => {
  it('⭐⭐ 标题和导语都是英文,没有中日韩字符', () => {
    // 中文只许出现在代码注释里。这条在 `#/rotating-disks` 上栽过一次。
    const all = [HEADLINE, MAIN_IDEA, CHECK_NOTE,
      ...PAIRS.flatMap((p) => [p.title, p.look, p.test, p.trap ?? '']),
      ...PROBLEMS.flatMap((p) => [p.because, p.answerTex, p.wrong.mistake, p.domain ?? '', ...p.work]),
      ...ORDER.flatMap((s) => [s.ask, s.then]),
      ...Object.values(TOOL_NAME),
    ].join(' ');
    expect(all).not.toMatch(/[　-〿぀-ヿ㐀-䶿一-鿿豈-﫿]/);
  });

  it('⚠️ 不出现开发者才看得懂的词', () => {
    const all = `${HEADLINE} ${MAIN_IDEA} ${CHECK_NOTE}`.toLowerCase();
    for (const jargon of ['function f', 'const', 'null', 'array', 'tex']) {
      expect(all).not.toContain(jargon);
    }
  });

  it('⭐ 导语说出了那个判定问题,而不只是"有五种方法"', () => {
    expect(MAIN_IDEA.toLowerCase()).toContain('differentiate');
    expect(HEADLINE.length).toBeGreaterThan(20);
  });
});

describe('lookups', () => {
  it('按 id 取得到,取不到就抛', () => {
    expect(pairOf('exp').a.id).toBe('x-exp-x2');
    expect(problemOf('ln-alone').tool).toBe('by-parts');
    expect(() => pairOf('nope')).toThrow(/no such pair/);
    expect(() => problemOf('nope')).toThrow(/no such problem/);
  });

  it('problemsOf 给出的就是 a 和 b,顺序是 a 先', () => {
    for (const pair of PAIRS) {
      expect(problemsOf(pair)).toEqual([pair.a, pair.b]);
    }
  });
});
