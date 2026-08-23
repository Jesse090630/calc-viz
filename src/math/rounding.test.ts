/**
 * `rounding.ts` 的测试 —— 下取整 ⌊x⌋ 与上取整 ⌈x⌉。
 *
 * ⚠️ 这个文件是**唯一**允许出现 `Math.floor` / `Math.ceil` 的地方 ——
 * 它们在这里的身份是**独立验证路径**,不是实现的一部分。
 * 主模块两个方向都按定义算(截断 + 往正确方向修正)。
 *
 * 重点:
 * ① 负数 —— ⌊-1.3⌋ = -2 而 ⌈-1.3⌉ = -1,两个方向的陷阱位置**正好相反**;
 * ② 阶梯图的开闭端点两个方向也相反,画反了看起来一样但整数处全错。
 */
import { describe, it, expect } from 'vitest';
import {
  DOMAIN,
  ROUND,
  STEP,
  TICKS,
  ceilByDefinition,
  ceilByReflection,
  floorByDefinition,
  readRounding,
  showN,
  showX,
  snapX,
  steps,
  type Direction,
} from './rounding';

const DIRECTIONS: readonly Direction[] = ['floor', 'ceiling'];
/** 遍历整个滑块行程 */
function everyStep(): number[] {
  const out: number[] = [];
  for (let i = Math.round(DOMAIN.a / STEP); i <= Math.round(DOMAIN.b / STEP); i += 1) {
    out.push(snapX(i * STEP));
  }
  return out;
}

describe('⭐ 提示词钉死的例子 —— 下取整', () => {
  it('⌊4.7⌋ = 4', () => expect(floorByDefinition(4.7)).toBe(4));
  it('⌊5⌋ = 5', () => expect(floorByDefinition(5)).toBe(5));
  it('⭐ ⌊-1.3⌋ = -2,不是 -1', () => expect(floorByDefinition(-1.3)).toBe(-2));
});

describe('⭐ 提示词钉死的例子 —— 上取整', () => {
  it('⌈4.2⌉ = 5', () => expect(ceilByDefinition(4.2)).toBe(5));
  it('⌈5⌉ = 5 —— 整数取自己,不往上跳', () => expect(ceilByDefinition(5)).toBe(5));
  it('⭐ ⌈-1.3⌉ = -1,不是 -2', () => expect(ceilByDefinition(-1.3)).toBe(-1));

  it('4.2 的两个方向:⌊⌋ = 4,⌈⌉ = 5', () => {
    expect(floorByDefinition(4.2)).toBe(4);
    expect(ceilByDefinition(4.2)).toBe(5);
  });

  it('-1.3 的两个方向:⌊⌋ = -2,⌈⌉ = -1', () => {
    expect(floorByDefinition(-1.3)).toBe(-2);
    expect(ceilByDefinition(-1.3)).toBe(-1);
  });
});

describe('⚠️ 两个方向的陷阱位置正好相反', () => {
  // 下取整在**负数**上会被"朝零截断"骗;
  // 上取整反过来 —— 截断在负数上碰巧对,在**正数**上才露馅。
  // 这比下取整更阴险:只试负数会得出"截断就是上取整"的错误结论。
  it('朝零截断在 -1.3 上碰巧给出正确的上取整', () => {
    expect(Math.trunc(-1.3)).toBe(ceilByDefinition(-1.3));
  });

  it('但在 4.2 上截断给 4,而上取整是 5', () => {
    expect(Math.trunc(4.2)).toBe(4);
    expect(ceilByDefinition(4.2)).toBe(5);
    expect(Math.trunc(4.2)).not.toBe(ceilByDefinition(4.2));
  });

  it('朝零截断在 4.7 上碰巧给出正确的下取整', () => {
    expect(Math.trunc(4.7)).toBe(floorByDefinition(4.7));
  });

  it('但在 -1.3 上截断给 -1,而下取整是 -2', () => {
    expect(Math.trunc(-1.3)).not.toBe(floorByDefinition(-1.3));
  });

  it('两个方向都只在整数处相等', () => {
    for (const x of everyStep()) {
      const same = floorByDefinition(x) === ceilByDefinition(x);
      expect(same, `x = ${x}`).toBe(Number.isInteger(x));
    }
  });
});

