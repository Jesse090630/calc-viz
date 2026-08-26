/**
 * `specialForms.ts` 的测试。
 *
 * ⭐⭐ 四条硬约束:
 *   ① 六条的**直接代入完全相同**(都是 0/0)—— 它们同属一节的理由;
 *   ② 每一条的**因子分解是逐点恒等式**,不是只在极限处凑巧成立;
 *   ③ 「由哪条推出」是**结构性**的:不是推出来的那两条必须写明它立在什么上面;
 *   ④ **浮点写法不许说谎**:教科书写法在小 x 处会算出 0,稳定写法不会。
 */
import { describe, it, expect } from 'vitest';
import {
  A,
  BASES,
  FORMS_BY_FAMILY,
  FORM_IDS,
  LADDER,
  MAX_DEPTH,
  MIN_X,
  ZOOM_LEVELS,
  baseSlope,
  baseSlopeExact,
  clampX,
  decade,
  expMinusOne,
  expMinusOneNaive,
  factorProduct,
  formOf,
  halve,
  isIndeterminate,
  ladderValue,
  limitByFactors,
  limitByLadder,
  logOnePlus,
  logOnePlusNaive,
  logSlope,
  logSlopeExact,
  naiveBreaksAt,
  naiveRatio,
  oneMinusCos,
  productOfLimits,
  oneMinusCosNaive,
  ratio,
  relativeGapAt,
  rowsFor,
  sampleRatio,
  showGap,
  showRatio,
  showX,
  spanAt,
  substitutionForm,
  type FormId,
} from './specialForms';

const NON_ZERO = [-1.3, -0.7, -0.2, -0.05, -0.004, 0.004, 0.05, 0.2, 0.7, 1.3];

describe('⭐⭐ 六条同属一节:直接代入完全相同', () => {
  it('六条的代入结果是同一个字符串', () => {
    const forms = FORM_IDS.map(substitutionForm);
    expect(new Set(forms).size, `代入结果并不相同:${forms.join(' , ')}`).toBe(1);
    expect(forms[0]).toBe('0/0');
  });

  it('六条都真的落在不定式里', () => {
    for (const id of FORM_IDS) {
      expect(isIndeterminate(id), id).toBe(true);
      expect(formOf(id).numerator(A), id).toBe(0);
      expect(formOf(id).denominator(A), id).toBe(0);
    }
  });

  it('⭐ 而六条的答案**不**都一样 —— 否则这一节就没什么可讲的', () => {
    const limits = FORM_IDS.map((id) => formOf(id).limit);
    expect(new Set(limits).size).toBeGreaterThan(1);
    expect(limits).toEqual([1, 1, 0, 0.5, 1, 1]);
  });

  it('x = 0 处返回 null,不返回 NaN', () => {
    for (const id of FORM_IDS) {
      expect(ratio(id, A), id).toBeNull();
      expect(showRatio(ratio(id, A))).toBe('undefined');
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, -Infinity]) {
        expect(ratio(id, bad), `${id} @ ${bad}`).toBeNull();
      }
    }
  });

  it('⚠️ ln(1+x) 在 x ≤ −1 处没有值,也返回 null', () => {
    expect(ratio('log-over-x', -1)).toBeNull();
    expect(ratio('log-over-x', -2)).toBeNull();
    expect(formOf('log-over-x').curves[0]!.at(-1.5)).toBeNull();
  });
});

