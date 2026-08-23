/**
 * LAB — 「所有对」的地图
 *
 * 这一块不在原始需求里,是我加的,理由如下。
 *
 * 需求里第 4 部分打算用"快速扫过很多对"来表达 ∀。问题是扫描扫完就没了 ——
 * 学生看到的是一串闪过的例子,而"闪过很多个"和"全部"在直觉上仍然是两回事,
 * 甚至更糟:扫得越流畅,越像是"已经全试过了"。那恰恰是需求里明令要避免的误导。
 *
 * 这张图把**每一对**都变成一个坐标:横轴 x₁,纵轴 x₂。
 * 因为要求 x₁ < x₂,所有合法的对正好铺满对角线上方那个**三角形**。
 * 于是:
 *   · 三角形 = 定义要求覆盖的全体(连续、无穷)
 *   · 每个点 = 我们真的验过的一对(离散、有限)
 * 扫描往里打点,打得再多,三角形永远是**大片空白** —— ∀ 与有限抽样的差距
 * 从一句免责声明变成了肉眼可见的面积。
 *
 * 到了反例那一节,同一张图上会出现一整块红色区域,
 * "只要一个点就够了"也因此有了位置感:随便戳进红区的哪一点都行。
 */
import { LAB } from '../theme';
import type { Interval } from '../../../math/monotonicity';

const SIZE = 190;
const PAD = 24;

export interface PairDot {
  readonly x1: number;
  readonly x2: number;
  readonly passes: boolean;
}

function project(value: number, interval: Interval): number {
  return PAD + ((value - interval.a) / (interval.b - interval.a)) * (SIZE - PAD * 2);
}

export function PairSpaceMap({
  interval,
  dots,
  current,
  showFailRegion = false,
}: {
  interval: Interval;
  dots: readonly PairDot[];
  current: { x1: number; x2: number; passes: boolean } | null;
  /** 反例模式下把整个失败区域涂出来 */
  showFailRegion?: boolean;
}) {
  const lo = project(interval.a, interval);
  const hi = project(interval.b, interval);
  const flipY = (v: number) => SIZE - v;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[190px]"
        role="img"
        aria-label="A map of every valid pair. Each dot is one pair we actually tested; the triangle is all of them."
      >
        {/* 合法区域:x₂ > x₁ 的那半边 */}
        <polygon
          points={`${lo},${flipY(lo)} ${hi},${flipY(hi)} ${lo},${flipY(hi)}`}
          fill={LAB.interval}
          opacity={0.16}
          stroke={LAB.interval}
          strokeWidth={1}
        />

        {/* x² 在含 0 的区间上,反例区就是"两点都在顶点左侧"那一小块 */}
        {showFailRegion && interval.a < 0 && (
          <polygon
            points={`${project(interval.a, interval)},${flipY(project(interval.a, interval))} ${project(0, interval)},${flipY(project(0, interval))} ${project(interval.a, interval)},${flipY(project(0, interval))}`}
            fill={LAB.fail}
            opacity={0.28}
          />
        )}

        <line x1={lo} y1={flipY(lo)} x2={hi} y2={flipY(hi)} stroke={LAB.muted} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.7} />

        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={project(dot.x1, interval)}
            cy={flipY(project(dot.x2, interval))}
            r={1.6}
            fill={dot.passes ? LAB.pass : LAB.fail}
            opacity={0.75}
          />
        ))}

        {current && (
          <circle
            cx={project(current.x1, interval)}
            cy={flipY(project(current.x2, interval))}
            r={4}
            fill={current.passes ? LAB.pass : LAB.fail}
            stroke="#0b1020"
            strokeWidth={1.5}
          />
        )}

        <text x={SIZE / 2} y={SIZE - 6} fill={LAB.muted} fontSize={9} textAnchor="middle" fontFamily="ui-monospace, monospace">
          x₁ →
        </text>
        <text x={7} y={12} fill={LAB.muted} fontSize={9} fontFamily="ui-monospace, monospace">
          ↑ x₂
        </text>
      </svg>
      <figcaption className="mt-1.5 text-[11px] leading-snug text-slate-500">
        The triangle is <strong className="text-slate-300">every</strong> pair with x₁ &lt; x₂. Each
        dot is one we tested.
      </figcaption>
    </figure>
  );
}
