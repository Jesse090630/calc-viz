/**
 * `oneSidedLimits.ts` 的测试。
 *
 * 四个重点:
 * ① ⭐⭐**极限与 f(a) 无关** —— 把 f(a) 改成任何值,两个单侧极限都不许动;
 * ② ⭐⭐**两侧不一致时双侧极限是 null**,不是任何数字;
 * ③ 两条路径(那一支的闭形式 vs 沿着一串取样走过去)必须一致;
 * ④ 左边那个点**永远越不过 a** —— 这是交互上的不变量,不是提示语。
 */
import { describe, it, expect } from 'vitest';
import {
  EPS,
  FUNCTIONS,
  FUNCTION_ORDER,
  MIN_GAP,
  SIDE_COPY,
  approachSequence,
  approachedValue,
  approachTex,
  branchAt,
  clampToSide,
  isSettling,
  oneSidedLimit,
  oneSidedTex,
  readApproach,
  resetApproach,
  sampleBranch,
  sideGap,
  showX,
  sidesAgree,
  snapX,
  stepCloser,
  twoSidedLimit,
  twoSidedTex,
  valueAt,
  type LimitFunction,
  type Side,
} from './oneSidedLimits';

const ALL = FUNCTION_ORDER.map((id) => FUNCTIONS[id]);
const SQUARE = FUNCTIONS.square;
const JUMP = FUNCTIONS.jump;
const SIDES: readonly Side[] = ['left', 'right'];

describe('⭐ 提示词钉死的那几个值', () => {
  it('x² 从两边过来都到 4', () => {
    expect(oneSidedLimit(SQUARE, 'left')).toBe(4);
    expect(oneSidedLimit(SQUARE, 'right')).toBe(4);
    expect(twoSidedLimit(SQUARE)).toBe(4);
  });

  it('提示词点名的靠近序列', () => {
    expect(approachSequence(SQUARE, 'left')).toEqual([1, 1.5, 1.9, 1.99, 1.999]);
    expect(approachSequence(SQUARE, 'right')).toEqual([3, 2.5, 2.1, 2.01, 2.001]);
  });

  it('沿着那串输入走,输出确实在往 4 收', () => {
    const ys = approachSequence(SQUARE, 'left').map((x) => valueAt(SQUARE, x)!);
    for (let i = 1; i < ys.length; i += 1) {
      expect(Math.abs(4 - ys[i]!), `第 ${i} 项没有更近`).toBeLessThan(Math.abs(4 - ys[i - 1]!));
    }
    expect(ys[ys.length - 1]!).toBeCloseTo(4, 2);
  });

  it('分段那条:左边到 2,右边到 5', () => {
    expect(oneSidedLimit(JUMP, 'left')).toBe(2);
    expect(oneSidedLimit(JUMP, 'right')).toBe(5);
    expect(sideGap(JUMP)).toBe(3);
  });
});

describe('⭐⭐ 两侧不一致 → 双侧极限**不存在**,而不是某个数', () => {
  it('jump 的双侧极限是 null', () => {
    expect(sidesAgree(JUMP)).toBe(false);
    expect(twoSidedLimit(JUMP)).toBeNull();
  });

  it('⚠️ 绝不返回折中值,也不偏袒某一侧', () => {
    // "极限是 3.5" / "极限是 2" / "极限是 5" —— 三种都是屏幕上看得见的假话。
    const limit = twoSidedLimit(JUMP);
    expect(limit).not.toBe(3.5);
    expect(limit).not.toBe(2);
    expect(limit).not.toBe(5);
    expect(typeof limit).not.toBe('number');
  });

  it('文案里写的是 does not exist,不是某个等号', () => {
    expect(twoSidedTex(JUMP)).toContain('does not exist');
    expect(twoSidedTex(JUMP)).not.toMatch(/=\s*\d/);
    expect(twoSidedTex(SQUARE)).toContain('= 4');
  });

  it('一致时才给数,而且等于任意一侧', () => {
    expect(sidesAgree(SQUARE)).toBe(true);
    expect(twoSidedLimit(SQUARE)).toBe(oneSidedLimit(SQUARE, 'left'));
    expect(twoSidedLimit(SQUARE)).toBe(oneSidedLimit(SQUARE, 'right'));
    expect(sideGap(SQUARE)).toBeLessThanOrEqual(EPS);
  });
});

