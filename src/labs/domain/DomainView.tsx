/**
 * LAB — 定义域视图:曲线 + x 轴上的「准入条」。
 *
 * ⚠️ 这一节的主角**不是曲线,是那条 x 轴上的带子** ——
 * 允许的一段发光,禁止的一段压暗。定义域是关于**输入**的事,
 * 所以视觉重心必须压在 x 轴上,而不是曲线上。
 *
 * ⚠️ 端点的实心/空心由数据决定,不是写死的:
 *   √x 在 0 处**有**值 → 实心;1/x 在 0 处**没**值 → 空心。
 * 写死一种,另一个函数的边界就骗人。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  DOMAIN_RANGE,
  sampleCurve,
  showX,
  showY,
  visibleAllowed,
  type DomainFunction,
  type DomainReading,
} from '../../math/domain';

export const V = makeViewport({
  width: 660,
  height: 352,
  xMin: -4.4,
  xMax: 6.4,
  // 1/x 会往下跑,所以纵向要留负半边;√x 用不到,但三条曲线共用一个取景才不会跳。
  yMin: -3.2,
  yMax: 4.4,
  padLeft: 34,
  padRight: 24,
  padTop: 18,
  padBottom: 62,
});

/**
 * 准入条画在**画布底部预留的那条带里**,位置固定。
 *
 * ⚠️ 第一版把它挂在 `y0 + 30`(相对 x 轴)。y = 0 在画面里的高度随取景变化,
 * 于是条子飘在中间,底部预留的 padBottom 白白空着一大片,看着像没画完。
 * 它讲的是**输入**,本来就该待在最下面那一行,和曲线各占各的地方。
 */
const STRIP_HEIGHT = 12;

