import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FORMULA_CATEGORIES, FORMULA_SECTIONS, searchFormulaSections } from './formulaCatalog';

describe('公式卡片库', () => {
  const entries = FORMULA_SECTIONS.flatMap((section) => section.entries);

  it('PDF 的三组编号主表完整:31 条导数、28 条不定积分、15 条定积分', () => {
    // ⚠️ 这个总数会随着补录公式表的其余部分增长。数字本身不是重点,
    //    重点是三组编号主表**一条不少** —— 那三组是有编号的,漏一条就能数出来。
    expect(entries.length).toBeGreaterThanOrEqual(114);
    expect(entries.filter((item) => /^d-\d\d$/.test(item.id))).toHaveLength(31);
    expect(entries.filter((item) => /^i-\d\d$/.test(item.id))).toHaveLength(28);
    expect(entries.filter((item) => /^di-\d\d$/.test(item.id))).toHaveLength(15);
  });

  it('五页都有来源记录且 id 不重复', () => {
    expect(new Set(entries.map((item) => item.id)).size).toBe(entries.length);
    // ⭐ 八页表**每一页**都得有卡片。少一页就是漏抄了一整页。
    expect([...new Set(entries.map((item) => item.sourcePage))].sort()).toEqual([1, 2, 3, 4, 5, 7, 8]);
  });

  it('每张卡都有可渲染的非空公式', () => {
    for (const item of entries) {
      expect(item.title.trim()).not.toBe('');
      expect(item.tex.length).toBeGreaterThan(0);
      for (const tex of item.tex) expect(tex.trim()).not.toMatch(/^$|NaN|Infinity/);
    }
  });

  it('⭐⭐ 每一条 TeX 都渲染得出来 —— 一个手滑的反斜杠就是屏幕上一块红字', () => {
    // 一百多条公式全是手写的。KaTeX 解析失败**不会崩**,它会在页面上画一块红色错误框。
    // 那正是"不报错的错"——所以在这里让它报错。
    const broken: string[] = [];
    for (const item of entries) {
      for (const tex of item.tex) {
        try {
          katex.renderToString(tex, { throwOnError: true, displayMode: false });
        } catch (error) {
          broken.push(`${item.id}: ${tex}  →  ${(error as Error).message.slice(0, 90)}`);
        }
      }
    }
    expect(broken, `渲染不出来的公式:\n${broken.join('\n')}`).toEqual([]);
  });

  it('⭐⭐ 每个「看推导」按钮都指向 App 里**真实存在**的路由', () => {
    // ⚠️ 路由表从 `App.tsx` 里读出来,不在测试里手抄一份。
    //    手抄的那份迟早和真的漂开,而漂开的表现是一个**点了没反应**的按钮 ——
    //    页面不报错,链接也不 404(hash 路由会安静地回到首页),没人会发现。
    const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8');
    const routes = new Set(
      [...app.matchAll(/^\s*'?([a-z0-9-]+)'?:\s*lazy\(/gm)].map((m) => m[1]!),
    );
    expect(routes.size, '没能从 App.tsx 里解析出路由表').toBeGreaterThan(20);
    const dangling = entries
      .filter((item) => item.deriveRoute && !routes.has(item.deriveRoute))
      .map((item) => `${item.id} → ${item.deriveRoute}`);
    expect(dangling, `指向不存在的路由:${dangling.join(', ')}`).toEqual([]);
  });

  it('⭐ 新建的那几课确实被公式卡片指到了 —— 否则等于白建', () => {
    const used = new Set(entries.map((item) => item.deriveRoute).filter(Boolean));
    for (const route of ['sin-over-x', 'tan-over-x', 'cos-over-x', 'cos-over-x2', 'exp-over-x', 'log-over-x', 'indeterminate', 'geometric-series', 'squeeze', 'epsilon-delta', 'one-sided', 'limit-vs-value', 'infinite-limits', 'secant-to-tangent', 'intervals']) {
      expect(used.has(route), `没有一张卡片链到 ${route}`).toBe(true);
    }
  });

  it('⭐ 公式表补全:定理、级数、参数与极坐标、微分方程都在', () => {
    const ids = new Set(entries.map((item) => item.id));
    for (const want of [
      'squeeze-theorem', 'ivt', 'evt', 'rolle', 'mvt', 'lhospital', 'continuity',
      'first-derivative-test', 'second-derivative-test', 'inflection', 'critical-numbers',
      'nth-term-test', 'p-series', 'integral-test', 'ratio-test', 'root-test', 'alternating-test',
      'taylor-series', 'maclaurin-exp', 'maclaurin-sin', 'maclaurin-cos', 'lagrange-error',
      'parametric-derivative', 'polar-area', 'cartesian-arc',
      'separable', 'euler', 'logistic',
      'improper-infinite', 'partial-fractions',
      'riemann-sums', 'trapezoid', 'linearization', 'related-rates',
      'ftc-chain', 'definite-definition', 'displacement',
    ]) {
      expect(ids.has(want), `公式表少了 ${want}`).toBe(true);
    }
    // 十条判敛法一条不少
    const tests = ['nth-term-test', 'geometric-test', 'p-series', 'integral-test', 'direct-comparison', 'limit-comparison', 'alternating-test', 'ratio-test', 'root-test', 'absolute-conditional'];
    for (const t of tests) expect(ids.has(t), `少了判敛法 ${t}`).toBe(true);
  });

  it('⭐ 十一条特殊极限各自一张卡,而且各自有出口', () => {
    const limits = entries.filter((item) => item.id.startsWith('limit-'));
    expect(limits.length).toBeGreaterThanOrEqual(10);
    // 挤成一张卡的时候只能挂一个 deriveRoute,拆开才能各链各的
    const withRoute = limits.filter((item) => item.deriveRoute);
    expect(withRoute.length).toBeGreaterThanOrEqual(8);
    expect(new Set(withRoute.map((item) => item.deriveRoute)).size).toBeGreaterThanOrEqual(7);
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
   *
   * ⚠️ 这条错误在公式表从 5 页扩到 8 页的分支上**还活着** —— 把那份目录
   * 接过来的时候必须一并带上修正,否则等于把已经改对的东西又改错回去。
   */
  const behaviour = FORMULA_SECTIONS
    .flatMap((s) => s.entries)
    .find((e) => e.id === 'accumulation-behavior');

  it('那张卡还在(否则下面几条就是空跑)', () => {
    expect(behaviour).toBeDefined();
  });

  it('不再声称「递增 ⟺ 导数为正」', () => {
    for (const line of behaviour!.tex) {
      const claimsIff = line.includes('\\iff');
      const strictOnDerivative = /F'>0|F'<0/.test(line);
      expect(claimsIff && strictOnDerivative, `这一行把严格不等号写进了双向箭头:${line}`).toBe(false);
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
    for (let x = -2; x < 2; x += 0.1) expect(cube(x + 0.1)).toBeGreaterThan(cube(x));
    expect(3 * 0 * 0).toBe(0);
  });
});
