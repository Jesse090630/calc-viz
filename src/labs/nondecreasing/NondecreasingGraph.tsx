/**
 * LAB — 非递减:折线图 + 两个可拖动的输入
 *
 * 画面上要同时说清三件事:
 *   ① 这条折线**哪几段是平的**(绿色底光)、哪一段在**往下走**(红色底光);
 *   ② 当前这一对 x₁ < x₂ 各自对应的输出**有多高**(引到 y 轴的水平虚线);
 *   ③ 两个高度**谁高谁低**(两条水平线之间的竖直比较条)。
 *
 * ⚠️ 上坡段**不加底光**。三种情况都染色的话,画面变成三色条纹,
 * "值得注意的地方"就没了 —— 底光只留给"平"和"下降"这两件要讲的事。
 *
 * ⚠️ 「same height」这行字**不能写在连线的正中间**:
 * 两端等高时那条连线恰好压在折线的平坦段上,字与线糊在一起。
 * 往上抬 13px,并且加深色描边打底(paintOrder)。
 *
 * 受控组件:不存状态、不算数学。
 */
import { useRef } from 'react';
import { DraggableXPoint } from '../shared/DraggableXPoint';
import { LAB } from '../shared/theme';
import { makeViewport, polylinePath, ticks, toSvgX, toSvgY } from '../shared/viewport';
import {
  SHAPE_COPY,
  cornerHeights,
  fallingSegments,
  flatSegments,
  polyline,
  showX,
  showY,
  type PairReading,
  type PiecewiseGraph,
} from '../../math/nondecreasing';

export const V = makeViewport({
  width: 680,
  height: 400,
  xMin: -0.7,
  xMax: 8.7,
  // 折线在 1..5 之间。下面留出 y = 0 那一行 —— 手柄画在 x 轴上,轴必须在画面里。
  yMin: -1.0,
  yMax: 5.9,
  padLeft: 36,
  padRight: 26,
  padTop: 24,
  padBottom: 46,
});

/** 底光:比线本身粗,画在线**下面**。 */
const GLOW_WIDTH = 11;

/** y 轴边上的一枚读数小牌子。深色描边打底,压在折线上也读得出来。 */
function ValueChip({
  x,
  y,
  color,
  text,
  below = false,
}: {
  x: number;
  y: number;
  color: string;
  text: string;
  /** 写在那条水平引导线的下面而不是上面 */
  below?: boolean;
}) {
  return (
    <text
      x={x}
      y={y + (below ? 15 : -7)}
      fill={color}
      fontSize={12}
      fontWeight={700}
      textAnchor="start"
      fontFamily="ui-monospace, monospace"
      stroke="#0b1020"
      strokeWidth={4}
      paintOrder="stroke"
    >
      {text}
    </text>
  );
}

