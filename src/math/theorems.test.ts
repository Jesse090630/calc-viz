import { describe, expect, it } from 'vitest';
import {
  THEOREMS, theoremOf, edges, ancestorsOf, needsCompleteness, restsOnCompleteness,
  CUBIC, CUBIC_PRIME, CYCLE, CYCLE_PRIME, EVT_F, SQUEEZE_F, FERMAT_TRAP,
  rootByBisection, cubicRoot, newtonSteps, evtExtremes, squeezeAt,
  mvtC, mvtChordSlope, cauchyC, cauchyRatio, rolleC,
  linApproxValue, linApproxTrue, linApproxError, linApproxBound,
  HEADLINE, MAIN_IDEA, COMPLETENESS_NOTE, show,
} from './theorems';

/* ── 例题里的数字,逐个用第二条路径复核 ──────────────────────── */

describe('every number in the worked examples', () => {
  it('⭐ 介值定理:两端异号,而根确实把方程解掉', () => {
    expect(CUBIC(0)).toBe(-1);
    expect(CUBIC(1)).toBe(1);
    expect(CUBIC(0) * CUBIC(1)).toBeLessThan(0);   // 这才是定理用得上的理由
    const r = cubicRoot();
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(1);
    // ⚠️ 不信二分法,直接代回原方程
    expect(CUBIC(r)).toBeCloseTo(0, 12);
    expect(r).toBeCloseTo(0.6823278038, 9);
  });

  it('⚠️ 两端同号时 rootByBisection 说 null,不硬编一个根出来', () => {
    expect(rootByBisection(CUBIC, 1, 2)).toBeNull();   // f(1)=1, f(2)=9,都是正的
    expect(rootByBisection((x) => x * x + 1, -1, 1)).toBeNull();
  });

  it('⭐⭐ 牛顿法追的是**同一个**根 —— 这一条把两课串起来', () => {
    const xs = newtonSteps(CUBIC, CUBIC_PRIME, 1, 4) as number[];
    expect(xs[0]).toBe(1);
    expect(xs[1]).toBeCloseTo(0.75, 12);             // 1 − 1/4
    // 每一步都更接近,而且误差大致是平方级地缩小
    const err = xs.map((x) => Math.abs(x - cubicRoot()));
    for (let i = 1; i < err.length; i += 1) expect(err[i]!).toBeLessThan(err[i - 1]!);
    // ⭐ 正确位数大致每步翻倍:0.32 → 0.068 → 0.0038 → 1.2e−5 → 1.2e−10
    expect(err[3]!).toBeLessThan(1e-4);
    expect(err[4]!).toBeLessThan(1e-9);
    expect(xs[4]).toBeCloseTo(cubicRoot(), 9);
    // ⚠️ 这才是"二次收敛"的意思:下一步的误差约等于上一步的平方
    expect(err[4]!).toBeLessThan(err[3]! ** 2 * 10);
  });

  it('⭐ 手推第一步:x₁ = x₀ − f(x₀)/f′(x₀) = 1 − 1/4', () => {
    expect(CUBIC(1)).toBe(1);
    expect(CUBIC_PRIME(1)).toBe(4);
    expect((newtonSteps(CUBIC, CUBIC_PRIME, 1, 1) as number[])[1]).toBe(0.75);
  });

  it('⚠️⚠️ 翻车那一例真的在原地打转 0 → 1 → 0 → 1', () => {
    const xs = newtonSteps(CYCLE, CYCLE_PRIME, 0, 5) as number[];
    expect(xs.slice(0, 5)).toEqual([0, 1, 0, 1, 0]);
    // 而方程确实有实根,只是牛顿法从这里永远够不到
    const real = rootByBisection(CYCLE, -3, -1)!;
    expect(real).toBeCloseTo(-1.7692923542, 8);
    expect(CYCLE(real)).toBeCloseTo(0, 12);
    // 循环里的点离那个根远得很
    for (const x of xs) expect(Math.abs(x - real)).toBeGreaterThan(1);
  });

  it('⚠️ 切线水平时 newtonSteps 说 null,不给 Infinity', () => {
    // f(x) = x² 在 x₀ = 0 处:f′(0) = 0,走不下去
    const xs = newtonSteps((x) => x * x, (x) => 2 * x, 0, 3);
    expect(xs[0]).toBe(0);
    expect(xs[1]).toBeNull();
    expect(xs.some((x) => x !== null && !Number.isFinite(x))).toBe(false);
  });

  it('⭐ 最值定理:最大最小都算得出来,而且是真的最值', () => {
    const { max, min, argMax, argMin } = evtExtremes();
    expect(max).toBeCloseTo(18, 6);
    expect(argMax).toBeCloseTo(3, 4);
    expect(min).toBeCloseTo(-2, 6);
    expect(argMin).toBeCloseTo(1, 3);
    // ⚠️ 独立复核:整个区间上没有哪一点超出这两个值
    for (let i = 0; i <= 5000; i += 1) {
      const x = (3 * i) / 5000;
      expect(EVT_F(x)).toBeLessThanOrEqual(max + 1e-9);
      expect(EVT_F(x)).toBeGreaterThanOrEqual(min - 1e-9);
    }
    // 而且最小值点是**内部**临界点:f′(1) = 0
    expect(3 * 1 ** 2 - 3).toBe(0);
    expect(argMin).toBeGreaterThan(0);
    expect(argMin).toBeLessThan(3);
  });

  it('⚠️ 另一个临界点 x = −1 确实在区间外 —— 例题里那句话不是瞎说的', () => {
    expect(3 * (-1) ** 2 - 3).toBe(0);  // 它是临界点
    expect(-1).toBeLessThan(0);          // 但不在 [0, 3] 里
    // 真把它算进去会得到 f(−1) = 2,既不是最大也不是最小
    expect(EVT_F(-1)).toBe(2);
    expect(EVT_F(-1)).toBeLessThan(evtExtremes().max);
    expect(EVT_F(-1)).toBeGreaterThan(evtExtremes().min);
  });

  it('⭐ 夹逼定理:三条线真的夹住了,而且两边都趋于 0', () => {
    for (const x of [0.5, 0.1, 0.01, 1e-4]) {
      const [lo, f, hi] = squeezeAt(x);
      expect(lo).toBeLessThanOrEqual(f);
      expect(f).toBeLessThanOrEqual(hi);
      expect(lo).toBe(-hi);
    }
    // 外面两条趋于 0
    expect(squeezeAt(1e-6)[2]).toBeLessThan(1e-11);
    // ⚠️ 而被夹的那个**不是单调的** —— 它一路穿过零,这是例题里那句话
    const signs = [0.3, 0.2, 0.12, 0.08, 0.05, 0.03].map((x) => Math.sign(SQUEEZE_F(x)));
    expect(new Set(signs).size).toBeGreaterThan(1);
  });

  it('夹逼例题引用的那三个数对得上', () => {
    expect(squeezeAt(0.1)[0]).toBeCloseTo(-0.01, 12);
    expect(squeezeAt(0.1)[2]).toBeCloseTo(0.01, 12);
    expect(SQUEEZE_F(0.1)).toBeCloseTo(0.01 * Math.sin(10), 12);
    expect(SQUEEZE_F(0)).toBe(0);
  });

  it('⭐ 费马引理的反例:f′(0) = 0 而 0 既不是极大也不是极小', () => {
    expect(3 * 0 ** 2).toBe(0);
    expect(FERMAT_TRAP(-0.1)).toBeLessThan(FERMAT_TRAP(0));
    expect(FERMAT_TRAP(0.1)).toBeGreaterThan(FERMAT_TRAP(0));
    // 任意小的邻域里都有比它大的和比它小的 —— 所以两边都不是
    for (const h of [1e-3, 1e-6, 1e-9]) {
      expect(FERMAT_TRAP(-h)).toBeLessThan(0);
      expect(FERMAT_TRAP(h)).toBeGreaterThan(0);
    }
  });

  it('Rolle:两端等高,c 在中间而且导数为零', () => {
    const f = (x: number) => x * x - 4;
    expect(f(-2)).toBe(0);
    expect(f(2)).toBe(0);
    expect(f(-2)).toBe(f(2));
    const c = rolleC();
    expect(c).toBeGreaterThan(-2);
    expect(c).toBeLessThan(2);
    expect(2 * c).toBe(0);   // f′(c) = 2c
  });

  it('⭐ 中值定理:c = 2/√3,代回去确实等于连线斜率', () => {
    expect(mvtChordSlope()).toBe(4);
    const c = mvtC();
    expect(c).toBeCloseTo(1.1547005384, 9);
    expect(3 * c * c).toBeCloseTo(mvtChordSlope(), 12);   // f′(c) = 斜率
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(2);
    // ⚠️ 负根确实解方程,但确实在区间外 —— 例题里那句话的依据
    expect(3 * (-c) * (-c)).toBeCloseTo(4, 12);
    expect(-c).toBeLessThan(0);
  });

  it('⭐ Cauchy:c = 14/9,两边比值相等', () => {
    expect(cauchyRatio()).toBeCloseTo(3 / 7, 12);
    const c = cauchyC();
    expect(c).toBeCloseTo(14 / 9, 12);
    expect(c).toBeGreaterThan(1);
    expect(c).toBeLessThan(2);
    // f′(c)/g′(c) = 2c/(3c²)
    expect((2 * c) / (3 * c * c)).toBeCloseTo(cauchyRatio(), 12);
    // ⚠️ g′ 在 (1,2) 上不为零 —— 比值写法成立的前提
    for (const x of [1.001, 1.5, 1.999]) expect(3 * x * x).toBeGreaterThan(0);
  });

  it('⚠️ 把 g 取成 x 时,Cauchy 退回普通中值定理 —— 证明最后那句话', () => {
    // (f(b)−f(a))·1 = (b−a)·f′(c)  ⇔  f′(c) = (f(b)−f(a))/(b−a)
    const f = (x: number) => x * x * x;
    const a = 0; const b = 2;
    const chord = (f(b) - f(a)) / (b - a);
    expect(chord).toBe(mvtChordSlope());
    expect(3 * mvtC() ** 2).toBeCloseTo(chord, 12);
  });

  it('⭐⭐ 线性近似:上界**真的罩得住**真实误差,而且罩得很紧', () => {
    expect(linApproxValue()).toBe(2.025);
    expect(linApproxTrue()).toBeCloseTo(2.0248456731, 9);
    const err = linApproxError();
    const bound = linApproxBound();
    expect(bound).toBeCloseTo(1.5625e-4, 12);
    expect(err).toBeCloseTo(1.54327e-4, 9);
    expect(err).toBeLessThan(bound);               // 罩得住
    expect(err / bound).toBeGreaterThan(0.95);     // 而且不是虚张声势
  });

  it('⚠️ |f″| 的最大值确实在左端点 —— 上界取 1/32 的依据', () => {
    const absF2 = (x: number) => 1 / (4 * x ** 1.5);
    expect(absF2(4)).toBeCloseTo(1 / 32, 12);
    for (let i = 0; i <= 100; i += 1) {
      const x = 4 + (0.1 * i) / 100;
      expect(absF2(x)).toBeLessThanOrEqual(absF2(4) + 1e-15);
    }
  });

  it('线性近似确实比什么都不做好', () => {
    // 不近似(直接拿 f(4) = 2)的误差要大得多
    expect(Math.abs(linApproxTrue() - 2)).toBeGreaterThan(linApproxError() * 100);
  });
});

