# ROADMAP — 工作队列(v4,2026-08-17)

> 这是**标准工单**。从上往下做,**一次一个 W**,做完停下来等 Jesse 确认再开下一个。
> 规则看 `AGENTS.md`(红线),已完成工作的教训看 `CLAUDE.md` 进度日志。
> 冲突时优先级:`AGENTS.md` > 本文件 > `docs/HANDOFF.md`(其分镜部分已被本文件取代)。

---

## 1. 当前状态

| 概念 | 路由 | 状态 |
|---|---|---|
| 左右极限 | `#/limits` | ✅ 7 步 |
| Secant → Tangent | `#/derivative` | ✅ 8 步 |
| Riemann Sums → 定积分 | `#/riemann-sum` | ✅ 8 步 |
| Shell Method | `#/shell-method` | ✅ 9 步 |
| Disk Method | `#/disk-method` | ✅ 8 步 |
| Unit Circle → sin/cos | `#/unit-circle` | ✅ 7 步 |
| Trig 导数 ↔ 积分 | `#/trig-rates` | ✅ 8 步 |
| Formula Deck | 全站 | ✅ 120 张卡 |

310 测试 · `src/engine/` 连续六个概念零改动 · https://calcviz.netlify.app

### 外部审计结论(2026-08-17)
> 「最大的弱点不是正确性 —— 是导航、无障碍、性能,以及**没能让访客足够快地看到这个站的价值**。」

判断是对的。所以队列是:**先减(W1)→ 再修(W2–W6)→ 再加(W7–W11)**。

---

## 2. 工作队列

### W1 — 把自定义函数输入下线(不是删掉)

Jesse 决定:自定义函数输入以后作为**独立项目**专门做,现在从主线下线。

**做法:feature flag,不许删代码。** T3–T5 是三个任务的工作量,而且测试是资产。

1. 新建 `src/config.ts`,导出 `export const FEATURES = { customFunctionInput: false } as const;`
2. 所有自定义输入的 UI 入口(输入框、预设下拉、"Try this")在 flag 为 false 时不渲染。
   链本身回落到各自的**内置精选曲线**,与 v1 行为完全一致。
3. **`src/math/expression.ts` 及其全部测试原样保留**,继续跑。它们是下次开工的地基。
4. `src/concepts/*/chain.ts` 里"动态链"的生成逻辑保留,只是不被调用。
5. `README.md` 里删掉自定义输入的描述;`docs/HANDOFF.md` 第 5 节标注"已下线,见 ROADMAP W1"。

**验收**:
- 三条链(riemann / shell / disk)进入后**看不到任何输入框**,画面与数字与内置曲线一致
- `npm run check` 测试数**不减少**(表达式测试仍在跑)
- 把 flag 手动改成 `true`,输入框应立刻回来且功能正常 —— 证明是下线不是删除

---

### W2 — 快速修复包

一次任务做完这五项,都很小且互不影响:

1. **Unit Circle 移动端末步圆被裁**。用**现有**相机预设重新构图,不许新增 `CameraPreset`。
   参考 limits 链先例:换构图比换引擎好。
2. **导航按钮沉到首屏以下**。长课里 prev/next 要 sticky 吸底。
3. **首页顺序错了**:Derivative 排在 Limits 前面,但导数依赖极限。
   正确顺序见第 4 节依赖图。
4. **`focus-visible` 不一致**。所有可聚焦元素统一一套高对比焦点环。
5. **Formula Deck 分类条横向滚动无提示**。加右侧渐隐或箭头。

**验收**:390×844 真机截图逐条对照;键盘 Tab 走一遍,每个交互元素都看得见焦点环。

---

### W3 — 首页:让人 3 秒内看懂这是什么

审计最重的一条 —— 首页是一列纯文字卡片,**看不到这站长什么样**。

1. 每张卡片配**静态缩略图**,直接用 `tests/e2e/screenshots/` 里现成的图,选最有代表性那一步。
   **不要自动播放的预览** —— 拖慢首屏且分散注意力。
2. 顶部一个 **hero**:可直接拖的迷你演示。建议用 **Riemann 第 5 步「夹逼」**,
   它最能一眼说明"这不是计算器"。复用现有 Scene 组件,固定在该步、只开一个滑块,
   **不要新写一套渲染**。
