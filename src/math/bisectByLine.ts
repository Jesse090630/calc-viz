/**
 * MATH — 用介值定理证明:过**任意**外点 P,总有一条直线把图形平分。
 *
 * ⭐⭐ 学生写这道题时最常见的写法是:
 *     「设 f(a) 是一侧的面积,f(b) 是另一侧的,f 连续,若 f(a) − f(b) = 0 就相等。」
 *   ——这句话本身没错,可它**什么也没证明**。介值定理要用起来,必须交出三样东西:
 *
 *     ① 一个**连续**的函数;
 *     ② 两个**具体**的端点;
 *     ③ 一条理由,说明函数在这两个端点**异号**。
 *
 *   ③ 才是整道题的门槛。而它的答案漂亮得出奇:
 *
 * ⭐⭐⭐ **把直线转过 180°,它还是同一条直线,可"左边"和"右边"对调了。**
 *
 *   记 A(θ) = 过 P、方向角为 θ 的**有向**直线,其**左侧**所占的面积。那么
 *
 *         A(θ + π) = T − A(θ)          (T 是图形总面积)
 *
 *   于是令 g(θ) = A(θ) − (T − A(θ)) = 2A(θ) − T,就有 **g(θ + π) = −g(θ)**。
 *   端点有了:θ = 0 与 θ = π;异号也有了 —— 它们**天生**互为相反数。
 *   g 连续,IVT 立刻给出某个 c 使 g(c) = 0,那条线就把面积平分了。
 *
 * ⚠️ 「P 在图形外面」这个条件,学生往往以为是难点,其实**它根本不碍事**:
 *   P 在外面,意味着有一整段角度的直线**完全碰不到图形**,
 *   那时 A(θ) 恒等于 0 或 T,g 在图上是两段**平台**。
 *   平台不影响任何一步 —— 反而让端点的异号更极端。这一点必须画出来。
 *
 * ⭐ 椭圆有个特殊之处:它中心对称,所以平分线**只能**是过中心的那一条,答案能一眼看出。
 *   于是 IVT 显得多余。**这正是要配一个不对称图形的原因**:
 *   换成一块随手画的「煎饼」,一眼看不出答案了,而上面那段论证一个字都不用改。
 *   ⚠️ 顺带戳破一个常见误解:**过重心的直线一般并不平分面积。**
 *
 * ⭐ 三条互不相干的路径算同一个面积:
 *   ① `areaLeftExact`      —— 只对椭圆:压成单位圆 + 弓形面积闭式,不做任何积分;
 *   ② `areaLeftPolar`      —— 以内点为极点积分 `½(t₁² − t₀²) dφ`,只用极径和边的线性判据;
 *   ③ `areaLeftPolygon`    —— 把边界当多边形,按半平面裁剪后用鞋带公式。
 *   ③ 同时是**画图用的那份数据** —— 屏幕上涂的色块和读出的数字来自同一处,不会各说各话。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */
import { showNumber } from './format';

export type Pt = readonly [number, number];

/* ══ 图形 ══════════════════════════════════════════════════════════ */

export interface Shape {
  readonly id: string;
  readonly label: string;
  /** 星形中心:从这里出发的每条射线,与边界恰好交一次。极坐标积分以它为极点。 */
  readonly origin: Pt;
  /** 极径 r(φ):`origin + r(φ)·(cos φ, sin φ)` 落在边界上。 */
  readonly radius: (phi: number) => number;
  /** 中心对称吗 —— 决定"过中心那条线"这个捷径成不成立。 */
  readonly centrallySymmetric: boolean;
  readonly note: string;
  /** 打开时 P 停在哪 */
  readonly startP: Pt;
}

const ELLIPSE_A = 3.4;
const ELLIPSE_B = 2.2;

/** 椭圆的极径:`(r cos φ)²/a² + (r sin φ)²/b² = 1`。 */
function ellipseRadius(phi: number): number {
  const c = Math.cos(phi) / ELLIPSE_A;
  const s = Math.sin(phi) / ELLIPSE_B;
  return 1 / Math.hypot(c, s);
}

