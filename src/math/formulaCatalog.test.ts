import { describe, expect, it } from 'vitest';
import { FORMULA_CATEGORIES, FORMULA_SECTIONS, searchFormulaSections } from './formulaCatalog';

describe('公式卡片库', () => {
  const entries = FORMULA_SECTIONS.flatMap((section) => section.entries);

  it('PDF 的三组编号主表完整:31 条导数、28 条不定积分、15 条定积分', () => {
    expect(entries).toHaveLength(114);
    expect(entries.filter((item) => /^d-\d\d$/.test(item.id))).toHaveLength(31);
    expect(entries.filter((item) => /^i-\d\d$/.test(item.id))).toHaveLength(28);
    expect(entries.filter((item) => /^di-\d\d$/.test(item.id))).toHaveLength(15);
  });

  it('五页都有来源记录且 id 不重复', () => {
    expect(new Set(entries.map((item) => item.id)).size).toBe(entries.length);
    expect(new Set(entries.map((item) => item.sourcePage))).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('每张卡都有可渲染的非空公式', () => {
    for (const item of entries) {
      expect(item.title.trim()).not.toBe('');
      expect(item.tex.length).toBeGreaterThan(0);
      for (const tex of item.tex) expect(tex.trim()).not.toMatch(/^$|NaN|Infinity/);
    }
  });

  it('所有“看推导”按钮只指向站内已有或本次新增的链', () => {
    const routes = new Set(['derivative', 'riemann-sum', 'disk-method', 'shell-method', 'limits', 'unit-circle', 'trig-rates', 'log-integral']);
    for (const item of entries) {
      if (item.deriveRoute) expect(routes.has(item.deriveRoute)).toBe(true);
    }
  });

  it('Formula Deck 只收公式,读法与误解只归 Calc Type Board', () => {
    expect(FORMULA_CATEGORIES.map((category) => category.id)).not.toContain('notation');
    expect(entries.some((item) => item.id.endsWith('-reading') || item.id === 'limit-notation')).toBe(false);
  });

  it('搜索会跨标题、公式与别名,分类筛选不会串栏', () => {
    expect(searchFormulaSections('secant').flatMap((s) => s.entries).map((e) => e.id)).toContain('derivative-definition');
    expect(searchFormulaSections('sin', 'integrals').flatMap((s) => s.entries).every((e) => /^i-/.test(e.id))).toBe(true);
    expect(searchFormulaSections('definitely-not-a-formula')).toEqual([]);
  });

  it('单位圆不是只抄第一象限:四象限 17 个标准角都在卡片里', () => {
    const unitCircle = entries.find((item) => item.id === 'unit-circle-coordinates')?.tex.join(' ') ?? '';
    for (const angle of ['0:', '\\frac\\pi6', '\\frac{2\\pi}3', '\\pi:', '\\frac{7\\pi}6', '\\frac{3\\pi}2', '\\frac{11\\pi}6', '2\\pi:']) {
      expect(unitCircle).toContain(angle);
    }
  });
});

describe('⭐ 单调性不能用严格不等号写成 iff', () => {
  /**
   * 这是一条**改正过的错误**的回归测试。
   * 卡片原文是 `F↑ ⟺ F′>0` —— 反方向不成立:x³ 在整条实轴递增,
   * 而它在 0 处的导数是 0。所以"递增"配的是 `≥`,不是 `>`。
   */
  const behaviour = FORMULA_SECTIONS
    .flatMap((s) => s.entries)
    .find((e) => e.id === 'accumulation-behavior');

  it('那张卡还在(否则下面几条就是空跑)', () => {
    expect(behaviour).toBeDefined();
  });

  it('不再声称「递增 ⟺ 导数为正」', () => {
    const lines = behaviour!.tex;
    for (const line of lines) {
      const claimsIff = line.includes('\\iff');
      const strictOnDerivative = /F'>0|F'<0/.test(line);
      expect(
        claimsIff && strictOnDerivative,
        `这一行把严格不等号写进了双向箭头:${line}`,
      ).toBe(false);
    }
  });

  it('单调那两行用的是 ≥ / ≤', () => {
    const monotone = behaviour!.tex.filter((l) => l.includes('increasing') || l.includes('decreasing'));
    expect(monotone.length).toBeGreaterThanOrEqual(2);
    expect(monotone.some((l) => l.includes('\\ge'))).toBe(true);
    expect(monotone.some((l) => l.includes('\\le'))).toBe(true);
  });

  it('x³ 这个反例本身是真的 —— 处处递增,原点导数为零', () => {
    const cube = (x: number) => x * x * x;
    const dCube = (x: number) => 3 * x * x;
    for (let x = -2; x < 2; x += 0.1) expect(cube(x + 0.1)).toBeGreaterThan(cube(x));
    expect(dCube(0)).toBe(0);
  });
});