describe('⭐ 独立验证路径', () => {
  it('下取整与 Math.floor 处处一致', () => {
    for (const x of everyStep()) expect(floorByDefinition(x), `x=${x}`).toBe(Math.floor(x));
  });

  // ⚠️ 用 `===` 而不是 `toBe`。`toBe` 走 `Object.is`,而 `Object.is(+0, -0)` 是 **false**。
  // `Math.ceil(-0.9)` 返回的正是 **-0**,我们的实现刻意把它规范成 `+0` ——
  // 因为 `-0` 会在屏幕上显示成 "-0",而 ⌈-0.9⌉ 应该写作 0。
  // 这个差异是**故意的**,所以下面单独有一条测试盯着它,而不是在这里假装两者完全相同。
  it('上取整与 Math.ceil 数值相等(±0 差异见下一条)', () => {
    for (const x of everyStep()) {
      expect(ceilByDefinition(x) === Math.ceil(x), `x=${x}`).toBe(true);
    }
  });

  it('⚠️ 但永远不返回 -0 —— 那会在屏幕上显示成 "-0"', () => {
    for (const x of everyStep()) {
      for (const value of [floorByDefinition(x)!, ceilByDefinition(x)!, ceilByReflection(x)!]) {
        expect(Object.is(value, -0), `x=${x} 产生了 -0`).toBe(false);
      }
    }
    // Math.ceil 自己是会返回 -0 的 —— 证明这条规范化不是多余的
    expect(Object.is(Math.ceil(-0.9), -0)).toBe(true);
  });

  it('⭐ 恒等式 ⌈x⌉ = −⌊−x⌋ 处处成立(第三条路径,不碰截断逻辑)', () => {
    for (const x of everyStep()) {
      expect(ceilByReflection(x) === ceilByDefinition(x), `x=${x}`).toBe(true);
    }
  });

  it('刁钻值上三条路径也一致', () => {
    for (const x of [-2.999, -2, -1.0001, -1, -0.9999, -0.5, 0, 0.0001, 1, 4.2, 4.999, 5]) {
      expect(ceilByDefinition(x) === Math.ceil(x), `⌈⌉ x=${x}`).toBe(true);
      expect(ceilByReflection(x) === Math.ceil(x), `反射 x=${x}`).toBe(true);
      expect(floorByDefinition(x) === Math.floor(x), `⌊⌋ x=${x}`).toBe(true);
    }
  });
});

describe('⭐ 定义的两个条件', () => {
  it('两个方向、整个行程上都成立', () => {
    for (const direction of DIRECTIONS) {
      for (const x of everyStep()) {
        const r = readRounding(x, direction)!;
        expect(r.satisfies, `${direction} 的 n ${ROUND[direction].relation} x 在 x=${x} 失败`).toBe(true);
        expect(r.isTightest, `${direction} 在 x=${x} 不是最靠边的那个`).toBe(true);
        expect(Number.isInteger(r.n)).toBe(true);
      }
    }
  });

  it('被否决的那个整数确实违反条件', () => {
    for (const x of everyStep()) {
      const down = readRounding(x, 'floor')!;
      expect(down.rejected > x || down.exact).toBe(true); // n+1 越过了 x
      const up = readRounding(x, 'ceiling')!;
      expect(up.rejected < x || up.exact).toBe(true); // n−1 落在 x 左边
    }
  });

  it('⌊x⌋ ≤ x ≤ ⌈x⌉ 恒成立,且两者相差 0 或 1', () => {
    for (const x of everyStep()) {
      const lo = floorByDefinition(x)!;
      const hi = ceilByDefinition(x)!;
      expect(lo).toBeLessThanOrEqual(x);
      expect(hi).toBeGreaterThanOrEqual(x);
      expect(hi - lo).toBeGreaterThanOrEqual(0);
      expect(hi - lo).toBeLessThanOrEqual(1);
    }
  });
});

describe('⚠️ 整数处必须精确 —— 浮点会在这里骗人', () => {
  // ⚠️ 这条测试改过一次。第一版只试了"累加 30 次 0.1",而那个值是 3.0000000000000013,
  // 落在 3 的**上方**,取整照样给 3 —— 压根没碰到要防的坑。
  // 真正会出事的是累加 10 次(0.9999999999999999)和 50 次(4.999999999999998)。
  // 教训:挑例子时要先确认这个例子真的会失败,否则测的是空气。
  it('累加出来的整数经过吸附后两个方向都取到自己', () => {
    for (let target = 1; target <= 5; target += 1) {
      let raw = 0;
      for (let i = 0; i < target * 10; i += 1) raw += 0.1;
      expect(floorByDefinition(snapX(raw)), `⌊⌋ 累加 ${target * 10} 次`).toBe(target);
      expect(ceilByDefinition(snapX(raw)), `⌈⌉ 累加 ${target * 10} 次`).toBe(target);
    }
  });

  it('确认这些累加值里确实有落在整数下方的(否则上面那条测了个寂寞)', () => {
    const below: number[] = [];
    for (let target = 1; target <= 5; target += 1) {
      let raw = 0;
      for (let i = 0; i < target * 10; i += 1) raw += 0.1;
      if (raw < target) below.push(target);
    }
    expect(below.length, '没有任何累加值落在整数下方,这组测试无法暴露问题').toBeGreaterThan(0);
  });

  it('每个刻度整数上两个方向都取到自己', () => {
    for (const t of TICKS) {
      for (const direction of DIRECTIONS) {
        const r = readRounding(snapX(t), direction)!;
        expect(r.n).toBe(t);
        expect(r.exact).toBe(true);
      }
    }
  });

  it('非有限输入不产生 NaN', () => {
    expect(floorByDefinition(Number.NaN)).toBeNull();
    expect(ceilByDefinition(Number.NaN)).toBeNull();
    expect(ceilByReflection(Number.POSITIVE_INFINITY)).toBeNull();
    expect(readRounding(Number.NaN, 'ceiling')).toBeNull();
    expect(snapX(Number.NaN)).toBe(0);
  });
});