/**
 * 「煎饼」—— 一块**没有中心**的图形。
 *
 * ⚠️⚠️ 系数改了三轮,每一轮都是被截图打回来的:
 *
 *   第一版只有 `0.24 cos φ`:屏幕上就是个圆。而这一课全靠
 *   "椭圆一眼看得出答案、煎饼看不出"这个对照撑着 —— 图形长得像圆,对照当场塌掉。
 *
 *   第二版加大到 `0.34 cos φ + 0.14 cos 2φ`:形状够扁了,可**转 180° 之后只差 0.12**——
 *   它其实非常接近中心对称。原因是死的:极坐标里中心对称 ⇔ **只有偶次谐波**,
 *   所以要打破它,非得靠**奇次**谐波(3 次),而 1 次那项绕形心转的时候被吸收掉了。
 *
 *   ⭐ 而 3 次谐波一大就**不凸**了 —— 凸性把不对称卡死在 0.33 以内。
 *     于是这里**放弃凸性**:`0.20 cos 3φ` 让转 180° 差到 0.98,一眼看得见。
 *
 * ⚠️ 代价要说清楚:非凸图形被一条直线切,可能切出**三块**而不是两块。
 *   这不影响论证 —— 介值定理管的是**两个半平面**各占多少面积,
 *   从没要求哪一侧是连通的。页面上会把这句话说出来,不藏着。
 *   (`clipLeft` 对非凸多边形照样给出正确面积:与极坐标积分对到 3e-5。)
 *
 * ⚠️ 仍然要求**星形**(`r > 0`):极坐标积分要靠它。
 */
function blobRadius(phi: number): number {
  return 2.5 * (
    1 + 0.14 * Math.cos(phi) + 0.07 * Math.cos(2 * phi)
    + 0.20 * Math.cos(3 * phi) + 0.06 * Math.sin(3 * phi)
  );
}

export const SHAPES: readonly Shape[] = [
  {
    id: 'ellipse',
    label: 'The ellipse from the problem',
    origin: [0, 0],
    radius: ellipseRadius,
    centrallySymmetric: true,
    note:
      'Turned halfway around about its centre, an ellipse lands exactly on itself — that is what the dashed outline is showing, and it is the whole reason a chord through the centre splits it evenly. The answer is visible without any theorem, which is precisely why the ellipse is a poor advertisement for one.',
    startP: [5.6, 3.1],
  },
  {
    id: 'blob',
    label: 'A pancake with no centre',
    origin: [0, 0],
    radius: blobRadius,
    centrallySymmetric: false,
    note:
      'Turned halfway around, this shape does not land back on itself — the dashed outline is where it goes. There is no centre to aim at, so the shortcut has nothing to grab. The argument above does not change by a single word; that is what it was for.',
    // ⚠️ 起点是**搜**出来的,不是随手放的:形心那条线差多少,完全随 P 而变。
    //   放在 [5.4, 2.6] 时只差 0.017 —— 几乎正好平分,反例当场作废。
    //   这里同时满足两件事:形心线差 1.45(约总面积的 7%),而且转到某些角度时
    //   左侧真的会裂成**两块** —— 那句"介值定理管的是半平面,不是连通块"才有地方讲。
    startP: [-5.2, 3.0],
  },
] as const;

export function shapeOf(id: string): Shape {
  return SHAPES.find((s) => s.id === id) ?? SHAPES[0]!;
}

/** 边界上的点。 */
export function boundaryAt(s: Shape, phi: number): Pt {
  const r = s.radius(phi);
  return [s.origin[0] + r * Math.cos(phi), s.origin[1] + r * Math.sin(phi)];
}

/** 边界多边形 —— 画图与路径 ③ 共用同一份。 */
export function boundary(s: Shape, n = 720): readonly Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < n; i += 1) out.push(boundaryAt(s, (2 * Math.PI * i) / n));
  return out;
}

/** 总面积 `∮ ½ r² dφ`(中点法)。 */
export function totalArea(s: Shape, n = 20_000): number {
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    const phi = (2 * Math.PI * (i + 0.5)) / n;
    const r = s.radius(phi);
    sum += 0.5 * r * r;
  }
  return (sum * 2 * Math.PI) / n;
}

