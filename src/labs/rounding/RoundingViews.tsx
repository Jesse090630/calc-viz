/**
 * LAB — 取整的两个视图:数轴 与 阶梯图。**两个方向共用同一份组件。**
 *
 * ⚠️ 下取整和上取整在画面上只差三件事:箭头朝哪、落点在哪一侧、阶梯格哪一端实心。
 * 复制一份 CeilingViews 出来是最省事的写法,也是最糟的 ——
 * 以后改一个箭头样式就得改两处,迟早只改了一处。
 *
 * ⚠️ 视图共用**上层传进来的同一个读数**,自己不算数学。
 * 各自算一遍迟早出现"数轴说 -2、图上高亮 -1"这种自相矛盾。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, toSvgX, toSvgY } from '../shared/viewport';
import {
  DOMAIN,
  ROUND,
  TICKS,
  showN,
  showX,
  steps,
  type RoundingReading,
} from '../../math/rounding';

/* ── 数轴 ──────────────────────────────────────────────────────── */

/**
 * ⚠️ 纵向布局要和 `DraggableXPoint` 对齐。
 * 那个手柄固定画在 **y = 0** 上,所以 y = 0 必须就是"x 所在的那一行";
 * 数轴放在它下面。第一版把 x 画在 y = 0.55、手柄仍在 y = 0,
 * 屏幕上于是出现**两个琥珀点**表示同一个 x,中间还连着一段莫名其妙的虚线。
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

export interface LineProps {
  reading: RoundingReading;
  onChangeX: (x: number) => void;
  /** 比较模式:同时画出另一个方向的落点 */
  other?: RoundingReading | null;
}

