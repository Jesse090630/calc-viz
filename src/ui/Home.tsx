/**
 * UI — 首页
 *
 * 四张卡,每张顶上是一小段**循环播放的动画预览**,直接演该节课的核心动作。
 * 静态缩略图说不清"这是可以动手的",动起来一秒就说清了。
 *
 * ⚠️ 首页的体积纪律(W6 立的,别破坏):
 * ① **不 import 任何实验台组件。** 预览是几十行独立 SVG,不是把课搬过来。
 * ② **不碰 Three.js。** 这一页一个 canvas 都不该有。
 * 判断有没有破坏,不要靠读代码 —— 跑构建、在真浏览器里量首屏下载量。
 *
 * 推导链目录仍然封存在 `ConceptGrid.tsx`(八条链的路由都还在,只是首页不列)。
 */
import { PREVIEWS } from './previews/LessonPreviews';
import { usePreviewClock } from './previews/clock';

interface LessonCard {
  readonly id: string;
  readonly title: string;
  readonly question: string;
  readonly tag: string;
}

const LESSONS: readonly LessonCard[] = [
  {
    id: 'increasing',
    title: 'Every Pair Must Work',
    question: 'What does “increasing” actually mean?',
    tag: 'Definitions',
  },
  {
    id: 'symmetry',
    title: 'The Symmetry Test',
    question: 'Odd, even, or neither — without memorising shapes.',
    tag: 'Symmetry',
  },
  {
    id: 'periodic',
    title: 'Does It Repeat?',
    question: 'Slide the graph onto itself and find T.',
    tag: 'Periodicity',
  },
  {
    id: 'secant',
    title: 'Connect Two Points',
    question: 'Average rate of change, built from rise and run.',
    tag: 'Rates',
  },
];

export function Home() {
  const { phase, animated } = usePreviewClock();

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-20 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
          Precalculus · Interactive
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Where do these formulas come from?
        </h1>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-400">
          Four definitions everyone thinks they already understand. Drag something in each one and
          watch the definition assemble itself.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {LESSONS.map((lesson) => {
          const Preview = PREVIEWS[lesson.id]!;
          return (
            <a
              key={lesson.id}
              data-lesson-card={lesson.id}
              href={`#/${lesson.id}`}
              className="group overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50 transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900 hover:shadow-xl hover:shadow-black/25"
            >
              <div className="relative h-[7.25rem] border-b border-slate-700 bg-slate-950/70">
                <Preview phase={phase} />
                <span className="absolute left-3 top-2.5 rounded-full border border-slate-700 bg-slate-950/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 backdrop-blur">
                  {lesson.tag}
                </span>
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="text-lg font-semibold text-slate-100 group-hover:text-amber-300">
                  {lesson.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{lesson.question}</p>
              </div>
            </a>
          );
        })}
      </div>

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-6">
        <p className="text-xs leading-relaxed text-slate-500">
          Every number on screen is computed at runtime from unit-tested pure functions, each
          checked against a second independent derivation. Nothing is hard-coded.
        </p>
        {/* 静止时明说一句,免得有人以为预览坏了 */}
        {!animated && (
          <p className="text-[11px] text-slate-600">Previews paused — reduced motion is on.</p>
        )}
      </footer>
    </main>
  );
}

/** 课程页面顶部的返回链接 */
export function BackLink() {
  return (
    <a
      href="#/"
      className="absolute left-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 backdrop-blur hover:text-white"
    >
      ← all topics
    </a>
  );
}
