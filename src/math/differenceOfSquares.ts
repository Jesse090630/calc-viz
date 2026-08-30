/**
 * MATH — 平方差 `a² − b² = (a − b)(a + b)`,用**剪拼**来证。
 *
 * ⭐⭐ 这一节的说服力不在公式,在**面积没变**这件事:
 *   大正方形挖掉小正方形,剩下一个 L 形;把 L 形切成两块,
 *   其中一块转 90° 挪到另一块旁边,拼成一个 `(a+b) × (a−b)` 的长方形。
 *   没有新增、没有丢失,所以两个面积必须相等。
 *
 * ⚠️ 「拼得上」不是我说的,是**验出来**的:`tilesExactly` 在目标长方形里外撒点,
 * 断言里面每个点被**恰好一块**盖住、外面每个点一块也不被盖住。
 * 剪拼证明一旦有重叠或空隙就什么都没证明了 —— 那正是这类图最容易出的错。
 *
 * ⭐ 三条独立路径算同一个面积:
 *   ① `a*a - b*b`     —— 定义
 *   ② 两块碎片的面积相加 —— 几何
 *   ③ `(a-b)*(a+b)`   —— 因式
 * 三者对整数必须**精确**相等(不是 toBeCloseTo)。
 *
 * ⚠️ a、b 取整数。界面上画单位格,学生能**数**出 40 个方格 ——
 * 「面积是 40」于是不是一个被告知的数字,是一个能数的事实。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

export const RANGE = { min: 1, max: 12 } as const;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** 拼图的一块:起始位置、终点中心、要转多少度。 */
export interface Piece {
  readonly id: 'top' | 'side';
  readonly start: Rect;
  /** 终点时的中心 */
  readonly end: Point;
  /** 终点时相对起始的旋转角(度)。0 表示只平移。 */
  readonly turn: number;
  /** 两条边在界面上怎么标 */
  readonly labels: readonly { readonly tex: string; readonly value: number }[];
}

/* ══ 取值 ══════════════════════════════════════════════════════════ */

/**
 * 夹住到 `a > b > 0`，两个都是整数。
 * ⚠️ `a === b` 会让 L 形退化成空集、目标长方形高度为 0 —— 界面上什么都没有,
 * 而学生完全可能把两条滑块拖到一起。所以这里**保证** a 至少比 b 大 1。
 */
export function clampPair(a: number, b: number): { a: number; b: number } {
  const safeA = Math.round(Number.isFinite(a) ? a : 7);
  const safeB = Math.round(Number.isFinite(b) ? b : 3);
  const clampedA = Math.min(Math.max(safeA, RANGE.min + 1), RANGE.max);
  const clampedB = Math.min(Math.max(safeB, RANGE.min), clampedA - 1);
  return { a: clampedA, b: clampedB };
}

/* ══ 面积:三条独立路径 ════════════════════════════════════════════ */

export function bigArea(a: number): number {
  return a * a;
}

export function smallArea(b: number): number {
  return b * b;
}

/** 路径 ① —— 定义:大的减小的。 */
export function remainingArea(a: number, b: number): number {
  return bigArea(a) - smallArea(b);
}

/** 路径 ③ —— 因式:两个括号相乘。 */
export function areaByFactors(a: number, b: number): number {
  return (a - b) * (a + b);
}

/* ══ 剪拼 ══════════════════════════════════════════════════════════ */

/**
 * 大正方形是 `[0,a] × [0,a]`,挖掉的小正方形在**左下角** `[0,b] × [0,b]`。
 * 沿 `y = b` 横切一刀,得到两块:
 *   top  = `[0,a] × [b,a]`  →  `a × (a−b)`
 *   side = `[b,a] × [0,b]`  →  `(a−b) × b`
 *
 * ⚠️ 坐标是**数学坐标**(y 向上)。翻转只在 `viewport.ts` 里发生。
 */
