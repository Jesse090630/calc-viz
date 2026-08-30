/**
 * `differenceOfSquares.ts` 的测试。
 *
 * ⭐⭐ 剪拼证明只有一个前提:**拼得上,而且既不重叠也不留缝**。
 * 面积对得上是**不够**的 —— 两块互相压住一半、外面再露一块,面积照样能对上,
 * 而那样的图什么都没证明。所以这里撒点验证覆盖,不只验面积。
 */
import { describe, it, expect } from 'vitest';
import {
  CANCEL_WORDS,
  EXPANSION,
  OPERATION_WORDS,
  SAME_PIECES,
  STAGES,
  STAGE_COUNT,
  areaTexAt,
  beat,
  currentIndex,
  cutLine,
  cutOffset,
  edgeDrawn,
  edgesOf,
  globalFor,
  identityTexAt,
  localProgress,
  partialEnd,
  rearrangeProgress,
  thicknessBracket,
  longSideBrackets,
  PATTERNS,
  RANGE,
  areaByFactors,
  areaByPieces,
  bigArea,
  clampPair,
  containsAt,
  cornersAt,
  coversTheLShape,
  expandedValue,
  factorsTex,
  numbersPlain,
  patternHolds,
  patternOf,
  pieceArea,
  pieces,
  placeAt,
  productPlain,
  remainingArea,
  smallArea,
  squaresTex,
  survivingTerms,
  targetRect,
  tilesExactly,
} from './differenceOfSquares';

/** 扫一遍所有合法的整数对。 */
const ALL_PAIRS: readonly { a: number; b: number }[] = (() => {
  const out: { a: number; b: number }[] = [];
  for (let a = RANGE.min + 1; a <= RANGE.max; a += 1) {
    for (let b = RANGE.min; b < a; b += 1) out.push({ a, b });
  }
  return out;
})();

describe('⭐⭐ 三条独立路径给出同一个面积', () => {
  it('定义 vs 碎片相加 vs 因式相乘 —— 对每一对整数都**精确**相等', () => {
    for (const { a, b } of ALL_PAIRS) {
      const byDefinition = remainingArea(a, b);
      // ⚠️ 整数运算,用 toBe 不用 toBeCloseTo:差一点点就是差。
      expect(areaByPieces(a, b), `pieces @ ${a},${b}`).toBe(byDefinition);
      expect(areaByFactors(a, b), `factors @ ${a},${b}`).toBe(byDefinition);
      expect(expandedValue(a, b), `expansion @ ${a},${b}`).toBe(byDefinition);
    }
    expect(ALL_PAIRS.length).toBeGreaterThan(50);
  });

  it('提示词点名的那组:7² − 3² = 40,而 4 × 10 = 40', () => {
    expect(bigArea(7)).toBe(49);
    expect(smallArea(3)).toBe(9);
    expect(remainingArea(7, 3)).toBe(40);
    expect(areaByFactors(7, 3)).toBe(40);
    expect(areaByPieces(7, 3)).toBe(40);
    expect(numbersPlain(7, 3)).toBe('49 − 9 = 40');
    expect(productPlain(7, 3)).toBe('4 × 10 = 40');
    expect(squaresTex(7, 3)).toBe('7^2 - 3^2');
    expect(factorsTex(7, 3)).toBe('(7 - 3)(7 + 3)');
  });

  it('⚠️ 这条检查抓得住错的因式 —— 不是恒真', () => {
    // 如果有人把 (a−b)(a+b) 写成 (a−b)(a−b),必须对不上。
    for (const { a, b } of [{ a: 7, b: 3 }, { a: 5, b: 2 }]) {
      expect((a - b) * (a - b)).not.toBe(remainingArea(a, b));
    }
  });
});

