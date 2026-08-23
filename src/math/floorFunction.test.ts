/**
 * `floorFunction.ts` 的测试。
 *
 * ⚠️ 这个文件是**唯一**允许出现 `Math.floor` 的地方 ——
 * 它在这里的身份是**第二条独立验证路径**,不是实现的一部分。
 * 主模块按定义算(截断 + 向下修正),两条路推理方式不同,结果必须处处一致。
 *
 * 重点全部压在负数上,因为那是这一节唯一会错的地方。
 */
import { describe, it, expect } from 'vitest';
import {
  DOMAIN,
  STEP,
  TICKS,
  floorByDefinition,
  integerAbove,
  readFloor,
  showN,
  showX,
  snapX,
  steps,
} from './floorFunction';

describe('⭐ 提示词钉死的三个例子', () => {
  it('⌊4.7⌋ = 4', () => {
    expect(floorByDefinition(4.7)).toBe(4);
  });

  it('⌊5⌋ = 5 —— 整数取自己', () => {
    expect(floorByDefinition(5)).toBe(5);
  });

  it('⭐⭐ ⌊-1.3⌋ = -2,不是 -1', () => {
    expect(floorByDefinition(-1.3)).toBe(-2);
  });

  it('-2 确实没有越过 -1.3,而 -1 越过了', () => {
    const r = readFloor(-1.3)!;
    expect(r.n).toBe(-2);
    expect(r.doesNotPass).toBe(true); // -2 ≤ -1.3 ✓
    expect(r.isGreatest).toBe(true); // -1 > -1.3,所以 -2 是最大的那个
    expect(integerAbove(-1.3)).toBe(-1);
    expect(-1 > -1.3).toBe(true); // 上面那个整数确实越过了 x
  });
});

describe('⚠️ 所有"朝零截断"的写法都是错的', () => {
  // 这一组把常见错法逐个列出来并证明它们错 ——
  // 不是为了羞辱它们,是为了让后来改代码的人一眼看见坑在哪。
  const x = -1.3;

  it('Math.trunc 给出 -1(错)', () => {
    expect(Math.trunc(x)).toBe(-1);
    expect(Math.trunc(x)).not.toBe(floorByDefinition(x));
  });

  it('按位取整 ~~ 给出 -1(错)', () => {
    expect(~~x).toBe(-1);
    expect(~~x).not.toBe(floorByDefinition(x));
  });

  it('Math.round 给出 -1(错)', () => {
    expect(Math.round(x)).toBe(-1);
    expect(Math.round(x)).not.toBe(floorByDefinition(x));
  });

  it('parseInt 给出 -1(错)', () => {
    expect(Number.parseInt(String(x), 10)).toBe(-1);
  });

  it('正数上这些写法碰巧都对 —— 所以只测正数会漏掉全部问题', () => {
    expect(Math.trunc(4.7)).toBe(floorByDefinition(4.7));
    expect(~~4.7).toBe(floorByDefinition(4.7));
  });
});

describe('⭐ 两条独立路径必须一致(唯一允许用 Math.floor 的地方)', () => {
  it('在整个定义域的每一个十分位上都相等', () => {
    for (let i = Math.round(DOMAIN.a / STEP); i <= Math.round(DOMAIN.b / STEP); i += 1) {
      const x = snapX(i * STEP);
      expect(floorByDefinition(x), `x = ${x}`).toBe(Math.floor(x));
    }
  });

  it('在一批刁钻的值上也相等', () => {
    const tricky = [
      -2.999, -2.5, -2.0001, -2, -1.9999, -1.5, -1.0001, -1, -0.9999, -0.5, -0.0001,
      0, 0.0001, 0.5, 0.9999, 1, 1.0001, 4.7, 4.999, 5,
    ];
    for (const x of tricky) {
      expect(floorByDefinition(x), `x = ${x}`).toBe(Math.floor(x));
    }
  });
});

describe('⭐ 定义本身:n ≤ x < n+1', () => {
  it('整个定义域上两个条件都成立', () => {
    for (let i = Math.round(DOMAIN.a / STEP); i <= Math.round(DOMAIN.b / STEP); i += 1) {
      const x = snapX(i * STEP);
      const r = readFloor(x)!;
      expect(r.n <= x, `n ≤ x 在 x=${x} 失败`).toBe(true);
      expect(r.n + 1 > x, `n+1 > x 在 x=${x} 失败`).toBe(true);
      expect(Number.isInteger(r.n)).toBe(true);
    }
  });

  it('返回的永远是整数', () => {
    for (const x of [-2.7, -0.2, 0, 3.999, 4.7]) {
      expect(Number.isInteger(floorByDefinition(x)!)).toBe(true);
    }
  });

  it('单调不减:x 变大,⌊x⌋ 不会变小', () => {
    let previous = -Infinity;
    for (let i = Math.round(DOMAIN.a / STEP); i <= Math.round(DOMAIN.b / STEP); i += 1) {
      const n = floorByDefinition(snapX(i * STEP))!;
      expect(n).toBeGreaterThanOrEqual(previous);
      previous = n;
    }
  });
});

