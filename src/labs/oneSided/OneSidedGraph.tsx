/**
 * LAB — 「Two Sides. One Destination.」的图。
 *
 * 画面要说清三件事:
 *   ① 一条竖的目标线钉在 x = a —— 两个点**都到不了它**;
 *   ② 左边那个点走左支,右边那个点走右支,各自带一条引到 y 轴的横线;
 *   ③ 两条横线**落在同一高度还是两个高度** —— 极限存在与否就是这件事。
 *
 * ⚠️ 两支分开取样、分开画。连成一条会在断点处画出一条并不存在的竖直线段,
 * 而那道**缝**正是这一节要看见的东西。
 *
 * ⚠️ x = a 处的实心/空心由 `closedAt` 算出来,不写死:
 * 空心点是下一节课(「点决定不了极限」)的视觉入口,这一节先把它画对。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  SIDE_COPY,
  closedAt,
  oneSidedLimit,
  sampleBranch,
  showLimit,
  showX,
  showY,
  sidesAgree,
  type Approach,
  type LimitFunction,
  type Side,
} from '../../math/oneSidedLimits';

export type Focus = Side | 'both';

const SIDE_COLOR: Readonly<Record<Side, string>> = { left: LAB.x1, right: LAB.x2 };

export function makeScope(fn: LimitFunction) {
  return makeViewport({
    width: 660,
    height: 420,
    xMin: fn.view.from - 0.25,
    xMax: fn.view.to + 0.25,
    yMin: fn.yView.from,
    yMax: fn.yView.to,
    padLeft: 40,
    padRight: 26,
    padTop: 24,
    padBottom: 46,
  });
}

export function OneSidedGraph({
  fn,
  left,
  right,
  focus,
  onMoveLeft,
  onMoveRight,
}: {
  fn: LimitFunction;
  left: Approach;
  right: Approach;
  focus: Focus;
  onMoveLeft: (x: number) => void;
  onMoveRight: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const V = makeScope(fn);
  const y0 = toSvgY(V, 0);
  const ax = toSvgX(V, fn.a);
  const agree = sidesAgree(fn);
  const limits = { left: oneSidedLimit(fn, 'left'), right: oneSidedLimit(fn, 'right') };
  const dim = (side: Side) => (focus === 'both' || focus === side ? 1 : 0.22);

  const points: readonly { side: Side; approach: Approach }[] = [
    { side: 'left', approach: left },
    { side: 'right', approach: right },
  ];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${fn.label}: two points approaching x = ${showX(fn.a)} from either side`}
    >
      {/* 坐标轴 */}
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        {ticks(Math.ceil(V.xMin), V.xMax, 1).map((t) => (
          <g key={`x${t}`}>
            <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
            <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {t}
            </text>
          </g>
        ))}
      </g>

      {/*
        两条目标高度线。
        ⚠️ 一致时**只画一条绿的**;不一致时画两条各自颜色的 ——
        不一致却画一条绿线,等于替学生把答案抹平了。
      */}
      {agree ? (
        <g>
          <line
            x1={V.padLeft}
            y1={toSvgY(V, limits.left)}
            x2={V.width - V.padRight}
            y2={toSvgY(V, limits.left)}
            stroke={LAB.pass}
            strokeWidth={1.4}
            strokeDasharray="6 5"
            opacity={0.75}
          />
          <text
            x={V.width - V.padRight}
            y={toSvgY(V, limits.left) - 8}
            fill={LAB.pass}
            fontSize={12}
            fontWeight={700}
            textAnchor="end"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            y = {showLimit(limits.left)}
          </text>
        </g>
      ) : (
        <g>
          {(['left', 'right'] as const).map((side) => (
            <line
              key={side}
              x1={V.padLeft}
              y1={toSvgY(V, limits[side])}
              x2={V.width - V.padRight}
              y2={toSvgY(V, limits[side])}
              stroke={SIDE_COLOR[side]}
              strokeWidth={1.3}
              strokeDasharray="6 5"
              opacity={0.55 * dim(side)}
            />
          ))}
          {/* 两个目的地之间的那道竖直距离 —— DNE 的全部理由 */}
          <line
            x1={V.width - V.padRight - 46}
            y1={toSvgY(V, limits.left)}
            x2={V.width - V.padRight - 46}
            y2={toSvgY(V, limits.right)}
            stroke={LAB.fail}
            strokeWidth={2.2}
          />
          {/*
            ⚠️ 这行字写在竖线**左边**,anchor 用 end。
            原来朝右写(anchor start),"2 ≠ 5" 直接顶出了取景框右缘 ——
            浏览器那条"没有文字跑出 viewBox"的检查抓到的。
          */}
          <text
            x={V.width - V.padRight - 54}
            y={(toSvgY(V, limits.left) + toSvgY(V, limits.right)) / 2 + 4}
            fill={LAB.fail}
            fontSize={12}
            fontWeight={700}
            textAnchor="end"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            {showLimit(limits.left)} ≠ {showLimit(limits.right)}
          </text>
        </g>
      )}

      {/* 目标竖线 */}
      <line x1={ax} y1={V.padTop} x2={ax} y2={y0} stroke={LAB.muted} strokeWidth={1.4} strokeDasharray="5 5" opacity={0.85} />
      <text
        x={ax}
        y={V.padTop - 8}
        fill={LAB.muted}
        fontSize={11}
        fontWeight={700}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
      >
        x = {showLimit(fn.a)}
      </text>

      {/* 两支曲线,各画各的 */}
      {(['left', 'right'] as const).map((side) => (
        <path
          key={side}
          d={polylinePath(V, sampleBranch(fn, side))}
          fill="none"
          stroke={LAB.curve}
          strokeWidth={2.4}
          strokeLinecap="round"
          opacity={0.45 + 0.55 * (dim(side) === 1 ? 1 : 0)}
        />
      ))}

      {/* x = a 处的端点:实心 = 这一侧取到了那个值,空心 = 没取到 */}
      {(['left', 'right'] as const).map((side) => (
        <circle
          key={`cap-${side}`}
          cx={ax}
          cy={toSvgY(V, limits[side])}
          r={5.5}
          fill={closedAt(fn, side) ? LAB.curve : '#0b1020'}
          stroke={LAB.curve}
          strokeWidth={2}
          opacity={dim(side)}
        />
      ))}

      {/* 两个正在走近的点 */}
      {points.map(({ side, approach }) => {
        const px = toSvgX(V, approach.x);
        const py = toSvgY(V, approach.y);
        const color = SIDE_COLOR[side];
        const nearRight = px > V.width - V.padRight - 120;
        const nearLeft = px < V.padLeft + 120;
        const labelToLeft = nearRight ? true : nearLeft ? false : side === 'left';
        return (
          <g key={side} opacity={dim(side)}>
            {/* 引到 y 轴的横线 —— "输出走到哪儿了"要能一眼读出来 */}
            <line x1={V.padLeft} y1={py} x2={px} y2={py} stroke={color} strokeWidth={1.1} strokeDasharray="4 4" opacity={0.6} />
            <line x1={px} y1={y0} x2={px} y2={py} stroke={color} strokeWidth={1.1} strokeDasharray="4 4" opacity={0.6} />
            <circle cx={px} cy={py} r={10} fill={color} opacity={0.16} />
            <circle cx={px} cy={py} r={5.5} fill={color} stroke="#0b1020" strokeWidth={1.8} />
            {/*
              ⚠️ 标签默认写在**远离目标线的那一侧**:左点往左,右点往右。
              两个点靠近 a 时会挤到一起,朝内写必然重叠 —— 而它们最靠近的那一刻
              恰好是这一节最要紧的一刻。
              ⚠️ 但贴到画面边缘时这个偏好要**让位**:靠右边缘就改成朝左写,反之亦然。
              (截图里 (3.050, 6.050) 和 (0.550, 0.550) 都正好压在取景框边上 ——
               `getBBox` 那条越界检查按 0.5px 容差算,擦边而过它就报不出来。)
            */}
            <text
              x={px + (labelToLeft ? -11 : 11)}
              y={py - 12}
              fill={color}
              fontSize={12}
              fontWeight={700}
              textAnchor={labelToLeft ? 'end' : 'start'}
              fontFamily="ui-monospace, monospace"
              stroke="#0b1020"
              strokeWidth={3.5}
              paintOrder="stroke"
            >
              ({showX(approach.x)}, {showY(approach.y)})
            </text>
          </g>
        );
      })}

      {/* x 轴上的两个手柄。侧别的约束在 `oneSidedLimits.ts` 里保证,这里不再写一遍。 */}
      {points.map(({ side, approach }) => (
        <DraggableXPoint
          key={`handle-${side}`}
          svgRef={svgRef}
          viewport={V}
          value={approach.x}
          onChange={side === 'left' ? onMoveLeft : onMoveRight}
          interval={{ a: fn.view.from, b: fn.view.to }}
          color={SIDE_COLOR[side]}
          label={SIDE_COPY[side].word}
          step={0.001}
          labelDx={side === 'left' ? -16 : 16}
          describe={(v) => `${side} point at x equals ${showX(v)}`}
        />
      ))}
    </svg>
  );
}
