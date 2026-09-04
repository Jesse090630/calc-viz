/**
 * ⚠️ 这个文件里的期望值,**没有一个是从 `optimization.ts` 里跑出来的**。
 *   最优点全部用**不含微积分的**办法另证一遍:
 *     · 栅栏 —— 抛物线的顶点公式 `−b/(2a)`,代数,不求导;
 *     · 切角 —— 均值不等式:`2x + (10−x) + (10−x) = 20` 是常数,
 *               乘积在三项相等时最大,于是 `2x = 10−x`;
 *     · 易拉罐 —— 均值不等式:`2πr² + 1000/r + 1000/r ≥ 3·(2π·10⁶)^{1/3}`,
 *               等号在 `2πr² = 1000/r` 时取到。
 *   拿被测模块自己的输出当期望,等于自己验自己。
 */
import { describe, expect, it } from 'vitest';
import {
  SCENARIOS,
  answerIsAtEndpoint,
  candidates,
  clampX,
  criticalInside,
  criticalOutside,
  noCriticalPointAtAll,
  optimumByDerivative,
  optimumByScan,
  pathsAgree,
  recipeAnswer,
  recipeShortfall,
  recipeWouldSucceed,
  sampleBeyond,
  sampleF,
  scenarioOf,
  show,
  outsideSpan,
  yRange,
} from './optimization';

const fence = scenarioOf('fence');
const narrow = scenarioOf('narrow');
const box = scenarioOf('box');
const can = scenarioOf('can');
const localpeak = scenarioOf('localpeak');
const flat = scenarioOf('flatbottom');

describe('候选名单 = 导数零点 ∪ 端点', () => {
  it('⭐ 端点一个都不能少 —— 漏掉端点正是这一课要讲的错', () => {
    for (const s of SCENARIOS) {
      const xs = candidates(s).map((c) => c.x);
      expect(xs, `${s.id} 漏了左端点`).toContain(s.domain[0]);
      expect(xs, `${s.id} 漏了右端点`).toContain(s.domain[1]);
    }
  });

  it('候选按 x 排好序,且互不重复', () => {
    for (const s of SCENARIOS) {
      const xs = candidates(s).map((c) => c.x);
      expect(xs).toEqual([...xs].sort((a, b) => a - b));
      expect(new Set(xs).size).toBe(xs.length);
    }
  });

  it('⭐ 零点正好压在端点上时只算一次,并且记成端点', () => {
    // 切角那题 V' 的零点之一是 x = 10,而 10 恰好是右端点
    expect(box.criticalRoots).toContain(10);
    const at10 = candidates(box).filter((c) => c.x === 10);
    expect(at10).toHaveLength(1);
    expect(at10[0]!.origin).toBe('endpoint');
  });

  it('端点没有凹凸判定 —— 二阶导在那里说了不算', () => {
    for (const s of SCENARIOS) {
      for (const c of candidates(s)) {
        if (c.origin === 'endpoint') expect(c.shape).toBeNull();
        else expect(c.shape).not.toBeNull();
      }
    }
  });

  it('候选的 value 就是 f 在该点的值', () => {
    for (const s of SCENARIOS) {
      for (const c of candidates(s)) expect(c.value).toBeCloseTo(s.f(c.x), 9);
    }
  });
});

