/**
 * LAB — 「Scan the Curve」的图。
 *
 * 一句话:**窗口里的那段亮着,窗口外的压暗。**
 * 这一节没有公式要读,全部信息量都在"哪一段被点亮、点亮的那段往哪走"。
 *
 * ⚠️ 曲线画**两遍**:先整条压暗,再把窗口内那一段按当前判定的颜色重画一遍。
 * 用裁剪(clipPath)也能做到,但那样窗口内外只能同一个颜色 ——
 * 而这一节最要紧的正是"这一段是什么走向",颜色必须跟着判定走。
 *
 * ⚠️ mixed 的时候**按切换点分段上色**,不给整段一个颜色。
 * 给一个颜色等于替学生把答案糊过去,而"这里给不出单一答案"就是这一步要教的。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useCallback, useEffect, useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { BEHAVIOUR_COLOR, LAB } from './theme';
import { fromSvgX, makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  BEHAVIOUR_COPY,
  sampleCurve,
  showX,
  valueAt,
  type Curve,
  type ScanReading,
} from '../../math/scanning';

export const V = makeViewport({
  width: 700,
  height: 420,
  xMin: -0.5,
  xMax: 10.5,
  // 三条曲线在 [0, 10] 上的值都落在 1..6;下面留出 y = 0 那一行给扫描带与手柄。
  yMin: -1.2,
  yMax: 6.9,
  padLeft: 34,
  padRight: 24,
  padTop: 22,
  padBottom: 48,
});

/* ── 整条带子:拖它平移整个窗口 ─────────────────────────────────────── */

function ScanBand({
  svgRef,
  reading,
  onMove,
  color,
}: {
  svgRef: React.RefObject<SVGSVGElement | null>;
  reading: ScanReading;
  onMove: (byMathX: number) => void;
  color: string;
}) {
  const frame = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const grabbedAt = useRef<number | null>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const toMathX = useCallback(
    (clientX: number): number | null => {
      const svg = svgRef.current;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0) return null;
      return fromSvgX(V, ((clientX - rect.left) / rect.width) * V.width);
    },
    [svgRef],
  );

  // ⚠️ 和 `DraggableXPoint` 一样走 rAF 合帧:pointermove 一秒上百次,
  //    每次 setState 会掉帧,而这一节全靠拖动的手感。
  const flush = useCallback(() => {
    frame.current = null;
    const clientX = pending.current;
    pending.current = null;
    if (clientX === null || grabbedAt.current === null) return;
    const now = toMathX(clientX);
    if (now === null) return;
    onMoveRef.current(now - grabbedAt.current);
    grabbedAt.current = now;
  }, [toMathX]);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const x1 = toSvgX(V, reading.from);
  const x2 = toSvgX(V, reading.to);

  return (
    <g
      role="slider"
      tabIndex={0}
      aria-label="Scan window position"
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={Number(((reading.from + reading.to) / 2).toFixed(2))}
      aria-valuetext={`window from ${showX(reading.from)} to ${showX(reading.to)}, ${BEHAVIOUR_COPY[reading.behaviour].label}`}
      style={{ cursor: 'grab', touchAction: 'none', outline: 'none' }}
      className="lab-handle"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        grabbedAt.current = toMathX(event.clientX);
      }}
      onPointerUp={() => {
        grabbedAt.current = null;
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        if (grabbedAt.current === null) return;
        pending.current = event.clientX;
        if (frame.current === null) frame.current = requestAnimationFrame(flush);
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.5 : 0.1;
        if (event.key === 'ArrowLeft') onMove(-step);
        else if (event.key === 'ArrowRight') onMove(step);
        else return;
        event.preventDefault();
      }}
    >
      {/*
        ⚠️ 带子的**底边就是 x 轴**,不是画布底边。
        原来一路铺到 padBottom,于是它盖住了轴下面那一行手柄标签,
        看着像"带子漏到轴外面去了"—— x 轴本来该是这块区域的地板。
      */}
      <rect x={x1} y={V.padTop} width={Math.max(0, x2 - x1)} height={toSvgY(V, 0) - V.padTop} fill="transparent" />
      <rect
        x={x1}
        y={V.padTop}
        width={Math.max(0, x2 - x1)}
        height={toSvgY(V, 0) - V.padTop}
        fill={color}
        opacity={0.1}
        style={{ pointerEvents: 'none', transition: 'fill 200ms ease' }}
      />
      {[x1, x2].map((x, i) => (
        <line key={i} x1={x} y1={V.padTop} x2={x} y2={toSvgY(V, 0)} stroke={color} strokeWidth={1.4} opacity={0.75} style={{ pointerEvents: 'none' }} />
      ))}
    </g>
  );
}

/* ── 图本体 ───────────────────────────────────────────────────────── */