export function pieces(a: number, b: number): readonly [Piece, Piece] {
  const top: Piece = {
    id: 'top',
    start: { x: 0, y: b, w: a, h: a - b },
    // 终点:躺在目标长方形的左边,占 [0,a] × [0,a−b]
    end: { x: a / 2, y: (a - b) / 2 },
    turn: 0,
    labels: [
      { tex: 'a', value: a },
      { tex: 'a - b', value: a - b },
    ],
  };
  const side: Piece = {
    id: 'side',
    start: { x: b, y: 0, w: a - b, h: b },
    // 终点:转 90° 之后是 b 宽、(a−b) 高,贴在 top 的右边,占 [a, a+b] × [0, a−b]
    end: { x: a + b / 2, y: (a - b) / 2 },
    turn: 90,
    labels: [
      { tex: 'a - b', value: a - b },
      { tex: 'b', value: b },
    ],
  };
  return [top, side];
}

/** 拼好之后的长方形:`(a+b)` 宽、`(a−b)` 高。 */
export function targetRect(a: number, b: number): Rect {
  return { x: 0, y: 0, w: a + b, h: a - b };
}

export function pieceArea(piece: Piece): number {
  return piece.start.w * piece.start.h;
}

/** 路径 ② —— 几何:两块碎片的面积相加。 */
export function areaByPieces(a: number, b: number): number {
  return pieces(a, b).reduce((sum, piece) => sum + pieceArea(piece), 0);
}

function centreOf(rect: Rect): Point {
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** 动画进度 `t ∈ [0,1]` 时这一块在哪、转了多少。 */
export function placeAt(piece: Piece, t: number): { centre: Point; turn: number } {
  const clamped = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), 1);
  const from = centreOf(piece.start);
  return {
    centre: {
      x: from.x + (piece.end.x - from.x) * clamped,
      y: from.y + (piece.end.y - from.y) * clamped,
    },
    turn: piece.turn * clamped,
  };
}

/** 一块在进度 t 时的四个角(绕自身中心旋转)。 */
export function cornersAt(piece: Piece, t: number): readonly Point[] {
  const { centre, turn } = placeAt(piece, t);
  const radians = (turn * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const hw = piece.start.w / 2;
  const hh = piece.start.h / 2;
  return [
    [-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh],
  ].map(([dx, dy]) => ({
    x: centre.x + dx! * cos - dy! * sin,
    y: centre.y + dx! * sin + dy! * cos,
  }));
}

function boundsAt(piece: Piece, t: number): { x0: number; x1: number; y0: number; y1: number } {
  const corners = cornersAt(piece, t);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** 点在这一块里吗(t 时刻)。旋转只有 0° 与 90°,所以退化成一个轴对齐的框。 */
export function containsAt(piece: Piece, t: number, point: Point): boolean {
  const { x0, x1, y0, y1 } = boundsAt(piece, t);
  const EPS = 1e-9;
  return point.x >= x0 - EPS && point.x <= x1 + EPS && point.y >= y0 - EPS && point.y <= y1 + EPS;
}

/**
 * ⚠️ 覆盖计数专用的**半开**版本:`[x0, x1) × [y0, y1)`。
 *
 * 闭区间版本在**公共边**上会把一个点算给两块。
 * (a, b) = (9, 7) 时目标长方形宽 16、撒 24 个点,第 14 个点正好落在 x = 9 ——
 * 两块的接缝上 —— 于是"恰好被一块盖住"判成 false,一个**完全正确**的剪拼被判成拼不上。
 * 半开区间让每条接缝只属于一块,这是铺砌判定的标准做法。
 * `containsAt` 保持闭区间不动:界面上判"鼠标在哪一块上"时,边界算在里面才自然。
 */
function coveredCount(list: readonly Piece[], t: number, point: Point): number {
  return list.reduce((count, piece) => {
    const { x0, x1, y0, y1 } = boundsAt(piece, t);
    const inside = point.x >= x0 && point.x < x1 && point.y >= y0 && point.y < y1;
    return count + Number(inside);
  }, 0);
}

/**
 * ⭐⭐ 剪拼证明的**全部前提**:拼好之后既不重叠也不留缝。
 *
 * 在目标长方形内部撒点,每个点必须被**恰好一块**盖住;
 * 在外面撒一圈点,一块也不许盖到。
 * 只断言「两块面积之和等于目标面积」是**不够**的 ——
 * 面积对得上但互相重叠、外面还露一块,那种图看起来对、其实什么都没证明。
 */
export function tilesExactly(a: number, b: number, steps = 24): boolean {
  const target = targetRect(a, b);
  const [top, side] = pieces(a, b);
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps; j += 1) {
      const point = {
        x: target.x + (target.w * (i + 0.5)) / steps,
        y: target.y + (target.h * (j + 0.5)) / steps,
      };
      if (coveredCount([top, side], 1, point) !== 1) return false;
    }
  }
  // 外面一圈:上下左右各推出去一点
  const outside: Point[] = [];
  for (let i = 0; i < steps; i += 1) {
    const alongX = target.x + (target.w * (i + 0.5)) / steps;
    const alongY = target.y + (target.h * (i + 0.5)) / steps;
    outside.push({ x: alongX, y: target.y - 0.3 }, { x: alongX, y: target.y + target.h + 0.3 });
    outside.push({ x: target.x - 0.3, y: alongY }, { x: target.x + target.w + 0.3, y: alongY });
  }
  return outside.every((point) => coveredCount([top, side], 1, point) === 0);
}

