/**
 * `differenceOfCubes.ts` 的测试。
 *
 * ⭐⭐ 这一课要回答「第二个因子为什么这么怪」。
 * 答案是几何的:三块的**截面**分别是 a²、ab、b²,而三块的**厚度都是 a − b**。
 * 所以下面两组断言是这一课的全部:
 *   ① 三块恰好铺满那层壳(不重叠、不漏、不外溢);
 *   ② 每块都恰好含一条 a − b 的边,截面正好是那三项。
 */
import { describe, it, expect } from 'vitest';
import {
  EXPANSION,
  FIRST_HALF,
  PATTERNS,
  RANGE,
  SECOND_HALF,
  SIGNS,
  WHY_WEIRD,
  bigVolume,
  boxVolume,
  boxes,
  cancellingPairs,
  clampPair,
  commonEdge,
  crossSection,
  cubesTex,
  drawOrder,
  expandedValue,
  facesOf,
  factoredNumbersPlain,
  numbersPlain,
  partitionsExactly,
  patternHolds,
  patternOf,
  project,
  remainingVolume,
  smallVolume,
  survivingTerms,
  volumeByBoxes,
  volumeByFactors,
} from './differenceOfCubes';

const ALL_PAIRS: readonly { a: number; b: number }[] = (() => {
  const out: { a: number; b: number }[] = [];
  for (let a = RANGE.min + 1; a <= RANGE.max; a += 1) {
    for (let b = RANGE.min; b < a; b += 1) out.push({ a, b });
  }
  return out;
})();

describe('⭐⭐ 三条独立路径给出同一个体积', () => {
  it('定义 vs 三块相加 vs 因式相乘 vs 展开逐项 —— 精确相等', () => {
    for (const { a, b } of ALL_PAIRS) {
      const byDefinition = remainingVolume(a, b);
      expect(volumeByBoxes(a, b), `boxes @ ${a},${b}`).toBe(byDefinition);
      expect(volumeByFactors(a, b), `factors @ ${a},${b}`).toBe(byDefinition);
      expect(expandedValue(a, b), `expansion @ ${a},${b}`).toBe(byDefinition);
    }
    expect(ALL_PAIRS.length).toBeGreaterThan(30);
  });

  it('一组具体数字:5³ − 2³ = 117,而 3 × (25 + 10 + 4) = 117', () => {
    expect(bigVolume(5)).toBe(125);
    expect(smallVolume(2)).toBe(8);
    expect(remainingVolume(5, 2)).toBe(117);
    expect(volumeByFactors(5, 2)).toBe(117);
    expect(numbersPlain(5, 2)).toBe('125 − 8 = 117');
    expect(factoredNumbersPlain(5, 2)).toBe('3 × (25 + 10 + 4) = 117');
    expect(cubesTex(5, 2)).toBe('5^3 - 2^3');
  });

  it('⚠️ 抓得住写错的第二个因子', () => {
    // 少一项 ab 的话,乘出来就不是 a³ − b³ 了。
    for (const { a, b } of [{ a: 5, b: 2 }, { a: 7, b: 3 }]) {
      expect((a - b) * (a * a + b * b)).not.toBe(remainingVolume(a, b));
      // 中间那项写成 −ab(立方和的样子)也不对
      expect((a - b) * (a * a - a * b + b * b)).not.toBe(remainingVolume(a, b));
    }
  });
});

describe('⭐⭐ 三块恰好铺满那层壳', () => {
  it('洞里一块也盖不到,洞外每个点恰好被一块盖住,外面没有外溢', () => {
    for (const { a, b } of ALL_PAIRS) {
      expect(partitionsExactly(a, b), `${a},${b} 切不开`).toBe(true);
    }
  });

  it('⭐ 覆盖检查真的会失败 —— 拿一块故意挪歪的来试', () => {
    const [slab, panel, stick] = boxes(5, 2);
    const moved = { ...panel, at: [0, 1, 0] as const };
    let bad = 0;
    for (let i = 0; i < 12; i += 1) {
      for (let j = 0; j < 12; j += 1) {
        for (let k = 0; k < 12; k += 1) {
          const point = [(5 * (i + 0.5)) / 12, (5 * (j + 0.5)) / 12, (5 * (k + 0.5)) / 12] as const;
          const inHole = point.every((v) => v < 2);
          const covered = [slab, moved, stick].reduce((count, box) => {
            const inside = box.at.every((min, axis) => point[axis]! >= min && point[axis]! < min + box.size[axis]!);
            return count + Number(inside);
          }, 0);
          if (inHole ? covered !== 0 : covered !== 1) bad += 1;
        }
      }
    }
    expect(bad, '挪歪之后居然还铺得严丝合缝').toBeGreaterThan(0);
  });

  it('⭐ 每块都恰好含一条 a − b 的边 —— 那就是「提公因子」的图像', () => {
    for (const { a, b } of ALL_PAIRS) {
      for (const box of boxes(a, b)) {
        expect(commonEdge(box, a, b), `${box.id} @ ${a},${b}`).toBe(true);
        // 体积 = 公共边 × 截面
        expect(boxVolume(box)).toBeCloseTo((a - b) * crossSection(box), 9);
      }
    }
  });

  it('⭐ 三块的截面正好是 a²、ab、b² —— 第二个因子的三项', () => {
    for (const { a, b } of ALL_PAIRS) {
      const list = boxes(a, b);
      expect(list.map((box) => box.termTex)).toEqual(['a^2', 'ab', 'b^2']);
      expect(list.map((box) => Math.round(crossSection(box)))).toEqual([a * a, a * b, b * b]);
      // 声明的项值与实际截面一致
      for (const box of list) expect(box.termValue).toBeCloseTo(crossSection(box), 9);
      // 三项之和就是第二个因子
      const second = list.reduce((sum, box) => sum + box.termValue, 0);
      expect(second).toBe(a * a + a * b + b * b);
      expect((a - b) * second).toBe(remainingVolume(a, b));
    }
  });

  it('三块的 id 互不相同', () => {
    expect(new Set(boxes(5, 2).map((box) => box.id)).size).toBe(3);
  });
});

