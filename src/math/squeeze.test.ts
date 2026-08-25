/**
 * `squeeze.ts` 的测试。
 *
 * ⭐⭐ 两条核心:
 * ① 整段上 `g ≤ f ≤ h` —— 而且必须用**足够密**的取样去查,
 *    摆动是 5/x,稀疏取样会碰巧全过;
 * ② 结论是**推出来的**:`squeezedLimit` 不看 f 的任何一个值。
 */
import { describe, it, expect } from 'vitest';
import {
  A, EPS, L, MIN_GAP, VIEW, WIGGLE,
  boundsConverge, clampScan, gapAt, halveDistance, lower, middle,
  read, sampleBound, sampleMiddle, showY, squeezedLimit,
  trappedBySampling, trappedBySymbols, upper,
} from './squeeze';

describe('⭐⭐ 处处夹住', () => {
  it('两条路径都说夹住了', () => {
    expect(trappedBySymbols()).toBe(true);
    expect(trappedBySampling()).toBe(true);
  });

  it('⚠️ 用**很密**的取样再查一遍 —— 摆动频率是 5/x,稀疏取样会碰巧全过', () => {
    expect(trappedBySampling(-0.2, 0.2, 20000)).toBe(true);
    expect(trappedBySampling(-0.02, 0.02, 20000)).toBe(true);
  });

  it('⚠️⚠️ 取样必须够密才**抓得住**越界 —— 用一个只在窄区间里冒头的函数钉住', () => {
    // 变异测试:把默认取样数从 4000 砍到 20,全绿 —— 因为这条 f 本来就处处夹住,
    // 稀疏取样也不会失败。检查的价值在于"抓得住违规",所以注入一个会违规的函数。
    const sneaky = (x: number) =>
      Math.abs(x - 0.5) < 0.002 ? upper(x) + 0.5 : middle(x);
    expect(trappedBySampling(VIEW.from, VIEW.to, 20, sneaky), '稀疏取样漏掉了').toBe(true);
    // ⚠️ 用 `undefined` 走**默认**取样数 —— 否则把默认值改小,这条测试照样绿。
    expect(trappedBySampling(VIEW.from, VIEW.to, undefined, sneaky), '默认取样数必须够密').toBe(false);
  });

  it('中间那条确实**碰得到**两条边界 —— 否则"夹"就是空话', () => {
    // sin(5/x) = ±1 时 f 正好落在 h 或 g 上。找几个这样的 x。
    let touchedUpper = false;
    let touchedLower = false;
    for (let i = 1; i < 4000; i += 1) {
      const x = 0.9 * (i / 4000);
      const f = middle(x)!;
      if (Math.abs(f - upper(x)) < 1e-6) touchedUpper = true;
      if (Math.abs(f - lower(x)) < 1e-6) touchedLower = true;
    }
    expect(touchedUpper).toBe(true);
    expect(touchedLower).toBe(true);
  });

  it('⚠️ 中间那条**看不出趋势** —— 它在任意小的区间里都上上下下', () => {
    // 这正是需要夹逼的理由。挑一个很小的区间,数一数符号变了几次。
    let flips = 0;
    let previous = Math.sign(middle(0.02)! - L);
    for (let i = 1; i <= 2000; i += 1) {
      const x = 0.02 - (0.019 * i) / 2000;
      const s = Math.sign(middle(x)! - L);
      if (s !== 0 && s !== previous) { flips += 1; previous = s; }
    }
    expect(flips).toBeGreaterThan(5);
  });
});

describe('⭐ 边界与结论', () => {
  it('两条边界都收到 L', () => {
    expect(boundsConverge()).toBe(true);
    expect(lower(0)).toBe(L);
    expect(upper(0)).toBe(L);
  });

  it('空隙 = 2x²,越靠近越小,而且**永远为正**', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const x of [1, 0.5, 0.1, 0.01, 0.001]) {
      expect(gapAt(x)).toBeCloseTo(2 * x * x, 12);
      expect(gapAt(x)).toBeLessThan(previous);
      expect(gapAt(x)).toBeGreaterThan(0);
      previous = gapAt(x);
    }
  });

  it('⭐ 结论不看 f 的值 —— `squeezedLimit` 一个参数都不接', () => {
    expect(squeezedLimit.length).toBe(0);
    expect(squeezedLimit()).toBe(L);
  });
});

describe('中间那条在 a 处没有定义', () => {
  it('返回 null,不返回 NaN', () => {
    expect(middle(0)).toBeNull();
    expect(showY(middle(0))).toBe('undefined');
    expect(showY(middle(0))).not.toContain('NaN');
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) expect(middle(bad)).toBeNull();
  });

  it('但夹逼定理**不要求**它在 a 处有定义', () => {
    expect(middle(A)).toBeNull();
    expect(squeezedLimit()).toBe(L);
  });
});

describe('扫描线', () => {
  it('永远到不了 a,也不出视野', () => {
    for (const x of [-99, -1e-6, 0, 1e-6, 99, Number.NaN]) {
      const c = clampScan(x);
      expect(Math.abs(c)).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
      expect(c).toBeGreaterThanOrEqual(VIEW.from - EPS);
      expect(c).toBeLessThanOrEqual(VIEW.to + EPS);
    }
  });

  it('「减半」每次更近,但停在最近一档', () => {
    let x = 1;
    let previous = Number.POSITIVE_INFINITY;
    for (let i = 0; i < 15; i += 1) {
      x = halveDistance(x);
      expect(Math.abs(x)).toBeLessThanOrEqual(previous + EPS);
      previous = Math.abs(x);
    }
    expect(Math.abs(x)).toBeGreaterThanOrEqual(MIN_GAP - 1e-9);
  });

  it('读数在整个行程上都保持 g ≤ f ≤ h', () => {
    for (let x = VIEW.from; x <= VIEW.to; x += 0.001) {
      const r = read(x);
      expect(r.ordered, `x = ${r.x}`).toBe(true);
      expect(r.g).toBeLessThanOrEqual(r.h);
      if (r.f !== null) expect(Number.isFinite(r.f)).toBe(true);
    }
  });
});

describe('取样', () => {
  it('⚠️ 中间那条靠近 0 的地方取样要**加密** —— 否则画出来是噪声', () => {
    const pts = sampleMiddle();
    const near = pts.filter((p) => Math.abs(p.x) < 0.1).length;
    const far = pts.filter((p) => Math.abs(p.x) > 0.5).length;
    expect(near, '靠近 0 的取样点太少').toBeGreaterThan(far);
  });

  it('两条边界的取样都是有限值', () => {
    for (const which of ['lower', 'upper'] as const) {
      for (const p of sampleBound(which)) expect(Number.isFinite(p.y)).toBe(true);
    }
  });

  it('摆动频率大到看得出来', () => {
    expect(WIGGLE).toBeGreaterThanOrEqual(3);
  });
});