describe('界外的零点必须被丢掉', () => {
  it('窄地块:唯一的零点 25 在界外', () => {
    expect(criticalInside(narrow)).toEqual([]);
    expect(criticalOutside(narrow)).toEqual([25]);
    expect(noCriticalPointAtAll(narrow)).toBe(true);
  });

  it('宽地块:同一个零点在界内', () => {
    expect(criticalInside(fence)).toEqual([25]);
    expect(criticalOutside(fence)).toEqual([]);
    expect(noCriticalPointAtAll(fence)).toBe(false);
  });

  it('⭐ 两个情景用的是同一个函数 —— 只有定义域不同', () => {
    for (const x of [0, 3, 7.5, 12, 15]) {
      expect(narrow.f(x)).toBe(fence.f(x));
      expect(narrow.fPrime(x)).toBe(fence.fPrime(x));
    }
    expect(narrow.criticalRoots).toEqual(fence.criticalRoots);
    expect(narrow.domain).not.toEqual(fence.domain);
  });

  it('界内 ∪ 界外 = 全部零点,且两者不相交', () => {
    for (const s of SCENARIOS) {
      const all = [...criticalInside(s), ...criticalOutside(s)].sort((a, b) => a - b);
      expect(all).toEqual([...s.criticalRoots].sort((a, b) => a - b));
    }
  });

  it('端点上的零点算界内(闭区间)', () => {
    expect(criticalInside(box)).toContain(10);
  });
});

describe('⭐⭐ 最优点 —— 用不含微积分的办法另证一遍', () => {
  it('栅栏:抛物线顶点公式给出 x = 25,面积 1250', () => {
    // A(x) = −2x² + 100x,顶点 x = −b/(2a) = −100/(2·−2) = 25
    const vertex = -100 / (2 * -2);
    expect(vertex).toBe(25);
    const best = optimumByDerivative(fence);
    expect(best.x).toBeCloseTo(25, 9);
    expect(best.value).toBeCloseTo(25 * 50, 9);      // 1250
    expect(best.origin).toBe('critical');
    expect(best.shape).toBe('peak');
  });

  it('⭐ 窄地块:同一个函数,答案却在端点,面积 1050', () => {
    const best = optimumByDerivative(narrow);
    expect(best.x).toBe(15);
    expect(best.value).toBeCloseTo(15 * 70, 9);      // 1050
    expect(best.origin).toBe('endpoint');
    expect(answerIsAtEndpoint(narrow)).toBe(true);
  });

  it('⭐ 而且窄地块上面积一路在涨 —— 所以最大值只可能在右端', () => {
    // A' = 100 − 4x,在 [0, 15] 上恒正(最小值 100 − 60 = 40 > 0)
    let up = 0;
    for (let x = 0; x < 15; x += 0.25) {
      expect(narrow.f(x + 0.25)).toBeGreaterThan(narrow.f(x));
      up += 1;
    }
    expect(up, '循环空转了').toBeGreaterThan(50);
  });

  it('切角:均值不等式给出 x = 10/3,体积 16000/27', () => {
    // V = 4x(10−x)² = 2·[2x·(10−x)·(10−x)],而 2x + (10−x) + (10−x) = 20 恒定,
    // 三项相等时乘积最大 ⇒ 2x = 10 − x ⇒ x = 10/3
    const byAmGm = 10 / 3;
    const bound = 2 * (20 / 3) ** 3;                  // = 16000/27
    expect(bound).toBeCloseTo(16000 / 27, 9);
    const best = optimumByDerivative(box);
    expect(best.x).toBeCloseTo(byAmGm, 9);
    expect(best.value).toBeCloseTo(bound, 6);
    expect(best.origin).toBe('critical');
    expect(best.shape).toBe('peak');
  });

  it('易拉罐:均值不等式给出 r³ = 1000/(2π),表面积 3·(2π·10⁶)^{1/3}', () => {
    // S = 2πr² + 1000/r + 1000/r ≥ 3·(2πr²·1000/r·1000/r)^{1/3} = 3(2π·10⁶)^{1/3}
    const bound = 3 * Math.cbrt(2 * Math.PI * 1e6);
    const byAmGm = Math.cbrt(1000 / (2 * Math.PI));   // 等号条件 2πr² = 1000/r
    const best = optimumByDerivative(can);
    expect(best.x).toBeCloseTo(byAmGm, 9);
    expect(best.value).toBeCloseTo(bound, 6);
    expect(best.origin).toBe('critical');
    expect(best.shape).toBe('valley');                // 求的是最小
  });

  it('⭐ 求最小的情景不能被当成求最大', () => {
    expect(can.goal).toBe('min');
    const best = optimumByDerivative(can);
    for (const c of candidates(can)) expect(c.value).toBeGreaterThanOrEqual(best.value - 1e-9);
  });
});

