/**
 * 相关变化率的测试。
 *
 * 重心:
 *   ① 闭形式(对关系式求导)与**时间上的数值差商**一致 —— 两条互不相干的路径;
 *   ② 梯子那个失效点上诚实地报 null,而且"发散"是**构造**出来的,不是看着像;
 *   ③ 每个随时间变的量都挂上自己的率,常数项不挂。
 */
import { describe, expect, it } from 'vitest';
import {
  SCENARIOS,
  clampT,
  constantTerms,
  isValid,
  pathsAgree,
  rateNumeric,
  scenarioOf,
  show,
  terms,
  timeExceeding,
  timeLeft,
  type Scenario,
} from './relatedRates';

describe('⭐ 手算对得上', () => {
  it('梯子:x = 3 时 y = 4,dy/dt = −(3/4)(0.6) = −0.45', () => {
    const s = scenarioOf('ladder');
    // x(t) = 1 + 0.6t,所以 x = 3 对应 t = 10/3
    const t = 10 / 3;
    expect(s.driverAt(t)).toBeCloseTo(3, 12);
    expect(s.trackedAt(t)!).toBeCloseTo(4, 12);
    expect(s.rateExact(t)!).toBeCloseTo(-0.45, 10);
  });

  it('⭐ 顶端下落**快过**梯脚外移 —— x > y 时必然如此', () => {
    const s = scenarioOf('ladder');
    const t = 10 / 3 + 2;                 // x = 5·… 再往后一点,x > y
    expect(s.driverAt(t)).toBeGreaterThan(s.trackedAt(t)!);
    expect(Math.abs(s.rateExact(t)!)).toBeGreaterThan(Math.abs(s.givenRate));
  });

  it('气球:r = 2 时 dr/dt = 3/(4π·4)', () => {
    const s = scenarioOf('balloon');
    // 找到 r = 2 对应的 t
    const target = (4 / 3) * Math.PI * 8;
    const t = (target - s.driverAt(0)) / 3;
    expect(s.trackedAt(t)!).toBeCloseTo(2, 8);
    expect(s.rateExact(t)!).toBeCloseTo(3 / (4 * Math.PI * 4), 8);
  });

  it('涟漪:r = 3 时 dA/dt = 2π·3·0.4', () => {
    const s = scenarioOf('circle');
    const t = (3 - 1) / 0.4;
    expect(s.driverAt(t)).toBeCloseTo(3, 12);
    expect(s.rateExact(t)).toBeCloseTo(2 * Math.PI * 3 * 0.4, 10);
  });
});

describe('⭐⭐ 两条独立路径必须一致', () => {
  /**
   * 路径 ① 是对关系式求导得到的闭形式;
   * 路径 ② 直接对被追踪量做时间上的中心差商,**完全不碰关系式**。
   */
  it('每个情景、整段有效区间上都一致', () => {
    let checked = 0;
    for (const s of SCENARIOS) {
      const [lo, hi] = s.tRange;
      const top = s.breaksAt === null ? hi : s.breaksAt - 0.25;   // 失效点附近差商会爆
      for (let t = lo + 0.1; t <= top; t += 0.2) {
        if (!isValid(s, t)) continue;
        expect(pathsAgree(s, t), `${s.id} t=${t.toFixed(2)}`).toBe(true);
        checked += 1;
      }
    }
    expect(checked, '一条都没比到,这个测试是空跑').toBeGreaterThan(60);
  });

  it('⭐ 而两条路径确实是**不同的算法** —— 数值那条在失效点外拿不到值', () => {
    const s = scenarioOf('ladder');
    const past = s.breaksAt! + 0.5;
    expect(s.rateExact(past)).toBeNull();
    expect(rateNumeric(s, past)).toBeNull();
  });
});