export function ScanGraph({
  curve,
  reading,
  sweepT,
  onMoveWindow,
  onMoveLeft,
  onMoveRight,
}: {
  curve: Curve;
  reading: ScanReading;
  /** 小圆点走到哪儿了(0 → 1) */
  sweepT: number;
  onMoveWindow: (byMathX: number) => void;
  onMoveLeft: (x: number) => void;
  onMoveRight: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const y0 = toSvgY(V, 0);
  const color = BEHAVIOUR_COLOR[reading.behaviour];
  const whole = sampleCurve(curve, V.xMin, V.xMax, 300);

  /** 窗口里的一段(mixed 时按切块分别取样,各自上色) */
  const litParts =
    reading.behaviour === 'mixed'
      ? reading.parts
      : [{ from: reading.from, to: reading.to, behaviour: reading.behaviour }];

  const dotX = reading.from + (reading.to - reading.from) * sweepT;
  const dotY = valueAt(curve, dotX);
  /**
   * ⚠️ 小圆点用**它此刻所在那一段**的颜色,不是整个窗口的判定色。
   * ① mixed 时整窗是红的,而红色也是转折点标记的颜色,两个红点容易混;
   * ② 更重要的是:点走过转折点时颜色当场从绿翻成琥珀 ——
   *    "方向在这里变了"这件事,看一遍比读一行字管用。
   */
  const dotBehaviour =
    litParts.find((p) => dotX >= p.from - 1e-9 && dotX <= p.to + 1e-9)?.behaviour ?? reading.behaviour;
  const dotColor = BEHAVIOUR_COLOR[dotBehaviour];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${curve.label}: a curve with a movable scanning window on the x-axis`}
    >
      {/* 坐标轴 */}
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        {ticks(0, 10, 2).map((t) => (
          <g key={`x${t}`}>
            <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
            <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {t}
            </text>
          </g>
        ))}
      </g>

      {/* ① 整条曲线,压暗 */}
      <path
        d={polylinePath(V, whole)}
        fill="none"
        stroke={LAB.curve}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.22}
      />

      {/* 扫描带(在曲线之下,不挡住亮的那一段) */}
      <ScanBand svgRef={svgRef} reading={reading} onMove={onMoveWindow} color={color} />

      {/* ② 窗口里的那一段,按走向上色重画 */}
      {litParts.map((part) => (
        <path
          key={`${part.from}-${part.to}`}
          d={polylinePath(V, sampleCurve(curve, part.from, part.to, 90))}
          fill="none"
          stroke={BEHAVIOUR_COLOR[part.behaviour]}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ pointerEvents: 'none' }}
        />
      ))}

      {/* 窗口内部的转折点:竖虚线 + 一个圈,说明"这里换了方向" */}
      {reading.crossings.map((c) => (
        <g key={c.x} style={{ pointerEvents: 'none' }}>
          <line
            x1={toSvgX(V, c.x)}
            y1={toSvgY(V, c.y)}
            x2={toSvgX(V, c.x)}
            y2={y0}
            stroke={LAB.fail}
            strokeWidth={1.4}
            strokeDasharray="4 4"
            opacity={0.8}
          />
          <circle cx={toSvgX(V, c.x)} cy={toSvgY(V, c.y)} r={6} fill="none" stroke={LAB.fail} strokeWidth={2.2} />
          <text
            x={toSvgX(V, c.x)}
            y={toSvgY(V, c.y) - 13}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            x = {showX(c.x)}
          </text>
        </g>
      ))}

      {/* ③ 从左往右走的小圆点 —— 这一节的主角 */}
      <g style={{ pointerEvents: 'none' }}>
        <line x1={toSvgX(V, dotX)} y1={toSvgY(V, dotY)} x2={toSvgX(V, dotX)} y2={y0} stroke={dotColor} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
        <circle cx={toSvgX(V, dotX)} cy={toSvgY(V, dotY)} r={11} fill={dotColor} opacity={0.18} />
        <circle cx={toSvgX(V, dotX)} cy={toSvgY(V, dotY)} r={5.5} fill={dotColor} stroke="#0b1020" strokeWidth={1.8} />
      </g>

      {/* 两个端点手柄。拖它们改宽度,另一端钉住(在 `scanning.ts` 里保证)。 */}
      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.from}
        onChange={onMoveLeft}
        interval={{ a: curve.view.from, b: curve.view.to }}
        color={LAB.x1}
        label="start"
        step={0.1}
        labelDx={-16}
        describe={(v) => `window starts at ${showX(v)}`}
      />
      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.to}
        onChange={onMoveRight}
        interval={{ a: curve.view.from, b: curve.view.to }}
        color={LAB.x2}
        label="end"
        step={0.1}
        labelDx={16}
        describe={(v) => `window ends at ${showX(v)}`}
      />
    </svg>
  );
}
