# ROADMAP — 剩余工作总清单

> 这是**标准工单**。从上往下做,一次一个任务,做完停下来等 Jesse 确认再开下一个。
> 规则看 `AGENTS.md`(红线),分镜和已验证的数字看 `docs/HANDOFF.md`。
> **本文件只说"做什么、什么算做完"。三份文件冲突时:AGENTS.md > HANDOFF.md > 本文件。**

---

## 1. 当前状态(2026-08-16)

| 概念 | 路由 | 状态 |
|---|---|---|
| Riemann Sums → 定积分 | `#/riemann-sum` | ✅ 已上线,8 步 |
| Shell Method | `#/shell-method` | ✅ 已上线,9 步 |
| Disk Method | `#/disk-method` | ✅ 已上线,8 步 |
| Secant → Tangent | `#/derivative` | ✅ 已上线,8 步 |
| 左右极限 | `#/limits` | ✅ 已上线,7 步 |
| Unit Circle → sin/cos | `#/unit-circle` | ✅ 已上线,7 步 |

251 个测试 · `src/engine/` 连续五个概念零改动 · 线上
https://calcviz.netlify.app (主) · https://jesse090630.github.io/calc-viz/ (备,push 即自动部署)

---

## 2. ⚠️ T0 — 先处理:本地有 5 个未推送的提交

`git log --oneline origin/main..main` 会看到 5 个**不是你写的**提交。它们是真的,不要回滚、不要重写历史:

```
b70f1d3 docs: strip duplicated rules from CLAUDE.md, keep only the progress log
d0955b5 docs: five chains live; record the two limit bugs and the engine-purity deviation
cd31f05 feat(limits): fifth chain — the limit is not the value
a6ee189 feat(derivative): fourth chain — the secant slope is literally 2 + h
aafc1da feat(riemann-sum): third chain — rectangles squeeze the area into an integral
```

来历:你交付 Riemann 链之后,另一个代理接手做了三件事 ——
① 复核你的链(数字全对),补做了你漏掉的**变异测试**(5 个植入错误全被抓到),
并把飘在空地上的 `upper Lₙ` / `lower Rₙ` 标签锚回各自色带;
② 完整实现了 **derivative** 和 **limits** 两条链;
③ 把 `CLAUDE.md` 里与 `AGENTS.md` 重复的规则删掉(已经漂移了),只留进度日志。

它们是从你的提交 `0381467` 直接长出来的,**push 是干净的快进,不会有冲突。**

**要做的**:
1. `npm run check` 确认 223 测试全绿、tsc 干净(先验证再推,不要盲推)
2. `git push origin main`
3. 用 `https://api.github.com/repos/Jesse090630/calc-viz/actions/runs?per_page=1` 确认 `conclusion: success`
4. 部署主站 —— 见第 5 节。**如果你这边没有 Netlify MCP,不要用持久 token 变通**
   (你上次拒绝这么做是对的)。push 之后备用站已经是最新的,把主站待部署这件事告诉 Jesse 即可。

---

## 3. T1 — Unit Circle → sin/cos(最后一条链)

- **分镜依据**:`HANDOFF.md` 第 4.4 节(7 步,数字已验证)
- **路由 id**:`unit-circle`
- **核心**:圆上的点与右侧波形**是同一个点在动**。第 2 步必须显式讲明
  **θ = 走过的弧长**(这就是弧度制的定义,大多数学生从没被这样讲过)。
- **⚠️ 最容易踩的坑**:圆上的点与波上的点必须**始终水平对齐**。差一点整条链就白做了 ——
  那正是"圆怎么变成波"的全部说服力。截图验收时重点看这一条。
- **新增数学**:`src/math/trig.ts` — `circlePoint(θ)` / `arcLength(θ, r)`
- **新增场景**:`TracedWave`(把随参数变化的标量描成随时间的曲线),放 `src/scene/`
- **可复用的现成图元**:`PointMarker`(第 4 条链新增,支持空心)、`CircleOutline`、`MathLabel`、`RiseRun`