describe('⭐⭐ 两条独立路径给出同一个答案', () => {
  it('⭐ 乘法本身被钉住了 —— 不是 `return form.limit` 假装成两条路', () => {
    // ⚠️ 在这六条数据上,「真乘一遍」和「直接返回声明的极限」结果**完全相同**,
    //    变异测试抓不到。所以喂合成的因子表去钉乘法。
    expect(productOfLimits([{ limit: 2 }, { limit: 3 }])).toBe(6);
    expect(productOfLimits([{ limit: 0.5 }, { limit: 1 }])).toBe(0.5);
    expect(productOfLimits([{ limit: 1 }, { limit: 0 }])).toBe(0);
    expect(productOfLimits([])).toBe(1);
    // 而六条确实是走这条路算出来的
    for (const id of FORM_IDS) {
      const factors = formOf(id).factors;
      if (factors.length === 0) { expect(limitByFactors(id), id).toBeNull(); continue; }
      expect(limitByFactors(id), id).toBe(productOfLimits(factors));
    }
  });

  it('因子相乘 vs 声明的极限', () => {
    for (const id of FORM_IDS) {
      const byFactors = limitByFactors(id);
      if (byFactors === null) continue; // 不是推出来的那两条
      expect(byFactors, id).toBeCloseTo(formOf(id).limit, 12);
    }
  });

  it('十进位阶梯 vs 声明的极限', () => {
    for (const id of FORM_IDS) {
      expect(limitByLadder(id), id).toBeCloseTo(formOf(id).limit, 7);
    }
  });

  it('⭐ 阶梯上一档比一档更接近 —— 而且**没有**中途走远', () => {
    for (const id of FORM_IDS) {
      const { limit } = formOf(id);
      let previous = Number.POSITIVE_INFINITY;
      let moved = 0;
      for (let k = 1; k <= MAX_DEPTH; k += 1) {
        const value = ladderValue(id, k);
        expect(value, `${id} k=${k}`).not.toBeNull();
        const gap = Math.abs(value! - limit);
        expect(gap, `${id} 在第 ${k} 档反而走远了`).toBeLessThanOrEqual(previous + 1e-15);
        if (gap < previous) moved += 1;
        previous = gap;
      }
      // ⚠️ 防空跑:如果每一档读数都一样,上面那条断言恒真却什么也没证。
      expect(moved, `${id} 的阶梯从头到尾没动过`).toBeGreaterThan(3);
    }
  });
});

describe('⭐⭐ 因子分解是逐点恒等式,不是极限处的巧合', () => {
  it('每个 x ≠ 0 处,因子的乘积就等于原比值', () => {
    for (const id of FORM_IDS) {
      if (formOf(id).factors.length === 0) continue;
      for (const x of NON_ZERO) {
        if (id === 'log-over-x' && x <= -1) continue;
        const product = factorProduct(id, x);
        const direct = ratio(id, x);
        expect(product, `${id} @ ${x}`).not.toBeNull();
        expect(direct, `${id} @ ${x}`).not.toBeNull();
        const scale = Math.max(Math.abs(direct!), 1);
        expect(Math.abs(product! - direct!) / scale, `${id} @ ${x}`).toBeLessThan(1e-9);
      }
    }
  });

  it('⚠️ 恒等式在**很小**的 x 处也成立(那正是代数步骤最容易失效的地方)', () => {
    for (const id of FORM_IDS) {
      if (formOf(id).factors.length === 0) continue;
      for (const k of [4, 6, 8]) {
        const x = decade(k);
        const product = factorProduct(id, x)!;
        const direct = ratio(id, x)!;
        const scale = Math.max(Math.abs(direct), 1e-12);
        expect(Math.abs(product - direct) / scale, `${id} @ 1e-${k}`).toBeLessThan(1e-6);
      }
    }
  });

  it('因子各自的极限确实是声明的那个', () => {
    for (const id of FORM_IDS) {
      for (const factor of formOf(id).factors) {
        const value = factor.at(decade(7));
        expect(value, `${id} · ${factor.tex}`).not.toBeNull();
        expect(value!, `${id} · ${factor.tex}`).toBeCloseTo(factor.limit, 6);
      }
    }
  });

  it('⚠️ 因子表里不许只放一个「就是答案」的因子充数', () => {
    // 每条推出来的都必须**真的**拆开:至少两个因子,或者一个明确写着换元的因子。
    for (const id of FORM_IDS) {
      const form = formOf(id);
      if (form.factors.length === 0) continue;
      const onlyOne = form.factors.length === 1;
      if (onlyOne) {
        // 唯一允许的单因子情形是换元(log 那条),它的说明里必须提到换元。
        expect(form.factors[0]!.note, id).toMatch(/u = /);
      }
      // 因子的写法不能和整条的写法一模一样 —— 那就是循环论证。
      for (const factor of form.factors) {
        expect(factor.tex, `${id} 的因子就是它自己`).not.toBe(form.ratioTex);
      }
    }
  });
});

