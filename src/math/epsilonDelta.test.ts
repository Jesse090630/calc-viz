/**
 * `epsilonDelta.ts` 的测试。
 *
 * ⭐⭐ 两条判定路径(符号 vs 密集取样)必须在整个 (ε, δ) 网格上一致。
 * ⭐  `δ = ε / 2` 必须**恰好**是分界:比它小成立,比它大失败。
 * ⚠️  只看端点、只看中点的检验必须被抓出来。
 */
import { describe, it, expect } from 'vitest';
import {
  A,
  DELTA_RANGE,
  EPS,
  EPS_LADDER,
  EPS_RANGE,
  L,
  SLOPE,
  clampDelta,
  clampEpsilon,
  f,
  isTightest,
  isTrapped,
  outputReach,
  overshoot,
  requiredDelta,
  sampleLine,
  snap,
  tighten,
  trappedBySampling,
  trappedBySymbols,
} from './epsilonDelta';

const grid = (from: number, to: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => Number((from + ((to - from) * i) / n).toFixed(6)));

describe('⭐ 钉死的那几个值', () => {
  it('f(2) = 5,而这正是 L', () => {
    expect(f(A)).toBe(L);
    expect(L).toBe(5);
  });

  it('ε 的档位就是提示词写的那四个', () => {
    expect(EPS_LADDER).toEqual([1, 0.5, 0.1, 0.01]);
  });

  it('δ = ε / 2', () => {
    for (const e of EPS_LADDER) expect(requiredDelta(e)).toBeCloseTo(e / 2, 12);
    expect(requiredDelta(1)).toBe(0.5);
    expect(requiredDelta(0.01)).toBe(0.005);
  });
});

describe('⭐⭐ 两条独立路径必须一致', () => {
  it('整个 (ε, δ) 网格上都相等', () => {
    for (const e of grid(EPS_RANGE.from, EPS_RANGE.to, 24)) {
      for (const d of grid(DELTA_RANGE.from, DELTA_RANGE.to, 24)) {
        expect(trappedBySampling(e, d), `ε=${e} δ=${d}`).toBe(trappedBySymbols(e, d));
      }
    }
  });

  it('在分界线附近也一致 —— 那是唯一会错的地方', () => {
    for (const e of EPS_LADDER) {
      const need = requiredDelta(e);
      for (const d of [need * 0.99, need, need * 1.01]) {
        expect(trappedBySampling(e, d), `ε=${e} δ=${d}`).toBe(trappedBySymbols(e, d));
      }
    }
  });
});

describe('⭐ δ = ε / 2 恰好是分界', () => {
  it('比它小(或等于)成立,比它大失败', () => {
    for (const e of EPS_LADDER) {
      const need = requiredDelta(e);
      expect(isTrapped(e, need), `ε=${e} 恰好`).toBe(true);
      expect(isTrapped(e, need * 0.5), `ε=${e} 更小`).toBe(true);
      expect(isTrapped(e, need * 1.2), `ε=${e} 更大`).toBe(false);
    }
  });

  it('⚠️ 只看端点会漏掉的情形不存在于线性函数,但只看**中点**会全部放过', () => {
    // 中点是 x = a,那里 |f − L| = 0,永远 < ε —— 只看中点等于什么都没查。
    for (const e of EPS_LADDER) {
      expect(Math.abs(f(A) - L)).toBe(0);
      expect(isTrapped(e, DELTA_RANGE.to)).toBe(false); // 整段判定会拒绝这个大 δ
    }
  });

  it('⚠️⚠️ 取样路径必须是**整段**判定 —— 用一个中间鼓包的函数钉住', () => {
    // 变异测试:把整段扫描换成"只查一个端点",对这条线性函数完全等价,全绿。
    // 但那是错的契约。造一个两端老实、**中间冒出去**的函数:
    //   端点检查会说"没问题",整段检查必须说"跑出去了"。
    const bump = (x: number) => L + 3 * Math.exp(-((x - A) ** 2) / 0.0002);
    expect(Math.abs(bump(A - 0.5) - L)).toBeLessThan(0.01); // 端点看着很老实
    expect(Math.abs(bump(A) - L)).toBeGreaterThan(2); // 中间冒到 3
    expect(trappedBySampling(1, 0.5, 400, bump)).toBe(false);
  });

  it('输出能跑多远 = 2δ,逃出去多少 = 差额', () => {
    expect(outputReach(0.3)).toBeCloseTo(0.6, 12);
    expect(overshoot(1, 0.3)).toBe(0);
    expect(overshoot(0.5, 0.5)).toBeCloseTo(0.5, 12);
    for (const e of EPS_LADDER) expect(overshoot(e, requiredDelta(e))).toBeCloseTo(0, 9);
  });
});

describe('ε 的档位', () => {
  it('每按一次都更紧,到最紧就停住', () => {
    let e = EPS_LADDER[0]!;
    const seen = [e];
    for (let i = 0; i < 6; i += 1) {
      e = tighten(e);
      seen.push(e);
    }
    for (let i = 1; i < seen.length; i += 1) expect(seen[i]!).toBeLessThanOrEqual(seen[i - 1]! + EPS);
    expect(seen[seen.length - 1]!).toBeCloseTo(0.01, 6);
    expect(isTightest(seen[seen.length - 1]!)).toBe(true);
    expect(isTightest(1)).toBe(false);
  });

  it('⭐ 每收紧一档,需要的 δ 也跟着缩 —— 这就是那个游戏', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const e of EPS_LADDER) {
      const need = requiredDelta(e);
      expect(need).toBeLessThan(previous);
      previous = need;
      // 而且**永远找得到** —— 无论 ε 多小
      expect(need).toBeGreaterThan(0);
      expect(isTrapped(e, need)).toBe(true);
    }
  });

  it('⚠️ 最紧那一档需要的 δ 仍然落在可拖范围里', () => {
    // 否则学生在界面上做不到"我能找到 δ",而那正是要他体会的事。
    const need = requiredDelta(EPS_LADDER[EPS_LADDER.length - 1]!);
    expect(need).toBeGreaterThanOrEqual(DELTA_RANGE.from - EPS);
    expect(need).toBeLessThanOrEqual(DELTA_RANGE.to + EPS);
  });
});

describe('夹取与显示', () => {
  it('ε 与 δ 都夹在各自范围内,并落在格点上', () => {
    for (const v of [-5, 0, 0.001, 0.5, 99, Number.NaN]) {
      const e = clampEpsilon(v);
      const d = clampDelta(v);
      expect(e).toBeGreaterThanOrEqual(EPS_RANGE.from - EPS);
      expect(e).toBeLessThanOrEqual(EPS_RANGE.to + EPS);
      expect(d).toBeGreaterThanOrEqual(DELTA_RANGE.from - EPS);
      expect(d).toBeLessThanOrEqual(DELTA_RANGE.to + EPS);
      expect(snap(e)).toBeCloseTo(e, 9);
      expect(snap(d)).toBeCloseTo(d, 9);
    }
  });

  it('每一档 ε 都能被精确表示 —— 否则"ε = 0.01"这句话就不诚实', () => {
    for (const e of EPS_LADDER) expect(clampEpsilon(e)).toBeCloseTo(e, 9);
  });

  it('直线取样两端点都在视野内', () => {
    const pts = sampleLine();
    expect(pts.length).toBeGreaterThanOrEqual(2);
    for (const p of pts) expect(p.y).toBeCloseTo(SLOPE * p.x + 1, 12);
  });
});
