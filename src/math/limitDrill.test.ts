/**
 * ⚠️⚠️ 这个文件最重要的一条断言只有一句话:
 *
 *   **每一道生成出来的题,它自称的答案,都要和「拿真实函数数值求极限」对得上。**
 *
 * 出题器里写错一个系数(`a/b` 写成 `b/a`、`a²/2` 写成 `a/2`),
 * `answer` 会跟着一起错 —— 而 `numericLimit` 不会,因为它只看 `f`,
 * 完全不知道这题**打算**用哪条特殊极限。
 * 一道答案错的练习题比没有练习题糟得多:学生会以为自己错了。
 */
import { describe, expect, it } from 'vitest';
import {
  CONCEPTS,
  DNE,
  type Kind,
  type Level,
  SPECIALS,
  answerText,
  buildReport,
  makeConcept,
  makeProblem,
  makeRng,
  num,
  numericLimit,
  parseAnswer,
  sameAnswer,
  specialOf,
} from './limitDrill';

const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];

describe('八条特殊极限本身', () => {
  it('值就是课本上的那八个', () => {
    const byKind = Object.fromEntries(SPECIALS.map((s) => [s.kind, s.value]));
    expect(byKind['sin-u']).toBe(1);
    expect(byKind['u-sin']).toBe(1);
    expect(byKind['exp-u']).toBe(1);
    expect(byKind['u-exp']).toBe(1);
    expect(byKind['log-u']).toBe(1);
    expect(byKind['u-log']).toBe(1);
    expect(byKind['cos-u2']).toBe(0.5);
    expect(byKind['u2-cos']).toBe(2);
  });

  it('⭐ 成对的两条互为倒数 —— 这正是"倒过来写"那条概念题的依据', () => {
    const pairs: readonly (readonly [Kind, Kind])[] = [
      ['sin-u', 'u-sin'], ['exp-u', 'u-exp'], ['log-u', 'u-log'], ['cos-u2', 'u2-cos'],
    ];
    let checked = 0;
    for (const [a, b] of pairs) {
      expect(specialOf(a)!.value * specialOf(b)!.value).toBeCloseTo(1, 12);
      checked += 1;
    }
    expect(checked).toBe(4);
  });

  it('⭐ 八条都用数值验一遍 —— 别只照抄课本', () => {
    const fs: Record<string, (u: number) => number> = {
      'sin-u': (u) => Math.sin(u) / u,
      'u-sin': (u) => u / Math.sin(u),
      'exp-u': (u) => (Math.exp(u) - 1) / u,
      'u-exp': (u) => u / (Math.exp(u) - 1),
      'log-u': (u) => Math.log(1 + u) / u,
      'u-log': (u) => u / Math.log(1 + u),
      'cos-u2': (u) => (1 - Math.cos(u)) / (u * u),
      'u2-cos': (u) => (u * u) / (1 - Math.cos(u)),
    };
    for (const s of SPECIALS) {
      const got = numericLimit(fs[s.kind]!, 0);
      expect(got.kind, s.kind).toBe('number');
      expect((got as { value: number }).value, s.kind).toBeCloseTo(s.value, 3);
    }
  });
});

describe('数值求极限本身靠不靠得住', () => {
  it('普通的连续函数', () => {
    const got = numericLimit((x) => x * x + 1, 3);
    expect(got).toEqual(expect.objectContaining({ kind: 'number' }));
    expect((got as { value: number }).value).toBeCloseTo(10, 3);
  });

  it('⭐ 两侧不一致时报 DNE', () => {
    expect(numericLimit((x) => Math.abs(x) / x, 0)).toEqual(DNE);
  });

  it('⭐ 爆掉时报 DNE', () => {
    expect(numericLimit((x) => 1 / (x * x), 0)).toEqual(DNE);
    expect(numericLimit((x) => Math.sin(x) / (x * x), 0)).toEqual(DNE);
  });

  it('⚠️ 步长不能细到把 1 − cos u 舍成 0 —— 那条极限照样求得出来', () => {
    const got = numericLimit((x) => (1 - Math.cos(x)) / (x * x), 0);
    expect((got as { value: number }).value).toBeCloseTo(0.5, 3);
  });
});

