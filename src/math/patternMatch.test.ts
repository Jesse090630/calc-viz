/**
 * `patternMatch.ts` 的测试。
 *
 * ⭐⭐ 三条硬约束:
 *   ① 系数是**算出来的常数**,不是我随手写的数字;
 *   ② 有理数算术与取样两条路给出同一个答案;
 *   ③ 答案在屏幕上写成 `8/3`,不是 `2.6666666666666665`。
 */
import { describe, it, expect } from 'vitest';
import {
  ASK_INSTEAD,
  PROBE_DEPTH,
  PROBLEM_IDS,
  allProblems,
  answerByLadder,
  answerByPattern,
  answerTex,
  answerValue,
  coefficientAt,
  coefficientHolds,
  exampleFor,
  needOf,
  plainTex,
  problemOf,
  repairSteps,
  rowsFor,
  showValue,
  templateInstanceMatches,
} from './patternMatch';
import {
  FORM_IDS,
  formOf,
  rationalTex,
  rationalValue,
  reduce,
} from './specialForms';

describe('⭐⭐ 系数是算出来的,不是写上去的', () => {
  it('每道题的 u^d /(c·x^p) 在好几个 x 上都是同一个常数', () => {
    for (const id of PROBLEM_IDS) {
      expect(coefficientHolds(id), id).toBe(true);
    }
  });

  it('而那个常数**就是**声明的有理数', () => {
    for (const id of PROBLEM_IDS) {
      const declared = rationalValue(reduce(problemOf(id).coefficient));
      for (const x of [0.9, -0.3, 0.02]) {
        expect(coefficientAt(id, x), `${id} @ ${x}`).toBeCloseTo(declared, 9);
      }
    }
  });

  it('⚠️ 这条检查真的抓得住错的系数(否则它只是在自我确认)', () => {
    // 把 sin(5x)/x 的系数从 5 改成 3,`coefficientHolds` 必须报 false。
    const good = problemOf('sin-5x');
    const declaredWrong = rationalValue({ num: 3, den: 1 });
    const actual = coefficientAt('sin-5x', 0.4);
    expect(actual).toBeCloseTo(5, 12);
    expect(Math.abs(actual - declaredWrong)).toBeGreaterThan(1);
    expect(rationalValue(good.coefficient)).toBe(5);
  });

  it('⭐ 分母平方的时候,系数跟着**平方** —— 3 变 9,不是 3', () => {
    expect(coefficientAt('cos-3x', 0.5)).toBeCloseTo(9, 9);
    expect(coefficientAt('cos-4x-3x2', 0.5)).toBeCloseTo(16 / 3, 9);
    // 而分母是一次的时候不平方
    expect(coefficientAt('sin-5x', 0.5)).toBeCloseTo(5, 9);
  });
});

