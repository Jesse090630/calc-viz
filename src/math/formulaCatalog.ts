/**
 * ⚠️ 页码指的是 **Jesse 那张八页公式表**的页码,不是别的东西。
 * 卡片右上角显示 `p.N`,那个 N 必须能在纸上翻到 —— 否则那个标签是装饰,不是索引。
 * 原来的分类只到 5 页,是更早一版表的分页;这一轮按新表重新对齐了。
 */
export type FormulaCategory =
  | 'foundations'
  | 'derivatives'
  | 'theorems'
  | 'integrals'
  | 'geometry'
  | 'series'
  | 'applications'
  | 'trigonometry';

export interface FormulaEntry {
  readonly id: string;
  readonly title: string;
  readonly tex: readonly string[];
  readonly note?: string;
  readonly deriveRoute?: string;
  readonly sourcePage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  readonly search?: readonly string[];
}

export interface FormulaSection {
  readonly id: string;
  readonly category: FormulaCategory;
  readonly title: string;
  readonly entries: readonly FormulaEntry[];
}

const entry = (
  id: string,
  title: string,
  sourcePage: FormulaEntry['sourcePage'],
  tex: readonly string[],
  options: Pick<FormulaEntry, 'note' | 'deriveRoute' | 'search'> = {},
): FormulaEntry => ({ id, title, sourcePage, tex, ...options });

const derivativeRules = [
  ['d-01', 'Identity', String.raw`\frac{d}{dx}x=1`],
  ['d-02', 'Sum / difference', String.raw`\frac{d}{dx}(u\pm v)=u'\pm v'`],
  ['d-03', 'Constant multiple', String.raw`\frac{d}{dx}(cv)=cv'`],
  ['d-04', 'Quotient rule', String.raw`\frac{d}{dx}\!\left(\frac uv\right)=\frac{vu'-uv'}{v^2}`],
  ['d-05', 'Constant', String.raw`\frac{d}{dx}c=0`],
  ['d-06', 'Product rule', String.raw`\frac{d}{dx}(uv)=uv'+vu'`],
  ['d-07', 'Power rule', String.raw`\frac{d}{dx}x^n=nx^{n-1}`],
  ['d-08', 'Chain rule', String.raw`\frac{d}{dx}f(g(x))=f'(g(x))g'(x)`],
  ['d-09', 'Natural log absolute value', String.raw`\frac{d}{dx}\ln|u|=\frac{u'}u\quad(u\ne0)`],
  ['d-10', 'Natural log', String.raw`\frac{d}{dx}\ln u=\frac{u'}u\quad(u>0)`],
  ['d-11', 'Natural exponential', String.raw`\frac{d}{dx}e^u=e^u u'`],
  ['d-12', 'Logarithm base a', String.raw`\frac{d}{dx}\log_a u=\frac{u'}{u\ln a}\quad(u>0)`],
  ['d-13', 'Exponential base a', String.raw`\frac{d}{dx}a^u=a^u(\ln a)u'`],
  ['d-14', 'Inverse sine', String.raw`\frac{d}{dx}\sin^{-1}u=\frac{u'}{\sqrt{1-u^2}}`],
  ['d-15', 'Inverse cosine', String.raw`\frac{d}{dx}\cos^{-1}u=-\frac{u'}{\sqrt{1-u^2}}`],
  ['d-16', 'Inverse tangent', String.raw`\frac{d}{dx}\tan^{-1}u=\frac{u'}{1+u^2}`],
  ['d-17', 'Inverse cotangent', String.raw`\frac{d}{dx}\cot^{-1}u=-\frac{u'}{1+u^2}`],
  ['d-18', 'Inverse cosecant', String.raw`\frac{d}{dx}\csc^{-1}u=-\frac{u'}{|u|\sqrt{u^2-1}}`],
  ['d-19', 'Inverse secant', String.raw`\frac{d}{dx}\sec^{-1}u=\frac{u'}{|u|\sqrt{u^2-1}}`],
  ['d-20', 'Sine', String.raw`\frac{d}{dx}\sin u=(\cos u)u'`],
  ['d-21', 'Cosine', String.raw`\frac{d}{dx}\cos u=-(\sin u)u'`],
  ['d-22', 'Tangent', String.raw`\frac{d}{dx}\tan u=(\sec^2u)u'`],
  ['d-23', 'Cotangent', String.raw`\frac{d}{dx}\cot u=-(\csc^2u)u'`],
  ['d-24', 'Secant', String.raw`\frac{d}{dx}\sec u=(\sec u\tan u)u'`],
  ['d-25', 'Cosecant', String.raw`\frac{d}{dx}\csc u=-(\csc u\cot u)u'`],
  ['d-26', 'Hyperbolic cosine', String.raw`\frac{d}{dx}\cosh u=(\sinh u)u'`],
  ['d-27', 'Hyperbolic sine', String.raw`\frac{d}{dx}\sinh u=(\cosh u)u'`],
  ['d-28', 'Hyperbolic cotangent', String.raw`\frac{d}{dx}\coth u=-(\operatorname{csch}^2u)u'`],
  ['d-29', 'Hyperbolic secant', String.raw`\frac{d}{dx}\operatorname{sech}u=-(\operatorname{sech}u\tanh u)u'`],
  ['d-30', 'Hyperbolic tangent', String.raw`\frac{d}{dx}\tanh u=(\operatorname{sech}^2u)u'`],
  ['d-31', 'Hyperbolic cosecant', String.raw`\frac{d}{dx}\operatorname{csch}u=-(\operatorname{csch}u\coth u)u'`],
] as const;