describe('⭐⭐⭐ 每一道题的答案都要经得起数值检验', () => {
  for (const level of LEVELS) {
    it(`等级 ${level}:两百道题,答案全对`, () => {
      const rng = makeRng(1000 + level);
      let checked = 0;
      for (let i = 0; i < 200; i += 1) {
        const p = makeProblem(level, rng);
        const got = numericLimit(p.f, p.approach);
        expect(
          sameAnswer(got, p.answer, 2e-2),
          `等级 ${level} 第 ${i} 题「${p.tex}」自称 ${answerText(p.answer)},数值求出 ${answerText(got)}`,
        ).toBe(true);
        checked += 1;
      }
      expect(checked, '循环空转了').toBe(200);
    });
  }

  it('⭐ 而这条检验**真的会抓错** —— 故意把答案改错试一下', () => {
    const rng = makeRng(7);
    const p = makeProblem(2, rng);
    const wrong = { ...p, answer: num((p.answer as { value: number }).value + 1) };
    const got = numericLimit(wrong.f, wrong.approach);
    expect(sameAnswer(got, wrong.answer, 2e-2)).toBe(false);
  });
});

describe('题面与解答的完整性', () => {
  it('每道题都有题面、两条提示、至少两步解答', () => {
    for (const level of LEVELS) {
      const rng = makeRng(50 + level);
      for (let i = 0; i < 60; i += 1) {
        const p = makeProblem(level, rng);
        expect(p.tex).toContain('\\lim');
        expect(p.hints).toHaveLength(2);
        expect(p.hints[0].length).toBeGreaterThan(20);
        expect(p.hints[1].length).toBeGreaterThan(15);
        expect(p.steps.length).toBeGreaterThanOrEqual(2);
        expect(p.level).toBe(level);
      }
    }
  });

  it('⭐⭐ 两条提示各司其职:第一条只说"什么趋于 0",第二条才点名特殊极限', () => {
    /**
     * ⚠️ 第一版断言的是"第一条提示里不许出现答案那个数字" —— 那是个坏代理:
     *   `sin(5x)/x → 5` 的第一条提示**必须**说"5x 趋于 0",
     *   而答案正好也是 5。提示没有泄题,是断言选错了检查对象。
     * ⭐ 改成查**契约本身**:第一条不许点名特殊极限、不许下结论;
     *   第二条必须点名。
     */
    let checked = 0;
    for (const level of LEVELS) {
      const rng = makeRng(900 + level);
      for (let i = 0; i < 60; i += 1) {
        const p = makeProblem(level, rng);
        const first = p.hints[0].toLowerCase();
        // 第一条不许下结论
        expect(first, `等级 ${level} 第一条提示把话说完了`).not.toMatch(/the (answer|limit) is|equals/);
        // 第一条不许点名任何一条特殊极限
        if (p.kind !== 'none') {
          const label = specialOf(p.kind)!.label.toLowerCase();
          expect(first, `等级 ${level} 第一条提示直接点名了 ${label}`).not.toContain(label.slice(0, 5));
        }
        checked += 1;
      }
    }
    expect(checked, '循环空转了').toBe(300);
  });

  it('⭐ 而第二条提示**必须**点到该用哪条特殊极限', () => {
    let named = 0;
    let total = 0;
    for (const level of [1, 2, 3, 4] as const) {
      const rng = makeRng(950 + level);
      for (let i = 0; i < 60; i += 1) {
        const p = makeProblem(level, rng);
        if (p.kind === 'none') continue;
        total += 1;
        const second = p.hints[1].toLowerCase();
        const label = specialOf(p.kind)!.label.toLowerCase();
        // 要么写出名字,要么写出关键字(sin / e^u / ln / cos)
        if (second.includes(label.slice(0, 5)) || /sin|e\^u|ln|cos|factor|rewrite|notice/.test(second)) named += 1;
      }
    }
    expect(total).toBeGreaterThan(150);
    expect(named / total, '第二条提示没起到"点名"的作用').toBeGreaterThan(0.95);
  });

  it('⭐⭐ 任何一步解答里都不许出现洛必达', () => {
    for (const level of LEVELS) {
      const rng = makeRng(300 + level);
      for (let i = 0; i < 80; i += 1) {
        const p = makeProblem(level, rng);
        const all = [...p.steps.map((s) => s.say), ...p.hints].join(' ').toLowerCase();
        expect(all).not.toContain('hopital');
        expect(all).not.toContain('hôpital');
        expect(all).not.toContain('lhopital');
      }
    }
  });

  it('⭐ 等级 3 与 4 必须给出代换,那是它们要教的东西', () => {
    for (const level of [3, 4] as const) {
      const rng = makeRng(400 + level);
      let withSub = 0;
      for (let i = 0; i < 60; i += 1) {
        if (makeProblem(level, rng).substitution !== null) withSub += 1;
      }
      expect(withSub, `等级 ${level} 基本都该带代换`).toBeGreaterThan(50);
    }
  });
});