**⚠️ 取景问题,动手前先想**:单位圆半径 1、圆心在原点,而现有 `front` 相机对准 (0.9, 2.0)。
右侧还要放一条时间轴,横向要 2π ≈ 6.3 的宽度。**加相机预设 = 改 `engine/types.ts` 的
`CameraPreset` = 改引擎,不许做。** 两条出路:
① 用现成的 `wide` 预设(位置 [1.6, 3.6, 16.5],target [0, 1.3, 0],fov 26)看够不够;
② 把整个构图**平移**到现有取景里(圆心放在能被看到的位置,波形轴跟着挪)——
几何仍然正确,只是整体做了一次平移,标注写清楚即可。

> 前车之鉴:limits 链原本要用 `x/|x|` 做反例,它在原点附近装不下。
> 当时没有加相机预设,而是换成"跳跃点仍在 x=1、左半段与 g 完全相同"的分段函数。
> **结果比原方案更好** —— 变量控制更干净,对比更锐利。
> 这条纪律不是形式主义,它逼出过更好的设计。

---

## 4. T2 — 六条链完成后的打磨

**2026-08-16 审计已完成:**逐幕证据与优先级见
[`docs/T2_AUDIT.md`](./T2_AUDIT.md);按 AGENTS.md §4.6,当前只列问题、未做大范围改动。

**这一阶段先只列问题清单,不要动手改**,等 Jesse 圈定范围。收尾期禁止大重构。

要检查的:

- **移动端**:每条链在 390×844 竖屏走一遍(画布、公式、滑块、导航)。这是最可能有问题的一项,
  因为开发全程只在 1440×900 验过。
- **跨链一致性**:同一个量在不同链里颜色是否一致(见 `src/scene/theme.ts` 的语义)。
  五条链是分批做的,很可能已经漂了。
- **首页**:6 张卡片的排序与文案;是否需要缩略图。
  顺序按**依赖关系**排,不是按完成时间(Riemann 是 Shell 的前置,所以它第一)。
- **性能**:打包 ~1.4 MB(gzip ~392 KB),绝大部分是 Three.js。到这一步才考虑代码分割。
- **无障碍**:滑块与导航按钮的 `aria-label`、键盘可达性。
- **文案统一**:五条链的 narration 是分批写的,读一遍看语气和人称是否一致。

---

## 5. T3 / T4 / T5 — v2:开放任意函数输入

**五条链全部上线之前不许开始。** 完整规格见 `HANDOFF.md` 第 5 节。

- **T3 = v2.0**:表达式输入 + 区间输入,**只接到 Riemann 这一条链**(2D,风险最低)
- **T4 = v2.1**:接到 Shell / Disk(3D,要处理值域自适应与相机距离)
- **T5 = v2.2**:预设下拉 + "试试这个"示例列表(空输入框对学生门槛太高)

**关键设计约束**(最容易被做错的一条):
mathjs **不做符号积分**,所以用户函数给不出闭式 `F` / `xF` / `sqF`。
必须把 `CurveSpec` 这三个字段改成**可选**,并让 `solids.ts` / `riemann.ts` 在缺失时
自动退回 `adaptiveSimpson`。**这是 v2 唯一需要动既有 math 层的地方,动之前先把全部单测跑绿。**

七类边界情况每一条都要有测试:
解析失败 / 定义域外 / 函数取负值 / 积分发散 / `a ≥ b` / 值域过大导致相机装不下 / 输入防抖。

⚠️ 特别注意:`limits.ts` 里已经确立了一条约定 —— **无定义返回 `null`,不返回 `NaN`**。
v2 的解析器必须沿用它。NaN 不会让任何东西崩溃,它只会变成屏幕上一个看不见的错数字。

---

## 6. 之后(还没排期,不要主动开始)

- FTC(微积分基本定理):累积函数 `A(x) = ∫ₐˣ f`,拖 x 看 A 的斜率就是 f。
  `RiemannBars` 已经为它准备好了。
- BC 内容:参数方程、极坐标、级数收敛。`TracedWave`(T1 会造)是参数方程的地基。
- 每条链末尾加一道"你来试"的小练习 —— **但这会让产品往"题库"方向漂,先问 Jesse。**

