/**
 * MATH — 立方差 `a³ − b³ = (a − b)(a² + ab + b²)`,用**切块**来证。
 *
 * ⭐⭐ 这一课要回答的问题只有一个:**第二个因子为什么长得那么怪?**
 * 答案是:大立方体挖掉角上的小立方体,剩下的壳可以切成**三块长方体**,
 * 三块的厚度**都是 `a − b`**,而三块的截面分别是 `a²`、`ab`、`b²`。
 * 把公共的 `a − b` 提出来,剩下的就是那个"怪"因子 —— 它不怪,它是三块截面之和。
 *
 * 切法(大立方体 `[0,a]³`,挖掉角上的 `[0,b]³`):
 *   P1 = [b,a] × [0,a] × [0,a]   →  (a−b) · a · a   截面 a²
 *   P2 = [0,b] × [b,a] × [0,a]   →  b · (a−b) · a   截面 ab
 *   P3 = [0,b] × [0,b] × [b,a]   →  b · b · (a−b)   截面 b²
 *
 * ⚠️ 「切得开」不是我说的,是**验出来**的:`partitionsExactly` 在大立方体里撒点,
 * 断言洞里的点一块也不被盖住、洞外的点被**恰好一块**盖住。
 * 三块重叠或漏一块的话,面积照样能凑对 —— 那种图什么都没证明。
 *
 * ⚠️ 每块都恰好含一个 `a − b` 边长。这一点单独写成断言(`commonEdge`),
 * 因为"提公因子"在图上就是这件事。
 *
 * 禁止 1:这个文件不 import react / three / katex / zustand。
 */

export const RANGE = { min: 1, max: 9 } as const;

export type Sign = 'difference' | 'sum';

export interface Box {
  readonly id: 'slab' | 'panel' | 'stick';
  /** 数学坐标下的最小角 */
  readonly at: readonly [number, number, number];
  readonly size: readonly [number, number, number];
  /** 这一块的截面在代数里对应哪一项 */
  readonly termTex: string;
  readonly termValue: number;
  /** 哪一条边是公共的 `a − b` */
  readonly commonAxis: 0 | 1 | 2;
}

/* ══ 取值 ══════════════════════════════════════════════════════════ */

export function clampPair(a: number, b: number): { a: number; b: number } {
  const safeA = Math.round(Number.isFinite(a) ? a : 5);
  const safeB = Math.round(Number.isFinite(b) ? b : 2);
  const clampedA = Math.min(Math.max(safeA, RANGE.min + 1), RANGE.max);
  const clampedB = Math.min(Math.max(safeB, RANGE.min), clampedA - 1);
  return { a: clampedA, b: clampedB };
}

/* ══ 体积:三条独立路径 ════════════════════════════════════════════ */

export function bigVolume(a: number): number {
  return a * a * a;
}

export function smallVolume(b: number): number {
  return b * b * b;
}

/** 路径 ① —— 定义。 */
export function remainingVolume(a: number, b: number): number {
  return bigVolume(a) - smallVolume(b);
}

/** 路径 ③ —— 因式。 */
export function volumeByFactors(a: number, b: number): number {
  return (a - b) * (a * a + a * b + b * b);
}

/* ══ 三块 ══════════════════════════════════════════════════════════ */

export function boxes(a: number, b: number): readonly [Box, Box, Box] {
  return [
    {
      id: 'slab',
      at: [b, 0, 0],
      size: [a - b, a, a],
      termTex: 'a^2',
      termValue: a * a,
      commonAxis: 0,
    },
    {
      id: 'panel',
      at: [0, b, 0],
      size: [b, a - b, a],
      termTex: 'ab',
      termValue: a * b,
      commonAxis: 1,
    },
    {
      id: 'stick',
      at: [0, 0, b],
      size: [b, b, a - b],
      termTex: 'b^2',
      termValue: b * b,
      commonAxis: 2,
    },
  ];
}

export function boxVolume(box: Box): number {
  return box.size[0] * box.size[1] * box.size[2];
}

/** 路径 ② —— 几何:三块相加。 */
export function volumeByBoxes(a: number, b: number): number {
  return boxes(a, b).reduce((sum, box) => sum + boxVolume(box), 0);
}

/**
 * ⭐ 每一块都恰好有一条边等于 `a − b`,而另外两条边的乘积就是它的截面。
 * 这条断言就是"三块可以同时提出 (a − b)"在几何上的说法。
 */
export function commonEdge(box: Box, a: number, b: number): boolean {
  return Math.abs(box.size[box.commonAxis]! - (a - b)) < 1e-12;
}

export function crossSection(box: Box): number {
  return boxVolume(box) / box.size[box.commonAxis]!;
}

/**
 * ⭐⭐ 三块**恰好**铺满那层壳。
 * 洞里的点一块也不许被盖到;洞外、立方体内的点被恰好一块盖住。
 * ⚠️ 用**半开**区间计数,否则公共面上的点会被算给两块
 * (平方差那一节踩过同一个坑,原因见 `differenceOfSquares.ts`)。
 */