export function NumberLineView({ reading, onChangeX, other = null }: LineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const V = LINE_V;
  const axisY = toSvgY(V, -0.45);
  const xRow = toSvgY(V, 0);

  const px = toSvgX(V, reading.x);
  const meta = ROUND[reading.direction];

  /**
   * 两个方向落在数轴上的哪两个整数(比较模式用)。
   *
   * ⚠️ 颜色必须按**方向**固定 —— 下取整永远绿、上取整永远青 ——
   * 而不是按"当前 / 另一个"。
   * 第一版按当前方向给绿色,于是从 `#/ceiling` 进来时数轴上 ⌈⌉ 是绿的,
   * 右侧面板里 ⌈⌉ 却是青的:**同一屏两半自相矛盾**,正是这个文件开头警告过的那类错。
   */
  const colourOf = (d: RoundingReading['direction']) => (d === 'floor' ? LAB.pass : LAB.x1);
  const landings = other
    ? ([reading, other]
        .slice()
        .sort((a, b) => (a.direction === 'floor' ? -1 : 1) - (b.direction === 'floor' ? -1 : 1))
        .map((r) => ({ n: r.n, color: colourOf(r.direction), dir: r.direction })))
    : [{ n: reading.n, color: colourOf(reading.direction), dir: reading.direction }];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`A number line with a draggable point and a marker moving ${
        reading.direction === 'floor' ? 'down' : 'up'
      } to the nearest integer`}
    >
      {/* 当前这一格 */}
      <rect
        x={toSvgX(V, reading.stepFrom)}
        y={V.padTop - 6}
        width={Math.max(0, toSvgX(V, reading.stepTo) - toSvgX(V, reading.stepFrom))}
        height={axisY - V.padTop + 40}
        fill={LAB.interval}
        opacity={0.14}
        style={{ transition: 'x 200ms ease' }}
      />

      {/* 数轴 */}
      <line x1={V.padLeft} y1={axisY} x2={V.width - V.padRight} y2={axisY} stroke={LAB.axis} strokeWidth={1.6} />
      {TICKS.map((t) => {
        const hit = landings.find((l) => l.n === t);
        return (
          <g key={t}>
            <line
              x1={toSvgX(V, t)}
              y1={axisY - (hit ? 11 : 7)}
              x2={toSvgX(V, t)}
              y2={axisY + (hit ? 11 : 7)}
              stroke={hit ? hit.color : LAB.axis}
              strokeWidth={hit ? 2.6 : 1.2}
              style={{ transition: 'stroke 200ms ease' }}
            />
            <text
              x={toSvgX(V, t)}
              y={axisY + 28}
              fill={hit ? hit.color : LAB.muted}
              fontSize={hit ? 15 : 13}
              fontWeight={hit ? 800 : 500}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              style={{ transition: 'fill 200ms ease' }}
            >
              {t}
            </text>
          </g>
        );
      })}

      {/* x 落到数轴的竖直虚线 */}
      <line x1={px} y1={xRow + 11} x2={px} y2={axisY - 14} stroke={LAB.x2} strokeWidth={1.6} strokeDasharray="4 4" opacity={0.8} />

      {/*
        横向那一段就是"取整"这个动作本身 —— 下取整往左,上取整往右。
        比较模式下两条都画,颜色不同,于是 ↓ 和 ↑ 变成两条指向相反的线段。
      */}
      {landings.map((l) => {
        const lx = toSvgX(V, l.n);
        // 抬升高度同样按方向固定:下取整那条画在下面,上取整那条画在上面。
        const lifted = l.dir === 'floor' ? axisY - 14 : axisY - 30;
        return (
          <g key={l.dir}>
            {Math.abs(lx - px) > 0.5 && (
              <line x1={px} y1={lifted} x2={lx} y2={lifted} stroke={l.color} strokeWidth={1.8} strokeDasharray="4 4" opacity={0.9} />
            )}
            <path
              d={`M${lx - 5} ${lifted - 6} L${lx} ${lifted + 2} L${lx + 5} ${lifted - 6}`}
              fill="none"
              stroke={l.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={lx} cy={axisY} r={7} fill={l.color} stroke="#0b1020" strokeWidth={1.8} />
            {other && (
              <text
                x={lx}
                y={lifted - 10}
                fill={l.color}
                fontSize={11}
                fontWeight={800}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                stroke="#0b1020"
                strokeWidth={3}
                paintOrder="stroke"
              >
                {ROUND[l.dir].arrow} {showN(l.n)}
              </text>
            )}
          </g>
        );
      })}

      {/*
        被否决的那个整数 —— 单方向模式下,只在"截断会给错"的那一侧标出来:
        下取整时是负数(截断会给 n+1),上取整时是正数(截断会给 n-1)。
        它回答的是"为什么不是那个?"—— 因为它在错误的一侧。
      */}
      {!reading.exact && !other && (
        <g>
          <circle cx={toSvgX(V, reading.rejected)} cy={axisY} r={6} fill="none" stroke={LAB.fail} strokeWidth={2} />
          <text
            x={toSvgX(V, reading.rejected)}
            y={axisY - 24}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {showN(reading.rejected)} {reading.direction === 'floor' ? '>' : '<'} {showX(reading.x)}
          </text>
        </g>
      )}

      {/* x 的读数。点本身由 DraggableXPoint 画。 */}
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
        describe={(v) => `x equals ${showX(v)}, ${meta.label.toLowerCase()} is ${showN(meta.at(v) ?? 0)}`}
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

export function StepGraphView({ reading, onChangeX }: LineProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const V = GRAPH_V;
  const all = steps(reading.direction);
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`The step graph of the ${reading.direction} function, with the active step highlighted`}
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
              ⚠️ y 轴刻度紧贴原点,而中间两级台阶正好画到 y 轴边上,数字于是压在台阶线上。
              用深色描边打底让文字"穿"过线,比挪位置干净 —— 挪走了就离轴太远,对不上是哪一行。
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
        const active = s.value === reading.n && s.from === reading.stepFrom;
        const y = toSvgY(V, s.value);
        /*
          ⚠️ 实心/空心由 `closedOnLeft` 决定,**不是**写死"左实心右空心"。
          ⌊x⌋ 的格是 [n, n+1) —— 左实心;⌈x⌉ 的格是 (n, n+1] —— 右实心。
          写死一种,另一个方向的图看起来一样但整数处的取值全错。
        */
        return (
          <g key={`${s.from}-${s.value}`}>
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
            <circle
              cx={toSvgX(V, s.from)}
              cy={y}
              r={active ? 5.5 : 4}
              fill={s.closedOnLeft ? (active ? LAB.pass : LAB.curve) : '#0b1020'}
              stroke={active ? LAB.pass : LAB.curve}
              strokeWidth={2}
            />
            <circle
              cx={toSvgX(V, s.to)}
              cy={y}
              r={active ? 5.5 : 4}
              fill={s.closedOnLeft ? '#0b1020' : active ? LAB.pass : LAB.curve}
              stroke={active ? LAB.pass : LAB.curve}
              strokeWidth={2}
            />
          </g>
        );
      })}

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
        label=""
        step={0.1}
        describe={(v) => `x equals ${showX(v)}`}
      />
    </svg>
  );
}
