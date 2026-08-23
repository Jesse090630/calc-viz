/**
 * LAB — 取整的两个视图:数轴 与 阶梯图
 *
 * ⚠️ 两个视图共用**同一个 x 和同一个读数**,由上层传入。
 * 各自算一遍是很容易写出来的,但那样迟早出现"数轴说 -2、图上高亮 -1"这种自相矛盾。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, toSvgX, toSvgY } from '../shared/viewport';
import {
  DOMAIN,
  TICKS,
  showN,
  showX,
  steps,
  type FloorReading,
} from '../../math/floorFunction';

/* ── 数轴 ──────────────────────────────────────────────────────── */

/**
 * ⚠️ 高度是量出来的,不是拍脑袋定的。
 * 第一版 680×260、轴放在 y = -0.25,画完之后轴线以下还剩一大条空白 ——
 * 数轴挤在上半部分,看着像没画完。把纵向范围收紧到内容真正占用的那一段。
 */
/**
 * ⚠️ 纵向布局要和 `DraggableXPoint` 对齐。
 * 那个手柄固定画在 **y = 0** 上,所以 y = 0 必须就是"x 所在的那一行";
 * 数轴放在它下面(y = -0.45)。
 * 第一版把 x 画在 y = 0.55、手柄仍在 y = 0,屏幕上于是出现**两个琥珀点**表示同一个 x,
 * 中间还连着一段莫名其妙的虚线。
 */
export const LINE_V = makeViewport({
  width: 680,
  height: 190,
  xMin: -3.6,
  xMax: 5.6,
  yMin: -0.78,
  yMax: 0.34,
  padLeft: 24,
  padRight: 24,
  padTop: 26,
  padBottom: 26,
});

export function NumberLineView({
  reading,
  onChangeX,
}: {
  reading: FloorReading;
  onChangeX: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const V = LINE_V;
  const axisY = toSvgY(V, -0.45);
  /** x 所在的行 —— 必须是 y = 0,手柄就画在那里 */
  const xRow = toSvgY(V, 0);

  const px = toSvgX(V, reading.x);
  const pn = toSvgX(V, reading.n);
  const above = reading.n + 1;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label="A number line with a draggable point and a marker dropping to the integer below it"
    >
      {/* 当前所在的那一格 [n, n+1) —— 底色标出来 */}
      <rect
        x={toSvgX(V, reading.n)}
        y={V.padTop - 6}
        width={Math.max(0, toSvgX(V, reading.n + 1) - toSvgX(V, reading.n))}
        height={axisY - V.padTop + 40}
        fill={LAB.interval}
        opacity={0.14}
        style={{ transition: 'x 200ms ease' }}
      />

      {/* 数轴 */}
      <line x1={V.padLeft} y1={axisY} x2={V.width - V.padRight} y2={axisY} stroke={LAB.axis} strokeWidth={1.6} />
      {TICKS.map((t) => {
        const isFloor = t === reading.n;
        return (
          <g key={t}>
            <line
              x1={toSvgX(V, t)}
              y1={axisY - (isFloor ? 11 : 7)}
              x2={toSvgX(V, t)}
              y2={axisY + (isFloor ? 11 : 7)}
              stroke={isFloor ? LAB.pass : LAB.axis}
              strokeWidth={isFloor ? 2.6 : 1.2}
              style={{ transition: 'stroke 200ms ease' }}
            />
            <text
              x={toSvgX(V, t)}
              y={axisY + 28}
              fill={isFloor ? LAB.pass : LAB.muted}
              fontSize={isFloor ? 15 : 13}
              fontWeight={isFloor ? 800 : 500}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              style={{ transition: 'fill 200ms ease' }}
            >
              {t}
            </text>
          </g>
        );
      })}

      {/*
        「掉下去」的那一步。竖直虚线从 x 落到数轴,再横向指到 n。
        ⚠️ 竖线画在 x 的位置、落点画在 n 的位置 —— 两者只有在 x 是整数时才重合,
        中间那段水平位移就是"向下取整"这个动作本身。
      */}
      <line x1={px} y1={xRow + 11} x2={px} y2={axisY - 14} stroke={LAB.x2} strokeWidth={1.6} strokeDasharray="4 4" opacity={0.8} />
      {!reading.exact && (
        <line x1={px} y1={axisY - 14} x2={pn} y2={axisY - 14} stroke={LAB.pass} strokeWidth={1.8} strokeDasharray="4 4" opacity={0.85} />
      )}
      <path
        d={`M${pn - 5} ${axisY - 20} L${pn} ${axisY - 12} L${pn + 5} ${axisY - 20}`}
        fill="none"
        stroke={LAB.pass}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 落点 */}
      <circle cx={pn} cy={axisY} r={7} fill={LAB.pass} stroke="#0b1020" strokeWidth={1.8} />

      {/*
        上面那个整数 n+1 —— 只在负数非整数时标出来,专门回答
        "为什么不是 -1?" 因为 -1 **大于** x,越过去了。
      */}
      {!reading.exact && reading.x < 0 && (
        <g>
          <circle cx={toSvgX(V, above)} cy={axisY} r={6} fill="none" stroke={LAB.fail} strokeWidth={2} />
          <text
            x={toSvgX(V, above)}
            y={axisY - 24}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {showN(above)} &gt; {showX(reading.x)}
          </text>
        </g>
      )}

      {/*
        x 的读数标签。点本身由下面的 `DraggableXPoint` 画 ——
        这里再画一个就会变成两个琥珀点表示同一个值。
      */}
      <text
        x={px}
        y={xRow - 16}
        fill={LAB.x2}
        fontSize={14}
        fontWeight={800}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
      >
        x = {showX(reading.x)}
      </text>

      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.x}
        onChange={onChangeX}
        interval={DOMAIN}
        color={LAB.x2}
        label=""
        step={0.1}
        describe={(v) => `x equals ${showX(v)}`}
      />
    </svg>
  );
}