function coveredCount(list: readonly Box[], point: readonly [number, number, number]): number {
  return list.reduce((count, box) => {
    const inside = box.at.every((min, axis) => {
      const value = point[axis]!;
      return value >= min && value < min + box.size[axis]!;
    });
    return count + Number(inside);
  }, 0);
}

export function partitionsExactly(a: number, b: number, steps = 12): boolean {
  const list = boxes(a, b);
  for (let i = 0; i < steps; i += 1) {
    for (let j = 0; j < steps; j += 1) {
      for (let k = 0; k < steps; k += 1) {
        const point: readonly [number, number, number] = [
          (a * (i + 0.5)) / steps,
          (a * (j + 0.5)) / steps,
          (a * (k + 0.5)) / steps,
        ];
        const inHole = point.every((value) => value < b);
        const covered = coveredCount(list, point);
        if (inHole ? covered !== 0 : covered !== 1) return false;
      }
    }
  }
  // 立方体外面一层:一块也不许伸出去
  const outside: (readonly [number, number, number])[] = [];
  for (let i = 0; i < steps; i += 1) {
    const along = (a * (i + 0.5)) / steps;
    outside.push([-0.3, along, along], [a + 0.3, along, along]);
    outside.push([along, -0.3, along], [along, a + 0.3, along]);
    outside.push([along, along, -0.3], [along, along, a + 0.3]);
  }
  return outside.every((point) => coveredCount(list, point) === 0);
}

/* ══ 等距投影 ══════════════════════════════════════════════════════ */

/**
 * 等距投影。⚠️ 用 SVG,不拉 Three.js 进来 ——
 * 这一页只需要看清三块怎么摆,背上一个 3D 引擎(gzip 241 kB)不值当。
 * (`src/labs/` 的架构测试也不允许。)
 */
export function project(
  point: readonly [number, number, number],
  scale = 1,
): { x: number; y: number } {
  const [x, y, z] = point;
  const COS30 = Math.cos(Math.PI / 6);
  const SIN30 = Math.sin(Math.PI / 6);
  return {
    x: (x - y) * COS30 * scale,
    y: (x + y) * SIN30 * scale - z * scale,
  };
}

/** 一块长方体的三个可见面(顶、左、右),每个面四个顶点。 */
export function facesOf(box: Box, explode = 0, scale = 1): readonly {
  readonly kind: 'top' | 'left' | 'right';
  readonly points: readonly { x: number; y: number }[];
}[] {
  const push = explode * 0.55;
  const ox = box.at[0] + (box.commonAxis === 0 ? push : 0);
  const oy = box.at[1] + (box.commonAxis === 1 ? push : 0);
  const oz = box.at[2] + (box.commonAxis === 2 ? push : 0);
  const [w, d, h] = box.size;
  const corner = (dx: number, dy: number, dz: number) =>
    project([ox + dx * w, oy + dy * d, oz + dz * h], scale);
  return [
    { kind: 'top', points: [corner(0, 0, 1), corner(1, 0, 1), corner(1, 1, 1), corner(0, 1, 1)] },
    { kind: 'left', points: [corner(0, 0, 0), corner(0, 1, 0), corner(0, 1, 1), corner(0, 0, 1)] },
    { kind: 'right', points: [corner(0, 0, 0), corner(1, 0, 0), corner(1, 0, 1), corner(0, 0, 1)] },
  ];
}

/**
 * 画的顺序:远的先画。
 * ⚠️ 等距投影里"远"按 `x + y + z` 排 —— 和越小越远。
 * 顺序反了就会看到里面的块盖在外面的块上,整张图立刻不像立体。
 */
export function drawOrder(list: readonly Box[]): readonly Box[] {
  return [...list].sort((p, q) => {
    const depth = (box: Box) => box.at[0] + box.at[1] + box.at[2];
    return depth(p) - depth(q);
  });
}

/* ══ 代数:逐项展开与抵消 ══════════════════════════════════════════ */

export interface Term {
  readonly tex: string;
  readonly sign: 1 | -1;
  readonly cancels: boolean;
  readonly at: (a: number, b: number) => number;
}

/** `a(a² + ab + b²)` 的三项。 */
export const FIRST_HALF: readonly Term[] = [
  { tex: 'a^3', sign: 1, cancels: false, at: (a) => a ** 3 },
  { tex: 'a^2b', sign: 1, cancels: true, at: (a, b) => a * a * b },
  { tex: 'ab^2', sign: 1, cancels: true, at: (a, b) => a * b * b },
];

/** `−b(a² + ab + b²)` 的三项。 */
export const SECOND_HALF: readonly Term[] = [
  { tex: 'a^2b', sign: -1, cancels: true, at: (a, b) => a * a * b },
  { tex: 'ab^2', sign: -1, cancels: true, at: (a, b) => a * b * b },
  { tex: 'b^3', sign: -1, cancels: false, at: (_a, b) => b ** 3 },
];

export const EXPANSION: readonly Term[] = [...FIRST_HALF, ...SECOND_HALF];

/** 路径 ④ —— 展开式逐项求和。 */
export function expandedValue(a: number, b: number): number {
  return EXPANSION.reduce((sum, term) => sum + term.sign * term.at(a, b), 0);
}

