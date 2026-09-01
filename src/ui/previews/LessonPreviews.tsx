/**
 * 首页每张卡里的**微型动画预览**。
 *
 * 每个都是一小张 SVG,循环播放该节课最核心的那个动作:
 *   · One-Sided Limits         —— 两个点从两侧挤向目标线,停在两个不同高度
 *   · Increasing/Decreasing Intervals —— 扫描窗沿曲线滑过,亮的那段跟着换颜色
 *   · Nondecreasing Functions  —— 一对点沿**上行**阶梯滑动,走上平台时两点等高
 *   · Nonincreasing Functions  —— 同一段动作,换成**下行**阶梯
 *   · Increasing Functions     —— 两点沿抛物线滑动,弦始终朝上
 *   · Even and Odd Functions   —— 一对镜像点同进同出,连线保持水平
 *   · Periodic Functions       —— 正弦的副本右移一个周期,落回自己身上
 *   · Average Rate of Change   —— B 点移动,割线绕着 A 转
 *   · The Floor Function       —— 点在数轴上滑动,落点向下掉到整数(负半边染成警示色)
 *   · The Ceiling Function     —— 同一条数轴,落点向上跳(正半边才是坑)
 *   · Definition of a Function —— 一个值穿过机器,只有一个出口
 *   · Domain of a Function     —— 点沿数轴滑动,进入禁区就熄灭
 *
 * ⚠️ 三条约束,都不是可选项:
 * ① **不 import 任何实验台组件。** 首页只需要几十行 SVG,
 *    拉进整节课等于把那一节的全部代码塞进首屏(W6 花了一整轮才把首页减下来)。
 * ② 曲线一律来自 `src/math/` 的纯函数 —— 组件里不出现裸算式(禁止 2)。
 * ③ 所有卡共用**一个** rAF 时钟(见 `clock.ts`),不是各开一个。
 */
import { holdAtEnds, pingPong } from './clock';
// ── 七条推导链的预览所需的数学(全部来自 src/math,组件里不写裸算式) ──
import { PARABOLA_DOWN, PARABOLA_INVERSE } from '../../math/curves';
import { riemannRectangles } from '../../math/riemann';
import { shellSlices, diskSlices } from '../../math/solids';
import { tangent as derivTangent } from '../../math/derivative';
import { circlePoint } from '../../math/trig';
import { circleVelocity } from '../../math/trigRates';
import { areaUnderReciprocal } from '../../math/logIntegral';
import { PAIRS as CHAIN_PAIRS, stretchFactors } from '../../math/chainRule';
import { CASES as SUB_CASES, slices as subSlices, integrand as subIntegrand } from '../../math/substitution';
import { SECANT_FN, secantLine, readSecant } from '../../math/rateOfChange';
import { PERIODIC_FUNCTIONS } from '../../math/periodicity';
import { SYMMETRY_FUNCTIONS } from '../../math/symmetry';
import { ceilByDefinition, floorByDefinition } from '../../math/rounding';
import { MACHINE } from '../../math/functionRelation';
import { FUNCTIONS as DOMAIN_FUNCTIONS } from '../../math/domain';
import {
  f as lhF,
  sampleCurve as lhCurve,
  secantLine as lhSecant,
  tangentLine as lhTangent,
} from '../../math/letHShrink';
import {
  sampleCos as slCos,
  sampleRatio as slRatioSamples,
} from '../../math/specialLimit';
import {
  L as SQ_L,
  lower as sqLower,
  middle as sqMiddle,
  upper as sqUpper,
  clampScan as sqClamp,
} from '../../math/squeeze';
import {
  MAX_DECADE as IL_MAX,
  decadeX as ilDecadeX,
  valueAt as ilAt,
  viewHalfHeight as ilHalfY,
  viewHalfWidth as ilHalfX,
} from '../../math/infiniteLimits';
import {
  A as ED_A,
  L as ED_L,
  f as edF,
  isTrapped as edTrapped,
  requiredDelta as edNeed,
} from '../../math/epsilonDelta';
import {
  A as LVV_A,
  HOLE_Y as LVV_HOLE,
  clampToSide as lvvClamp,
  sampleBranch as lvvSamples,
  simplifiedAt as lvvAt,
} from '../../math/limitVsValue';
import {
  FUNCTIONS as OSL_FUNCTIONS,
  clampToSide as oslClamp,
  sampleBranch as oslSamples,
  sidesAgree as oslAgree,
  oneSidedLimit as oslLimit,
} from '../../math/oneSidedLimits';
import {
  CURVES as SCAN_CURVES,
  behaviourByStretches as scanBehaviour,
  sampleCurve as scanSamples,
  valueAt as scanValue,
} from '../../math/scanning';
import {
  GRAPHS as WM_GRAPHS,
  flatSegments as wmFlatSegments,
  polyline as wmPolyline,
  shapeByOutputs as wmShape,
  valueBySegment as wmValue,
  type GraphId as WmGraphId,
} from '../../math/weakMonotonicity';
import {
  CASES as IND_CASES,
  sampleQuotient as indSamples,
  sideValue as indSide,
} from '../../math/indeterminate';
import {
  formOf as sfForm,
  ratio as sfRatio,
  sampleCurve as sfCurve,
  spanAt as sfSpan,
} from '../../math/specialForms';
import { problemOf as pmProblem } from '../../math/patternMatch';
import {
  cornersAt as dsCorners,
  pieces as dsPieces,
  targetRect as dsTarget,
} from '../../math/differenceOfSquares';
import {
  boxes as dcBoxes,
  drawOrder as dcOrder,
  facesOf as dcFaces,
} from '../../math/differenceOfCubes';
import { pascalTriangle as bnTriangle } from '../../math/binomial';
import {
  blocks as gsBlocks,
  partialSums as gsSums,
} from '../../math/geometricSeries';
import { COLOR } from '../../scene/theme';

/**
 * ⚠️ 视口比例要接近卡片本身的比例。
 * 第一版是 240×116(比 2.07),而卡片在桌面端约 530×116(比 4.6),
 * `preserveAspectRatio="meet"` 于是按高度缩放,左右各留一大块空 ——
 * 画面缩在中间一小条,看着像没做完。加宽到 400 之后两边都填得满。
 */
const W = 400;
const H = 116;

/** 预览专用的小视口。和实验台无关,只求在这张卡里好看。 */
function makeMap(xMin: number, xMax: number, yMin: number, yMax: number) {
  const padX = 10;
  const padY = 10;
  return {
    x: (x: number) => padX + ((x - xMin) / (xMax - xMin)) * (W - padX * 2),
    y: (y: number) => padY + (1 - (y - yMin) / (yMax - yMin)) * (H - padY * 2),
  };
}

