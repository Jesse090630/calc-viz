/**
 * LAB — 「The Point Doesn't Decide the Limit」的图。
 *
 * 一条直线 `y = x + 1`,在 x = 1 处**挖掉一个洞**(空心圈)。
 * 两个点从两侧走向那个洞;另有一个**可以上下拖**的孤立点代表 f(1)。
 *
 * ⚠️ 孤立点怎么拖,曲线与两个走近的点**一动不动**。
 * 这就是这一节的全部内容,所以它必须在画面上是**物理上分开的两件事**:
 * 洞在直线上,孤立点在别处,两者之间画一条竖直的虚线量出差距。
 *
 * ⚠️ 竖直拖动是这一节的关键交互,共享的 `DraggableXPoint` 是横向的,
 * 所以这里写了一个本地的纵向手柄(暂不提升到 shared —— 只有这一节用)。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useCallback, useEffect, useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  A,
  HOLE_Y,
  POINT_RANGE,
  VIEW,
  Y_VIEW,
  limitAtHole,
  sampleBranch,
  showShort,
  showX,
  showY,
  valueAtA,
  type Approach,
  type PointMode,
  type Side,
} from '../../math/limitVsValue';

export const V = makeViewport({
  width: 660,
  height: 420,
  xMin: VIEW.from - 0.2,
  xMax: VIEW.to + 0.2,
  yMin: Y_VIEW.from,
  yMax: Y_VIEW.to,
  padLeft: 38,
  padRight: 26,
  padTop: 24,
  padBottom: 46,
});

const SIDE_COLOR: Readonly<Record<Side, string>> = { left: LAB.x1, right: LAB.x2 };

/** 纵向可拖手柄。和 `DraggableXPoint` 同一套规矩:rAF 合帧、大命中区、键盘可达。 */
function DraggableYPoint({
  svgRef,
  x,
  y,
  onChange,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  x: number;
  y: number;
  onChange: (next: number) => void;
}) {
  const frame = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const toMathY = useCallback(
    (clientY: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.height === 0) return null;
      const canvasY = ((clientY - rect.top) / rect.height) * V.height;
      const plot = V.height - V.padTop - V.padBottom;
      return V.yMin + (1 - (canvasY - V.padTop) / plot) * (V.yMax - V.yMin);
    },
    [svgRef],
  );

  const flush = useCallback(() => {
    frame.current = null;
    const clientY = pending.current;
    pending.current = null;
    if (clientY === null) return;
    const value = toMathY(clientY);
    if (value !== null) onChangeRef.current(value);
  }, [toMathY]);

  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);

  const px = toSvgX(V, x);
  const py = toSvgY(V, y);

  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label="value of f at 1"
      aria-orientation="vertical"
      aria-valuemin={POINT_RANGE.from}
      aria-valuemax={POINT_RANGE.to}
      aria-valuenow={Number(y.toFixed(3))}
      aria-valuetext={`f of 1 equals ${showShort(y)}`}
      style={{ cursor: 'ns-resize', touchAction: 'none', outline: 'none' }}
      className="lab-handle"
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pending.current = e.clientY; if (frame.current === null) frame.current = requestAnimationFrame(flush); }}
      onPointerMove={(e) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        pending.current = e.clientY;
        if (frame.current === null) frame.current = requestAnimationFrame(flush);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.25 : 0.05;
        if (e.key === 'ArrowUp') onChange(y + step);
        else if (e.key === 'ArrowDown') onChange(y - step);
        else if (e.key === 'Home') onChange(POINT_RANGE.from);
        else if (e.key === 'End') onChange(POINT_RANGE.to);
        else return;
        e.preventDefault();
      }}
    >
      <circle cx={px} cy={py} r={20} fill="transparent" />
      <circle cx={px} cy={py} r={11} fill={LAB.pass} opacity={0.18} />
      <circle cx={px} cy={py} r={6} fill={LAB.pass} stroke="#0b1020" strokeWidth={2} />
    </g>
  );
}