export function survivingTerms(): readonly Term[] {
  return EXPANSION.filter((term) => !term.cancels);
}

/** 抵消掉的那两对,按 tex 分组。 */
export function cancellingPairs(): readonly string[] {
  return [...new Set(EXPANSION.filter((t) => t.cancels).map((t) => t.tex))];
}

export const WHY_WEIRD =
  'The second factor is exactly what makes every mixed term cancel. Drop one piece of it and something survives that should not.';

/* ══ 立方和:同一套东西,换一个符号 ════════════════════════════════ */

/**
 * ⚠️ `a³ + b³ = (a + b)(a² − ab + b²)`。
 * 界面上作为**可选**的伴生模式,而且只在学生看过展开之后才给 —— 提示词点名:
 * 助记口诀不能当成主要教法。
 */
export const SIGNS: Readonly<Record<Sign, {
  readonly title: string;
  readonly leftTex: string;
  readonly factoredTex: string;
  readonly firstFactorTex: string;
  readonly secondFactorTex: string;
  readonly at: (a: number, b: number) => number;
  readonly byFactors: (a: number, b: number) => number;
}>> = {
  difference: {
    title: 'Difference of cubes',
    leftTex: 'a^3 - b^3',
    factoredTex: 'a^3 - b^3 = (a - b)(a^2 + ab + b^2)',
    firstFactorTex: 'a - b',
    secondFactorTex: 'a^2 + ab + b^2',
    at: (a, b) => a ** 3 - b ** 3,
    byFactors: (a, b) => (a - b) * (a * a + a * b + b * b),
  },
  sum: {
    title: 'Sum of cubes',
    leftTex: 'a^3 + b^3',
    factoredTex: 'a^3 + b^3 = (a + b)(a^2 - ab + b^2)',
    firstFactorTex: 'a + b',
    secondFactorTex: 'a^2 - ab + b^2',
    at: (a, b) => a ** 3 + b ** 3,
    byFactors: (a, b) => (a + b) * (a * a - a * b + b * b),
  },
};

/* ══ 认形状 ════════════════════════════════════════════════════════ */

export interface Pattern {
  readonly id: string;
  readonly sign: Sign;
  readonly tex: string;
  readonly aTex: string;
  readonly bTex: string;
  readonly aWhy: string;
  readonly bWhy: string;
  readonly asCubesTex: string;
  readonly factoredTex: string;
  readonly original: (x: number) => number;
  readonly factored: (x: number) => number;
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'x3-8',
    sign: 'difference',
    tex: 'x^3 - 8',
    aTex: 'x',
    bTex: '2',
    aWhy: 'x is already a cube root of x³',
    bWhy: '8 = 2³',
    asCubesTex: 'x^3 - 2^3',
    factoredTex: '(x - 2)(x^2 + 2x + 4)',
    original: (x) => x ** 3 - 8,
    factored: (x) => (x - 2) * (x * x + 2 * x + 4),
  },
  {
    id: '27x3-1',
    sign: 'difference',
    tex: '27x^3 - 1',
    aTex: '3x',
    bTex: '1',
    aWhy: '27x³ = (3x)³',
    bWhy: '1 = 1³',
    asCubesTex: '(3x)^3 - 1^3',
    factoredTex: '(3x - 1)(9x^2 + 3x + 1)',
    original: (x) => 27 * x ** 3 - 1,
    factored: (x) => (3 * x - 1) * (9 * x * x + 3 * x + 1),
  },
  {
    id: 'x3+64',
    sign: 'sum',
    tex: 'x^3 + 64',
    aTex: 'x',
    bTex: '4',
    aWhy: 'x is already a cube root of x³',
    bWhy: '64 = 4³',
    asCubesTex: 'x^3 + 4^3',
    factoredTex: '(x + 4)(x^2 - 4x + 16)',
    original: (x) => x ** 3 + 64,
    factored: (x) => (x + 4) * (x * x - 4 * x + 16),
  },
];

export function patternOf(id: string): Pattern {
  const found = PATTERNS.find((p) => p.id === id);
  if (!found) throw new Error(`no such pattern: ${id}`);
  return found;
}

export function patternHolds(id: string, xs: readonly number[] = [-3, -1.5, 0, 1, 2.5, 6]): boolean {
  const pattern = patternOf(id);
  return xs.every((x) => Math.abs(pattern.original(x) - pattern.factored(x)) < 1e-9);
}

/* ══ 显示 ══════════════════════════════════════════════════════════ */

export const HEADLINE = 'Take a Cube Apart';

export function cubesTex(a: number, b: number): string {
  return `${a}^3 - ${b}^3`;
}

/** ⚠️ 纯文本,不是 TeX。理由见 `differenceOfSquares.ts` 里同名的那两个。 */
export function numbersPlain(a: number, b: number): string {
  return `${bigVolume(a)} − ${smallVolume(b)} = ${remainingVolume(a, b)}`;
}

export function factoredNumbersPlain(a: number, b: number): string {
  return `${a - b} × (${a * a} + ${a * b} + ${b * b}) = ${volumeByFactors(a, b)}`;
}
