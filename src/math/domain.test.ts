/**
 * `domain.ts` 的测试。
 *
 * 三个重点:
 * ① **未定义处必须是 null**,不是 NaN、不是 Infinity —— 后两个不报错,会一路流到屏幕上;
 * ② **端点**:√x 在 0 处有值(闭),1/x 在 0 处没值(开)—— 方向相反,最容易写反;
 * ③ 声明的区间与真的算一遍必须处处一致。
 */
import { describe, it, expect } from 'vitest';
import {
  DOMAIN_RANGE,
  FUNCTIONS,
  STEP,
  isAllowedByIntervals,
  isAllowedByProbe,
  readDomain,
  sampleCurve,
  showX,
  showY,
  snapX,
  visibleAllowed,
} from './domain';

const SQRT = FUNCTIONS.find((f) => f.id === 'sqrt')!;
const RECIP = FUNCTIONS.find((f) => f.id === 'reciprocal')!;
const SHIFT = FUNCTIONS.find((f) => f.id === 'shifted')!;

/** 遍历整个滑块行程 */
function everyStep(): number[] {
  const out: number[] = [];
  for (let i = Math.round(DOMAIN_RANGE.a / STEP); i <= Math.round(DOMAIN_RANGE.b / STEP); i += 1) {
    out.push(snapX(i * STEP));
  }
  return out;
}

describe('⭐ 提示词钉死的那几个值', () => {
  it('√4 = 2', () => expect(SQRT.at(4)).toBe(2));
  it('√(-2) 未定义', () => expect(SQRT.at(-2)).toBeNull());
  it('1/0 未定义', () => expect(RECIP.at(0)).toBeNull());
  it('√(x-2) 在 x = 2 处 = 0', () => expect(SHIFT.at(2)).toBe(0));
  it('√(x-2) 在 x = 1 处未定义', () => expect(SHIFT.at(1)).toBeNull());
  it('√(x-2) 在 x = 6 处 = 2', () => expect(SHIFT.at(6)).toBe(2));
});

describe('⚠️ 未定义处必须是 null —— NaN 与 Infinity 都不报错,会流到屏幕上', () => {
  it('负数开根:JS 给 NaN,我们给 null', () => {
    expect(Number.isNaN(Math.sqrt(-2))).toBe(true); // 先证明这个坑真的存在
    expect(SQRT.at(-2)).toBeNull();
  });

  it('除以零:JS 给 Infinity,我们给 null', () => {
    expect(1 / 0).toBe(Infinity);
    expect(RECIP.at(0)).toBeNull();
  });

  it('遍历整个行程、三个函数,返回值要么是有限实数要么是 null', () => {
    for (const fn of FUNCTIONS) {
      for (const x of everyStep()) {
        const y = fn.at(x);
        expect(y === null || Number.isFinite(y), `${fn.id} at x=${x} 给出 ${y}`).toBe(true);
      }
    }
  });

  it('非有限输入也返回 null', () => {
    for (const fn of FUNCTIONS) {
      expect(fn.at(Number.NaN)).toBeNull();
      expect(fn.at(Number.POSITIVE_INFINITY)).toBeNull();
      expect(readDomain(fn, Number.NaN)).toBeNull();
    }
  });

  it('显示层把 null 写成 undefined,而不是 NaN', () => {
    expect(showY(SQRT.at(-2))).toBe('undefined');
    expect(showY(RECIP.at(0))).toBe('undefined');
    expect(showY(null)).not.toContain('NaN');
  });
});

