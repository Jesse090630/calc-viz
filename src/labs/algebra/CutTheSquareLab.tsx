/**
 * LAB — 「Cut the Square」(平方差 `a² − b² = (a − b)(a + b)`)
 *
 * ⭐⭐ 这一课的主体是一段**分五幕的证明动画**,不是一张静态图。
 * 每一幕对应一个数学操作,而不是一个好看的效果:
 *   ① Build     面积 = 乘法      —— 四条边把自己画出来,围成 a × a
 *   ② Remove    减法             —— 角上的小正方形出现、标好、被拿走
 *   ③ Cut       分解             —— 厚度括号从 b 长到 a,一刀切开,两块推开一点
 *   ④ Rearrange 重排             —— 一块抬起、转 90°、滑过去、扣上
 *   ⑤ Factor    加法             —— a 与 b 两段括号合成 a + b,然后才是等号
 *
 * ⚠️⚠️ **等号是结论,不是布景。**
 * `(a−b)(a+b)` 要到第五幕过半才出现,`a² − b² = (a−b)(a+b)` 要到最后才出现。
 * 先摆公式再演示,等于把"看见"降级成"确认"。这条纪律由
 * `areaTexAt` / `identityTexAt` 保证,并有测试钉着。
 *
 * ⚠️ 画单位格。a、b 是整数,「面积是 40」于是是学生能**数出来**的事。
 *
 * ⚠️ 颜色:大正方形青、挖掉的小正方形琥珀、拼好的长方形绿(已验证的相等)。
 * 这一页没有任何东西会不成立,所以**不出现红色**。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import { usePrefersReducedMotion } from '../../accessibility/usePrefersReducedMotion';
import {
  ActionButton,
  EqualityRow,
  IntSlider,
  LessonHead,
  Panel,
  QuietButton,
  RevealButton,
  TermChip,
  Toggle,
} from './shared';
import {
  CANCEL_WORDS,
  EXPANSION,
  HEADLINE,
  MAIN_IDEA,
  OPERATION_WORDS,
  PATTERNS,
  RANGE,
  SAME_PIECES,
  STAGES,
  STAGE_COUNT,
  areaByFactors,
  areaByPieces,
  areaTexAt,
  beat,
  bigArea,
  clampPair,
  cornersAt,
  currentIndex,
  cutLine,
  cutOffset,
  edgeDrawn,
  edgesOf,
  factorsTex,
  globalFor,
  identityTexAt,
  localProgress,
  longSideBrackets,
  numbersPlain,
  partialEnd,
  patternOf,
  pieceArea,
  pieces,
  placeAt,
  productPlain,
  rearrangeProgress,
  remainingArea,
  smallArea,
  squaresTex,
  stageAt,
  survivingTerms,
  targetRect,
  thicknessBracket,
  type Piece,
} from '../../math/differenceOfSquares';

type Mode = 'geometry' | 'algebra';

const MODES = [
  { id: 'geometry' as const, label: 'Geometry' },
  { id: 'algebra' as const, label: 'Algebra' },
];

/* ══ 画板 ══════════════════════════════════════════════════════════ */

/**
 * ⚠️ 边距用**像素**,不用「格」。
 * 一格有多少像素取决于 a;边距按格留、标签偏移按像素写,两个单位系统一打架,
 * a 一大标签就溢出(浏览器检查量出过 "outside: a + b = 10")。
 */
// ⚠️ 左边留出 62px:厚度括号画在图形**左侧**,竖着的。
const PX = { left: 62, right: 104, top: 52, bottom: 40 } as const;
const BOARD = 400;

/** 每一幕在画板上的持续时间(毫秒)。切开与重排给得长一点,那是要看清的两幕。 */
const STAGE_MS = [1500, 2200, 2400, 2600, 2400];