describe('⭐⭐ 剪拼:拼得上,不重叠,不留缝', () => {
  it('拼好之后**恰好**铺满 (a+b) × (a−b) 的长方形', () => {
    for (const { a, b } of ALL_PAIRS) {
      expect(tilesExactly(a, b), `${a},${b} 拼不上`).toBe(true);
    }
  });

  it('起始状态**恰好**铺满 L 形,而挖掉的那块一点都没盖到', () => {
    for (const { a, b } of ALL_PAIRS) {
      expect(coversTheLShape(a, b), `${a},${b} 的 L 形没铺对`).toBe(true);
    }
  });

  it('⭐ 覆盖检查真的会失败 —— 拿一块故意放歪的来试', () => {
    // ⚠️ 一个永远返回 true 的检查等于没有检查。
    //    把 side 那块往里挪一格,它就会和 top 重叠、右边留一条缝。
    const [top, side] = pieces(7, 3);
    const shifted = { ...side, end: { x: side.end.x - 1, y: side.end.y } };
    const target = targetRect(7, 3);
    let doubleCovered = 0;
    let uncovered = 0;
    for (let i = 0; i < 20; i += 1) {
      for (let j = 0; j < 20; j += 1) {
        const point = { x: (target.w * (i + 0.5)) / 20, y: (target.h * (j + 0.5)) / 20 };
        const covered = Number(containsAt(top, 1, point)) + Number(containsAt(shifted, 1, point));
        if (covered > 1) doubleCovered += 1;
        if (covered === 0) uncovered += 1;
      }
    }
    expect(doubleCovered, '挪歪之后居然没有重叠').toBeGreaterThan(0);
    expect(uncovered, '挪歪之后居然没有空缺').toBeGreaterThan(0);
  });

  it('目标长方形的边长就是 (a+b) 与 (a−b)', () => {
    for (const { a, b } of ALL_PAIRS) {
      const target = targetRect(a, b);
      expect(target.w).toBe(a + b);
      expect(target.h).toBe(a - b);
      expect(target.w * target.h).toBe(remainingArea(a, b));
    }
  });

  it('两块各自的面积是 a(a−b) 与 b(a−b) —— 共同因子就是 a−b', () => {
    for (const { a, b } of ALL_PAIRS) {
      const [top, side] = pieces(a, b);
      expect(pieceArea(top)).toBe(a * (a - b));
      expect(pieceArea(side)).toBe(b * (a - b));
      // ⭐ 两块都含 (a−b) —— 那就是「提出公因子」在图上的样子
      expect(pieceArea(top) % (a - b)).toBe(0);
      expect(pieceArea(side) % (a - b)).toBe(0);
    }
  });
});

describe('动画', () => {
  it('t = 0 时在原位,t = 1 时在终点', () => {
    for (const { a, b } of [{ a: 7, b: 3 }, { a: 9, b: 1 }, { a: 4, b: 3 }]) {
      for (const piece of pieces(a, b)) {
        const start = placeAt(piece, 0);
        expect(start.centre.x).toBeCloseTo(piece.start.x + piece.start.w / 2, 12);
        expect(start.centre.y).toBeCloseTo(piece.start.y + piece.start.h / 2, 12);
        expect(start.turn).toBe(0);

        const end = placeAt(piece, 1);
        expect(end.centre.x).toBeCloseTo(piece.end.x, 12);
        expect(end.centre.y).toBeCloseTo(piece.end.y, 12);
        expect(end.turn).toBe(piece.turn);
      }
    }
  });

  it('⚠️ 越界的 t 被夹住,不会把碎片甩出画面', () => {
    const [, side] = pieces(7, 3);
    expect(placeAt(side, -5).turn).toBe(0);
    expect(placeAt(side, 9).turn).toBe(90);
    expect(placeAt(side, Number.NaN).turn).toBe(0);
    for (const t of [-5, 9, Number.NaN]) {
      const { centre } = placeAt(side, t);
      expect(Number.isFinite(centre.x)).toBe(true);
      expect(Number.isFinite(centre.y)).toBe(true);
    }
  });

  it('⭐ 面积在整个动画过程中一刻也没变', () => {
    // 旋转与平移都不改面积 —— 这正是这个证明成立的理由,值得钉住。
    for (const t of [0, 0.17, 0.5, 0.83, 1]) {
      for (const piece of pieces(7, 3)) {
        const corners = cornersAt(piece, t);
        expect(corners).toHaveLength(4);
        // 鞋带公式
        let twice = 0;
        for (let i = 0; i < 4; i += 1) {
          const p = corners[i]!;
          const q = corners[(i + 1) % 4]!;
          twice += p.x * q.y - q.x * p.y;
        }
        expect(Math.abs(twice) / 2, `t=${t} ${piece.id}`).toBeCloseTo(pieceArea(piece), 9);
      }
    }
  });

  it('转的是 side 那块,top 只平移', () => {
    const [top, side] = pieces(7, 3);
    expect(top.turn).toBe(0);
    expect(side.turn).toBe(90);
  });
});