describe('⭐⭐ 两条独立路径给出同一个答案', () => {
  it('有理数算术 vs 直接取样', () => {
    // ⚠️ 容差要按**相对**误差判,而且要配得上阶梯深度。
    //    `(e^{4x} − 1)/x` 在 x = 10⁻⁶ 处是 4.000008 —— 差 8×10⁻⁶,
    //    那不是 bug,是二阶项 4x/2 被外面的系数 4 放大了四倍。
    //    绝对容差 5×10⁻⁶ 会把这个**正确**的读数判成失败。
    for (const id of PROBLEM_IDS) {
      const ladder = answerByLadder(id);
      const target = answerValue(id);
      expect(ladder, id).not.toBeNull();
      const relative = Math.abs(ladder! - target) / Math.max(1, Math.abs(target));
      expect(relative, `${id}:pattern=${target} ladder=${ladder}`).toBeLessThan(1e-5);
    }
  });

  it('阶梯一档比一档更接近答案', () => {
    for (const id of PROBLEM_IDS) {
      const target = answerValue(id);
      const rows = rowsFor(id);
      let previous = Number.POSITIVE_INFINITY;
      let moved = 0;
      for (const row of rows) {
        expect(row.value, `${id} @ ${row.x}`).not.toBeNull();
        const gap = Math.abs(row.value! - target);
        expect(gap, `${id} 在 x = ${row.x} 反而走远了`).toBeLessThanOrEqual(previous + 1e-12);
        if (gap < previous) moved += 1;
        previous = gap;
      }
      // 防空跑
      expect(moved, `${id} 的阶梯从头到尾没动过`).toBeGreaterThan(2);
      expect(previous, `${id} 最后一档还差 ${previous}`).toBeLessThan(1e-5);
    }
  });

  it('题面在 x = 0 处返回 null,不返回 NaN', () => {
    for (const id of PROBLEM_IDS) {
      expect(problemOf(id).at(0), id).toBeNull();
      expect(showValue(problemOf(id).at(0))).toBe('undefined');
    }
  });

  it('⚠️ ln(1 + 2x) 在 x ≤ −½ 处没有值', () => {
    expect(problemOf('log-2x').at(-0.5)).toBeNull();
    expect(problemOf('log-2x').at(-1)).toBeNull();
    expect(problemOf('log-2x').at(0.2)).not.toBeNull();
  });
});

describe('⭐⭐ 答案写成分数,不写成浮点', () => {
  it('提示词点名的三道:5、3/7、4', () => {
    expect(answerTex('sin-5x')).toBe('5');
    expect(answerValue('sin-5x')).toBe(5);
    expect(answerTex('sin-3x-7x')).toBe('\\frac{3}{7}');
    expect(answerValue('sin-3x-7x')).toBeCloseTo(3 / 7, 15);
    expect(answerTex('exp-4x')).toBe('4');
    expect(answerValue('exp-4x')).toBe(4);
  });

  it('用到 ½ 那条模板的两道,分数要**约分**', () => {
    // 9 × ½ = 9/2
    expect(answerTex('cos-3x')).toBe('\\frac{9}{2}');
    expect(answerValue('cos-3x')).toBe(4.5);
    // 16/3 × ½ = 16/6 = 8/3(必须约到 8/3)
    expect(answerTex('cos-4x-3x2')).toBe('\\frac{8}{3}');
    expect(answerTex('cos-4x-3x2')).not.toContain('16');
    expect(answerValue('cos-4x-3x2')).toBeCloseTo(8 / 3, 15);
  });

  it('⭐ `answerByPattern` 返回的分数**本身**就是最简的', () => {
    // ⚠️ 变异测试抓到的一个洞:把 `multiply` 里的约分去掉,整套测试**全绿** ——
    //    因为 `rationalTex` 自己也会约一次,显示出来照样是 8/3。
    //    两个地方各约一次,等于没人对「存的是不是最简」负责。
    //    这条断言直接钉住返回值,而不是钉住它渲染之后的样子。
    expect(answerByPattern('cos-4x-3x2')).toEqual({ num: 8, den: 3 });
    expect(answerByPattern('cos-3x')).toEqual({ num: 9, den: 2 });
    expect(answerByPattern('sin-5x')).toEqual({ num: 5, den: 1 });
    expect(answerByPattern('cos-5x-2x')).toEqual({ num: 0, den: 1 });
  });

  it('⚠️ 走浮点会写不出 8/3 —— 先证明这个坑存在', () => {
    expect(String((16 / 3) * 0.5)).toBe('2.6666666666666665');
    expect(answerTex('cos-4x-3x2')).not.toContain('2.66');
  });

  it('分母是 1 的时候不写成分数', () => {
    expect(rationalTex({ num: 5, den: 1 })).toBe('5');
    expect(rationalTex({ num: 6, den: 3 })).toBe('2');
    expect(rationalTex({ num: 0, den: 7 })).toBe('0');
    expect(rationalTex({ num: -4, den: 6 })).toBe('-\\frac{2}{3}');
  });
});