describe('⭐⭐ 极限与 f(a) 无关', () => {
  it('把 f(a) 换成任何值,两个单侧极限与双侧结论都不动', () => {
    // 下一节课整节都在讲这件事;这一节至少不能在代码里暗示它有关。
    for (const base of ALL) {
      const before = {
        left: oneSidedLimit(base, 'left'),
        right: oneSidedLimit(base, 'right'),
        two: twoSidedLimit(base),
        agree: sidesAgree(base),
      };
      for (const injected of [null, -99, 0, 3.5, 1e6]) {
        const moved: LimitFunction = { ...base, valueAtA: injected };
        expect(oneSidedLimit(moved, 'left'), `${base.id} f(a)=${injected}`).toBe(before.left);
        expect(oneSidedLimit(moved, 'right')).toBe(before.right);
        expect(twoSidedLimit(moved)).toBe(before.two);
        expect(sidesAgree(moved)).toBe(before.agree);
        expect(approachedValue(moved, 'left')).toBeCloseTo(approachedValue(base, 'left'), 12);
      }
    }
  });

  it('f(a) 本身照样能取到 —— 只是不参与判定', () => {
    expect(valueAt(SQUARE, 2)).toBe(4);
    expect(valueAt(JUMP, 2)).toBe(2); // 左支闭合
  });

  it('a 不属于任何一支 —— "趋近"的意思就在这里', () => {
    for (const fn of ALL) expect(branchAt(fn, fn.a)).toBeNull();
    expect(branchAt(JUMP, 1.9)).toBe(JUMP.left);
    expect(branchAt(JUMP, 2.1)).toBe(JUMP.right);
  });
});

describe('⭐ 两条独立路径必须一致', () => {
  it('闭形式与"走一串取样过去"落在同一个值', () => {
    for (const fn of ALL) {
      for (const side of SIDES) {
        expect(approachedValue(fn, side), `${fn.id} ${side}`).toBeCloseTo(oneSidedLimit(fn, side), 8);
      }
    }
  });

  it('取样确实在收拢,而不是碰巧最后一项对上了', () => {
    for (const fn of ALL) {
      for (const side of SIDES) expect(isSettling(fn, side), `${fn.id} ${side}`).toBe(true);
    }
  });

  it('⚠️ 取样再多也只是取样:项数翻倍不会改变结论,但也不构成证明', () => {
    // 精确值来自闭形式那一条;数值这条只负责"看得见地收拢"。
    // (原来这里写了一条"限定某个函数名不存在"的断言 —— 那是把命名规范
    //  硬塞进运行时检查,既测不到东西又跑不起来。命名的事留给代码评审。)
    // ⚠️ 第一版断言"6 项与 14 项几乎相等",容差还给到了 1e-6 ——
    //    可 6 项最近只到 a ± 1e-6,x² 那边差 4e-6,断言当场红。
    //    那不是代码错,是我把"取样更深"写成了"取样更深也没变化"。
    //    真正该说的是:**更深只会更近,不会更远**。
    for (const fn of ALL) {
      for (const side of SIDES) {
        const exact = oneSidedLimit(fn, side);
        const shallow = Math.abs(approachedValue(fn, side, 6) - exact);
        const deep = Math.abs(approachedValue(fn, side, 14) - exact);
        expect(deep, `${fn.id} ${side}`).toBeLessThanOrEqual(shallow + EPS);
        expect(shallow, `${fn.id} ${side} 连浅的都该很近了`).toBeLessThan(1e-4);
      }
    }
  });
});

describe('⭐ 左边那个点越不过 a', () => {
  it('无论传什么,左点永远严格小于 a、右点永远严格大于 a', () => {
    const raw = [-50, 0, 1.999, 1.9999, 2, 2.0001, 2.5, 99, Number.NaN];
    for (const fn of ALL) {
      for (const x of raw) {
        const left = clampToSide(fn, 'left', x);
        const right = clampToSide(fn, 'right', x);
        expect(left, `left from ${x}`).toBeLessThan(fn.a);
        expect(right, `right from ${x}`).toBeGreaterThan(fn.a);
        expect(fn.a - left).toBeGreaterThanOrEqual(MIN_GAP - EPS);
        expect(right - fn.a).toBeGreaterThanOrEqual(MIN_GAP - EPS);
      }
    }
  });

  it('也留在画面范围内', () => {
    for (const fn of ALL) {
      expect(clampToSide(fn, 'left', -99)).toBeGreaterThanOrEqual(fn.view.from - EPS);
      expect(clampToSide(fn, 'right', 99)).toBeLessThanOrEqual(fn.view.to + EPS);
    }
  });

  it('读数用的是所在那一支,不是 f(a)', () => {
    const near = readApproach(JUMP, 'left', 1.999);
    expect(near.y).toBeCloseTo(1.999, 6); // 左支 y = x
    const far = readApproach(JUMP, 'right', 2.001);
    expect(far.y).toBeCloseTo(5.001, 6); // 右支 y = x + 3
  });
});