/* ── 结构:每条都齐全,图是对的 ──────────────────────────────── */

describe('structure', () => {
  it('九条定理,id 不重复', () => {
    expect(THEOREMS).toHaveLength(9);
    expect(new Set(THEOREMS.map((t) => t.id)).size).toBe(9);
  });

  it('⭐ 每条都有:条件、证明、例题 —— 一条都不许缺', () => {
    for (const t of THEOREMS) {
      expect(t.conditions.length).toBeGreaterThanOrEqual(2);
      expect(t.proof.length).toBeGreaterThanOrEqual(4);
      expect(t.example.lines.length).toBeGreaterThanOrEqual(3);
      expect(t.tex.length).toBeGreaterThan(20);
      expect(t.gives.length).toBeGreaterThan(30);
      expect(t.example.setup.length).toBeGreaterThan(15);
      expect(t.example.ask.length).toBeGreaterThan(5);   // "Find c." 就够清楚了
      expect(t.example.answer.length).toBeGreaterThan(40);
    }
  });

  it('⭐⭐ 每个条件都写明了"去掉它会怎样" —— 不写就不算说清楚了', () => {
    let seen = 0;
    for (const t of THEOREMS) {
      for (const c of t.conditions) {
        // ⚠️ 条件本身可以很短("f(a) = f(b)." 就十二个字符,而且再清楚不过)。
        //   真正要够长的是**去掉它会怎样**那一栏 —— 那才是这一页的内容。
        expect(c.text.length).toBeGreaterThan(10);
        expect(c.without.length).toBeGreaterThan(50);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(19);
  });

  it('⚠️ 图上那个短名字够短 —— 写不进方块就是个缺陷', () => {
    for (const t of THEOREMS) {
      expect(t.short.length).toBeGreaterThan(2);
      expect(t.short.length).toBeLessThanOrEqual(13);
      // 短名字得是单独写的,不是从全名正则削出来的
      expect(t.short).not.toContain('Theorem');
    }
    expect(new Set(THEOREMS.map((t) => t.short)).size).toBe(THEOREMS.length);
  });

  it('条件和证明步骤的编号是连着的', () => {
    for (const t of THEOREMS) {
      expect(t.conditions.map((c) => c.n)).toEqual(
        t.conditions.map((_, i) => String(i + 1)),
      );
      expect(t.proof.map((p) => p.n)).toEqual(t.proof.map((_, i) => String(i + 1)));
    }
  });

  it('例题里每个带数字的行,数字都是有限的', () => {
    let seen = 0;
    for (const t of THEOREMS) {
      for (const l of t.example.lines) {
        if (l.value === undefined) continue;
        expect(Number.isFinite(l.value)).toBe(true);
        seen += 1;
      }
    }
    expect(seen).toBeGreaterThan(25);
  });

  it('站内链接指向真实路由', () => {
    const routes = new Set(['bisect-line', 'optimization', 'mvt', 'taylor']);
    for (const t of THEOREMS) {
      if (t.route === undefined) continue;
      expect(routes.has(t.route)).toBe(true);
    }
    // 空转保护:确实有几条挂了链接
    expect(THEOREMS.filter((t) => t.route !== undefined).length).toBeGreaterThanOrEqual(4);
  });
});

/* ── ⭐⭐⭐ 依赖图 ──────────────────────────────────────────────── */

describe('the dependency chain', () => {
  it('每条依赖都指向真实存在的定理', () => {
    const ids = new Set(THEOREMS.map((t) => t.id));
    for (const e of edges()) {
      expect(ids.has(e.from)).toBe(true);
      expect(ids.has(e.to)).toBe(true);
      expect(e.from).not.toBe(e.to);
    }
    expect(edges().length).toBeGreaterThanOrEqual(6);
  });

  it('⭐ 那条链是对的:EVT + 费马 → Rolle → 中值 → Cauchy → 线性近似 → 牛顿', () => {
    expect([...theoremOf('rolle').dependsOn].sort()).toEqual(['evt', 'fermat']);
    expect(theoremOf('mvt').dependsOn).toEqual(['rolle']);
    expect(theoremOf('cauchy').dependsOn).toEqual(['rolle']);
    expect(theoremOf('linear').dependsOn).toEqual(['cauchy']);
    expect(theoremOf('newton').dependsOn).toEqual(['linear']);
    // 牛顿法一路往下用到了五条
    expect([...ancestorsOf('newton')].sort()).toEqual(['cauchy', 'evt', 'fermat', 'linear', 'rolle']);
  });

  it('夹逼和介值是独立的 —— 它们不靠这条链', () => {
    expect(theoremOf('squeeze').dependsOn).toEqual([]);
    expect(theoremOf('ivt').dependsOn).toEqual([]);
    expect(ancestorsOf('squeeze')).toEqual([]);
  });

  it('⚠️ 图无环 —— 否则 ancestorsOf 讲的就是循环论证', () => {
    for (const t of THEOREMS) {
      expect(ancestorsOf(t.id)).not.toContain(t.id);
    }
  });

  it('⚠️ 箭头一律从左往右画得通 —— 写死的坐标要和依赖对得上', () => {
    for (const e of edges()) {
      const from = theoremOf(e.from).at;
      const to = theoremOf(e.to).at;
      expect(from[0]).toBeLessThan(to[0]);
    }
  });

  it('⚠️ 没有两条定理挤在同一个格子上', () => {
    const cells = THEOREMS.map((t) => `${t.at[0]},${t.at[1]}`);
    expect(new Set(cells).size).toBe(cells.length);
  });
});

/* ── ⭐⭐ 完备性那一步被标在正确的地方 ───────────────────────── */

describe('where the proofs bottom out', () => {
  it('⭐⭐ 恰好介值定理和最值定理用到完备性,别的都没有', () => {
    const marked = THEOREMS.filter(needsCompleteness).map((t) => t.id);
    expect([...marked].sort()).toEqual(['evt', 'ivt']);
  });

  it('被标的那些步骤说清楚了是什么', () => {
    for (const t of THEOREMS) {
      for (const p of t.proof) {
        if (!p.needsCompleteness) continue;
        expect(p.text.length).toBeGreaterThan(30);
      }
    }
    // 两条定理合起来共三处
    const n = THEOREMS.flatMap((t) => t.proof).filter((p) => p.needsCompleteness).length;
    expect(n).toBe(3);
  });

  it('⭐ 而顺着链下来的那些是**间接**靠着它的', () => {
    // Rolle 用了最值定理,所以它也站在完备性上 —— 这一点页面上要说得出来
    for (const id of ['rolle', 'mvt', 'cauchy', 'linear', 'newton', 'evt', 'ivt']) {
      expect(restsOnCompleteness(id)).toBe(true);
    }
    // 而这两条不靠
    expect(restsOnCompleteness('squeeze')).toBe(false);
    expect(restsOnCompleteness('fermat')).toBe(false);
  });

  it('夹逼与费马的证明里确实没有那一步 —— 上面那条不是恒假', () => {
    for (const id of ['squeeze', 'fermat']) {
      expect(theoremOf(id).proof.every((p) => !p.needsCompleteness)).toBe(true);
    }
  });
});

/* ── 文案 ──────────────────────────────────────────────────────── */

describe('prose', () => {
  it('⭐ 完备性那段话点明了它是公理、而且说了有理数上会怎样', () => {
    expect(COMPLETENESS_NOTE).toContain('least upper bound');
    expect(COMPLETENESS_NOTE).toContain('rational');
    expect(COMPLETENESS_NOTE.length).toBeGreaterThan(200);
  });

  it('⚠️ 开篇那句里的数目必须和实际条数对得上', () => {
    // 第一版写着"not eight separate facts",而页面上有九条 ——
    // 任何一个数一下方块的读者都会发现。**打开线上页面读出来才看见的。**
    const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six',
      'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
    expect(MAIN_IDEA).toContain(`not ${WORDS[THEOREMS.length]} separate facts`);
    for (let i = 0; i < WORDS.length; i += 1) {
      if (i === THEOREMS.length) continue;
      expect(MAIN_IDEA).not.toContain(`not ${WORDS[i]} separate facts`);
    }
  });

  it('开篇那段把链讲了一遍', () => {
    for (const w of ['extreme value', 'Fermat', 'Rolle', 'mean value', 'Cauchy']) {
      expect(MAIN_IDEA).toContain(w);
    }
    expect(HEADLINE.length).toBeGreaterThan(10);
  });

  it('show 说 undefined,不印假数字', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.NaN)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(0.75, 3)).toContain('0.75');
  });
});

/** `theoremOf` 认不出来的 id 回落到第一条,不抛错。 */
it('theoremOf 对未知 id 有兜底', () => {
  expect(theoremOf('nope').id).toBe(THEOREMS[0]!.id);
  expect(theoremOf('mvt').name).toBe('Mean Value Theorem');
});