export function DomainView({
  fn,
  reading,
  onChangeX,
}: {
  fn: DomainFunction;
  reading: DomainReading;
  onChangeX: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  const stripY = V.height - V.padBottom + 26;
  const segments = visibleAllowed(fn, V.xMin, V.xMax);
  const curve = sampleCurve(fn, V.xMin, V.xMax, 520);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${fn.label} with the allowed part of the x-axis highlighted`}
    >
      <defs>
        {/* 发光。很轻 —— 提示词要的是 subtle。 */}
        <filter id="domain-glow" x="-40%" y="-140%" width="180%" height="380%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* 禁区用斜纹压暗,不只是变灰 —— 灰色容易被当成"还没画" */}
        <pattern id="domain-forbidden" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="7" stroke={LAB.fail} strokeWidth="1.6" opacity="0.35" />
        </pattern>
      </defs>

      {/* 整条轴先铺成禁区,允许的那几段再盖上去 —— 顺序保证不会漏掉缝隙 */}
      <rect
        x={V.padLeft}
        y={stripY - STRIP_HEIGHT / 2}
        width={V.width - V.padLeft - V.padRight}
        height={STRIP_HEIGHT}
        rx={6}
        fill="url(#domain-forbidden)"
        stroke={LAB.fail}
        strokeWidth={1}
        opacity={0.5}
      />

      {/*
        ⚠️ 开端点要**留一道缝**。
        1/x 的两段在 x = 0 处首尾相接,加上发光一晕,屏幕上就是一条连续的绿条 ——
        而右边面板写着 `(-∞,0) ∪ (0,∞)`,"两段"这件事在图上完全看不见。
        缝隙只留 3px:数学上那个洞是单点(测度为零),画太宽就成了另一种谎。
      */}
      {segments.map((seg, i) => {
        const inset = (open: boolean) => (open ? 3 : 0);
        const left = toSvgX(V, seg.from) + inset(!seg.closedFrom && seg.from > V.xMin);
        const right = toSvgX(V, seg.to) - inset(!seg.closedTo && seg.to < V.xMax);
        return (
        <g key={i}>
          <rect
            x={left}
            y={stripY - STRIP_HEIGHT / 2}
            width={Math.max(0, right - left)}
            height={STRIP_HEIGHT}
            rx={6}
            fill={LAB.pass}
            opacity={0.85}
            filter="url(#domain-glow)"
            style={{ transition: 'x 260ms ease, width 260ms ease' }}
          />
          {/*
            端点标记。**实心 = 属于定义域,空心 = 不属于**。
            只有真正的端点才画;被窗口裁掉的那一端 `closedFrom/To` 已经是 false。
          */}
          {/* 只给**真正的**端点画标记:被窗口裁掉的那一端不画,否则会骗人说"这里到头了" */}
          {seg.from > V.xMin && (
            <circle
              cx={toSvgX(V, seg.from)}
              cy={stripY}
              r={5.5}
              fill={seg.closedFrom ? LAB.pass : '#0b1020'}
              stroke={seg.closedFrom ? '#0b1020' : LAB.fail}
              strokeWidth={2}
            />
          )}
        </g>
        );
      })}

      {/* 被挖掉的那一个点 —— 1/x 的 x = 0 */}
      {fn.hole !== null && (
        <g>
          <circle cx={toSvgX(V, fn.hole)} cy={stripY} r={6} fill="#0b1020" stroke={LAB.fail} strokeWidth={2.4} />
          <text
            x={toSvgX(V, fn.hole)}
            y={stripY - STRIP_HEIGHT / 2 - 7}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            x ≠ {Number.isInteger(fn.hole) ? fn.hole : showX(fn.hole)}
          </text>
        </g>
      )}

      {/*
        ⚠️ 这行小标题原来贴在条子正上方,而那正是 x 轴刻度数字那一行 ——
        "ALLOWED INPUTS" 直接压在 "-2 -1 0 1" 上。挪到条子**下方**,那里是空的。
      */}
      <text
        x={V.padLeft}
        y={stripY + STRIP_HEIGHT / 2 + 13}
        fill={LAB.muted}
        fontSize={10}
        fontWeight={700}
        letterSpacing={1.6}
        fontFamily="ui-monospace, monospace"
      >
        ALLOWED INPUTS
      </text>

      {/* 坐标轴 */}
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        <line x1={x0} y1={V.padTop} x2={x0} y2={y0 + 8} stroke={LAB.axis} strokeWidth={1.2} />
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
        {ticks(V.yMin, V.yMax, 2).filter((t) => t !== 0).map((t) => (
          <text
            key={`y${t}`}
            x={x0 - 8}
            y={toSvgY(V, t) + 4}
            fill={LAB.muted}
            fontSize={11}
            textAnchor="end"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            {t}
          </text>
        ))}
      </g>

      {/*
        曲线。⚠️ `polylinePath` 遇到 null 会断笔 ——
        1/x 在 0 两侧因此不会被连成一条穿过渐近线的假线。
      */}
      <path
        d={polylinePath(V, curve)}
        fill="none"
        stroke={LAB.curve}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'd 300ms ease' }}
      />

      {/* 当前这个 x 的竖线:允许时青色,禁止时红色虚线 */}
      <line
        x1={toSvgX(V, reading.x)}
        y1={V.padTop}
        x2={toSvgX(V, reading.x)}
        y2={stripY}
        stroke={reading.allowed ? LAB.x2 : LAB.fail}
        strokeWidth={1.8}
        strokeDasharray={reading.allowed ? '4 4' : '3 5'}
        opacity={0.85}
        style={{ transition: 'stroke 200ms ease' }}
      />

      {/* 曲线上的那个点 —— **不允许时根本不画**,这就是"没有输出" */}
      {reading.allowed && reading.y !== null && (
        <g>
          <line
            x1={toSvgX(V, reading.x)}
            y1={toSvgY(V, reading.y)}
            x2={x0}
            y2={toSvgY(V, reading.y)}
            stroke={LAB.pass}
            strokeWidth={1.4}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          <circle cx={toSvgX(V, reading.x)} cy={toSvgY(V, reading.y)} r={10} fill={LAB.pass} opacity={0.16} />
          <circle cx={toSvgX(V, reading.x)} cy={toSvgY(V, reading.y)} r={5.5} fill={LAB.pass} stroke="#0b1020" strokeWidth={1.8} />
          <text
            x={toSvgX(V, reading.x) + (reading.x > 4 ? -11 : 11)}
            y={toSvgY(V, reading.y) - 11}
            fill={LAB.pass}
            fontSize={12}
            fontWeight={700}
            textAnchor={reading.x > 4 ? 'end' : 'start'}
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            ({showX(reading.x)}, {showY(reading.y)})
          </text>
        </g>
      )}

      {/* 不允许时:在本该有点的地方画一个红叉,说明"这里没有" */}
      {!reading.allowed && (
        <g>
          {[
            [-6, -6, 6, 6],
            [-6, 6, 6, -6],
          ].map(([dx1, dy1, dx2, dy2], i) => (
            <line
              key={i}
              x1={toSvgX(V, reading.x) + dx1!}
              y1={y0 - 46 + dy1!}
              x2={toSvgX(V, reading.x) + dx2!}
              y2={y0 - 46 + dy2!}
              stroke={LAB.fail}
              strokeWidth={2.6}
              strokeLinecap="round"
            />
          ))}
          <text
            x={toSvgX(V, reading.x)}
            y={y0 - 62}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            no point here
          </text>
        </g>
      )}

      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.x}
        onChange={onChangeX}
        interval={DOMAIN_RANGE}
        color={reading.allowed ? LAB.x2 : LAB.fail}
        label=""
        step={0.1}
        describe={(v) => `x equals ${showX(v)}`}
      />
    </svg>
  );
}
