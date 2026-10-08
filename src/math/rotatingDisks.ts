/**
 * MATH — 相关变化率:钉在一起的两块圆盘。
 *
 * 题目:两块等大的薄木圆盘,在圆周上的一点 `N` 处钉在一起,起初完全重合。
 *   `t = 0` 时上面那块绕钉子以恒定角速度 `ω = 0.5 rad/s` 转动,
 *   下面那块露出来的面积记作 `A`。转过角 `α` 时,`A` 变化得多快?
 *
 * ⭐⭐⭐ 这一课真正要打掉的那句话:
 *   **「角速度是常数,所以面积的变化率也是常数。」**
 *   学生几乎都会这么想,而它是错的:`dA/dt = r²(1 + cos α)·ω`,
 *   从 `α = 0` 时的 `2r²ω` 一路降到 `α = π` 时的 **0**。
 *   转速一刻没变,面积增长的速度却在不停变慢 —— 并且在终点**停住**。
 *   ⭐ 更反直觉的是:最快的时刻是**一开始**,那会儿露出来的还只是一道细缝。
 *
 * ⚠️⚠️ 题面给的提示是「你可以假设 NM 平分角 α」。**那不用假设,它能证。**
 *   设两个圆心为 `O₁`、`O₂`,第二个交点为 `M`,则
 *     `|NO₁| = |O₁M| = |MO₂| = |O₂N| = r`
 *   —— 四条边都是半径,所以 `N O₁ M O₂` 是个**菱形**,
 *   而菱形的对角线平分它的内角,于是 `NM` 平分 `∠O₁NO₂ = α`。
 *   ⭐ 顺带白送一个结果:`M = O₁ + O₂ − N`(菱形的对角线互相平分)。
 *   下面所有坐标都是这么来的,不是解方程解出来的。
 *
 * ⭐ 三条互不相干的路径算同一个面积:
 *   ① `shadedClosed`    —— 闭式 `A = r²(α + sin α)`(课上推的那个);
 *   ② `shadedByDistance`—— 完全不碰 α:只量两个圆心的距离 `d`,
 *      套一般的「两等圆相交」公式,再用整圆减去;
 *   ③ `shadedByGrid`    —— 纯数值,在下盘上撒格点数个数。
 *   ⭐⭐ 另外第四条:屏幕上那条**阴影边界本身**(`shadedBoundary`)
 *      用鞋带公式量出来的面积也必须对得上 —— 所以这张图画错了测试会红。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export type Pt = readonly [number, number];

/** 题目给的角速度,rad/s。 */
export const OMEGA = 0.5;

/** α 的有效范围:转到 π 时两盘只在 N 处相切,下盘已经全部露出。 */
export const ALPHA_MAX = Math.PI;

/* ══ 几何:四个点 ═════════════════════════════════════════════════ */

/**
 * ⚠️ 坐标系:钉子 `N` 放在原点,下盘圆心在它正左边。
 *   这样 `N` 在画面右侧,和题图一致。
 */
export const N: Pt = [0, 0];

/** 下盘圆心。它不动。 */
export function centerBottom(r: number): Pt {
  return [-r, 0];
}

/**
 * 上盘圆心 —— 下盘圆心绕 `N` 转过 α 的像。
 * ⚠️ 这就是「绕钉子转动」的全部含义:圆心绕 N 转,半径不变。
 */
export function centerTop(r: number, alpha: number): Pt {
  const [x, y] = centerBottom(r);
  // ⚠️ 顺时针转(−α):这样上盘盖住的是**上半边**,露出来的在下面,
  //   和题图里阴影在下方一致。转向只是摆位,不影响任何面积。
  const c = Math.cos(-alpha);
  const sn = Math.sin(-alpha);
  return [x * c - y * sn, x * sn + y * c];
}

/**
 * 第二个交点 `M`。
 * ⭐ 靠菱形拿到:`M = O₁ + O₂ − N`,不解方程。
 * ⚠️ `α = π` 时它退回 `N` 本身 —— 那时两圆相切,本来就只有一个公共点。
 */