3. 卡片分 **tracks**(见第 4 节)。
4. 每条链**最后一步**加 "Recommended next →"。

---

### W4 — Calc Type Board(新)

**这是 Formula Deck 之外的另一块板子,两者不重叠:Deck 装公式,Board 装符号。**

诊断:学生的第一道坎常常不是"不理解",是**根本不会读**。
很多人以为 `dx` 是装饰品、以为 `lim` 底下的 `x→a` 意思是"把 a 代进去"、
不知道 `∫` 和 `Σ` 是同一个字母。这些没解决,后面全是空中楼阁。

- **入口**:全站顶部工具条,和 Formula Deck 并排
- **路由**:也给一个独立路由 `#/notation`,方便直接分享
- **数据**:`src/data/notation.ts`(纯数据,和 Formula Deck 同构)

#### 每张卡的字段(六个都必填,缺一不可)

| 字段 | 说明 |
|---|---|
| `symbol` | KaTeX 渲染的符号本身 |
| `name` | 正式名称 |
| `say` | **怎么念出来** ← 最容易被忽略、最有用的一栏 |
| `means` | 一句话含义 |
| `example` | 一个放在上下文里的例子 |
| `confusion` | **学生最常见的误解** ← 这一栏是这块板子的灵魂 |
| `whyLink?` | 指向讲它的那条链 |

#### 必须收录的条目(按类分,至少这些)

**运算符**
- `∫` — integral — 念 "integral" — **它是拉长的 S,代表 summa(和)**。
  confusion:不是某种特殊的除号或括号;它就是 `Σ` 长大之后的样子。whyLink → `riemann-sum`
- `Σ` — sigma — 念 "sum from … to …" — 希腊字母大写 S,同样代表 Sum。
  confusion:`Σ` 和 `∫` 是同一个想法的两个阶段,不是两套无关的记号。whyLink → `riemann-sum`
- `lim` — limit — 念 "the limit as x approaches a" —
  confusion:**`x→a` 不是"把 a 代进去"**。函数在 a 处可以根本没有值。whyLink → `limits`
- `d/dx` — Leibniz 导数记号 — 念 "dee by dee ex" —
  confusion:它不是分数相除,但**行为很像**分数(链式法则里会"约掉")。whyLink → `derivative`
- `f′` — Lagrange 记号 — 念 "eff prime" — confusion:`f′(x)` 是**一个新函数**,不是一个数
- `∂` — 偏导 — 念 "partial" — AB/BC 用不到,但学生会在别处撞见,先给个交代

**Δ 与无穷小(整块最关键)**
- `Δx` — 念 "delta ex" — 一段**真实的、量得出来的**宽度
- `dx` — 念 "dee ex" — `Δx` 取极限之后的东西。
  confusion:**它不是装饰,也不是"乘以 x"**。它说明你在对**哪个变量**积分,并带着宽度的单位。
  whyLink → `riemann-sum`
- `ε` / `δ` — epsilon / delta — 挑战与应答的两条带子。whyLink → `epsilon-delta`
- `→` — 念 "approaches" — confusion:不是"等于",是"要多近有多近"

**关系与逻辑**
- `≈` `≤` `∈` `⇒` `⟺` `∴` — 每个都给 say 和一句话含义
- `|x|` — 念 "absolute value of x" — confusion:不是"去掉负号",是"到 0 的距离"
- `∞` — confusion:**不是一个数**,不能代进去算

**函数与结构**
- `f⁻¹` — 念 "eff inverse" — confusion:**不是 1/f**
- `f⁽ⁿ⁾` — n 阶导 — confusion:不是 n 次方
- `[a,b]` vs `(a,b)` — 闭区间 / 开区间(也可能是坐标点,靠上下文区分)
- `∫ₐᵇ` 的上下限 / `Σ` 的上下标 — 怎么读、谁是起点
- 分段函数的大括号

**希腊字母表**:`θ π ε δ Δ Σ λ φ` — 每个给 say(学生念不出来就不敢用)

#### 实现要求
- 搜索:能按符号、名称、**读法**三者搜索。学生常常只会说"那个长得像拉长 S 的东西"
- 分类筛选,与 Formula Deck 同一套交互
- `whyLink` 点开直接跳到对应链
- ⚠️ **不许**做成"符号 → 公式"的查询工具。它是**读法与误解**手册,不是速查表

