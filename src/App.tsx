/**
 * 路由与顶层工具条。
 *
 * ⚠️ W6 之后这个文件**不许静态 import 任何 chain、Scene 或 Three.js**。
 * 每条课都是一个 `lazy(() => import('./concepts/<id>/page'))`,
 * 于是首页只下自己需要的东西 —— 一个只想看看这站长什么样的人,
 * 不该被迫先下载完整 3D 引擎。
 *
 * 判断有没有破坏这一点,不要靠读代码,跑 `npm run build` 看首页 chunk 的体积。
 */
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Home, BackLink } from './ui/Home';
import { FEATURES } from './config';

/* ── 每条课一个 chunk。只有走到那个路由才会发起网络请求。 ───────────────── */
const LESSON_PAGES: Readonly<Record<string, React.LazyExoticComponent<() => React.ReactNode>>> = {
  limits: lazy(() => import('./concepts/limits/page')),
  derivative: lazy(() => import('./concepts/derivative/page')),
  'riemann-sum': lazy(() => import('./concepts/riemann-sum/page')),
  'log-integral': lazy(() => import('./concepts/log-integral/page')),
  'shell-method': lazy(() => import('./concepts/shell-method/page')),
  'disk-method': lazy(() => import('./concepts/disk-method/page')),
  'unit-circle': lazy(() => import('./concepts/unit-circle/page')),
  'trig-rates': lazy(() => import('./concepts/trig-rates/page')),
  // 实验台,不是推导链:没有上一步/下一步,不经过 `src/engine/`。
  increasing: lazy(() => import('./labs/increasing/page')),
  symmetry: lazy(() => import('./labs/symmetry/page')),
  periodic: lazy(() => import('./labs/periodic/page')),
  secant: lazy(() => import('./labs/secant/page')),
  // 上下取整共用同一个实验台组件,只差默认方向。
  floor: lazy(() => import('./labs/rounding/floorPage')),
  ceiling: lazy(() => import('./labs/rounding/ceilingPage')),
};

/* ── 两块参考板:点开工具才加载,它们各自带着 KaTeX 与上百条数据 ────────── */
const FormulaDeck = lazy(() =>
  import('./ui/FormulaDeck').then(({ FormulaDeck: C }) => ({ default: C })),
);
const NotationBoard = lazy(() =>
  import('./ui/NotationBoard').then(({ NotationBoard: C }) => ({ default: C })),
);

/* ── 自定义函数输入(W1 已下线,flag 打开才加载) ────────────────────────── */
const CustomRiemannExperience = lazy(() =>
  import('./concepts/riemann-sum/RiemannExperience').then(({ RiemannExperience: C }) => ({
    default: C,
  })),
);
const CustomSolidExperience = lazy(() =>
  import('./concepts/solid-input/SolidExperience').then(({ SolidExperience: C }) => ({
    default: C,
  })),
);

/** 课页加载时的占位。整块暗底,避免布局跳动。 */
function LessonFallback() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading derivation"
      className="flex h-dvh w-dvw items-center justify-center bg-slate-950 text-xs uppercase tracking-[0.2em] text-slate-500"
    >
      loading derivation…
    </div>
  );
}

/** 极简 hash 路由。没有依赖,静态托管刷新也不会 404。 */
function useHashRoute(): string {
  const read = (): string => window.location.hash.replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

/** 自定义输入接管了 riemann / shell / disk 三条路由(仅在 flag 打开时) */
const CUSTOM_ROUTES = new Set(['riemann-sum', 'shell-method', 'disk-method']);

function CustomExperience({ route }: { route: string }) {
  return (
    <div className="relative">
      <BackLink />
      <Suspense fallback={<LessonFallback />}>
        {route === 'riemann-sum' ? (
          <CustomRiemannExperience />
        ) : (
          <CustomSolidExperience method={route === 'shell-method' ? 'shell' : 'disk'} />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  const route = useHashRoute();
  const notationTriggerRef = useRef<HTMLAnchorElement>(null);
  const deckTriggerRef = useRef<HTMLButtonElement>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const closeDeck = useCallback(() => setDeckOpen(false), []);
  const closeNotation = useCallback(() => {
    window.location.hash = '#/';
  }, []);

  const LessonPage = LESSON_PAGES[route];
  const notationOpen = route === 'notation';

  let page: React.ReactNode;
  if (FEATURES.customFunctionInput && CUSTOM_ROUTES.has(route)) {
    page = <CustomExperience route={route} />;
  } else if (LessonPage) {
    page = (
      <Suspense fallback={<LessonFallback />}>
        <LessonPage />
      </Suspense>
    );
  } else {
    // 首页目前是空白板。目录封存在 `ui/ConceptGrid.tsx`,链路由本身没动。
    page = <Home />;
  }

  return (
    <>
      {page}
      <div data-learning-tools className="fixed right-4 top-4 z-30 flex items-center gap-2">
        <a
          ref={notationTriggerRef}
          href="#/notation"
          aria-label="Open calc type board"
          aria-current={notationOpen ? 'page' : undefined}
          aria-expanded={notationOpen}
          aria-controls="notation-board-dialog"
          className={
            'flex items-center gap-2 rounded-xl border bg-slate-950/90 px-3 py-2 text-xs font-semibold shadow-lg shadow-black/25 backdrop-blur transition hover:bg-slate-900 ' +
            (notationOpen
              ? 'border-cyan-300 bg-cyan-400/15 text-cyan-100'
              : 'border-cyan-400/40 text-cyan-100 hover:border-cyan-300')
          }
        >
          <span aria-hidden="true" className="text-base leading-none">∂</span>
          <span className="hidden sm:inline">Type board</span>
        </a>
        {/* 触发按钮是纯 HTML,留在主 chunk;弹窗本体才是 lazy 的。
            以前 FormulaDeck 把按钮和弹窗打包在一起并常驻渲染,
            KaTeX 因此在首页被无条件下载。 */}
        <button
          ref={deckTriggerRef}
          type="button"
          aria-label="Open formula deck"
          aria-expanded={deckOpen}
          aria-controls="formula-deck-dialog"
          onClick={() => setDeckOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-950/90 px-3 py-2 text-xs font-semibold text-amber-100 shadow-lg shadow-black/25 backdrop-blur transition hover:border-amber-300 hover:bg-slate-900"
        >
          <span aria-hidden="true" className="text-base leading-none">∫</span>
          <span className="hidden sm:inline">Formula deck</span>
          <span aria-hidden="true" className="text-slate-500">⚙</span>
        </button>
      </div>

      {/* 两块参考板都只在打开时才挂载 —— 否则 lazy 只是延后了发起时机,
          没有延后到"用户真的要"。一个从不点开的用户不该下载那上百条数据。 */}
      {deckOpen ? (
        <Suspense fallback={null}>
          <FormulaDeck open onClose={closeDeck} returnFocusRef={deckTriggerRef} />
        </Suspense>
      ) : null}
      {notationOpen ? (
        <Suspense fallback={null}>
          <NotationBoard open onClose={closeNotation} returnFocusRef={notationTriggerRef} />
        </Suspense>
      ) : null}
    </>
  );
}