describe('⭐⭐ 梯子那个失效:模型的边界,不是世界的边界', () => {
  const s = scenarioOf('ladder');

  it('失效点之后,两个量都报 null 而不是 NaN', () => {
    const past = s.breaksAt! + 0.1;
    expect(s.trackedAt(past)).toBeNull();
    expect(s.rateExact(past)).toBeNull();
    expect(isValid(s, past)).toBe(false);
  });

  it('失效点恰好是 y = 0 那一刻', () => {
    expect(s.breaksAt).toBeCloseTo((5 - 1) / 0.6, 10);
    expect(s.driverAt(s.breaksAt!)).toBeCloseTo(5, 8);   // x = L
    expect(s.trackedAt(s.breaksAt!)).toBeNull();         // y = 0 → 已经越界
  });

  it('⭐ 给任意一个界,都能**构造**出一个超过它的时刻 —— 这才叫发散', () => {
    for (const bound of [10, 100, 5000]) {
      const t = timeExceeding(s, bound);
      expect(t, `界 ${bound} 找不到超过它的时刻`).not.toBeNull();
      expect(Math.abs(s.rateExact(t!)!), `界 ${bound}`).toBeGreaterThan(bound);
      expect(t!).toBeLessThan(s.breaksAt!);
    }
  });

  it('⭐ 越靠近失效点,率只增不减', () => {
    let previous = 0;
    for (const frac of [0.5, 0.8, 0.95, 0.99, 0.999]) {
      const t = s.breaksAt! * frac;
      const r = Math.abs(s.rateExact(t)!);
      expect(r, `frac=${frac}`).toBeGreaterThan(previous);
      previous = r;
    }
  });

  it('⭐ 而不会失效的那两个情景,`breaksAt` 是 null、`timeExceeding` 也是 null', () => {
    const safe = SCENARIOS.filter((x) => x.breaksAt === null);
    expect(safe.length, '一个不失效的情景都没有,对照就没了').toBeGreaterThan(0);
    for (const x of safe) {
      expect(timeExceeding(x, 10)).toBeNull();
      // 整段区间上都算得动
      for (let t = x.tRange[0]; t <= x.tRange[1]; t += 0.5) {
        expect(isValid(x, t), `${x.id} t=${t}`).toBe(true);
      }
    }
  });

  it('⭐ 会失效的那个,`breakNote` 必须真的解释了原因', () => {
    expect(s.breakNote.length).toBeGreaterThan(80);
    expect(s.breakNote.toLowerCase()).toContain('model');
    // 而不失效的那些不该有多余的话
    for (const x of SCENARIOS.filter((y) => y.breaksAt === null)) {
      expect(x.breakNote).toBe('');
    }
  });
});

describe('⭐⭐ 每个随时间变的量都挂上自己的率', () => {
  it('梯子里**恰好有一项**是常数(梯长),别的都挂率', () => {
    const s = scenarioOf('ladder');
    expect(constantTerms(s)).toBe(1);
    expect(terms(s).filter((t) => t.carriesRate).length).toBe(2);
  });

  it('⭐ 挂率的项,展开式里必须真的出现 d…/dt;不挂的必须没有', () => {
    for (const s of SCENARIOS) {
      for (const term of terms(s)) {
        const hasRate = /\\frac\{d[A-Za-z]+\}\{dt\}/.test(term.afterTex);
        expect(hasRate, `${s.id} / ${term.beforeTex} 的 carriesRate 与展开式对不上`)
          .toBe(term.carriesRate);
      }
    }
  });

  it('每一项都写了理由', () => {
    for (const s of SCENARIOS) {
      for (const term of terms(s)) {
        expect(term.why.length, `${s.id} / ${term.beforeTex}`).toBeGreaterThan(20);
      }
    }
  });

  it('⭐ 气球与涟漪里没有常数项 —— 两边都在动', () => {
    for (const id of ['balloon', 'circle']) {
      expect(constantTerms(scenarioOf(id)), id).toBe(0);
    }
  });
});

describe('取值与边界', () => {
  it('clampT 夹在这个情景自己的范围里', () => {
    const s = scenarioOf('ladder');
    expect(clampT(s, -5)).toBe(s.tRange[0]);
    expect(clampT(s, 99)).toBe(s.tRange[1]);
    expect(clampT(s, Number.NaN)).toBe(s.startT);
  });

  it('scenarioOf 认不出的 id 回落到第一个', () => {
    expect(scenarioOf('nope')).toBe(SCENARIOS[0]);
  });

  it('每个情景的起始时刻都是有效的 —— 否则一打开就是空的', () => {
    for (const s of SCENARIOS) {
      expect(isValid(s, s.startT), s.id).toBe(true);
      expect(s.rateExact(s.startT), s.id).not.toBeNull();
    }
  });

  it('show(null) 与 show(Infinity) 都是 "undefined"', () => {
    expect(show(null)).toBe('undefined');
    expect(show(Number.POSITIVE_INFINITY)).toBe('undefined');
    expect(show(-0.45)).not.toBe('undefined');
  });

  it('rateNumeric 在踩出有效区间时返回 null', () => {
    const s = scenarioOf('ladder');
    expect(rateNumeric(s, s.breaksAt! + 1)).toBeNull();
  });
});

