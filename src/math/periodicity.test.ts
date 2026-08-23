/**
 * `periodicity.ts` 的测试。
 *
 * 这一节最容易做坏的地方只有一个:**把"看起来对齐"判成"对齐"。**
 * 所以下面最重要的一组是「差一点点的 T 必须失败」。
 */
import { describe, it, expect } from 'vitest';
import {
  FUNCTION_ORDER,
  MATCH_TOLERANCE,
  PERIODIC_FUNCTIONS,
  T_MAX,
  T_PRESETS,
  SAMPLE_SPAN,
  T_STEP,
  formatShift,
  formatShiftTex,
  fundamentalPeriodByScan,
  fundamentalPeriodFromFrequency,
  isPeriodOnGrid,
  measureShift,
  multipleOfFundamental,
  sampleCurve,
  snapT,
} from './periodicity';

const SIN = PERIODIC_FUNCTIONS.sin!;
const COS = PERIODIC_FUNCTIONS.cos!;
const SIN2X = PERIODIC_FUNCTIONS.sin2x!;
const TAU = 2 * Math.PI;

describe('⭐ 提示词点名的那几个 T', () => {
  it('T = 2π 对 sin 成立', () => {
    expect(isPeriodOnGrid(SIN, TAU)).toBe(true);
  });

  it('T = π 对 sin【不】成立', () => {
    const report = measureShift(SIN, Math.PI);
    expect(report.matches).toBe(false);
    // sin(x+π) = −sin(x),最坏处差 2
    expect(report.worstMismatch).toBeCloseTo(2, 6);
  });

  it('T = π/2 对 sin 不成立', () => {
    expect(isPeriodOnGrid(SIN, Math.PI / 2)).toBe(false);
  });

  it('T = 4π 也成立(周期不唯一)', () => {
    expect(isPeriodOnGrid(SIN, 4 * Math.PI)).toBe(true);
  });

  it('sin(2x) 的周期是 π,不是 2π', () => {
    expect(isPeriodOnGrid(SIN2X, Math.PI)).toBe(true);
    expect(isPeriodOnGrid(SIN2X, Math.PI / 2)).toBe(false);
  });

  it('cos 的基本周期同样是 2π', () => {
    expect(fundamentalPeriodByScan(COS)).toBeCloseTo(TAU, 9);
  });
});

describe('⭐ 差一点点就是不对 —— 这一节的命根子', () => {
  // 学生最典型的错误:T = 6.2,画面上两条曲线几乎完全重合。
  // 容差一旦放宽到那个量级,整节课就白讲了。
  it('T = 6.2 不是周期,而且偏离读数是有意义的', () => {
    const report = measureShift(SIN, 6.2);
    expect(report.matches).toBe(false);
    expect(report.worstMismatch).toBeGreaterThan(0.05);
    expect(report.worstMismatch).toBeLessThan(0.2); // 确实"很接近",所以才骗人
  });

  it('越靠近 2π,偏离越小,但仍然不是零', () => {
    const gaps = [6.0, 6.2, 6.25, 6.28].map((t) => measureShift(SIN, t).worstMismatch);
    for (let i = 1; i < gaps.length; i += 1) {
      expect(gaps[i]!).toBeLessThan(gaps[i - 1]!);
    }
    expect(gaps[gaps.length - 1]!).toBeGreaterThan(MATCH_TOLERANCE);
  });

  it('容差必须远小于任何"看起来接近"的误差', () => {
    expect(MATCH_TOLERANCE).toBeLessThan(1e-4);
  });

  it('恰好 2π 时偏离是浮点级别的,不是零也不该被当成不匹配', () => {
    const report = measureShift(SIN, TAU);
    expect(report.worstMismatch).toBeLessThan(1e-12);
    expect(report.matches).toBe(true);
  });
});

describe('⚠️ T = 0 不是周期', () => {
  // f(x+0) = f(x) 对任何函数都成立。定义里那句 T > 0 就是为了排除它。
  it('T = 0 的偏离为零,但判定为假', () => {
    const report = measureShift(SIN, 0);
    expect(report.worstMismatch).toBe(0);
    expect(report.positive).toBe(false);
    expect(report.matches).toBe(false);
  });

  it('负的 T 也不算', () => {
    expect(measureShift(SIN, -TAU).matches).toBe(false);
  });
});