const integralRules = [
  ['i-01', 'Integral of 1', String.raw`\int 1\,dx=x+C`],
  ['i-02', 'Sum / difference', String.raw`\int(u\pm v)\,dx=\int u\,dx\pm\int v\,dx`],
  ['i-03', 'Constant multiple', String.raw`\int cv\,dx=c\int v\,dx`],
  ['i-04', 'Power rule', String.raw`\int x^n\,dx=\frac{x^{n+1}}{n+1}+C\quad(n\ne-1)`],
  ['i-05', 'Reciprocal', String.raw`\int\frac1x\,dx=\ln|x|+C`],
  ['i-06', 'Natural exponential', String.raw`\int e^{ax}\,dx=\frac{e^{ax}}a+C\quad(a\ne0)`],
  ['i-07', 'Exponential base a', String.raw`\int a^x\,dx=\frac{a^x}{\ln a}+C`],
  ['i-08', 'Natural logarithm', String.raw`\int\ln x\,dx=x\ln x-x+C`],
  ['i-09', 'Logarithm base a', String.raw`\int\log_a x\,dx=\frac{x\ln x-x}{\ln a}+C`],
  ['i-10', 'Sine', String.raw`\int(\sin u)u'\,dx=-\cos u+C`],
  ['i-11', 'Cosine', String.raw`\int(\cos u)u'\,dx=\sin u+C`],
  ['i-12', 'Tangent', String.raw`\int(\tan u)u'\,dx=\ln|\sec u|+C`],
  ['i-13', 'Secant', String.raw`\int\sec x\,dx=\ln|\sec x+\tan x|+C`],
  ['i-14', 'Cosecant', String.raw`\int\csc x\,dx=\ln|\csc x-\cot x|+C`],
  ['i-15', 'Secant squared', String.raw`\int(\sec^2u)u'\,dx=\tan u+C`],
  ['i-16', 'Cosecant squared', String.raw`\int(\csc^2u)u'\,dx=-\cot u+C`],
  ['i-17', 'Secant tangent', String.raw`\int(\sec u\tan u)u'\,dx=\sec u+C`],
  ['i-18', 'Cosecant cotangent', String.raw`\int(\csc u\cot u)u'\,dx=-\csc u+C`],
  ['i-19', 'Inverse tangent pattern', String.raw`\int\frac{u'}{u^2+a^2}\,dx=\frac1a\tan^{-1}\!\left(\frac ua\right)+C`],
  ['i-20', 'Inverse tangent unit pattern', String.raw`\int\frac{u'}{1+u^2}\,dx=\tan^{-1}u+C`],
  ['i-21', 'Inverse sine pattern', String.raw`\int\frac{u'}{\sqrt{1-u^2}}\,dx=\sin^{-1}u+C`],
  ['i-22', 'Hyperbolic sine', String.raw`\int\sinh x\,dx=\cosh x+C`],
  ['i-23', 'Hyperbolic cosine', String.raw`\int\cosh x\,dx=\sinh x+C`],
  ['i-24', 'Hyperbolic tangent', String.raw`\int\tanh x\,dx=\ln(\cosh x)+C`],
  ['i-25', 'Hyperbolic secant squared', String.raw`\int\operatorname{sech}^2x\,dx=\tanh x+C`],
  ['i-26', 'Hyperbolic cosecant squared', String.raw`\int\operatorname{csch}^2x\,dx=-\coth x+C`],
  ['i-27', 'Hyperbolic secant tangent', String.raw`\int\operatorname{sech}x\tanh x\,dx=-\operatorname{sech}x+C`],
  ['i-28', 'Hyperbolic cosecant cotangent', String.raw`\int\operatorname{csch}x\coth x\,dx=-\operatorname{csch}x+C`],
] as const;

const definiteRules = [
  ['di-01', 'Fundamental Theorem of Calculus', String.raw`\int_a^b f(x)\,dx=F(b)-F(a)`],
  ['di-02', 'Zero-width interval', String.raw`\int_a^a f(x)\,dx=0`],
  ['di-03', 'Constant function', String.raw`\int_a^b c\,dx=c(b-a)`],
  ['di-04', 'Sum / difference', String.raw`\int_a^b(f\pm g)\,dx=\int_a^b f\,dx\pm\int_a^b g\,dx`],
  ['di-05', 'Constant multiple', String.raw`\int_a^b cf(x)\,dx=c\int_a^b f(x)\,dx`],
  ['di-06', 'Reverse bounds', String.raw`\int_a^b f(x)\,dx=-\int_b^a f(x)\,dx`],
  ['di-07', 'Split an interval', String.raw`\int_a^b f=\int_a^c f+\int_c^b f`],
  ['di-08', 'Reflect the input', String.raw`\int_a^b f(x)\,dx=\int_a^b f(a+b-x)\,dx`],
  ['di-09', 'Positive signed area', String.raw`f\ge0\Longrightarrow\int_a^b f(x)\,dx=\text{area under }f`],
  ['di-10', 'Negative signed area', String.raw`f\le0\Longrightarrow\int_a^b f(x)\,dx=-\text{geometric area}`],
  ['di-11', 'Odd symmetry', String.raw`f\text{ odd}\Longrightarrow\int_{-a}^{a}f(x)\,dx=0`],
  ['di-12', 'Even symmetry', String.raw`f\text{ even}\Longrightarrow\int_{-a}^{a}f(x)\,dx=2\int_0^a f(x)\,dx`],
  ['di-13', 'Total area', String.raw`\int_a^b|f(x)|\,dx=\text{total area between }f\text{ and the }x\text{-axis}`],
  ['di-14', 'Net change', String.raw`\int_a^b f'(x)\,dx=f(b)-f(a)`],
  ['di-15', 'Integration by parts', String.raw`\int_a^b f'g\,dx=[fg]_a^b-\int_a^b fg'\,dx`],
] as const;

const ruleEntries = (
  rules: readonly (readonly [string, string, string])[],
  page: FormulaEntry['sourcePage'],
  deriveIds: Readonly<Record<string, string>> = {},
): FormulaEntry[] => rules.map(([id, title, tex]) => entry(id, title, page, [tex], deriveIds[id] ? { deriveRoute: deriveIds[id] } : {}));