describe('⭐⭐ 变异测试逼出来的三个洞', () => {
  it('⭐ pathsAgree 必须会说"不" —— 原来一条否定断言都没有', () => {
    /**
     * ⚠️ 把 `pathsAgree` 改成恒真、或把容差放松一百万倍,原来全部测试**照样绿** ——
     * 因为从来没有一个案例是"两条路径应该对不上"的。
     * 和隐函数那一课的 `isOnCurve` 是同一个毛病:**只验证肯定,不验证否定**。
     * 这里造一个故意算错的情景,让它必须被判为不一致。
     */
    const good = scenarioOf('circle');
    const wrong: Scenario = {
      ...good,
      id: 'deliberately-wrong',
      // 少乘一个 2 —— 正是最常见的那种错
      rateExact: (t) => Math.PI * (1 + 0.4 * t) * 0.4,
    };
    expect(pathsAgree(good, 3), '对的那个应该一致').toBe(true);
    expect(pathsAgree(wrong, 3), '错的那个居然也算一致').toBe(false);
  });

  it('⭐ 而且容差要够紧 —— 差一倍必须判不一致', () => {
    const good = scenarioOf('circle');
    const off = good.rateExact(3)!;
    const doubled: Scenario = { ...good, id: 'doubled', rateExact: () => off * 2 };
    expect(pathsAgree(doubled, 3)).toBe(false);
    // 而只差 1e-9 的相对量,应当仍然算一致
    const nudged: Scenario = { ...good, id: 'nudged', rateExact: () => off * (1 + 1e-9) };
    expect(pathsAgree(nudged, 3)).toBe(true);
  });

  it('⭐ timeExceeding 返回的时刻要**严格**超过界,不是刚好等于', () => {
    /**
     * ⚠️ 闭形式反解出来的 t 恰好让 |率| **等于** 界。
     * 如果直接把它返回,`> bound` 就只能靠浮点误差碰运气 ——
     * 那个变异正是这么活下来的。所以实现里要往里挪一点点,
     * 而这条测试用一个**留有余量**的判据把它钉死。
     */
    const s = scenarioOf('ladder');
    for (const bound of [10, 100, 5000]) {
      const t = timeExceeding(s, bound)!;
      expect(t).not.toBeNull();
      // 实现里解的是 bound·(1+1e-3),所以余量是确定的,不是碰运气
      expect(Math.abs(s.rateExact(t)!), `界 ${bound} 只是刚好碰到,没有真正超过`)
        .toBeGreaterThan(bound * 1.0005);
    }
  });

  it('⭐ 反解公式本身对不对 —— 在那个 t 上,率应当**正好**是界', () => {
    const s = scenarioOf('ladder');
    for (const bound of [10, 100, 5000]) {
      const raw = s.timeForRate!(bound)!;
      // ⚠️ 用**相对**误差判。bound = 5000 时,toBeCloseTo(…, 6) 要求绝对误差 5e-7,
      //    对一个五千量级的数来说那是苛求浮点做不到的事 —— 又一次"阈值凭手感"。
      const rel = Math.abs(Math.abs(s.rateExact(raw)!) - bound) / bound;
      expect(rel, `界 ${bound} 的反解不准(相对误差 ${rel})`).toBeLessThan(1e-8);
    }
  });
});