describe('⭐⭐ 等级的性格:每一级要教的东西都真的在题里', () => {
  const sample = (level: Level, n = 400) => {
    const rng = makeRng(2000 + level);
    return Array.from({ length: n }, () => makeProblem(level, rng));
  };

  it('等级 1 全在 x → 0,而且八条特殊极限都出得到', () => {
    const ps = sample(1);
    expect(ps.every((p) => p.approach === 0)).toBe(true);
    const kinds = new Set(ps.map((p) => p.kind));
    expect(kinds.size).toBe(8);
  });

  it('⭐ 等级 3 **不**在 x → 0 —— 这一级的全部意义就是这个', () => {
    const ps = sample(3);
    expect(ps.every((p) => p.approach !== 0)).toBe(true);
    // 而且正负都要有,不能只往右挪
    expect(ps.some((p) => p.approach < 0)).toBe(true);
    expect(ps.some((p) => p.approach > 0)).toBe(true);
  });

  it('⭐ 等级 2 的答案不总是 1 —— 否则系数就白加了', () => {
    const vals = new Set(sample(2).map((p) => answerText(p.answer)));
    expect(vals.size).toBeGreaterThan(6);
    expect(vals.has('1')).toBe(true);
  });

  it('⭐⭐ 等级 5 必须掺进"根本不用特殊极限"的题', () => {
    const ps = sample(5);
    const plain = ps.filter((p) => p.kind === 'none');
    expect(plain.length, '一道都没有的话,学生学到的是"见 0/0 就套公式"').toBeGreaterThan(30);
    // 里面要有直接代入就能做的(趋近点不是 0)
    expect(plain.some((p) => p.approach !== 0)).toBe(true);
    // 也要有极限不存在的
    expect(ps.some((p) => p.answer.kind === 'dne')).toBe(true);
  });

  it('⭐ 等级 5 里那道 (1 − cos x)/x 的答案是 **0**,不是 1/2', () => {
    const ps = sample(5, 600);
    const trap = ps.find((p) => p.tex.includes('1 - \\cos x}{x}'));
    expect(trap, '这道陷阱题没出现过').toBeTruthy();
    expect(answerText(trap!.answer)).toBe('0');
  });

  it('⭐ 同一个种子出同一套题 —— 可复现', () => {
    for (const lv of LEVELS) {
      const a = makeRng(42);
      const b = makeRng(42);
      for (let i = 0; i < 15; i += 1) {
        expect(makeProblem(lv, a).tex).toBe(makeProblem(lv, b).tex);
      }
    }
  });

  it('⭐ 但不同种子出的题要真的不一样,不能只换个数字壳', () => {
    const texts = new Set(
      Array.from({ length: 40 }, (_, i) => makeProblem(4, makeRng(i + 1)).tex),
    );
    expect(texts.size).toBeGreaterThan(5);
  });
});

describe('答案解析', () => {
  it('整数、小数、分数都认', () => {
    expect(parseAnswer('2')).toEqual(num(2));
    expect(parseAnswer('-3')).toEqual(num(-3));
    expect(parseAnswer('0.5')).toEqual(num(0.5));
    expect(parseAnswer('.5')).toEqual(num(0.5));
    expect(parseAnswer('1/2')).toEqual(num(0.5));
    expect(parseAnswer(' 3 / 4 ')).toEqual(num(0.75));
    expect(parseAnswer('-1/4')).toEqual(num(-0.25));
  });

  it('⭐ Unicode 减号也要认 —— 手机上很容易打出来', () => {
    expect(parseAnswer('−3')).toEqual(num(-3));
    expect(parseAnswer('–1/2')).toEqual(num(-0.5));
  });

  it('DNE 的几种写法', () => {
    expect(parseAnswer('DNE')).toEqual(DNE);
    expect(parseAnswer('dne')).toEqual(DNE);
    expect(parseAnswer('does not exist')).toEqual(DNE);
    expect(parseAnswer('no limit')).toEqual(DNE);
  });

  it('⭐ 看不懂的就返回 null,不要瞎猜成 0', () => {
    expect(parseAnswer('')).toBeNull();
    expect(parseAnswer('abc')).toBeNull();
    expect(parseAnswer('1/0')).toBeNull();
    expect(parseAnswer('1/2/3')).toBeNull();
    expect(parseAnswer('e')).toBeNull();
  });

  it('⭐ 小数近似要算对 —— 学生打 0.333 就是想说 1/3', () => {
    expect(sameAnswer(num(0.333), num(1 / 3))).toBe(true);
    expect(sameAnswer(num(0.3), num(1 / 3))).toBe(false);
    expect(sameAnswer(num(0.5), num(0.5))).toBe(true);
  });

  it('DNE 和数值不能互相算对', () => {
    expect(sameAnswer(DNE, num(1))).toBe(false);
    expect(sameAnswer(num(1), DNE)).toBe(false);
    expect(sameAnswer(DNE, DNE)).toBe(true);
  });

  it('answerText 把常见分数写成分数', () => {
    expect(answerText(num(0.5))).toBe('1/2');
    expect(answerText(num(2))).toBe('2');
    expect(answerText(num(3 / 5))).toBe('3/5');
    expect(answerText(num(-0.25))).toBe('-1/4');
    expect(answerText(DNE)).toBe('does not exist');
  });
});