function path(points: readonly { x: number; y: number }[], map: ReturnType<typeof makeMap>): string {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${map.x(p.x).toFixed(1)} ${map.y(p.y).toFixed(1)}`)
    .join(' ');
}

/**
 * 会**断笔**的折线:`y === null` 处抬笔。
 * ⚠️ 洞不能连过去 —— 连过去就等于说那里有值,而这一节整节都在讲那里没有。
 */
function brokenPath(
  points: readonly { x: number; y: number | null }[],
  map: ReturnType<typeof makeMap>,
): string {
  let out = '';
  let down = false;
  for (const p of points) {
    if (p.y === null || !Number.isFinite(p.y)) { down = false; continue; }
    const py = map.y(p.y);
    // 画到框外很远会让浏览器算超长路径;裁掉但保持断点语义
    if (py < -H || py > H * 2) { down = false; continue; }
    out += `${down ? 'L' : 'M'}${map.x(p.x).toFixed(1)} ${py.toFixed(1)} `;
    down = true;
  }
  return out.trim();
}

function samples(at: (x: number) => number, from: number, to: number, n = 60) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    return { x, y: at(x) };
  });
}

/** 采样一条**参数**曲线(返回 [x, y] 的那种)。单位圆那两张卡要用。 */
function samples2(
  at: (t: number) => readonly [number, number],
  from: number,
  to: number,
  count = 48,
): { x: number; y: number }[] {
  return Array.from({ length: count + 1 }, (_, i) => {
    const [x, y] = at(from + ((to - from) * i) / count);
    return { x, y };
  });
}

/**
 * **等比例**映射:x 和 y 用同一个尺度。
 *
 * ⚠️ `makeMap` 把 x、y 各自拉满整块画布。画函数图像没问题,画**圆**就出事 ——
 * 预览框是 400×116 的宽扁形,单位圆会被拉成一个横躺的椭圆。
 * 一张讲单位圆的卡片上画着椭圆,那是在教错东西(配色和形状都是词汇,不是装饰)。
 * 这里以短边定尺度,居中摆放,圆就还是圆。
 */
function makeSquareMap(halfSpan: number) {
  const pad = 8;
  const scale = (H - pad * 2) / (halfSpan * 2);
  return {
    x: (x: number) => W / 2 + x * scale,
    y: (y: number) => H / 2 - y * scale,
    scale,
  };
}

function Frame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-full w-full"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  );
}

/* ── ① 递增:两点滑动,弦始终朝上 ─────────────────────────────── */
export function IncreasingPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.35, 3.35, -0.7, 10.4);
  const t = pingPong(phase);
  const a = 0.35 + t * 0.9;
  const b = a + 1.35;
  const fa = SECANT_FN.at(a);
  const fb = SECANT_FN.at(b);
  return (
    <Frame label="Two points sliding along a curve, the line between them always rising">
      <path d={path(samples(SECANT_FN.at, 0, 3.1), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <line x1={map.x(a)} y1={map.y(fa)} x2={map.x(b)} y2={map.y(fb)} stroke={COLOR.result} strokeWidth={2} />
      <circle cx={map.x(a)} cy={map.y(fa)} r={4} fill={COLOR.introduce} />
      <circle cx={map.x(b)} cy={map.y(fb)} r={4} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ② 对称:一对镜像点同进同出 ──────────────────────────────── */
export function SymmetryPreview({ phase }: { phase: number }) {
  const map = makeMap(-2.4, 2.4, -0.6, 6);
  const fn = SYMMETRY_FUNCTIONS.square!;
  const x = 0.55 + pingPong(phase) * 1.5;
  const y = fn.at(x)!;
  return (
    <Frame label="A parabola with two mirrored points at the same height">
      <line x1={map.x(0)} y1={6} x2={map.x(0)} y2={H - 6} stroke={COLOR.result} strokeWidth={1.5} opacity={0.5} />
      <path d={path(samples((v) => fn.at(v)!, -2.3, 2.3), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <line x1={map.x(-x)} y1={map.y(y)} x2={map.x(x)} y2={map.y(y)} stroke={COLOR.result} strokeWidth={1.8} strokeDasharray="5 4" />
      <circle cx={map.x(-x)} cy={map.y(y)} r={4} fill={COLOR.introduce} />
      <circle cx={map.x(x)} cy={map.y(y)} r={4} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ③ 周期:副本右移一个周期,落回自己身上 ────────────────────── */
export function PeriodicPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.4, 4 * Math.PI + 0.4, -1.35, 1.35);
  const fn = PERIODIC_FUNCTIONS.sin!;
  const shift = holdAtEnds(phase) * 2 * Math.PI;
  const landed = shift > 2 * Math.PI - 0.05;
  const base = samples(fn.at, 0, 4 * Math.PI, 90);
  const copy = samples(fn.at, -shift, 4 * Math.PI - shift, 90).map((p) => ({ x: p.x + shift, y: p.y }));
  return (
    <Frame label="A sine wave and a copy of it sliding right by one full period">
      <line x1={map.x(-0.4)} y1={map.y(0)} x2={map.x(4 * Math.PI + 0.4)} y2={map.y(0)} stroke={COLOR.axis} strokeWidth={1} />
      {/*
        ⚠️ 底下这条画粗一点(3.2 vs 2)。副本落位之后两条完全重合,
        等宽的话绿色会把蓝色整个盖住,卡片看起来就只有**一条**曲线,
        "副本滑过来盖住原图"这件事反而消失了。粗一圈,蓝色就成了绿线的描边。
      */}
      <path d={path(base, map)} fill="none" stroke={COLOR.curve} strokeWidth={3.2} strokeLinecap="round" />
      <path
        d={path(copy, map)}
        fill="none"
        stroke={landed ? COLOR.result : COLOR.hero}
        strokeWidth={2}
        strokeDasharray={landed ? undefined : '6 4'}
        strokeLinecap="round"
        opacity={0.95}
      />
    </Frame>
  );
}

/* ── ④ 割线:B 移动,直线绕 A 转 ─────────────────────────────── */
export function SecantPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.35, 3.35, -1.6, 10.4);
  const a = 1;
  const b = 1.5 + pingPong(phase) * 1.6;
  const reading = readSecant(a, b);
  const line = reading ? secantLine(reading) : null;
  return (
    <Frame label="A line through two points on a curve, pivoting as one point moves">
      <path d={path(samples(SECANT_FN.at, 0, 3.1), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      {line && (
        <line
          x1={map.x(-0.3)}
          y1={map.y(line.at(-0.3))}
          x2={map.x(3.3)}
          y2={map.y(line.at(3.3))}
          stroke={COLOR.result}
          strokeWidth={2}
        />
      )}
      {reading && (
        <>
          <line x1={map.x(reading.a)} y1={map.y(reading.fa)} x2={map.x(reading.b)} y2={map.y(reading.fa)} stroke={COLOR.introduce} strokeWidth={1.6} />
          <line x1={map.x(reading.b)} y1={map.y(reading.fa)} x2={map.x(reading.b)} y2={map.y(reading.fb)} stroke={COLOR.hero} strokeWidth={1.6} />
          <circle cx={map.x(reading.a)} cy={map.y(reading.fa)} r={4} fill={COLOR.introduce} />
          <circle cx={map.x(reading.b)} cy={map.y(reading.fb)} r={4} fill={COLOR.hero} />
        </>
      )}
    </Frame>
  );
}

/* ── ⑤ 取整:点在数轴上滑动,落点向下掉到整数 ─────────────────── */
export function FloorPreview({ phase }: { phase: number }) {
  const map = makeMap(-2.6, 4.6, -1.15, 1.15);
  // 从 -2 扫到 4,来回。刻意跨过 0,让负半边也演到。
  const x = -2 + pingPong(phase) * 6;
  const n = floorByDefinition(x) ?? 0;
  const lineY = map.y(-0.45);
  const dotY = map.y(0.5);
  // 负的非整数才是这一节的重点 —— 那时把落点染成警示色
  const tricky = x < 0 && n !== x;
  return (
    <Frame label="A point sliding along a number line, dropping down to the integer below it">
      <line x1={map.x(-2.6)} y1={lineY} x2={map.x(4.6)} y2={lineY} stroke={COLOR.axis} strokeWidth={1.4} />
      {[-2, -1, 0, 1, 2, 3, 4].map((t) => (
        <line key={t} x1={map.x(t)} y1={lineY - 5} x2={map.x(t)} y2={lineY + 5} stroke={COLOR.axis} strokeWidth={1.2} />
      ))}
      {/* 掉下去的那一步:先竖直落到轴,再横向挪到 n */}
      <line x1={map.x(x)} y1={dotY + 7} x2={map.x(x)} y2={lineY - 9} stroke={COLOR.hero} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      <line x1={map.x(x)} y1={lineY - 9} x2={map.x(n)} y2={lineY - 9} stroke={tricky ? COLOR.radius : COLOR.result} strokeWidth={1.6} strokeDasharray="4 3" opacity={0.85} />
      <path
        d={`M${map.x(n) - 4} ${lineY - 14} L${map.x(n)} ${lineY - 7} L${map.x(n) + 4} ${lineY - 14}`}
        fill="none"
        stroke={tricky ? COLOR.radius : COLOR.result}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={map.x(n)} cy={lineY} r={5} fill={tricky ? COLOR.radius : COLOR.result} />
      <circle cx={map.x(x)} cy={dotY} r={4.5} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ⑥ 上取整:同一条数轴,落点向上跳 ─────────────────────────── */
export function CeilingPreview({ phase }: { phase: number }) {
  const map = makeMap(-2.6, 4.6, -1.15, 1.15);
  const x = -2 + pingPong(phase) * 6;
  const n = ceilByDefinition(x) ?? 0;
  const lineY = map.y(-0.45);
  const dotY = map.y(0.5);
  // 上取整的坑在**正**半边:朝零截断在那里会给小一格
  const tricky = x > 0 && n !== x;
  return (
    <Frame label="A point sliding along a number line, jumping up to the integer above it">
      <line x1={map.x(-2.6)} y1={lineY} x2={map.x(4.6)} y2={lineY} stroke={COLOR.axis} strokeWidth={1.4} />
      {[-2, -1, 0, 1, 2, 3, 4].map((t) => (
        <line key={t} x1={map.x(t)} y1={lineY - 5} x2={map.x(t)} y2={lineY + 5} stroke={COLOR.axis} strokeWidth={1.2} />
      ))}
      <line x1={map.x(x)} y1={dotY + 7} x2={map.x(x)} y2={lineY - 9} stroke={COLOR.hero} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      <line x1={map.x(x)} y1={lineY - 9} x2={map.x(n)} y2={lineY - 9} stroke={tricky ? COLOR.radius : COLOR.introduce} strokeWidth={1.6} strokeDasharray="4 3" opacity={0.85} />
      {/* 箭头朝**上** —— 和取整那张卡唯一的视觉差别就在这里 */}
      <path
        d={`M${map.x(n) - 4} ${lineY - 4} L${map.x(n)} ${lineY - 11} L${map.x(n) + 4} ${lineY - 4}`}
        fill="none"
        stroke={tricky ? COLOR.radius : COLOR.introduce}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={map.x(n)} cy={lineY} r={5} fill={tricky ? COLOR.radius : COLOR.introduce} />
      <circle cx={map.x(x)} cy={dotY} r={4.5} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ⑦ 函数机器:一个值进去,一个值出来 ────────────────────────── */
export function FunctionPreview({ phase }: { phase: number }) {
  const inX = 60;
  const boxX = W / 2;
  const outX = W - 60;
  const midY = H / 2;
  // 每一轮换一个输入,让"同一台机器、不同的值"看得出来
  const round = Math.floor(phase * 3) % 3;
  const value = 2 + round;
  const t = (phase * 3) % 1;
  const inLeg = Math.min(1, t / 0.5);
  const outLeg = Math.max(0, (t - 0.5) / 0.5);
  const tokenX = t < 0.5 ? inX + (boxX - inX) * inLeg : boxX + (outX - boxX) * outLeg;
  const inside = t >= 0.44 && t <= 0.56;
  return (
    <Frame label="A value entering a function machine and one value leaving it">
      <line x1={inX} y1={midY} x2={outX} y2={midY} stroke={COLOR.axis} strokeWidth={1.3} strokeDasharray="5 4" opacity={0.6} />
      <rect x={boxX - 26} y={midY - 26} width={52} height={52} rx={12} fill="#0b1020"
        stroke={inside ? COLOR.result : COLOR.axis} strokeWidth={inside ? 2.2 : 1.4} />
      <text x={boxX} y={midY + 8} fill={COLOR.hero} fontSize={22} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">f</text>
      <circle cx={inX} cy={midY} r={17} fill="none" stroke={COLOR.introduce} strokeWidth={1.5} />
      <circle cx={outX} cy={midY} r={17} fill="none" stroke={COLOR.result} strokeWidth={1.5} />
      <text x={inX} y={midY + 5} fill={COLOR.introduce} fontSize={14} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">{value}</text>
      <text x={outX} y={midY + 5} fill={COLOR.result} fontSize={14} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">{MACHINE.at(value)}</text>
      {!inside && (
        <circle cx={tokenX} cy={midY} r={8} fill={t < 0.5 ? COLOR.introduce : COLOR.result} opacity={0.9} />
      )}
    </Frame>
  );
}

/* ── ⑧ 定义域:允许的一段发光,点滑进禁区就熄灭 ─────────────────── */
export function DomainPreview({ phase }: { phase: number }) {
  const map = makeMap(-2.6, 4.6, -1.2, 1.2);
  const fn = DOMAIN_FUNCTIONS[0]!; // √x,边界在 0
  const x = -2 + pingPong(phase) * 6;
  const y = fn.at(x);
  const allowed = y !== null;
  const lineY = map.y(-0.35);
  return (
    <Frame label="A point sliding along a number line, lighting up only where the function is defined">
      {/* 禁区:压暗 */}
      <line x1={map.x(-2.6)} y1={lineY} x2={map.x(0)} y2={lineY} stroke={COLOR.radius} strokeWidth={7} opacity={0.22} strokeLinecap="round" />
      {/* 允许区:发光 */}
      <line x1={map.x(0)} y1={lineY} x2={map.x(4.6)} y2={lineY} stroke={COLOR.result} strokeWidth={7} opacity={0.8} strokeLinecap="round" />
      {/* 端点实心 —— √0 有值,0 属于定义域 */}
      <circle cx={map.x(0)} cy={lineY} r={5} fill={COLOR.result} stroke="#0b1020" strokeWidth={1.6} />
      {/* 曲线只画允许的那一段 */}
      <path
        d={path(
          samples((v) => (fn.at(v) ?? 0), 0, 4.6, 40).map((p) => ({ x: p.x, y: p.y * 0.42 - 0.15 })),
          map,
        )}
        fill="none"
        stroke={COLOR.curve}
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* 当前那个输入:合法时亮,非法时只剩一个空心红圈 */}
      <line x1={map.x(x)} y1={map.y(0.85)} x2={map.x(x)} y2={lineY - 7} stroke={allowed ? COLOR.hero : COLOR.radius} strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
      <circle
        cx={map.x(x)}
        cy={lineY}
        r={5.5}
        fill={allowed ? COLOR.hero : 'none'}
        stroke={allowed ? '#0b1020' : COLOR.radius}
        strokeWidth={allowed ? 1.6 : 2.2}
      />
    </Frame>
  );
}

/* ── ⑨⑩ 弱单调:一对点沿阶梯滑动,走到平台上时两点等高 ────────────── */
/*
  ⚠️ 两张卡**共用一个函数**,只换一张图。
  非递减是往上的阶梯,非递增是往下的 —— 动作完全一样,
  复制一份改坐标只会让两张卡慢慢长得不像同一套东西。
*/
function StaircasePreview({ phase, graphId, label }: { phase: number; graphId: WmGraphId; label: string }) {
  const map = makeMap(-0.3, 8.3, 0.35, 5.65);
  const graph = WM_GRAPHS[graphId];
  const gap = 1.4;
  const x1 = 0.15 + pingPong(phase) * (8 - gap - 0.3);
  const x2 = x1 + gap;
  const y1 = wmValue(graph, x1)!;
  const y2 = wmValue(graph, x2)!;
  const level = wmShape(y1, y2) === 'flat';
  return (
    <Frame label={label}>
      {/* 平台的绿色底光 —— 和课里同一套语言:平也是允许的 */}
      {wmFlatSegments(graph).map((s) => (
        <line
          key={s.from}
          x1={map.x(s.from)}
          y1={map.y(s.yFrom)}
          x2={map.x(s.to)}
          y2={map.y(s.yTo)}
          stroke={COLOR.result}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={0.22}
        />
      ))}
      <path d={path(wmPolyline(graph), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* 两个高度之间的比较:等高时是一条水平绿虚线,不等高时是一条竖直的琥珀边 */}
      {level ? (
        <line x1={map.x(x1)} y1={map.y(y1)} x2={map.x(x2)} y2={map.y(y2)} stroke={COLOR.result} strokeWidth={1.8} strokeDasharray="5 4" />
      ) : (
        <line x1={map.x(x2)} y1={map.y(y1)} x2={map.x(x2)} y2={map.y(y2)} stroke={COLOR.hero} strokeWidth={1.8} />
      )}
      <circle cx={map.x(x1)} cy={map.y(y1)} r={4} fill={COLOR.introduce} />
      <circle cx={map.x(x2)} cy={map.y(y2)} r={4} fill={COLOR.hero} />
    </Frame>
  );
}

export function NondecreasingPreview({ phase }: { phase: number }) {
  return (
    <StaircasePreview
      phase={phase}
      graphId="steps"
      label="Two points sliding along a rising staircase, level with each other on the flat parts"
    />
  );
}

export function NonincreasingPreview({ phase }: { phase: number }) {
  return (
    <StaircasePreview
      phase={phase}
      graphId="fallingSteps"
      label="Two points sliding along a descending staircase, level with each other on the flat part"
    />
  );
}

/* ── ⑪ 扫描区间:窗口沿曲线扫过去,亮的那一段跟着换颜色 ─────────────── */
export function ScanPreview({ phase }: { phase: number }) {
  const curve = SCAN_CURVES.wave;
  const map = makeMap(0, 10, 1.2, 5.4);
  const width = 2.2;
  const from = pingPong(phase) * (10 - width);
  const to = from + width;
  const behaviour = scanBehaviour(curve, from, to);
  // ⚠️ 颜色的含义与课里一致:递减不是错误,红色只留给"给不出单一答案"的 mixed。
  const lit =
    behaviour === 'up' ? COLOR.result : behaviour === 'down' ? COLOR.hero : behaviour === 'mixed' ? COLOR.radius : COLOR.introduce;
  const dotX = from + width * 0.5;
  return (
    <Frame label="A scanning window sliding along a curve, colouring the part inside it">
      {/* 整条压暗 */}
      <path d={path(scanSamples(curve, 0, 10, 80), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" opacity={0.25} />
      {/* 窗口 */}
      <rect x={map.x(from)} y={6} width={map.x(to) - map.x(from)} height={H - 12} fill={lit} opacity={0.12} rx={3} />
      {/* 窗口里的那一段 */}
      <path d={path(scanSamples(curve, from, to, 40), map)} fill="none" stroke={lit} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={map.x(dotX)} cy={map.y(scanValue(curve, dotX))} r={4} fill={lit} />
    </Frame>
  );
}

/* ── ⑫ 单侧极限:两个点从两边挤向目标线 ───────────────────────────── */
export function OneSidedPreview({ phase }: { phase: number }) {
  // ⚠️ 用**不一致**的那条(分段)当预览:两条不同高度的虚线一眼就说明了这节课在讲什么。
  //    一致的那条画出来只是一条普通抛物线,和别的卡片区分不开。
  const fn = OSL_FUNCTIONS.jump;
  const map = makeMap(0.3, 3.3, -0.4, 7);
  const t = 1 - pingPong(phase); // 1 → 0 → 1:先靠近再退开
  const lx = oslClamp(fn, 'left', fn.a - 0.05 - t * 1.4);
  const rx = oslClamp(fn, 'right', fn.a + 0.05 + t * 1.2);
  const ly = oslLimit(fn, 'left');
  const ry = oslLimit(fn, 'right');
  const agree = oslAgree(fn);
  return (
    <Frame label="Two points closing in on a target line from either side, landing at different heights">
      {/* 两个目的地的高度 */}
      {[[ly, COLOR.introduce], [ry, COLOR.hero]].map(([y, c], i) => (
        <line key={i} x1={map.x(0.3)} y1={map.y(y as number)} x2={map.x(3.3)} y2={map.y(y as number)} stroke={c as string} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      ))}
      {/* 目标竖线 */}
      <line x1={map.x(fn.a)} y1={6} x2={map.x(fn.a)} y2={H - 6} stroke={agree ? COLOR.result : COLOR.radius} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.8} />
      {/* 两支各画各的 —— 断点处的那道缝就是重点 */}
      <path d={path(oslSamples(fn, 'left', 40), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <path d={path(oslSamples(fn, 'right', 40), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <circle cx={map.x(lx)} cy={map.y(fn.left.at(lx))} r={4} fill={COLOR.introduce} />
      <circle cx={map.x(rx)} cy={map.y(fn.right.at(rx))} r={4} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ⑬ 极限 vs 函数值:孤立点上下跑,洞和虚线纹丝不动 ─────────────── */
export function LimitPointPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.4, 2.6, 0.2, 5.2);
  const t = pingPong(phase);
  const pointY = 1.2 + t * 3.4;          // 孤立点上下走
  const lx = lvvClamp('left', LVV_A - 0.5 + t * 0.45);
  const rx = lvvClamp('right', LVV_A + 0.5 - t * 0.45);
  return (
    <Frame label="A line with a hole, and a separate point sliding up and down while the limit stays put">
      {/* 极限那条线 —— 全程不动 */}
      <line x1={map.x(-0.4)} y1={map.y(LVV_HOLE)} x2={map.x(2.6)} y2={map.y(LVV_HOLE)} stroke={COLOR.result} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.55} />
      <path d={path(lvvSamples('left', 30), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <path d={path(lvvSamples('right', 30), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      {/* 洞:永远空心 */}
      <circle cx={map.x(LVV_A)} cy={map.y(LVV_HOLE)} r={5} fill="#0b1020" stroke={COLOR.curve} strokeWidth={2.2} />
      {/* 孤立点:唯一在动的东西 */}
      <line x1={map.x(LVV_A)} y1={map.y(LVV_HOLE)} x2={map.x(LVV_A)} y2={map.y(pointY)} stroke={COLOR.result} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.5} />
      <circle cx={map.x(LVV_A)} cy={map.y(pointY)} r={4.5} fill={COLOR.result} />
      <circle cx={map.x(lx)} cy={map.y(lvvAt(lx))} r={3.5} fill={COLOR.introduce} />
      <circle cx={map.x(rx)} cy={map.y(lvvAt(rx))} r={3.5} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ⑭ ε–δ:横带收紧,竖带跟着收 ─────────────────────────────────── */
export function EpsilonDeltaPreview({ phase }: { phase: number }) {
  const map = makeMap(ED_A - 1.3, ED_A + 1.3, ED_L - 3.2, ED_L + 3.2);
  const t = pingPong(phase);
  const eps = 0.35 + t * 2.2;           // ε 一张一合
  const delta = edNeed(eps) * 0.92;     // δ 跟着,始终刚好够
  const ok = edTrapped(eps, delta);
  return (
    <Frame label="A horizontal tolerance band tightening while a vertical band narrows to match">
      <rect x={map.x(ED_A - 1.3)} y={map.y(ED_L + eps)} width={map.x(ED_A + 1.3) - map.x(ED_A - 1.3)} height={Math.max(1, map.y(ED_L - eps) - map.y(ED_L + eps))} fill={COLOR.hero} opacity={0.16} />
      <rect x={map.x(ED_A - delta)} y={6} width={Math.max(1, map.x(ED_A + delta) - map.x(ED_A - delta))} height={H - 12} fill={COLOR.introduce} opacity={0.14} />
      <line x1={map.x(ED_A - 1.3)} y1={map.y(edF(ED_A - 1.3))} x2={map.x(ED_A + 1.3)} y2={map.y(edF(ED_A + 1.3))} stroke={COLOR.curve} strokeWidth={2} opacity={0.5} />
      {/* ⚠️ 固定的目标点画在**动的东西之前**。首页那条"预览有没有在动"的检查
          取的是最后一个几何元素;把静止的圆点放在最后会让整张卡被判成静止。 */}
      <circle cx={map.x(ED_A)} cy={map.y(ED_L)} r={4} fill={COLOR.hero} />
      <line x1={map.x(ED_A - delta)} y1={map.y(edF(ED_A - delta))} x2={map.x(ED_A + delta)} y2={map.y(edF(ED_A + delta))} stroke={ok ? COLOR.result : COLOR.radius} strokeWidth={3.6} strokeLinecap="round" />
    </Frame>
  );
}

/* ── ⑮ 无穷极限:两个点顺着 1/x 冲向渐近线 ─────────────────────────── */
export function InfinitePreview({ phase }: { phase: number }) {
  const k = pingPong(phase) * IL_MAX * 0.8;
  const halfX = ilHalfX(k);
  const halfY = ilHalfY(k);
  const map = makeMap(-halfX, halfX, -halfY, halfY);
  const near = halfX / 300;
  const branch = (sign: number) =>
    Array.from({ length: 60 }, (_, i) => {
      const x = sign * (near + (i / 59) * (halfX - near));
      return { x, y: ilAt(x) ?? 0 };
    });
  const rx = ilDecadeX('right', k);
  const lx = ilDecadeX('left', k);
  return (
    <Frame label="One over x with two points racing away along a vertical asymptote">
      <line x1={map.x(-halfX)} y1={map.y(0)} x2={map.x(halfX)} y2={map.y(0)} stroke={COLOR.axis} strokeWidth={1} />
      <line x1={map.x(0)} y1={6} x2={map.x(0)} y2={H - 6} stroke={COLOR.radius} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.8} />
      <path d={path(branch(1), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <path d={path(branch(-1), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <circle cx={map.x(rx)} cy={map.y(ilAt(rx) ?? 0)} r={4} fill={COLOR.hero} />
      <circle cx={map.x(lx)} cy={map.y(ilAt(lx) ?? 0)} r={4} fill={COLOR.introduce} />
    </Frame>
  );
}

/* ── ⑯ 夹逼:上下两条抛物线合拢,中间那条被挤住 ───────────────────── */
export function SqueezePreview({ phase }: { phase: number }) {
  const map = makeMap(-1, 1, SQ_L - 1.15, SQ_L + 1.15);
  const scan = sqClamp(0.95 - pingPong(phase) * 0.92);
  const bound = (at: (x: number) => number) =>
    Array.from({ length: 60 }, (_, i) => { const x = -1 + (2 * i) / 59; return { x, y: at(x) }; });
  const mid = Array.from({ length: 260 }, (_, i) => {
    const t = i / 259 - 0.5;
    const x = Math.sign(t || 1) * (Math.abs(t) * 2) ** 3;
    return { x, y: sqMiddle(x) ?? SQ_L };
  });
  return (
    <Frame label="Two parabolas closing in with a wiggling curve trapped between them">
      <line x1={map.x(-1)} y1={map.y(SQ_L)} x2={map.x(1)} y2={map.y(SQ_L)} stroke={COLOR.result} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
      <path d={path(bound(sqUpper), map)} fill="none" stroke={COLOR.hero} strokeWidth={2} strokeLinecap="round" />
      <path d={path(bound(sqLower), map)} fill="none" stroke={COLOR.introduce} strokeWidth={2} strokeLinecap="round" />
      <path d={path(mid, map)} fill="none" stroke={COLOR.curve} strokeWidth={1.4} strokeLinecap="round" />
      <line x1={map.x(scan)} y1={6} x2={map.x(scan)} y2={H - 6} stroke={COLOR.axis} strokeWidth={1.2} strokeDasharray="4 4" />
      <circle cx={map.x(scan)} cy={map.y(sqUpper(scan))} r={3.2} fill={COLOR.hero} />
      <circle cx={map.x(scan)} cy={map.y(sqLower(scan))} r={3.2} fill={COLOR.introduce} />
      <circle cx={map.x(scan)} cy={map.y(sqMiddle(scan) ?? SQ_L)} r={3.2} fill={COLOR.curve} />
    </Frame>
  );
}

/* ── ⑰ sin x / x:三条线在 0 处收成一点 ────────────────────────────── */
export function SpecialLimitPreview({ phase }: { phase: number }) {
  const span = 0.35 + pingPong(phase) * 1.5;
  const map = makeMap(-span, span, 1 - span * span * 0.62 - 0.02, 1.03);
  return (
    <Frame label="cos x, sin x over x and the constant one closing together at zero">
      <line x1={map.x(-span)} y1={map.y(1)} x2={map.x(span)} y2={map.y(1)} stroke={COLOR.hero} strokeWidth={1.6} />
      <path d={path(slCos(-span, span, 70), map)} fill="none" stroke={COLOR.introduce} strokeWidth={1.6} />
      {/* ⚠️ 同上:固定的点先画,会动的比值曲线放最后。 */}
      <circle cx={map.x(0)} cy={map.y(1)} r={4} fill={COLOR.result} />
      <path d={path(slRatioSamples(-span, span, 70).map((p) => ({ x: p.x, y: p.y ?? 1 })), map)} fill="none" stroke={COLOR.result} strokeWidth={2.4} />
    </Frame>
  );
}

/* ── ⑱ 割线→切线:Q 滑向 P,割线转成切线 ──────────────────────────── */
export function ShrinkPreview({ phase }: { phase: number }) {
  const map = makeMap(-1.6, 2.6, -1, 7);
  const a = 1;
  const h = 0.06 + holdAtEnds(1 - phase) * 1.7;
  const sec = lhSecant(a, h);
  const tan = lhTangent(a);
  const near = h < 0.25;
  return (
    <Frame label="A moving point sliding toward a fixed one while the line through them settles">
      <path d={path(lhCurve(-1.6, 2.6, 60), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <line x1={map.x(-1.6)} y1={map.y(tan.at(-1.6))} x2={map.x(2.6)} y2={map.y(tan.at(2.6))} stroke={COLOR.result} strokeWidth={1.2} strokeDasharray="5 4" opacity={0.55} />
      {sec && <line x1={map.x(-1.6)} y1={map.y(sec.at(-1.6))} x2={map.x(2.6)} y2={map.y(sec.at(2.6))} stroke={near ? COLOR.result : COLOR.hero} strokeWidth={2.2} />}
      <circle cx={map.x(a)} cy={map.y(lhF(a))} r={4.5} fill={COLOR.introduce} />
      <circle cx={map.x(a + h)} cy={map.y(lhF(a + h))} r={4} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ⑲ 不定式:四条曲线,四个不同的去处,同一个 0/0 ──────────────── */
export function IndeterminatePreview({ phase }: { phase: number }) {
  // 四格并排。每格一条曲线 + 一个正在滑向洞的点。
  const t = pingPong(phase);
  const cell = W / 4;
  const spans: Readonly<Record<string, readonly [number, number]>> = {
    same: [-0.5, 2.0], 'faster-top': [-1.9, 1.9],
    'faster-bottom': [-5.5, 5.5], 'sign-jump': [-1.9, 1.9],
  };
  return (
    <Frame label="Four quotients that all substitute to zero over zero and end up in four different places">
      {IND_CASES.map((id, i) => {
        const [lo, hi] = spans[id]!;
        const map = {
          x: (x: number) => i * cell + 8 + ((x + 2.2) / 4.4) * (cell - 16),
          y: (y: number) => 10 + (1 - (y - lo) / (hi - lo)) * (H - 20),
        };
        const left = indSide(id, 'left');
        const right = indSide(id, 'right');
        // 点从 x = ±1.9 滑向洞,但**到不了** 0
        const at = 1.9 * (1 - t) + 0.06 * t;
        return (
          <g key={id}>
            {i > 0 && <line x1={i * cell} y1={6} x2={i * cell} y2={H - 6} stroke={COLOR.axis} strokeWidth={0.8} opacity={0.5} />}
            <path d={brokenPath(indSamples(id, -2.2, 2.2, 120), map)} fill="none" stroke={COLOR.curve} strokeWidth={1.6} strokeLinecap="round" />
            {left !== null && <circle cx={map.x(0)} cy={map.y(left)} r={3} fill="#0b1020" stroke={COLOR.hero} strokeWidth={1.6} />}
            {right !== null && right !== left && <circle cx={map.x(0)} cy={map.y(right)} r={3} fill="#0b1020" stroke={COLOR.hero} strokeWidth={1.6} />}
            <circle cx={map.x(-at)} cy={map.y(indSamples(id, -at, -at, 2)[0]!.y ?? 0)} r={2.6} fill={COLOR.introduce} />
            <circle cx={map.x(at)} cy={map.y(indSamples(id, at, at, 2)[0]!.y ?? 0)} r={2.6} fill={COLOR.result} />
          </g>
        );
      })}
    </Frame>
  );
}

/** 六条特殊极限共用的预览:主曲线与它的局部替身,随缩放合到一起。 */
function ZoomPreview({ id, phase, label }: { id: Parameters<typeof sfForm>[0]; phase: number; label: string }) {
  const form = sfForm(id);
  // ⚠️ 用 pingPong 而不是 holdAtEnds:后者在两端各停留 30%,
  //    而静止相位(reduced-motion 时固定的那个)恰好落在"停在最深处"那一段 ——
  //    于是不动的用户看到的是**已经完全重合**的一条直线,那张卡什么也没说。
  //    pingPong 让静止相位落在半路上,两条线还分得开。
  const level = pingPong(phase) * 4.2;
  const span = sfSpan(id, level);
  const series = form.curves.map((c) => ({ c, pts: sfCurve(c.at, -span, span, 90) }));
  let lo = Infinity;
  let hi = -Infinity;
  for (const { pts } of series) {
    for (const p of pts) {
      if (p.y === null || !Number.isFinite(p.y)) continue;
      lo = Math.min(lo, p.y); hi = Math.max(hi, p.y);
    }
  }
  if (!Number.isFinite(lo) || hi - lo < 1e-12) { lo = -1; hi = 1; }
  const pad = (hi - lo) * 0.16;
  const map = makeMap(-span, span, lo - pad, hi + pad);
  const ROLE: Record<string, string> = { subject: COLOR.result, companion: COLOR.hero, aside: COLOR.introduce };
  return (
    <Frame label={label}>
      {series.filter(({ c }) => c.role !== 'subject').map(({ c, pts }) => (
        <path key={c.key} d={brokenPath(pts, map)} fill="none" stroke={ROLE[c.role]}
          strokeWidth={1.5} strokeDasharray={c.role === 'companion' ? '5 4' : undefined} strokeLinecap="round" opacity={0.85} />
      ))}
      {/* ⚠️ 会动的主曲线放**最后** —— 首页检查取每张图的最后一个几何元素判断"有没有动"。 */}
      {series.filter(({ c }) => c.role === 'subject').map(({ c, pts }) => (
        <path key={c.key} d={brokenPath(pts, map)} fill="none" stroke={ROLE[c.role]} strokeWidth={2.4} strokeLinecap="round" />
      ))}
    </Frame>
  );
}

/* ── ⑳ tan x / x ─────────────────────────────────────────────────── */
export function TanOverXPreview({ phase }: { phase: number }) {
  return <ZoomPreview id="tan-over-x" phase={phase} label="Sine, the line y equals x, and tangent merging as the view narrows" />;
}

/* ── ㉑ (1 − cos x)/x ─────────────────────────────────────────────── */
export function CosOverXPreview({ phase }: { phase: number }) {
  return <ZoomPreview id="cos-over-x" phase={phase} label="A straight line beside the much flatter one minus cosine" />;
}

/* ── ㉒ (1 − cos x)/x² ────────────────────────────────────────────── */
export function CosOverX2Preview({ phase }: { phase: number }) {
  return <ZoomPreview id="cos-over-x2" phase={phase} label="One minus cosine settling onto the parabola x squared over two" />;
}

/* ── ㉓ (eˣ − 1)/x:割线转到斜率 1 ────────────────────────────────── */
export function ExpOverXPreview({ phase }: { phase: number }) {
  const map = makeMap(-1.4, 1.4, -0.1, 3.6);
  const x = 1.25 * (1 - holdAtEnds(phase)) + 0.05;
  const slope = sfRatio('exp-over-x', x) ?? 1;
  return (
    <Frame label="A secant line on the exponential curve settling as the second point slides to the first">
      <path d={brokenPath(sfCurve((t) => Math.exp(t), -1.4, 1.4, 90), map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <circle cx={map.x(0)} cy={map.y(1)} r={4} fill={COLOR.introduce} />
      <line x1={map.x(-1.4)} y1={map.y(1 + slope * -1.4)} x2={map.x(1.4)} y2={map.y(1 + slope * 1.4)} stroke={COLOR.hero} strokeWidth={2} />
      <circle cx={map.x(x)} cy={map.y(Math.exp(x))} r={3.6} fill={COLOR.result} />
    </Frame>
  );
}

/* ── ㉔ ln(1+x)/x:沿 y = x 的镜像 ────────────────────────────────── */
export function LogOverXPreview({ phase }: { phase: number }) {
  return <ZoomPreview id="log-over-x" phase={phase} label="The logarithm curve and the line y equals x becoming one line near the origin" />;
}

/* ── ㉕ 变形练习:系数被提到外面,峰高跟着长 ─────────────────────── */
export function ExplorerPreview({ phase }: { phase: number }) {
  // sin(kx)/x 的峰高就是 k。k 从 1 长到 5 —— 那正是"系数提出来"这件事的图像。
  const k = 1 + pingPong(phase) * 4;
  const map = makeMap(-2.6, 2.6, -1.6, 5.6);
  const pts = Array.from({ length: 160 }, (_, i) => {
    const x = -2.6 + (5.2 * i) / 159;
    return { x, y: Math.abs(x) < 1e-9 ? null : Math.sin(k * x) / x };
  });
  const target = pmProblem('sin-5x');
  return (
    <Frame label="A sine quotient whose peak height grows as its inner coefficient does">
      <line x1={map.x(-2.6)} y1={map.y(0)} x2={map.x(2.6)} y2={map.y(0)} stroke={COLOR.axis} strokeWidth={1} />
      <line x1={map.x(-2.6)} y1={map.y(5)} x2={map.x(2.6)} y2={map.y(5)} stroke={COLOR.hero} strokeWidth={1} strokeDasharray="5 4" opacity={0.6} />
      <circle cx={map.x(0)} cy={map.y(target.at(1e-6) ?? 5)} r={3.4} fill="#0b1020" stroke={COLOR.hero} strokeWidth={1.6} />
      <path d={brokenPath(pts, map)} fill="none" stroke={COLOR.result} strokeWidth={2.2} strokeLinecap="round" />
    </Frame>
  );
}

/* ── ㉖ 平方差:两块碎片滑成一个长方形 ─────────────────────────────── */
export function SquaresPreview({ phase }: { phase: number }) {
  const A = 7;
  const B = 3;
  const t = holdAtEnds(phase);
  const target = dsTarget(A, B);
  const span = Math.max(A, target.w) + 1;
  const map = makeMap(-0.5, span - 0.5, -0.5, span - 0.5);
  const [top, side] = dsPieces(A, B);
  const poly = (piece: typeof top) =>
    dsCorners(piece, t).map((c) => `${map.x(c.x).toFixed(1)},${map.y(c.y).toFixed(1)}`).join(' ');
  return (
    <Frame label="An L-shaped region cut in two and slid into a single rectangle">
      {/* 目标长方形的轮廓一直在,拼好时两块正好填满它 */}
      <rect
        x={map.x(0)} y={map.y(target.h)}
        width={map.x(target.w) - map.x(0)} height={map.y(0) - map.y(target.h)}
        fill="none" stroke={COLOR.result} strokeWidth={1} strokeDasharray="4 4" opacity={0.45}
      />
      <polygon points={poly(top)} fill={COLOR.introduce} fillOpacity={0.3} stroke={COLOR.introduce} strokeWidth={1.4} />
      {/* ⚠️ 会动的那块放最后 */}
      <polygon points={poly(side)} fill={COLOR.result} fillOpacity={0.32} stroke={COLOR.result} strokeWidth={1.4} />
    </Frame>
  );
}

/* ── ㉗ 立方差:三块长方体拆开又合上 ───────────────────────────────── */
export function CubesPreview({ phase }: { phase: number }) {
  const A = 4;
  const B = 2;
  const explode = holdAtEnds(phase);
  const scale = 13;
  const list = dcOrder(dcBoxes(A, B));
  const all = list.flatMap((box) => dcFaces(box, explode, scale).flatMap((f) => f.points));
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const map = makeMap(Math.min(...xs) - 4, Math.max(...xs) + 4, -Math.max(...ys) - 4, -Math.min(...ys) + 4);
  const COLOURS = [COLOR.introduce, COLOR.hero, COLOR.result];
  return (
    <Frame label="A cube shell splitting into three boxes and coming back together">
      {list.map((box, i) => (
        <g key={box.id}>
          {dcFaces(box, explode, scale).map((face, j) => (
            <polygon
              key={face.kind}
              points={face.points.map((p) => `${map.x(p.x).toFixed(1)},${map.y(-p.y).toFixed(1)}`).join(' ')}
              fill={COLOURS[i] ?? COLOR.curve}
              fillOpacity={0.18 + j * 0.1}
              stroke={COLOURS[i] ?? COLOR.curve}
              strokeWidth={1}
            />
          ))}
        </g>
      ))}
    </Frame>
  );
}

/* ── ㉘ 二项式:帕斯卡三角逐行点亮 ─────────────────────────────────── */
export function BinomialPreview({ phase }: { phase: number }) {
  const ROWS = 6;
  const triangle = bnTriangle(ROWS);
  const active = Math.min(ROWS - 1, Math.floor(pingPong(phase) * ROWS));
  const map = makeMap(-3.4, 3.4, -0.6, ROWS - 0.4);
  return (
    <Frame label="Pascal's triangle with one row lighting up at a time">
      {triangle.map((row, r) =>
        row.map((value, k) => {
          const x = k - r / 2;
          const y = ROWS - 1 - r;
          const on = r === active;
          return (
            <text
              key={`${r}-${k}`}
              x={map.x(x)} y={map.y(y) + 3}
              fill={on ? COLOR.hero : COLOR.axis}
              fontSize={on ? 11 : 9}
              fontWeight={on ? 700 : 400}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
            >
              {value}
            </text>
          );
        }),
      )}
      {/* 会动的高亮条放最后 */}
      <line
        x1={map.x(-3.2)} y1={map.y(ROWS - 1 - active)} x2={map.x(3.2)} y2={map.y(ROWS - 1 - active)}
        stroke={COLOR.hero} strokeWidth={1} opacity={0.25}
      />
    </Frame>
  );
}

/* ── ㉙ 等比级数:一段段填进固定的槽,越填越慢 ─────────────────────── */
export function SeriesPreview({ phase }: { phase: number }) {
  const A = 0.5;
  const R = 0.5;
  const COUNT = 9;
  const shown = 1 + pingPong(phase) * (COUNT - 1);
  const sums = gsSums(A, R, COUNT);
  const list = gsBlocks(A, R, COUNT);
  const map = makeMap(0, 1, 0, 1);
  // ⚠️ `map.y` 是**翻转**的:数学 y 越大,屏幕 y 越小。
  //    第一版写成 `y0 = map.y(0.72)` 当下边、`y1 = map.y(0.28)` 当上边,
  //    于是 `height = y0 - y1` 是**负数**,浏览器每帧报一次
  //    "<rect> attribute height: A negative value is not valid"。
  //    名字写清楚哪个是上、哪个是下,这类错就不容易再犯。
  const yTop = map.y(0.72);
  const yBottom = map.y(0.28);
  return (
    <Frame label="Shrinking blocks filling a fixed strip and never quite reaching the end">
      <rect x={map.x(0)} y={yTop} width={map.x(1) - map.x(0)} height={yBottom - yTop}
        fill="none" stroke={COLOR.axis} strokeWidth={1} />
      {list.map((block, i) => {
        if (i >= shown) return null;
        const before = i === 0 ? 0 : sums[i - 1]!;
        const visible = Math.min(1, shown - i);
        return (
          <rect
            key={i}
            x={map.x(before)} y={yTop}
            width={(map.x(before + block.value * visible) - map.x(before))}
            height={yBottom - yTop}
            fill={i % 2 === 0 ? COLOR.hero : COLOR.introduce}
            fillOpacity={0.75}
          />
        );
      })}
      {/* 会动的那条前沿线放最后 */}
      <line
        x1={map.x(sums[Math.max(0, Math.floor(shown) - 1)] ?? 0)} y1={yTop - 4}
        x2={map.x(sums[Math.max(0, Math.floor(shown) - 1)] ?? 0)} y2={yBottom + 4}
        stroke={COLOR.result} strokeWidth={1.6}
      />
    </Frame>
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * 七条**推导链**的预览。
 *
 * ⚠️ 这七条链(derivative / riemann-sum / log-integral / shell-method /
 *    disk-method / unit-circle / trig-rates)一直都在,路由也一直能开,
 *    但首页从改版起就不再列出它们 —— 于是**只能靠手打 URL 进去**。
 *    按 AGENTS.md,推导链恰恰是这个产品的差异点,不该是藏起来的那部分。
 *
 * ⚠️ 和上面二十九张一样,曲线一律来自 `src/math/`,组件里不出现裸算式(禁止 2)。
 *    这里用的是链自己用的那几个模块,所以卡片上画的和课里算的是同一份数学。
 * ══════════════════════════════════════════════════════════════════════ */

/** 离散档位:预览里"数量变多"要跳档,不要连续变 —— 连续变会把倍增关系糊掉。 */
function stepCount(phase: number, steps: readonly number[]): number {
  const i = Math.min(steps.length - 1, Math.floor(pingPong(phase) * steps.length));
  return steps[i]!;
}

/* ── ㉚ 黎曼和:矩形越切越多,越贴越紧 ───────────────────────────── */
export function RiemannPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.12, 2.12, -0.4, 4.6);
  const n = stepCount(phase, [2, 4, 8, 16]);
  const rects = riemannRectangles(PARABOLA_DOWN, n, [0, 2], 'mid');
  const curve = samples(PARABOLA_DOWN.f, 0, 2, 60);
  return (
    <Frame label="Rectangles under a curve, doubling in number until they fill the region">
      {rects.map((r, i) => {
        const left = map.x(r.x - r.dx / 2);
        const top = map.y(r.height);
        return (
          <rect key={i} x={left} y={top} width={Math.max(0, map.x(r.x + r.dx / 2) - left)}
            height={Math.max(0, map.y(0) - top)} fill={COLOR.region} fillOpacity={0.45}
            stroke={COLOR.hero} strokeWidth={0.7} />
        );
      })}
      <path d={path(curve, map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(2)} y2={map.y(0)} stroke={COLOR.axis} strokeWidth={1.2} />
    </Frame>
  );
}

/* ── ㉛ 导数:点沿曲线走,下方同时画出斜率自己的那条线 ─────────────── */
export function DerivativePreview({ phase }: { phase: number }) {
  // 上半张画 f,下半张画 f′ —— 导数**是被画出来的**,不是被写出来的。
  const map = makeMap(-0.12, 2.12, -4.6, 4.6);
  const a = 0.12 + pingPong(phase) * 1.76;
  const tan = derivTangent(PARABOLA_DOWN, a);
  const curve = samples(PARABOLA_DOWN.f, 0, 2, 60);
  const slopeCurve = samples((x) => derivTangent(PARABOLA_DOWN, x).slope, 0, 2, 60);
  const traced = samples((x) => derivTangent(PARABOLA_DOWN, x).slope, 0, Math.max(0.001, a), 40);
  const reach = 0.42;
  return (
    <Frame label="A point sliding along a curve while the slope it carries traces out a second curve">
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(2)} y2={map.y(0)} stroke={COLOR.axis} strokeWidth={1.2} />
      <path d={path(curve, map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <path d={path(slopeCurve, map)} fill="none" stroke={COLOR.result} strokeWidth={1.2}
        strokeDasharray="4 4" opacity={0.4} />
      <path d={path(traced, map)} fill="none" stroke={COLOR.result} strokeWidth={2.2} strokeLinecap="round" />
      <line
        x1={map.x(a - reach)} y1={map.y(PARABOLA_DOWN.f(a) - tan.slope * reach)}
        x2={map.x(a + reach)} y2={map.y(PARABOLA_DOWN.f(a) + tan.slope * reach)}
        stroke={COLOR.hero} strokeWidth={2.2} strokeLinecap="round" />
      <circle cx={map.x(a)} cy={map.y(PARABOLA_DOWN.f(a))} r={4} fill={COLOR.hero} />
      <circle cx={map.x(a)} cy={map.y(tan.slope)} r={4} fill={COLOR.result} />
    </Frame>
  );
}

/* ── ㉜ 自然对数:1/x 底下的面积一路长出去 ─────────────────────── */
export function LogIntegralPreview({ phase }: { phase: number }) {
  const map = makeMap(0.6, 6.4, -0.12, 1.35);
  const t = 1.55 + holdAtEnds(phase) * 4.05;
  const under = (x: number) => 1 / x;
  const region = samples(under, 1, t, 56);
  const full = samples(under, 0.72, 6.3, 70);
  const area = areaUnderReciprocal(t);
  const filled = area !== null && area > 1;   // 面积刚好走过 1 的那一刻(t = e)
  return (
    <Frame label="The area under one over x growing to the right, passing the value one">
      <path d={`${path(region, map)} L${map.x(t).toFixed(1)} ${map.y(0).toFixed(1)} L${map.x(1).toFixed(1)} ${map.y(0).toFixed(1)} Z`}
        fill={filled ? COLOR.result : COLOR.region} fillOpacity={0.55}
        stroke={filled ? COLOR.result : COLOR.region} strokeWidth={0.8} />
      <path d={path(full, map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      <line x1={map.x(0.6)} y1={map.y(0)} x2={map.x(6.4)} y2={map.y(0)} stroke={COLOR.axis} strokeWidth={1.2} />
      <line x1={map.x(t)} y1={map.y(0)} x2={map.x(t)} y2={map.y(under(t))} stroke={COLOR.hero} strokeWidth={2} />
      <circle cx={map.x(t)} cy={map.y(under(t))} r={3.6} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ㉝ 壳法:一条竖条被拉出来,摊平成一块长方形 ─────────────────── */
export function ShellPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.12, 2.12, -0.4, 4.6);
  const slices = shellSlices(PARABOLA_DOWN, 9, [0, 2]);
  const pick = Math.min(slices.length - 1, Math.floor(pingPong(phase) * slices.length));
  const curve = samples(PARABOLA_DOWN.f, 0, 2, 60);
  return (
    <Frame label="One vertical strip of a region highlighted, the strip that becomes a cylindrical shell">
      {slices.map((sl, i) => {
        const left = map.x(sl.x - sl.dx / 2);
        const top = map.y(sl.h);
        const on = i === pick;
        return (
          <rect key={i} x={left} y={top} width={Math.max(0, map.x(sl.x + sl.dx / 2) - left)}
            height={Math.max(0, map.y(0) - top)}
            fill={on ? COLOR.hero : COLOR.region} fillOpacity={on ? 0.75 : 0.3}
            stroke={on ? COLOR.hero : COLOR.thickness} strokeWidth={on ? 1.4 : 0.6} />
        );
      })}
      <path d={path(curve, map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      {/* 半径是从轴量到这条竖条的距离 —— 红色,和场景里同一个语义 */}
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(slices[pick]!.x)} y2={map.y(0)}
        stroke={COLOR.radius} strokeWidth={2} />
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(0)} y2={map.y(4.4)} stroke={COLOR.axis} strokeWidth={1.4} />
    </Frame>
  );
}

/* ── ㉞ 盘法:换一个方向切,横着一层一层叠 ───────────────────────── */
export function DiskPreview({ phase }: { phase: number }) {
  const map = makeMap(-0.12, 2.12, -0.4, 4.6);
  const slices = diskSlices(PARABOLA_INVERSE, 8, [0, 4]);
  const pick = Math.min(slices.length - 1, Math.floor(pingPong(phase) * slices.length));
  const curve = samples(PARABOLA_DOWN.f, 0, 2, 60);
  return (
    <Frame label="The same region cut into horizontal slabs instead of vertical strips">
      {slices.map((sl, i) => {
        const top = map.y(sl.t + sl.dt / 2);
        const on = i === pick;
        return (
          <rect key={i} x={map.x(0)} y={top} width={Math.max(0, map.x(sl.r) - map.x(0))}
            height={Math.max(0, map.y(sl.t - sl.dt / 2) - top)}
            fill={on ? COLOR.hero : COLOR.region} fillOpacity={on ? 0.75 : 0.3}
            stroke={on ? COLOR.hero : COLOR.thickness} strokeWidth={on ? 1.4 : 0.6} />
        );
      })}
      <path d={path(curve, map)} fill="none" stroke={COLOR.curve} strokeWidth={2} strokeLinecap="round" />
      {/* 这一层的半径是横着量的 */}
      <line x1={map.x(0)} y1={map.y(slices[pick]!.t)} x2={map.x(slices[pick]!.r)} y2={map.y(slices[pick]!.t)}
        stroke={COLOR.radius} strokeWidth={2} />
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(0)} y2={map.y(4.4)} stroke={COLOR.axis} strokeWidth={1.4} />
    </Frame>
  );
}

/* ── ㉟ 单位圆:一个点绕圈,cos 与 sin 是它的两条投影 ─────────────── */
export function UnitCirclePreview({ phase }: { phase: number }) {
  const map = makeSquareMap(1.28);           // ⚠️ 等比例 —— 圆不能画成椭圆
  const theta = pingPong(phase) * Math.PI;
  const [cx, cy] = circlePoint(theta);
  const ring = samples2((t) => circlePoint(t * Math.PI * 2), 0, 1, 72);
  return (
    <Frame label="A point moving around the unit circle with its horizontal and vertical projections">
      <line x1={map.x(-1.25)} y1={map.y(0)} x2={map.x(1.25)} y2={map.y(0)} stroke={COLOR.axisDepth} strokeWidth={1} />
      <line x1={map.x(0)} y1={map.y(-1.25)} x2={map.x(0)} y2={map.y(1.25)} stroke={COLOR.axisDepth} strokeWidth={1} />
      <path d={path(ring, map)} fill="none" stroke={COLOR.axis} strokeWidth={1.4} />
      {/* cos 走 x 方向(红),sin 走高度(蓝) —— 和全站语义一致 */}
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(cx)} y2={map.y(0)} stroke={COLOR.radius} strokeWidth={2.6} />
      <line x1={map.x(cx)} y1={map.y(0)} x2={map.x(cx)} y2={map.y(cy)} stroke={COLOR.height} strokeWidth={2.6} />
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(cx)} y2={map.y(cy)} stroke={COLOR.hero} strokeWidth={1.6} />
      <circle cx={map.x(cx)} cy={map.y(cy)} r={4} fill={COLOR.hero} />
    </Frame>
  );
}

/* ── ㊱ 三角变化率:速度向量永远和半径垂直 ───────────────────────── */
export function TrigRatesPreview({ phase }: { phase: number }) {
  const map = makeSquareMap(1.55);           // ⚠️ 同上,等比例
  const theta = pingPong(phase) * Math.PI;
  const [cx, cy] = circlePoint(theta);
  const [vx, vy] = circleVelocity(theta);
  const k = 0.5;
  const ring = samples2((t) => circlePoint(t * Math.PI * 2), 0, 1, 72);
  return (
    <Frame label="A point on the unit circle with its velocity arrow staying at a right angle to the radius">
      <line x1={map.x(-1.5)} y1={map.y(0)} x2={map.x(1.5)} y2={map.y(0)} stroke={COLOR.axisDepth} strokeWidth={1} />
      <line x1={map.x(0)} y1={map.y(-1.5)} x2={map.x(0)} y2={map.y(1.5)} stroke={COLOR.axisDepth} strokeWidth={1} />
      <path d={path(ring, map)} fill="none" stroke={COLOR.axis} strokeWidth={1.4} />
      <line x1={map.x(0)} y1={map.y(0)} x2={map.x(cx)} y2={map.y(cy)} stroke={COLOR.radius} strokeWidth={2.2} />
      <line x1={map.x(cx)} y1={map.y(cy)} x2={map.x(cx + vx * k)} y2={map.y(cy + vy * k)}
        stroke={COLOR.introduce} strokeWidth={2.8} strokeLinecap="round" />
      <circle cx={map.x(cx)} cy={map.y(cy)} r={4} fill={COLOR.hero} />
      <circle cx={map.x(cx + vx * k)} cy={map.y(cy + vy * k)} r={3} fill={COLOR.introduce} />
    </Frame>
  );
}

/* ── ㊲ 链式法则:一步 x 变成一步 u,再变成一步 y —— 倍率相乘 ────── */
export function ChainRulePreview({ phase }: { phase: number }) {
  // 三条各自定比例的数轴。⚠️ 要让人看见的是"这一跳被放大了多少",
  //    所以每条按自己那一步定比例,而不是共用一个坐标系。
  const pair = CHAIN_PAIRS[0]!;                 // y = (2x)² —— 两级都非平凡
  const x = -0.9 + pingPong(phase) * 1.8;
  const dx = 0.35;
  const s = stretchFactors(pair, x, dx);
  const rows = s
    ? [
        { from: x, delta: s.dx, color: COLOR.introduce },
        { from: pair.inner.at(x), delta: s.du, color: COLOR.hero },
        { from: pair.outer.at(pair.inner.at(x)), delta: s.dy, color: COLOR.result },
      ]
    : [];
  return (
    <Frame label="One step in x becoming a larger step in u and a larger step again in y">
      {rows.map((row, i) => {
        const y = 24 + i * 34;
        const span = Math.max(Math.abs(row.delta) * 3, 1e-9);
        const mid = W / 2;
        const px = (v: number) => mid + ((v - row.from) / span) * (W * 0.34);
        return (
          <g key={i}>
            <line x1={24} y1={y} x2={W - 24} y2={y} stroke={COLOR.axis} strokeWidth={1.1} />
            <line x1={px(row.from)} y1={y} x2={px(row.from + row.delta)} y2={y}
              stroke={row.color} strokeWidth={4.5} strokeLinecap="round" />
            <circle cx={px(row.from)} cy={y} r={3.4} fill={COLOR.background} stroke={row.color} strokeWidth={1.8} />
            <circle cx={px(row.from + row.delta)} cy={y} r={3.4} fill={row.color} />
          </g>
        );
      })}
      {[0, 1].map((i) => (
        <line key={i} x1={W / 2} y1={24 + i * 34 + 6} x2={W / 2} y2={24 + (i + 1) * 34 - 6}
          stroke={COLOR.thickness} strokeWidth={1} strokeDasharray="3 3" />
      ))}
    </Frame>
  );
}

/* ── ㊳ u-换元:同一批竖条,两种宽度 ──────────────────────────── */
export function SubstitutionPreview({ phase }: { phase: number }) {
  // 上排按 x 的宽度画,下排按 u 的宽度画 —— 条数相同,宽窄不同。
  // ⚠️ 这正是 `du = g′dx` 要说的事,所以预览画的就是这件事本身。
  const c = SUB_CASES[0]!;                      // cos(x²)·2x,内层弯,宽度差别看得见
  const n = stepCount(phase, [4, 8, 16]);
  const list = subSlices(c, n);
  if (list.length === 0) return <Frame label="Strips"><g /></Frame>;
  const uLo = Math.min(...list.map((s) => s.u0));
  const uHi = Math.max(...list.map((s) => s.u1));
  const f = subIntegrand(c);
  const top = Math.max(...list.map((s) => Math.abs(f((s.x0 + s.x1) / 2))), 1e-9);
  const band = (v: number, lo: number, hi: number) => 12 + ((v - lo) / (hi - lo || 1)) * (W - 24);
  return (
    <Frame label="The same strips drawn twice, once with widths in x and once with widths in u">
      {list.map((s, i) => {
        const h = Math.abs(f((s.x0 + s.x1) / 2)) / top;
        const xL = band(s.x0, c.a, c.b);
        const xR = band(s.x1, c.a, c.b);
        const uL = band(s.u0, uLo, uHi);
        const uR = band(s.u1, uLo, uHi);
        return (
          <g key={i}>
            <rect x={xL} y={48 - h * 34} width={Math.max(xR - xL, 0.5)} height={h * 34}
              fill={COLOR.region} fillOpacity={0.5} stroke={COLOR.introduce} strokeWidth={0.5} />
            <rect x={uL} y={62} width={Math.max(uR - uL, 0.5)} height={h * 34}
              fill={COLOR.region} fillOpacity={0.5} stroke={COLOR.hero} strokeWidth={0.5} />
          </g>
        );
      })}
      <line x1={12} y1={48} x2={W - 12} y2={48} stroke={COLOR.axis} strokeWidth={1} />
      <line x1={12} y1={62} x2={W - 12} y2={62} stroke={COLOR.axis} strokeWidth={1} />
    </Frame>
  );
}

export const PREVIEWS: Readonly<Record<string, (props: { phase: number }) => React.ReactElement>> = {
  'difference-of-squares': SquaresPreview,
  'difference-of-cubes': CubesPreview,
  'binomial-theorem': BinomialPreview,
  'geometric-series': SeriesPreview,
  indeterminate: IndeterminatePreview,
  'tan-over-x': TanOverXPreview,
  'cos-over-x': CosOverXPreview,
  'cos-over-x2': CosOverX2Preview,
  'exp-over-x': ExpOverXPreview,
  'log-over-x': LogOverXPreview,
  'special-limits': ExplorerPreview,
  'one-sided': OneSidedPreview,
  'secant-to-tangent': ShrinkPreview,
  'sin-over-x': SpecialLimitPreview,
  squeeze: SqueezePreview,
  'infinite-limits': InfinitePreview,
  'epsilon-delta': EpsilonDeltaPreview,
  'limit-vs-value': LimitPointPreview,
  intervals: ScanPreview,
  nondecreasing: NondecreasingPreview,
  nonincreasing: NonincreasingPreview,
  increasing: IncreasingPreview,
  symmetry: SymmetryPreview,
  periodic: PeriodicPreview,
  secant: SecantPreview,
  floor: FloorPreview,
  ceiling: CeilingPreview,
  functions: FunctionPreview,
  domain: DomainPreview,
  // 七条推导链
  'chain-rule': ChainRulePreview,
  'u-substitution': SubstitutionPreview,
  'riemann-sum': RiemannPreview,
  derivative: DerivativePreview,
  'log-integral': LogIntegralPreview,
  'shell-method': ShellPreview,
  'disk-method': DiskPreview,
  'unit-circle': UnitCirclePreview,
  'trig-rates': TrigRatesPreview,
};
