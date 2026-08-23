/**
 * LAB — 左栏的坐标平面
 *
 * 受控组件:它只负责画,不决定 x₁/x₂ 是多少,也不判断成不成立。
 * 判断结果由 `pairPasses` 传进来 —— 图和右栏的定义引擎必须读同一个判断,
 * 否则会出现"图上是绿的、右边写着 false"这种自相矛盾。
 */
import { useRef } from 'react';
import { Axes, Curve, GuideLines, IntervalHighlight, V } from './GraphPieces';
import { DraggableXPoint } from '../../shared/DraggableXPoint';
import { LAB } from '../theme';
import { toSvgX, toSvgY } from '../../shared/viewport';
import {
  samplePoints,
  showNumber,
  type EvaluatedPair,
  type FunctionSpec,
  type Interval,
} from '../../../math/monotonicity';


export interface InteractiveGraphProps {
  fn: FunctionSpec;
  interval: Interval;
  intervalLabel: string;
  pair: EvaluatedPair;
  onChangeX1: (x: number) => void;
  onChangeX2: (x: number) => void;
  pairPasses: boolean;
  /** 扫描时的历史点,画成淡淡的痕迹 */
  trail?: readonly { x1: number; x2: number }[];
  /** Part 6:把曲线按单调段染色 */
  splitAt?: number | null;
  interactive?: boolean;
}

export function InteractiveGraph({
  fn,
  interval,
  intervalLabel,
  pair,
  onChangeX1,
  onChangeX2,
  pairPasses,
  trail,
  splitAt = null,
  interactive = true,
}: InteractiveGraphProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const curve = samplePoints(fn, { a: V.xMin, b: V.xMax }, 260);
  /** 两个读数在画布上的垂直距离小于一行字高时,就算撞上了 */
  const labelsCollide = Math.abs(toSvgY(V, pair.y1) - toSvgY(V, pair.y2)) < 15;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`Graph of ${fn.tex} with two draggable inputs on the x-axis`}
    >
      <IntervalHighlight interval={interval} label={intervalLabel} />
      <Axes />

      {/* Part 6:分界点两侧用不同颜色,让"在区间上"变成看得见的事 */}
      {splitAt !== null ? (
        <>
          <Curve points={curve.filter((p) => p.x <= splitAt)} />
          <Curve points={curve.filter((p) => p.x >= splitAt)} />
          <line
            x1={toSvgX(V, splitAt)}
            y1={V.padTop}
            x2={toSvgX(V, splitAt)}
            y2={V.height - V.padBottom}
            stroke={LAB.muted}
            strokeWidth={1}
            strokeDasharray="2 5"
            opacity={0.6}
          />
        </>
      ) : (
        <Curve points={curve} />
      )}

      {/* 扫描痕迹:每对画一条极淡的连线,越积越密 */}
      {trail && trail.length > 0 && (
        <g opacity={0.5}>
          {trail.map((t, i) => {
            const y1 = fn.at(t.x1);
            const y2 = fn.at(t.x2);
            if (y1 === null || y2 === null) return null;
            return (
              <line
                key={i}
                x1={toSvgX(V, t.x1)}
                y1={toSvgY(V, y1)}
                x2={toSvgX(V, t.x2)}
                y2={toSvgY(V, y2)}
                stroke={y1 < y2 ? LAB.pass : LAB.fail}
                strokeWidth={0.6}
                opacity={0.28}
              />
            );
          })}
        </g>
      )}

      {/* 两点之间的连线:斜率朝上还是朝下,一眼就是答案 */}
      <line
        x1={toSvgX(V, pair.x1)}
        y1={toSvgY(V, pair.y1)}
        x2={toSvgX(V, pair.x2)}
        y2={toSvgY(V, pair.y2)}
        stroke={pairPasses ? LAB.pass : LAB.fail}
        strokeWidth={2}
        opacity={0.85}
        style={{ transition: 'stroke 260ms ease' }}
      />

      {/*
        两个读数都锚在自己的高度上。当两个输出接近时(比如两点都靠近抛物线底部),
        两行字会叠在一起糊成一团 —— 截图里 `f(x₂) = 0.30` 正好压在 `f(x₁) = 0.02` 上。
        差得太近就上下各让开一点;差得开就各归各位,不做多余的位移。
      */}
      <GuideLines
        x={pair.x1}
        y={pair.y1}
        color={LAB.x1}
        label="f(x₁)"
        showValue={showNumber(pair.y1)}
        labelShiftY={labelsCollide ? 8 : 0}
      />
      <GuideLines
        x={pair.x2}
        y={pair.y2}
        color={LAB.x2}
        label="f(x₂)"
        showValue={showNumber(pair.y2)}
        labelShiftY={labelsCollide ? -8 : 0}
      />

      {interactive && (
        <>
          <DraggableXPoint
            svgRef={svgRef}
            viewport={V}
            value={pair.x1}
            onChange={onChangeX1}
            interval={interval}
            color={LAB.x1}
            label="x₁"
            describe={(v) => `x one equals ${showNumber(v)}, output ${showNumber(fn.at(v) ?? 0)}`}
          />
          <DraggableXPoint
            svgRef={svgRef}
            viewport={V}
            value={pair.x2}
            onChange={onChangeX2}
            interval={interval}
            color={LAB.x2}
            label="x₂"
            describe={(v) => `x two equals ${showNumber(v)}, output ${showNumber(fn.at(v) ?? 0)}`}
          />
        </>
      )}

      <text
        x={V.width - V.padRight}
        y={V.height - 10}
        fill={LAB.muted}
        fontSize={11}
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
      >
        x
      </text>
    </svg>
  );
}
