/**
 * `limitVsValue.ts` 的测试。
 *
 * ⭐⭐ 核心只有一条:**把 f(1) 拖到任何高度,极限都还是 2。**
 * 其余都是为它服务的:原始式在 1 处没有值(而不是 NaN)、两种写法在别处完全一致、
 * 两条路径给出同一个 2。
 */
import { describe, it, expect } from 'vitest';
import {
  A,
  EPS,
  HOLE_Y,
  POINT_RANGE,
  STEP,
  VIEW,
  agreesAway,
  approachSequence,
  approachedValue,
  clampPointY,
  clampToSide,
  limitAtHole,
  pointSitsOnHole,
  rawAt,
  readApproach,
  resetApproach,
  sampleBranch,
  showY,
  simplifiedAt,
  snapX,
  stepCloser,
  valueAtA,
  valueTex,
  type Side,
} from './limitVsValue';

const SIDES: readonly Side[] = ['left', 'right'];
/** 把整个可拖范围走一遍 */
function everyHeight(): number[] {
  const out: number[] = [];
  for (let y = POINT_RANGE.from; y <= POINT_RANGE.to + EPS; y += 0.05) out.push(Number(y.toFixed(4)));
  return out;
}

describe('⭐⭐ 点决定不了极限', () => {
  it('孤立点拖到任何高度,极限都还是 2', () => {
    for (const y of everyHeight()) {
      expect(limitAtHole(), `f(1) = ${y}`).toBe(HOLE_Y);
      expect(limitAtHole()).toBe(2);
    }
  });

  it('两种模式(没有点 / 有个孤立点)下极限也一样', () => {
    expect(valueAtA('hole', 5)).toBeNull();
    expect(valueAtA('isolated', 5)).toBe(5);
    expect(limitAtHole()).toBe(2);
  });

  it('⭐ `limitAtHole` **拿不到** f(1) —— 它一个参数都不接', () => {
    // 这不是文字游戏:签名里没有那个值,"极限依赖函数值"就写不出来。
    expect(limitAtHole.length).toBe(0);
  });

  it('孤立点正好落在洞上时也只是"恰好相等",不是"因此相等"', () => {
    expect(pointSitsOnHole('isolated', 2)).toBe(true);
    expect(pointSitsOnHole('isolated', 5)).toBe(false);
    expect(pointSitsOnHole('hole', 2)).toBe(false);
    expect(limitAtHole()).toBe(2); // 两种情形下都一样
  });

  it('文案:没有点时写 undefined,有点时写等号', () => {
    expect(valueTex('hole', 5)).toContain('undefined');
    expect(valueTex('hole', 5)).not.toMatch(/=\s*\d/);
    expect(valueTex('isolated', 5)).toBe('f(1) = 5');
    expect(valueTex('isolated', 2)).toBe('f(1) = 2');
  });
});

describe('⭐ 原始式在 x = 1 处没有值,而不是 NaN', () => {
  it('JS 里 0/0 是 NaN —— 先证明这个坑真的存在', () => {
    expect(Number.isNaN((1 * 1 - 1) / (1 - 1))).toBe(true);
    expect(rawAt(1)).toBeNull();
  });

  it('显示层写成 undefined,不写 NaN', () => {
    expect(showY(rawAt(1))).toBe('undefined');
    expect(showY(rawAt(1))).not.toContain('NaN');
  });

  it('非有限输入也返回 null', () => {
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) expect(rawAt(bad)).toBeNull();
  });

  it('⭐ 除了 x = 1,两种写法处处相同', () => {
    for (let x = VIEW.from; x <= VIEW.to + EPS; x += 0.01) {
      const at = Number(x.toFixed(4));
      if (Math.abs(at - A) <= EPS) continue;
      expect(agreesAway(at), `x = ${at}`).toBe(true);
    }
  });

  it('而在 x = 1 处正好不同:一个没有值,一个有', () => {
    expect(rawAt(A)).toBeNull();
    expect(simplifiedAt(A)).toBe(2);
  });
});