describe('⭐ 基本周期:两条独立路径必须一致', () => {
  // 路径 A 靠数值搜索,路径 B 靠 2π/k 公式,推理方式毫无重叠。
  for (const id of FUNCTION_ORDER) {
    it(`${id}:数值搜索与公式给出同一个基本周期`, () => {
      const fn = PERIODIC_FUNCTIONS[id]!;
      expect(fundamentalPeriodByScan(fn)!).toBeCloseTo(fundamentalPeriodFromFrequency(fn), 9);
    });
  }

  it('sin 与 cos 是 2π,sin(2x) 是 π', () => {
    expect(fundamentalPeriodFromFrequency(SIN)).toBeCloseTo(TAU, 12);
    expect(fundamentalPeriodFromFrequency(COS)).toBeCloseTo(TAU, 12);
    expect(fundamentalPeriodFromFrequency(SIN2X)).toBeCloseTo(Math.PI, 12);
  });

  it('基本周期之下没有更小的周期', () => {
    for (const id of FUNCTION_ORDER) {
      const fn = PERIODIC_FUNCTIONS[id]!;
      const fundamental = fundamentalPeriodByScan(fn)!;
      for (let t = T_STEP; t < fundamental - 1e-9; t += T_STEP) {
        expect(isPeriodOnGrid(fn, t), `${id} 在 ${t} 处不该成立`).toBe(false);
      }
    }
  });
});

describe('周期的整数倍', () => {
  it('4π 是 sin 的第 2 个周期', () => {
    expect(multipleOfFundamental(SIN, 4 * Math.PI)).toBe(2);
  });

  it('2π 是第 1 个', () => {
    expect(multipleOfFundamental(SIN, TAU)).toBe(1);
  });

  it('π 不是 sin 的周期的整数倍', () => {
    expect(multipleOfFundamental(SIN, Math.PI)).toBeNull();
  });

  it('2π 是 sin(2x) 的第 2 个周期', () => {
    expect(multipleOfFundamental(SIN2X, TAU)).toBe(2);
  });

  it('每一个整数倍都真的是周期(两件事必须自洽)', () => {
    for (const id of FUNCTION_ORDER) {
      const fn = PERIODIC_FUNCTIONS[id]!;
      for (let n = 1; n <= 4; n += 1) {
        const t = n * fundamentalPeriodFromFrequency(fn);
        if (t > T_MAX) break;
        expect(multipleOfFundamental(fn, t)).toBe(n);
        expect(isPeriodOnGrid(fn, t), `${id} 的 ${n} 倍周期竟然不匹配`).toBe(true);
      }
    }
  });
});