describe('两条路径 —— 密集扫描不碰导数', () => {
  it('每个情景两条路径都一致', () => {
    for (const s of SCENARIOS) expect(pathsAgree(s), `${s.id} 两条路径对不上`).toBe(true);
  });

  it('扫描找到的位置也和名单一致', () => {
    for (const s of SCENARIOS) {
      const a = optimumByDerivative(s).x;
      const b = optimumByScan(s).x;
      const span = s.domain[1] - s.domain[0];
      expect(Math.abs(a - b), `${s.id}`).toBeLessThan(span * 1e-3);
    }
  });

  it('⭐ 名单里抽掉端点,窄地块立刻对不上 —— 证明这条检验真的在发挥作用', () => {
    // 只拿"界内零点"当名单(也就是照口诀做),窄地块根本没有候选
    expect(recipeAnswer(narrow)).toBeNull();
    // 而扫描照样找得到答案
    expect(optimumByScan(narrow).value).toBeCloseTo(1050, 2);
  });

  it('扫描点数变了,结论不变', () => {
    for (const s of SCENARIOS) {
      const coarse = optimumByScan(s, 20_000).value;
      const fine = optimumByScan(s, 400_000).value;
      expect(Math.abs(coarse - fine)).toBeLessThan(Math.max(1, Math.abs(fine)) * 1e-4);
    }
  });
});

describe('⭐⭐ 口诀会在哪里失败 —— 这一课的支点', () => {
  it('窄地块:口诀给不出任何答案', () => {
    expect(recipeWouldSucceed(narrow)).toBe(false);
    expect(recipeAnswer(narrow)).toBeNull();
    expect(recipeShortfall(narrow)).toBeNull();
  });

  it('其余情景:口诀恰好对', () => {
    for (const s of [fence, box, can, flat]) {
      expect(recipeWouldSucceed(s), s.id).toBe(true);
      expect(recipeShortfall(s)).toBeCloseTo(0, 6);
    }
  });

  it('⭐⭐ 口诀的两种失败必须**各有一个情景**,而且长得不一样', () => {
    // 一个都不失败,这一课就没内容;个个都失败,又显得口诀一无是处。
    const failing = SCENARIOS.filter((s) => !recipeWouldSucceed(s));
    expect(failing.map((s) => s.id).sort()).toEqual(['localpeak', 'narrow']);

    // 失败一:口诀**交白卷** —— 定义域里没有零点
    expect(recipeAnswer(narrow)).toBeNull();

    // 失败二:口诀**自信地交出错的答案** —— 更危险的那一种
    expect(recipeAnswer(localpeak)).toBe(1);
    // ⚠️ 3·(1−1)·(1−3) 在 IEEE 下是 **−0**,`toBe(0)` 会挂在 Object.is 上。
    //    数学上 −0 就是 0,这里比数值而不是比位模式。
    expect(localpeak.fPrime(1)).toBeCloseTo(0, 12);
    expect(localpeak.fDouble(1)).toBeLessThan(0);  // 确实是个局部峰
    expect(recipeShortfall(localpeak)!).toBeCloseTo(4.5 * 1.5 ** 2 - 1 * 2 ** 2, 9);
  });

  it('⭐ 局部峰确实输给端点 —— 而且差得不是一点点', () => {
    expect(localpeak.f(1)).toBeCloseTo(4, 9);
    expect(localpeak.f(4.5)).toBeCloseTo(10.125, 9);
    expect(optimumByDerivative(localpeak).x).toBe(4.5);
    expect(optimumByDerivative(localpeak).origin).toBe('endpoint');
  });

  it('⭐⭐ 二阶导检验会**沉默** —— 而候选名单法不受影响', () => {
    // C'(4) = 0 且 C''(4) = 0,凹凸判定给不出结论
    expect(flat.fPrime(4)).toBe(0);
    expect(flat.fDouble(4)).toBe(0);
    const at4 = candidates(flat).find((c) => c.x === 4)!;
    expect(at4.shape).toBe('flat');                // ⭐ 这一支不是死代码

    // 但答案照样求得出来:代进去比大小就行
    const best = optimumByDerivative(flat);
    expect(best.x).toBe(4);
    expect(best.value).toBeCloseTo(5, 9);
    expect(recipeWouldSucceed(flat)).toBe(true);
  });

  it('⭐ 而 flat 这一支是**真的会出现**的,不是摆设', () => {
    const flatOnes = SCENARIOS.flatMap((s) => candidates(s)).filter((c) => c.shape === 'flat');
    expect(flatOnes.length, '没有任何候选是 flat —— 那这一支就是死代码').toBeGreaterThan(0);
  });

  it('⭐ 而失败的那个情景是**能从界面上选到**的 —— 否则就是死界面', () => {
    expect(SCENARIOS.some((s) => s.id === 'narrow')).toBe(true);
    expect(narrow.startX).toBeGreaterThanOrEqual(narrow.domain[0]);
    expect(narrow.startX).toBeLessThanOrEqual(narrow.domain[1]);
  });

  it('答案在端点 ⇔ 口诀不成立(在这四个情景上)', () => {
    for (const s of SCENARIOS) expect(answerIsAtEndpoint(s)).toBe(!recipeWouldSucceed(s));
  });
});