/** 形心。⚠️ 这一课要用它演示一个**反例**,所以它必须算对。 */
export function centroid(s: Shape, n = 20_000): Pt {
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i += 1) {
    const phi = (2 * Math.PI * (i + 0.5)) / n;
    const r = s.radius(phi);
    a += 0.5 * r * r;
    cx += ((r * r * r) / 3) * Math.cos(phi);
    cy += ((r * r * r) / 3) * Math.sin(phi);
  }
  return [s.origin[0] + cx / a, s.origin[1] + cy / a];
}

/**
 * ⭐⭐ 把图形绕某点转 180°。
 *
 * ⚠️ 加这个不是为了好看,是因为「这块煎饼不中心对称」这句话原先**只是个断言**:
 *   屏幕上那是一块光滑的蛋形,学生看一眼会说"这不就是椭圆吗"。
 *   文案说不对称、图看着对称 —— 又是文字和画面打架。
 *
 * ⭐ 把转过 180° 的轮廓叠上去,这件事就**看得见**了:
 *   椭圆转完严丝合缝地落回自己身上(所以才有"过中心"那个捷径);
 *   煎饼转完对不上 —— 捷径没了,只能靠定理。
 */
export function rotatedOutline(s: Shape, about: Pt, n = 360): readonly Pt[] {
  return boundary(s, n).map(([x, y]) => [2 * about[0] - x, 2 * about[1] - y] as Pt);
}

/**
 * ⭐ 转 180° 之后对不上多少(取边界点到原图形的最大越界量)。
 * ⚠️ `centrallySymmetric` 这个标志是**手写**的,得有东西盯着它别说谎。
 */
export function centralAsymmetry(s: Shape, about: Pt, n = 720): number {
  let worst = 0;
  for (const [x, y] of rotatedOutline(s, about, n)) {
    const dx = x - s.origin[0];
    const dy = y - s.origin[1];
    worst = Math.max(worst, Math.abs(Math.hypot(dx, dy) - s.radius(Math.atan2(dy, dx))));
  }
  return worst;
}

/* ══ 有向直线与"左侧" ═════════════════════════════════════════════ */

/**
 * 有向直线 `ℓ(θ)`:过 P,方向 `(cos θ, sin θ)`。
 * 点 X 的**带号**边:`s(X) = cross(u, X − P)`,`s > 0` 记作**左侧**。
 *
 * ⭐ 这个"带号"就是整道题的机关:θ 加 π 时 u 反向,s 整体变号,左右互换。
 */
export function side(P: Pt, theta: number, X: Pt): number {
  return Math.cos(theta) * (X[1] - P[1]) - Math.sin(theta) * (X[0] - P[0]);
}

/** 点在图形内吗(只用极径,不碰多边形)。 */
export function inside(s: Shape, X: Pt): boolean {
  const dx = X[0] - s.origin[0];
  const dy = X[1] - s.origin[1];
  return Math.hypot(dx, dy) <= s.radius(Math.atan2(dy, dx));
}

/** ⚠️ P 必须在图形**外面** —— 题面如此。 */
export function isOutside(s: Shape, P: Pt): boolean {
  return !inside(s, P);
}

/**
 * ⭐ 把落到图形里面的 P 推回外面。
 * ⚠️ 题面要求 P 在外面 —— 拖动时必须守住这个前提,而不是让它悄悄失效。
 *   (顺带:P 在里面时论证其实照样成立,只是那就不是这道题了。)
 */
export function pushOutside(s: Shape, P: Pt, margin = 1.04): Pt {
  if (isOutside(s, P)) return P;
  const dx = P[0] - s.origin[0];
  const dy = P[1] - s.origin[1];
  const phi = Math.atan2(dy, dx);
  const r = s.radius(phi) * margin;
  return [s.origin[0] + r * Math.cos(phi), s.origin[1] + r * Math.sin(phi)];
}

/* ══ 路径 ① —— 椭圆的闭式(压成单位圆 + 弓形) ═══════════════════ */

/**
 * 单位圆里,一条到圆心带号距离为 t 的直线,**远离**圆心那一侧的面积。
 * `seg(t) = arccos t − t√(1 − t²)`,且 `seg(t) + seg(−t) = π`。
 */
export function segmentArea(t: number): number {
  const c = Math.min(Math.max(t, -1), 1);
  return Math.acos(c) - c * Math.sqrt(Math.max(0, 1 - c * c));
}