function Board({ a, b, global }: { a: number; b: number; global: number }) {
  const index = currentIndex(global);
  const p = localProgress(global, index);
  const target = targetRect(a, b);

  const contentW = Math.max(a, target.w);
  const contentH = Math.max(a, target.h);
  const unit = BOARD / Math.max(contentW, contentH);
  const toX = (x: number) => PX.left + x * unit;
  const toY = (y: number) => PX.top + (contentH - y) * unit;
  const width = PX.left + contentW * unit + PX.right;
  const height = PX.top + contentH * unit + PX.bottom;

  const [top, side] = pieces(a, b);
  const move = rearrangeProgress(global);
  const settled = move > 0.995;

  /* 每一幕的小节 —— 用 `beat` 切,不手写边界 */
  const buildEdges = index === 0 ? p : 1;
  const buildFill = index === 0 ? beat(p, 0.55, 0.85) : 1;
  const holeIn = index === 1 ? beat(p, 0, 0.3) : index > 1 ? 1 : 0;
  const holeOut = index === 1 ? beat(p, 0.5, 0.85) : index > 1 ? 1 : 0;
  const thickness = index === 2 ? beat(p, 0, 0.4) : index > 2 ? 1 : 0;
  const cutDraw = index === 2 ? beat(p, 0.4, 0.72) : index > 2 ? 1 : 0;
  const separate = index === 2 ? beat(p, 0.72, 1) : index > 2 ? (index === 3 ? 1 - move : 0) : 0;
  const joinBrackets = index === 4 ? beat(p, 0, 0.4) : 0;
  const showLongSide = index === 4;

  const polygon = (piece: Piece) => {
    const nudge = cutOffset(piece, separate);
    return cornersAt(piece, move)
      .map((c) => `${toX(c.x + nudge.x).toFixed(2)},${toY(c.y + nudge.y).toFixed(2)}`)
      .join(' ');
  };

  const grid: React.ReactElement[] = [];
  for (let i = 0; i <= contentW; i += 1) {
    grid.push(<line key={`v${i}`} x1={toX(i)} y1={toY(contentH)} x2={toX(i)} y2={toY(0)} stroke={LAB.axis} strokeWidth={0.5} opacity={0.3} />);
  }
  for (let j = 0; j <= contentH; j += 1) {
    grid.push(<line key={`h${j}`} x1={toX(0)} y1={toY(j)} x2={toX(contentW)} y2={toY(j)} stroke={LAB.axis} strokeWidth={0.5} opacity={0.3} />);
  }

  const label = (
    key: string,
    x: number,
    y: number,
    text: string,
    colour: string,
    anchor: 'start' | 'middle' | 'end' = 'middle',
    size = 13,
  ) => (
    <text
      key={key} data-mark={key} x={x} y={y} fill={colour} fontSize={size} fontWeight={700} textAnchor={anchor}
      fontFamily="ui-monospace, monospace" stroke="#0b1020" strokeWidth={3.5} paintOrder="stroke"
    >
      {text}
    </text>
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full select-none"
      role="img"
      aria-label={`Stage ${index + 1} of ${STAGE_COUNT}: ${stageAt(index).caption}`}
    >
      <g aria-hidden="true">{grid}</g>

      {/* ① 四条边把自己画出来 */}
      {index === 0 && (
        <g data-act="build">
          {edgesOf(a).map((edge, i) => {
            const drawn = edgeDrawn(i, buildEdges);
            if (drawn <= 0) return null;
            const end = partialEnd(edge, drawn);
            return (
              <line
                key={i} data-edge={String(i)}
                x1={toX(edge.from.x)} y1={toY(edge.from.y)} x2={toX(end.x)} y2={toY(end.y)}
                stroke={LAB.x1} strokeWidth={2.6} strokeLinecap="round"
              />
            );
          })}
          {buildFill > 0 && (
            <rect
              data-shape="fill"
              x={toX(0)} y={toY(a)} width={a * unit} height={a * unit}
              fill={LAB.x1} fillOpacity={0.22 * buildFill}
            />
          )}
          {buildEdges > 0.3 && label('side-a', toX(a / 2), toY(0) + 22, `a = ${a}`, LAB.x1)}
          {buildEdges > 0.55 && label('side-a2', toX(a) + 8, toY(a / 2) + 4, `a = ${a}`, LAB.x1, 'start')}
        </g>
      )}

      {/* ② 小正方形出现,然后被拿走 */}
      {index === 1 && holeIn > 0 && holeOut < 1 && (
        <g data-act="remove" opacity={1 - holeOut}>
          <rect
            data-shape="hole"
            x={toX(0)} y={toY(b)} width={b * unit} height={b * unit}
            fill={LAB.x2} fillOpacity={0.18} stroke={LAB.x2} strokeWidth={2}
            transform={`translate(${-holeOut * 42} ${holeOut * 30})`}
          />
          {holeIn > 0.7 && label('hole-area', toX(b / 2) - holeOut * 42, toY(b / 2) + 4 + holeOut * 30, `b² = ${smallArea(b)}`, LAB.x2)}
          {holeIn > 0.5 && label('side-b', toX(b / 2) - holeOut * 42, toY(0) + 20 + holeOut * 30, `b = ${b}`, LAB.x2)}
        </g>
      )}
      {/* 剩下那块的底色:小正方形被拿走之后,L 形才是主角 */}
      {index === 1 && (
        <rect
          x={toX(0)} y={toY(a)} width={a * unit} height={a * unit}
          fill={LAB.x1} fillOpacity={0.1}
        />
      )}

      {/*
        ③ 厚度括号:**竖着**画在图形左侧,从 y = b 长到 y = a。
        ⚠️ 第一版把它横着画在图形上方 —— 数字是对的(a − b = 4),
        但位置在暗示它量的是**上边**,而上边是 a = 7。
        「剩下的厚度」是竖直方向的量,括号就得竖着画在那段厚度旁边。
        (读截图时看出来的:一个说得通的数字配了一个说不通的位置。)
      */}
      {index === 2 && thickness > 0 && (
        <g data-act="thickness">
          <line
            data-bracket="thickness"
            x1={toX(0) - 20} y1={toY(thicknessBracket(a, b, thickness).from)}
            x2={toX(0) - 20} y2={toY(thicknessBracket(a, b, thickness).to)}
            stroke={LAB.x2} strokeWidth={2.2}
          />
          <line x1={toX(0) - 26} y1={toY(b)} x2={toX(0) - 14} y2={toY(b)} stroke={LAB.x2} strokeWidth={2.2} />
          <line
            x1={toX(0) - 26} y1={toY(thicknessBracket(a, b, thickness).to)}
            x2={toX(0) - 14} y2={toY(thicknessBracket(a, b, thickness).to)}
            stroke={LAB.x2} strokeWidth={2.2}
          />
          {/* 起点标 b、终点标 a —— 让「从 b 长到 a」看得出来 */}
          {label('from-b', toX(0) - 32, toY(b) + 4, `b = ${b}`, LAB.x2, 'end', 11)}
          {thickness > 0.9 && label('to-a', toX(0) - 32, toY(a) + 4, `a = ${a}`, LAB.x1, 'end', 11)}
          {thickness > 0.85 && label('thickness', toX(0) - 20, PX.top - 26, `a − b = ${a - b}`, LAB.x2, 'middle')}
        </g>
      )}

      {/* ③ 那一刀 */}
      {cutDraw > 0 && !settled && index < 4 && (
        <line
          data-act="cut"
          x1={toX(cutLine(a, b, cutDraw).from.x)} y1={toY(cutLine(a, b, cutDraw).from.y)}
          x2={toX(cutLine(a, b, cutDraw).to.x)} y2={toY(cutLine(a, b, cutDraw).to.y)}
          stroke={LAB.x2} strokeWidth={2.4} strokeDasharray="6 4" strokeLinecap="round"
        />
      )}

      {/* 拼好之后把长方形框出来 */}
      {settled && (
        <rect
          data-shape="target"
          x={toX(0)} y={toY(target.h)} width={target.w * unit} height={target.h * unit}
          fill="none" stroke={LAB.pass} strokeWidth={2.2}
        />
      )}

      {/* 两块碎片。⚠️ 第一幕还没切,不画 */}
      {index > 0 && (
        <>
          <polygon
            data-piece="top" data-settled={settled ? 'yes' : 'no'}
            points={polygon(top)}
            fill={LAB.x1} fillOpacity={0.3} stroke={LAB.x1} strokeWidth={1.8}
          />
          <polygon
            data-piece="side" data-settled={settled ? 'yes' : 'no'}
            points={polygon(side)}
            fill={settled ? LAB.pass : LAB.x2} fillOpacity={0.3}
            stroke={settled ? LAB.pass : LAB.x2} strokeWidth={1.8}
          />
        </>
      )}

      {/* ③ 切开之后先标尺寸,再标面积 */}
      {index === 2 && separate > 0.4 && (
        <g data-act="piece-areas">
          {[top, side].map((piece) => {
            const nudge = cutOffset(piece, separate);
            const { centre } = placeAt(piece, 0);
            return (
              <g key={piece.id}>
                {label(
                  `dims-${piece.id}`,
                  toX(centre.x + nudge.x), toY(centre.y + nudge.y) - 4,
                  piece.labels.map((l) => l.value).join(' × '),
                  piece.id === 'top' ? LAB.x1 : LAB.x2, 'middle', 11,
                )}
                {separate > 0.75 && label(
                  `area-${piece.id}`,
                  toX(centre.x + nudge.x), toY(centre.y + nudge.y) + 13,
                  String(pieceArea(piece)),
                  piece.id === 'top' ? LAB.x1 : LAB.x2, 'middle', 13,
                )}
              </g>
            );
          })}
        </g>
      )}

      {/* ⑤ 长边:a 与 b 合成 a + b */}
      {showLongSide && (
        <g data-act="long-side">
          {longSideBrackets(a, b, joinBrackets).map((bracket, i) => (
            <g key={bracket.label}>
              <line
                data-bracket={bracket.label.replace(/\s/g, '')}
                x1={toX(bracket.from)} y1={toY(0) + 16} x2={toX(bracket.to)} y2={toY(0) + 16}
                stroke={LAB.pass} strokeWidth={2.2}
              />
              <line x1={toX(bracket.from)} y1={toY(0) + 10} x2={toX(bracket.from)} y2={toY(0) + 22} stroke={LAB.pass} strokeWidth={2.2} />
              <line x1={toX(bracket.to)} y1={toY(0) + 10} x2={toX(bracket.to)} y2={toY(0) + 22} stroke={LAB.pass} strokeWidth={2.2} />
              {label(`long-${i}`, toX((bracket.from + bracket.to) / 2), toY(0) + 36, `${bracket.label.replace('a + b', 'a + b')} = ${bracket.value}`, LAB.pass)}
            </g>
          ))}
          <line
            data-bracket="short"
            x1={toX(target.w) + 14} y1={toY(0)} x2={toX(target.w) + 14} y2={toY(target.h)}
            stroke={LAB.pass} strokeWidth={2.2}
          />
          {label('short-label', toX(target.w) + 22, toY(target.h / 2) + 4, `a − b = ${a - b}`, LAB.pass, 'start')}
        </g>
      )}

      {/* ⑤ 「同样的两块、同样的面积」—— 原图缩小成一个角落里的对照 */}
      {index === 4 && p > 0.55 && (
        <g data-act="before-after" opacity={beat(p, 0.55, 0.75)}>
          <rect
            x={toX(0)} y={PX.top - 44} width={34} height={34}
            fill={LAB.x1} fillOpacity={0.18} stroke={LAB.x1} strokeWidth={1.4}
          />
          <rect
            x={toX(0)} y={PX.top - 44 + 34 - 34 * (b / a)} width={34 * (b / a)} height={34 * (b / a)}
            fill="#0b1020" stroke={LAB.x2} strokeWidth={1.2}
          />
          {label('before-after', toX(0) + 44, PX.top - 22, SAME_PIECES, LAB.muted, 'start', 11)}
        </g>
      )}

      {/* 每块中间的面积数字 —— 数得出来 */}
      {index > 2 && [top, side].map((piece) => {
        const { centre } = placeAt(piece, move);
        return label(
          `piece-${piece.id}`,
          toX(centre.x), toY(centre.y) + 4,
          String(pieceArea(piece)),
          piece.id === 'top' ? LAB.x1 : settled ? LAB.pass : LAB.x2,
        );
      })}
    </svg>
  );
}