**验收**:随机抽 5 张卡,`say` 和 `confusion` 两栏都不能是空话
(例:`dx` 的 confusion 写"要注意 dx"就是不合格)。

---

### W5 — 无障碍补齐

审计列为 P1。这是**能不能用**的问题,不是好不好看。

1. **每一步给 WebGL 画面一句文字等价描述**。放进 `Stage` 数据:新增 `Stage.altText?: string`。
   ⚠️ 这**是** engine 改动,是本队列**唯一**预先批准的一次。
   理由:无障碍描述对所有概念通用,不是某概念专属,符合 engine 的抽象层级。
   加完立刻跑架构测试确认没引入概念词。
2. `prefers-reduced-motion`:命中时**跳过所有 autoplay 补间**,直接落终态。
   不是放慢,是跳过 —— 前庭敏感的用户要的是没有运动。
3. 当前步号与公式变化用 `aria-live="polite"` 播报。
4. Formula Deck 与 Type Board 弹窗:**焦点陷阱** + 背景 `inert` + 关闭后焦点回到打开它的按钮。
   保留 Esc 关闭与自动聚焦搜索框。

**验收**:VoiceOver 走一遍能听懂在讲什么;系统开"减弱动态效果"后没有任何补间。

---

### W6 — 性能:路由级懒加载

打包 2.14 MB(gzip 593 KB),只逛首页的人也把 Three.js 全下了。
**W1 下线自定义输入后 mathjs 也应该从首页 chunk 里消失。**

1. `React.lazy` + `Suspense` 按路由切分每条链的 Scene
2. Three.js 只在**进入某条链之后**加载;首页 hero 若需 3D,单独切极小 chunk
3. Formula Deck / Type Board 的数据,点开才加载

**验收**:首页 JS(gzip)< 150 KB;进入任一链后功能与现在一致,截图逐张比对无差异。

---

### W7 — 新链:为什么 ∫dx/x 偏偏是 ln

**本次最重要的一条。** 学生真正的困惑:
> 「所有幂都给 `x^(n+1)/(n+1)`,凭什么 `n = −1` 给一个完全不同种类的函数?」

诊断:幂法则在 `n = −1` 处**不是给出另一个答案,是分母为 0、公式坏掉了**。
教科书直接换一个公式,学生只能当特例背下来。

- **路由 id**:`log-integral` · **依赖**:`riemann-sum`(面积)、`limits`(0/0)
- **新增数学**:`src/math/logIntegral.ts`
  - `powerAntiderivativeAt(n, b)` = `(b^(n+1) − 1)/(n+1)`,**`n = −1` 返回 `null`**(不是 NaN)
  - `areaUnderReciprocal(t)` = `∫₁ᵗ dx/x`,用 `adaptiveSimpson`
- ⚠️ **主路径不许调 `Math.log`** —— 那等于把要推的结论当前提。
  `Math.log` 只能出现在**测试**里作为第二条独立验证路径。
- ⚠️ **定义域**:`1/x` 在 0 处有极点,全链只在 `x > 0`。采样沿用 `limits.ts` 的
  `PartialFunction` 约定(无定义返回 `null`)。

#### 分镜(8 步)

| # | 标题 | 屏幕上发生什么 | 可拖 |
|---|---|---|---|
| 1 | The power rule has a hole in it | 列出 n = 2, 1, 0, −2 的原函数都好用;轮到 −1 时公式里的 `n+1` 高亮成红 | — |
| 2 | Watch the formula break | 画 `∫₁²xⁿdx`,拖 n 逼近 −1 | `n` |
| 3 | It is 0/0, not nonsense | 点明是**可去间断**,和 limits 链第 1 步同一个故事 | — |
| 4 | So what is that number? | 切到 `y = 1/x`,阴影 `[1,2]` 的面积 = **同一个数** | — |
| 5 | ⭐ Stretch and squash | `[1,2]` 横拉 2 倍、纵压 1/2 倍,**正好盖住 `[2,4]`**。面积不变 | `b` |
| 6 | Area turns × into + | 由第 5 步得 `A(bc) = A(b) + A(c)` | `b`, `c` |
| 7 | Only logs do that | 把乘法变加法的函数只能是对数;底数由 `A = 1` 定出 | `t` |
| 8 | That is why it is ln | 回到第 1 步那张表,把 `n = −1` 那格填上 `ln\|x\|` | — |