describe('⚠️ 滑块必须真的能停在 2π 上', () => {
  // CLAUDE.md 记过同一个坑:unit-circle 的滑块步长 0.01,
  // 数学测试能直接传 π/6,但真实用户永远拖不到,网页上永远显示不出精确值。
  it('π/2、π、2π、4π 全都精确落在档位上', () => {
    for (const preset of T_PRESETS) {
      expect(snapT(preset.value)).toBeCloseTo(preset.value, 12);
    }
  });

  it('吸附之后仍然判定为周期', () => {
    expect(isPeriodOnGrid(SIN, snapT(TAU))).toBe(true);
    expect(isPeriodOnGrid(SIN2X, snapT(Math.PI))).toBe(true);
  });

  it('拖到 2π 附近会被吸附到精确值', () => {
    expect(snapT(6.2)).toBeCloseTo(TAU, 12);
    expect(snapT(6.35)).toBeCloseTo(TAU, 12);
  });

  it('吸附结果永远落在 [0, T_MAX] 内', () => {
    for (const raw of [-99, -0.1, 0, 1.7, T_MAX, 99]) {
      const snapped = snapT(raw);
      expect(snapped).toBeGreaterThanOrEqual(0);
      expect(snapped).toBeLessThanOrEqual(T_MAX + 1e-9);
    }
  });

  it('非有限输入返回 0 而不是 NaN', () => {
    expect(snapT(Number.NaN)).toBe(0);
    expect(snapT(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('把 T 写成 π 的倍数', () => {
  // ⚠️ 直接显示 6.283185 会让「2π」这件事整个消失,学生看到的是个随机小数。
  it('常见值写成 π 的形式', () => {
    expect(formatShift(TAU)).toBe('2π');
    expect(formatShift(Math.PI)).toBe('π');
    expect(formatShift(Math.PI / 2)).toBe('π/2');
    expect(formatShift(4 * Math.PI)).toBe('4π');
  });

  it('π/12 档位上的其余值也写成分数', () => {
    expect(formatShift(Math.PI / 12)).toBe('π/12');
    expect(formatShift((5 * Math.PI) / 12)).toBe('5π/12');
    expect(formatShift((3 * Math.PI) / 4)).toBe('3π/4');
  });

  it('0 显示为 0', () => {
    expect(formatShift(0)).toBe('0');
  });

  it('TeX 版本可被 KaTeX 接受(不含裸 π 字符)', () => {
    for (const value of [Math.PI / 2, Math.PI, TAU, 4 * Math.PI, (5 * Math.PI) / 12]) {
      expect(formatShiftTex(value)).not.toContain('π');
    }
  });

  it('遍历所有档位都不产生 NaN 或 undefined', () => {
    for (let i = 0; i * T_STEP <= T_MAX; i += 1) {
      const label = formatShift(i * T_STEP);
      expect(label).not.toContain('NaN');
      expect(label).not.toContain('undefined');
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

describe('取样', () => {
  it('遍历所有档位,偏离读数始终有限', () => {
    for (const id of FUNCTION_ORDER) {
      for (let i = 0; i * T_STEP <= T_MAX; i += 1) {
        const report = measureShift(PERIODIC_FUNCTIONS[id]!, i * T_STEP);
        expect(Number.isFinite(report.worstMismatch), `${id} at ${i}`).toBe(true);
      }
    }
  });

  it('曲线端点精确且无 NaN', () => {
    const pts = sampleCurve(SIN, -TAU, 4 * Math.PI, 100);
    expect(pts[0]!.x).toBeCloseTo(-TAU, 12);
    expect(pts.every((p) => Number.isFinite(p.y))).toBe(true);
  });

  it('⚠️ 取样窗口必须至少覆盖最慢那条曲线的一个完整周期', () => {
    // 变异测试逼出来的:把窗口砍到 π 时,原本的测试**全部还是绿的** ——
    // 说明当时没有任何东西守着这条。窗口太窄,函数在里面变化不够,
    // 一个错误的 T 完全可能在那一小段上侥幸对得上。
    const slowest = Math.max(...FUNCTION_ORDER.map((id) =>
      fundamentalPeriodFromFrequency(PERIODIC_FUNCTIONS[id]!),
    ));
    expect(SAMPLE_SPAN).toBeGreaterThanOrEqual(slowest);
    // 留足余量:三倍以上,免得刚好卡在边界
    expect(SAMPLE_SPAN / slowest).toBeGreaterThanOrEqual(3);
  });

  it('窗口砍到不足一个周期时,错误的 T 确实会蒙混过关(所以上面那条必须存在)', () => {
    // 这条把风险摆出来:同一个 T,在够宽的窗口里被拒,在过窄的窗口里通过。
    const narrow = measureShift(SIN2X, Math.PI / 2, 0, 0.05);
    const wide = measureShift(SIN2X, Math.PI / 2);
    expect(narrow.worstMismatch).toBeLessThan(wide.worstMismatch);
  });

  it('取样点数是奇数且不是 2π 的整齐约数(避免侥幸通过)', () => {
    // 取样点若恰好都落在 sin 的零点上,错误的 T 会蒙混过关。
    const report = measureShift(SIN, Math.PI);
    expect(report.worstMismatch).toBeGreaterThan(1.9);
  });
});