export function NondecreasingGraph({
  graph,
  reading,
  onChangeX1,
  onChangeX2,
}: {
  graph: PiecewiseGraph;
  reading: PairReading;
  onChangeX1: (x: number) => void;
  onChangeX2: (x: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const y0 = toSvgY(V, 0);
  const x0 = toSvgX(V, 0);
  const p1 = { x: toSvgX(V, reading.x1), y: toSvgY(V, reading.y1) };
  const p2 = { x: toSvgX(V, reading.x2), y: toSvgY(V, reading.y2) };
  const shape = SHAPE_COPY[reading.shape];
  const verdictColor = shape.allowed ? LAB.pass : LAB.fail;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${V.width} ${V.height}`}
      className="w-full select-none"
      role="img"
      aria-label={`${graph.label}: a piecewise line with two draggable inputs on the x-axis`}
    >
      {/* 当前这一对张开的范围 —— 一层很淡的底,说明"我们正在看这一段" */}
      <rect
        x={p1.x}
        y={V.padTop}
        width={Math.max(0, p2.x - p1.x)}
        height={y0 - V.padTop}
        fill={verdictColor}
        opacity={0.06}
        style={{ transition: 'x 120ms linear, width 120ms linear, fill 200ms ease' }}
      />

      {/* 坐标轴 */}
      <g aria-hidden="true">
        <line x1={V.padLeft} y1={y0} x2={V.width - V.padRight} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        <line x1={x0} y1={V.padTop} x2={x0} y2={y0} stroke={LAB.axis} strokeWidth={1.2} />
        {ticks(0, 8, 2).map((t) => (
          <g key={`x${t}`}>
            <line x1={toSvgX(V, t)} y1={y0 - 4} x2={toSvgX(V, t)} y2={y0 + 4} stroke={LAB.axis} strokeWidth={1} />
            {t !== 0 && (
              <text x={toSvgX(V, t)} y={y0 + 16} fill={LAB.muted} fontSize={11} textAnchor="middle" fontFamily="ui-monospace, monospace">
                {t}
              </text>
            )}
          </g>
        ))}
        {/* ⚠️ y 刻度标在**折线真正到过的高度**上(1、3、5),不是等距的 2、4。
            等距刻度会把"平台停在哪个高度"这件事藏起来。 */}
        {cornerHeights(graph).map((t) => (
          <g key={`y${t}`}>
            <line x1={x0 - 4} y1={toSvgY(V, t)} x2={x0 + 4} y2={toSvgY(V, t)} stroke={LAB.axis} strokeWidth={1} />
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
              {t}
            </text>
          </g>
        ))}
      </g>

      {/*
        平坦段的绿色底光。
        ⚠️ **不再往上写 "→ flat" 那行字**。平坦段是水平的,而这一节最重要的那条
        "same height" 连线也是水平的、也想写在同一段上方 —— 加上 y 轴边上的读数,
        三样东西挤在同一条高度线上,截图里糊成了一团。
        底光本身已经把"这一段是平的"说清楚了,右下角的 ↗ → ↘ 面板负责解释含义。
      */}
      {flatSegments(graph).map((segment) => (
        <line
          key={`flat-${segment.from}`}
          x1={toSvgX(V, segment.from)}
          y1={toSvgY(V, segment.yFrom)}
          x2={toSvgX(V, segment.to)}
          y2={toSvgY(V, segment.yTo)}
          stroke={LAB.pass}
          strokeWidth={GLOW_WIDTH}
          strokeLinecap="round"
          opacity={0.25}
        />
      ))}

      {/* 下坡段的红色底光 + 一个 ↘。只有 dip 图上有。 */}
      {fallingSegments(graph).map((segment) => (
        <g key={`fall-${segment.from}`}>
          <line
            x1={toSvgX(V, segment.from)}
            y1={toSvgY(V, segment.yFrom)}
            x2={toSvgX(V, segment.to)}
            y2={toSvgY(V, segment.yTo)}
            stroke={LAB.fail}
            strokeWidth={GLOW_WIDTH}
            strokeLinecap="round"
            opacity={0.32}
          />
          {/*
            ⚠️ 这个标记**不挂在曲线旁边**,而是画成 x 轴上方的一段括号。
            挂在曲线旁边时,它会随着 x₂ 走到附近而和 "↘ went down" 撞上 ——
            两行几乎一样的字叠在一起(文字碰撞扫描抓到的)。
            贴着轴的这条带子除了几根虚线之外什么都没有,而且
            "**这一段输入**上函数在下降" 本来就是更准确的说法。
          */}
          <line
            x1={toSvgX(V, segment.from)}
            y1={y0 - 22}
            x2={toSvgX(V, segment.to)}
            y2={y0 - 22}
            stroke={LAB.fail}
            strokeWidth={2}
            opacity={0.75}
          />
          {[segment.from, segment.to].map((edge) => (
            <line key={edge} x1={toSvgX(V, edge)} y1={y0 - 27} x2={toSvgX(V, edge)} y2={y0 - 17} stroke={LAB.fail} strokeWidth={2} opacity={0.75} />
          ))}
          <text
            x={toSvgX(V, (segment.from + segment.to) / 2)}
            y={y0 - 30}
            fill={LAB.fail}
            fontSize={13}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            {SHAPE_COPY.down.arrow} down
          </text>
        </g>
      ))}

      {/* 折线本身。拐点原样喂进去,不做等距重采样 —— 尖角必须是尖的。 */}
      <path
        d={polylinePath(V, polyline(graph))}
        fill="none"
        stroke={LAB.curve}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 两个输出各自引到 y 轴的水平虚线 —— "输出有多高"要能读出来 */}
      {[
        { p: p1, y: reading.y1, color: LAB.x1, name: 'f(x₁)' },
        { p: p2, y: reading.y2, color: LAB.x2, name: 'f(x₂)' },
      ].map((item) => (
        <g key={item.name}>
          <line
            x1={x0}
            y1={item.p.y}
            x2={item.p.x}
            y2={item.p.y}
            stroke={item.color}
            strokeWidth={1.1}
            strokeDasharray="4 4"
            opacity={0.55}
          />
          <line x1={item.p.x} y1={y0} x2={item.p.x} y2={item.p.y} stroke={item.color} strokeWidth={1.1} strokeDasharray="4 4" opacity={0.55} />
        </g>
      ))}

      {/*
        两个高度之间的比较。
        ⚠️ 等高时画一条水平连线,不等高时画一条竖直条 —— 这两种画法说的是同一件事,
        但等高那一种必须**看得出"没有高度差"**,竖直条在这时长度为零、什么也说明不了。
      */}
      {reading.shape === 'flat' ? (
        <g>
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={LAB.pass} strokeWidth={2.2} strokeDasharray="6 4" />
          <text
            x={(p1.x + p2.x) / 2}
            y={p1.y - 15}
            fill={LAB.pass}
            fontSize={12}
            fontWeight={700}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            same height
          </text>
        </g>
      ) : (
        <g>
          <line x1={p2.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={verdictColor} strokeWidth={2.4} />
          <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p1.y} stroke={verdictColor} strokeWidth={1.2} strokeDasharray="3 3" opacity={0.7} />
          <text
            // ⚠️ x₂ 常常靠右;标签往右写会被视口裁掉,所以贴边时改写在左侧。
            x={p2.x + (reading.x2 > 6.6 ? -10 : 10)}
            y={(p1.y + p2.y) / 2 + 4}
            fill={verdictColor}
            fontSize={12}
            fontWeight={700}
            textAnchor={reading.x2 > 6.6 ? 'end' : 'start'}
            fontFamily="ui-monospace, monospace"
            stroke="#0b1020"
            strokeWidth={3.5}
            paintOrder="stroke"
          >
            {shape.arrow} {shape.word}
          </text>
        </g>
      )}

      {/*
        折线上的两个点。
        ⚠️ **不在点旁边写 (x, y)**。第一版写了,截图里三行字叠成一团:
        两点等高时两个坐标标签处在同一高度,再加上 "same height",
        出来的是 `s(0:4he1i0)t (1.8, 1.0)` 这种没人读得懂的东西。
        数字右边面板上已经有了;图上只留形状,y 值放到 y 轴边上那两枚小牌子里。
      */}
      {[
        { p: p1, color: LAB.x1, name: 'x1' },
        { p: p2, color: LAB.x2, name: 'x2' },
      ].map((item) => (
        <g key={item.name}>
          <circle cx={item.p.x} cy={item.p.y} r={10} fill={item.color} opacity={0.16} />
          <circle cx={item.p.x} cy={item.p.y} r={5.5} fill={item.color} stroke="#0b1020" strokeWidth={1.8} />
        </g>
      ))}

      {/*
        y 轴边上的输出读数。等高时两枚牌子会完全重合 —— 那时只画**一枚**,
        并且用绿色,因为"同一个高度"正是这一刻要说的事。
      */}
      {reading.shape === 'flat' ? (
        // 等高:一枚牌子写在线**下面** —— 上面留给 "same height"。
        <ValueChip y={p1.y} below color={LAB.pass} text={`f(x₁) = f(x₂) = ${showY(reading.y1)}`} x={x0 + 7} />
      ) : (
        <>
          {/*
            ⚠️ **高的那枚写在线上方,低的那枚写在线下方** —— 于是两枚永远相互远离,
            间距 = 两条线的间距 + 22px,不管两个输出多接近。
            第一版写死"x₁ 在上、x₂ 在下",在 y₁ < y₂ 时两枚反而**相向而行**:
            f(x₁)=2.2 与 f(x₂)=2.5 只差 14px,加上偏移正好压在一起。
            (这条是文字碰撞扫描抓到的,不是我看出来的。)
          */}
          <ValueChip y={p1.y} below={reading.y1 < reading.y2} color={LAB.x1} text={`f(x₁) = ${showY(reading.y1)}`} x={x0 + 7} />
          <ValueChip y={p2.y} below={reading.y2 < reading.y1} color={LAB.x2} text={`f(x₂) = ${showY(reading.y2)}`} x={x0 + 7} />
        </>
      )}

      {/* x 轴上的两个手柄。顺序由 `snapPair` 保证,这里不再做第二次约束。 */}
      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.x1}
        onChange={onChangeX1}
        interval={graph.domain}
        color={LAB.x1}
        label="x₁"
        step={0.1}
        // ⚠️ 两个手柄挨到最近(差一格)时,两个居中标签会叠成一团。各让开 11px。
        labelDx={-11}
        describe={(v) => `x1 equals ${showX(v)}`}
      />
      <DraggableXPoint
        svgRef={svgRef}
        viewport={V}
        value={reading.x2}
        onChange={onChangeX2}
        interval={graph.domain}
        color={LAB.x2}
        label="x₂"
        step={0.1}
        labelDx={11}
        describe={(v) => `x2 equals ${showX(v)}`}
      />

      {/*
        这里原来有一行 `→ ↗ → ↗  SECTION BY SECTION` 的图例。删了:
        它孤零零地吊在画布最下面一大片空白里,箭头小到看不清,
        而它想说的事(每一段是升是平)图下面那块 ↗ → ↘ 面板说得更清楚、更大。
      */}
    </svg>
  );
}
