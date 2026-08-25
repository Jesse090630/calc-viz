/**
 * LAB — x 轴上的可拖动手柄
 *
 * ⚠️ 三条不可退让的规则:
 * ① **拖拽不是唯一通路。** 手柄可聚焦,方向键能调(Shift 加速,Home/End 到端点),
 *    另外面板里还有滑块。只能拖的界面等于把一部分人挡在外面。
 * ② **命中区域比看到的圆点大得多。** 视觉半径 6.5px,命中半径 20px。
 *    触摸屏上按视觉尺寸做命中区,手指根本点不中。
 * ③ **拖拽走 rAF 合帧。** pointermove 一秒能来上百次,每次都 setState 会掉帧;
 *    这里只记下最新位置,每帧应用一次。
 */
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { fromSvgX, toSvgX, toSvgY, type Viewport } from './viewport';
import { clampToInterval, type Interval } from '../../math/monotonicity';

const HIT_RADIUS = 20;

export interface DraggableXPointProps {
  /** 外层 <svg>,用来把屏幕坐标换算回画布坐标 */
  svgRef: RefObject<SVGSVGElement | null>;
  /** 这一节自己的窗口 —— 不同课的 y 范围差很远,不能共用一个常量 */
  viewport: Viewport;
  value: number;
  onChange: (next: number) => void;
  interval: Interval;
  color: string;
  label: string;
  /** 方向键步长 */
  step?: number;
  /**
   * 标签相对手柄的水平偏移。
   * ⚠️ 两个手柄挨到最近时,两个居中的标签会**叠在一起**(x₁ / x₂ 只差一格时读不出来)。
   * 成对使用的实验台给一个 −dx、一个 +dx,标签就永远分得开。
   * 默认 0 —— 只有一个手柄的课不受影响。
   */
  labelDx?: number;
  /** 无障碍描述,会被读屏念出来 */
  describe: (value: number) => string;
}

export function DraggableXPoint({
  svgRef,
  viewport: V,
  value,
  onChange,
  interval,
  color,
  label,
  step = 0.05,
  labelDx = 0,
  describe,
}: DraggableXPointProps) {
  const frame = useRef<number | null>(null);
  const pendingClientX = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const intervalRef = useRef(interval);
  intervalRef.current = interval;

  /** 屏幕 x → 画布 x。SVG 有 viewBox,所以要按实际渲染宽度缩放。 */
  const clientToMathX = useCallback(
    (clientX: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0) return null;
      const canvasX = ((clientX - rect.left) / rect.width) * V.width;
      return fromSvgX(V, canvasX);
    },
    [svgRef, V],
  );

  const flush = useCallback(() => {
    frame.current = null;
    const clientX = pendingClientX.current;
    pendingClientX.current = null;
    if (clientX === null) return;
    const mathX = clientToMathX(clientX);
    if (mathX === null) return;
    onChangeRef.current(clampToInterval(mathX, intervalRef.current));
  }, [clientToMathX]);

  const queue = useCallback(
    (clientX: number) => {
      pendingClientX.current = clientX;
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const handlePointerDown = (event: React.PointerEvent<SVGGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    queue(event.clientX);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGGElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    queue(event.clientX);
  };

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    const big = event.shiftKey ? 5 : 1;
    let next: number | null = null;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = value - step * big;
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = value + step * big;
    else if (event.key === 'Home') next = interval.a;
    else if (event.key === 'End') next = interval.b;
    if (next === null) return;
    event.preventDefault();
    onChange(clampToInterval(next, interval));
  };

  const px = toSvgX(V, value);
  const y0 = toSvgY(V, 0);

  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={interval.a}
      aria-valuemax={interval.b}
      /*
        ⚠️ 精度要跟着**步长**走,不能写死两位。
        步长 0.001 的课(单侧极限)里,`toFixed(2)` 会把 1.999 播报成 2.00 ——
        读屏用户听到的是"我到 2 了",而那一节整节都在讲**到不了**。
        (浏览器检查也是从这里读 x 的,写死两位会让它和屏幕上的读数对不上。)
      */
      aria-valuenow={Number(value.toFixed(Math.max(0, Math.ceil(-Math.log10(step)))))}
      aria-valuetext={describe(value)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onKeyDown={handleKeyDown}
      style={{ cursor: 'ew-resize', touchAction: 'none', outline: 'none' }}
      className="lab-handle"
    >
      {/* 命中区:透明但很大。视觉尺寸不该决定可点性。 */}
      <circle cx={px} cy={y0} r={HIT_RADIUS} fill="transparent" />
      <circle cx={px} cy={y0} r={11} fill={color} opacity={0.18} className="lab-handle-halo" />
      <circle cx={px} cy={y0} r={6.5} fill={color} stroke="#0b1020" strokeWidth={2} />
      <text
        x={px + labelDx}
        y={y0 + 30}
        fill={color}
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}