**第 2 步钉死的数值**(独立脚本已验):

| n | ∫₁²xⁿdx |
|---|---|
| −0.5 | 0.828427 |
| −0.9 | 0.717735 |
| −0.99 | 0.695555 |
| −0.999 | 0.693387 |
| −0.9999 | 0.693171 |
| −1 | **无定义(0/0)** |
| 极限 | **0.693147** |

**面积表**:`A(2)=0.693147` · `A(4)=1.386294` · `A(8)=2.079442` · `A(16)=2.772589`
(逐项都是 A(2) 的整数倍 —— 第 6 步的证据)。`A(e)=1.000000`,`e = 2.718282`。

**第 5 步是整条链的支点**:`[2,4]` 那块**更宽更矮**,面积却和 `[1,2]` 一模一样(都是 0.693147)。
narration 写进代换证明:`x = bu` ⇒ `∫_b^{bc} dx/x = ∫₁^c b·du/(bu) = ∫₁^c du/u`。
`1/x` 是唯一在"横拉 b、纵压 1/b"下**回到自己**的幂函数 —— 这才是 ln 出现的真正原因。

---

### W8 — 新链:∫tan x dx 那个又长又怪的答案

> 「`−ln|cos x|`?我怎么可能猜到这个。」

诊断:学生以为要靠灵感。真相是**根本不用猜** —— 分子恰好是分母的导数,差个负号。

- **路由 id**:`tan-integral` · **依赖**:**必须在 W7 之后**
- **新增数学**:`src/math/tanIntegral.ts`,同样**主路径不许调 `Math.log`**
- ⚠️ **极点**:`tan` 在 `π/2` 发散,全链限制在 `[0, π/3]`,采样沿用 `PartialFunction` 约定

#### 分镜(7 步)

| # | 标题 | 内容 |
|---|---|---|
| 1 | An answer you would never guess | 直接摆出 `−ln\|cos x\|`,承认它看着莫名其妙 |
| 2 | Split it into what it really is | `tan x = sin x / cos x`,上下分别画出来 |
| 3 | ⭐ Look at the derivative of the bottom | `(cos x)′ = −sin x` —— 分子就是分母的导数。**全链支点** |
| 4 | You have seen this shape before | 抽象成 `∫u′/u`,回指 W7 |
| 5 | Put it together | `∫tan = −∫(cos)′/cos = −ln\|cos x\|` |
| 6 | Check it numerically | 阴影 `[0, π/3]` 下的面积,与 `−ln(cos π/3)` 对照 |
| 7 | ⭐ The same number as before | `∫₀^{π/3} tan = ln 2 = A(2)`,与 W7 第 4 步**同一个数**,给跳转链接 |

**钉死的数值**(解析与数值积分双路径,差 < 4e-12):
`∫₀^{π/4} tan = 0.346574` · `∫₀^{π/3} tan = 0.693147`

第 7 步那个呼应一定要用上:两条完全不同的链落在同一个数上,
学生会真切感到这些是**一个整体**,不是一堆孤立公式。

---

### W9 — 新链:ε–δ,极限定义到底在说什么

> 「那一堆符号看着像天书。」

诊断:ε–δ 被当成"严谨版的极限"来教,于是显得多余。
它其实是一场**挑战—应答游戏**,而且是唯一能说清"极限不存在"到底什么意思的东西。

- **路由 id**:`epsilon-delta` · **依赖**:`limits`
- **新增数学**:`src/math/epsilonDelta.ts`
  - `deltaForLinear(m, eps)` = `eps/|m|`
  - `bandCheck(fn, a, L, eps, delta)` → `{ ok, worstX, worstY }`,**真的采样检验**,
    不是套公式判定。失败时必须给出**具体反例点**(第 6 步要用)
- ⚠️ **无引擎改动**:两个联动滑块 + 通过/失败状态,现有 `controls` 与 `formula` 足够表达

#### 分镜(8 步)