/* ── 阶梯图 ────────────────────────────────────────────────────── */

export const GRAPH_V = makeViewport({
  width: 680,
  height: 380,
  xMin: -3.6,
  xMax: 5.6,
  yMin: -3.6,
  yMax: 5.6,
  padLeft: 34,
  padRight: 24,
  padTop: 20,
  padBottom: 30,
});

export function StepGraphView({
  reading,
  onChangeX,
}: {
  reading: FloorReading;
  onChangeX: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const V = GRAPH_V;
  const all = steps();
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label="The step graph of the floor function, with the active step highlighted"
    >
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        <line x1={x0} y1={V.padTop} x2={x0} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1.2} />
        {TICKS.map((t) => (
          <g key={t}>
            <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {t !== 0 ? t : ''}
            </text>
            {/*
              ⚠️ y 轴刻度紧贴原点,而 [-1,0) 和 [0,1) 两级台阶正好画到 y 轴边上,
              数字于是压在台阶线上。用深色描边打底(paintOrder=stroke)让文字"穿"过线,
              比挪位置干净 —— 挪走了就离轴太远,读者对不上是哪一行。
            */}
            <text
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
              {t !== 0 ? t : ''}
            </text>
          </g>
        ))}
      </g>

      {/* 当前这一格的竖向高亮带 */}
      <rect
        x={toSvgX(V, reading.stepFrom)}
        y={V.padTop}
        width={Math.max(0, toSvgX(V, reading.stepTo) - toSvgX(V, reading.stepFrom))}
        height={V.height - V.padTop - V.padBottom}
        fill={LAB.interval}
        opacity={0.16}
        style={{ transition: 'x 200ms ease' }}
      />

      {all.map((s) => {
        const active = s.value === reading.n;
        const y = toSvgY(V, s.value);
        return (
          <g key={s.from}>
            <line
              x1={toSvgX(V, s.from)}
              y1={y}
              x2={toSvgX(V, s.to)}
              y2={y}
              stroke={active ? LAB.pass : LAB.curve}
              strokeWidth={active ? 4 : 2.4}
              opacity={active ? 1 : 0.55}
              style={{ transition: 'stroke 200ms ease, stroke-width 200ms ease' }}
            />
            {/* 左端**实心** —— x = n 时取到 n */}
            <circle cx={toSvgX(V, s.from)} cy={y} r={active ? 5.5 : 4} fill={active ? LAB.pass : LAB.curve} />
            {/* 右端**空心** —— x = n+1 时已经跳到下一格 */}
            <circle
              cx={toSvgX(V, s.to)}
              cy={y}
              r={active ? 5.5 : 4}
              fill="#0b1020"
              stroke={active ? LAB.pass : LAB.curve}
              strokeWidth={2}
            />
          </g>
        );
      })}

      {/* 当前点 (x, ⌊x⌋) 及其两条辅助线 */}
      <line x1={toSvgX(V, reading.x)} y1={y0} x2={toSvgX(V, reading.x)} y2={toSvgY(V, reading.n)} stroke={LAB.x2} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.75} />
      <line x1={toSvgX(V, reading.x)} y1={toSvgY(V, reading.n)} x2={x0} y2={toSvgY(V, reading.n)} stroke={LAB.pass} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.75} />
      <circle cx={toSvgX(V, reading.x)} cy={toSvgY(V, reading.n)} r={5} fill={LAB.x2} stroke="#0b1020" strokeWidth={1.6} />

      <text
        x={toSvgX(V, reading.x) + (reading.x > 3.4 ? -10 : 10)}
        y={toSvgY(V, reading.n) - 10}
        fill={LAB.x2}
        fontSize={12}
        fontWeight={700}
        textAnchor={reading.x > 3.4 ? 'end' : 'start'}
        fontFamily="ui-monospace, monospace"
        stroke="#0b1020"
        strokeWidth={3.5}
        paintOrder="stroke"
      >
        ({showX(reading.x)}, {showN(reading.n)})
      </text>

      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.x}
        onChange={onChangeX}
        interval={DOMAIN}
        color={LAB.x2}
        label="x"
        step={0.1}
        describe={(v) => `x equals ${showX(v)}`}
      />
    </svg>
  );
}