describe('⭐⭐ 「由哪条推出」是结构性的', () => {
  it('factors 与 groundedIn 恰好有一个是空的', () => {
    for (const id of FORM_IDS) {
      const form = formOf(id);
      const derived = form.factors.length > 0;
      const grounded = form.groundedIn !== null;
      expect(derived !== grounded, `${id}:derived=${derived} grounded=${grounded}`).toBe(true);
    }
  });

  it('推出来的那几条,provenBy 非空且指向真实存在的 id', () => {
    for (const id of FORM_IDS) {
      const form = formOf(id);
      if (form.factors.length === 0) {
        expect(form.provenBy, id).toEqual([]);
        continue;
      }
      expect(form.provenBy.length, id).toBeGreaterThan(0);
      for (const parent of form.provenBy) {
        expect(FORM_IDS, `${id} 指向了不存在的 ${parent}`).toContain(parent);
        expect(parent, `${id} 指向了自己`).not.toBe(id);
      }
    }
  });

  it('⭐ 依赖关系无环,而且每条都能一路走回两个根', () => {
    const roots = FORM_IDS.filter((id) => formOf(id).provenBy.length === 0);
    expect(roots.sort()).toEqual(['exp-over-x', 'sin-over-x']);

    for (const id of FORM_IDS) {
      const seen = new Set<FormId>();
      let frontier: readonly FormId[] = [id];
      let depth = 0;
      while (frontier.length > 0) {
        depth += 1;
        expect(depth, `${id} 的依赖链上有环`).toBeLessThan(FORM_IDS.length + 2);
        const next: FormId[] = [];
        for (const node of frontier) {
          expect(seen.has(node), `${id} 的依赖链上有环:${node}`).toBe(false);
          seen.add(node);
          next.push(...formOf(node).provenBy);
        }
        frontier = next;
      }
      expect([...seen].some((n) => roots.includes(n)), `${id} 走不回任何一个根`).toBe(true);
    }
  });

  it('两个根各自写明了自己立在什么上面', () => {
    expect(formOf('sin-over-x').groundedIn).toContain('unit-circle');
    expect(formOf('exp-over-x').groundedIn).toContain('slope');
    // ⚠️ 措辞不许是「记住它」。
    for (const id of ['sin-over-x', 'exp-over-x'] as const) {
      expect(formOf(id).groundedIn!.toLowerCase()).not.toContain('memoriz');
      expect(formOf(id).groundedIn!.toLowerCase()).not.toContain('just accept');
    }
  });
});

describe('⭐⭐ 浮点写法不许说谎', () => {
  it('先证明这个坑存在:1 − cos(10⁻⁸) 在 double 里精确地是 0', () => {
    expect(oneMinusCosNaive(1e-8)).toBe(0);
    expect(Math.cos(1e-8)).toBe(1);
    // 而真值是 5×10⁻¹⁷。
    expect(oneMinusCos(1e-8)).toBeCloseTo(5e-17, 25);
  });

  it('⭐ 于是教科书写法会在屏幕上写出一个**假的 0**,稳定写法不会', () => {
    expect(naiveRatio('cos-over-x2', 1e-8)).toBe(0);
    expect(ratio('cos-over-x2', 1e-8)).toBeCloseTo(0.5, 12);
    // 这一条的极限是 ½ —— 显示成 0.000000 是这一节能犯的最坏的错。
    expect(showRatio(naiveRatio('cos-over-x2', 1e-8))).toBe('0.0000000');
    expect(showRatio(ratio('cos-over-x2', 1e-8))).toBe('0.5000000');
  });

  it('两种写法在**不小**的 x 处必须一致 —— 否则就是我改了函数,不是改了算法', () => {
    for (const x of [-1.2, -0.4, 0.4, 1.2, 2.5]) {
      expect(oneMinusCos(x)).toBeCloseTo(oneMinusCosNaive(x), 12);
      expect(expMinusOne(x)).toBeCloseTo(expMinusOneNaive(x), 12);
      if (x > -1) expect(logOnePlus(x)).toBeCloseTo(logOnePlusNaive(x), 12);
    }
  });

  it('两条余弦课的教科书写法都在阶梯**够得着**的深度上崩掉', () => {
    for (const id of ['cos-over-x', 'cos-over-x2'] as const) {
      const k = naiveBreaksAt(id);
      expect(k, `${id} 的教科书写法居然没崩`).not.toBeNull();
      expect(k!, `${id} 在第 ${k} 档才崩,阶梯只走到 ${MAX_DEPTH}`).toBeLessThanOrEqual(MAX_DEPTH);
    }
  });

  it('sin 与 tan 没有相减抵消,两种写法从头到尾一致', () => {
    for (const id of ['sin-over-x', 'tan-over-x'] as const) {
      expect(naiveBreaksAt(id), id).toBeNull();
    }
  });

  it('⚠️ 稳定写法在阶梯每一档都算得准', () => {
    for (const id of FORM_IDS) {
      const { limit } = formOf(id);
      const deepest = ratio(id, decade(MAX_DEPTH))!;
      expect(Math.abs(deepest - limit), `${id} 在最深一档失准`).toBeLessThan(1e-7);
    }
  });
});

