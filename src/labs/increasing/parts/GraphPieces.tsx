/**
 * LAB — 图上的静态零件:坐标轴、区间高亮、曲线、辅助线、曲线上的点。
 *
 * 全部是**受控的纯展示组件** —— 自己不存状态、不算数学。
 * 屏幕上出现的每个数字都由上层从 `src/math/monotonicity.ts` 取好再传进来。
 */
import { LAB } from '../theme';
import {
  makeViewport,
  plotHeight,
  polylinePath,
  ticks,
  toSvgX,
  toSvgY,
  type Viewport,
} from '../../shared/viewport';
import type { Interval } from '../../../math/monotonicity';

/** 这一节自己的取景:x ∈ [-2.6, 3.6],y 只需要正半边 */
export const V: Viewport = makeViewport({ xMin: -2.6, xMax: 3.6, yMin: -1.1, yMax: 9.8 });

export function Axes() {
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  return (
    <g aria-hidden="true">
      <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
      <line x1={x0} y1={V.padTop} x2={x0} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1.2} />
      {ticks(V.xMin, V.xMax, 1).map((t) => (
        <g key={`x${t}`}>
          <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
          {t !== 0 && (
            <text x={toSvgX(V, t)} y={y0 + 17} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {t}
            </text>
          )}
        </g>
      ))}
      {ticks(0, V.yMax, 2).filter((t) => t > 0).map((t) => (
        <g key={`y${t}`}>
          <line x1={x0 - 4} y1={toSvgY(V, t)} x2={x0 + 4} y2={toSvgY(V, t)} stroke={LAB.axis} strokeWidth={1} />
          <text x={x0 - 9} y={toSvgY(V, t) + 4} fill={LAB.muted} fontSize={11} textAnchor="end" fontFamily="ui-monospace, monospace">
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

/** 当前区间 I 的底色。区间变化时靠 CSS transition 平滑地伸缩,不是瞬间跳过去。 */
export function IntervalHighlight({ interval, label }: { interval: Interval; label: string }) {
  const left = toSvgX(V, interval.a);
  const right = toSvgX(V, interval.b);
  return (
    <g>
      <rect
        x={left}
        y={V.padTop}
        width={Math.max(0, right - left)}
        height={plotHeight(V)}
        fill={LAB.interval}
        opacity={0.13}
        style={{ transition: 'x 420ms ease, width 420ms ease' }}
      />
      {[interval.a, interval.b].map((edge, i) => (
        <line
          key={i}
          x1={toSvgX(V, edge)}
          y1={V.padTop}
          x2={toSvgX(V, edge)}
          y2={V.height - V.padBottom}
          stroke={LAB.interval}
          strokeWidth={1.5}
          opacity={0.55}
          strokeDasharray="3 4"
          style={{ transition: 'x1 420ms ease, x2 420ms ease' }}
        />
      ))}
      <text
        x={(left + right) / 2}
        y={V.padTop + 15}
        fill="#93c5fd"
        fontSize={12}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        style={{ transition: 'x 420ms ease' }}
      >
        {label}
      </text>
    </g>
  );
}

export function Curve({ points, dimmed = false }: {
  points: readonly { x: number; y: number | null }[];
  dimmed?: boolean;
}) {
  return (
    <path
      d={polylinePath(V, points)}
      fill="none"
      stroke={LAB.curve}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={dimmed ? 0.3 : 1}
      style={{ transition: 'opacity 300ms ease, d 380ms ease' }}
    />
  );
}

/**
 * 从 x 轴竖直上去、再水平回到 y 轴的两条辅助线,外加曲线上的那个点。
 * 这三样是同一个动作的三个阶段,所以放在一个组件里 —— 拆开会各自淡入,读起来像三件事。
 */
export function GuideLines({ x, y, color, label, showValue, labelShiftY = 0 }: {
  x: number;
  y: number;
  color: string;
  label: string;
  showValue: string;
  /** 两个读数挨太近时,由上层把它们错开(见 InteractiveGraph) */
  labelShiftY?: number;
}) {
  const px = toSvgX(V, x);
  const py = toSvgY(V, y);
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  return (
    <g>
      <line x1={px} y1={y0} x2={px} y2={py} stroke={color} strokeWidth={1.3} strokeDasharray="4 4" opacity={0.75} />
      <line x1={px} y1={py} x2={x0} y2={py} stroke={color} strokeWidth={1.3} strokeDasharray="4 4" opacity={0.75} />
      <circle cx={px} cy={py} r={9} fill={color} opacity={0.16} />
      <circle cx={px} cy={py} r={4.5} fill={color} stroke="#0b1020" strokeWidth={1.5} />
      {/*
        标签放在 y 轴**左侧**、右对齐。
        原来放在 `x0 + 7` 也就是轴的右边,可这一节的区间 [0,3] 恰好也在轴右边,
        于是读数直接压在曲线和取样点上(`f(x₁) = 0.64` 正好盖住那个青色的点)。
        轴左边是空的,把两个读数挪过去,曲线区就干净了。
      */}
      <text
        x={x0 - 8}
        y={py - 5 + labelShiftY}
        fill={color}
        fontSize={12}
        fontFamily="ui-monospace, monospace"
        fontWeight={600}
        textAnchor="end"
      >
        {label} = {showValue}
      </text>
    </g>
  );
}
