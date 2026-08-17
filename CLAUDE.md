# CLAUDE.md — Calculus Visual Engine

> ⚠️ **规则的唯一权威来源是 [`AGENTS.md`](./AGENTS.md)**(所有 AI 代理通用),
> 工作队列与分镜规格在 [`docs/HANDOFF.md`](./docs/HANDOFF.md)。
> 本文件保留 **项目进度日志(第 10 节)** 和 Claude 专用的补充说明。
> 规则若两处不一致,以 `AGENTS.md` 为准 —— 不要在两边各维护一份,那一定会走偏。

---

## 1. 项目是什么

一个 **Calculus 推导过程播放器**。不是计算器,不是画图工具。

每个概念 = 一条 **derivation chain(推导链)**,6–8 步。
用户按 → 键前进,每一步屏幕上的**几何动作**和**公式变化**同时发生,且严格一一对应。

产品要回答的是 **"这个公式是从哪来的"**,不是 **"这个公式是什么"**。

**目标用户**:正在学 AP Calculus AB/BC 的高中生。
**仓库**:https://github.com/Jesse090630/calc-viz (public,分支 `main`)
**线上**:https://jesse090630.github.io/calc-viz/ —— push 到 main 自动部署,
`npm run check` 是部署门禁(测试不过不上线)。
构建状态查询(免登录):`https://api.github.com/repos/Jesse090630/calc-viz/actions/runs?per_page=3`

### 差异点(做任何决策时回来看这一条)
GeoGebra / Desmos 3D / 各种 volume calculator 都只**显示结果**。
没有一个展示**公式的诞生过程**且**可交互**。
任何让产品更像"计算器"的功能请求,默认拒绝。

---

## 2. 明确不做清单(v1)

- ❌ 用户输入任意 f(x)(只用精选曲线;`CurveSpec` 接口已预留,v2 再接解析器)
- ❌ 用户账号 / 登录 / 进度保存 / 任何后端 / 任何数据库
- ❌ 习题、判分、题库
- ❌ 多语言切换(v1 全英文 UI)
- ❌ Manim 进入前端构建流程(Manim 只在 `/manim` 独立 Python 目录出离线 mp4)
- ❌ BC 全部内容(Series / Parametric / Polar 是 v1 之后)
- ❌ 深色/浅色主题切换(先固定一套配色)
- ❌ 任何动画库(framer-motion 等);过渡用 `useFrame` + lerp 自己写

---

## 3. 技术栈(已安装并验证通过,不允许自行改版本,要改先问)

| 包 | 版本 | 备注 |
|---|---|---|
| react / react-dom | ^19.2.0 | |
| vite | ^8.2.0 | 纯静态 SPA,不用 Next.js |
| @vitejs/plugin-react | ^6.0.0 | |
| typescript | ~5.9.0 | **刻意不用 7.x**,等生态稳定 |
| vitest | ^4.1.0 | |
| tailwindcss / @tailwindcss/vite | ^4.3.0 | v4 用 `@import "tailwindcss"` |
| katex | ^0.18.0 | 不用 MathJax |
| zustand | ^5.0.0 | 不用 Redux / Context |
| three | ^0.185.0 | |
| @react-three/fiber | ^9.7.0 | v9 配 React 19 |
| @react-three/drei | ^10.7.0 | v10 配 r3f v9 |

**架构变更(2026-08-16,原方案的 scene2d/scene3d 双层已废弃)**:
不做独立的 SVG 二维层。全站**一个 Three.js 场景**,所谓"二维视图"只是把相机切到
`front` 预设(FOV 18°,拉远到 15.5,接近正交投影)。理由:
① 2D→3D 不再有交接缝,用户始终看着同一个对象在同一个空间里;
② 少维护一套坐标系与一套图元;③ 原型已验证这种做法视觉上与真 2D 无异。
代价:文字与细线不如 SVG 锐利 —— 可接受,标注本来就走 HTML(drei `<Html>`)。

已验证:`npm install` 无 peer 冲突 · `tsc --noEmit` 干净 · `vitest run` 52 passed · `npm run build` 成功。

---

## 4. 三层架构与三个禁止

```
NARRATIVE LAYER (src/engine/)   推导链状态机;Stage 是【数据】不是代码
        │
        ├── SCENE LAYER (src/scene2d/, src/scene3d/)   只负责画
        └── MATH CORE  (src/math/)                     纯函数,零渲染依赖
```