describe('⚠️ 整数处必须精确 —— 浮点会在这里骗人', () => {
  // 连续累加 0.1 会得到 2.9999999999999996,⌊x⌋ 于是给出 2,
  // 而屏幕上写着 x = 3.0。矛盾正好出现在最关键的位置上。
  // ⚠️ 这条测试改过一次,原因值得记下来。
  // 第一版只试了"累加 30 次 0.1",结果那个值是 3.0000000000000013 —— 落在 3 的**上方**,
  // 取整照样给 3。也就是说它压根没碰到要防的那个坑,去掉吸附测试依然全绿。
  // 真正会出事的是累加 10 次(0.9999999999999999)和 50 次(4.999999999999998):
  // 它们落在整数**下方**,不吸附就会得到 0 和 4,而屏幕上写着 1.0 和 5.0。
  // 教训:**挑例子的时候要先确认这个例子真的会失败**,否则测的是空气。
  it('累加出来的整数经过吸附后取到自己(逐个整数都试)', () => {
    for (let target = 1; target <= 5; target += 1) {
      let raw = 0;
      for (let i = 0; i < target * 10; i += 1) raw += 0.1;
      expect(floorByDefinition(snapX(raw)), `累加 ${target * 10} 次 → ${raw}`).toBe(target);
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

  it('每个刻度整数吸附后都取到自己', () => {
    for (const t of TICKS) {
      expect(floorByDefinition(snapX(t))).toBe(t);
      expect(readFloor(snapX(t))!.exact).toBe(true);
    }
  });

  it('比整数略小一点点就掉到下一格', () => {
    expect(floorByDefinition(2.9)).toBe(2);
    expect(floorByDefinition(-0.1)).toBe(-1);
  });

  it('吸附把值限制在定义域内', () => {
    expect(snapX(-99)).toBe(DOMAIN.a);
    expect(snapX(99)).toBe(DOMAIN.b);
  });

  it('非有限输入不产生 NaN', () => {
    expect(floorByDefinition(Number.NaN)).toBeNull();
    expect(floorByDefinition(Number.POSITIVE_INFINITY)).toBeNull();
    expect(readFloor(Number.NaN)).toBeNull();
    expect(snapX(Number.NaN)).toBe(0);
  });
});

describe('阶梯图数据', () => {
  it('每格都是 [n, n+1),值等于左端点', () => {
    for (const s of steps()) {
      expect(s.to - s.from).toBe(1);
      expect(s.value).toBe(s.from);
      expect(floorByDefinition(s.from)).toBe(s.value);
    }
  });

  it('格与格首尾相接,没有缝也没有重叠', () => {
    const all = steps();
    for (let i = 1; i < all.length; i += 1) {
      expect(all[i]!.from).toBe(all[i - 1]!.to);
    }
  });

  it('左端点属于本格,右端点属于下一格(闭/开就是这个意思)', () => {
    for (const s of steps()) {
      expect(floorByDefinition(s.from)).toBe(s.value); // 实心圆
      expect(floorByDefinition(s.to)).toBe(s.value + 1); // 空心圆
    }
  });

  it('覆盖整个定义域', () => {
    const all = steps();
    expect(all[0]!.from).toBeLessThanOrEqual(DOMAIN.a);
    expect(all[all.length - 1]!.to).toBeGreaterThanOrEqual(DOMAIN.b);
  });
});

describe('显示', () => {
  it('x 保留一位小数,和滑块步长一致', () => {
    expect(showX(4.7)).toBe('4.7');
    expect(showX(5)).toBe('5.0');
    expect(showX(-1.3)).toBe('-1.3');
  });

  it('不产生 -0.0 或 -0', () => {
    expect(showX(-0.04)).toBe('0.0');
    expect(showN(floorByDefinition(0.5)!)).toBe('0');
    expect(showN(floorByDefinition(0.5)!)).not.toBe('-0');
  });

  it('整数不带小数点', () => {
    expect(showN(-2)).toBe('-2');
    expect(showN(4)).toBe('4');
  });

  it('遍历整个行程都不出现 NaN', () => {
    for (let i = Math.round(DOMAIN.a / STEP); i <= Math.round(DOMAIN.b / STEP); i += 1) {
      const x = snapX(i * STEP);
      expect(showX(x)).not.toContain('NaN');
      expect(showN(floorByDefinition(x)!)).not.toContain('NaN');
    }
  });
});
