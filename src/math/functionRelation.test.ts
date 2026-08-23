/**
 * `functionRelation.ts` 的测试。
 *
 * ⚠️ 这一节唯一会做错的地方是那个**不对称**,而且学生和实现者都容易记反:
 *   一个输入 → 两个输出   ✗
 *   两个输入 → 一个输出   ✓
 * 所以每一组都**成对**断言。只测前者的话,一个"看到任何重复就拒绝"的
 * 错误实现照样全绿 —— 而那个实现会把最重要的教学案例判反。
 */
import { describe, it, expect } from 'vitest';
import {
  CURVES,
  MACHINE,
  MACHINE_DOMAIN,
  RELATIONS,
  curveBranches,
  hasSharedOutput,
  intersectionCountByRoots,
  isFunctionByCounting,
  isFunctionByGrouping,
  machineInputs,
  offendingInput,
  outputsOf,
  showInt,
  showValue,
} from './functionRelation';

describe('⭐ Part 1:机器给出提示词里的那三对', () => {
  it('2 → 5', () => expect(MACHINE.at(2)).toBe(5));
  it('3 → 7', () => expect(MACHINE.at(3)).toBe(7));
  it('4 → 9', () => expect(MACHINE.at(4)).toBe(9));

  it('每个输入**只有一个**输出 —— 同一个 x 问两次答案相同', () => {
    for (const x of machineInputs()) {
      expect(MACHINE.at(x)).toBe(MACHINE.at(x));
    }
  });

  it('输入档位是整数,读数才干净', () => {
    for (const x of machineInputs()) expect(Number.isInteger(x)).toBe(true);
    expect(machineInputs()[0]).toBe(MACHINE_DOMAIN.a);
    expect(machineInputs()[machineInputs().length - 1]).toBe(MACHINE_DOMAIN.b);
  });

  it('遍历整个行程都不产生 NaN', () => {
    for (const x of machineInputs()) expect(Number.isFinite(MACHINE.at(x))).toBe(true);
  });
});

describe('⭐⭐ Part 2:那个不对称 —— 这一节的全部重量', () => {
  const split = RELATIONS.find((r) => r.id === 'split')!;
  const shared = RELATIONS.find((r) => r.id === 'shared')!;

  it('一个输入配两个输出 → **不是**函数', () => {
    expect(isFunctionByGrouping(split.pairs)).toBe(false);
  });

  it('两个输入共用一个输出 → **仍然是**函数', () => {
    expect(isFunctionByGrouping(shared.pairs)).toBe(true);
  });

  it('⚠️ 而且那个"仍然是函数"的例子里确实存在共享 —— 否则它没测到东西', () => {
    expect(hasSharedOutput(shared.pairs)).toBe(true);
  });

  it('⚠️ 共享输出与"是不是函数"完全无关', () => {
    // 这两件事必须能独立取值,否则说明实现把它们绑在了一起
    expect(hasSharedOutput(shared.pairs)).toBe(true);
    expect(isFunctionByGrouping(shared.pairs)).toBe(true);
    expect(hasSharedOutput(split.pairs)).toBe(false);
    expect(isFunctionByGrouping(split.pairs)).toBe(false);
  });

  it('同一个输入配**相同**的输出重复出现,不算违规', () => {
    const repeated = [
      { input: 1, output: 4 },
      { input: 1, output: 4 },
      { input: 2, output: 5 },
    ];
    expect(isFunctionByGrouping(repeated)).toBe(true);
    expect(isFunctionByCounting(repeated)).toBe(true);
  });
});

describe('⭐ 两条独立判定路径必须一致', () => {
  // 路径 A 按输入分组比较;路径 B 只数去重后的个数,不分组也不记忆。
  for (const relation of RELATIONS) {
    it(`${relation.id}:分组判定与计数判定一致,且等于声明的答案`, () => {
      expect(isFunctionByGrouping(relation.pairs)).toBe(relation.expected);
      expect(isFunctionByCounting(relation.pairs)).toBe(relation.expected);
    });
  }

  it('在一批随机关系上两条路径也一致', () => {
    // 固定种子的伪随机,测试要可复现
    let seed = 7;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let trial = 0; trial < 300; trial += 1) {
      const pairs = Array.from({ length: 1 + Math.floor(next() * 5) }, () => ({
        input: Math.floor(next() * 4),
        output: Math.floor(next() * 4),
      }));
      expect(isFunctionByCounting(pairs), JSON.stringify(pairs)).toBe(isFunctionByGrouping(pairs));
    }
  });

  it('空关系与单对关系都是函数', () => {
    expect(isFunctionByGrouping([])).toBe(true);
    expect(isFunctionByCounting([])).toBe(true);
    expect(isFunctionByGrouping([{ input: 1, output: 1 }])).toBe(true);
  });
});