describe('等距投影', () => {
  it('原点投到原点,三个轴方向互不相同', () => {
    expect(project([0, 0, 0])).toEqual({ x: 0, y: 0 });
    const ex = project([1, 0, 0]);
    const ey = project([0, 1, 0]);
    const ez = project([0, 0, 1]);
    for (const v of [ex, ey, ez]) {
      expect(Number.isFinite(v.x)).toBe(true);
      expect(Number.isFinite(v.y)).toBe(true);
    }
    expect(new Set([ex, ey, ez].map((v) => `${v.x.toFixed(6)},${v.y.toFixed(6)}`)).size).toBe(3);
    // z 往上:屏幕 y 变小
    expect(ez.y).toBeLessThan(0);
  });

  it('⚠️ 投影是线性的 —— 平移一块不会把它拧变形', () => {
    const shift: readonly [number, number, number] = [2, 3, 1];
    for (const point of [[0, 0, 0], [1, 2, 3], [-1, 4, 0.5]] as const) {
      const moved = project([point[0] + shift[0], point[1] + shift[1], point[2] + shift[2]]);
      const expected = project(point);
      const delta = project(shift);
      expect(moved.x).toBeCloseTo(expected.x + delta.x, 12);
      expect(moved.y).toBeCloseTo(expected.y + delta.y, 12);
    }
  });

  it('每块画三个可见面,每个面四个顶点', () => {
    for (const box of boxes(5, 2)) {
      const faces = facesOf(box);
      expect(faces).toHaveLength(3);
      expect(faces.map((f) => f.kind).sort()).toEqual(['left', 'right', 'top']);
      for (const face of faces) {
        expect(face.points).toHaveLength(4);
        for (const p of face.points) {
          expect(Number.isFinite(p.x)).toBe(true);
          expect(Number.isFinite(p.y)).toBe(true);
        }
      }
    }
  });

  it('⭐ 拆开时每块沿**自己那条 a − b 的轴**移动,而且真的动了', () => {
    for (const box of boxes(5, 2)) {
      const closed = facesOf(box, 0)[0]!.points[0]!;
      const open = facesOf(box, 1)[0]!.points[0]!;
      const moved = Math.hypot(open.x - closed.x, open.y - closed.y);
      expect(moved, `${box.id} 拆开时没动`).toBeGreaterThan(0.1);
    }
  });

  it('⚠️ 画的顺序由远及近 —— 顺序反了整张图就不像立体', () => {
    const ordered = drawOrder(boxes(5, 2));
    const depth = (box: (typeof ordered)[number]) => box.at[0] + box.at[1] + box.at[2];
    for (let i = 1; i < ordered.length; i += 1) {
      expect(depth(ordered[i]!)).toBeGreaterThanOrEqual(depth(ordered[i - 1]!));
    }
    expect(ordered).toHaveLength(3);
  });
});

describe('滑块的取值', () => {
  it('永远保持 a > b > 0,整数,而且切得开', () => {
    for (const a of [-3, 0, 1, 2, 5, 9, 40]) {
      for (const b of [-3, 0, 1, 2, 5, 9, 40]) {
        const pair = clampPair(a, b);
        expect(pair.a).toBeGreaterThan(pair.b);
        expect(pair.b).toBeGreaterThanOrEqual(RANGE.min);
        expect(pair.a).toBeLessThanOrEqual(RANGE.max);
        expect(remainingVolume(pair.a, pair.b)).toBeGreaterThan(0);
        expect(partitionsExactly(pair.a, pair.b, 8)).toBe(true);
      }
    }
    expect(clampPair(Number.NaN, Number.NaN).a).toBeGreaterThan(clampPair(Number.NaN, Number.NaN).b);
  });
});

