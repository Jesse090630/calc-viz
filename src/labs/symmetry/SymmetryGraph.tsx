/**
 * LAB — 对称性的坐标平面
 *
 * 一条曲线、一个可拖的点、以及它的**镜像点**。镜像点不可拖 —— 它是被 x 决定的,
 * 能拖就等于在说"两个点各自独立",那正好是要破除的误解。
 *
 * 两种模式的视觉语言必须不同,否则学生记不住区别:
 *   偶 → **水平**虚线横跨 y 轴,y 轴高亮。左右翻,高度不变。
 *   奇 → 一条经过**原点**的直线段,原点标出中点。转 180°,两个坐标都变号。
 *
 * 受控组件:不存状态、不算数学,数字全部由上层从 `src/math/symmetry.ts` 取好传进来。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import {
  makeViewport,
  plotHeight,
  polylinePath,
  ticks,
  toSvgX,
  toSvgY,
} from '../shared/viewport';
import { sampleCurve, showNumber, type MirrorSample, type SymmetryFunction } from '../../math/symmetry';

/**
 * 上下对称的窗口 —— 这一节的重点就是对称,窗口自己不对称的话,
 * 奇函数那两个点会一个贴顶一个贴底,"转 180°"根本看不出来。
 * x³ 在 x = 2 处是 8,所以 y 取到 ±9.5 刚好装下并留点余量。
 */
export const V = makeViewport({
  width: 620,
  height: 470,
  xMin: -3.3,
  xMax: 3.3,
  yMin: -9.5,
  yMax: 9.5,
  padLeft: 40,
  padRight: 26,
});

/** 可拖动的 x 的范围。取 ±2.4:x³ 到 13.8 会出框,但曲线出框比读数出框好。 */
export const DRAG_RANGE = { a: -2.2, b: 2.2 } as const;

