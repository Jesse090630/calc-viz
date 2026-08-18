export type FormulaCategory =
  | 'foundations'
  | 'derivatives'
  | 'integrals'
  | 'geometry'
  | 'trigonometry'
  | 'notation';

export interface FormulaEntry {
  readonly id: string;
  readonly title: string;
  readonly tex: readonly string[];
  readonly note?: string;
  readonly deriveRoute?: string;
  readonly sourcePage: 1 | 2 | 3 | 4 | 5;
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
      entry('accumulation-behavior', 'Behavior of accumulation', 1, [String.raw`F\uparrow\iff F'>0\iff f>0`, String.raw`F\downarrow\iff F'<0\iff f<0`, String.raw`F\text{ has extrema when }f\text{ changes sign}`, String.raw`F\text{ concave up/down according as }f'\gtrless0`]),
    ],
  },
  {
    id: 'summations', category: 'foundations', title: 'Summations & series', entries: [
      entry('finite-sums', 'Finite power sums', 1, [String.raw`\sum_{k=1}^n c=nc`, String.raw`\sum_{k=1}^n k=\frac{n(n+1)}2`, String.raw`\sum_{k=1}^n k^2=\frac{n(n+1)(2n+1)}6`, String.raw`\sum_{k=1}^n k^3=\left(\frac{n(n+1)}2\right)^2`]),
      entry('geometric-series', 'Infinite series', 1, [String.raw`\sum_{k=1}^{\infty}r^k=\frac r{1-r}\quad(|r|<1)`, String.raw`\sum_{k=0}^{\infty}r^k=\frac1{1-r}\quad(|r|<1)`, String.raw`\sum_{k=1}^{\infty}\frac1k\text{ diverges}`, String.raw`\sum_{k=1}^{\infty}\frac1{k^2}=\frac{\pi^2}6`]),
      entry('sum-linearity', 'Linearity of summation', 1, [String.raw`\sum(a_k\pm b_k)=\sum a_k\pm\sum b_k`, String.raw`\sum ca_k=c\sum a_k`]),
    ],
  },
  { id: 'derivative-rules', category: 'derivatives', title: 'Derivative rules', entries: ruleEntries(derivativeRules, 2, { 'd-20': 'trig-rates', 'd-21': 'trig-rates' }) },
  {
    id: 'limits-logs-inverses', category: 'derivatives', title: 'Special limits, logs & inverses', entries: [
      entry('special-limits', 'Special trigonometric limits', 2, [String.raw`\lim_{x\to0}\frac{\sin x}{x}=1`, String.raw`\lim_{x\to0}\frac{x}{\sin x}=1`, String.raw`\lim_{x\to0}\frac{1-\cos x}{x}=0`, String.raw`\lim_{x\to0}\frac{x}{1-\cos x}\text{ does not exist}`], { deriveRoute: 'limits' }),
      entry('log-exp-facts', 'Logarithm & exponential facts', 2, [String.raw`\ln1=0`, String.raw`\ln0\text{ is undefined}`, String.raw`e^0=1`, String.raw`\ln(e^a)=a`, String.raw`e^{\ln a}=a\quad(a>0)`]),
      entry('inverse-derivative', 'Derivative of an inverse', 2, [String.raw`(f^{-1})'(x)=\frac1{f'(f^{-1}(x))}`]),
      entry('function-square', 'Square of a function', 2, [String.raw`(g(x))^2=g^2(x)`]),
    ],
  },
  { id: 'indefinite-integrals', category: 'integrals', title: 'Indefinite integrals', entries: ruleEntries(integralRules, 3, { 'i-10': 'trig-rates', 'i-11': 'trig-rates' }) },
  { id: 'definite-integrals', category: 'integrals', title: 'Definite integral properties', entries: ruleEntries(definiteRules, 3, { 'di-01': 'riemann-sum', 'di-14': 'riemann-sum' }) },
  {
    id: 'area-volume', category: 'geometry', title: 'Average, area & volume', entries: [
      entry('average-value', 'Average value', 3, [String.raw`f_{\mathrm{avg}}=\frac1{b-a}\int_a^b f(x)\,dx`]),
      entry('area-between', 'Area between curves', 3, [String.raw`A=\int_a^b[f(x)-g(x)]\,dx\quad(f\ge g)`]),
      entry('disk-volume', 'Disk method', 3, [String.raw`V=\pi\int_a^b R(x)^2\,dx`], { deriveRoute: 'disk-method' }),
      entry('washer-volume', 'Washer method', 3, [String.raw`V=\pi\int_a^b[R(x)^2-r(x)^2]\,dx`], { deriveRoute: 'disk-method' }),
      entry('shell-volume', 'Shell method', 3, [String.raw`V=2\pi\int_a^b R(x)h(x)\,dx`, String.raw`h(x)=f(x)-g(x)`], { deriveRoute: 'shell-method' }),
      entry('cross-section', 'Known cross-sectional area', 3, [String.raw`V=\int_a^b A(x)\,dx`]),
      entry('square-cross-section', 'Square cross sections', 3, [String.raw`V=\int_a^b S(x)^2\,dx`, String.raw`S=f-g`]),
      entry('semicircle-cross-section', 'Semicircle cross sections', 3, [String.raw`V=\int_a^b\frac12\pi r(x)^2\,dx`, String.raw`r=\frac{f-g}2`]),
      entry('rectangle-cross-section', 'Rectangle cross sections', 3, [String.raw`V=\int_a^b w(x)h(x)\,dx`, String.raw`w=f-g`]),
      entry('equilateral-triangle', 'Equilateral triangle cross sections', 3, [String.raw`V=\int_a^b\frac{\sqrt3}{4}S(x)^2\,dx`, String.raw`S=f-g`]),
      entry('isosceles-triangle', 'Isosceles right triangle cross sections', 3, [String.raw`V=\int_a^b\frac12S(x)^2\,dx`, String.raw`S=f-g`]),
    ],
  },
  {
    id: 'unit-circle', category: 'trigonometry', title: 'Unit circle reference', entries: [
      entry('unit-circle-coordinates', 'Special-angle coordinates', 4, [
        String.raw`P(\theta)=(\cos\theta,\sin\theta)`,
        String.raw`0:(1,0)\quad \frac\pi6:\left(\frac{\sqrt3}2,\frac12\right)\quad \frac\pi4:\left(\frac{\sqrt2}2,\frac{\sqrt2}2\right)`,
        String.raw`\frac\pi3:\left(\frac12,\frac{\sqrt3}2\right)\quad \frac\pi2:(0,1)`,
        String.raw`\frac{2\pi}3:\left(-\frac12,\frac{\sqrt3}2\right)\quad \frac{3\pi}4:\left(-\frac{\sqrt2}2,\frac{\sqrt2}2\right)\quad \frac{5\pi}6:\left(-\frac{\sqrt3}2,\frac12\right)`,
        String.raw`\pi:(-1,0)\quad \frac{7\pi}6:\left(-\frac{\sqrt3}2,-\frac12\right)\quad \frac{5\pi}4:\left(-\frac{\sqrt2}2,-\frac{\sqrt2}2\right)`,
        String.raw`\frac{4\pi}3:\left(-\frac12,-\frac{\sqrt3}2\right)\quad \frac{3\pi}2:(0,-1)`,
        String.raw`\frac{5\pi}3:\left(\frac12,-\frac{\sqrt3}2\right)\quad \frac{7\pi}4:\left(\frac{\sqrt2}2,-\frac{\sqrt2}2\right)\quad \frac{11\pi}6:\left(\frac{\sqrt3}2,-\frac12\right)`,
        String.raw`2\pi:(1,0)`,
      ], { deriveRoute: 'unit-circle' }),
      entry('quadrant-signs', 'Quadrant signs', 4, [String.raw`I:(+,+)\quad II:(-,+)\quad III:(-,-)\quad IV:(+,-)`], { deriveRoute: 'unit-circle' }),
      entry('degree-radian-landmarks', 'Degrees ↔ radians', 4, [
        String.raw`0,\frac\pi6,\frac\pi4,\frac\pi3,\frac\pi2,\frac{2\pi}3,\frac{3\pi}4,\frac{5\pi}6,\pi`,
        String.raw`0^\circ,30^\circ,45^\circ,60^\circ,90^\circ,120^\circ,135^\circ,150^\circ,180^\circ`,
        String.raw`\frac{7\pi}6,\frac{5\pi}4,\frac{4\pi}3,\frac{3\pi}2,\frac{5\pi}3,\frac{7\pi}4,\frac{11\pi}6,2\pi`,
        String.raw`210^\circ,225^\circ,240^\circ,270^\circ,300^\circ,315^\circ,330^\circ,360^\circ`,
      ]),
    ],
  },
  {
    id: 'notation', category: 'notation', title: 'How to read the notation', entries: [
      entry('limit-notation', 'Limits', 4, [String.raw`\lim_{x\to a}f(x):\ \text{the limit of }f(x)\text{ as }x\text{ approaches }a`, String.raw`x\to\infty:\ \text{as }x\text{ goes to infinity}`], { deriveRoute: 'limits' }),
      entry('derivative-reading', 'Derivatives', 4, [String.raw`\frac d{dx}[f(x)]:\ \text{derivative of }f\text{ with respect to }x`, String.raw`f'(x):\ \text{“f prime of x”}`, String.raw`\frac{dy}{dx}:\ \text{rate of change of }y\text{ with respect to }x`], { deriveRoute: 'derivative' }),
      entry('integral-reading', 'Integrals', 4, [String.raw`\int f(x)\,dx:\ \text{integral of }f\text{ with respect to }x`, String.raw`dx:\ \text{the variable of integration}`, String.raw`\int_a^b f(x)\,dx:\ \text{evaluate }F(b)-F(a)`], { deriveRoute: 'riemann-sum' }),
      entry('summation-reading', 'Summation', 4, [String.raw`\sum_{k=1}^n a_k:\ \text{sum from }k=1\text{ to }n`, String.raw`k=\text{index},\quad n=\text{number of terms}`]),
      entry('composition-reading', 'Function composition', 4, [String.raw`f(g(x)):\ \text{put }g(x)\text{ into }f\text{; inside first}`]),
      entry('power-reading', 'Powers & parentheses', 4, [String.raw`(g(x))^2=g^2(x):\ \text{square the whole function}`]),
    ],
  },
  {
    id: 'trig-identities', category: 'trigonometry', title: 'Trigonometric identities', entries: [
      entry('tan-cot', 'Tangent & cotangent', 5, [String.raw`\tan\theta=\frac{\sin\theta}{\cos\theta}`, String.raw`\cot\theta=\frac{\cos\theta}{\sin\theta}`]),
      entry('reciprocal-identities', 'Reciprocal identities', 5, [String.raw`\csc\theta=\frac1{\sin\theta},\quad\sin\theta=\frac1{\csc\theta}`, String.raw`\sec\theta=\frac1{\cos\theta},\quad\cos\theta=\frac1{\sec\theta}`, String.raw`\cot\theta=\frac1{\tan\theta},\quad\tan\theta=\frac1{\cot\theta}`]),
      entry('pythagorean-identities', 'Pythagorean identities', 5, [String.raw`\sin^2\theta+\cos^2\theta=1`, String.raw`\tan^2\theta+1=\sec^2\theta`, String.raw`1+\cot^2\theta=\csc^2\theta`], { deriveRoute: 'unit-circle' }),
      entry('even-odd', 'Even / odd identities', 5, [String.raw`\sin(-\theta)=-\sin\theta,\quad\cos(-\theta)=\cos\theta`, String.raw`\tan(-\theta)=-\tan\theta,\quad\cot(-\theta)=-\cot\theta`, String.raw`\csc(-\theta)=-\csc\theta,\quad\sec(-\theta)=\sec\theta`]),
      entry('periodic-identities', 'Periodicity', 5, [String.raw`\sin(\theta+2\pi n)=\sin\theta,\quad\cos(\theta+2\pi n)=\cos\theta`, String.raw`\csc(\theta+2\pi n)=\csc\theta,\quad\sec(\theta+2\pi n)=\sec\theta`, String.raw`\tan(\theta+\pi n)=\tan\theta,\quad\cot(\theta+\pi n)=\cot\theta`], { deriveRoute: 'unit-circle' }),
      entry('double-angle', 'Double-angle identities', 5, [String.raw`\sin2\theta=2\sin\theta\cos\theta`, String.raw`\cos2\theta=\cos^2\theta-\sin^2\theta=2\cos^2\theta-1=1-2\sin^2\theta`, String.raw`\tan2\theta=\frac{2\tan\theta}{1-\tan^2\theta}`]),
      entry('degree-radian', 'Degrees to radians', 5, [String.raw`\frac\pi{180}=\frac tx\Longrightarrow t=\frac{\pi x}{180},\quad x=\frac{180t}{\pi}`]),
      entry('half-angle-tangent', 'Tangent half-angle', 5, [String.raw`\tan\frac A2=\frac{\sin A}{1+\cos A}=\frac{1-\cos A}{\sin A}`]),
      entry('half-angle', 'Half-angle identities', 5, [String.raw`\sin\frac\theta2=\pm\sqrt{\frac{1-\cos\theta}2}`, String.raw`\cos\frac\theta2=\pm\sqrt{\frac{1+\cos\theta}2}`, String.raw`\tan\frac\theta2=\pm\sqrt{\frac{1-\cos\theta}{1+\cos\theta}}`, String.raw`\sin^2\theta=\frac{1-\cos2\theta}2,\quad\cos^2\theta=\frac{1+\cos2\theta}2`, String.raw`\tan^2\theta=\frac{1-\cos2\theta}{1+\cos2\theta}`]),
      entry('sum-difference', 'Sum & difference', 5, [String.raw`\sin(\alpha\pm\beta)=\sin\alpha\cos\beta\pm\cos\alpha\sin\beta`, String.raw`\cos(\alpha\pm\beta)=\cos\alpha\cos\beta\mp\sin\alpha\sin\beta`, String.raw`\tan(\alpha\pm\beta)=\frac{\tan\alpha\pm\tan\beta}{1\mp\tan\alpha\tan\beta}`]),
      entry('product-to-sum', 'Product to sum', 5, [String.raw`\sin\alpha\sin\beta=\frac12[\cos(\alpha-\beta)-\cos(\alpha+\beta)]`, String.raw`\cos\alpha\cos\beta=\frac12[\cos(\alpha-\beta)+\cos(\alpha+\beta)]`, String.raw`\sin\alpha\cos\beta=\frac12[\sin(\alpha+\beta)+\sin(\alpha-\beta)]`, String.raw`\cos\alpha\sin\beta=\frac12[\sin(\alpha+\beta)-\sin(\alpha-\beta)]`]),
      entry('sum-to-product', 'Sum to product', 5, [String.raw`\sin\alpha+\sin\beta=2\sin\frac{\alpha+\beta}2\cos\frac{\alpha-\beta}2`, String.raw`\sin\alpha-\sin\beta=2\cos\frac{\alpha+\beta}2\sin\frac{\alpha-\beta}2`, String.raw`\cos\alpha+\cos\beta=2\cos\frac{\alpha+\beta}2\cos\frac{\alpha-\beta}2`, String.raw`\cos\alpha-\cos\beta=-2\sin\frac{\alpha+\beta}2\sin\frac{\alpha-\beta}2`]),
      entry('cofunction', 'Cofunction identities', 5, [String.raw`\sin\left(\frac\pi2-\theta\right)=\cos\theta,\quad\cos\left(\frac\pi2-\theta\right)=\sin\theta`, String.raw`\csc\left(\frac\pi2-\theta\right)=\sec\theta,\quad\sec\left(\frac\pi2-\theta\right)=\csc\theta`, String.raw`\tan\left(\frac\pi2-\theta\right)=\cot\theta,\quad\cot\left(\frac\pi2-\theta\right)=\tan\theta`]),
    ],
  },
];

export const FORMULA_CATEGORIES: readonly { readonly id: 'all' | FormulaCategory; readonly label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'foundations', label: 'Foundations' },
  { id: 'derivatives', label: 'Derivatives' },
  { id: 'integrals', label: 'Integrals' },
  { id: 'geometry', label: 'Area & volume' },
  { id: 'trigonometry', label: 'Trig' },
  { id: 'notation', label: 'Notation' },
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
