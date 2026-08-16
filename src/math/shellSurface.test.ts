import { describe, it, expect } from 'vitest';
import {
  shellSurfacePoint,
  sweptArcLength,
  midRadius,
  unrollYaw,
  unrollShiftX,
  type ShellSurfaceSpec,
  type Vec3,
} from './shellSurface';

// pilot 的具体壳:x0 = 1.2, Δx = 0.3, h = f(1.2) = 2.56
const SPEC: ShellSurfaceSpec = { rIn: 1.05, rOut: 1.35, height: 2.56, thetaMax: 2 * Math.PI, bend: 1 };

const dist = (a: Vec3, b: Vec3): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const radiusFromAxis = (p: Vec3): number => Math.hypot(p.x, p.z);

describe('卷起状态(bend = 1)', () => {
  it('① 外壁处处距 y 轴 rOut,内壁处处 rIn', () => {
    for (let i = 0; i <= 96; i++) {
      const u = i / 96;
      expect(radiusFromAxis(shellSurfacePoint(u, 0.5, 1, SPEC))).toBeCloseTo(SPEC.rOut, 12);
      expect(radiusFromAxis(shellSurfacePoint(u, 0.5, 0, SPEC))).toBeCloseTo(SPEC.rIn, 12);
    }
  });

  it('② 起点 u = 0 落在 +x 轴上 —— 必须与二维那根矩形同位置,否则扫掠动画会瞬移', () => {
    const p = shellSurfacePoint(0, 0.5, 1, SPEC);
    expect(p.x).toBeCloseTo(SPEC.rOut, 12);
    expect(p.z).toBeCloseTo(0, 12);
  });

  it('③ 高度沿 v 线性,底在 y = 0,顶在 y = height', () => {
    expect(shellSurfacePoint(0.3, 0, 1, SPEC).y).toBeCloseTo(0, 12);
    expect(shellSurfacePoint(0.3, 1, 1, SPEC).y).toBeCloseTo(SPEC.height, 12);
  });
});

describe('扫掠动画(thetaMax: 0 → 2π)', () => {
  it('④ 整个过程中外壁半径恒为 rOut(不许一边转一边胀)', () => {
    for (let k = 1; k <= 100; k++) {
      const spec = { ...SPEC, thetaMax: (2 * Math.PI * k) / 100 };
      for (let i = 0; i <= 32; i++) {
        expect(radiusFromAxis(shellSurfacePoint(i / 32, 0.5, 1, spec))).toBeCloseTo(SPEC.rOut, 12);
      }
    }
  });
});

describe('展开动画(bend: 1 → 0)', () => {
  it('⑤ 摊平后长度 = 2πr —— 这是整个 Shell Method 教学点的地基', () => {
    const flat = { ...SPEC, bend: 0 };
    const a = shellSurfacePoint(0, 0.5, 0.5, flat);
    const b = shellSurfacePoint(1, 0.5, 0.5, flat);
    expect(dist(a, b)).toBeCloseTo(2 * Math.PI * midRadius(SPEC), 9);
    expect(dist(a, b)).toBeCloseTo(sweptArcLength(SPEC), 12);
  });

  it('⑥ 摊平后厚度 = Δx,高 = f(x)', () => {
    const flat = { ...SPEC, bend: 0 };
    const thickness = dist(
      shellSurfacePoint(0.5, 0.5, 0, flat),
      shellSurfacePoint(0.5, 0.5, 1, flat),
    );
    const height = dist(
      shellSurfacePoint(0.5, 0, 0.5, flat),
      shellSurfacePoint(0.5, 1, 0.5, flat),
    );
    expect(thickness).toBeCloseTo(SPEC.rOut - SPEC.rIn, 12);
    expect(height).toBeCloseTo(SPEC.height, 12);
  });

  it('⑦ ⭐ 整个展开过程中线弧长守恒 —— 是【真展开】,不是横向拉伸', () => {
    const N = 4000;
    const expected = sweptArcLength(SPEC);
    for (let k = 0; k <= 20; k++) {
      const spec = { ...SPEC, bend: k / 20 };
      let arc = 0;
      let prev = shellSurfacePoint(0, 0.5, 0.5, spec);
      for (let i = 1; i <= N; i++) {
        const cur = shellSurfacePoint(i / N, 0.5, 0.5, spec);
        arc += dist(prev, cur);
        prev = cur;
      }
      // 残差是【测试自己】的折线离散误差 O(N⁻²),不是几何误差
      expect(arc).toBeCloseTo(expected, 5);
    }
  });

  it('⑧ 连续性:bend 微小变化不会让点跳走', () => {
    for (let k = 1; k <= 100; k++) {
      const a = shellSurfacePoint(0.37, 0.5, 1, { ...SPEC, bend: k / 100 });
      const b = shellSurfacePoint(0.37, 0.5, 1, { ...SPEC, bend: (k - 1) / 100 });
      expect(dist(a, b)).toBeLessThan(0.35);
    }
  });
});

describe('摆位辅助量', () => {
  it('unrollYaw:卷起时不转,摊平时转 90° 正对观众', () => {
    expect(unrollYaw(1)).toBeCloseTo(0, 12);
    expect(unrollYaw(0)).toBeCloseTo(Math.PI / 2, 12);
  });

  it('unrollShiftX:卷起时不平移,摊平时左移半个弧长以居中', () => {
    expect(unrollShiftX(SPEC)).toBeCloseTo(0, 12);
    expect(unrollShiftX({ ...SPEC, bend: 0 })).toBeCloseTo(-sweptArcLength(SPEC) / 2, 12);
  });
});
