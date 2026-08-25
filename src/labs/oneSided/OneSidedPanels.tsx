/**
 * LAB — 「Two Sides. One Destination.」的面板。
 *
 *   ① SidePanel  —— 单侧读数:Come from the left. / x → 2⁻ / f(x) → 4 / 等式
 *   ② Verdict    —— 两侧一致就合成双侧极限;不一致就 DNE
 *   ③ MentalModel—— 左目的地 = 右目的地 → 存在;≠ → 不存在
 *
 * ⚠️ 判定状态挂 `data-*`(`data-agree` / `data-side`),不靠读文案。
 * ⚠️ 不一致时**不许出现任何一个"极限等于某数"的写法** —— 那是屏幕上的假话。
 */
import { Tex } from '../shared/Tex';
import { LAB } from '../shared/theme';
import {
  SIDE_COPY,
  approachTex,
  oneSidedLimit,
  oneSidedTex,
  showLimit,
  showX,
  showY,
  sideGap,
  sidesAgree,
  twoSidedLimit,
  twoSidedTex,
  type Approach,
  type LimitFunction,
  type Side,
} from '../../math/oneSidedLimits';

const SIDE_COLOR: Readonly<Record<Side, string>> = { left: LAB.x1, right: LAB.x2 };

/* ── ① 单侧 ───────────────────────────────────────────────────────── */

export function SidePanel({
  fn,
  side,
  approach,
  dimmed,
}: {
  fn: LimitFunction;
  side: Side;
  approach: Approach;
  dimmed: boolean;
}) {
  const color = SIDE_COLOR[side];
  const limit = oneSidedLimit(fn, side);
  const copy = SIDE_COPY[side];
  return (
    <section
      data-panel="side"
      data-side={side}
      className="rounded-2xl border p-4 transition"
      style={{ borderColor: `${color}55`, background: `${color}0d`, opacity: dimmed ? 0.45 : 1 }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
        {copy.word}
      </p>
      <p className="mt-2 font-mono text-sm text-slate-300">{copy.move}</p>

      {/* 活的读数 —— 拖动时这两行必须一直在变 */}
      <div className="mt-3 space-y-1.5 font-mono text-sm">
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-slate-400">x</span>
          <span data-readout="x" style={{ color }}>{showX(approach.x)}</span>
        </p>
        <p className="flex items-baseline justify-between gap-3">
          <span className="text-slate-400">f(x)</span>
          <span data-readout="y" style={{ color }}>{showY(approach.y)}</span>
        </p>
      </div>

      <div className="mt-3 border-t border-slate-800 pt-3 text-slate-200">
        <p className="text-sm">
          <Tex src={approachTex(fn, side)} />
        </p>
        <p className="mt-1 text-sm" style={{ color }}>
          <Tex src={`f(x) \\to ${showLimit(limit)}`} />
        </p>
      </div>

      <p className="mt-3 text-base text-slate-100">
        <Tex src={oneSidedTex(fn, side)} />
      </p>
    </section>
  );
}

/* ── ② 合成 ───────────────────────────────────────────────────────── */

export function Verdict({ fn }: { fn: LimitFunction }) {
  const agree = sidesAgree(fn);
  const limit = twoSidedLimit(fn);
  const color = agree ? LAB.pass : LAB.fail;

  return (
    <section
      data-panel="verdict"
      data-agree={agree ? 'yes' : 'no'}
      data-limit={limit === null ? 'dne' : String(limit)}
      /*
        ⚠️ 把结论**也挂成属性**。面板里的等式是 KaTeX 渲染的,
        `innerText` 读出来是什么形状不受我控制 —— 这个项目里已经因为读渲染后的
        文案误判过三次。要断言"这里没有写成等于某个数",就读这个属性。
      */
      data-limit-tex={twoSidedTex(fn)}
      className="rounded-2xl border p-4 transition"
      style={{ borderColor: `${color}59`, background: `${color}0f` }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Put them side by side</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-sm">
        <span style={{ color: LAB.x1 }}>{showLimit(oneSidedLimit(fn, 'left'))}</span>
        <span className="text-lg font-bold" style={{ color }}>{agree ? '=' : '≠'}</span>
        <span style={{ color: LAB.x2 }}>{showLimit(oneSidedLimit(fn, 'right'))}</span>
        {!agree && <span className="text-xs text-slate-500">apart by {showLimit(sideGap(fn))}</span>}
      </div>

      <p className="mt-3 text-sm" style={{ color }}>
        {agree ? 'Both sides agree.' : 'The two sides disagree.'}
      </p>

      {/*
        ⚠️ 不一致时这里**不出现等号后面跟数字**的写法。
        `twoSidedTex` 在 DNE 时给的是 "does not exist",而不是某个折中值。
      */}
      <div className="mt-3 rounded-xl border px-3 py-2.5" style={{ borderColor: `${color}66` }}>
        <p className="text-base text-slate-100">
          <Tex src={twoSidedTex(fn)} />
        </p>
        {limit === null && (
          <p className="mt-1.5 text-2xl font-bold leading-none" style={{ color: LAB.fail }}>
            DNE
          </p>
        )}
      </div>
    </section>
  );
}

/* ── ③ 心智模型 ───────────────────────────────────────────────────── */

export function MentalModel({ agree }: { agree: boolean }) {
  const rows = [
    { on: agree, sign: '=', head: 'Left destination = right destination', tail: 'LIMIT EXISTS', color: LAB.pass },
    { on: !agree, sign: '≠', head: 'Left destination ≠ right destination', tail: 'LIMIT DOES NOT EXIST', color: LAB.fail },
  ];
  return (
    <section data-panel="mental-model" data-agree={agree ? 'yes' : 'no'} className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">The whole rule</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.sign}
            data-rule={row.on ? 'active' : 'idle'}
            className={'rounded-xl border px-3 py-3 transition ' + (row.on ? '' : 'border-slate-800 bg-slate-900/40')}
            style={row.on ? { borderColor: `${row.color}66`, background: `${row.color}12` } : undefined}
          >
            <p className="font-mono text-xs" style={{ color: row.on ? row.color : '#64748b' }}>{row.head}</p>
            <p className="mt-1 text-center text-slate-600" aria-hidden="true">↓</p>
            <p
              className="mt-0.5 text-center text-[11px] font-bold uppercase tracking-[0.1em]"
              style={{ color: row.on ? row.color : '#475569' }}
            >
              {row.tail}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