export const FORMULA_SECTIONS: readonly FormulaSection[] = [
  {
    id: 'derivative-meaning', category: 'foundations', title: 'Derivative: definition & meaning', entries: [
      entry('derivative-definition', 'Difference quotient', 1, [String.raw`f'(x)=\lim_{h\to0}\frac{f(x+h)-f(x)}h`], { deriveRoute: 'derivative', search: ['secant', 'tangent', 'slope'] }),
      entry('derivative-notation', 'Equivalent notation', 1, [String.raw`f'(x)=y'=\frac{df}{dx}=\frac{dy}{dx}=\frac d{dx}f(x)=Df(x)`, String.raw`f'(a)=y'|_{x=a}=\left.\frac{df}{dx}\right|_{x=a}=Df(a)`]),
      entry('tangent-line', 'Tangent line at x = a', 1, [String.raw`m=f'(a)`, String.raw`y=f(a)+f'(a)(x-a)`], { deriveRoute: 'derivative' }),
      entry('instantaneous-rate', 'Instantaneous rate & velocity', 1, [String.raw`f'(a)=\text{instantaneous rate of change at }x=a`, String.raw`s'(a)=\text{velocity at }t=a`]),
      entry('accumulation', 'Accumulation function', 1, [String.raw`F(x)=\int_a^x f(t)\,dt\Longrightarrow F'(x)=f(x)`], { deriveRoute: 'riemann-sum', search: ['FTC', 'fundamental theorem'] }),
      /**
     * ⚠️ 这里以前写的是 `F↑ ⟺ F′>0`,那个双向箭头是**错的**。
     *   `F′>0 ⟹ F 严格递增` 成立;但反过来不成立 —— `x³` 在整条实轴上递增,
     *   而它在 0 处的导数恰好是 0。所以「递增」对应的是 `F′ ≥ 0`,不是 `F′ > 0`。
     *   一个方向是充分条件、另一个方向是必要条件,合不成 iff。
     */
    entry('accumulation-behavior', 'Behavior of accumulation', 1, [String.raw`F'>0\Rightarrow F\text{ strictly increasing}`, String.raw`F\text{ increasing}\iff F'\ge0\iff f\ge0`, String.raw`F\text{ decreasing}\iff F'\le0\iff f\le0`, String.raw`F\text{ has extrema where }f\text{ changes sign}`, String.raw`F\text{ concave up}\iff f\text{ increasing}`], { note: 'The one-way arrow is not a typo. x³ is increasing everywhere yet its derivative is 0 at the origin, so “increasing” pairs with ≥, never with >.' }),
    ],
  },
  {
    id: 'summations', category: 'foundations', title: 'Summations & series', entries: [
      entry('finite-sums', 'Finite power sums', 1, [String.raw`\sum_{k=1}^n c=nc`, String.raw`\sum_{k=1}^n k=\frac{n(n+1)}2`, String.raw`\sum_{k=1}^n k^2=\frac{n(n+1)(2n+1)}6`, String.raw`\sum_{k=1}^n k^3=\left(\frac{n(n+1)}2\right)^2`]),
      entry('geometric-series', 'Infinite series', 1, [String.raw`\sum_{k=1}^{\infty}r^k=\frac r{1-r}\quad(|r|<1)`, String.raw`\sum_{k=0}^{\infty}r^k=\frac1{1-r}\quad(|r|<1)`, String.raw`\sum_{k=1}^{\infty}\frac1k\text{ diverges}`, String.raw`\sum_{k=1}^{\infty}\frac1{k^2}=\frac{\pi^2}6`], { deriveRoute: 'geometric-series' }),
      entry('sum-linearity', 'Linearity of summation', 1, [String.raw`\sum(a_k\pm b_k)=\sum a_k\pm\sum b_k`, String.raw`\sum ca_k=c\sum a_k`]),
    ],
  },
  { id: 'derivative-rules', category: 'derivatives', title: 'Derivative rules', entries: ruleEntries(derivativeRules, 2, { 'd-09': 'log-integral', 'd-10': 'log-integral', 'd-20': 'trig-rates', 'd-21': 'trig-rates' }) },
  {
    id: 'limits-logs-inverses', category: 'derivatives', title: 'Special limits, logs & inverses', entries: [
      // ⭐ 每条特殊极限**单独一张卡**,好各自链到证明它的那一课。
      //    挤成一张卡的时候只能挂一个 deriveRoute,六条里五条就没有出口。
      entry('limit-sin-over-x', 'sin x / x', 2, [String.raw`\lim_{x\to0}\frac{\sin x}{x}=1`], { deriveRoute: 'sin-over-x', search: ['special limit', 'squeeze', 'radians'] }),
      entry('limit-x-over-sin', 'x / sin x', 2, [String.raw`\lim_{x\to0}\frac{x}{\sin x}=1`], { deriveRoute: 'sin-over-x', note: 'The reciprocal of the one above, so it has the same limit.' }),
      entry('limit-sin-composite', 'sin of anything going to 0', 2, [String.raw`\lim_{x\to a}\frac{\sin(f(x))}{f(x)}=1\quad(f(x)\to0)`, String.raw`\lim_{x\to a}\frac{f(x)}{\sin(f(x))}=1\quad(f(x)\to0)`], { deriveRoute: 'special-limits', note: 'u does not have to be x. Anything that goes to 0 will do.' }),
      entry('limit-tan-over-x', 'tan x / x', 2, [String.raw`\lim_{x\to0}\frac{\tan x}{x}=1`], { deriveRoute: 'tan-over-x', search: ['special limit'] }),
      entry('limit-cos-over-x', '(1 - cos x) / x', 2, [String.raw`\lim_{x\to0}\frac{1-\cos x}{x}=0`], { deriveRoute: 'cos-over-x', search: ['special limit'] }),
      entry('limit-cos-over-x2', '(1 - cos x) / x²', 2, [String.raw`\lim_{x\to0}\frac{1-\cos x}{x^2}=\frac12`], { deriveRoute: 'cos-over-x2', search: ['special limit', 'half'] }),
      entry('limit-x-over-cos', 'x / (1 - cos x)', 2, [String.raw`\lim_{x\to0}\frac{x}{1-\cos x}\text{ does not exist}`], { deriveRoute: 'infinite-limits', note: '−∞ from the left, +∞ from the right — so there is no two-sided limit.' }),
      entry('limit-exp', '(eˣ - 1) / x', 2, [String.raw`\lim_{x\to0}\frac{e^x-1}{x}=1`], { deriveRoute: 'exp-over-x', search: ['special limit', 'exponential'] }),
      entry('limit-log', 'ln(1 + x) / x', 2, [String.raw`\lim_{x\to0}\frac{\ln(1+x)}{x}=1\quad(1+x>0)`], { deriveRoute: 'log-over-x', search: ['special limit', 'logarithm'] }),
      entry('limit-e-definition', 'The definition of e', 2, [String.raw`\lim_{x\to\infty}\left(1+\frac1x\right)^x=e`], { search: ['compound', 'euler'] }),
      entry('limits-are-radians', 'These need radians', 2, [String.raw`\lim_{x\to0}\frac{\sin(x^\circ)}{x}=\frac{\pi}{180}\approx0.01745`], { deriveRoute: 'sin-over-x', note: 'In degrees the clean answer disappears. The 1 is a fact about radians.' }),
      entry('indeterminate-forms', 'Indeterminate forms', 2, [String.raw`\frac00\quad\frac\infty\infty\quad0\cdot\infty\quad\infty-\infty\quad1^\infty\quad0^0\quad\infty^0`], { deriveRoute: 'indeterminate', note: 'A form is a question, not an answer. Substitution alone decides nothing.' }),
      entry('log-exp-facts', 'Logarithm & exponential facts', 2, [String.raw`\ln1=0`, String.raw`\ln0\text{ is undefined}`, String.raw`e^0=1`, String.raw`\ln(e^a)=a`, String.raw`e^{\ln a}=a\quad(a>0)`]),
      entry('inverse-derivative', 'Derivative of an inverse', 2, [String.raw`(f^{-1})'(x)=\frac1{f'(f^{-1}(x))}`]),
      entry('function-square', 'Square of a function', 2, [String.raw`(g(x))^2=g^2(x)`]),
    ],
  },
  { id: 'indefinite-integrals', category: 'integrals', title: 'Indefinite integrals', entries: ruleEntries(integralRules, 4, { 'i-05': 'log-integral', 'i-10': 'trig-rates', 'i-11': 'trig-rates' }) },
  { id: 'definite-integrals', category: 'integrals', title: 'Definite integral properties', entries: ruleEntries(definiteRules, 4, { 'di-01': 'riemann-sum', 'di-14': 'riemann-sum' }) },
  {
    id: 'area-volume', category: 'geometry', title: 'Average, area & volume', entries: [
      entry('average-value', 'Average value', 5, [String.raw`f_{\mathrm{avg}}=\frac1{b-a}\int_a^b f(x)\,dx`]),
      entry('area-between', 'Area between curves', 5, [String.raw`A=\int_a^b[f(x)-g(x)]\,dx\quad(f\ge g)`]),
      entry('disk-volume', 'Disk method', 5, [String.raw`V=\pi\int_a^b R(x)^2\,dx`], { deriveRoute: 'disk-method' }),
      entry('washer-volume', 'Washer method', 5, [String.raw`V=\pi\int_a^b[R(x)^2-r(x)^2]\,dx`], { deriveRoute: 'disk-method' }),
      entry('shell-volume', 'Shell method', 5, [String.raw`V=2\pi\int_a^b R(x)h(x)\,dx`, String.raw`h(x)=f(x)-g(x)`], { deriveRoute: 'shell-method' }),
      entry('cross-section', 'Known cross-sectional area', 5, [String.raw`V=\int_a^b A(x)\,dx`]),
      entry('square-cross-section', 'Square cross sections', 5, [String.raw`V=\int_a^b S(x)^2\,dx`, String.raw`S=f-g`]),
      entry('semicircle-cross-section', 'Semicircle cross sections', 5, [String.raw`V=\int_a^b\frac12\pi r(x)^2\,dx`, String.raw`r=\frac{f-g}2`]),
      entry('rectangle-cross-section', 'Rectangle cross sections', 5, [String.raw`V=\int_a^b w(x)h(x)\,dx`, String.raw`w=f-g`]),
      entry('equilateral-triangle', 'Equilateral triangle cross sections', 5, [String.raw`V=\int_a^b\frac{\sqrt3}{4}S(x)^2\,dx`, String.raw`S=f-g`]),
      entry('isosceles-triangle', 'Isosceles right triangle cross sections', 5, [String.raw`V=\int_a^b\frac12S(x)^2\,dx`, String.raw`S=f-g`]),
    ],
  },
  {
    id: 'continuity-theorems', category: 'theorems', title: 'Continuity & the big theorems', entries: [
      entry('continuity', 'Continuity at x = c', 3, [String.raw`f(c)\text{ is defined}`, String.raw`\lim_{x\to c}f(x)\text{ exists}`, String.raw`\lim_{x\to c}f(x)=f(c)`], { deriveRoute: 'limit-vs-value', note: 'All three. The third is the one students skip — the limit and the value must agree.' }),
      entry('one-sided-agree', 'A limit exists when both sides agree', 3, [String.raw`\lim_{x\to c}f(x)=L\iff\lim_{x\to c^-}f(x)=\lim_{x\to c^+}f(x)=L`], { deriveRoute: 'one-sided' }),
      entry('epsilon-delta', 'The formal definition of a limit', 3, [String.raw`\forall\varepsilon>0\;\exists\delta>0:\;0<|x-a|<\delta\Rightarrow|f(x)-L|<\varepsilon`], { deriveRoute: 'epsilon-delta', search: ['epsilon', 'delta', 'formal'] }),
      entry('squeeze-theorem', 'Squeeze theorem', 3, [String.raw`g(x)\le f(x)\le h(x)\text{ near }a`, String.raw`\lim_{x\to a}g(x)=\lim_{x\to a}h(x)=L\Longrightarrow\lim_{x\to a}f(x)=L`], { deriveRoute: 'squeeze', note: 'f need not be defined at a. That is the point of it.' }),
      entry('ivt', 'Intermediate Value Theorem', 3, [String.raw`f\text{ continuous on }[a,b],\;N\text{ between }f(a)\text{ and }f(b)`, String.raw`\Longrightarrow\exists c\in[a,b]:\;f(c)=N`], { search: ['IVT', 'root', 'crossing'] }),
      entry('evt', 'Extreme Value Theorem', 3, [String.raw`f\text{ continuous on }[a,b]\Longrightarrow f\text{ attains an absolute max and an absolute min on }[a,b]`], { search: ['EVT', 'maximum', 'minimum'] }),
      entry('rolle', "Rolle's Theorem", 3, [String.raw`f\text{ continuous on }[a,b],\;\text{differentiable on }(a,b),\;f(a)=f(b)`, String.raw`\Longrightarrow\exists c\in(a,b):\;f'(c)=0`]),
      entry('mvt', 'Mean Value Theorem', 3, [String.raw`f\text{ continuous on }[a,b],\;\text{differentiable on }(a,b)`, String.raw`\Longrightarrow\exists c\in(a,b):\;f'(c)=\frac{f(b)-f(a)}{b-a}`], { deriveRoute: 'secant', note: 'Somewhere the instantaneous rate equals the average rate.' }),
      entry('lhospital', "L'Hospital's Rule", 3, [String.raw`\frac00\text{ or }\frac\infty\infty:\quad\lim_{x\to a}\frac{f(x)}{g(x)}=\lim_{x\to a}\frac{f'(x)}{g'(x)}`], { deriveRoute: 'indeterminate', note: "Needs g'(x) ≠ 0 near a and the new limit to exist. Rewrite 0·∞, ∞−∞, 1^∞, 0⁰, ∞⁰ as a quotient first." }),
    ],
  },
  {
    id: 'curve-analysis', category: 'theorems', title: 'Reading a curve from its derivatives', entries: [
      entry('not-differentiable', 'Not differentiable at', 3, [String.raw`\text{a discontinuity (hole, jump, vertical asymptote)}`, String.raw`\text{a corner or cusp}`, String.raw`\text{a vertical tangent}`], { deriveRoute: 'secant-to-tangent' }),
      entry('critical-numbers', 'Critical numbers', 3, [String.raw`c\text{ is critical if }c\in\operatorname{dom}f\text{ and }\bigl(f'(c)=0\text{ or }f'(c)\text{ DNE}\bigr)`]),
      entry('first-derivative-test', 'First derivative test', 3, [String.raw`f'\;-\to+:\;\text{local minimum}`, String.raw`f'\;+\to-:\;\text{local maximum}`, String.raw`\text{no sign change}:\;\text{neither}`], { deriveRoute: 'intervals' }),
      entry('second-derivative-test', 'Second derivative test', 3, [String.raw`f'(c)=0,\;f''(c)>0:\;\text{local minimum}`, String.raw`f'(c)=0,\;f''(c)<0:\;\text{local maximum}`, String.raw`f''(c)=0:\;\text{inconclusive}`]),
      entry('inflection', 'Point of inflection', 3, [String.raw`f''(x)=0\text{ or DNE},\text{ and }f''\text{ actually changes sign}`], { note: 'The sign change is the requirement. f″ = 0 on its own proves nothing.' }),
      entry('increasing-decreasing', 'Increasing & decreasing', 3, [String.raw`f'>0\Longrightarrow f\text{ increasing}`, String.raw`f'<0\Longrightarrow f\text{ decreasing}`], { deriveRoute: 'intervals' }),
      entry('candidates-test', 'Candidates test', 3, [String.raw`\text{Evaluate }f\text{ at every critical number and at both endpoints; compare.}`], { note: 'For an absolute extremum on a closed interval.' }),
    ],
  },
  {
    id: 'motion', category: 'applications', title: 'Motion along a line', entries: [
      entry('position-velocity', 'Position, velocity, acceleration', 3, [String.raw`v(t)=s'(t)`, String.raw`a(t)=v'(t)=s''(t)`, String.raw`\text{speed}=|v(t)|`]),
      entry('displacement', 'Displacement vs total distance', 3, [String.raw`s(b)-s(a)=\int_a^b v(t)\,dt`, String.raw`\text{total distance}=\int_a^b|v(t)|\,dt`], { note: 'Displacement can be zero while the distance travelled is not.' }),
      entry('speeding-up', 'Speeding up or slowing down', 3, [String.raw`v\text{ and }a\text{ same sign}\Longrightarrow\text{speeding up}`, String.raw`v\text{ and }a\text{ opposite signs}\Longrightarrow\text{slowing down}`]),
    ],
  },
  {
    id: 'definite-definition', category: 'integrals', title: 'Definition of the integral & the FTC', entries: [
      entry('definite-definition', 'Definition of the definite integral', 5, [String.raw`\Delta x=\frac{b-a}{n}`, String.raw`\int_a^b f(x)\,dx=\lim_{n\to\infty}\sum_{k=1}^{n}\frac{b-a}{n}\,f\!\left(a+\frac{b-a}{n}k\right)`], { deriveRoute: 'riemann-sum', note: 'Right endpoints. The integral is a limit of sums, not a new kind of object.' }),
      entry('ftc-1', 'FTC part 1', 5, [String.raw`\int_a^b f(x)\,dx=F(b)-F(a)`], { deriveRoute: 'riemann-sum', note: 'F is any antiderivative of f.' }),
      entry('ftc-2', 'FTC part 2', 5, [String.raw`\int_a^b f'(x)\,dx=f(b)-f(a)`]),
      entry('ftc-3', 'Differentiating an integral', 5, [String.raw`\frac{d}{dx}\int_a^x f(t)\,dt=f(x)`]),
      entry('ftc-chain', 'Chain rule on the bounds', 5, [String.raw`\frac{d}{dx}\int_a^{g(x)}f(t)\,dt=f(g(x))g'(x)`, String.raw`\frac{d}{dx}\int_{h(x)}^{g(x)}f(t)\,dt=f(g(x))g'(x)-f(h(x))h'(x)`], { note: 'Top bound minus bottom bound, each with its own chain factor.' }),
      entry('mvt-integrals', 'MVT for integrals', 5, [String.raw`f\text{ continuous on }[a,b]\Longrightarrow\exists c\in[a,b]:\;f(c)=f_{\mathrm{avg}}`]),
    ],
  },
  {
    id: 'series-tests', category: 'series', title: 'Series convergence tests', entries: [
      entry('nth-term-test', 'nth-term (divergence) test', 8, [String.raw`\lim_{n\to\infty}a_n\ne0\text{ or DNE}\Longrightarrow\textstyle\sum a_n\text{ diverges}`], { note: 'If the limit IS 0 the test says nothing. It can never prove convergence.' }),
      entry('geometric-test', 'Geometric series', 8, [String.raw`\sum_{n=0}^{\infty}ar^n=\frac{a}{1-r}\quad(|r|<1)`, String.raw`|r|\ge1\Longrightarrow\text{diverges}`], { deriveRoute: 'geometric-series' }),
      entry('p-series', 'p-series', 8, [String.raw`\sum\frac1{n^p}\text{ converges}\iff p>1`], { note: 'p = 1 is the harmonic series, and it diverges.' }),
      entry('integral-test', 'Integral test', 8, [String.raw`f\text{ positive, continuous, decreasing on }[k,\infty),\;f(n)=a_n`, String.raw`\textstyle\sum a_n\text{ and }\int_k^{\infty}f(x)\,dx\text{ both converge or both diverge}`], { note: 'The integral is not the sum. It only decides convergence.' }),
      entry('direct-comparison', 'Direct comparison', 8, [String.raw`0\le a_n\le b_n:\quad\textstyle\sum b_n\text{ converges}\Longrightarrow\sum a_n\text{ converges}`, String.raw`\textstyle\sum a_n\text{ diverges}\Longrightarrow\sum b_n\text{ diverges}`]),
      entry('limit-comparison', 'Limit comparison', 8, [String.raw`a_n,b_n>0,\;\lim\frac{a_n}{b_n}=L,\;0<L<\infty`, String.raw`\Longrightarrow\text{both converge or both diverge}`]),
      entry('alternating-test', 'Alternating series test', 8, [String.raw`\sum(-1)^n b_n,\;b_n>0\text{ converges if }b_n\text{ is eventually decreasing and }\lim b_n=0`]),
      entry('ratio-test', 'Ratio test', 8, [String.raw`L=\lim\left|\frac{a_{n+1}}{a_n}\right|`, String.raw`L<1\text{ converges absolutely},\;L>1\text{ diverges},\;L=1\text{ inconclusive}`]),
      entry('root-test', 'Root test', 8, [String.raw`L=\lim\sqrt[n]{|a_n|}`, String.raw`\text{same conclusions as the ratio test}`]),
      entry('absolute-conditional', 'Absolute vs conditional', 8, [String.raw`\textstyle\sum|a_n|\text{ converges}\Longrightarrow\text{absolute convergence}`, String.raw`\textstyle\sum a_n\text{ converges but }\sum|a_n|\text{ diverges}\Longrightarrow\text{conditional}`]),
    ],
  },
  {
    id: 'taylor', category: 'series', title: 'Taylor & Maclaurin', entries: [
      entry('taylor-series', 'Taylor series', 8, [String.raw`f(x)=\sum_{n=0}^{\infty}\frac{f^{(n)}(a)}{n!}(x-a)^n`, String.raw`P_n(x)=\sum_{k=0}^{n}\frac{f^{(k)}(a)}{k!}(x-a)^k`], { note: 'Maclaurin is the case a = 0.' }),
      entry('maclaurin-exp', 'Maclaurin: eˣ', 8, [String.raw`e^x=\sum_{n=0}^{\infty}\frac{x^n}{n!}=1+x+\frac{x^2}{2!}+\frac{x^3}{3!}+\cdots`], { deriveRoute: 'exp-over-x', note: 'All x.' }),
      entry('maclaurin-sin', 'Maclaurin: sin x', 8, [String.raw`\sin x=\sum_{n=0}^{\infty}\frac{(-1)^n x^{2n+1}}{(2n+1)!}=x-\frac{x^3}{3!}+\frac{x^5}{5!}-\cdots`], { deriveRoute: 'sin-over-x', note: 'All x. The leading term x is why sin x / x → 1.' }),
      entry('maclaurin-cos', 'Maclaurin: cos x', 8, [String.raw`\cos x=\sum_{n=0}^{\infty}\frac{(-1)^n x^{2n}}{(2n)!}=1-\frac{x^2}{2!}+\frac{x^4}{4!}-\cdots`], { deriveRoute: 'cos-over-x2', note: 'All x. The x²/2 term is why (1 − cos x)/x² → ½.' }),
      entry('maclaurin-geometric', 'Maclaurin: 1/(1 − x)', 8, [String.raw`\frac1{1-x}=\sum_{n=0}^{\infty}x^n=1+x+x^2+x^3+\cdots\quad(|x|<1)`], { deriveRoute: 'geometric-series' }),
      entry('maclaurin-log', 'Maclaurin: ln(1 + x)', 8, [String.raw`\ln(1+x)=\sum_{n=1}^{\infty}\frac{(-1)^{n+1}x^n}{n}=x-\frac{x^2}{2}+\frac{x^3}{3}-\cdots\quad(-1<x\le1)`], { deriveRoute: 'log-over-x' }),
      entry('maclaurin-arctan', 'Maclaurin: arctan x', 8, [String.raw`\tan^{-1}x=\sum_{n=0}^{\infty}\frac{(-1)^n x^{2n+1}}{2n+1}=x-\frac{x^3}{3}+\frac{x^5}{5}-\cdots\quad(|x|\le1)`]),
      entry('radius-interval', 'Radius & interval of convergence', 8, [String.raw`\text{Ratio test on }\textstyle\sum c_n(x-a)^n,\text{ solve }L<1`, String.raw`|x-a|<R\text{ converges},\quad|x-a|>R\text{ diverges}`], { note: 'Test the endpoints x = a ± R separately by substitution. R = 0 and R = ∞ are both possible.' }),
      entry('alternating-error', 'Alternating series error', 8, [String.raw`|S-S_n|\le b_{n+1}`], { note: 'At most the first omitted term — but only when the AST conditions hold.' }),
      entry('lagrange-error', 'Lagrange error bound', 8, [String.raw`|f(x)-P_n(x)|\le\frac{\max\left|f^{(n+1)}(z)\right|}{(n+1)!}\,|x-a|^{n+1}`], { note: 'z is between a and x.' }),
    ],
  },
  {
    id: 'parametric-polar', category: 'applications', title: 'Parametric & polar', entries: [
      entry('parametric-derivative', 'Parametric derivatives', 8, [String.raw`\frac{dy}{dx}=\frac{dy/dt}{dx/dt}\quad(dx/dt\ne0)`, String.raw`\frac{d^2y}{dx^2}=\frac{\frac{d}{dt}\!\left(\frac{dy}{dx}\right)}{dx/dt}`], { note: 'The second derivative is NOT the quotient of the two second derivatives.' }),
      entry('parametric-motion', 'Velocity, acceleration, speed', 8, [String.raw`\langle x'(t),y'(t)\rangle,\quad\langle x''(t),y''(t)\rangle`, String.raw`\text{speed}=\sqrt{[x'(t)]^2+[y'(t)]^2}`]),
      entry('parametric-arc', 'Parametric arc length', 8, [String.raw`L=\int_a^b\sqrt{\left(\frac{dx}{dt}\right)^2+\left(\frac{dy}{dt}\right)^2}\,dt`], { note: 'Same integral gives total distance travelled.' }),
      entry('parametric-position', 'Recovering position', 8, [String.raw`x(t)=x(t_0)+\int_{t_0}^{t}x'(\tau)\,d\tau`], { note: 'Same for y.' }),
      entry('polar-conversion', 'Polar ↔ Cartesian', 8, [String.raw`x=r\cos\theta,\quad y=r\sin\theta`, String.raw`r^2=x^2+y^2,\quad\tan\theta=\frac yx`], { deriveRoute: 'unit-circle' }),
      entry('polar-area', 'Polar area', 8, [String.raw`A=\frac12\int_\alpha^\beta r^2\,d\theta`, String.raw`A=\frac12\int_\alpha^\beta\left(r_{\text{outer}}^2-r_{\text{inner}}^2\right)d\theta`]),
      entry('polar-slope', 'Polar slope', 8, [String.raw`x=r(\theta)\cos\theta,\;y=r(\theta)\sin\theta,\quad\frac{dy}{dx}=\frac{dy/d\theta}{dx/d\theta}`]),
      entry('cartesian-arc', 'Arc length (Cartesian)', 8, [String.raw`L=\int_a^b\sqrt{1+[f'(x)]^2}\,dx`, String.raw`L=\int_c^d\sqrt{1+[g'(y)]^2}\,dy`]),
    ],
  },
  {
    id: 'differential-equations', category: 'applications', title: 'Differential equations', entries: [
      entry('separable', 'Separable equations', 8, [String.raw`\frac{dy}{dx}=f(x)g(y)\Longrightarrow\int\frac{dy}{g(y)}=\int f(x)\,dx`]),
      entry('slope-field', 'Slope field', 8, [String.raw`\text{At each }(x,y)\text{ draw a short segment of slope }\frac{dy}{dx}`]),
      entry('euler', "Euler's method", 8, [String.raw`x_{n+1}=x_n+h`, String.raw`y_{n+1}=y_n+h\,f(x_n,y_n)`], { note: 'Step along the tangent line. Smaller h, smaller error.' }),
      entry('logistic', 'Logistic growth', 8, [String.raw`\frac{dP}{dt}=kP\left(1-\frac PL\right)`, String.raw`P(t)=\frac{L}{1+Ae^{-kt}},\quad A=\frac{L-P_0}{P_0}`], { note: 'Carrying capacity L; fastest growth at P = L/2.' }),
    ],
  },
  {
    id: 'improper-partial', category: 'integrals', title: 'Improper integrals & partial fractions', entries: [
      entry('improper-infinite', 'Infinite bound', 8, [String.raw`\int_a^{\infty}f(x)\,dx=\lim_{b\to\infty}\int_a^b f(x)\,dx`, String.raw`\int_{-\infty}^{\infty}f\,dx=\int_{-\infty}^{c}f\,dx+\int_c^{\infty}f\,dx`], { note: 'For the two-sided one, BOTH halves must converge.' }),
      entry('improper-discontinuity', 'Infinite discontinuity', 8, [String.raw`\int_a^b f\,dx=\lim_{t\to b^-}\int_a^t f\,dx`], { deriveRoute: 'infinite-limits', note: 'Converges exactly when that limit is finite.' }),
      entry('partial-fractions', 'Partial fractions', 8, [String.raw`\frac{P(x)}{(x-r_1)(x-r_2)}=\frac{A}{x-r_1}+\frac{B}{x-r_2}`, String.raw`\frac{P(x)}{(x-r)^2}=\frac{A}{x-r}+\frac{B}{(x-r)^2}`], { note: 'Needs deg P < deg Q. Otherwise divide first.' }),
    ],
  },
  {
    id: 'numeric', category: 'applications', title: 'Riemann sums & approximation', entries: [
      entry('riemann-sums', 'Riemann sums', 8, [String.raw`\Delta x=\frac{b-a}{n},\quad x_i=a+i\Delta x`, String.raw`\text{Left}:\;\Delta x[f(x_0)+\cdots+f(x_{n-1})]`, String.raw`\text{Right}:\;\Delta x[f(x_1)+\cdots+f(x_n)]`, String.raw`\text{Midpoint}:\;\Delta x\left[f\!\left(\tfrac{x_0+x_1}{2}\right)+\cdots\right]`], { deriveRoute: 'riemann-sum' }),
      entry('trapezoid', 'Trapezoidal rule', 8, [String.raw`\frac{\Delta x}{2}\bigl[f(x_0)+2f(x_1)+\cdots+2f(x_{n-1})+f(x_n)\bigr]`], { note: 'Unequal widths: add ½(width)(left + right height) per strip.' }),
      entry('over-under', 'Over or under?', 8, [String.raw`f\text{ increasing}:\;\text{left under},\;\text{right over}`, String.raw`f\text{ concave up}:\;\text{trapezoid over},\;\text{midpoint under}`], { deriveRoute: 'increasing' }),
      entry('linearization', 'Linearization', 8, [String.raw`L(x)=f(a)+f'(a)(x-a)`, String.raw`f(x)\approx L(x)\text{ for }x\text{ near }a`], { deriveRoute: 'secant-to-tangent' }),
      entry('differentials', 'Differentials', 8, [String.raw`dy=f'(x)\,dx,\quad\Delta y\approx dy`]),
      entry('linearization-error', 'Does the tangent over- or under-estimate?', 8, [String.raw`\text{concave up at }a:\;\text{tangent below the curve}\Rightarrow L\text{ underestimates}`, String.raw`\text{concave down at }a:\;L\text{ overestimates}`]),
      entry('related-rates', 'Related rates', 8, [String.raw`\text{Differentiate the relating equation with respect to }t`], { note: 'Substitute the known values LAST, then solve for the unknown rate.' }),
    ],
  },
  {
    id: 'unit-circle', category: 'trigonometry', title: 'Unit circle reference', entries: [
      entry('unit-circle-coordinates', 'Special-angle coordinates', 7, [
        String.raw`P(\theta)=(\cos\theta,\sin\theta)`,
        String.raw`0:(1,0)\quad \frac\pi6:\left(\frac{\sqrt3}2,\frac12\right)\quad \frac\pi4:\left(\frac{\sqrt2}2,\frac{\sqrt2}2\right)`,
        String.raw`\frac\pi3:\left(\frac12,\frac{\sqrt3}2\right)\quad \frac\pi2:(0,1)`,
        String.raw`\frac{2\pi}3:\left(-\frac12,\frac{\sqrt3}2\right)\quad \frac{3\pi}4:\left(-\frac{\sqrt2}2,\frac{\sqrt2}2\right)\quad \frac{5\pi}6:\left(-\frac{\sqrt3}2,\frac12\right)`,
        String.raw`\pi:(-1,0)\quad \frac{7\pi}6:\left(-\frac{\sqrt3}2,-\frac12\right)\quad \frac{5\pi}4:\left(-\frac{\sqrt2}2,-\frac{\sqrt2}2\right)`,
        String.raw`\frac{4\pi}3:\left(-\frac12,-\frac{\sqrt3}2\right)\quad \frac{3\pi}2:(0,-1)`,
        String.raw`\frac{5\pi}3:\left(\frac12,-\frac{\sqrt3}2\right)\quad \frac{7\pi}4:\left(\frac{\sqrt2}2,-\frac{\sqrt2}2\right)\quad \frac{11\pi}6:\left(\frac{\sqrt3}2,-\frac12\right)`,
        String.raw`2\pi:(1,0)`,
      ], { deriveRoute: 'unit-circle' }),
      entry('quadrant-signs', 'Quadrant signs', 7, [String.raw`I:(+,+)\quad II:(-,+)\quad III:(-,-)\quad IV:(+,-)`], { deriveRoute: 'unit-circle' }),
      entry('degree-radian-landmarks', 'Degrees ↔ radians', 7, [
        String.raw`0,\frac\pi6,\frac\pi4,\frac\pi3,\frac\pi2,\frac{2\pi}3,\frac{3\pi}4,\frac{5\pi}6,\pi`,
        String.raw`0^\circ,30^\circ,45^\circ,60^\circ,90^\circ,120^\circ,135^\circ,150^\circ,180^\circ`,
        String.raw`\frac{7\pi}6,\frac{5\pi}4,\frac{4\pi}3,\frac{3\pi}2,\frac{5\pi}3,\frac{7\pi}4,\frac{11\pi}6,2\pi`,
        String.raw`210^\circ,225^\circ,240^\circ,270^\circ,300^\circ,315^\circ,330^\circ,360^\circ`,
      ]),
    ],
  },
  {
    id: 'trig-identities', category: 'trigonometry', title: 'Trigonometric identities', entries: [
      entry('tan-cot', 'Tangent & cotangent', 7, [String.raw`\tan\theta=\frac{\sin\theta}{\cos\theta}`, String.raw`\cot\theta=\frac{\cos\theta}{\sin\theta}`]),
      entry('reciprocal-identities', 'Reciprocal identities', 7, [String.raw`\csc\theta=\frac1{\sin\theta},\quad\sin\theta=\frac1{\csc\theta}`, String.raw`\sec\theta=\frac1{\cos\theta},\quad\cos\theta=\frac1{\sec\theta}`, String.raw`\cot\theta=\frac1{\tan\theta},\quad\tan\theta=\frac1{\cot\theta}`]),
      entry('pythagorean-identities', 'Pythagorean identities', 7, [String.raw`\sin^2\theta+\cos^2\theta=1`, String.raw`\tan^2\theta+1=\sec^2\theta`, String.raw`1+\cot^2\theta=\csc^2\theta`], { deriveRoute: 'unit-circle' }),
      entry('even-odd', 'Even / odd identities', 7, [String.raw`\sin(-\theta)=-\sin\theta,\quad\cos(-\theta)=\cos\theta`, String.raw`\tan(-\theta)=-\tan\theta,\quad\cot(-\theta)=-\cot\theta`, String.raw`\csc(-\theta)=-\csc\theta,\quad\sec(-\theta)=\sec\theta`]),
      entry('periodic-identities', 'Periodicity', 7, [String.raw`\sin(\theta+2\pi n)=\sin\theta,\quad\cos(\theta+2\pi n)=\cos\theta`, String.raw`\csc(\theta+2\pi n)=\csc\theta,\quad\sec(\theta+2\pi n)=\sec\theta`, String.raw`\tan(\theta+\pi n)=\tan\theta,\quad\cot(\theta+\pi n)=\cot\theta`], { deriveRoute: 'unit-circle' }),
      entry('double-angle', 'Double-angle identities', 7, [String.raw`\sin2\theta=2\sin\theta\cos\theta`, String.raw`\cos2\theta=\cos^2\theta-\sin^2\theta=2\cos^2\theta-1=1-2\sin^2\theta`, String.raw`\tan2\theta=\frac{2\tan\theta}{1-\tan^2\theta}`]),
      entry('degree-radian', 'Degrees to radians', 7, [String.raw`\frac\pi{180}=\frac tx\Longrightarrow t=\frac{\pi x}{180},\quad x=\frac{180t}{\pi}`]),
      entry('half-angle-tangent', 'Tangent half-angle', 7, [String.raw`\tan\frac A2=\frac{\sin A}{1+\cos A}=\frac{1-\cos A}{\sin A}`]),
      entry('half-angle', 'Half-angle identities', 7, [String.raw`\sin\frac\theta2=\pm\sqrt{\frac{1-\cos\theta}2}`, String.raw`\cos\frac\theta2=\pm\sqrt{\frac{1+\cos\theta}2}`, String.raw`\tan\frac\theta2=\pm\sqrt{\frac{1-\cos\theta}{1+\cos\theta}}`, String.raw`\sin^2\theta=\frac{1-\cos2\theta}2,\quad\cos^2\theta=\frac{1+\cos2\theta}2`, String.raw`\tan^2\theta=\frac{1-\cos2\theta}{1+\cos2\theta}`]),
      entry('sum-difference', 'Sum & difference', 7, [String.raw`\sin(\alpha\pm\beta)=\sin\alpha\cos\beta\pm\cos\alpha\sin\beta`, String.raw`\cos(\alpha\pm\beta)=\cos\alpha\cos\beta\mp\sin\alpha\sin\beta`, String.raw`\tan(\alpha\pm\beta)=\frac{\tan\alpha\pm\tan\beta}{1\mp\tan\alpha\tan\beta}`]),
      entry('product-to-sum', 'Product to sum', 7, [String.raw`\sin\alpha\sin\beta=\frac12[\cos(\alpha-\beta)-\cos(\alpha+\beta)]`, String.raw`\cos\alpha\cos\beta=\frac12[\cos(\alpha-\beta)+\cos(\alpha+\beta)]`, String.raw`\sin\alpha\cos\beta=\frac12[\sin(\alpha+\beta)+\sin(\alpha-\beta)]`, String.raw`\cos\alpha\sin\beta=\frac12[\sin(\alpha+\beta)-\sin(\alpha-\beta)]`]),
      entry('sum-to-product', 'Sum to product', 7, [String.raw`\sin\alpha+\sin\beta=2\sin\frac{\alpha+\beta}2\cos\frac{\alpha-\beta}2`, String.raw`\sin\alpha-\sin\beta=2\cos\frac{\alpha+\beta}2\sin\frac{\alpha-\beta}2`, String.raw`\cos\alpha+\cos\beta=2\cos\frac{\alpha+\beta}2\cos\frac{\alpha-\beta}2`, String.raw`\cos\alpha-\cos\beta=-2\sin\frac{\alpha+\beta}2\sin\frac{\alpha-\beta}2`]),
      entry('cofunction', 'Cofunction identities', 7, [String.raw`\sin\left(\frac\pi2-\theta\right)=\cos\theta,\quad\cos\left(\frac\pi2-\theta\right)=\sin\theta`, String.raw`\csc\left(\frac\pi2-\theta\right)=\sec\theta,\quad\sec\left(\frac\pi2-\theta\right)=\csc\theta`, String.raw`\tan\left(\frac\pi2-\theta\right)=\cot\theta,\quad\cot\left(\frac\pi2-\theta\right)=\tan\theta`]),
    ],
  },
];

export const FORMULA_CATEGORIES: readonly { readonly id: 'all' | FormulaCategory; readonly label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'derivatives', label: 'Derivatives' },
  { id: 'theorems', label: 'Theorems' },
  { id: 'integrals', label: 'Integrals' },
  { id: 'geometry', label: 'Area & volume' },
  { id: 'series', label: 'Series' },
  { id: 'applications', label: 'Applications' },
  { id: 'trigonometry', label: 'Trig' },
];

export function searchFormulaSections(
  query: string,
  category: 'all' | FormulaCategory = 'all',
): readonly FormulaSection[] {
  const needle = query.trim().toLocaleLowerCase();
  return FORMULA_SECTIONS.filter((section) => category === 'all' || section.category === category)
    .map((section) => ({
      ...section,
      entries: section.entries.filter((item) => {
        if (!needle) return true;
        return [item.title, ...item.tex, ...(item.search ?? [])].join(' ').toLocaleLowerCase().includes(needle);
      }),
    }))
    .filter((section) => section.entries.length > 0);
}