/**
 * 起始状态也得是对的:两块必须**恰好**铺满 L 形。
 * 判据:大正方形里、且不在挖掉的小正方形里的点,被恰好一块盖住;
 * 小正方形里的点,一块也不被盖住。
 */
export function coversTheLShape(a: number, b: number, steps = 24): boolean {
  const [top, side] = pieces(a, b);
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps; j += 1) {
      const point = { x: (a * (i + 0.5)) / steps, y: (a * (j + 0.5)) / steps };
      const inHole = point.x < b && point.y < b;
      const covered = coveredCount([top, side], 0, point);
      if (inHole ? covered !== 0 : covered !== 1) return false;
    }
  }
  return true;
}

/* ══ 代数模式 ══════════════════════════════════════════════════════ */

export interface Term {
  readonly tex: string;
  readonly sign: 1 | -1;
  /** 中间那两项会互相抵消 */
  readonly cancels: boolean;
  readonly at: (a: number, b: number) => number;
}

/**
 * `(a − b)(a + b)` 逐项展开。
 * ⚠️ 顺序就是分配律的顺序:a·a、a·b、−b·a、−b·b。
 * 界面上按这个顺序露出来,中间两项才看得出是**一对**。
 */
export const EXPANSION: readonly Term[] = [
  { tex: 'a^2', sign: 1, cancels: false, at: (a) => a * a },
  { tex: 'ab', sign: 1, cancels: true, at: (a, b) => a * b },
  { tex: 'ab', sign: -1, cancels: true, at: (a, b) => a * b },
  { tex: 'b^2', sign: -1, cancels: false, at: (_a, b) => b * b },
];

/** 展开式逐项求和 —— 又一条独立路径。 */
export function expandedValue(a: number, b: number): number {
  return EXPANSION.reduce((sum, term) => sum + term.sign * term.at(a, b), 0);
}

/** 抵消之后剩下的那几项。 */
export function survivingTerms(): readonly Term[] {
  return EXPANSION.filter((term) => !term.cancels);
}

export const CANCEL_WORDS = 'The middle terms cancel.';

/* ══ 认形状 ════════════════════════════════════════════════════════ */