/**
 * 路径 ① —— **只对椭圆**,闭式,不做任何数值积分。
 *
 * ⭐ `(x, y) ↦ (x/a, y/b)` 是行列式为 `1/(ab) > 0` 的线性映射:
 *   它把椭圆压成单位圆,把直线仍映成直线,**不改变左右**(定号),面积统一缩 `ab` 倍。
 *   于是问题化成"单位圆被一条直线切出多少" —— 一个弓形而已。
 */
export function areaLeftExact(P: Pt, theta: number, a = ELLIPSE_A, b = ELLIPSE_B): number {
  const px = P[0] / a;
  const py = P[1] / b;
  const dx = Math.cos(theta) / a;
  const dy = Math.sin(theta) / b;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // 圆心到直线的带号距离,圆心在左侧时为正
  const h = px * uy - py * ux;
  return a * b * segmentArea(-h);
}

/* ══ 路径 ② —— 极坐标积分(与 ① 毫无关系) ═════════════════════ */

/**
 * 路径 ② —— 以 `origin` 为极点积分。
 *
 * ⭐ 沿方向 φ 的射线上,`s(origin + t·(cos φ, sin φ)) = s₀ + t·sin(φ − θ)`
 *   ——**关于 t 是一次的**。所以"落在左侧"的那段 t 是一个区间,端点解一个一次方程即可。
 *   面积元 `∫ t dt = ½(t₁² − t₀²)`。
 *
 * ⚠️ 被积函数在"直线穿进穿出"处有折点,所以中点法只有二阶收敛 —— 别指望谱精度。
 */
/**
 * 一条射线上「落在左侧」的那段 `t`。
 *
 * ⚠️ 单独拆出来,是因为 `m === 0`(射线和直线平行)那一支**在积分里永远走不到**:
 *   取样点 `φ = 2π(i + ½)/n` 让 `sin(φ − θ)` 恰好为 0 是零测度事件,
 *   于是变异测试把这一支改反了都没人发现 —— 又一段死代码。
 *   拆成独立函数之后就能直接喂 `m = 0` 进去,这一支才真正被测到。
 */
export function rayInterval(r: number, s0: number, m: number): readonly [number, number] {
  if (m === 0) return s0 > 0 ? [0, r] : [0, 0];   // 平行:整条在左,或整条在右
  const cut = -s0 / m;
  return m > 0 ? [Math.max(0, cut), r] : [0, Math.min(r, cut)];
}

export function areaLeftPolar(s: Shape, P: Pt, theta: number, n = 20_000): number {
  const s0 = side(P, theta, s.origin);
  let sum = 0;
  let visited = 0;
  for (let i = 0; i < n; i += 1) {
    const phi = (2 * Math.PI * (i + 0.5)) / n;
    const [t0, t1] = rayInterval(s.radius(phi), s0, Math.sin(phi - theta));
    visited += 1;
    if (t1 > t0) sum += 0.5 * (t1 * t1 - t0 * t0);
  }
  if (visited !== n) throw new Error('polar sweep never ran');
  return (sum * 2 * Math.PI) / n;
}

/* ══ 路径 ③ —— 多边形裁剪 + 鞋带(画图也用这一份) ═══════════════ */

/** 把多边形裁到半平面 `s > 0`(Sutherland–Hodgman,只裁一条边)。 */
export function clipLeft(poly: readonly Pt[], P: Pt, theta: number): readonly Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i += 1) {
    const A = poly[i]!;
    const B = poly[(i + 1) % n]!;
    const sa = side(P, theta, A);
    const sb = side(P, theta, B);
    if (sa >= 0) out.push(A);
    if ((sa > 0 && sb < 0) || (sa < 0 && sb > 0)) {
      const t = sa / (sa - sb);
      out.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]);
    }
  }
  return out;
}

/** 鞋带公式。 */
export function polygonArea(poly: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const A = poly[i]!;
    const B = poly[(i + 1) % poly.length]!;
    sum += A[0] * B[1] - B[0] * A[1];
  }
  return Math.abs(sum) / 2;
}

/** 路径 ③ 用的边数。左侧、总量、画图,必须都用这一个。 */
export const POLY_N = 720;

/** 路径 ③。⭐ 屏幕上涂的那块色块就是这个多边形 —— 数字和图形同源。 */
export function areaLeftPolygon(s: Shape, P: Pt, theta: number, n = POLY_N): number {
  return polygonArea(clipLeft(boundary(s, n), P, theta));
}