| # | 标题 | 内容 | 可拖 |
|---|---|---|---|
| 1 | A game, not a definition | 规则:对手先画**水平带**(半高 ε),你回**竖直带**(半宽 δ) | — |
| 2 | The challenge | `f(x)=2x+1`, `a=1`, `L=3`;ε = 0.5,水平带 `(2.5, 3.5)` 亮起 | `ε` |
| 3 | Your response | 拖 δ;竖直带内曲线**整段落进水平带**时边框变绿 | `δ` |
| 4 | ⭐ Why δ = ε/2 | `\|2x+1−3\|<ε ⟺ 2\|x−1\|<ε ⟺ \|x−1\|<ε/2` | `ε` |
| 5 | The opponent gets greedier | ε 逐级 `0.5 → 0.2 → 0.1 → 0.01`,δ 自动跟着 | 自动 |
| 6 | ⭐ When you cannot answer | 换成 limits 链那个跳跃函数 J,试证 `L=2`,ε = 0.5。**任何 δ 都失败**,标出反例点 | `δ` |
| 7 | Steeper means smaller δ | 一般线性 `f = mx+c` 给出 `δ = ε/\|m\|` | `m`, `ε` |
| 8 | Prove a limit law with it | 用 ε–δ 证**常数倍法则** | `c`, `ε` |

**第 2–5 步钉死的数值**:

| ε | δ = ε/2 | x ∈ (1±δ) 时 f 的范围 | ⊂ (3±ε)? |
|---|---|---|---|
| 0.5 | 0.25 | (2.5000, 3.5000) | ✓ |
| 0.2 | 0.1 | (2.8000, 3.2000) | ✓ |
| 0.1 | 0.05 | (2.9000, 3.1000) | ✓ |
| 0.01 | 0.005 | (2.9900, 3.0100) | ✓ |

**第 6 步反例**(J(x) = x+1 (x<1), x+2.5 (x>1),L=2,ε=0.5,要求 J ∈ (1.5, 2.5)):

| δ | x = 1+δ 处 J | 在带内? |
|---|---|---|
| 0.5 | 4.0000 | ✗ |
| 0.1 | 3.6000 | ✗ |
| 0.01 | 3.5100 | ✗ |
| 0.001 | 3.5010 | ✗ |

narration 必须说清:**不是"δ 还不够小"**,是右侧的值卡在 3.5 附近**根本不动**。
任何 `δ > 0` 都失败 ⇒ 极限不是 2。这就是"极限不存在"的严格含义。

**第 8 步的证明**(常数倍法则):
给定 ε,对 f 取容差 `ε/|c|` 得到 δ;则 `|x−a|<δ ⇒ |f−L|<ε/|c| ⇒ |c·f−c·L| = |c||f−L| < ε` ∎
数值示例:`c=3, ε=0.6` → 容差 `0.200000`;`ε=0.06` → `0.020000`。
narration 点明:**`ε/|c|` 不是凑出来的,是预算分配** —— 这正是学生看到 `ε/2` 觉得随意的地方。

---

### W10 — 本地进度 + 每条链一个预测检查点

1. `localStorage` 记录每条链走到第几步、是否完成;首页卡片显示进度点
2. 每条链**最后一步之前**插入一个可选的 "**先猜再看**"。
   例:Riemann 链问 "n 从 4 翻倍到 8,夹缝会变成多少?"(答案 `1.000000`,因为夹缝 = 4Δx)

⚠️ **最容易让产品往题库漂的一步。** 硬约束:每条链**只有一道**、可跳过、不计分、不记录对错。
目的是逼出一次预测,不是考试。**若拿不准就跳过 W10,先问 Jesse。**

---

### W11 — 之后的链(按此顺序,一次一条)

1. **FTC**:累积函数 `A(x)=∫ₐˣf`,拖 x 看 `A` 的斜率就是 `f`。`RiemannBars` 已就绪。
   **排最前** —— 它是 Riemann 链的直接续集。
2. **链式法则**:两段速度的复合,`dy/dx = dy/du · du/dx`
3. **乘积法则**:`Δ(uv) = uΔv + vΔu + ΔuΔv`,最后一项是二阶小量。
   **几何上最漂亮**,一个矩形两条边同时变长就讲完了
4. **u-代换**:⚠️ W8 已把 `∫u′/u` 这个最重要的特例讲透,做这条时**从 W8 回指**,不要重讲

---

### W12 — 域名与分享元数据

1. 自定义域名(**需 Jesse 购买,你不许代买,停下来问他**)
2. favicon、canonical URL、Open Graph 图、Twitter card
3. OG 预览图建议用 Shell 第 4 步或 Riemann 第 5 步的截图