/* ══ 播放控制 ══════════════════════════════════════════════════════ */

function useDirector(a: number, b: number) {
  const reduced = usePrefersReducedMotion();
  const [global, setGlobal] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frame = useRef<number | null>(null);
  const last = useRef<number>(0);

  // ⚠️ 换 a / b 时把动画退回起点。半途换尺寸会让"面积没变"这件事失去参照。
  useEffect(() => { setGlobal(0); setPlaying(false); }, [a, b]);

  useEffect(() => {
    if (!playing) return;
    if (reduced) {
      // 不动的用户要的是**结果**,不是慢动作:直接推进一幕。
      setGlobal((g) => Math.min(STAGE_COUNT, Math.floor(g) + 1));
      setPlaying(false);
      return;
    }
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = now - last.current;
      last.current = now;
      setGlobal((g) => {
        const index = Math.min(STAGE_COUNT - 1, Math.floor(g));
        const next = g + dt / (STAGE_MS[index] ?? 2000);
        if (next >= STAGE_COUNT) { setPlaying(false); return STAGE_COUNT; }
        return next;
      });
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [playing, reduced]);

  const play = useCallback(() => {
    setGlobal((g) => (g >= STAGE_COUNT ? 0 : g));
    setPlaying(true);
  }, []);
  const pause = useCallback(() => setPlaying(false), []);
  const restart = useCallback(() => { setPlaying(false); setGlobal(0); }, []);
  const step = useCallback((delta: number) => {
    setPlaying(false);
    setGlobal((g) => {
      const here = currentIndex(g);
      const atEnd = localProgress(g, here) > 0.999;
      const next = delta > 0 ? (atEnd ? here + 1 : here) : here - 1;
      return globalFor(Math.min(Math.max(next, 0), STAGE_COUNT - 1), 1);
    });
  }, []);
  const jump = useCallback((index: number) => { setPlaying(false); setGlobal(globalFor(index, 1)); }, []);

  return { global, playing, animated: !reduced, play, pause, restart, step, jump };
}

function Controls({
  global, playing, animated, onPlay, onPause, onRestart, onStep, onJump,
}: {
  global: number;
  playing: boolean;
  animated: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStep: (delta: number) => void;
  onJump: (index: number) => void;
}) {
  const index = currentIndex(global);
  const done = global >= STAGE_COUNT;
  return (
    <div data-panel="controls" data-stage={String(index)} data-global={global.toFixed(3)} data-playing={playing ? 'yes' : 'no'}>
      <div className="flex flex-wrap items-center gap-1.5">
        {playing ? (
          <ActionButton name="pause" onClick={onPause}>Pause</ActionButton>
        ) : (
          <ActionButton name="play" onClick={onPlay}>
            {done ? 'Play again' : animated ? 'Play proof →' : 'Next stage →'}
          </ActionButton>
        )}
        <QuietButton name="restart" onClick={onRestart}>Restart</QuietButton>
        <span className="mx-1 h-4 w-px bg-slate-700" aria-hidden="true" />
        <QuietButton name="prev" onClick={() => onStep(-1)}>‹ Back</QuietButton>
        <QuietButton name="next" onClick={() => onStep(1)}>Next ›</QuietButton>
      </div>

      {/* 进度指示:五幕,当前那幕亮着 */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {STAGES.map((stage, i) => (
          <button
            key={stage.id}
            type="button"
            data-stage-chip={stage.id}
            data-active={i === index ? 'yes' : 'no'}
            data-done={i < index || done ? 'yes' : 'no'}
            aria-current={i === index ? 'step' : undefined}
            onClick={() => onJump(i)}
            className="flex items-center gap-1.5 rounded-lg border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition"
            style={{
              borderColor: i === index ? `${LAB.x2}99` : '#334155',
              background: i === index ? `${LAB.x2}14` : 'transparent',
              color: i === index ? LAB.x2 : i < index || done ? LAB.pass : LAB.muted,
            }}
          >
            <span>{i + 1}</span>
            <span>{stage.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ══ 代数覆盖层 ════════════════════════════════════════════════════ */

function AlgebraOverlay({ a, b }: { a: number; b: number }) {
  const [step, setStep] = useState(0);
  const collapsing = step === 2;
  const gone = step >= 3;

  return (
    <div className="space-y-4">
      <Panel name="algebra" label="Show the algebra" extra={{ 'data-step': String(step) }}>
        <p className="text-base text-slate-100"><Tex src="(a - b)(a + b)" /></p>

        {/* ⚠️ 注释放在 `{cond && (…)}` 外面:那对括号里只能有一个 JSX 元素。 */}
        {step >= 1 && (
          <p data-readout="expansion-row" className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base">
            {EXPANSION.map((term, i) => (
              <span
                key={`${term.tex}-${i}`}
                data-slot={String(i)}
                className="inline-block transition-all duration-500 ease-out"
                style={{
                  // ⭐ +ab 与 −ab **向对方靠拢**然后消失 —— 抵消是一个动作,不是一个标记
                  transform: collapsing && term.cancels ? `translateX(${term.sign > 0 ? 28 : -28}px)` : 'none',
                  opacity: gone && term.cancels ? 0 : 1,
                  width: gone && term.cancels ? 0 : undefined,
                  overflow: gone && term.cancels ? 'hidden' : undefined,
                }}
              >
                {/* ⚠️ 划掉的标记从第二步起就**留着**,消失的是宽度。
                    第一版写成 `collapsing && …`,于是塌掉之后标记反而没了 ——
                    检查读到 no,no,no,no,而画面上那两项已经不见了。 */}
                <TermChip index={i} tex={term.tex} sign={term.sign} cancelled={step >= 2 && term.cancels} />
              </span>
            ))}
          </p>
        )}

        {step >= 2 && (
          <p data-readout="cancel-note" className="mt-2 text-xs leading-relaxed" style={{ color: LAB.x2 }}>
            {CANCEL_WORDS} <Tex src="ab - ab = 0" />
          </p>
        )}

        {gone && (
          <p data-readout="survivors" className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-lg">
            {survivingTerms().map((term, i) => (
              <TermChip key={term.tex} index={i} tex={term.tex} sign={term.sign} cancelled={false} />
            ))}
          </p>
        )}

        {step < 3 && (
          <RevealButton
            onClick={() => setStep((n) => n + 1)}
            label={['Multiply out →', 'Which two match? →', 'Collapse them →'][step] ?? 'Next →'}
          />
        )}
      </Panel>

      {gone && (
        <Panel name="algebra-link" label="The same two pieces" tone="good">
          <p className="text-xs leading-relaxed text-slate-300">
            The <Tex src="+ab" /> and <Tex src="-ab" /> that cancelled are the piece you picked up and the hole
            it left behind. On the page they collapse into each other; on the board they swapped places.
          </p>
          <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
            <span className="text-slate-500">a² − b²</span>
            <span data-readout="algebra-left" className="text-right" style={{ color: LAB.x1 }}>{remainingArea(a, b)}</span>
            <span className="text-slate-500">(a−b)(a+b)</span>
            <span data-readout="algebra-right" className="text-right" style={{ color: LAB.pass }}>{areaByFactors(a, b)}</span>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ══ 认形状 ════════════════════════════════════════════════════════ */

function PatternPanel() {
  const [id, setId] = useState(PATTERNS[0]!.id);
  const [step, setStep] = useState(0);
  const pattern = patternOf(id);

  return (
    <Panel name="patterns" label="Spot the pattern" extra={{ 'data-current': id, 'data-step': String(step) }}>
      <div className="flex flex-wrap gap-2">
        {PATTERNS.map((p) => (
          <button
            key={p.id}
            type="button"
            data-pattern={p.id}
            data-active={p.id === id ? 'yes' : 'no'}
            onClick={() => { setId(p.id); setStep(0); }}
            className={
              'rounded-lg border px-2.5 py-1.5 text-sm transition ' +
              (p.id === id ? 'border-amber-400/60 bg-amber-400/10 text-amber-100' : 'border-slate-700 text-slate-300 hover:border-slate-500')
            }
          >
            <Tex src={p.tex} />
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <p className="text-lg text-slate-100"><Tex src={pattern.tex} /></p>
        {step >= 1 && (
          <div data-readout="why" className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs leading-relaxed">
            <p style={{ color: LAB.x1 }}>{pattern.aWhy}</p>
            <p style={{ color: LAB.x2 }}>{pattern.bWhy}</p>
          </div>
        )}
        {step >= 2 && (
          <p className="text-base text-slate-100">
            <Tex src={pattern.asSquaresTex} /> <span className="text-slate-600">— now it is square minus square</span>
          </p>
        )}
        {step >= 3 && (
          <p data-readout="factored" className="text-lg" style={{ color: LAB.pass }}>
            <Tex src={pattern.factoredTex} />
          </p>
        )}
      </div>
      {step < 3 && (
        <RevealButton
          onClick={() => setStep((n) => n + 1)}
          label={['Which squares? →', 'Rewrite it →', 'Factor it →'][step] ?? 'Next →'}
        />
      )}
    </Panel>
  );
}

/* ══ 页面 ══════════════════════════════════════════════════════════ */

export function CutTheSquareLab() {
  const [rawA, setRawA] = useState(7);
  const [rawB, setRawB] = useState(3);
  const [mode, setMode] = useState<Mode>('geometry');
  const { a, b } = useMemo(() => clampPair(rawA, rawB), [rawA, rawB]);
  const director = useDirector(a, b);

  const index = currentIndex(director.global);
  const stage = stageAt(index);
  const areaTex = areaTexAt(director.global);
  const identityTex = identityTexAt(director.global);
  const finished = identityTex !== '';

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <LessonHead
        title="Difference of Squares"
        headline={HEADLINE}
        lede="Watch the formula appear as a shape, one operation at a time."
      />

      <section className="mt-8 overflow-hidden rounded-[1.5rem] border border-slate-700 bg-slate-950/70 shadow-2xl shadow-black/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <IntSlider name="a" label="a" value={a} min={RANGE.min + 1} max={RANGE.max} onChange={setRawA} colour={LAB.x1} />
            <IntSlider name="b" label="b" value={b} min={RANGE.min} max={Math.max(RANGE.min, a - 1)} onChange={setRawB} colour={LAB.x2} />
            <span className="font-mono text-[11px] text-slate-600">a &gt; b &gt; 0</span>
          </div>
          <Toggle name="mode" options={MODES} value={mode} onChange={setMode} />
        </div>

        {mode === 'geometry' ? (
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.2fr_1fr]">
            <div className="min-w-0">
              <Controls
                global={director.global}
                playing={director.playing}
                animated={director.animated}
                onPlay={director.play}
                onPause={director.pause}
                onRestart={director.restart}
                onStep={director.step}
                onJump={director.jump}
              />

              <div className="mt-3">
                <Board a={a} b={b} global={director.global} />
              </div>

              {/* ⭐ 每一幕正在做的**运算**写在画面下面 —— 动作不是装饰 */}
              <div data-panel="caption" data-operation={stage.operation} className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: LAB.x2 }}>
                  {OPERATION_WORDS[stage.operation]}
                </span>
                <span className="text-xs leading-relaxed text-slate-400">{stage.caption}</span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                Each cell is one square unit. Count them if you like — the total never changes.
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-4">
              <Panel
                name="running"
                label="What the picture says right now"
                extra={{ 'data-area-tex': areaTex, 'data-identity': identityTex }}
              >
                <div className="min-h-[3.5rem]">
                  {areaTex === '' ? (
                    <p className="text-xs leading-relaxed text-slate-500">Nothing yet — the square is still being drawn.</p>
                  ) : (
                    <p data-readout="area-tex" className="text-2xl text-slate-100"><Tex src={areaTex} /></p>
                  )}
                </div>
                <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-xs">
                  <span className="text-slate-500">a²</span>
                  <span data-readout="big" className="text-right" style={{ color: LAB.x1 }}>{bigArea(a)}</span>
                  <span className="text-slate-500">b²</span>
                  <span data-readout="small" className="text-right" style={{ color: LAB.x2 }}>{smallArea(b)}</span>
                  <span className="text-slate-500">remaining</span>
                  <span data-readout="remaining" className="text-right" style={{ color: LAB.pass }}>{remainingArea(a, b)}</span>
                  <span className="text-slate-500">two pieces</span>
                  <span data-readout="pieces-sum" className="text-right" style={{ color: LAB.pass }}>{areaByPieces(a, b)}</span>
                </div>
              </Panel>

              {/* ⚠️ 等号只在证明走完之后出现 */}
              {finished ? (
                <Panel name="result" label="Nothing was added or lost" tone="good" extra={{ 'data-product': String(areaByFactors(a, b)) }}>
                  <p className="text-lg text-slate-100"><Tex src={identityTex} display /></p>
                  <div className="mt-2 space-y-2">
                    <EqualityRow name="numbers" leftTex={squaresTex(a, b)} rightTex={String(remainingArea(a, b))} agree note={numbersPlain(a, b)} />
                    <EqualityRow name="product" leftTex={factorsTex(a, b)} rightTex={String(areaByFactors(a, b))} agree note={productPlain(a, b)} />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">{MAIN_IDEA}</p>
                  <ActionButton name="show-algebra" onClick={() => setMode('algebra')}>Show the algebra →</ActionButton>
                </Panel>
              ) : (
                <Panel name="waiting" label="Not yet">
                  <p className="text-xs leading-relaxed text-slate-500">
                    The equals sign is the conclusion, so it waits until the pieces have actually been moved.
                    {index >= 3 ? ' One stage to go.' : ` ${STAGE_COUNT - index - 1} stages to go.`}
                  </p>
                </Panel>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
            <AlgebraOverlay a={a} b={b} />
            <Panel name="back-to-geometry" label="The finished rearrangement">
              <Board a={a} b={b} global={STAGE_COUNT} />
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Neither picture is the "real" explanation — they are the same fact seen twice.
              </p>
              <QuietButton name="back-geometry" onClick={() => setMode('geometry')}>← Back to the proof</QuietButton>
            </Panel>
          </div>
        )}
      </section>

      <div className="mt-4">
        <PatternPanel />
      </div>
    </main>
  );
}
