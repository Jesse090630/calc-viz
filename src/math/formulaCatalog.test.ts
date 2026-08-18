import { describe, expect, it } from 'vitest';
import { FORMULA_SECTIONS, searchFormulaSections } from './formulaCatalog';

describe('公式卡片库', () => {
  const entries = FORMULA_SECTIONS.flatMap((section) => section.entries);

  it('PDF 的三组编号主表完整:31 条导数、28 条不定积分、15 条定积分', () => {
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
    const routes = new Set(['derivative', 'riemann-sum', 'disk-method', 'shell-method', 'limits', 'unit-circle', 'trig-rates']);
    for (const item of entries) {
      if (item.deriveRoute) expect(routes.has(item.deriveRoute)).toBe(true);
    }
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