/**
 * ⚠️⚠️ **配套的**总面积:用同一个多边形量出来的,不是 `totalArea` 那个准确值。
 *
 *   第一版把「多边形量出来的左侧」减「准确的总面积」,结果差了 4e-4 ——
 *   720 边内接多边形比椭圆小 1.3e-5(相对),这点偏差**不会在相减时抵消**,
 *   于是 `g` 整体被推离零点,**二分法再怎么细分也收敛到一个错的角度**。
 *
 *   ⭐ 教训:近似量了部分,就必须用同一个近似去量整体。
 *     两边用不同精度的方法,差出来的不是"更准",是**系统性的偏移**。
 *   这样一来 `g(θ + π) = −g(θ)` 在多边形上是**精确**成立的,IVT 的前提干干净净。
 */
export function matchedTotal(s: Shape, n = POLY_N): number {
  return polygonArea(boundary(s, n));
}

/* ══ 那个支点:转过 π,左右对调 ═══════════════════════════════════ */

/** ⭐ 便于阅读的别名 —— 页面上说的 `A(θ)` 就是它。 */
export function areaLeft(s: Shape, P: Pt, theta: number): number {
  return areaLeftPolygon(s, P, theta);
}

/**
 * ⭐⭐ 这一课的全部机关:`g(θ) = 2A(θ) − T`,而 **`g(θ + π) = −g(θ)`**。
 * 于是 `g(0)` 与 `g(π)` 天生异号(或同时为零),端点白送。
 */
export function gap(s: Shape, P: Pt, theta: number): number {
  return 2 * areaLeft(s, P, theta) - matchedTotal(s);
}

/* ══ P 在外面 ⇒ 有一整段角度碰不到图形 ═══════════════════════════ */

export type Hit = 'crosses' | 'misses-left' | 'misses-right';

/**
 * ⭐ 直线左侧由几块组成。
 *
 * ⚠️ 煎饼是**非凸**的,所以一条线可以把它切成三块 —— 左侧就成了两块。
 *   题面写的是「两个区域」,而屏幕上明明是三块 —— 这句话必须由页面自己说出来,
 *   不能让读者以为图画错了。
 *
 * ⭐ 而这不影响论证:介值定理管的是**两个半平面**各占多少面积,
 *   从没要求哪一侧连通。说清楚反而让定理显得更强。
 *
 * 做法:沿闭合边界数「side > 0」的极大连续段。区域单连通时,
 * 每一块左侧恰好对应一段这样的边界弧。
 */
export function leftPieces(s: Shape, P: Pt, theta: number, n = 1440): number {
  return countRuns(boundary(s, n).map((X) => side(P, theta, X) > 0));
}

/**
 * 环形数组里「真」的极大连续段有几段。
 *
 * ⚠️ 单独拆出来,是因为**环绕**那一步在图形层面几乎测不到:
 *   去掉 `(i - 1 + n) % n` 的环绕、改成从 i = 1 起数,变异测试照样活 ——
 *   两者只在「某一段恰好从下标 0 开始」时才不同,而扫角度基本撞不上这种对齐。
 *   拆开之后就能直接把那种排列喂进来。(和 `rayInterval` 是同一个道理。)
 */
export function countRuns(flags: readonly boolean[]): number {
  const n = flags.length;
  if (n === 0) return 0;
  if (flags.every((v) => v)) return 1;
  if (flags.every((v) => !v)) return 0;
  let runs = 0;
  for (let i = 0; i < n; i += 1) if (flags[i] && !flags[(i - 1 + n) % n]) runs += 1;
  return runs;
}

/**
 * 这条线到底碰没碰到图形。
 * ⚠️ 碰不到时,整个图形都在某一侧,`A(θ)` 恰为 `T` 或 `0` —— 图上那两段平台。
 */
export function hitState(s: Shape, P: Pt, theta: number, n = 720): Hit {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const X of boundary(s, n)) {
    const v = side(P, theta, X);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo > 0) return 'misses-left';
  if (hi < 0) return 'misses-right';
  return 'crosses';
}

/**
 * ⭐ 从 P 看过去,图形张开的那两条**切线**方向(角度,弧度)。
 * 画出来学生才明白"平台"是从哪来的:两条切线之间的角度才切得到图形。
 */