describe('⭐⭐ 失效状态必须**点得到** —— 防死界面', () => {
  /**
   * ⚠️ 第一版 `tRange` 的上界是 6.6,而失效点在 6.667 —— 滑块永远到不了。
   * 于是那段"模型的边界到了"的画面和文案成了**谁也点不到的死界面**,
   * 而所有测试照样绿(它们直接调函数,不受滑块范围限制)。
   * 和链式法则那一课的 FLAT_WARNING 犯的是同一个错:
   * **写了一段诚实的内容,却没给它一条到达的路。**
   */
  it('会失效的情景,滑块范围必须越过失效点', () => {
    for (const s of SCENARIOS) {
      if (s.breaksAt === null) continue;
      expect(s.tRange[1], `${s.id} 的滑块到不了失效点 ${s.breaksAt}`).toBeGreaterThan(s.breaksAt);
    }
  });

  it('⭐ 而且范围内**确实存在**一个失效的 t —— 不只是数字上越过', () => {
    const s = scenarioOf('ladder');
    const past = (s.breaksAt! + s.tRange[1]) / 2;
    expect(past).toBeLessThanOrEqual(s.tRange[1]);
    expect(isValid(s, past), '范围内找不到一个真正失效的时刻').toBe(false);
    expect(s.trackedAt(past)).toBeNull();
  });

  it('⭐ 同时范围内也要有足够多**有效**的时刻 —— 别矫枉过正', () => {
    const s = scenarioOf('ladder');
    let good = 0;
    for (let t = s.tRange[0]; t <= s.tRange[1]; t += 0.1) if (isValid(s, t)) good += 1;
    expect(good, '有效时刻太少,这一课就只剩失效画面了').toBeGreaterThan(30);
  });
});

describe('⭐⭐ 「跳到率超过 1000」这个按钮必须**说到做到**', () => {
  /**
   * ⚠️ 第一版 `clampT` 四舍五入到三位小数,把 t ≈ 6.66666 变成 6.667 ——
   * 越过了失效点 6.66667。按钮承诺巨大的数字,屏幕却显示"模型的边界到了"。
   * 界面上按下去会发生什么,测试就得按下去一次。
   */
  it('按钮给的时刻,经过 clampT 之后仍然有效', () => {
    for (const s of SCENARIOS) {
      const t = timeExceeding(s, 1000);
      if (t === null) continue;
      const landed = clampT(s, t);          // ⭐ 界面正是这样用的
      expect(isValid(s, landed), `${s.id}: 跳过去就失效了`).toBe(true);
      expect(Math.abs(s.rateExact(landed)!), `${s.id}: 跳过去率没超过 1000`).toBeGreaterThan(1000);
    }
  });

  it('⭐ 而且那个时刻在滑块范围之内 —— 否则按钮把人送出界', () => {
    for (const s of SCENARIOS) {
      const t = timeExceeding(s, 1000);
      if (t === null) continue;
      expect(t).toBeGreaterThanOrEqual(s.tRange[0]);
      expect(t).toBeLessThanOrEqual(s.tRange[1]);
    }
  });

  it('⭐ 更高的界要跳得更靠近失效点 —— 不是随便返回同一个数', () => {
    const s = scenarioOf('ladder');
    const a = timeExceeding(s, 1e3)!;
    const b = timeExceeding(s, 1e5)!;
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(s.breaksAt!);
  });
});

describe('剩余时间 —— 让爆炸看得见来路', () => {
  it('有效时为正,失效后为 null', () => {
    const s = scenarioOf('ladder');
    expect(timeLeft(s, 3)).toBeCloseTo(s.breaksAt! - 3, 9);
    expect(timeLeft(s, 7.2)).toBeNull();
    expect(timeLeft(s, s.breaksAt!)).toBeNull();
  });

  it('不会失效的情景没有剩余时间可言', () => {
    expect(timeLeft(scenarioOf('balloon'), 3)).toBeNull();
  });

  it('⭐ 率大约正比于 1/剩余时间 —— 间隙缩到十分之一,率涨约十倍', () => {
    const s = scenarioOf('ladder');
    const near1 = s.breaksAt! - 1e-4;
    const near2 = s.breaksAt! - 1e-6;          // 间隙是前者的百分之一
    const r1 = Math.abs(s.rateExact(near1)!);
    const r2 = Math.abs(s.rateExact(near2)!);
    // y ∝ √间隙,率 ∝ 1/y ⇒ 间隙 ÷100 时率 ×10
    expect(r2 / r1).toBeGreaterThan(9);
    expect(r2 / r1).toBeLessThan(11);
  });
});