export function PointGraph({
  mode,
  pointY,
  left,
  right,
  onMoveLeft,
  onMoveRight,
  onMovePoint,
}: {
  mode: PointMode;
  pointY: number;
  left: Approach;
  right: Approach;
  onMoveLeft: (x: number) => void;
  onMoveRight: (x: number) => void;
  onMovePoint: (y: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const y0 = toSvgY(V, 0);
  const ax = toSvgX(V, A);
  const holeY = toSvgY(V, HOLE_Y);
  const value = valueAtA(mode, pointY);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label="A straight line with a hole at x = 1, and a separate movable point for f(1)"
    >
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        {ticks(0, VIEW.to, 1).map((t) => (
          <g key={`x${t}`}>
            <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
            <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">{t}</text>
          </g>
        ))}
      </g>

      {/* 极限那条高度线 —— 拖孤立点时它**纹丝不动**,这一点要看得见 */}
      <line x1={V.padLeft} y1={holeY} x2={V.width - V.padRight} y2={holeY} stroke={LAB.pass} strokeWidth={1.3} strokeDasharray="6 5" opacity={0.6} />
      <text x={V.padLeft + 4} y={holeY - 8} fill={LAB.pass} fontSize={11} fontWeight={700} fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke">
        limit = {showShort(limitAtHole())}
      </text>

      {/* 目标竖线 */}
      <line x1={ax} y1={V.padTop} x2={ax} y2={y0} stroke={LAB.muted} strokeWidth={1.3} strokeDasharray="5 5" opacity={0.7} />

      {/* 直线的两段:洞处断开 */}
      {(['left', 'right'] as const).map((side) => (
        <path key={side} d={polylinePath(V, sampleBranch(side))} fill="none" stroke={LAB.curve} strokeWidth={2.4} strokeLinecap="round" />
      ))}

      {/* 那个洞 —— 永远是空心的,不管 f(1) 被拖到哪儿 */}
      <circle cx={ax} cy={holeY} r={6} fill="#0b1020" stroke={LAB.curve} strokeWidth={2.4} />

      {/* 孤立点与它到洞的距离 */}
      {value !== null && (
        <g>
          {Math.abs(value - HOLE_Y) > 0.02 && (
            <line x1={ax} y1={holeY} x2={ax} y2={toSvgY(V, value)} stroke={LAB.pass} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.55} />
          )}
          <text
            x={ax + 14}
            y={toSvgY(V, value) + 4}
            fill={LAB.pass}
            fontSize={12}
            fontWeight={700}
            textAnchor="start"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            f(1) = {showShort(value)}
          </text>
        </g>
      )}

      {/* 两个走近的点 */}
      {([{ side: 'left' as const, a: left }, { side: 'right' as const, a: right }]).map(({ side, a }) => {
        const px = toSvgX(V, a.x);
        const py = toSvgY(V, a.y);
        const color = SIDE_COLOR[side];
        const toLeft = px > V.width - V.padRight - 130 ? true : px < V.padLeft + 130 ? false : side === 'left';
        return (
          <g key={side}>
            <line x1={px} y1={y0} x2={px} y2={py} stroke={color} strokeWidth={1.1} strokeDasharray="4 4" opacity={0.55} />
            <circle cx={px} cy={py} r={9} fill={color} opacity={0.16} />
            <circle cx={px} cy={py} r={5} fill={color} stroke="#0b1020" strokeWidth={1.6} />
            <text
              x={px + (toLeft ? -10 : 10)}
              y={py - 11}
              fill={color}
              fontSize={12}
              fontWeight={700}
              textAnchor={toLeft ? 'end' : 'start'}
              fontFamily="ui-monospace, monospace"
              stroke="#0b1020"
              strokeWidth={3.5}
              paintOrder="stroke"
            >
              ({showX(a.x)}, {showY(a.y)})
            </text>
          </g>
        );
      })}

      {mode === 'isolated' && (
        <DraggableYPoint svgRef={svgRef} x={A} y={valueAtA(mode, pointY) ?? HOLE_Y} onChange={onMovePoint} />
      )}

      {([{ side: 'left' as const, a: left, on: onMoveLeft }, { side: 'right' as const, a: right, on: onMoveRight }]).map(({ side, a, on }) => (
        <DraggableXPoint
          key={`h-${side}`}
          svgRef={svgRef}
          viewport={V}
          value={a.x}
          onChange={on}
          interval={{ a: VIEW.from, b: VIEW.to }}
          color={SIDE_COLOR[side]}
          label={side}
          step={0.001}
          labelDx={side === 'left' ? -16 : 16}
          describe={(v) => `${side} point at x equals ${showX(v)}`}
        />
      ))}
    </svg>
  );
}
