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
  // 整张公式表(通读 / 打印用)。工具条上的 ∫ deck 是用来**搜**的,两者分工不同,
  // 但喂的是同一份 `math/formulaCatalog.ts`,所以不可能一处对一处错。
  formulas: lazy(() => import('./ui/formulaSheetPage')),
  limits: lazy(() => import('./concepts/limits/page')),
  derivative: lazy(() => import('./concepts/derivative/page')),
  'riemann-sum': lazy(() => import('./concepts/riemann-sum/page')),
  'log-integral': lazy(() => import('./concepts/log-integral/page')),
  'shell-method': lazy(() => import('./concepts/shell-method/page')),
  'disk-method': lazy(() => import('./concepts/disk-method/page')),
  'unit-circle': lazy(() => import('./concepts/unit-circle/page')),
  'trig-rates': lazy(() => import('./concepts/trig-rates/page')),
  // 实验台,不是推导链:没有上一步/下一步,不经过 `src/engine/`。
  'chain-rule': lazy(() => import('./labs/chainRule/page')),
  'u-substitution': lazy(() => import('./labs/substitution/page')),
  'ftc': lazy(() => import('./labs/ftc/page')),
  'by-parts': lazy(() => import('./labs/byParts/page')),
  'implicit': lazy(() => import('./labs/implicit/page')),
  'related-rates': lazy(() => import('./labs/relatedRates/page')),
  optimization: lazy(() => import('./labs/optimization/page')),
  'bisect-line': lazy(() => import('./labs/bisectByLine/page')),
  increasing: lazy(() => import('./labs/increasing/page')),
  intervals: lazy(() => import('./labs/scanning/page')),
  'one-sided': lazy(() => import('./labs/oneSided/page')),
  'limit-vs-value': lazy(() => import('./labs/limitPoint/page')),
  'epsilon-delta': lazy(() => import('./labs/epsilonDelta/page')),
  'infinite-limits': lazy(() => import('./labs/infinite/page')),
  squeeze: lazy(() => import('./labs/squeeze/page')),
  'sin-over-x': lazy(() => import('./labs/specialLimit/page')),
  'secant-to-tangent': lazy(() => import('./labs/letHShrink/page')),
  // 特殊极限一节。0/0 打头,六条极限,最后是变形练习 + 参考卡。
  indeterminate: lazy(() => import('./labs/indeterminate/page')),
  // ⚠️ 这五条共用**同一个** `RatioLab`,只差一个 form id ——
  //    和非递减/非递增那两课是同一条路子。版式漂就五条一起漂,修一次全修。
  'tan-over-x': lazy(() => import('./labs/specialLimits/tanPage')),
  'cos-over-x': lazy(() => import('./labs/specialLimits/cosPage')),
  'cos-over-x2': lazy(() => import('./labs/specialLimits/cos2Page')),
  'exp-over-x': lazy(() => import('./labs/specialLimits/expPage')),
  'log-over-x': lazy(() => import('./labs/specialLimits/logPage')),
  'special-limits': lazy(() => import('./labs/explorer/page')),
  // 代数一节:剪拼 / 切块 / 数方案 / 移位相减。四课共用 `labs/algebra/shared.tsx`。
  'difference-of-squares': lazy(() => import('./labs/algebra/squaresPage')),
  'difference-of-cubes': lazy(() => import('./labs/algebra/cubesPage')),
  'binomial-theorem': lazy(() => import('./labs/algebra/binomialPage')),
  'geometric-series': lazy(() => import('./labs/algebra/seriesPage')),
  // 非递减与非递增共用同一个实验台组件,只差一个 direction。
  nondecreasing: lazy(() => import('./labs/weakMonotone/nondecreasingPage')),
  nonincreasing: lazy(() => import('./labs/weakMonotone/nonincreasingPage')),
  symmetry: lazy(() => import('./labs/symmetry/page')),
  periodic: lazy(() => import('./labs/periodic/page')),
  secant: lazy(() => import('./labs/secant/page')),
  // 上下取整共用同一个实验台组件,只差默认方向。
  floor: lazy(() => import('./labs/rounding/floorPage')),
  ceiling: lazy(() => import('./labs/rounding/ceilingPage')),
  functions: lazy(() => import('./labs/functionRule/page')),
  domain: lazy(() => import('./labs/domain/page')),
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

/** 认不出的路由。⚠️ 必须把 route 原样显示出来 —— 打错字时那正是唯一的线索。 */
function NotFound({ route }: { route: string }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-slate-500">No such page</p>
      <p className="max-w-md text-sm text-slate-400">
        Nothing is routed to <code data-missing-route className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">#/{route}</code>.
      </p>
      <a href="#/" className="rounded-lg border border-slate-600 px-4 py-2 font-mono text-xs text-slate-200 transition hover:border-slate-400">
        ← all topics
      </a>
    </main>
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
  } else if (route === '' || route === 'notation') {
    // 首页目前是空白板。目录封存在 `ui/ConceptGrid.tsx`,链路由本身没动。
    page = <Home />;
  } else {
    /**
     * ⚠️ 认不出的路由以前**静默渲染首页**,地址栏还留着那个错的 hash。
     * 于是「链接打错一个字」和「网站正常」在屏幕上长得一模一样 ——
     * 分享出去的坏链接、改名之后的旧链接,都会安静地变成首页,没人会发现。
     * 现在把话说出来,并把那个认不出的名字原样显示回去。
     */
    page = <NotFound route={route} />;
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