describe('概念题', () => {
  it('每道都有四个选项、一个正确答案、一句解释', () => {
    for (const c of CONCEPTS) {
      expect(c.choices.length).toBeGreaterThanOrEqual(3);
      expect(c.correct).toBeGreaterThanOrEqual(0);
      expect(c.correct).toBeLessThan(c.choices.length);
      expect(c.why.length).toBeGreaterThan(30);
    }
  });

  it('⭐ 正确答案不总是同一个位置 —— 否则学生数位置就行了', () => {
    expect(new Set(CONCEPTS.map((c) => c.correct)).size).toBeGreaterThan(1);
  });

  it('⭐ 那几道点名要考的概念都在', () => {
    const all = CONCEPTS.map((c) => c.prompt.toLowerCase()).join(' | ');
    expect(all).toContain('g(x)/f(x)');            // 倒过来
    expect(all).toContain('upside down');           // 反着写
    expect(all).toContain('approach 0');            // x 必须趋于 0 吗
    expect(all).toContain('x → 7');                 // 哪个式子趋于 0
    expect(all).toContain('sin(x−3)/(x−3)');        // 为什么能用
  });

  it('随机取得出来', () => {
    const rng = makeRng(5);
    for (let i = 0; i < 20; i += 1) expect(CONCEPTS).toContain(makeConcept(rng));
  });
});

describe('十题总结', () => {
  it('分数就是答对的道数', () => {
    const at = [
      { kind: 'sin-u' as Kind, level: 1 as Level, right: true },
      { kind: 'exp-u' as Kind, level: 1 as Level, right: false },
      { kind: 'concept' as const, level: null, right: true },
    ];
    const r = buildReport(at);
    expect(r.score).toBe(2);
    expect(r.outOf).toBe(3);
  });

  it('⭐ 只报**真的错过**的类型', () => {
    const r = buildReport([
      { kind: 'cos-u2', level: 2, right: false },
      { kind: 'cos-u2', level: 2, right: false },
      { kind: 'sin-u', level: 1, right: true },
    ]);
    expect(r.weakest).toEqual(['cos-u2']);
    expect(r.advice.toLowerCase()).toContain('cosine');
  });

  it('⭐ 全对时不要硬找毛病', () => {
    const r = buildReport([
      { kind: 'sin-u', level: 3, right: true },
      { kind: 'log-u', level: 3, right: true },
    ]);
    expect(r.weakest).toEqual([]);
    expect(r.advice).toContain('level 4');
  });

  it('⭐ 错在"根本不用特殊极限"那类题上时,给的建议要对症', () => {
    const r = buildReport([
      { kind: 'none', level: 5, right: false },
      { kind: 'none', level: 5, right: false },
    ]);
    expect(r.advice.toLowerCase()).toContain('substitute first');
  });

  it('概念题答错不算进特殊极限的弱项', () => {
    const r = buildReport([{ kind: 'concept', level: null, right: false }]);
    expect(r.weakest).toEqual([]);
  });
});

describe('⚠️ 变异测试逼出来的一条:发散的特征是"一直跑",不是"数字大"', () => {
  /**
   * 变异体"去掉 |值| > 1e6 就算发散"活了下来 —— 因为那条判据本来就多余:
   * 爆掉的函数会被"自己要稳"那条抓住。
   * ⭐ 而且它还会**冤枉人**:极限确实很大的函数会被错报成不存在。
   */
  it('⭐ 极限很大但确实存在的,不许报 DNE', () => {
    // ⚠️ 在 x = 2 处极限是 10⁹ **+ 2**,不是 10⁹ —— 断言也得写对
    const got = numericLimit((x) => 1e9 + x, 2);
    expect(got.kind).toBe('number');
    expect((got as { value: number }).value).toBeCloseTo(1e9 + 2, 3);
  });

  it('⭐ 而真正爆掉的照样报 DNE —— 靠的是"随 h 一直变"', () => {
    expect(numericLimit((x) => 1 / (x * x), 0)).toEqual(DNE);
    expect(numericLimit((x) => 1 / Math.abs(x), 0)).toEqual(DNE);
    expect(numericLimit((x) => -Math.log(Math.abs(x)), 0)).toEqual(DNE);
  });

  it('⭐ 慢慢发散的也抓得住', () => {
    expect(numericLimit((x) => 1 / Math.abs(x) ** 0.25, 0)).toEqual(DNE);
  });
});
