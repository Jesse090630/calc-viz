/**
 * MATH — 极坐标面积:**面积元是 `½r²dθ`,不是 `r dθ`。**
 *
 * ⭐⭐ 学生把直角坐标那套照搬过来:「高乘宽,那就是 `r · dθ` 吧」。
 *   不是。`dθ` 扫出来的不是一个矩形,是一个**扇形**,
 *   而扇形的面积是 `½ r² dθ` —— 那个 `½` 和那个平方都不是装饰。
 *
 * ⭐⭐⭐ 这一课的反例好得不用另外编:**拿单位圆算一遍。**
 *
 *       ∫₀^{2π} r dθ = 2π        ← 这是**周长**
 *       ∫₀^{2π} ½r² dθ = π       ← 这才是面积
 *
 *   错的那条公式算出来的东西**连量纲都不对** ——
 *   `r dθ` 是长度 × 无量纲 = 长度,根本不是面积。
 *   一个连单位都不对的答案,不是"差一点",是答非所问。
 *
 * ⚠️⚠️ 半径**千万不能取 2**:那时 `πa² = 4π` 而 `2πa = 4π`,两者**恰好相等**,
 *   反例会当场消失得无影无踪。取 1 时是 `π` 对 `2π`,差整整一倍,一眼看得出。
 *   (这种"参数取错了,反例自己没了"的坑,这个项目里已经踩过好几次。)
 *
 * ⭐ 两条互不相干的路径算同一块面积:
 *   ① `areaByIntegral` —— `∫ ½r² dθ`,极坐标那条路;
 *   ② `areaByShoelace` —— 把边界点换算成直角坐标,用**鞋带公式**算多边形面积。
 *      它根本不知道什么叫极坐标面积元,只是量一个多边形。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

/* ══ 曲线 ══════════════════════════════════════════════════════════ */

export interface PolarCurve {
  readonly id: string;
  readonly label: string;
  readonly r: (th: number) => number;
  /** 扫完整块区域要转多少 */
  readonly sweep: readonly [number, number];
  /** 精确面积(手推的闭式)—— 用来校验两条数值路径 */
  readonly exactArea: number;
  readonly exactTex: string;
  readonly rTex: string;
  readonly note: string;
  readonly startTheta: number;
}

const A_CIRCLE = 1;

export const POLAR_CURVES: readonly PolarCurve[] = [
  {
    /**
     * ⭐⭐ 反例的载体。
     * ⚠️ 半径必须是 1,不能是 2 —— 取 2 时面积和"错公式"都等于 4π,反例自己没了。
     */
    id: 'circle',
    label: 'r = 1 — a circle, where you already know the answer',
    r: () => A_CIRCLE,
    sweep: [0, 2 * Math.PI],
    exactArea: Math.PI * A_CIRCLE * A_CIRCLE,
    exactTex: '\\pi r^2 = \\pi',
    rTex: 'r = 1',
    note: 'You already know this area is π. Run the wrong formula and it returns 2π — which is the circumference of this circle, not its area. That is the clearest sign something is wrong: r dθ has units of length, so it was never going to produce an area at all.',
    startTheta: Math.PI / 3,
  },
  {
    /** 心形线:课本上的标准题,面积 3π/2。 */
    id: 'cardioid',
    label: 'r = 1 + cos θ — a cardioid',
    r: (th) => 1 + Math.cos(th),
    sweep: [0, 2 * Math.PI],
    exactArea: (3 * Math.PI) / 2,
    exactTex: '\\tfrac{3\\pi}{2}',
    rTex: 'r = 1 + \\cos\\theta',
    note: 'The radius changes as the ray sweeps, so the wedges are not all the same size. Squaring r matters more here than anywhere: where r doubles, the wedge holds four times the area, not twice.',
    startTheta: Math.PI / 3,
  },
  {
    /**
     * 四瓣玫瑰 `r = 2cos 2θ`。一瓣面积 `πa²/8`,四瓣合计 `πa²/2 = 2π`。
     * ⚠️ `r` 会变负 —— 负半径把点甩到对面去,这正是玫瑰长出四瓣的原因。
     */
    id: 'rose',
    label: 'r = 2cos(2θ) — a four-petal rose',
    r: (th) => 2 * Math.cos(2 * th),
    sweep: [0, 2 * Math.PI],
    exactArea: 2 * Math.PI,
    exactTex: '2\\pi',
    rTex: 'r = 2\\cos 2\\theta',
    note: 'r goes negative on part of the sweep, which throws the point to the opposite side and is exactly how four petals appear from a sweep of 2π. Since the area element uses r², the negative stretches contribute positively — the sign disappears when you square it.',
    startTheta: 0.4,
  },
] as const;