export function secondPoint(r: number, alpha: number): Pt {
  const a = centerBottom(r);
  const b = centerTop(r, alpha);
  return [a[0] + b[0] - N[0], a[1] + b[1] - N[1]];
}

/** 两个圆心的距离。⭐ 闭式是 `2r sin(α/2)`,这里直接量,好让测试去比。 */
export function centerDistance(r: number, alpha: number): number {
  const a = centerBottom(r);
  const b = centerTop(r, alpha);
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/**
 * 弦 `NM` 在下盘里对应的圆心角 `∠N O₁ M`。
 * ⭐ 课上推出来它等于 `π − α`;这里从坐标**量**出来,好让测试去对。
 * ⚠️ `α = 0` 时 M 是 N 的对径点,角是 π;`α = π` 时 M = N,角是 0。
 */
export function centralAngle(r: number, alpha: number): number {
  const o = centerBottom(r);
  const m = secondPoint(r, alpha);
  const v1: Pt = [N[0] - o[0], N[1] - o[1]];
  const v2: Pt = [m[0] - o[0], m[1] - o[1]];
  const dot = v1[0] * v2[0] + v1[1] * v2[1];
  const cos = Math.min(1, Math.max(-1, dot / (r * r)));
  return Math.acos(cos);
}

/**
 * `∠O₁ N M` —— 弦把 α 分出来的那半边。
 * ⭐ 菱形保证它恰好是 `α/2`。测试拿它来验那条「提示」其实是定理。
 * ⚠️ `α = π` 时 M = N,这个角没有定义,返回 `null`,不编一个数出来。
 */
export function halfAngleAtNail(r: number, alpha: number): number | null {
  const o = centerBottom(r);
  const m = secondPoint(r, alpha);
  const lm = Math.hypot(m[0] - N[0], m[1] - N[1]);
  if (lm < 1e-12) return null;
  const v1: Pt = [o[0] - N[0], o[1] - N[1]];
  const v2: Pt = [m[0] - N[0], m[1] - N[1]];
  const cos = Math.min(1, Math.max(-1, (v1[0] * v2[0] + v1[1] * v2[1]) / (r * lm)));
  return Math.acos(cos);
}

/* ══ 面积:三条互不相干的路径 ═════════════════════════════════════ */

/** 整块圆盘。 */
export function diskArea(r: number): number {
  return Math.PI * r * r;
}

/** 扇形,圆心角 θ。 */
export function sectorArea(r: number, theta: number): number {
  return 0.5 * r * r * theta;
}

/** 两腰为 r、夹角 θ 的三角形。 */
export function triangleArea(r: number, theta: number): number {
  return 0.5 * r * r * Math.sin(theta);
}

/** 弓形 = 扇形 − 三角形。 */
export function segmentArea(r: number, theta: number): number {
  return sectorArea(r, theta) - triangleArea(r, theta);
}

/** 路径 ①:重叠部分的闭式 `r²(π − α − sin α)`。 */
export function overlapClosed(r: number, alpha: number): number {
  return r * r * (Math.PI - alpha - Math.sin(alpha));
}

/** 路径 ①:露出来的面积 `A = r²(α + sin α)`。 */
export function shadedClosed(r: number, alpha: number): number {
  return r * r * (alpha + Math.sin(alpha));
}

/**
 * 路径 ②:**完全不用 α**。
 *
 * 只拿两个圆心的距离 `d`,套一般的「两个等圆相交」公式:
 *   `2r² arccos(d/2r) − (d/2)√(4r² − d²)`
 * ⭐ 这条路推理方式和路径 ① 毫无关系 —— 一个走角度,一个走距离。
 */
export function overlapByDistance(r: number, alpha: number): number {
  const d = centerDistance(r, alpha);
  if (d >= 2 * r) return 0;
  if (d <= 0) return diskArea(r);
  return 2 * r * r * Math.acos(d / (2 * r)) - (d / 2) * Math.sqrt(4 * r * r - d * d);
}

export function shadedByDistance(r: number, alpha: number): number {
  return diskArea(r) - overlapByDistance(r, alpha);
}

/**
 * 路径 ③:纯数值。在下盘的外接正方形上撒格点,数「在下盘里、但不在上盘里」的。
 * ⚠️ 慢,但完全不依赖任何几何推导 —— 它只会算距离。
 */
export function shadedByGrid(r: number, alpha: number, n = 600): number {
  const o1 = centerBottom(r);
  const o2 = centerTop(r, alpha);
  let hits = 0;
  for (let i = 0; i < n; i += 1) {
    const x = o1[0] - r + (2 * r * (i + 0.5)) / n;
    for (let j = 0; j < n; j += 1) {
      const y = o1[1] - r + (2 * r * (j + 0.5)) / n;
      if (Math.hypot(x - o1[0], y - o1[1]) > r) continue;
      if (Math.hypot(x - o2[0], y - o2[1]) > r) hits += 1;
    }
  }
  return ((2 * r) * (2 * r) * hits) / (n * n);
}

/* ══ 变化率 ═══════════════════════════════════════════════════════ */

/**
 * ⭐⭐⭐ 这一课的答案:`dA/dt = r²(1 + cos α)·ω`。
 * ⚠️ 注意它**不是常数** —— 尽管 ω 是常数。
 */
export function rate(r: number, alpha: number, omega = OMEGA): number {
  return r * r * (1 + Math.cos(alpha)) * omega;
}

/**
 * 变化率的**数值**复核:对 `A(α(t))` 做中心差商。
 * ⭐ 和 `rate` 推理方式不同 —— 一个求导,一个只做减法。
 * ⚠️ 靠近 `α = 0` 或 `α = π` 时要把步长夹进定义域里,否则会越界。
 */
export function rateNumeric(r: number, alpha: number, omega = OMEGA, dt = 1e-5): number | null {
  const lo = alpha - omega * dt;
  const hi = alpha + omega * dt;
  if (lo < 0 || hi > ALPHA_MAX) return null;
  return (shadedClosed(r, hi) - shadedClosed(r, lo)) / (2 * dt);
}

/** 变化率最大的地方。⭐ 是 α = 0,也就是**刚开始转**的那一瞬。 */
export function fastestAlpha(): number {
  return 0;
}

/* ══ 画图:阴影区域的真实边界 ═════════════════════════════════════ */

/**
 * 阴影区域(下盘里没被上盘盖住的部分)的边界多边形。
 *
 * ⭐⭐ 边界由两段圆弧拼成:
 *   · 下盘上**在上盘之外**的那段弧(圆心角 `2π − (π − α) = π + α`);
 *   · 上盘上**在下盘之内**的那段弧(圆心角 `π − α`)。
 *
 * ⚠️⚠️ 这个函数不只是画图用的。测试会对它做**鞋带公式**,
 *   要求结果和 `shadedClosed` 一致 —— 也就是说,
 *   **屏幕上画出来的那块阴影,面积必须真的等于公式算的那个数**。
 *   画错了、弧取反了、首尾接错了,测试当场变红。
 */
export function shadedBoundary(r: number, alpha: number, perArc = 180): readonly Pt[] {
  const o1 = centerBottom(r);
  const o2 = centerTop(r, alpha);
  const m = secondPoint(r, alpha);
  const ang = (c: Pt, p: Pt): number => Math.atan2(p[1] - c[1], p[0] - c[0]);
  const on = (c: Pt, t: number): Pt => [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)];
  const far = (p: Pt, c: Pt): number => Math.hypot(p[0] - c[0], p[1] - c[1]);

  /**
   * ⚠️⚠️ 走哪一段弧,**用中点去试**,不靠符号推理。
   *
   *   第一版是按「顺时针/逆时针」硬推的,结果取反了:
   *   小角度时画出来的面积是 4.64,而正确值是 0.67 —— 整整差了一个圆盘。
   *   (鞋带那条断言当场变红,这正是它存在的理由。)
   *   旋转方向、α 的正负、atan2 的分支,三样里任何一样变了,符号推理就得重来;
   *   而「取中点,看它在不在另一个盘里」这件事,换什么摆法都成立。
   */
  const arc = (c: Pt, from: Pt, to: Pt, wantOutside: Pt): Pt[] => {
    const a0 = ang(c, from);
    const a1 = ang(c, to);
    let delta = a1 - a0;
    while (delta <= 0) delta += 2 * Math.PI;          // 先取逆时针那一支
    const mid = on(c, a0 + delta / 2);
    const outside = far(mid, wantOutside) > r;
    if (!outside) delta -= 2 * Math.PI;               // 猜错了就换另一支
    const out: Pt[] = [];
    for (let i = 0; i <= perArc; i += 1) out.push(on(c, a0 + (delta * i) / perArc));
    return out;
  };

  // ① 下盘上**在上盘外面**的那段弧,从 N 到 M。
  const first = arc(o1, N, m, o2);
  // ② 上盘上**在下盘里面**的那段弧,从 M 回到 N。
  //    这里要的是"在 o1 里面",所以把判据反过来用:选中点**不在**外面的那一支。
  const a0 = ang(o2, m);
  const a1 = ang(o2, N);
  let delta = a1 - a0;
  while (delta <= 0) delta += 2 * Math.PI;
  const mid = on(o2, a0 + delta / 2);
  if (Math.hypot(mid[0] - o1[0], mid[1] - o1[1]) > r) delta -= 2 * Math.PI;
  const second: Pt[] = [];
  for (let i = 1; i <= perArc; i += 1) second.push(on(o2, a0 + (delta * i) / perArc));

  return [...first, ...second];
}