export interface Pattern {
  readonly id: string;
  readonly tex: string;
  /** 谁是 a、谁是 b */
  readonly aTex: string;
  readonly bTex: string;
  /** 为什么这一项是个平方 */
  readonly aWhy: string;
  readonly bWhy: string;
  readonly asSquaresTex: string;
  readonly factoredTex: string;
  /** 两条**独立求值**的路径,用来数值核对 */
  readonly original: (x: number) => number;
  readonly factored: (x: number) => number;
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'x2-25',
    tex: 'x^2 - 25',
    aTex: 'x',
    bTex: '5',
    aWhy: 'x is already a square root of x²',
    bWhy: '25 = 5²',
    asSquaresTex: 'x^2 - 5^2',
    factoredTex: '(x - 5)(x + 5)',
    original: (x) => x * x - 25,
    factored: (x) => (x - 5) * (x + 5),
  },
  {
    id: '9x2-16',
    tex: '9x^2 - 16',
    aTex: '3x',
    bTex: '4',
    aWhy: '9x² = (3x)²',
    bWhy: '16 = 4²',
    asSquaresTex: '(3x)^2 - 4^2',
    factoredTex: '(3x - 4)(3x + 4)',
    original: (x) => 9 * x * x - 16,
    factored: (x) => (3 * x - 4) * (3 * x + 4),
  },
  {
    id: '49-y2',
    tex: '49 - y^2',
    aTex: '7',
    bTex: 'y',
    aWhy: '49 = 7²',
    bWhy: 'y is already a square root of y²',
    asSquaresTex: '7^2 - y^2',
    factoredTex: '(7 - y)(7 + y)',
    original: (y) => 49 - y * y,
    factored: (y) => (7 - y) * (7 + y),
  },
];

export function patternOf(id: string): Pattern {
  const found = PATTERNS.find((p) => p.id === id);
  if (!found) throw new Error(`no such pattern: ${id}`);
  return found;
}

/** 原式与因式在同一个 x 上必须给出同一个数。 */
export function patternHolds(id: string, xs: readonly number[] = [-4, -1.5, 0, 2, 3.7, 11]): boolean {
  const pattern = patternOf(id);
  return xs.every((x) => Math.abs(pattern.original(x) - pattern.factored(x)) < 1e-9);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Cut the Square';
export const MAIN_IDEA = 'Nothing was added and nothing was thrown away — so the two areas must be equal.';

export function squaresTex(a: number, b: number): string {
  return `${a}^2 - ${b}^2`;
}

export function factorsTex(a: number, b: number): string {
  return `(${a} - ${b})(${a} + ${b})`;
}

/**
 * ⚠️ 下面两个是**纯文本**,不是 TeX —— 它们被当成小字说明直接渲染。
 * 第一版里 `productTex` 写的是 `4 \\times 10 = 40`,页面上就原样显示
 * `4 \times 10 = 40`(截图上一眼看见的)。
 * 名字改成 `…Plain`,并有测试钉住它们不含反斜杠:
 * **同一个字符串既当 TeX 又当散文用,总有一头是错的。**
 */
export function numbersPlain(a: number, b: number): string {
  return `${bigArea(a)} − ${smallArea(b)} = ${remainingArea(a, b)}`;
}

export function productPlain(a: number, b: number): string {
  return `${a - b} × ${a + b} = ${areaByFactors(a, b)}`;
}

/* ══ 分幕:把证明拆成五个动作 ══════════════════════════════════════ */

/**
 * ⭐⭐ 每一幕对应**一个数学操作**,不是一段好看的动画。
 * 这张表把两者绑在一起 —— 界面上就把 `operation` 写在画面旁边,
 * 于是「为什么这里要动一下」有答案,而不是"动一下比较好看"。
 */
export type StageId = 'build' | 'remove' | 'cut' | 'rearrange' | 'factor';

export type Operation =
  | 'multiplication'
  | 'subtraction'
  | 'decomposition'
  | 'rearrangement'
  | 'addition';

export interface Stage {
  readonly id: StageId;
  /** 进度条上的短标签 */
  readonly label: string;
  /** 这一幕**是**哪个运算 */
  readonly operation: Operation;
  /** 一句话:画面上正在发生什么 */
  readonly caption: string;
}

export const STAGES: readonly Stage[] = [
  {
    id: 'build',
    label: 'Build',
    operation: 'multiplication',
    caption: 'A side of a, times a side of a. Area is multiplication.',
  },
  {
    id: 'remove',
    label: 'Remove',
    operation: 'subtraction',
    caption: 'Taking the small square away is the minus sign.',
  },
  {
    id: 'cut',
    label: 'Cut',
    operation: 'decomposition',
    caption: 'One cut, two rectangles. Nothing has been added or lost.',
  },
  {
    id: 'rearrange',
    label: 'Rearrange',
    operation: 'rearrangement',
    caption: 'Same two pieces, moved. Moving cannot change area.',
  },
  {
    id: 'factor',
    label: 'Factor',
    operation: 'addition',
    caption: 'The long side is a and b joined end to end.',
  },
];

export const STAGE_COUNT = STAGES.length;

export function stageIndex(id: StageId): number {
  return STAGES.findIndex((stage) => stage.id === id);
}

export function stageAt(index: number): Stage {
  const clamped = Math.min(Math.max(Math.round(index), 0), STAGE_COUNT - 1);
  return STAGES[clamped]!;
}

/**
 * 全局进度 `g ∈ [0, STAGE_COUNT]`。
 *
 * ⚠️⚠️ **整数约定:`g` 是「已经走完几幕」。**
 * 于是 `g = 1` 读作「第一幕走完」(index 0,局部进度 1),
 * **不是**「第二幕刚开始」。这两件事在时间轴上是同一个瞬间,必须挑一个 ——
 * 挑「上一幕走完」,因为手动一幕一幕点的时候,人要看的是**那一幕的完成态**。
 *
 * 第一版用 `Math.floor`,于是点一下 Next 从第一幕跳到 `g = 1`、
 * 却被读成第二幕的开头 —— 五幕只走得到四幕,而且每一幕都少看了它的结尾。
 * (浏览器检查报「Next landed on stage 1, expected 0」时发现的。)
 */
export function currentIndex(global: number): number {
  if (!Number.isFinite(global)) return 0;
  const g = Math.min(Math.max(global, 0), STAGE_COUNT);
  if (g <= 0) return 0;
  return Math.min(Math.ceil(g) - 1, STAGE_COUNT - 1);
}

export function localProgress(global: number, index = currentIndex(global)): number {
  if (!Number.isFinite(global)) return 0;
  if (global >= index + 1) return 1;
  if (global <= index) return 0;
  return global - index;
}

/** 第 index 幕、幕内进度 local 时的全局进度。 */
export function globalFor(index: number, local = 0): number {
  const clamped = Math.min(Math.max(Math.round(index), 0), STAGE_COUNT - 1);
  return clamped + Math.min(Math.max(local, 0), 1);
}

/**
 * 幕内的**小节**:把 [0,1] 切成几段,返回某一段自己的 0→1 进度。
 * ⚠️ 用它而不是到处写 `Math.min(1, (p - 0.3) / 0.2)` ——
 * 那种式子写十遍就会有一遍边界写错,而边界写错的表现是"某个东西闪一下"。
 */
export function beat(p: number, from: number, to: number): number {
  if (!Number.isFinite(p) || to <= from) return p >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (p - from) / (to - from)));
}