---

## 7. 每条链的固定流程(不许跳步)

1. 读 `HANDOFF.md` 对应小节的分镜。**数字已用两条独立路径验证过,直接用,不要重推,不要换函数或换区间。**
2. 先写 `src/math/` 的纯函数 **+ 测试**,`npm test` 绿了才碰界面。顺序反了会返工。
3. 写 `src/concepts/<id>/chain.ts`(纯数据)。`validateChain()` 必须返回 `[]`。
4. 写 `src/concepts/<id>/<Xxx>Scene.tsx`。需要新图元时放 `src/scene/`,不要塞进概念目录。
5. 注册:`src/App.tsx` 的 `CHAINS` 与 `CARDS`(`ready: true`)、`tests/e2e/shots.mjs` 的链表、`README.md` 表格。
6. `npm run shots` → **逐张真的看图**。
7. 提交 → push → 部署 → 实测线上 → 更新 `CLAUDE.md` 进度日志 → 交验收清单 → **停**。

---

## 8. 通用完成标准(缺一不可)

```bash
npm run check                               # tsc 干净 + 全部测试通过
npm run shots                               # 截图产出,console 零错误,且你真的看了图
git diff --stat HEAD -- src/engine/         # 必须输出为空
```

- **变异测试**:新增的每个数学函数,故意改错一处,确认测试会红。绿而不会红的测试等于没有。
  已有的实践:Riemann 5 项、Derivative 的 h=0 全行程扫描、Limits 5 项(含"偷偷把 g 换成 x+1")。
- **两条独立路径**:每个新的量都要有第二条计算路径互证(解析 ↔ 数值,或换一种算法)。
- **验收清单**:按 `HANDOFF.md` 第 7 节模板,确定性预期直接写进勾选项
  (例:"n=4 时显示 6.250000",而不是"数字正确")。Jesse 不看代码,只按清单走一遍。

### 部署与验证

1. push 到 `main` → GitHub Actions 自动部署备用站。用
   `https://api.github.com/repos/Jesse090630/calc-viz/actions/runs?per_page=1` 确认 `conclusion: success`。
2. 主站 Netlify:site id `efa914ff-2725-47d0-99b2-92c1337eda3c`。
   部署命令带临时凭据,由 Netlify MCP 的 `deploy-site` 操作**现取现用**。
   **⚠️ 凭据绝不许写进仓库或任何文件 —— 这是公开仓库。**
   没有该 MCP 时,**不要**改用持久 token 或 CLI 变通;push 后备用站已是最新,告知 Jesse 即可。
3. **实测线上**:真的打开站点,进新链按方向键走几步,确认画面渲染 + console 零错误。
   **看到 "Deploy is ready" 不等于完成。**

---

## 9. 必须停下来问人的情况

- 发现**非改 `src/engine/` 不可** → 停。说明为什么,不要自己动手。
  引擎已经连续扛住四个概念,第五个逼你改它,先怀疑你的 chain 数据设计或取景方案。
- 分镜里的数字与你算出来的**对不上** → 停。两边都重算,不要假设谁对。
- 同一个 bug **连续 3 次没修好** → 停。说明你的假设。
- 想改 `src/math/architecture.test.ts` 里的架构规则 → 停。
  尤其那条概念词正则**刻意不带词边界**,带上就抓不到 `shellRadius` 这类真实违规。
- 需要凭据、账号、付费、或任何 Jesse 本人才能授权的操作 → 停,不要找变通。

---

## 10. 明确不要做的事

- ❌ 一次做多条链。一次一个任务,做完验收再开下一个。
- ❌ 为了让某个概念方便而给 `Stage` 加只有它用得上的字段。
- ❌ 放松测试容差让测试变绿。
- ❌ 无定义的地方返回 `NaN`(要返回 `null` 或抛错)。
- ❌ 把凭据写进仓库,或用持久 token 绕过缺失的工具。
- ❌ 收尾阶段大重构。
- ❌ 让产品更像"计算器"的功能(输入函数→输出答案)。本项目的全部价值在于展示**过程**。
- ❌ 五条链完成前碰 v2。