/** 鞋带公式。⚠️ 取绝对值,省得关心点列是顺时针还是逆时针。 */
export function polygonArea(pts: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

/** 一整圈圆周,画圆用。 */
export function circlePoints(c: Pt, r: number, n = 240): readonly Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (2 * Math.PI * i) / n;
    out.push([c[0] + r * Math.cos(t), c[1] + r * Math.sin(t)]);
  }
  return out;
}

/* ══ 推导的每一步 ═════════════════════════════════════════════════ */

export interface Step {
  readonly n: string;
  readonly title: string;
  readonly body: string;
  readonly tex?: string;
  /** ⚠️ 这一步最容易错在哪 */
  readonly watch?: string;
}

export const STEPS: readonly Step[] = [
  {
    n: '1',
    title: 'Name the two quantities that move',
    body: 'The angle α grows at a constant 0.5 rad/s. The exposed area A grows too, but not at a constant rate — that is the whole question. The radius r never changes, so it is a constant throughout, and the answer is allowed to contain it because the problem never gives a number for it.',
    tex: String.raw`\frac{d\alpha}{dt}=0.5\ \text{rad/s},\qquad \frac{dA}{dt}=\ ?`,
    watch: 'Writing dr/dt somewhere. The disks do not change size; only the angle does.',
  },
  {
    n: '2',
    title: 'The four points form a rhombus',
    body: 'Let O₁ and O₂ be the two centres and M the second crossing point. Each centre is one radius from N, and M is one radius from each centre, so all four sides N O₁, O₁M, M O₂, O₂N have length r. That makes N O₁ M O₂ a rhombus. A rhombus has its angle bisected by its diagonal, so the chord NM bisects the angle α at the nail — the problem offers this as an assumption, but it is a fact you can prove in one line.',
    tex: String.raw`|NO_1|=|O_1M|=|MO_2|=|O_2N|=r`,
    watch: 'Taking the hint on faith. Knowing why it is true is what tells you the two base angles are both α/2.',
  },
  {
    n: '3',
    title: 'Find the central angle of the chord',
    body: 'Triangle N O₁ M has two sides equal to r, so it is isosceles and its base angles match. The rhombus just gave us that the angle at N is α/2, so the angle at M is α/2 as well. The three angles sum to π.',
    tex: String.raw`\theta+\frac{\alpha}{2}+\frac{\alpha}{2}=\pi\ \Longrightarrow\ \theta=\pi-\alpha`,
    watch: 'Using α instead of α/2 for the base angles. The chord splits the angle at the nail in half.',
  },
  {
    n: '4',
    title: 'Cut the overlap into two segments',
    body: 'The overlap is a lens bounded by two arcs through N and M. The chord NM splits it into two circular segments, one from each disk, and because the disks are the same size the two segments are congruent. Each segment is a sector with its triangle removed.',
    tex: String.raw`A_{\text{seg}}=\tfrac12r^2\theta-\tfrac12r^2\sin\theta`,
    watch: 'Forgetting to double it. The lens is two segments, not one.',
  },
  {
    n: '5',
    title: 'Substitute θ = π − α',
    body: 'The sector contributes ½r²(π − α). For the triangle, sin(π − α) = sin α, which is why no stray minus sign appears. Doubling gives the lens.',
    tex: String.raw`A_{\text{overlap}}=r^2\bigl(\pi-\alpha-\sin\alpha\bigr)`,
    watch: 'Writing sin(π − α) = −sin α. It is +sin α; sine is positive on the whole interval (0, π).',
  },
  {
    n: '6',
    title: 'Subtract from the whole disk',
    body: 'The shaded region is whatever the top disk is not covering, so take the overlap away from the full disk. The πr² terms cancel exactly, which is a good sign the segment work was right.',
    tex: String.raw`A=\pi r^2-r^2(\pi-\alpha-\sin\alpha)=r^2(\alpha+\sin\alpha)`,
    watch: 'Stopping here. This is an area, not a rate — the question asked how fast it changes.',
  },
  {
    n: '7',
    title: 'Differentiate with respect to time',
    body: 'Both sides depend on t through α, so every α-derivative carries a dα/dt by the chain rule. The radius is constant and comes along for the ride.',
    tex: String.raw`\frac{dA}{dt}=r^2\bigl(1+\cos\alpha\bigr)\frac{d\alpha}{dt}`,
    watch: 'Dropping the dα/dt. Differentiating with respect to α and with respect to t are different operations.',
  },
  {
    n: '8',
    title: 'Put in the angular velocity',
    body: 'Finally substitute dα/dt = 0.5 rad/s. The answer still contains r because the problem never fixed the size of the disks, and the units are area per second.',
    tex: String.raw`\frac{dA}{dt}=\frac{r^2}{2}\bigl(1+\cos\alpha\bigr)`,
    watch: 'Reporting a bare number. Without a value for r the answer has to keep r² in it.',
  },
] as const;

export const HEADLINE = 'Constant Spin, Changing Rate';
export const MAIN_IDEA =
  'The top disk turns at a fixed 0.5 rad/s from start to finish, and the exposed area still does not grow at a fixed rate. It grows fastest at the very first instant, when the sliver showing is thinnest, and the growth dies to exactly zero as the disks come apart.';

export const TRAP =
  'A constant angular velocity does not make dA/dt constant. The chain rule gives dA/dt = r²(1 + cos α)·ω, and the factor (1 + cos α) slides from 2 down to 0 while ω never moves. If your answer has no α in it, you differentiated the angle and forgot the geometry.';

export const RHOMBUS_NOTE =
  'The problem says you may assume the chord bisects α. You do not have to assume it: all four sides of N O₁ M O₂ are radii, so it is a rhombus, and a rhombus is bisected by its diagonal.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}

/** 角度显示用。 */
export function degrees(rad: number): number {
  return (rad * 180) / Math.PI;
}