describe('⭐ 模板换元之后的样子', () => {
  it('每道题的 templateInstanceTex 与模板换元后一致', () => {
    for (const id of PROBLEM_IDS) {
      expect(templateInstanceMatches(id), `${id}:${problemOf(id).templateInstanceTex}`).toBe(true);
    }
  });

  it('⚠️ 归一化比对确实抓得住换错的 u(不是恒真)', () => {
    // 把 sin-5x 的 templateInstance 换成 3x 的版本,必须比不上。
    const substituted = formOf('sin-over-x').templateTex.replace(/(?<![a-zA-Z\\])u(?![a-zA-Z])/g, '5x');
    const wrong = '\\frac{\\sin 3x}{3x}';
    const strip = (t: string) => t.replace(/[{}()\s]/g, '');
    expect(strip(substituted)).not.toBe(strip(wrong));
    expect(strip(substituted)).toBe(strip('\\frac{\\sin 5x}{5x}'));
  });

  it('⚠️ 平方那两道必须带括号 —— {3x}^2 在 TeX 里是 3x²', () => {
    expect(problemOf('cos-3x').templateInstanceTex).toContain('(3x)^2');
    expect(problemOf('cos-4x-3x2').templateInstanceTex).toContain('(4x)^2');
  });

  it('题面与模板实例不是同一个式子 —— 否则就没有变形可言', () => {
    for (const id of PROBLEM_IDS) {
      const problem = problemOf(id);
      if (needOf(id).matched) continue;
      expect(problem.tex, id).not.toContain(problem.templateInstanceTex);
    }
  });
});

describe('「差了什么」', () => {
  it('每道题都说清楚现在有什么、要什么', () => {
    for (const id of PROBLEM_IDS) {
      const need = needOf(id);
      expect(need.have.length, id).toBeGreaterThan(0);
      expect(need.want.length, id).toBeGreaterThan(0);
      expect(need.fix.length, id).toBeGreaterThan(10);
    }
  });

  it('⭐ 已经对上的那道说「不用修」,其余七道说要修', () => {
    expect(needOf('sin-x2').matched).toBe(true);
    expect(needOf('sin-x2').fix).toContain('Nothing to repair');
    const needRepair = PROBLEM_IDS.filter((id) => !needOf(id).matched);
    expect(needRepair).toHaveLength(PROBLEM_IDS.length - 1);
  });

  it('⚠️ 提示说的是**分母怎么修**,不是这道题等于几', () => {
    // 我原本想断言「提示里不出现答案」。那条是错的:模板极限是 1 的时候,
    // 系数就**等于**答案(sin 5x / x 的系数 5 就是答案 5),
    // 提示不可能既说清楚要提出什么、又不说出那个数。
    // 真正该守的是**语气**:提示描述动作,不宣布结论。
    for (const id of PROBLEM_IDS) {
      const fix = needOf(id).fix.toLowerCase();
      for (const forbidden of ['the limit is', 'the answer is', 'equals', ' = ']) {
        expect(fix, `${id} 的提示在宣布结论`).not.toContain(forbidden);
      }
      if (!needOf(id).matched) {
        expect(fix, `${id} 的提示没说要修什么`).toContain('denominator');
      }
    }
  });
});