describe('提示词点名的那几个数', () => {
  it('sin x / x:1 → 0.84147,0.5 → 0.95885,0.1 → 0.99833,0.01 → 0.999983,0.001 → 0.9999998', () => {
    const want: readonly [number, number][] = [
      [1, 0.84147], [0.5, 0.95885], [0.1, 0.99833], [0.01, 0.999983], [0.001, 0.9999998],
    ];
    for (const [x, expected] of want) {
      expect(ratio('sin-over-x', x)!, `x = ${x}`).toBeCloseTo(expected, 5);
    }
  });

  it('1 − cos(0.1) ≈ 0.004996 —— 比 0.1 小了一个数量级还多', () => {
    expect(oneMinusCos(0.1)).toBeCloseTo(0.004996, 6);
    expect(oneMinusCos(0.1)).toBeLessThan(0.1 / 20);
  });

  it('(1 − cos x)/x² 一路走向 0.5', () => {
    for (const x of [0.5, 0.1, 0.01, 0.001]) {
      expect(ratio('cos-over-x2', x)!, `x = ${x}`).toBeCloseTo(0.5, 1);
    }
    expect(ratio('cos-over-x2', 0.001)!).toBeCloseTo(0.5, 6);
  });

  it('⭐ 同一个分子,分母从 x 换成 x²,答案从 0 变成 ½', () => {
    // 这是第四课的全部内容,值得一条断言。
    expect(formOf('cos-over-x').numeratorTex).toBe(formOf('cos-over-x2').numeratorTex);
    expect(formOf('cos-over-x').denominatorTex).not.toBe(formOf('cos-over-x2').denominatorTex);
    expect(formOf('cos-over-x').limit).toBe(0);
    expect(formOf('cos-over-x2').limit).toBe(0.5);
  });

  it('½ 在界面上写成分数,不写成 0.5', () => {
    expect(formOf('cos-over-x2').limitDisplay).toBe('½');
    expect(formOf('cos-over-x2').limitTex).toContain('\\frac{1}{2}');
  });
});

describe('⭐ 为什么偏偏是 e', () => {
  it('对任意底数 b,取样斜率对上 ln b', () => {
    for (const base of [2, Math.E, 3, 10, 1.5]) {
      expect(baseSlope(base), `base ${base}`).toBeCloseTo(baseSlopeExact(base), 5);
    }
  });

  it('⭐ 只有 e 给出 1 —— 别的底数**在屏幕上就看得出**不是', () => {
    expect(baseSlope(Math.E)).toBeCloseTo(1, 6);
    expect(baseSlope(2)).toBeCloseTo(0.6931, 3);
    expect(baseSlope(3)).toBeCloseTo(1.0986, 3);
    expect(baseSlope(10)).toBeCloseTo(2.3026, 3);

    // ⚠️ 「明显不是 1」要按**显示出来的字符串**判,不是按我觉得多少算明显。
    //    ln 3 = 1.0986,离 1 只有 0.0986 —— 数值上不算远,但显示成 1.0986123
    //    和 1.0000001 是两个一眼不同的东西,而学生看到的正是后者。
    const shown = BASES.map((b) => showRatio(baseSlope(b.value)));
    expect(new Set(shown).size, `底数的读数撞了:${shown.join(' , ')}`).toBe(BASES.length);
    for (const base of [2, 3, 10]) {
      expect(showRatio(baseSlope(base)), `base ${base}`).not.toBe(showRatio(baseSlope(Math.E)));
      expect(Math.abs(baseSlope(base) - 1), `base ${base}`).toBeGreaterThan(0.09);
    }
    // e 比其余任何一个都近**五个数量级**以上。
    const eGap = Math.abs(baseSlope(Math.E) - 1);
    for (const base of [2, 3, 10]) {
      expect(Math.abs(baseSlope(base) - 1) / eGap, `base ${base}`).toBeGreaterThan(1e5);
    }
  });

  it('⚠️ baseSlope 自己也不许踩相减抵消的坑', () => {
    // (e^x − 1)/x 在 x 处的真值是 1 + x/2,所以第 k 档的差距**应该**是 5×10⁻⁽ᵏ⁺¹⁾。
    // 稳定写法一路跟着这个数走;`b ** x - 1` 那种写法到第 9 档就走不动了。
    const gap = (v: number) => Math.abs(v - 1);
    const naiveAt = (k: number) => (Math.E ** decade(k) - 1) / decade(k);

    for (const depth of [7, 9, 11, 13]) {
      expect(gap(baseSlope(Math.E, depth)), `depth ${depth}`).toBeCloseTo(decade(depth) / 2, depth + 3);
    }

    // ⭐ 教科书写法的差距从第 9 档起**卡住不动**(约 8×10⁻⁸),
    //    因为它已经不是在算极限了,是在算舍入误差。
    expect(gap(naiveAt(9))).toBeCloseTo(gap(naiveAt(11)), 12);
    expect(gap(naiveAt(11)) / gap(baseSlope(Math.E, 11))).toBeGreaterThan(1e3);
  });

  it('对数那一侧同理:log_b(1+x)/x → 1 / ln b', () => {
    for (const base of [2, Math.E, 10]) {
      expect(logSlope(base), `base ${base}`).toBeCloseTo(logSlopeExact(base), 5);
    }
    expect(logSlope(Math.E)).toBeCloseTo(1, 6);
  });

  it('界面上摆出来的底数里有 e,而且不止 e', () => {
    expect(BASES.some((b) => b.label === 'e')).toBe(true);
    expect(BASES.length).toBeGreaterThan(2);
    expect(BASES.find((b) => b.label === 'e')!.value).toBe(Math.E);
  });
});

