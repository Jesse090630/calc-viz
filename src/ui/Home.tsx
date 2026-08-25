/**
 * UI — 首页
 *
 * 一页目录,别的什么都没有:没有大标题、没有导语、没有页脚说明。
 * Jesse 要的是「干净、清楚、整齐」—— 那些话读第二次就是噪音,
 * 而卡片本身(动画 + 概念名)已经把这站是干什么的说完了。
 *
 * ⚠️ 卡片标题一律用**概念本身的名字**(Increasing Functions / Domain of a Function),
 * 不用「Every Pair Must Work」这类金句。金句适合当课内的钩子,
 * 但目录是拿来**找东西**的:找的人心里想的是"定义域",不是那句话。
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
  /** 概念的名字。这是标题。 */
  readonly title: string;
  /** 一行说明,尽量控制在七八个词以内 —— 三列排布下超过两行卡片就参差了。 */
  readonly question: string;
}

const LESSONS: readonly LessonCard[] = [
  {
    id: 'functions',
    title: 'Definition of a Function',
    question: 'One input may not have two outputs.',
  },
  {
    id: 'domain',
    title: 'Domain of a Function',
    question: 'Which inputs the rule is allowed to take.',
  },
  {
    id: 'increasing',
    title: 'Increasing Functions',
    question: 'What “increasing” actually requires.',
  },
  {
    id: 'one-sided',
    title: 'One-Sided Limits',
    question: 'Two sides. One destination — or two.',
  },
  {
    id: 'intervals',
    title: 'Increasing and Decreasing Intervals',
    question: 'Scan the curve and read it left to right.',
  },
  {
    id: 'nondecreasing',
    title: 'Nondecreasing Functions',
    question: 'Up or flat. Never down.',
  },
  {
    id: 'nonincreasing',
    title: 'Nonincreasing Functions',
    question: 'Down or flat. Never up.',
  },
  {
    id: 'symmetry',
    title: 'Even and Odd Functions',
    question: 'Odd, even, or neither — by test, not by shape.',
  },
  {
    id: 'periodic',
    title: 'Periodic Functions',
    question: 'Slide a graph onto itself and find T.',
  },
  {
    id: 'secant',
    title: 'Average Rate of Change',
    question: 'The slope of the line through two points.',
  },
  {
    id: 'floor',
    title: 'The Floor Function',
    question: 'Why −1.3 drops to −2, not −1.',
  },
  {
    id: 'ceiling',
    title: 'The Ceiling Function',
    question: 'Why 4.2 jumps up to 5.',
  },
];

export function Home() {
  const { phase, animated } = usePreviewClock();

  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {LESSONS.map((lesson) => {
          const Preview = PREVIEWS[lesson.id]!;
          return (
            <a
              key={lesson.id}
              data-lesson-card={lesson.id}
              href={`#/${lesson.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/50 transition hover:-translate-y-0.5 hover:border-amber-500/60 hover:bg-slate-900 hover:shadow-xl hover:shadow-black/25"
            >
              {/*
                ⚠️ 用**宽高比**而不是写死的高度。
                预览 SVG 是 400×116 且 `meet`,盒子比例一旦对不上就上下留黑边,
                看着像图没加载完 —— 列数一变(手机一列 / 平板两列 / 桌面三列)就会发生。
              */}
              <div className="aspect-[400/116] border-b border-slate-700 bg-slate-950/70">
                <Preview phase={phase} />
              </div>
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <h2 className="text-lg font-semibold leading-snug text-slate-100 group-hover:text-amber-300">
                  {lesson.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{lesson.question}</p>
              </div>
            </a>
          );
        })}
      </div>

      {/* 静止时明说一句,免得有人以为预览坏了。会动的时候这里什么都不该有。 */}
      {!animated && (
        <p className="mt-8 text-[11px] text-slate-600">Previews paused — reduced motion is on.</p>
      )}
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