export function polarOf(id: string): PolarCurve {
  return POLAR_CURVES.find((c) => c.id === id) ?? POLAR_CURVES[0]!;
}

/** 极坐标点换成直角坐标。⚠️ `r` 可以是负的 —— 那就落在对面。 */
export function toXY(r: number, th: number): readonly [number, number] {
  return [r * Math.cos(th), r * Math.sin(th)];
}

/* ══ 扇形 vs 矩形:这一课的机关 ═══════════════════════════════════ */

/**
 * ⭐ 一个宽 `dθ` 的**扇形**的面积:`½ r² dθ`。
 * 这是对的那个。
 */
export function wedgeArea(r: number, dTheta: number): number {
  return 0.5 * r * r * dTheta;
}

/**
 * ⚠️ 学生照搬直角坐标写出来的那个:`r · dθ`。
 *
 * 它**不是面积**。`r` 是长度,`dθ` 是弧度(无量纲),乘出来还是长度 ——
 * 事实上 `r dθ` 正是那段**弧长**。
 * 这个函数存在的唯一目的,是把它和正确答案摆在一起。
 */
export function wrongWedge(r: number, dTheta: number): number {
  return r * dTheta;
}

/** 两者之比 `½r`。⭐ 只有 `r = 2` 时它等于 1 —— 那时反例会消失。 */
export function wedgeRatio(r: number): number {
  return 0.5 * r;
}

/* ══ 路径 ① —— 极坐标积分 ═══════════════════════════════════════ */

/** `∫ ½ r² dθ`(中点法)。 */
export function areaByIntegral(c: PolarCurve, from?: number, to?: number, n = 20_000): number {
  const lo = from ?? c.sweep[0];
  const hi = to ?? c.sweep[1];
  let sum = 0;
  let visited = 0;
  for (let i = 0; i < n; i += 1) {
    const th = lo + ((hi - lo) * (i + 0.5)) / n;
    const r = c.r(th);
    sum += 0.5 * r * r;
    visited += 1;
  }
  if (visited !== n) throw new Error('polar integral never ran');
  return (sum * (hi - lo)) / n;
}

/** ⚠️ 那条**错**的积分 `∫ r dθ`,只为对照。 */
export function wrongIntegral(c: PolarCurve, from?: number, to?: number, n = 20_000): number {
  const lo = from ?? c.sweep[0];
  const hi = to ?? c.sweep[1];
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    sum += c.r(lo + ((hi - lo) * (i + 0.5)) / n);
  }
  return (sum * (hi - lo)) / n;
}

/* ══ 路径 ② —— 换成直角坐标,用鞋带公式 ═════════════════════════ */

/**
 * ⭐⭐ 把边界点换算成直角坐标,直接量这个多边形的面积。
 *
 * 它**完全不知道**极坐标面积元长什么样 —— 只是鞋带公式。
 * 所以它和路径 ① 一致,是对 `½r²dθ` 这条公式的一次真检验。
 *
 * ⚠️ 玫瑰线上 `r` 会变负,轨迹会自己绕回来。鞋带公式对这种自交的闭合路径
 *   给出的是**带号面积之和**,而负半径那一段的环绕方向与正的一致,
 *   于是四瓣都被正着数了一遍 —— 这正好对应 `r²` 抹掉符号那件事。
 */
export function areaByShoelace(c: PolarCurve, n = 20_000): number {
  const [lo, hi] = c.sweep;
  let sum = 0;
  let prev = toXY(c.r(lo), lo);
  for (let i = 1; i <= n; i += 1) {
    const th = lo + ((hi - lo) * i) / n;
    const cur = toXY(c.r(th), th);
    sum += prev[0] * cur[1] - cur[0] * prev[1];
    prev = cur;
  }
  return Math.abs(sum) / 2;
}