describe('要标红的那个输入', () => {
  it('split 关系里出问题的是输入 1', () => {
    const split = RELATIONS.find((r) => r.id === 'split')!;
    expect(offendingInput(split.pairs)).toBe(1);
    expect(outputsOf(split.pairs, 1)).toEqual([4, 7]);
  });

  it('是函数时没有要标红的输入', () => {
    for (const r of RELATIONS.filter((r) => r.expected)) {
      expect(offendingInput(r.pairs)).toBeNull();
    }
  });

  it('offendingInput 与 isFunction 永远自洽', () => {
    for (const r of RELATIONS) {
      expect(offendingInput(r.pairs) === null).toBe(isFunctionByGrouping(r.pairs));
    }
  });

  // ⚠️ 变异测试逼出来的:把 `offendingInput` 改成"只要输入重复就返回它",
  // 原本的测试**全部还是绿的** —— 因为我从没拿"同一输入配相同输出"的关系问过它。
  // 那个实现会在一个完全合法的关系上把箭头标红,是界面上看得见的错。
  it('⚠️ 同一个输入配**相同**输出重复出现时,没有要标红的输入', () => {
    const repeated = [
      { input: 1, output: 4 },
      { input: 1, output: 4 },
      { input: 2, output: 5 },
    ];
    expect(isFunctionByGrouping(repeated)).toBe(true);
    expect(offendingInput(repeated), '合法关系被标红了').toBeNull();
  });

  it('只有输出真的不同才算违规', () => {
    expect(offendingInput([{ input: 3, output: 9 }, { input: 3, output: 9 }])).toBeNull();
    expect(offendingInput([{ input: 3, output: 9 }, { input: 3, output: 8 }])).toBe(3);
  });

  it('那个输入身上确实挂着两个**不同**的输出', () => {
    const split = RELATIONS.find((r) => r.id === 'split')!;
    const outs = outputsOf(split.pairs, offendingInput(split.pairs)!);
    expect(outs.length).toBeGreaterThanOrEqual(2);
    expect(new Set(outs).size).toBe(outs.length);
  });
});

describe('⭐ Part 3:垂线测试', () => {
  const parabola = CURVES.find((c) => c.id === 'parabola')!;
  const sideways = CURVES.find((c) => c.id === 'sideways')!;

  it('y = x² 上任何垂线都只交 1 次', () => {
    for (let i = -30; i <= 30; i += 1) {
      expect(parabola.yAt(i / 10).length, `x=${i / 10}`).toBe(1);
    }
  });

  it('x = y² 在 x > 0 处交 2 次', () => {
    for (const x of [0.1, 0.5, 1, 2.5, 4]) expect(sideways.yAt(x).length, `x=${x}`).toBe(2);
  });

  it('x < 0 处不相交', () => {
    for (const x of [-0.1, -1, -3]) expect(sideways.yAt(x).length, `x=${x}`).toBe(0);
  });

  it('⚠️ x = 0 处两支重合,是 **1** 个交点不是 2 个', () => {
    // 这个点正是"从 0 个变成 2 个"的分界。报成 2 会让"什么时候开始有两个"讲不清。
    expect(sideways.yAt(0).length).toBe(1);
    expect(sideways.yAt(0)[0]).toBe(0);
  });

  it('⭐ 两条独立路径一致:枚举分支 vs 数实根', () => {
    for (const curve of CURVES) {
      for (let i = -30; i <= 40; i += 1) {
        const x = i / 10;
        expect(curve.yAt(x).length, `${curve.id} x=${x}`).toBe(
          intersectionCountByRoots(curve.id, x),
        );
      }
    }
  });

  it('声明的 isFunction 与"存在某个 x 交点多于 1"一致', () => {
    for (const curve of CURVES) {
      let maxHits = 0;
      for (let i = -30; i <= 40; i += 1) maxHits = Math.max(maxHits, curve.yAt(i / 10).length);
      expect(maxHits <= 1).toBe(curve.isFunction);
    }
  });

  it('返回的 y 值都是有限的,不含 NaN', () => {
    for (const curve of CURVES) {
      for (let i = -30; i <= 40; i += 1) {
        for (const y of curve.yAt(i / 10)) expect(Number.isFinite(y)).toBe(true);
      }
    }
  });

  it('非有限输入返回空数组而不是崩', () => {
    for (const curve of CURVES) {
      expect(curve.yAt(Number.NaN)).toHaveLength(0);
      expect(intersectionCountByRoots(curve.id, Number.NaN)).toBe(0);
    }
  });
});

describe('画曲线用的分支', () => {
  it('y = x² 只有一支', () => {
    expect(curveBranches(CURVES[0]!, -3, 3, 40)).toHaveLength(1);
  });

  it('x = y² 有两支,且都不含 NaN', () => {
    const branches = curveBranches(CURVES[1]!, -3, 4, 40);
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      expect(branch.length).toBeGreaterThan(2);
      for (const p of branch) expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('x = y² 的两支在 x = 0 处汇合', () => {
    const [upper, lower] = curveBranches(CURVES[1]!, 0, 4, 40);
    expect(upper![0]!.y).toBeCloseTo(0, 12);
    expect(lower![0]!.y).toBeCloseTo(0, 12);
  });

  it('两支上下对称', () => {
    const [upper, lower] = curveBranches(CURVES[1]!, 0, 4, 20);
    for (let i = 0; i < upper!.length; i += 1) {
      expect(lower![i]!.y).toBeCloseTo(-upper![i]!.y, 12);
      expect(lower![i]!.x).toBeCloseTo(upper![i]!.x, 12);
    }
  });

  it('分支上的点确实落在曲线上', () => {
    for (const branch of curveBranches(CURVES[1]!, 0, 4, 30)) {
      for (const p of branch) expect(p.y * p.y).toBeCloseTo(p.x, 9);
    }
  });
});

describe('显示', () => {
  it('不产生 -0.00', () => expect(showValue(-0.001)).toBe('0.00'));
  it('整数不带小数点', () => expect(showInt(-2)).toBe('-2'));
  it('非有限值给出破折号而不是 NaN', () => {
    expect(showValue(Number.NaN)).toBe('—');
    expect(showInt(Number.NaN)).toBe('—');
  });
});