describe('缩放:越放大越像', () => {
  it('⭐ 每一档的相对差距都比上一档小', () => {
    for (const id of FORM_IDS) {
      let previous = Number.POSITIVE_INFINITY;
      for (let level = 0; level <= ZOOM_LEVELS; level += 1) {
        const gap = relativeGapAt(id, level);
        expect(gap, `${id} 在第 ${level} 档反而更不像了`).toBeLessThan(previous);
        previous = gap;
      }
    }
  });

  it('⚠️ 最宽的一档必须**看得出不一样** —— 否则「放大才像」这句话没有对照', () => {
    for (const id of FORM_IDS) {
      expect(relativeGapAt(id, 0), `${id} 一开始就已经重合了`).toBeGreaterThan(0.02);
    }
  });

  it('最深的一档已经几乎重合', () => {
    for (const id of FORM_IDS) {
      expect(relativeGapAt(id, ZOOM_LEVELS), id).toBeLessThan(0.01);
    }
  });

  it('半宽随档位单调变窄', () => {
    for (const id of FORM_IDS) {
      let previous = Number.POSITIVE_INFINITY;
      for (let level = 0; level <= ZOOM_LEVELS; level += 1) {
        const span = spanAt(id, level);
        expect(span, `${id} @ ${level}`).toBeLessThan(previous);
        expect(span).toBeGreaterThan(0);
        previous = span;
      }
    }
    // 越界的档位夹住,不会给出负的或爆炸的半宽
    expect(spanAt('sin-over-x', -3)).toBe(spanAt('sin-over-x', 0));
    expect(spanAt('sin-over-x', 99)).toBe(spanAt('sin-over-x', ZOOM_LEVELS));
  });

  it('每条都有一个 subject 和一个 companion', () => {
    for (const id of FORM_IDS) {
      const roles = formOf(id).curves.map((c) => c.role);
      expect(roles.filter((r) => r === 'subject').length, id).toBe(1);
      expect(roles.filter((r) => r === 'companion').length, id).toBe(1);
    }
  });
});