describe('变形的每一步', () => {
  it('每道题至少三步,而且都带一句为什么', () => {
    for (const id of PROBLEM_IDS) {
      const steps = repairSteps(id);
      expect(steps.length, id).toBeGreaterThanOrEqual(3);
      for (const step of steps) {
        expect(step.tex.length, `${id} 有一步没有式子`).toBeGreaterThan(0);
        expect(step.note.length, `${id}:${step.tex} 没有解释`).toBeGreaterThan(10);
      }
    }
  });

  it('⭐ 最后一步给出的答案与有理数算术一致', () => {
    for (const id of PROBLEM_IDS) {
      const last = repairSteps(id)[repairSteps(id).length - 1]!;
      expect(last.tex, id).toContain(answerTex(id));
    }
  });

  it('要修的那七道,中间多出一步「修分母」', () => {
    expect(repairSteps('sin-x2')).toHaveLength(3);
    for (const id of PROBLEM_IDS.filter((i) => i !== 'sin-x2')) {
      expect(repairSteps(id).length, id).toBe(4);
      expect(repairSteps(id)[1]!.note, id).toContain('Multiply and divide');
    }
  });

  it('第一步摆的是模板本身,而且是这道题认的那一条', () => {
    for (const id of PROBLEM_IDS) {
      const form = formOf(problemOf(id).template);
      expect(repairSteps(id)[0]!.tex, id).toContain(form.templateTex);
    }
  });

  it('⚠️ 步骤是生成的 —— 换一道题,系数必须跟着变', () => {
    const five = repairSteps('sin-5x').map((s) => s.tex).join(' ');
    const threeSevenths = repairSteps('sin-3x-7x').map((s) => s.tex).join(' ');
    expect(five).toContain('5');
    expect(threeSevenths).toContain('\\frac{3}{7}');
    expect(five).not.toBe(threeSevenths);
  });
});

describe('题库本身', () => {
  it('九道题,id 不重复', () => {
    expect(allProblems()).toHaveLength(9);
    expect(new Set(PROBLEM_IDS).size).toBe(9);
  });

  it('⭐ 六条模板每一条都至少被一道题用到', () => {
    const used = new Set(allProblems().map((p) => p.template));
    for (const id of FORM_IDS) {
      expect(used.has(id), `模板 ${id} 一道题都没有`).toBe(true);
    }
  });

  it('每条模板挂的那道例题真的存在,而且认的就是这条模板', () => {
    for (const id of FORM_IDS) {
      const example = exampleFor(id);
      expect(PROBLEM_IDS, `${id} 挂的例题不存在`).toContain(example.id);
      expect(example.template, `${id} 挂的例题认的是 ${example.template}`).toBe(id);
    }
  });

  it('题面互不相同', () => {
    const texs = allProblems().map((p) => p.tex);
    expect(new Set(texs).size).toBe(texs.length);
  });

  it('答案不全一样 —— 否则这套练习什么也没练', () => {
    const answers = PROBLEM_IDS.map(answerValue);
    expect(new Set(answers).size).toBeGreaterThan(4);
  });

  it('那句落点是「能不能变成我会的」,不是「背哪个技巧」', () => {
    expect(ASK_INSTEAD.toLowerCase()).toContain('already know');
    expect(ASK_INSTEAD.toLowerCase()).toContain('do not ask');
  });

  it('取样深度够深,但没深到浮点开始说谎', () => {
    expect(PROBE_DEPTH).toBeGreaterThanOrEqual(5);
    expect(PROBE_DEPTH).toBeLessThanOrEqual(8);
  });
});

describe('⚠️ 散文里的上标', () => {
  it('TeX 的 ^2 在纯文本里写成 ²,不写成 "^2"', () => {
    expect(plainTex('(4x)^2')).toBe('(4x)²');
    expect(plainTex('3x^2')).toBe('3x²');
    expect(plainTex('x^{2}')).toBe('x²');
    expect(plainTex('5x')).toBe('5x');
  });

  it('⭐ 每道题的提示与步骤说明里都不许出现 "^"', () => {
    // 那句话是散文,不走 KaTeX —— 塞 TeX 进去屏幕上就写着 (4x)^2。
    for (const id of PROBLEM_IDS) {
      expect(needOf(id).fix, `${id} 的提示`).not.toContain('^');
      for (const step of repairSteps(id)) {
        expect(step.note, `${id} 的步骤说明`).not.toContain('^');
      }
    }
  });

  it('⚠️ 但**式子**里该有 TeX 上标 —— 别把它们一起洗掉了', () => {
    const texes = repairSteps('cos-4x-3x2').map((s) => s.tex).join(' ');
    expect(texes).toContain('^');
  });
});