describe('⭐⭐ 端点:两类函数方向相反', () => {
  it('√x 在 x = 0 处**有**值 → 0 属于定义域(闭端点)', () => {
    expect(SQRT.at(0)).toBe(0);
    expect(isAllowedByIntervals(SQRT, 0)).toBe(true);
    expect(readDomain(SQRT, 0)!.onClosedEdge).toBe(true);
  });

  it('1/x 在 x = 0 处**没有**值 → 0 不属于定义域(开端点)', () => {
    expect(RECIP.at(0)).toBeNull();
    expect(isAllowedByIntervals(RECIP, 0)).toBe(false);
    expect(readDomain(RECIP, 0)!.onHole).toBe(true);
  });

  it('√(x−2) 在 x = 2 处有值,闭端点', () => {
    expect(SHIFT.at(2)).toBe(0);
    expect(readDomain(SHIFT, 2)!.onClosedEdge).toBe(true);
  });

  it('⚠️ 边界两侧一步之隔就换答案', () => {
    expect(isAllowedByProbe(SQRT, -0.1)).toBe(false);
    expect(isAllowedByProbe(SQRT, 0)).toBe(true);
    expect(isAllowedByProbe(SHIFT, 1.9)).toBe(false);
    expect(isAllowedByProbe(SHIFT, 2)).toBe(true);
    expect(isAllowedByProbe(RECIP, -0.1)).toBe(true);
    expect(isAllowedByProbe(RECIP, 0)).toBe(false);
    expect(isAllowedByProbe(RECIP, 0.1)).toBe(true);
  });

  it('只有 1/x 有被挖掉的那个点', () => {
    expect(RECIP.hole).toBe(0);
    expect(SQRT.hole).toBeNull();
    expect(SHIFT.hole).toBeNull();
  });

  it('⚠️ 闭端点与空洞不能同时成立', () => {
    for (const fn of FUNCTIONS) {
      for (const x of everyStep()) {
        const r = readDomain(fn, x)!;
        expect(r.onClosedEdge && r.onHole, `${fn.id} at ${x}`).toBe(false);
      }
    }
  });
});

describe('⭐ 两条独立路径必须一致', () => {
  // 路径 A 查声明的区间(纯符号);路径 B 真的算一遍(纯数值)。
  it('整个行程、三个函数上都相等', () => {
    for (const fn of FUNCTIONS) {
      for (const x of everyStep()) {
        expect(isAllowedByIntervals(fn, x), `${fn.id} at x=${x}`).toBe(isAllowedByProbe(fn, x));
      }
    }
  });

  it('在边界点上也相等 —— 网格未必踩得到,所以显式再测一遍', () => {
    // ⚠️ everyStep 走的是十分位,0 和 2 恰好在上面;但别的边界不一定。
    //    边界正是唯一会错的地方,不能指望网格碰巧覆盖到。
    for (const [fn, edges] of [
      [SQRT, [-0.0001, 0, 0.0001]],
      [RECIP, [-0.0001, 0, 0.0001]],
      [SHIFT, [1.9999, 2, 2.0001]],
    ] as const) {
      for (const x of edges) {
        expect(isAllowedByIntervals(fn, x), `${fn.id} at x=${x}`).toBe(isAllowedByProbe(fn, x));
      }
    }
  });

  it('readDomain 的 allowed 与两条路径都一致', () => {
    for (const fn of FUNCTIONS) {
      for (const x of everyStep()) {
        const r = readDomain(fn, x)!;
        expect(r.allowed).toBe(isAllowedByProbe(fn, x));
        expect(r.allowed).toBe(isAllowedByIntervals(fn, x));
        expect(r.y === null).toBe(!r.allowed);
      }
    }
  });
});

describe('区间记号与实际区间自洽', () => {
  it('√x 的定义域只有一段,从 0 开始且闭', () => {
    expect(SQRT.allowed).toHaveLength(1);
    expect(SQRT.allowed[0]!.from).toBe(0);
    expect(SQRT.allowed[0]!.closedFrom).toBe(true);
    expect(SQRT.intervalTex).toContain('[0');
  });

  it('1/x 的定义域是**两段**,而且两端都开', () => {
    expect(RECIP.allowed).toHaveLength(2);
    for (const i of RECIP.allowed) {
      expect(i.closedFrom).toBe(false);
      expect(i.closedTo).toBe(false);
    }
    expect(RECIP.intervalTex).toContain('cup');
  });

  it('√(x−2) 从 2 开始且闭', () => {
    expect(SHIFT.allowed[0]!.from).toBe(2);
    expect(SHIFT.allowed[0]!.closedFrom).toBe(true);
    expect(SHIFT.intervalTex).toContain('[2');
  });

  it('区间之间不重叠', () => {
    for (const fn of FUNCTIONS) {
      const sorted = [...fn.allowed].sort((a, b) => a.from - b.from);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i]!.from).toBeGreaterThanOrEqual(sorted[i - 1]!.to);
      }
    }
  });
});