export function tangentAngles(s: Shape, P: Pt, n = 2880): readonly [number, number] {
  const base = Math.atan2(s.origin[1] - P[1], s.origin[0] - P[0]);
  let lo = 0;
  let hi = 0;
  for (let i = 0; i < n; i += 1) {
    const X = boundaryAt(s, (2 * Math.PI * i) / n);
    // 相对中心方向的夹角,规约到 (−π, π],这样不会在 ±π 处断开
    let d = Math.atan2(X[1] - P[1], X[0] - P[0]) - base;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    if (d < lo) lo = d;
    if (d > hi) hi = d;
  }
  return [base + lo, base + hi];
}

/* ══ 二分法 —— 介值定理的**构造性**那一半 ═══════════════════════ */

export interface Bisection {
  readonly theta: number;
  readonly steps: number;
  /** 每一步的区间,画在图上看它塌下去 */
  readonly brackets: readonly (readonly [number, number])[];
  readonly residual: number;
}

/**
 * ⭐⭐ 介值定理不只是"存在",它的证明就是**这个过程**:
 *   端点异号 → 取中点 → 保留仍然异号的那一半 → 重复。
 *   区间长度每次减半,必然收敛到一个根。
 *
 * ⚠️ 起点固定取 `[θ₀, θ₀ + π]`,因为**正是这一对端点**被 `g(θ+π) = −g(θ)` 保证异号。
 *   随便挑两个角度是没有这条保证的。
 */
export function bisect(
  s: Shape, P: Pt, theta0 = 0, tol = 1e-9,
  /**
   * ⭐⭐ 区间宽度是**参数**,不是常数 —— 因为它就是这道题的全部内容。
   *   只有 `π` 能让两端天生异号(`g(θ + π) = −g(θ)`);
   *   换成 `2π`,两端是同一条有向直线,`g` 完全相等,IVT 无从谈起。
   *   把它摆成参数,是为了让"只有 π 行"这句话**能被测出来**。
   */
  span = Math.PI,
): Bisection {
  let lo = theta0;
  let hi = theta0 + span;
  let glo = gap(s, P, lo);
  /**
   * ⚠️⚠️ 介值定理的**前提**必须当场验一遍,不能默认它成立。
   *   区间宽度改成 2π 时两端是同一条有向直线,`g` 完全相等 —— 根本没夹住根;
   *   可二分照样会瞎撞出一个零点来,测试还全绿。
   *   宽度**恰好是 π**,才是 `g(θ + π) = −g(θ)` 给的那份保证。
   */
  /**
   * ⚠️ 阈值不能写 0。θ 本身就是根时,两端在浮点意义上都是 ±1e-16,
   *   符号纯看舍入的脸色,乘起来有一半概率为正 —— 那样这道保险会误伤正确的输入。
   *   用 `T²` 作尺度:只有**明显**同号才算前提不成立。
   */
  const T = matchedTotal(s);
  if (glo * gap(s, P, hi) > 1e-12 * T * T) {
    throw new Error('the endpoints do not straddle a root');
  }
  const brackets: [number, number][] = [[lo, hi]];
  if (Math.abs(glo) <= tol) return { theta: lo, steps: 0, brackets, residual: glo };
  let mid = lo;
  let steps = 0;
  for (; steps < 60; steps += 1) {
    mid = (lo + hi) / 2;
    const gm = gap(s, P, mid);
    if (Math.abs(gm) <= tol || hi - lo < 1e-12) break;
    if (glo * gm < 0) hi = mid;
    else { lo = mid; glo = gm; }
    brackets.push([lo, hi]);
  }
  return { theta: mid, steps, brackets, residual: gap(s, P, mid) };
}

/* ══ 椭圆的捷径:过中心那条线 ═══════════════════════════════════ */

/** 由 P 指向某点的方向角,规约到 `[0, π)`(直线没有朝向)。 */
export function angleTo(P: Pt, X: Pt): number {
  const a = Math.atan2(X[1] - P[1], X[0] - P[0]);
  return ((a % Math.PI) + Math.PI) % Math.PI;
}

/**
 * ⭐ 中心对称的图形,平分线**只能**过中心,所以答案一眼可得。
 * ⚠️ 不对称的图形没有这个捷径 —— 而**过形心的直线一般并不平分面积**,
 *   这是学生最容易顺手用错的那个"看起来很像"的东西。
 */