/* ══ 第一幕:四条边把自己画出来 ════════════════════════════════════ */

export interface Segment {
  readonly from: Point;
  readonly to: Point;
}

/** 大正方形的四条边,按画的顺序:下 → 右 → 上 → 左。 */
export function edgesOf(a: number): readonly Segment[] {
  return [
    { from: { x: 0, y: 0 }, to: { x: a, y: 0 } },
    { from: { x: a, y: 0 }, to: { x: a, y: a } },
    { from: { x: a, y: a }, to: { x: 0, y: a } },
    { from: { x: 0, y: a }, to: { x: 0, y: 0 } },
  ];
}

/**
 * 第 index 条边在整体进度 p 下画到了哪儿(0 = 还没开始,1 = 画完)。
 * 四条边**依次**画,不是一起长出来 —— 一起长看起来像淡入,不像"画"。
 */
export function edgeDrawn(index: number, p: number): number {
  const each = 1 / 4;
  return beat(p, index * each, (index + 1) * each);
}

/** 一条边画到 t 时的终点。 */
export function partialEnd(segment: Segment, t: number): Point {
  const clamped = Math.min(Math.max(Number.isFinite(t) ? t : 0, 0), 1);
  return {
    x: segment.from.x + (segment.to.x - segment.from.x) * clamped,
    y: segment.from.y + (segment.to.y - segment.from.y) * clamped,
  };
}

/* ══ 尺寸括号 ══════════════════════════════════════════════════════ */