describe('画面上那段发光的区间', () => {
  it('裁到窗口内,且不越界', () => {
    for (const fn of FUNCTIONS) {
      for (const i of visibleAllowed(fn)) {
        expect(i.from).toBeGreaterThanOrEqual(DOMAIN_RANGE.a);
        expect(i.to).toBeLessThanOrEqual(DOMAIN_RANGE.b);
        expect(i.to).toBeGreaterThan(i.from);
        expect(Number.isFinite(i.from) && Number.isFinite(i.to)).toBe(true);
      }
    }
  });

  it('⚠️ 被窗口裁掉的那一端不再画成实心', () => {
    // 无界的一端顶到窗口边缘,那不是真的端点 —— 画成实心会骗人。
    const [seg] = visibleAllowed(SQRT);
    expect(seg!.closedFrom).toBe(true); // 0 是真端点
    expect(seg!.closedTo).toBe(false); // 右边是被裁的
  });

  it('1/x 裁完仍然是两段', () => {
    expect(visibleAllowed(RECIP)).toHaveLength(2);
  });

  it('发光区间与逐点判定一致(窗口边缘除外)', () => {
    // ⚠️ 窗口边缘要排除:发光条被裁到 x = 6 收尾,那一端画成开的(它不是真端点),
    //    于是 x = 6 本身落在条外 —— 但它**确实**属于定义域。
    //    这是裁剪的正确行为,不是不一致;严格断言会把它误判成 bug。
    for (const fn of FUNCTIONS) {
      const segments = visibleAllowed(fn);
      for (const x of everyStep().filter((v) => v > DOMAIN_RANGE.a && v < DOMAIN_RANGE.b)) {
        const inSegment = segments.some((i) => {
          const lo = i.closedFrom ? x >= i.from : x > i.from;
          const hi = i.closedTo ? x <= i.to : x < i.to;
          return lo && hi;
        });
        expect(inSegment, `${fn.id} at x=${x}`).toBe(isAllowedByProbe(fn, x));
      }
    }
  });
});

describe('曲线取样', () => {
  it('未定义处给 null,让调用方断线', () => {
    const pts = sampleCurve(SQRT, -2, 4, 60);
    expect(pts.some((p) => p.y === null)).toBe(true);
    expect(pts.every((p) => p.y === null || Number.isFinite(p.y))).toBe(true);
  });

  // ⚠️ 这条抓到过一个真问题:等距网格未必踩得到 x = 0。
  // [-3,3] 取 601 个点时 0 落在第 300.5 个位置,一个 null 都不会出现,
  // 曲线两侧于是被连成一条穿过渐近线的假线。现在实现会**显式**把洞塞进取样点。
  it('⚠️ 1/x 在 0 处必定断开 —— 无论取样点数是奇是偶', () => {
    for (const count of [200, 201, 400, 601, 999]) {
      const pts = sampleCurve(RECIP, -3, 3, count);
      const nullIndex = pts.findIndex((p) => p.y === null);
      expect(nullIndex, `count=${count} 时取样里没有断点`).toBeGreaterThan(0);
      expect(pts[nullIndex]!.x, `count=${count}`).toBeCloseTo(0, 12);
    }
  });

  it('断点前后仍然按 x 递增,没有把顺序弄乱', () => {
    const pts = sampleCurve(RECIP, -3, 3, 601);
    for (let i = 1; i < pts.length; i += 1) {
      expect(pts[i]!.x).toBeGreaterThanOrEqual(pts[i - 1]!.x);
    }
  });

  it('没有洞的函数不会被塞进多余的点', () => {
    expect(sampleCurve(SQRT, -3, 3, 100)).toHaveLength(101);
  });

  it('三个函数取样都不产生 NaN', () => {
    for (const fn of FUNCTIONS) {
      for (const p of sampleCurve(fn)) {
        expect(p.y === null || Number.isFinite(p.y)).toBe(true);
      }
    }
  });
});

describe('吸附与显示', () => {
  it('⚠️ 0 与 2 必须精确可选 —— 它们正是两个函数的边界', () => {
    expect(snapX(0)).toBe(0);
    expect(snapX(2)).toBe(2);
    expect(snapX(0.04)).toBe(0);
    expect(snapX(1.97)).toBe(2);
  });

  it('吸附后仍在范围内', () => {
    for (const raw of [-99, 99, 0, 3.14]) {
      expect(snapX(raw)).toBeGreaterThanOrEqual(DOMAIN_RANGE.a);
      expect(snapX(raw)).toBeLessThanOrEqual(DOMAIN_RANGE.b);
    }
  });

  it('不产生 -0.0', () => expect(showX(-0.04)).toBe('0.0'));

  it('遍历整个行程,显示字符串都不含 NaN', () => {
    for (const fn of FUNCTIONS) {
      for (const x of everyStep()) {
        expect(showX(x)).not.toContain('NaN');
        expect(showY(fn.at(x))).not.toContain('NaN');
      }
    }
  });
});