describe('画曲线与拖动', () => {
  it('⚠️ 比值曲线的取样点里没有 0', () => {
    for (const id of FORM_IDS) {
      for (const count of [7, 8, 100, 240, 241]) {
        const points = sampleRatio(id, -1, 1, count);
        expect(points.some((p) => p.x === 0), `${id} @ ${count}`).toBe(false);
      }
    }
  });

  it('滑块到不了 0,而且留在取景里', () => {
    for (const id of FORM_IDS) {
      const span = formOf(id).startSpan;
      for (const x of [0, 1e-12, -1e-12, 99, -99, Number.NaN]) {
        const clamped = clampX(id, x);
        expect(Math.abs(clamped), `${id} @ ${x}`).toBeGreaterThanOrEqual(MIN_X - 1e-18);
        expect(Math.abs(clamped), `${id} @ ${x}`).toBeLessThanOrEqual(span + 1e-12);
        expect(ratio(id, clamped), `${id} @ ${x}`).not.toBeNull();
      }
    }
  });

  it('「减半」一路减下去会停在下限,不会穿过去', () => {
    for (const id of FORM_IDS) {
      let x = formOf(id).startSpan / 2;
      for (let i = 0; i < 80; i += 1) x = halve(id, x);
      expect(x, id).toBeCloseTo(MIN_X, 12);
      expect(ratio(id, x), id).not.toBeNull();
    }
  });
});

describe('显示', () => {
  it('比值显示七位小数 —— 四位会把最后两档压成同一个 1.0000', () => {
    expect(showRatio(0.9999833334)).toBe('0.9999833');
    expect(showRatio(0.9999998333)).toBe('0.9999998');
    expect(showRatio(0.9999833334)).not.toBe(showRatio(0.9999998333));
  });

  it('极小的 x 用科学记数,不写成 0.00000', () => {
    expect(showX(1e-6)).toContain('10');
    expect(showX(1e-6)).not.toBe('0.00000');
    expect(showX(0.001)).toBe('0.00100');
  });

  it('⚠️ 与极限的距离**永远不显示成 0**', () => {
    expect(showGap(1.67e-13)).toContain('10');
    expect(showGap(0)).toBe('< 10⁻¹⁶');
    expect(showGap(0)).not.toBe('0');
    expect(showGap(null)).toBe('—');
  });

  it('阶梯表每一行都有 x、读数与距离', () => {
    for (const id of FORM_IDS) {
      const rows = rowsFor(id);
      expect(rows).toHaveLength(LADDER.length);
      for (const row of rows) {
        expect(row.value, `${id} @ ${row.x}`).not.toBeNull();
        expect(row.gap, `${id} @ ${row.x}`).not.toBeNull();
      }
      // 距离一路变小
      const gaps = rows.map((r) => r.gap!);
      for (let i = 1; i < gaps.length; i += 1) {
        expect(gaps[i]!, `${id} 第 ${i} 行反而更远了`).toBeLessThanOrEqual(gaps[i - 1]! + 1e-15);
      }
    }
  });

  it('十进位必须精确', () => {
    for (let k = 0; k <= 8; k += 1) expect(decade(k)).toBe(Number(`1e-${k}`));
    // ⚠️ 非整数档也必须给出有限值(首页预览用连续的档做动画)
    for (const k of [0.5, 2.35, 4.9]) {
      expect(Number.isFinite(decade(k)), `decade(${k})`).toBe(true);
      expect(decade(k)).toBeGreaterThan(0);
    }
  });
});

describe('目录本身', () => {
  it('六条按族分好,而且不重不漏', () => {
    const flat = Object.values(FORMS_BY_FAMILY).flat();
    expect(flat.sort()).toEqual([...FORM_IDS].sort());
    expect(new Set(flat).size).toBe(FORM_IDS.length);
  });

  it('每条的标题、钩子、TeX 都互不相同', () => {
    for (const key of ['title', 'headline', 'ratioTex', 'limitTex'] as const) {
      const values = FORM_IDS.map((id) => formOf(id)[key]);
      expect(new Set(values).size, `${key} 撞了`).toBe(FORM_IDS.length);
    }
  });

  it('推导步骤至少三步,而且每步都带一句为什么', () => {
    for (const id of FORM_IDS) {
      const { steps } = formOf(id);
      expect(steps.length, id).toBeGreaterThanOrEqual(3);
      for (const step of steps) {
        expect(step.tex.length, `${id} 有一步没有式子`).toBeGreaterThan(0);
        expect(step.note.length, `${id}:${step.tex} 没有解释`).toBeGreaterThan(10);
      }
    }
  });

  it('⚠️ 没有一条的措辞是「背下来」', () => {
    for (const id of FORM_IDS) {
      const form = formOf(id);
      const prose = [form.lede, form.reading, ...form.steps.map((s) => s.note)].join(' ').toLowerCase();
      expect(prose, id).not.toContain('memoriz');
      expect(prose, id).not.toContain('remember that');
    }
  });
});