describe('滑块的取值', () => {
  it('⭐ 永远保持 a > b > 0,即使两条滑块拖到一起', () => {
    for (const a of [-5, 0, 1, 3, 7, 12, 99]) {
      for (const b of [-5, 0, 1, 3, 7, 12, 99]) {
        const pair = clampPair(a, b);
        expect(pair.a, `${a},${b}`).toBeGreaterThan(pair.b);
        expect(pair.b, `${a},${b}`).toBeGreaterThanOrEqual(RANGE.min);
        expect(pair.a, `${a},${b}`).toBeLessThanOrEqual(RANGE.max);
        expect(Number.isInteger(pair.a)).toBe(true);
        expect(Number.isInteger(pair.b)).toBe(true);
        // ⚠️ a = b 会让目标长方形高度为 0 —— 界面上整块图消失
        expect(remainingArea(pair.a, pair.b)).toBeGreaterThan(0);
        expect(tilesExactly(pair.a, pair.b), `${a},${b}`).toBe(true);
      }
    }
  });

  it('非有限的输入给出一个能用的默认值', () => {
    const pair = clampPair(Number.NaN, Number.NaN);
    expect(pair.a).toBeGreaterThan(pair.b);
    expect(Number.isFinite(pair.a)).toBe(true);
  });
});

describe('代数模式', () => {
  it('四项就是分配律的四项,顺序也一样', () => {
    expect(EXPANSION.map((t) => `${t.sign > 0 ? '+' : '-'}${t.tex}`)).toEqual(['+a^2', '+ab', '-ab', '-b^2']);
  });

  it('⭐ 中间两项在**每一对** a、b 上都精确抵消', () => {
    const middle = EXPANSION.filter((t) => t.cancels);
    expect(middle).toHaveLength(2);
    for (const { a, b } of ALL_PAIRS) {
      const sum = middle.reduce((s, t) => s + t.sign * t.at(a, b), 0);
      expect(sum, `${a},${b}`).toBe(0);
    }
  });

  it('剩下的两项就是 a² 与 −b²', () => {
    const left = survivingTerms();
    expect(left).toHaveLength(2);
    expect(left.map((t) => t.tex)).toEqual(['a^2', 'b^2']);
    expect(left.map((t) => t.sign)).toEqual([1, -1]);
    for (const { a, b } of ALL_PAIRS) {
      const sum = left.reduce((s, t) => s + t.sign * t.at(a, b), 0);
      expect(sum, `${a},${b}`).toBe(remainingArea(a, b));
    }
  });

  it('那句话说的是抵消,不是「记住结果」', () => {
    expect(CANCEL_WORDS).toBe('The middle terms cancel.');
    expect(CANCEL_WORDS.toLowerCase()).not.toContain('memoriz');
  });
});