describe('⭐ 两条独立路径都给出 2', () => {
  it('代数约分 vs 用原始式走一串取样', () => {
    // ⚠️ 容差只到 7 位,理由在下一条测试里 —— 原始式在极近处会丢精度,
    //    而且 |x − 1| ≤ EPS 的那几档会被判成"在洞上"直接跳过。
    for (const side of SIDES) {
      expect(approachedValue(side), side).toBeCloseTo(limitAtHole(), 7);
    }
  });

  it('⚠️ 原始式在极近处**会丢精度** —— 这正是画图不用它的理由', () => {
    // (x² − 1) 与 (x − 1) 都趋近于 0,相减时高位全抵消,有效数字被吃掉。
    // 离洞 1e-4 时误差 1e-4,离洞 1e-6 时误差 1e-6 —— 误差和距离同阶,
    // 也就是说**越靠近越不准**,而这一节偏偏要一路靠到最近。
    const err = (gap: number) => Math.abs(rawAt(A - gap)! - limitAtHole());
    expect(err(1e-4)).toBeGreaterThan(1e-5);
    expect(err(1e-6)).toBeGreaterThan(1e-7);
    // 约分式没有这个问题 —— 所以曲线用它画,数值仍然用原始式读。
    expect(Math.abs(simplifiedAt(A - 1e-6) - limitAtHole())).toBeCloseTo(1e-6, 12);
  });

  it('比 EPS 还近的输入直接算作"在洞上"', () => {
    expect(rawAt(A - 1e-10)).toBeNull();
    expect(rawAt(A + 1e-10)).toBeNull();
    expect(rawAt(A - 1e-6)).not.toBeNull();
  });

  it('提示词点名的那几个值', () => {
    expect(approachSequence('left')).toEqual([0.5, 0.9, 0.99, 0.999]);
    expect(approachSequence('right')).toEqual([1.5, 1.1, 1.01, 1.001]);
    expect(rawAt(0.9)).toBeCloseTo(1.9, 9);
    expect(rawAt(0.99)).toBeCloseTo(1.99, 9);
    expect(rawAt(1.01)).toBeCloseTo(2.01, 9);
    expect(rawAt(1.001)).toBeCloseTo(2.001, 9);
  });

  it('取样越深越近,不会更远', () => {
    for (const side of SIDES) {
      const shallow = Math.abs(approachedValue(side, 4) - limitAtHole());
      const deep = Math.abs(approachedValue(side, 10) - limitAtHole());
      expect(deep).toBeLessThanOrEqual(shallow + EPS);
    }
  });
});

describe('两个走近的点', () => {
  it('永远越不过洞', () => {
    for (const x of [-99, 0.999, 1, 1.0001, 99, Number.NaN]) {
      expect(clampToSide('left', x)).toBeLessThan(A);
      expect(clampToSide('right', x)).toBeGreaterThan(A);
    }
  });

  it('读数用的是原始式,而且靠近时接近 2', () => {
    expect(readApproach('left', 0.999).y).toBeCloseTo(1.999, 6);
    expect(readApproach('right', 1.001).y).toBeCloseTo(2.001, 6);
  });

  it('「再近一点」每次都更近,到最近一档就停住', () => {
    for (const side of SIDES) {
      let x = resetApproach(side);
      let gap = Math.abs(x - A);
      for (let i = 0; i < 6; i += 1) {
        x = stepCloser(side, x);
        const next = Math.abs(x - A);
        expect(next).toBeLessThanOrEqual(gap + EPS);
        gap = next;
      }
      expect(gap).toBeCloseTo(0.001, 6);
      expect(x).not.toBe(A);
    }
  });

  it('⚠️ 显示出来的 x 永远不是 1 本身', () => {
    for (const side of SIDES) {
      let x = resetApproach(side);
      for (let i = 0; i < 8; i += 1) {
        expect(snapX(x)).not.toBe(A);
        x = stepCloser(side, x);
      }
    }
  });
});

describe('孤立点的高度', () => {
  it('夹在可拖范围内,而且落在格点上', () => {
    for (const y of [-99, 0, 0.2, 2, 5, 99, Number.NaN]) {
      const c = clampPointY(y);
      expect(c).toBeGreaterThanOrEqual(POINT_RANGE.from - EPS);
      expect(c).toBeLessThanOrEqual(POINT_RANGE.to + EPS);
      expect(Math.abs(c / STEP - Math.round(c / STEP))).toBeLessThan(1e-6);
    }
  });

  it('可拖范围要**包含**洞的高度 —— 否则"它们可以相等"演不出来', () => {
    expect(HOLE_Y).toBeGreaterThan(POINT_RANGE.from);
    expect(HOLE_Y).toBeLessThan(POINT_RANGE.to);
  });
});

describe('画线用的取样', () => {
  it('两侧分开,洞处不连过去', () => {
    const left = sampleBranch('left');
    const right = sampleBranch('right');
    expect(left[left.length - 1]!.x).toBeCloseTo(A, 9);
    expect(right[0]!.x).toBeCloseTo(A, 9);
    for (const p of [...left, ...right]) expect(Number.isFinite(p.y)).toBe(true);
  });

  it('⚠️ 画的是**约分后**的直线 —— 那正是原函数在 x ≠ 1 时的样子', () => {
    // 用原始式取样会在 x = 1 附近出现 null,画出来的线反而更难看懂;
    // 而两者在 x ≠ 1 处逐点相同(上面有断言钉着),所以画约分式是诚实的。
    for (const p of sampleBranch('left')) {
      if (Math.abs(p.x - A) <= EPS) continue;
      expect(p.y).toBeCloseTo(rawAt(p.x)!, 9);
    }
  });
});
