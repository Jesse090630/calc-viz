/**
 * LAB — 三个视图:输入机器、映射图、垂线测试。
 *
 * 全部是**受控的纯展示组件** —— 不存状态、不算数学。
 * 屏幕上的每个数字都由上层从 `src/math/functionRelation.ts` 取好再传进来。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  curveBranches,
  showInt,
  showValue,
  type Curve,
  type Pair,
} from '../../math/functionRelation';

/* ── Part 1:输入机器 ────────────────────────────────────────── */

const M = { width: 640, height: 190 };

export interface MachineProps {
  input: number;
  output: number;
  /** 0 → 1:输入从左侧走到机器再走到右侧 */
  progress: number;
}

export function MachineView({ input, output, progress }: MachineProps) {
  const inX = 96;
  const boxX = M.width / 2;
  const outX = M.width - 96;
  const midY = 92;

  /*
    ⚠️ 走位分两段:先从入口滑到机器(0→0.5),再从机器滑到出口(0.5→1)。
    一段直线滑过去看不出"进机器、再出来"这件事,而那正是这一节要演的动作。
  */
  const inLeg = Math.min(1, progress / 0.5);
  const outLeg = Math.max(0, (progress - 0.5) / 0.5);
  const tokenX = progress < 0.5 ? inX + (boxX - inX) * inLeg : boxX + (outX - boxX) * outLeg;
  /** 在机器里的时候把小球藏起来 —— 它正被"加工" */
  const inside = progress >= 0.44 && progress <= 0.56;

  return (
    <svg
      viewBox={`0 0 ${M.width} ${M.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`An input of ${showInt(input)} entering a function machine and one output of ${showInt(output)} coming out`}
    >
      {/* 轨道 */}
      <line x1={inX} y1={midY} x2={outX} y2={midY} stroke={LAB.axis} strokeWidth={1.4} strokeDasharray="5 5" opacity={0.6} />

      {/* 机器本体 */}
      <rect
        x={boxX - 46}
        y={midY - 46}
        width={92}
        height={92}
        rx={18}
        fill="#0b1020"
        stroke={inside ? LAB.pass : LAB.axis}
        strokeWidth={inside ? 2.6 : 1.6}
        style={{ transition: 'stroke 180ms ease' }}
      />
      <text x={boxX} y={midY + 12} fill={LAB.x2} fontSize={34} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">
        f
      </text>

      {/* 入口 / 出口 */}
      {[
        { x: inX, label: 'INPUT', value: showInt(input), color: LAB.x1 },
        { x: outX, label: 'OUTPUT', value: showInt(output), color: LAB.pass },
      ].map((slot) => (
        <g key={slot.label}>
          <circle cx={slot.x} cy={midY} r={30} fill={`${slot.color}1a`} stroke={slot.color} strokeWidth={1.6} />
          <text x={slot.x} y={midY + 8} fill={slot.color} fontSize={22} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">
            {slot.value}
          </text>
          <text x={slot.x} y={midY - 42} fill={LAB.muted} fontSize={10} fontWeight={700} letterSpacing={2} textAnchor="middle" fontFamily="ui-monospace, monospace">
            {slot.label}
          </text>
        </g>
      ))}

      {/* 正在传送的那个值 */}
      {!inside && progress > 0 && progress < 1 && (
        <g>
          <circle cx={tokenX} cy={midY} r={13} fill={progress < 0.5 ? LAB.x1 : LAB.pass} opacity={0.9} />
          <text x={tokenX} y={midY + 5} fill="#0b1020" fontSize={13} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">
            {progress < 0.5 ? showInt(input) : showInt(output)}
          </text>
        </g>
      )}

      {/*
        ⚠️ 只画**一个**出口。这一节的全部内容就是"恰好一个输出" ——
        机器上要是画了两条出料口,再多的文字也救不回来。
      */}
      <text x={boxX} y={M.height - 14} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
        one way in · one way out
      </text>
    </svg>
  );
}

/* ── Part 2:映射图 ──────────────────────────────────────────── */

const G = { width: 420, height: 260 };

export function MappingView({
  pairs,
  offending,
  sharedOutputs,
}: {
  pairs: readonly Pair[];
  offending: number | null;
  /** 有没有两个输入共用输出 —— 用来把那个输出圈成"没问题"的样子 */
  sharedOutputs: boolean;
}) {
  const inputs = [...new Set(pairs.map((p) => p.input))].sort((a, b) => a - b);
  const outputs = [...new Set(pairs.map((p) => p.output))].sort((a, b) => a - b);
  const leftX = 116;
  const rightX = G.width - 116;
  const slot = (i: number, total: number) => 54 + (i * (G.height - 116)) / Math.max(1, total - 1);

  const yOfInput = (v: number) => slot(inputs.indexOf(v), inputs.length);
  const yOfOutput = (v: number) => slot(outputs.indexOf(v), outputs.length);

  return (
    <svg
      viewBox={`0 0 ${G.width} ${G.height}`}
      className="w-full max-w-[420px] select-none"
      role="img"
      aria-label="A mapping diagram with arrows from inputs to outputs"
    >
      <text x={leftX} y={26} fill={LAB.muted} fontSize={10} fontWeight={700} letterSpacing={2} textAnchor="middle" fontFamily="ui-monospace, monospace">
        INPUTS
      </text>
      <text x={rightX} y={26} fill={LAB.muted} fontSize={10} fontWeight={700} letterSpacing={2} textAnchor="middle" fontFamily="ui-monospace, monospace">
        OUTPUTS
      </text>

      {/* 箭头。出问题的那个输入,它的**每一条**箭头都标红。 */}
      {pairs.map((p, i) => {
        const bad = offending !== null && p.input === offending;
        const y1 = yOfInput(p.input);
        const y2 = yOfOutput(p.output);
        return (
          <g key={i}>
            <line
              x1={leftX + 24}
              y1={y1}
              x2={rightX - 24}
              y2={y2}
              stroke={bad ? LAB.fail : LAB.axis}
              strokeWidth={bad ? 2.6 : 1.6}
              opacity={bad ? 1 : 0.75}
              style={{ transition: 'stroke 220ms ease' }}
            />
            <path
              d={`M${rightX - 32} ${y2 - 5} L${rightX - 24} ${y2} L${rightX - 32} ${y2 + 5}`}
              fill="none"
              stroke={bad ? LAB.fail : LAB.axis}
              strokeWidth={bad ? 2.4 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      })}

      {/* 输入节点 */}
      {inputs.map((v) => {
        const bad = v === offending;
        return (
          <g key={`in-${v}`}>
            <circle
              cx={leftX}
              cy={yOfInput(v)}
              r={22}
              fill={bad ? `${LAB.fail}1f` : `${LAB.x1}1a`}
              stroke={bad ? LAB.fail : LAB.x1}
              strokeWidth={bad ? 2.6 : 1.6}
              style={{ transition: 'stroke 220ms ease' }}
            />
            <text x={leftX} y={yOfInput(v) + 6} fill={bad ? LAB.fail : LAB.x1} fontSize={17} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {showInt(v)}
            </text>
          </g>
        );
      })}

      {/* 输出节点。被共用的那个用青色描一圈,并且**不是**警示色 —— 它没问题。 */}
      {outputs.map((v) => {
        const shared = sharedOutputs && pairs.filter((p) => p.output === v).length > 1;
        return (
          <g key={`out-${v}`}>
            <circle
              cx={rightX}
              cy={yOfOutput(v)}
              r={22}
              fill={`${LAB.pass}1a`}
              stroke={shared ? LAB.x1 : LAB.pass}
              strokeWidth={shared ? 2.6 : 1.6}
              strokeDasharray={shared ? '5 3' : undefined}
            />
            <text x={rightX} y={yOfOutput(v) + 6} fill={LAB.pass} fontSize={17} fontWeight={800} textAnchor="middle" fontFamily="ui-monospace, monospace">
              {showInt(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Part 3:垂线测试 ────────────────────────────────────────── */

export const VLINE_V = makeViewport({
  width: 620,
  height: 360,
  xMin: -3.3,
  xMax: 4.4,
  yMin: -2.9,
  yMax: 4.6,
  padLeft: 34,
  padRight: 22,
  padTop: 20,
  padBottom: 30,
});

export function VerticalLineView({
  curve,
  x,
  hits,
  onChangeX,
}: {
  curve: Curve;
  x: number;
  /** 这条垂线与曲线的交点(y 值),由上层算好 */
  hits: readonly number[];
  onChangeX: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const V = VLINE_V;
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  const tooMany = hits.length > 1;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${curve.label} with a movable vertical line meeting it ${hits.length} time${hits.length === 1 ? '' : 's'}`}
    >
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        <line x1={x0} y1={V.padTop} x2={x0} y2={V.height - V.padBottom} stroke={LAB.axis} strokeWidth={1.2} />
        {ticks(V.xMin, V.xMax, 1).map((t) => (
          <text key={`x${t}`} x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
            {t !== 0 ? t : ''}
          </text>
        ))}
        {ticks(V.yMin, V.yMax, 2).map((t) => (
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
            {t !== 0 ? t : ''}
          </text>
        ))}
      </g>

      {curveBranches(curve, V.xMin, V.xMax, 220).map((branch, i) => (
        <path
          key={i}
          d={polylinePath(V, branch)}
          fill="none"
          stroke={LAB.curve}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* 垂线本身。交点多于一个时整条线变红 —— 判决直接写在那条线上。 */}
      <line
        x1={toSvgX(V, x)}
        y1={V.padTop}
        x2={toSvgX(V, x)}
        y2={V.height - V.padBottom}
        stroke={tooMany ? LAB.fail : LAB.x2}
        strokeWidth={2.4}
        style={{ transition: 'stroke 200ms ease' }}
      />

      {hits.map((y, i) => (
        <circle
          key={i}
          cx={toSvgX(V, x)}
          cy={toSvgY(V, y)}
          r={7}
          fill={tooMany ? LAB.fail : LAB.pass}
          stroke="#0b1020"
          strokeWidth={2}
        />
      ))}

      {/* 交点数写在垂线顶端 */}
      <text
        x={toSvgX(V, x)}
        y={V.padTop + 2}
        fill={tooMany ? LAB.fail : LAB.pass}
        fontSize={12}
        fontWeight={800}
        textAnchor="middle"
        fontFamily="ui-monospace, monospace"
        stroke="#0b1020"
        strokeWidth={3.5}
        paintOrder="stroke"
      >
        {hits.length} {hits.length === 1 ? 'hit' : 'hits'}
      </text>

      {/* 两个交点时,把两个 y 值都标出来 —— "一个输入两个输出"要看得见数字 */}
      {tooMany &&
        hits.map((y, i) => (
          <text
            key={`v${i}`}
            x={toSvgX(V, x) + 12}
            y={toSvgY(V, y) + 4}
            fill={LAB.fail}
            fontSize={11}
            fontWeight={700}
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            y = {showValue(y)}
          </text>
        ))}

      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={x}
        onChange={onChangeX}
        interval={{ a: V.xMin + 0.2, b: V.xMax - 0.2 }}
        color={LAB.x2}
        label=""
        step={0.05}
        describe={(v) => `vertical line at x equals ${showValue(v)}`}
      />
    </svg>
  );
}