function Axes({ highlightY, highlightOrigin }: { highlightY: boolean; highlightOrigin: boolean }) {
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  return (
    <g aria-hidden="true">
      <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
      {/* y 轴:偶函数模式下亮起来,因为它就是那面镜子 */}
      <line
        x1={x0}
        y1={V.padTop}
        x2={x0}
        y2={V.height - V.padBottom}
        stroke={highlightY ? LAB.pass : LAB.axis}
        strokeWidth={highlightY ? 3 : 1.2}
        opacity={highlightY ? 0.9 : 1}
        style={{ transition: 'stroke 320ms ease, stroke-width 320ms ease' }}
      />
      {highlightY && (
        <text x={x0 + 8} y={V.padTop + 13} fill={LAB.pass} fontSize={11} fontWeight={700} fontFamily="ui-monospace, monospace">
          mirror line
        </text>
      )}
      {/* 原点:奇函数模式下标出来,它是旋转中心 */}
      {/*
        ⚠️ 原点这里**只放一个标签**。原本轴上写 "rotation centre"、连线又在同一点写 "midpoint",
        两行字叠在一起糊成一团。它们说的其实是同一件事,合并成一句更清楚。
        文字由下面的连线部分渲染,这里只画那个圈。
      */}
      {highlightOrigin && (
        <circle cx={x0} cy={y0} r={13} fill="none" stroke={LAB.pass} strokeWidth={2} opacity={0.75} />
      )}
      {ticks(V.xMin, V.xMax, 1).map((t) => (
        <g key={`x${t}`}>
          <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
          {t !== 0 && (
            <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {t}
            </text>
          )}
        </g>
      ))}
      {ticks(V.yMin, V.yMax, 4).filter((t) => t !== 0).map((t) => (
        <g key={`y${t}`}>
          <line x1={x0 - 4} y1={toSvgY(V, t)} x2={x0 + 4} y2={toSvgY(V, t)} stroke={LAB.axis} strokeWidth={1} />
          <text x={x0 - 8} y={toSvgY(V, t) + 4} fill={LAB.muted} fontSize={11} textAnchor="end" fontFamily="ui-monospace, monospace">
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

/** 曲线上的一个点 + 它到两轴的虚线 */
function PlotPoint({ x, y, color }: { x: number; y: number; color: string }) {
  const px = toSvgX(V, x);
  const py = toSvgY(V, y);
  const y0 = toSvgY(V, 0);
  return (
    <g>
      <line x1={px} y1={y0} x2={px} y2={py} stroke={color} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.6} />
      <circle cx={px} cy={py} r={10} fill={color} opacity={0.15} />
      <circle cx={px} cy={py} r={5} fill={color} stroke="#0b1020" strokeWidth={1.6} />
      <text
        x={px + (x >= 0 ? 11 : -11)}
        y={py - 9}
        fill={color}
        fontSize={12}
        fontWeight={700}
        textAnchor={x >= 0 ? 'start' : 'end'}
        fontFamily="ui-monospace, monospace"
      >
        ({showNumber(x)}, {showNumber(y)})
      </text>
    </g>
  );
}

export interface SymmetryGraphProps {
  fn: SymmetryFunction;
  sample: MirrorSample;
  onChangeX: (x: number) => void;
  /** 'even' 画水平镜像线,'odd' 画过原点的连线,'none' 两者都不画 */
  linkage: 'even' | 'odd' | 'none';
  highlightY?: boolean;
  highlightOrigin?: boolean;
}

export function SymmetryGraph({
  fn,
  sample,
  onChangeX,
  linkage,
  highlightY = false,
  highlightOrigin = false,
}: SymmetryGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const curve = sampleCurve(fn, V.xMin, V.xMax, 260);

  const pxRight = toSvgX(V, sample.x);
  const pyRight = toSvgY(V, sample.fx);
  const pxLeft = toSvgX(V, sample.negX);
  const pyLeft = toSvgY(V, sample.fNegX);
  const x0 = toSvgX(V, 0);
  const y0 = toSvgY(V, 0);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`Graph of ${fn.tex} with a draggable input and its mirror at the opposite sign`}
    >
      <Axes highlightY={highlightY} highlightOrigin={highlightOrigin} />

      <path
        d={polylinePath(V, curve)}
        fill="none"
        stroke={LAB.curve}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'd 420ms ease' }}
      />

      {/*
        偶:一条**水平**线把两点连起来,并标注"same height"。
        水平是关键 —— 它本身就在说"高度没变",不需要额外解释。
      */}
      {linkage === 'even' && (
        <g>
          <line
            x1={pxLeft}
            y1={pyLeft}
            x2={pxRight}
            y2={pyRight}
            stroke={LAB.pass}
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.85}
          />
          {/*
            ⚠️ 不能放在两点的正中间。两点关于 y 轴对称,所以中点**永远是 x = 0**,
            标签必然压在 y 轴和它的刻度数字上(截图里 "same height" 正好盖住 "4")。
            挪到线段 28% 处,那里始终是空的。
          */}
          <text
            x={pxLeft + (pxRight - pxLeft) * 0.28}
            y={Math.min(pyLeft, pyRight) - 11}
            fill={LAB.pass}
            fontSize={11}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            same height
          </text>
        </g>
      )}

      {/*
        奇:一条**穿过原点**的直线段,并在原点画出中点标记。
        这是原点对称最干净的证据 —— 原点恰好是两点连线的中点。
      */}
      {linkage === 'odd' && (
        <g>
          <line
            x1={pxLeft}
            y1={pyLeft}
            x2={pxRight}
            y2={pyRight}
            stroke={LAB.pass}
            strokeWidth={2}
            strokeDasharray="6 4"
            opacity={0.85}
          />
          <circle cx={x0} cy={y0} r={4} fill={LAB.pass} />
          <text
            x={x0 + 20}
            y={y0 + 24}
            fill={LAB.pass}
            fontSize={11}
            fontWeight={700}
            fontFamily="ui-monospace, monospace"
          >
            origin = midpoint
          </text>
        </g>
      )}

      <PlotPoint x={sample.negX} y={sample.fNegX} color={LAB.x1} />
      <PlotPoint x={sample.x} y={sample.fx} color={LAB.x2} />

      {/* 只有 x 是可拖的。镜像点由它决定,不给独立手柄。 */}
      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={sample.x}
        onChange={onChangeX}
        interval={DRAG_RANGE}
        color={LAB.x2}
        label="x"
        describe={(v) => `x equals ${showNumber(v)}, output ${showNumber(fn.at(v) ?? 0)}`}
      />
      {/* 镜像位置在轴上给个小标记,让"-x 跟着动"这件事看得见 */}
      <g aria-hidden="true">
        <circle cx={toSvgX(V, sample.negX)} cy={y0} r={5} fill={LAB.x1} opacity={0.85} />
        <text
          x={toSvgX(V, sample.negX)}
          y={y0 + 30}
          fill={LAB.x1}
          fontSize={12}
          fontWeight={700}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
        >
          −x
        </text>
      </g>

      <rect
        x={V.padLeft}
        y={V.padTop}
        width={V.width - V.padLeft - V.padRight}
        height={plotHeight(V)}
        fill="none"
      />
    </svg>
  );
}