export function centreShortcut(s: Shape, P: Pt): number | null {
  return s.centrallySymmetric ? angleTo(P, s.origin) : null;
}

/** 过形心那条线到底差多少 —— 用来把上面那个误解摆到台面上。 */
export function centroidLineGap(s: Shape, P: Pt): number {
  return gap(s, P, angleTo(P, centroid(s)));
}

/**
 * ⭐ 形心那条线切出来的**比例**,如 0.5035 表示一边占 50.35%。
 *
 * ⚠️ 这个数才是诚实的说法。凸图形有个经典结论:过形心的任何一条直线,
 *   两侧面积之比总落在 4:5 到 5:4 之间 —— 所以它**永远差不太多**。
 *   这块煎饼上只差 0.7%。
 *   ⭐ 而这恰恰是它危险的地方:**它像对的,却不是对的。**
 *     差得离谱的错误没人会信;差 0.7% 的错误才骗得到人。
 */
export function centroidLineShare(s: Shape, P: Pt): number {
  return areaLeft(s, P, angleTo(P, centroid(s))) / matchedTotal(s);
}

/* ══ 画曲线用 ═════════════════════════════════════════════════════ */

/** `g` 在 `[θ₀, θ₀ + π]` 上的取样 —— 平台与过零点都要看得见。 */
export function gapCurve(
  s: Shape, P: Pt, theta0 = 0, n = 180,
): readonly { theta: number; g: number }[] {
  const out: { theta: number; g: number }[] = [];
  for (let i = 0; i <= n; i += 1) {
    const theta = theta0 + (Math.PI * i) / n;
    out.push({ theta, g: gap(s, P, theta) });
  }
  return out;
}

/* ══ 显示 ═════════════════════════════════════════════════════════ */

/**
 * ⭐⭐ 这一课的**标题就是论点**:IVT 要三样东西,难的是第三样。
 * ⚠️ 放在模块里而不是组件里 —— 禁止 2:组件不自己写内容。
 */
export interface Need {
  readonly n: string;
  readonly what: string;
  /** 这一条难不难拿到 */
  readonly hard: boolean;
  readonly here: string;
}

export const IVT_NEEDS: readonly Need[] = [
  {
    n: '1',
    what: 'a continuous function',
    hard: false,
    here: 'Area on one side of the line. Turn the line a little, the area moves a little.',
  },
  {
    n: '2',
    what: 'two specific inputs',
    hard: false,
    here: 'θ and θ + π. Not "some a and some b" — these two.',
  },
  {
    n: '3',
    what: 'a reason the values have opposite signs',
    hard: true,
    here: 'Rotating a directed line by π gives back the same line with left and right swapped. So g(θ + π) = −g(θ), and the two ends are negatives of each other before you compute anything.',
  },
] as const;

export const NEEDS_NOTE =
  'Most write-ups stop after the first two and assert the third. The third is the entire problem — and here it costs nothing, because the construction hands it to you.';

export const HEADLINE = 'Turn the Line Halfway Around and the Two Sides Trade Places';
export const MAIN_IDEA =
  'That is the whole proof. Rotating a directed line by π gives back the same line with left and right swapped, so the difference in area at θ and at θ + π are negatives of each other. Opposite signs, continuous function, done.';

export const WHY_ENDPOINTS =
  'The hard part of an IVT argument is never continuity — it is producing two inputs where the function has opposite signs. Here you do not have to search for them: θ and θ + π are handed to you with opposite signs by symmetry of the construction itself.';

export const OUTSIDE_NOTE =
  'P sitting outside the shape only means that some lines through P miss it completely. On those angles the difference is stuck at plus or minus the whole area — the flat stretches below. Nothing in the argument notices.';

export const CENTROID_TRAP =
  'A line through the centroid balances the shape, but balancing is about moment, not area, and these are not the same thing. For a convex shape the miss is always small — never worse than 5:4 — which is exactly what makes it dangerous. A shortcut that is wrong by a mile gets caught. This one lands within a percent and still is not the answer.';

export function show(v: number | null, places = 4): string {
  return v === null || !Number.isFinite(v) ? 'undefined' : showNumber(v, places);
}