**禁止 1**:`src/math/**` 禁止 import 任何渲染库(three / react / @react-three/* / zustand / katex)。
**禁止 2**:`src/concepts/**` 和组件里禁止出现裸数学算式。看到 `2 * Math.PI * x * f(x)` 就是违规,必须调 `src/math/`。
**禁止 3**:`src/engine/**` 禁止出现任何具体概念的名字(shell / washer / disk / riemann / secant / tangent)。

> 禁止 1 和禁止 3 由 `src/math/architecture.test.ts` **自动检查**,不是靠自觉。
> 加新概念时如果发现要改 engine,说明引擎抽象错了 —— 回来改引擎,**不要在概念里打补丁**。

---

## 5. 目录结构

```
src/
├── math/          ✅ 已完成 — 纯函数 + 测试
│   ├── types.ts       CurveSpec / Interval / RiemannRule / ShellSlice
│   ├── curves.ts      3 条精选曲线(含解析 df / F / xF)
│   ├── quadrature.ts  Simpson / 自适应 Simpson / 数值微分
│   ├── riemann.ts     sampleX / riemannSum / relativeError
│   ├── solids.ts      shellVolumeExact / shellRiemann / shellSlice / slabVolume / ringVolume
│   └── *.test.ts      52 个测试,含架构约束检查
├── engine/        ✅ 已完成 — 概念无关的推导链引擎
│   ├── types.ts       Stage / Chain / ControlSpec / FormulaLine / Autoplay / SceneProps
│   ├── store.ts       createChainStore(chain) 工厂 + paramsForStage
│   ├── validate.ts    validateChain() —— 校验链数据(TypeScript 查不出的那类错)
│   ├── useAutoplay.ts Stage.autoplay 的逐帧实现
│   ├── ChainPlayer.tsx  布局 + 导航 + 键盘;场景由 renderScene prop 注入
│   ├── FormulaPanel.tsx KaTeX + 单行高亮
│   └── ControlPanel.tsx 由 stage.controls 自动生成滑块
├── scene/         ✅ 已完成 — 概念无关的图形层
│   ├── Stage3D.tsx    Canvas + 光照 + OrbitControls
│   ├── CameraRig.tsx  相机预设与过渡(TRANSITION_MS = 1100)
│   ├── primitives.tsx Axes / FunctionCurve / RegionFill / SampleRectangle / MathLabel / CircleOutline
│   ├── theme.ts       配色语义
│   └── geometry/shellGeometry.ts  参数化壳的三角网格拼装
├── concepts/      ✅ shell-method 已完整落地
│   └── shell-method/  chain.ts(9 步数据) + ShellScene.tsx + ShellMesh.tsx
└── ui/            ⬜ 首页与导航(Phase 7,有多条链时才需要)

tests/e2e/shots.mjs  逐 stage 截图(自带静态服务器,`npm run shots` 一条命令)
docs/VERIFICATION/ 手算与交叉验证存档
```

---

## 6. 数学正确性铁律

1. **任何涉及数学的任务,交付时必须附手算测试用例**(含边界:n=1、Δx 极大、θ=0、f 有零点)。
2. 手算用例会被**独立复算**后才录入。不采信自报的期望值。
3. 黎曼和一律用**中点法**(`x_i = a + (i+0.5)·Δx`)。理由见下。
4. 数值比较用 `toBeCloseTo(expected, 6)` 以上精度,不许放松容差来让测试变绿。
5. 屏幕上显示的每一个数字,必须来自 `src/math/`,不允许在组件里现算。
6. 新增数学函数时,**必须同时提供第二条独立计算路径**用于交叉验证
   (解析解 ↔ 数值积分,或换一种方法算同一个量)。

### 已验证的基准数据(Shell Method pilot,勿改)

`f(x) = 4 − x²`,`[0, 2]`,绕 y 轴 → `V = 8π = 25.132741228718345`
交叉验证:Disk 法对 y 积分 `π∫₀⁴(4−y)dy = 8π` ✅ · 自适应 Simpson ✅

完整收敛表与几何验证见 `docs/VERIFICATION/shell.md`。误差每次 n 翻倍缩到 **1/4**(O(n⁻²))。

**为什么必须用中点**:取中点半径时
`2πr·h·Δx ≡ π(R²−r²)·h`,**恒等,不是近似**(x=1.2, Δx=0.3 → 两边都是 5.790583579,差 8.9e-16)。
这是 Shell 公式为什么"精确"的原因,也是产品里的关键教学点(Stage 5b)。用左/右端点会破坏它。

---

## 7. 动画与视觉规范

- **相机移动与物体运动绝不同时发生。** 先转相机(物体不动),再动物体(相机不动)。
- 禁用 `autoRotate`。相机移动必须服务于数学理解。
- 对象**不允许凭空出现或消失**。每次出现要有淡入或生长过程,narration 要解释它从哪来。
- 配色语义全站一致,颜色总数 ≤ 5:
  半径/x 方向 = 红 · 高度/函数值 = 蓝 · 厚度/Δx = 灰 · 当前主角 = 黄 · 结果 = 绿
- 公式一次只高亮一行。
- 每个 stage:≤ 1 句 narration + ≤ 4 行公式。
- 60fps 目标,30fps 底线。n 拖到 40 时不许掉到 30 以下。

---

## 8. 工作纪律

1. **一次一个任务**。不接"把 Phase X 做了"这种任务,要求拆。
2. 每个任务完成后立刻给出:(a) 手算测试用例(如涉及数学) (b) 我该在浏览器里点什么、期望看到什么。
3. 每个任务完成后 `git commit`,并更新本文件第 10 节进度日志。
4. 提交前必须 `npm run check` 全绿。
5. 同一个 bug 连续 3 次没修好,停下来说明你的假设,不要继续试。
6. 收尾/打磨阶段:**先只列问题清单,不要动手改**,等我圈定范围。
7. **不确定就停下来问,不要猜。** 停下来问是好行为。
8. 发现前置条件没做好(依赖没装、文件不存在),先验证事实再动工。

---

## 9. 常用命令

```bash
npm run dev      # 开发服务器 http://localhost:5173
npm run check    # tsc --noEmit && vitest run   ← 提交前必跑
npm test         # 只跑单测
npm run build    # 生产构建(Vercel 跑的就是这条)
```

---

## 10. 进度日志

- **2026-08-16 · Phase 0 完成**。Vite 8 + React 19 + TS 5.9 + Tailwind 4 + Vitest 4 骨架建立;
  依赖图在 Linux 沙箱实装验证无 peer 冲突;`npm run build` 通过。
- **2026-08-16 · Phase 1 完成**。`src/math/` 全部纯函数 + 52 个测试通过。
  做了变异测试:植入 4 个数学错误(中点改左端点、解析解漏 2、xF 系数写错、shellSlice 用左端点),
  全部被测试抓到 —— 确认测试有效而不只是"绿"。
- **2026-08-16 · Phase 2 完成**。引擎全部落地,93 个测试通过。
  - `renderScene` 作为 prop 注入 —— engine 不 import 任何场景代码,禁止 3 因此是结构性的而非纪律性的。
  - `Stage.autoplay.delayMs` 把"相机先动、物体后动"变成**声明式**约束,`validateChain` 会拒收 < 800ms 的。
  - Shell Method 的 9 步链数据已写完(Phase 5 的内容提前落地,同时用来验证类型设计够不够用 —— 够)。
  - 场景仍是 `PlaceholderScene`,目的是让分镜和讲解文字先被验收,不必等 3D 写完。
  - ⚠️ 教训:禁止 3 的正则最初写了词边界 `\b`,`shellCount` 这类驼峰违规全部漏网。
    是变异测试抓出来的,不是 code review。**新增架构规则时必须配一个故意违规的变异测试。**
- **2026-08-16 · Phase 3 + 4 + 5 完成**。Shell Method 全链跑通,106 个测试 + 9 张逐步截图,console 零错误。
  - 架构决定:废弃 scene2d/scene3d 双层,改为单一 Three.js 场景 + 相机预设(理由见 §3)。
  - `math/shellSurface.ts`:壳曲面的顶点函数是**纯数学**,不 import three,
    因此"弧长守恒""半径守恒""起点对齐"这些几何性质是**单测**验证的,不是靠看画面。
  - 搭了视觉验证回路:sandbox 里 headless Chromium + swiftshader,`npm run shots` 出 9 张图。
  - **靠截图抓到的三个 bug**(单测全绿时它们都在):
    ① `CameraRig` 没等 OrbitControls 就位就设 target,导致 front 视图一直看着 y=0,
       曲线顶端被切在画面外 —— 单测永远发现不了这种错。
    ② 取样矩形与区域同处 z=0 造成 z-fighting,矩形上有摩尔纹。
    ③ 摊平后的板长 2πx≈7.5,`three-quarter` 装不下会裁掉右端 → 新增 `wide` 预设。
  - 性能:stage 7 原本让 n 连续爬到 96,每帧重建近百个几何体直接卡死。
    改成**离散倍增档位 [4,8,16,32,64]** —— 顺带更符合教学意图(要讲的就是"n 翻倍误差缩 1/4",
    连续变化反而把倍增关系糊掉了)。引擎因此新增了 `Autoplay.steps`。
- **2026-08-16 · 已发布到 GitHub**。https://github.com/Jesse090630/calc-viz(public)。
  用 GitHub Desktop 完成(注意:它的 Local Path 输入框**不展开 `~`**,必须填绝对路径)。
- **2026-08-16 · Phase 7 第一条:Disk Method 完成**。135 个测试,首页 + hash 路由上线。
  - ⭐ **引擎通用性验收通过:`src/engine/` 零改动**(`git diff --stat HEAD -- src/engine/` 为空)。
    第二个概念只写了 chain 数据 + 场景装配 + math 里的 disk 函数。
  - **几何也零新增**:圆盘 = `rIn = 0` 的壳,横着摞而已。`shellSurfacePoint` 原样复用,
    `ShellMesh` 提升为 `scene/RevolutionMesh`(Shell / SolidStack),Washer 以后也用同一个。
  - 教学设计:刻意与 Shell **共用同一个立体**(同区域、同轴),只换切法。
    落点是"两种切法同一个 8π",以及一个几乎没教材讲的反差 ——
    **Shell 的黎曼和有 O(n⁻²) 误差,Disk 的任意 n 都精确**(被积函数 π(4−y) 是线性的,
    中点法对一次函数零误差)。而且圆盘堆出来是阶梯、形状肉眼可见地不对,体积却分毫不差。
  - ⚠️ 教训:我最初给 Disk 同时写了"二阶收敛"和"精确"两个断言,自相矛盾,测试报 NaN 抓了出来。
    **先写测试再想清楚数学,好过反过来。**
- **2026-08-16 · 部署尝试记录**(四条路全试过,结论:都差一次人工点击,别再重复踩)
  | 路径 | 卡在哪 |
  |---|---|
  | Vercel 关联 GitHub 仓库 | 报错 "You need to add a Login Connection to your GitHub account" —— 要浏览器 OAuth |
  | Vercel 直传源码(已成功创建部署) | 站点被 Deployment Protection 拦住,302 跳 SSO;MCP token 无项目写权限,`update_project_deployment_protection` 返回 404 |
  | Netlify MCP | 服务端持续无响应 |
  | GitHub Pages Actions | `actions/configure-pages@v5` 的 `enablement: true` 失败 —— 仓库 Actions 默认只有只读权限,给不了 `pages: write` |

  **一次性解法(推荐 GitHub Pages,因为它带 `npm run check` 门禁、push 即部署、且运行状态可通过公开 API 查)**:
  仓库 Settings → Actions → General → Workflow permissions → 选 "Read and write permissions" → Save。
  之后任意一次 push 即自动上线到 https://jesse090630.github.io/calc-viz/

  查 CI 状态的办法(不需要登录):`https://api.github.com/repos/Jesse090630/calc-viz/actions/runs?per_page=3`
- **2026-08-16 · Phase 7 第二条:Riemann Sum → 定积分完成**。153 个测试,新增 8 张逐步截图,console 零错误。
  - 严格沿“左和高估 / 右和低估 → 同屏夹逼 → 夹缝 = 4Δx → Δx → 0 → ∫”推进,
    `n=4` 显示 `6.250000 / 4.250000 / 5.333333`,`n=64` 夹缝显示 `0.125000`。
  - 新增通用 `scene/RiemannBars.tsx`;矩形位置与高度全部由 `math/riemann.ts` 产出,
    `leftRightGap` 的逐矩形求和路径与端点恒等式路径互证,精确面积另与 adaptive Simpson 互证。
  - ⭐ **引擎通用性再次验收通过:`src/engine/` 零改动**。
  - ⚠️ 教训:首次逐图检查发现矩形填充淡出后轮廓仍残留;透明度必须同时驱动填充与边线,
    不能只凭 `npm run shots` 的退出码判断画面对。
  - ⚠️ 第三条链暴露了跨路由 hook 数量竞态:`ChainPlayer` 直接调用 Scene 函数,Shell / Disk 的 hook 数量
    恰好相同所以一直没暴露;Riemann Scene 无 hook 后切链会报 React #300。无需改 engine,在 `App` 按
    `chain.id` 给播放器加 `key` 让每条链正确重挂载;开发与生产截图序列均验证 console 零错误。
  - 手机竖屏 390×844 实测可用;滑块获焦时方向键只改 n、不翻页,回退再前进参数重置为该步初值。
- **2026-08-16 · Riemann 验收与修正**(接手方复核,不采信自报)。
  - 用项目自己的模块独立复算钉死的数字:6.250000 / 4.250000 / 5.333333 / 夹缝 2.000000,全部吻合;
    并断言**所有 n 下右和 < 真值 < 左和**(这条链的骨架,之前没有测试覆盖)。
  - 补做了交付时漏掉的**变异测试**:左右调换、矩形高度改用中点、解析解加偏差、端点差反号、
    矩形位置改左边缘 —— 5 个全被抓到。
  - 修视觉:`upper Lₙ` / `lower Rₙ` 原本并排飘在图右侧空地上,读者得自己连线。
    改成锚在各自色带上;琥珀那个跟踪**最后一段楔形**(f 递减且凹 ⇒ 它永远最宽),
    并给 y 设下限避免 n 大时压到 x 轴。重复的浮动 gap chip 删掉(公式面板已有)。
  - 首页卡片按**依赖顺序**重排:Riemann 第一(Shell 第 6–7 步建立在它上面),不是按完成顺序。
- **2026-08-16 · Derivative 链完成**。188 个测试,`src/engine/` 依然零改动。
  - 例子 `f(x)=x²`、`a=1` 是为那个恒等式 `m(h) = 2 + h` 挑的:第 4 步把它摊开之后,
    用户能在拖滑块**之前预测**每个数字。极限从"越来越接近"变成"一个看得见的加法项在缩小"。
  - ⚠️ `h = 0` 是 0/0。`secantSlope` **抛错**而不返回 NaN;滑块侧用 `clampH` 推开。
    测试遍历滑块整个行程(含正好落在 0),断言渲染出的公式不含 NaN ——
    NaN 不会让任何东西崩,它只会变成屏幕上一个看不见的错,这是最危险的一类。
  - 新增通用图元:`PointMarker`(支持空心,极限链的"洞"要用)、`RiseRun`(Δx/Δy 直角边)。
- **2026-08-16 · Limits 链完成**。223 个测试,`src/engine/` 第四次零改动。五条链全部上线。
  - 落点是第 5 步:**极限不是函数值**。所以 `g(x)=(x²−1)/(x−1)` 在 x=1 处必须真的算不出来 ——
    `at()` 老实做除法拿到 0/0,返回 **null 而不是 NaN**。NaN 会一路传下去,
    把"这里没有值"悄悄变成一条穿过洞的直线。
  - ⚠️ **与 HANDOFF 4.3 的刻意偏离**:原分镜的跳跃反例 `x/|x|` 在原点附近(y=±1),
    现有 front 相机装不下,而加相机预设要改 `engine/types.ts` 的 `CameraPreset` = 改引擎。
    于是换成**跳跃点仍在 x=1、且左半段与 g 完全相同**的分段函数。
    结果反而更好:两条曲线唯一的差别只有右半段,变量控制干净,对比更锐利,取景框也不用换。
    **这正是"发现要改引擎就停下来重想"这条纪律的价值 —— 逼出来的方案比原方案好。**
  - ⚠️ 测试抓到两个真 bug(都不是容差问题):
    ① `oneSidedLimit` 返回 d=1e-6 处的样本值 `1.999999`,把它当"左极限"显示出去
       正是这条链要破除的混淆。改用**一阶 Richardson 外推**(本链两条曲线在断点附近是线性的,
       所以外推精确),现在显示 2.000000 / 3.500000。
    ② 发散检测判据写错了:检查的是"外推值离样本近不近",结果把 `1/(x−1)`
       判成"收敛到 −110000"。正确判据是**相邻两个样本在互相靠拢**。
  - 变异测试 5 项全抓到,含"偷偷把 g 换成化简后的 x+1"和"画曲线时不在洞处断开"。
- **待办**:单位圆链(最后一条)→ v2 任意函数输入。完整队列见 `docs/ROADMAP.md`。
