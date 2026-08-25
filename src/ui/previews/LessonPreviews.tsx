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
import { SECANT_FN, secantLine, readSecant } from '../../math/rateOfChange';
import { PERIODIC_FUNCTIONS } from '../../math/periodicity';
import { SYMMETRY_FUNCTIONS } from '../../math/symmetry';
import { ceilByDefinition, floorByDefinition } from '../../math/rounding';
import { MACHINE } from '../../math/functionRelation';
import { FUNCTIONS as DOMAIN_FUNCTIONS } from '../../math/domain';
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

function samples(at: (x: number) => number, from: number, to: number, n = 60) {
  return Array.from({ length: n + 1 }, (_, i) => {
    const x = from + ((to - from) * i) / n;
    return { x, y: at(x) };
  });
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

export const PREVIEWS: Readonly<Record<string, (props: { phase: number }) => React.ReactElement>> = {
  'one-sided': OneSidedPreview,
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
};