export interface Bracket {
  readonly from: number;
  readonly to: number;
  readonly label: string;
  readonly value: number;
}

/**
 * 「厚度是 a − b」那个括号:从 b **长到** a,而不是直接标一个数。
 * `grow ∈ [0,1]` 控制它伸到哪儿。
 */
export function thicknessBracket(a: number, b: number, grow: number): Bracket {
  const t = Math.min(Math.max(Number.isFinite(grow) ? grow : 0, 0), 1);
  return { from: b, to: b + (a - b) * t, label: 'a - b', value: a - b };
}

/**
 * 最后那条长边:`a` 与 `b` 两段先各自出现,再合成一段 `a + b`。
 * `join ∈ [0,1]`:0 = 两段分开,1 = 合成一条。
 */
export function longSideBrackets(a: number, b: number, join: number): readonly Bracket[] {
  const t = Math.min(Math.max(Number.isFinite(join) ? join : 0, 0), 1);
  if (t >= 1) return [{ from: 0, to: a + b, label: 'a + b', value: a + b }];
  return [
    { from: 0, to: a, label: 'a', value: a },
    { from: a, to: a + b, label: 'b', value: b },
  ];
}

/* ══ 第三幕:切开之后先分开一点点 ══════════════════════════════════ */

/** 切开时两块各自推开多远(数学单位)。 */
export const CUT_GAP = 0.35;

/**
 * ⚠️ 第三幕「切开」只把两块**推开一点点**,不做重排 ——
 * 那是第四幕的事。两件事混在一幕里,学生就分不清"切"和"挪"哪一步改变了什么
 * (答案是:两步都没有改变面积,而这正是要让人看清的)。
 */
export function cutOffset(piece: Piece, separate: number): Point {
  const t = Math.min(Math.max(Number.isFinite(separate) ? separate : 0, 0), 1);
  return piece.id === 'top'
    ? { x: 0, y: CUT_GAP * t }
    : { x: CUT_GAP * t, y: -CUT_GAP * t };
}

/** 那一刀本身:沿 `y = b`,从 x = 0 划到 x = a。 */
export function cutLine(a: number, b: number, draw: number): Segment {
  const t = Math.min(Math.max(Number.isFinite(draw) ? draw : 0, 0), 1);
  return { from: { x: 0, y: b }, to: { x: a * t, y: b } };
}

/* ══ 每一幕该显示哪个式子 ══════════════════════════════════════════ */

/**
 * ⭐ 面积表达式**跟着幕走**:先是 `a²`,拿掉小正方形之后才变成 `a² − b²`,
 * 而 `(a−b)(a+b)` 要到重排完成才出现,`=` 要到最后一幕才出现。
 * ⚠️ 这个顺序是这一课的全部纪律:等号是**结论**,不是布景。
 */
export function areaTexAt(global: number): string {
  const index = currentIndex(global);
  const local = localProgress(global, index);
  if (index === 0) return local > 0.55 ? 'a^2' : '';
  if (index === 1) return local > 0.85 ? 'a^2 - b^2' : 'a^2';
  if (index < 4) return 'a^2 - b^2';
  return local > 0.4 ? '(a - b)(a + b)' : 'a^2 - b^2';
}

/** 等号那一行。⚠️ 只有走完最后一幕才返回非空。 */
export function identityTexAt(global: number): string {
  const index = currentIndex(global);
  const local = localProgress(global, index);
  return index === STAGE_COUNT - 1 && local > 0.7 ? 'a^2 - b^2 = (a - b)(a + b)' : '';
}

/** 重排的进度只在第四幕里推进。 */
export function rearrangeProgress(global: number): number {
  const index = currentIndex(global);
  if (index < 3) return 0;
  if (index > 3) return 1;
  return localProgress(global, 3);
}

export const SAME_PIECES = 'SAME PIECES · SAME AREA';

export const OPERATION_WORDS: Readonly<Record<Operation, string>> = {
  multiplication: 'area = multiplication',
  subtraction: 'remove = subtraction',
  decomposition: 'cut = decomposition',
  rearrangement: 'move = rearrangement',
  addition: 'join = addition',
};