describe('⭐ 阶梯图:两个方向的开闭端点正好相反', () => {
  // 画反了图形看起来一模一样,但在整数处的取值全错 —— 这是最容易漏的一处。
  it('下取整:每格 [n, n+1),高度是左端点,左实心', () => {
    for (const s of steps('floor')) {
      expect(s.value).toBe(s.from);
      expect(s.closedOnLeft).toBe(true);
      expect(floorByDefinition(s.from)).toBe(s.value); // 左端点属于本格
      expect(floorByDefinition(s.to)).toBe(s.value + 1); // 右端点属于下一格
    }
  });

  it('上取整:每格 (n, n+1],高度是右端点,右实心', () => {
    for (const s of steps('ceiling')) {
      expect(s.value).toBe(s.to);
      expect(s.closedOnLeft).toBe(false);
      expect(ceilByDefinition(s.to)).toBe(s.value); // 右端点属于本格
      expect(ceilByDefinition(s.from)).toBe(s.value - 1); // 左端点属于上一格
    }
  });

  it('两个方向的格子边界相同,只有高度和开闭不同', () => {
    const down = steps('floor');
    const up = steps('ceiling');
    expect(down.length).toBe(up.length);
    for (let i = 0; i < down.length; i += 1) {
      expect(up[i]!.from).toBe(down[i]!.from);
      expect(up[i]!.to).toBe(down[i]!.to);
      expect(up[i]!.value).toBe(down[i]!.value + 1);
      expect(up[i]!.closedOnLeft).not.toBe(down[i]!.closedOnLeft);
    }
  });

  it('格与格首尾相接,没有缝也没有重叠', () => {
    for (const direction of DIRECTIONS) {
      const all = steps(direction);
      for (let i = 1; i < all.length; i += 1) expect(all[i]!.from).toBe(all[i - 1]!.to);
    }
  });

  it('readRounding 给出的区间与阶梯格一致', () => {
    for (const x of everyStep()) {
      for (const direction of DIRECTIONS) {
        const r = readRounding(x, direction)!;
        expect(r.stepTo - r.stepFrom).toBe(1);
        expect(r.x).toBeGreaterThanOrEqual(r.stepFrom);
        expect(r.x).toBeLessThanOrEqual(r.stepTo);
      }
    }
  });
});

describe('方向元数据自洽', () => {
  it('两个方向的 at() 就是各自的定义实现', () => {
    for (const x of [-1.3, 0, 4.2, 5]) {
      expect(ROUND.floor.at(x)).toBe(floorByDefinition(x));
      expect(ROUND.ceiling.at(x)).toBe(ceilByDefinition(x));
    }
  });

  it('不等号方向没写反', () => {
    expect(ROUND.floor.relation).toBe('≤');
    expect(ROUND.ceiling.relation).toBe('≥');
  });

  it('箭头方向没写反', () => {
    expect(ROUND.floor.arrow).toBe('↓');
    expect(ROUND.ceiling.arrow).toBe('↑');
  });

  it('括号没写反', () => {
    expect(ROUND.floor.brackets('4.2')).toBe('⌊4.2⌋');
    expect(ROUND.ceiling.brackets('4.2')).toBe('⌈4.2⌉');
    expect(ROUND.floor.tex('x')).toContain('lfloor');
    expect(ROUND.ceiling.tex('x')).toContain('lceil');
  });
});

describe('显示', () => {
  it('x 保留一位小数,和滑块步长一致', () => {
    expect(showX(4.2)).toBe('4.2');
    expect(showX(5)).toBe('5.0');
    expect(showX(-1.3)).toBe('-1.3');
  });

  it('不产生 -0.0 或 -0', () => {
    expect(showX(-0.04)).toBe('0.0');
    expect(showN(ceilByDefinition(-0.5)!)).toBe('0');
    expect(showN(floorByDefinition(0.5)!)).toBe('0');
  });

  it('遍历整个行程、两个方向都不出现 NaN', () => {
    for (const x of everyStep()) {
      for (const direction of DIRECTIONS) {
        expect(showN(readRounding(x, direction)!.n)).not.toContain('NaN');
      }
      expect(showX(x)).not.toContain('NaN');
    }
  });
});