describe('「再近一点」', () => {
  it('每按一次都更近,而且落在提示词那串值上', () => {
    for (const fn of ALL) {
      for (const side of SIDES) {
        let x = resetApproach(fn, side);
        const gaps = [Math.abs(x - fn.a)];
        for (let i = 0; i < 6; i += 1) {
          x = stepCloser(fn, side, x);
          gaps.push(Math.abs(x - fn.a));
        }
        for (let i = 1; i < gaps.length; i += 1) {
          expect(gaps[i]!, `${fn.id} ${side} 第 ${i} 步`).toBeLessThanOrEqual(gaps[i - 1]! + EPS);
        }
        // 到最近一档就停住,不会越过 a
        expect(gaps[gaps.length - 1]!).toBeCloseTo(0.001, 6);
        expect(x).not.toBe(fn.a);
      }
    }
  });

  it('起点是序列的第一项', () => {
    expect(resetApproach(SQUARE, 'left')).toBeCloseTo(1, 6);
    expect(resetApproach(SQUARE, 'right')).toBeCloseTo(3, 6);
  });
});

describe('画线用的取样', () => {
  it('每一支只覆盖自己那一侧,断点两边不连起来', () => {
    for (const fn of ALL) {
      const left = sampleBranch(fn, 'left');
      const right = sampleBranch(fn, 'right');
      expect(left[0]!.x).toBeCloseTo(fn.view.from, 9);
      expect(left[left.length - 1]!.x).toBeCloseTo(fn.a, 9);
      expect(right[0]!.x).toBeCloseTo(fn.a, 9);
      expect(right[right.length - 1]!.x).toBeCloseTo(fn.view.to, 9);
      for (const p of [...left, ...right]) expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('⚠️ jump 的两支在 x = a 处**高度不同** —— 那道缝就是这一节要看见的东西', () => {
    const left = sampleBranch(JUMP, 'left');
    const right = sampleBranch(JUMP, 'right');
    const gap = Math.abs(right[0]!.y - left[left.length - 1]!.y);
    expect(gap).toBeCloseTo(3, 9);
  });

  it('square 的两支在 x = a 处接得上', () => {
    const left = sampleBranch(SQUARE, 'left');
    const right = sampleBranch(SQUARE, 'right');
    expect(right[0]!.y).toBeCloseTo(left[left.length - 1]!.y, 9);
  });
});

describe('显示', () => {
  it('上标是 − 与 +,不是别的符号', () => {
    expect(approachTex(SQUARE, 'left')).toBe('x \\to 2^{-}');
    expect(approachTex(SQUARE, 'right')).toBe('x \\to 2^{+}');
  });

  it('单侧等式写全了', () => {
    expect(oneSidedTex(SQUARE, 'left')).toBe('\\lim_{x \\to 2^{-}} x^2 = 4');
    expect(oneSidedTex(JUMP, 'right')).toBe('\\lim_{x \\to 2^{+}} x + 3 = 5');
  });

  it('两侧的文案不一样,免得学生以为左右是一回事', () => {
    expect(SIDE_COPY.left.move).not.toBe(SIDE_COPY.right.move);
    expect(SIDE_COPY.left.sign).not.toBe(SIDE_COPY.right.sign);
  });

  it('⚠️⚠️ 屏幕上显示的 x **永远不会等于目标值** —— 这一节全靠这件事', () => {
    // 变异测试抓到的洞:把精度砍成两位,上面那条"相邻两档显示不同"照样绿
    // (1.99 → "1.99",1.999 → "2.00",确实不同)——
    // 但 1.999 显示成 "2.00" 是在说"我到了 2",而这一节整节都在讲**到不了**。
    // 真正该断言的不是"看得出在动",是"看不出已经到了"。
    for (const fn of ALL) {
      const target = showX(fn.a);
      for (const side of SIDES) {
        let x = resetApproach(fn, side);
        for (let i = 0; i < 8; i += 1) {
          expect(showX(x), `${fn.id} ${side} 第 ${i} 步显示成了目标值`).not.toBe(target);
          x = stepCloser(fn, side, x);
        }
        // 最近那一档也不行
        expect(showX(clampToSide(fn, side, fn.a))).not.toBe(target);
      }
    }
  });

  it('相邻两档显示出来也不一样,拖动才有反馈', () => {
    expect(showX(1.999)).not.toBe(showX(1.99));
    expect(showX(2.001)).not.toBe(showX(2.01));
  });
});

describe('⚠️ 这一组是给测试自己的', () => {
  it('两条曲线一条一致一条不一致 —— 否则只测到了一半', () => {
    expect(ALL.filter((fn) => sidesAgree(fn))).toHaveLength(1);
    expect(ALL.filter((fn) => !sidesAgree(fn))).toHaveLength(1);
  });

  it('步长与最小间隔配得上', () => {
    expect(MIN_GAP).toBeGreaterThanOrEqual(snapX(MIN_GAP) - EPS);
    expect(snapX(1.999)).toBeCloseTo(1.999, 9);
    expect(snapX(2.001)).toBeCloseTo(2.001, 9);
  });
});