/* ══ 累计:扫到哪儿,攒了多少 ═════════════════════════════════════ */

export interface Running {
  readonly theta: number;
  /** 正确公式攒到的面积 */
  readonly right: number;
  /** 错公式攒到的数(它根本不是面积) */
  readonly wrong: number;
}

export function runningArea(c: PolarCurve, upto: number, n = 240): readonly Running[] {
  const lo = c.sweep[0];
  const out: Running[] = [];
  let right = 0;
  let wrong = 0;
  const step = (upto - lo) / n;
  for (let i = 0; i <= n; i += 1) {
    const th = lo + step * i;
    if (i > 0) {
      const mid = th - step / 2;
      const r = c.r(mid);
      right += 0.5 * r * r * step;
      wrong += r * step;
    }
    out.push({ theta: th, right, wrong });
  }
  return out;
}

/* ══ 画图 ═════════════════════════════════════════════════════════ */

export function samplePolar(c: PolarCurve, n = 1200): readonly (readonly [number, number])[] {
  const [lo, hi] = c.sweep;
  const out: (readonly [number, number])[] = [];
  for (let i = 0; i <= n; i += 1) {
    const th = lo + ((hi - lo) * i) / n;
    const p = toXY(c.r(th), th);
    if (Number.isFinite(p[0]) && Number.isFinite(p[1])) out.push(p);
  }
  return out;
}

/** 那一个高亮的扇形的边界(原点 → 弧 → 原点)。 */
export function wedgePath(
  c: PolarCurve, theta: number, dTheta: number, n = 24,
): readonly (readonly [number, number])[] {
  const out: (readonly [number, number])[] = [[0, 0]];
  for (let i = 0; i <= n; i += 1) {
    const th = theta + (dTheta * i) / n;
    out.push(toXY(c.r(th), th));
  }
  out.push([0, 0]);
  return out;
}

/** 画框半径:取样里离原点最远的那个点。 */
export function reach(c: PolarCurve): number {
  let best = 0;
  for (const p of samplePolar(c, 720)) best = Math.max(best, Math.hypot(p[0], p[1]));
  return best * 1.12;
}

export function clampTheta(c: PolarCurve, th: number): number {
  if (!Number.isFinite(th)) return c.startTheta;
  return Math.min(Math.max(th, c.sweep[0]), c.sweep[1]);
}

/* ══ 显示 ═════════════════════════════════════════════════════════ */

export const HEADLINE = 'A Sector Is Not a Rectangle';
export const MAIN_IDEA =
  'Sweeping the ray through dθ does not carve out a rectangle of height r and width dθ. It carves out a thin wedge, and a wedge of radius r and angle dθ has area ½r²dθ. The one-half and the square are both doing work.';

export const UNITS_NOTE =
  'r dθ is a length times a dimensionless angle, so it is a length — in fact it is exactly the arc length along the edge. It could never have been an area. On a circle of radius 1 it returns 2π, the circumference, while the area is π.';

/**
 * ⭐⭐⭐ 玫瑰线上那条错公式的总和**恰好是 0**。
 *
 *   `∫₀^{2π} 2cos 2θ dθ = [sin 2θ]₀^{2π} = 0`
 *
 * ⚠️ 一个明摆着有面积的图形,"面积公式"却算出 0 —— 这比圆那个反例还狠。
 *   原因也说得清:`r` 有一半角度是负的,而 `r dθ` 保留符号,正负互相抵消。
 *   而真正的面积元用 `r²`,符号被平方抹掉,所以四瓣各算各的,一瓣都不少。
 */
export const ZERO_NOTE =
  'Run the wrong formula over the whole rose and it totals exactly zero. A shape with four obvious petals, and the "area" comes out as nothing — because r dθ keeps the sign of r, and r is negative over half the sweep, so the halves cancel. The real area element squares r, which is why all four petals count.';

export const NEGATIVE_NOTE =
  'r is negative across part of this sweep, which places the point on the opposite side of the origin. Because the area element squares r, those stretches still contribute positive area — the sign vanishes in r².';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