describe('代数:展开与抵消', () => {
  it('两半各三项,合起来六项', () => {
    expect(FIRST_HALF).toHaveLength(3);
    expect(SECOND_HALF).toHaveLength(3);
    expect(EXPANSION).toHaveLength(6);
    expect(FIRST_HALF.every((t) => t.sign === 1)).toBe(true);
    expect(SECOND_HALF.every((t) => t.sign === -1)).toBe(true);
  });

  it('⭐ 抵消的是两对:a²b 与 ab²', () => {
    expect([...cancellingPairs()].sort()).toEqual(['a^2b', 'ab^2']);
    for (const { a, b } of ALL_PAIRS) {
      const cancelled = EXPANSION.filter((t) => t.cancels).reduce((s, t) => s + t.sign * t.at(a, b), 0);
      expect(cancelled, `${a},${b}`).toBe(0);
    }
  });

  it('剩下的正好是 a³ 与 −b³', () => {
    const left = survivingTerms();
    expect(left.map((t) => t.tex)).toEqual(['a^3', 'b^3']);
    expect(left.map((t) => t.sign)).toEqual([1, -1]);
    for (const { a, b } of ALL_PAIRS) {
      expect(left.reduce((s, t) => s + t.sign * t.at(a, b), 0)).toBe(remainingVolume(a, b));
    }
  });

  it('⭐⭐ 「怪」的那句话说的是**抵消**,不是「背下来」', () => {
    expect(WHY_WEIRD).toContain('cancel');
    expect(WHY_WEIRD.toLowerCase()).not.toContain('memoriz');
    expect(WHY_WEIRD.toLowerCase()).not.toContain('remember');
  });

  it('⭐ 去掉第二个因子里的任意一项,就有东西活下来 —— 那正是它"不怪"的理由', () => {
    // 这条把 WHY_WEIRD 那句话变成一个可验证的事实。
    for (const { a, b } of [{ a: 5, b: 2 }, { a: 8, b: 3 }, { a: 4, b: 1 }]) {
      const full = a * a + a * b + b * b;
      expect((a - b) * full).toBe(remainingVolume(a, b));
      for (const dropped of [a * a, a * b, b * b]) {
        expect((a - b) * (full - dropped), `${a},${b} 少一项居然还对`).not.toBe(remainingVolume(a, b));
      }
    }
  });
});

describe('⚠️ 纯文本就得是纯文本', () => {
  it('当散文用的字符串里不许有反斜杠', () => {
    for (const { a, b } of ALL_PAIRS.slice(0, 15)) {
      for (const text of [numbersPlain(a, b), factoredNumbersPlain(a, b)]) {
        expect(text, text).not.toContain('\\');
      }
    }
  });
});

describe('立方和:同一套东西换个符号', () => {
  it('两个符号各自的因式都对', () => {
    for (const key of ['difference', 'sum'] as const) {
      const entry = SIGNS[key];
      for (const { a, b } of ALL_PAIRS) {
        expect(entry.byFactors(a, b), `${key} @ ${a},${b}`).toBe(entry.at(a, b));
      }
    }
  });

  it('⭐ 两者的中间项符号相反 —— 这才是唯一的差别', () => {
    expect(SIGNS.difference.secondFactorTex).toContain('+ ab');
    expect(SIGNS.sum.secondFactorTex).toContain('- ab');
    expect(SIGNS.difference.firstFactorTex).toBe('a - b');
    expect(SIGNS.sum.firstFactorTex).toBe('a + b');
  });

  it('立方和的值确实和立方差不同 —— 不是同一个函数换了个名字', () => {
    for (const { a, b } of [{ a: 5, b: 2 }, { a: 7, b: 4 }]) {
      expect(SIGNS.sum.at(a, b)).not.toBe(SIGNS.difference.at(a, b));
    }
  });
});

describe('认形状', () => {
  it('三道例题的原式与因式在任意 x 上都相等', () => {
    for (const pattern of PATTERNS) {
      expect(patternHolds(pattern.id), pattern.id).toBe(true);
    }
  });

  it('提示词点名的两道都在', () => {
    const eight = patternOf('x3-8');
    expect(eight.bWhy).toContain('8 = 2³');
    expect(eight.factoredTex).toBe('(x - 2)(x^2 + 2x + 4)');

    const twentySeven = patternOf('27x3-1');
    expect(twentySeven.aWhy).toContain('27x³ = (3x)³');
    expect(twentySeven.factoredTex).toBe('(3x - 1)(9x^2 + 3x + 1)');
  });

  it('⭐ 有一道是立方和 —— 伴生模式不是摆设', () => {
    const sum = patternOf('x3+64');
    expect(sum.sign).toBe('sum');
    expect(sum.factoredTex).toContain('(x + 4)');
    expect(sum.factoredTex).toContain('- 4x');
    expect(patternHolds('x3+64')).toBe(true);
  });

  it('⚠️ 核对抓得住把立方和的中间项符号写错', () => {
    const wrong = (x: number) => (x + 4) * (x * x + 4 * x + 16);
    const right = patternOf('x3+64');
    expect(Math.abs(wrong(2) - right.original(2))).toBeGreaterThan(1);
  });

  it('每道题的 id 与题面互不相同', () => {
    for (const key of ['id', 'tex', 'factoredTex'] as const) {
      expect(new Set(PATTERNS.map((p) => p[key])).size, key).toBe(PATTERNS.length);
    }
  });
});