---

## 3. 完成后的隐藏收益(不用单独排期)

W1 下线自定义输入之后,以下几项会自动变简单,做 W2/W5/W6 时顺手确认:
- 移动端要测的状态少了一半(不用测输入框、错误提示、预设下拉)
- 首页 hero 不必考虑用户输错函数的情况
- mathjs 从首页 chunk 消失,gzip 预计降 60–80 KB

---

## 4. 依赖关系(首页 tracks 与 "Recommended next" 按这个排)

```
Foundations   limits ──→ epsilon-delta
                 └────→ derivative ──→ chain-rule / product-rule

Integration   riemann-sum ──→ log-integral ──→ tan-integral ──→ u-substitution
                 └────→ FTC

3D Volume     riemann-sum ──→ shell-method ──→ disk-method

Trigonometry  unit-circle ──→ trig-rates
```

首页卡片顺序:`limits → derivative → riemann-sum → log-integral → tan-integral →
shell-method → disk-method → unit-circle → trig-rates → epsilon-delta`
(ε–δ 放最后是因为它是深化,不是入门)

---

## 5. 每条新链的固定流程(不许跳步)

1. 读本文件对应小节。**数字已用两条独立路径验证过,直接用,不要重推,不要换函数或换区间。**
2. 先写 `src/math/` 的纯函数 **+ 测试**,`npm test` 绿了才碰界面。顺序反了会返工。
3. 写 `src/concepts/<id>/chain.ts`(纯数据)。`validateChain()` 必须返回 `[]`。
4. 写 `src/concepts/<id>/<Xxx>Scene.tsx`。需要新图元放 `src/scene/`,不要塞进概念目录。
5. 注册:`src/App.tsx` 的 `CHAINS`/`CARDS`、`tests/e2e/shots.mjs`、`README.md` 表格、
   Formula Deck 相关卡片的 "Why?" 链接、**Type Board 相关符号的 `whyLink`**。
6. `npm run shots` → **逐张真的看图**。
7. 提交 → push → 部署 → 实测线上 → 更新 `CLAUDE.md` 进度日志 → 交验收清单 → **停**。

---

## 6. 通用完成标准(缺一不可)

```bash
npm run check                               # tsc 干净 + 全部测试通过
npm run shots                               # 截图产出,console 零错误,且你真的看了图
git diff --stat HEAD -- src/engine/         # 必须为空(W5 的 altText 是唯一例外)
```

- **变异测试**:新增的每个数学函数,故意改错一处,确认测试会红。绿而不会红的测试等于没有。
- **两条独立路径**:每个新的量都要有第二条计算路径互证。
  ⚠️ W7/W8 特别注意:主路径**不许调 `Math.log`**。`Math.log` 只能出现在测试里当第二条路径。
- **验收清单**:确定性预期直接写进勾选项(例:"ε=0.1 时 δ 显示 0.05"),Jesse 不看代码。

---

## 7. 必须停下来问人的情况

- 发现**非改 `src/engine/` 不可**(W5 的 `altText` 除外)→ 停,说明原因,不要自己动手
- 分镜里的数字与你算出来的**对不上** → 停。两边都重算,不要假设谁对
- 同一个 bug **连续 3 次没修好** → 停,说明你的假设
- 想改 `src/math/architecture.test.ts` 的架构规则 → 停。
  尤其那条概念词正则**刻意不带词边界**
- 需要凭据、账号、购买域名 → 停,不要找变通
- W10 的检查点你觉得开始像题库 → 停,先问

---

## 8. 明确不要做的事

- ❌ 一次做多个 W。做完一个停一个
- ❌ **删除** `src/math/expression.ts` 或它的测试(W1 是下线,不是删除)
- ❌ 为某个概念给 `Stage` 加只有它用得上的字段
- ❌ 放松测试容差让测试变绿
- ❌ 无定义处返回 `NaN`(要 `null` 或抛错)
- ❌ W7/W8 的主计算路径调 `Math.log`
- ❌ 把 Type Board 做成"符号 → 公式"速查表(它是**读法与误解**手册)
- ❌ 把预测检查点做成题库
- ❌ 把凭据写进仓库,或用持久 token 绕过缺失的工具
- ❌ 让产品更像"计算器"。本项目的全部价值在于展示**过程**