describe('⚠️ 纯文本就得是纯文本', () => {
  it('当散文用的字符串里不许有反斜杠 —— 那会在页面上原样显示', () => {
    // 截图抓到过:`4 \times 10 = 40` 被当小字直接渲染,屏幕上就是那串源码。
    for (const { a, b } of ALL_PAIRS.slice(0, 20)) {
      for (const text of [numbersPlain(a, b), productPlain(a, b)]) {
        expect(text, text).not.toContain('\\');
        expect(text, text).not.toMatch(/\^|_\{/);
      }
    }
  });
});

describe('认形状', () => {
  it('三道例题的原式与因式在任意 x 上都相等', () => {
    for (const pattern of PATTERNS) {
      expect(patternHolds(pattern.id), pattern.id).toBe(true);
    }
  });

  it('⚠️ 这条核对抓得住写错的因式', () => {
    // (x−5)(x+5) 是对的;(x−5)(x−5) 不是。
    const wrong = (x: number) => (x - 5) * (x - 5);
    const right = patternOf('x2-25');
    expect(Math.abs(wrong(3) - right.original(3))).toBeGreaterThan(1);
  });

  it('提示词点名的两道都在,而且指出了谁是平方', () => {
    const x2 = patternOf('x2-25');
    expect(x2.bWhy).toContain('25 = 5²');
    expect(x2.factoredTex).toBe('(x - 5)(x + 5)');

    const nine = patternOf('9x2-16');
    expect(nine.aWhy).toContain('9x² = (3x)²');
    expect(nine.bWhy).toContain('16 = 4²');
    expect(nine.factoredTex).toBe('(3x - 4)(3x + 4)');
  });

  it('每道题的 id、题面、因式都互不相同', () => {
    for (const key of ['id', 'tex', 'factoredTex', 'asSquaresTex'] as const) {
      const values = PATTERNS.map((p) => p[key]);
      expect(new Set(values).size, key).toBe(PATTERNS.length);
    }
  });

  it('⭐ 有一道的 b 是变量(49 − y²)—— 不是每次都「常数在后面」', () => {
    const flipped = patternOf('49-y2');
    expect(flipped.aTex).toBe('7');
    expect(flipped.bTex).toBe('y');
    expect(patternHolds('49-y2')).toBe(true);
  });
});

describe('⭐⭐ 分幕:每一幕都是一个数学操作', () => {
  it('五幕,顺序是 Build → Remove → Cut → Rearrange → Factor', () => {
    expect(STAGES.map((s) => s.label)).toEqual(['Build', 'Remove', 'Cut', 'Rearrange', 'Factor']);
    expect(STAGE_COUNT).toBe(5);
  });

  it('⭐ 每一幕绑着一个运算,五个运算互不相同', () => {
    const ops = STAGES.map((s) => s.operation);
    expect(new Set(ops).size).toBe(5);
    expect(ops).toEqual(['multiplication', 'subtraction', 'decomposition', 'rearrangement', 'addition']);
    // 提示词点名的对应关系
    expect(OPERATION_WORDS.subtraction).toContain('remove');
    expect(OPERATION_WORDS.decomposition).toContain('cut');
    expect(OPERATION_WORDS.rearrangement).toContain('move');
    expect(OPERATION_WORDS.addition).toContain('join');
    expect(OPERATION_WORDS.multiplication).toContain('area');
  });

  it('每一幕都有一句说明,而且都不是「记住」', () => {
    for (const stage of STAGES) {
      expect(stage.caption.length, stage.id).toBeGreaterThan(20);
      expect(stage.caption.toLowerCase()).not.toContain('memoriz');
    }
    expect(new Set(STAGES.map((s) => s.caption)).size).toBe(5);
  });

  it('全局进度拆成「第几幕 + 幕内进度」', () => {
    expect(currentIndex(0)).toBe(0);
    expect(localProgress(0)).toBe(0);
    expect(currentIndex(1.4)).toBe(1);
    expect(localProgress(1.4)).toBeCloseTo(0.4, 12);
    expect(currentIndex(4.9)).toBe(4);
    expect(localProgress(4.9)).toBeCloseTo(0.9, 12);
  });

  it('⚠️ 走到终点时停在**最后一幕走完**,不掉进第六幕', () => {
    expect(currentIndex(STAGE_COUNT)).toBe(STAGE_COUNT - 1);
    expect(localProgress(STAGE_COUNT)).toBe(1);
    expect(currentIndex(99)).toBe(STAGE_COUNT - 1);
    expect(localProgress(99)).toBe(1);
    expect(currentIndex(-5)).toBe(0);
    expect(localProgress(-5)).toBe(0);
    expect(currentIndex(Number.NaN)).toBe(0);
    expect(localProgress(Number.NaN)).toBe(0);
  });

  it('⭐⭐ 整数进度读作「已走完几幕」,不是「下一幕刚开始」', () => {
    // 时间轴上是同一个瞬间,必须挑一个。挑「上一幕走完」——
    // 手动一幕一幕点的时候,人要看的是那一幕的**完成态**。
    expect(currentIndex(1)).toBe(0);
    expect(localProgress(1)).toBe(1);
    expect(currentIndex(2)).toBe(1);
    expect(localProgress(2)).toBe(1);
    expect(currentIndex(1.0001)).toBe(1);
    expect(localProgress(1.0001)).toBeCloseTo(0.0001, 9);
    // 一路点 Next 走得完五幕
    const seen = new Set<number>();
    for (let i = 1; i <= STAGE_COUNT; i += 1) seen.add(currentIndex(i));
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it('globalFor 与 currentIndex / localProgress 互逆(幕内,不含边界)', () => {
    for (let i = 0; i < STAGE_COUNT; i += 1) {
      for (const local of [0.25, 0.6, 0.99]) {
        const g = globalFor(i, local);
        expect(currentIndex(g), `${i},${local}`).toBe(i);
        expect(localProgress(g), `${i},${local}`).toBeCloseTo(local, 12);
      }
    }
    expect(globalFor(99)).toBe(STAGE_COUNT - 1);
    expect(globalFor(-3)).toBe(0);
  });

  it('小节切分:边界不漏不重', () => {
    expect(beat(0.2, 0.3, 0.6)).toBe(0);
    expect(beat(0.3, 0.3, 0.6)).toBe(0);
    expect(beat(0.45, 0.3, 0.6)).toBeCloseTo(0.5, 12);
    expect(beat(0.6, 0.3, 0.6)).toBe(1);
    expect(beat(0.9, 0.3, 0.6)).toBe(1);
    expect(beat(Number.NaN, 0.3, 0.6)).toBe(0);
    // 退化区间不产生 NaN
    expect(Number.isFinite(beat(0.5, 0.4, 0.4))).toBe(true);
  });
});

describe('⭐⭐ 等号是结论,不是布景', () => {
  it('第一幕只有 a²,拿掉小正方形之后才有 a² − b²', () => {
    expect(areaTexAt(globalFor(0, 0.1))).toBe('');
    expect(areaTexAt(globalFor(0, 0.9))).toBe('a^2');
    expect(areaTexAt(globalFor(1, 0.2))).toBe('a^2');
    expect(areaTexAt(globalFor(1, 0.95))).toBe('a^2 - b^2');
    expect(areaTexAt(globalFor(2, 0.5))).toBe('a^2 - b^2');
    expect(areaTexAt(globalFor(3, 0.5))).toBe('a^2 - b^2');
  });

  it('⭐ (a−b)(a+b) 要到最后一幕走了一半才出现', () => {
    expect(areaTexAt(globalFor(4, 0.2))).toBe('a^2 - b^2');
    expect(areaTexAt(globalFor(4, 0.6))).toBe('(a - b)(a + b)');
  });

  it('⭐⭐ 等号那一行在**倒数第二幕结束前**一个字都没有', () => {
    for (let i = 0; i < STAGE_COUNT - 1; i += 1) {
      for (const local of [0, 0.5, 0.99]) {
        expect(identityTexAt(globalFor(i, local)), `stage ${i} @ ${local}`).toBe('');
      }
    }
    expect(identityTexAt(globalFor(4, 0.5))).toBe('');
    expect(identityTexAt(globalFor(4, 0.9))).toBe('a^2 - b^2 = (a - b)(a + b)');
    expect(identityTexAt(STAGE_COUNT)).toContain('=');
  });

  it('重排只在第四幕里推进', () => {
    expect(rearrangeProgress(globalFor(0, 1))).toBe(0);
    expect(rearrangeProgress(globalFor(2, 1))).toBe(0);
    expect(rearrangeProgress(globalFor(3, 0))).toBe(0);
    expect(rearrangeProgress(globalFor(3, 0.5))).toBeCloseTo(0.5, 12);
    expect(rearrangeProgress(globalFor(3, 1))).toBe(1);
    expect(rearrangeProgress(globalFor(4, 0.5))).toBe(1);
    expect(rearrangeProgress(STAGE_COUNT)).toBe(1);
  });
});

describe('第一幕:四条边把自己画出来', () => {
  it('四条边首尾相接,围成一个闭合的正方形', () => {
    for (const a of [2, 7, 12]) {
      const edges = edgesOf(a);
      expect(edges).toHaveLength(4);
      for (let i = 0; i < 4; i += 1) {
        const next = edges[(i + 1) % 4]!;
        expect(edges[i]!.to).toEqual(next.from);
      }
      // 周长是 4a
      const perimeter = edges.reduce((sum, e) => sum + Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y), 0);
      expect(perimeter).toBeCloseTo(4 * a, 12);
    }
  });

  it('⭐ 四条边**依次**画出来,不是一起淡入', () => {
    // p = 0.3 时第一条画完、第二条画了一部分、后两条还没开始
    expect(edgeDrawn(0, 0.3)).toBe(1);
    expect(edgeDrawn(1, 0.3)).toBeCloseTo(0.2, 12);
    expect(edgeDrawn(2, 0.3)).toBe(0);
    expect(edgeDrawn(3, 0.3)).toBe(0);
    // p = 1 时四条都画完
    for (let i = 0; i < 4; i += 1) expect(edgeDrawn(i, 1)).toBe(1);
    // p = 0 时一条都没有
    for (let i = 0; i < 4; i += 1) expect(edgeDrawn(i, 0)).toBe(0);
  });

  it('画到一半的终点落在那条边上', () => {
    const [bottom] = edgesOf(10);
    expect(partialEnd(bottom!, 0)).toEqual({ x: 0, y: 0 });
    expect(partialEnd(bottom!, 0.5)).toEqual({ x: 5, y: 0 });
    expect(partialEnd(bottom!, 1)).toEqual({ x: 10, y: 0 });
    // 越界与 NaN 都被夹住
    expect(partialEnd(bottom!, -2)).toEqual({ x: 0, y: 0 });
    expect(partialEnd(bottom!, 9)).toEqual({ x: 10, y: 0 });
    expect(Number.isFinite(partialEnd(bottom!, Number.NaN).x)).toBe(true);
  });
});

describe('尺寸括号', () => {
  it('⭐ 厚度括号从 b **长到** a,而不是直接标一个数', () => {
    const half = thicknessBracket(7, 3, 0.5);
    expect(half.from).toBe(3);
    expect(half.to).toBeCloseTo(5, 12);
    const done = thicknessBracket(7, 3, 1);
    expect(done.from).toBe(3);
    expect(done.to).toBe(7);
    expect(done.to - done.from).toBe(4);
    expect(done.value).toBe(4);
    expect(done.label).toBe('a - b');
    // 起点时长度为零 —— 它是"长出来"的
    expect(thicknessBracket(7, 3, 0).to).toBe(3);
  });

  it('⭐⭐ 长边:a 与 b 两段先分开,再合成一段 a + b', () => {
    const apart = longSideBrackets(7, 3, 0);
    expect(apart).toHaveLength(2);
    expect(apart.map((x) => x.label)).toEqual(['a', 'b']);
    expect(apart[0]!.to).toBe(apart[1]!.from); // 首尾相接
    expect(apart[1]!.to).toBe(10);

    const joined = longSideBrackets(7, 3, 1);
    expect(joined).toHaveLength(1);
    expect(joined[0]!.label).toBe('a + b');
    expect(joined[0]!.value).toBe(10);
    expect(joined[0]!.to - joined[0]!.from).toBe(10);

    // ⚠️ 合并前后**总长度一样** —— 那正是"加法"的意思
    const before = apart.reduce((s, x) => s + (x.to - x.from), 0);
    expect(before).toBe(joined[0]!.to - joined[0]!.from);
  });
});

describe('第三幕:切开只是推开一点点', () => {
  it('那一刀沿 y = b 划过去,长度从 0 长到 a', () => {
    expect(cutLine(7, 3, 0)).toEqual({ from: { x: 0, y: 3 }, to: { x: 0, y: 3 } });
    expect(cutLine(7, 3, 1)).toEqual({ from: { x: 0, y: 3 }, to: { x: 7, y: 3 } });
    expect(cutLine(7, 3, 0.5).to.x).toBeCloseTo(3.5, 12);
    // 刀口始终在 y = b 上
    for (const t of [0, 0.3, 1]) {
      expect(cutLine(7, 3, t).from.y).toBe(3);
      expect(cutLine(7, 3, t).to.y).toBe(3);
    }
  });

  it('⭐ 推开的距离**远小于**重排的位移 —— 两幕不能看起来像同一件事', () => {
    const [top, side] = pieces(7, 3);
    for (const piece of [top, side]) {
      const nudge = cutOffset(piece, 1);
      const nudgeSize = Math.hypot(nudge.x, nudge.y);
      const move = placeAt(piece, 1);
      const start = placeAt(piece, 0);
      const moveSize = Math.hypot(move.centre.x - start.centre.x, move.centre.y - start.centre.y);
      expect(nudgeSize, `${piece.id} 推得太远`).toBeLessThan(moveSize / 2);
      expect(nudgeSize, `${piece.id} 根本没推开`).toBeGreaterThan(0);
    }
  });

  it('推开的偏移被夹在 [0,1],而且 t = 0 时没有偏移', () => {
    const [top] = pieces(7, 3);
    expect(cutOffset(top!, 0)).toEqual({ x: 0, y: 0 });
    expect(cutOffset(top!, -3)).toEqual({ x: 0, y: 0 });
    expect(cutOffset(top!, 9)).toEqual(cutOffset(top!, 1));
    expect(Number.isFinite(cutOffset(top!, Number.NaN).y)).toBe(true);
  });

  it('那句「同样的两块、同样的面积」', () => {
    expect(SAME_PIECES).toContain('SAME PIECES');
    expect(SAME_PIECES).toContain('SAME AREA');
  });
});