describe('画图用的量', () => {
  it('取样落在定义域内且首尾对上端点', () => {
    for (const s of SCENARIOS) {
      const pts = sampleF(s);
      expect(pts.length).toBeGreaterThan(100);
      expect(pts[0]!.x).toBeCloseTo(s.domain[0], 9);
      expect(pts[pts.length - 1]!.x).toBeCloseTo(s.domain[1], 9);
      for (const p of pts) expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('⭐ 纵轴范围从样本求出,能把最优值装下', () => {
    for (const s of SCENARIOS) {
      const [lo, hi] = yRange(s);
      expect(lo).toBeLessThan(hi);
      const best = optimumByDerivative(s).value;
      expect(best).toBeGreaterThanOrEqual(lo);
      expect(best).toBeLessThanOrEqual(hi);
    }
  });

  it('⭐ 四个情景的量级差很远 —— 所以纵轴不能写死', () => {
    const spans = SCENARIOS.map((s) => { const [lo, hi] = yRange(s); return hi - lo; });
    expect(Math.max(...spans) / Math.min(...spans)).toBeGreaterThan(2);
  });

  it('clampX 夹在自己的定义域里', () => {
    expect(clampX(narrow, 99)).toBe(15);
    expect(clampX(narrow, -3)).toBe(0);
    expect(clampX(narrow, Number.NaN)).toBe(narrow.startX);
    expect(clampX(can, 0.5)).toBe(1);
  });
});

describe('显示', () => {
  it('null 与非有限数一律 undefined,绝不是 NaN 或 Infinity', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
  });

  it('每个情景都有题面、定义域理由,且 startX 在域内', () => {
    for (const s of SCENARIOS) {
      expect(s.question.length).toBeGreaterThan(30);
      expect(s.domainWhy.length).toBeGreaterThan(20);
      expect(s.startX).toBeGreaterThanOrEqual(s.domain[0]);
      expect(s.startX).toBeLessThanOrEqual(s.domain[1]);
    }
  });
});


describe('⚠️ 变异测试逼出来的三条断言', () => {
  /** 变异体「`r >= a` 改成 `r > a`」活了下来 —— 因为没有一个情景的零点正好压在**左**端点上。 */
  it('零点正好落在左端点上时,算界内', () => {
    const fake = { ...fence, domain: [25, 40] as const, criticalRoots: [25] as const };
    expect(criticalInside(fake)).toEqual([25]);
    expect(criticalOutside(fake)).toEqual([]);
    expect(candidates(fake).map((c) => c.x)).toEqual([25, 40]);
    // ⭐ 而且它压在端点上,所以要记成端点
    expect(candidates(fake)[0]!.origin).toBe('endpoint');
  });

  /**
   * 变异体「`pathsAgree` 的容差放宽到 1e9」活了下来 ——
   * 因为没有一个测试**要求它返回 false**。一个永远说"通过"的检验不是检验。
   */
  it('⭐⭐ 候选名单漏掉了真正的最优点时,pathsAgree 必须说不', () => {
    // 抹掉零点表:名单只剩两个端点,而真正的峰在区间内部
    const broken = { ...fence, criticalRoots: [] as const };
    expect(criticalInside(broken)).toEqual([]);
    expect(optimumByDerivative(broken).value).toBeCloseTo(0, 9);   // 两端都是 0
    expect(optimumByScan(broken).value).toBeCloseTo(1250, 2);      // 扫描找得到峰
    expect(pathsAgree(broken), '两条路径明明差了 1250,却说一致').toBe(false);
  });

  it('容差是**相对**的 —— 大数量级的情景不会因为绝对差而误判', () => {
    // 易拉罐的量级是几百,栅栏是一千多;同一个相对容差要对两者都成立
    expect(pathsAgree(can)).toBe(true);
    expect(pathsAgree(fence)).toBe(true);
  });
});


describe('⭐⭐ 情景自带的微积分,必须和函数本身对得上', () => {
  /**
   * ⚠️ 每个情景手写了 `fPrime`、`fDouble` 和一张零点表 —— 三份**声明**。
   *   没人检查它们和 `f` 是不是一回事:变异测试把 `fDouble` 降一次、
   *   把 localpeak 的零点表删掉一个,测试全都照绿。
   *   声明与实物脱节,是这类"数据驱动"模块最容易烂掉的地方。
   */
  const central = (f: (x: number) => number, x: number, h: number) => (f(x + h) - f(x - h)) / (2 * h);
  const second = (f: (x: number) => number, x: number, h: number) =>
    (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);

  it('fPrime 和 f 的中心差商一致', () => {
    for (const s of SCENARIOS) {
      const [a, b] = s.domain;
      let checked = 0;
      for (let i = 1; i < 40; i += 1) {
        const x = a + ((b - a) * i) / 40;
        const want = central(s.f, x, 1e-6);
        const scale = Math.max(1, Math.abs(want));
        expect(Math.abs(s.fPrime(x) - want) / scale, `${s.id} 在 x=${x}`).toBeLessThan(1e-4);
        checked += 1;
      }
      expect(checked, '循环空转了').toBe(39);
    }
  });

  it('fDouble 和 f 的二阶差商一致', () => {
    for (const s of SCENARIOS) {
      const [a, b] = s.domain;
      for (let i = 1; i < 20; i += 1) {
        const x = a + ((b - a) * i) / 20;
        const want = second(s.f, x, 1e-3);
        const scale = Math.max(1, Math.abs(want));
        expect(Math.abs(s.fDouble(x) - want) / scale, `${s.id} 在 x=${x}`).toBeLessThan(1e-3);
      }
    }
  });

  it('声明的每个零点,fPrime 在那里确实是零', () => {
    for (const s of SCENARIOS) {
      for (const r of s.criticalRoots) {
        expect(Math.abs(s.fPrime(r)), `${s.id} 声明 ${r} 是零点,可它不是`).toBeLessThan(1e-9);
      }
    }
  });

  it('⭐ 反过来:定义域内 fPrime 每一次变号,都必须有一个声明过的零点接住', () => {
    for (const s of SCENARIOS) {
      const [a, b] = s.domain;
      const N = 4000;
      let crossings = 0;
      for (let i = 0; i < N; i += 1) {
        const x0 = a + ((b - a) * i) / N;
        const x1 = a + ((b - a) * (i + 1)) / N;
        const p = s.fPrime(x0);
        const q = s.fPrime(x1);
        if (!Number.isFinite(p) || !Number.isFinite(q)) continue;
        // ⚠️ 别把"恰好取到 0"跳过去。fence 的零点是 25,而 N = 4000 让取样**正好**
        //    落在 25 上 —— 一 `continue`,唯一的变号就被跳没了,这条断言随即空转。
        //    取样点正踩在零点上,那本身就是最强的一次命中。
        if (p !== 0 && q !== 0 && p * q > 0) continue;
        crossings += 1;
        const gap = (b - a) / N;
        const near = s.criticalRoots.some((r) => r >= x0 - gap && r <= x1 + gap);
        expect(near, `${s.id} 的导数在 ${x0}~${x1} 之间变号了,零点表里却没有它`).toBe(true);
      }
      expect(crossings, `${s.id} 一次变号都没扫到`).toBeGreaterThanOrEqual(s.id === 'narrow' ? 0 : 1);
    }
  });

  it('⭐ 并列时报 x 最小的那个 —— 规则要定死,不能看循环顺序', () => {
    // 把 localpeak 的右端点收到 4,f(1) 和 f(4) 都是 4,真正并列
    const tied = { ...localpeak, domain: [0, 4] as const };
    expect(tied.f(1)).toBeCloseTo(4, 9);
    expect(tied.f(4)).toBeCloseTo(4, 9);
    expect(optimumByDerivative(tied).x).toBe(1);        // 先来的留下
    expect(optimumByDerivative(tied).origin).toBe('critical');
  });
});


describe('界外那一段 —— 窄地块的主视觉', () => {
  it('只有存在界外零点时才画', () => {
    expect(outsideSpan(narrow)).not.toBeNull();
    expect(outsideSpan(fence)).toBeNull();
    expect(sampleBeyond(fence)).toEqual([]);
  });

  it('⭐ 那一段必须**把界外的零点包进去** —— 否则画了也看不见它', () => {
    const span = outsideSpan(narrow)!;
    for (const r of criticalOutside(narrow)) {
      expect(r).toBeGreaterThan(span[0]);
      expect(r).toBeLessThan(span[1]);
    }
    expect(sampleBeyond(narrow).length).toBeGreaterThan(100);
  });

  it('⭐ 而且要把定义域整个包住 —— 界内界外要能接上', () => {
    const span = outsideSpan(narrow)!;
    expect(span[0]).toBeLessThanOrEqual(narrow.domain[0]);
    expect(span[1]).toBeGreaterThanOrEqual(narrow.domain[1]);
  });
});

describe('⚠️ 截图逼出来的一条:够不着的那个峰必须**画得进画框**', () => {
  /**
   * `[data-unreachable]` 在 DOM 里存在,所有断言都绿 —— 可它被画到画框外面去了,
   * 因为纵轴范围只统计了定义域内的样本。**DOM 里有,和看得见,是两件事。**
   */
  it('界外零点的函数值落在 yRange 之内', () => {
    for (const s of SCENARIOS) {
      const [lo, hi] = yRange(s);
      for (const r of criticalOutside(s)) {
        expect(s.f(r), `${s.id}: 界外峰 ${s.f(r)} 掉出了纵轴范围 [${lo}, ${hi}]`)
          .toBeGreaterThanOrEqual(lo);
        expect(s.f(r)).toBeLessThanOrEqual(hi);
      }
    }
  });

  it('⭐ 而且这条断言不是空转 —— 确实有情景存在界外零点', () => {
    expect(SCENARIOS.filter((s) => criticalOutside(s).length > 0).map((s) => s.id))
      .toEqual(['narrow']);
    // 界外的峰确实比界内的最大值还高,否则"够不着"就没什么可惜的
    expect(narrow.f(25)).toBeGreaterThan(optimumByDerivative(narrow).value);
  });

  it('⭐ 界外那一段不往没意义的方向乱伸 —— 深度不为负', () => {
    const span = outsideSpan(narrow)!;
    expect(span[0]).toBe(narrow.domain[0]);        // 左边没有界外零点,就不留边
    expect(span[1]).toBeGreaterThan(25);
  });
});
