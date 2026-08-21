export type NotationCategory = 'operators' | 'change' | 'relations' | 'structure' | 'greek';

export interface NotationEntry {
  readonly id: string;
  readonly category: NotationCategory;
  readonly symbol: string;
  readonly name: string;
  readonly say: string;
  readonly means: string;
  readonly example: string;
  readonly confusion: string;
  readonly whyLink?: string;
}

export const NOTATION_CATEGORIES: readonly {
  readonly id: 'all' | NotationCategory;
  readonly label: string;
}[] = [
  { id: 'all', label: 'All' },
  { id: 'operators', label: 'Operators' },
  { id: 'change', label: 'Change & limits' },
  { id: 'relations', label: 'Relations & logic' },
  { id: 'structure', label: 'Functions & structure' },
  { id: 'greek', label: 'Greek alphabet' },
];

export const NOTATION_ENTRIES: readonly NotationEntry[] = [
  {
    id: 'natural-log', category: 'operators', symbol: String.raw`\ln`, name: 'Natural logarithm', say: '“ell en”, or “natural log”',
    means: 'The logarithm whose base is e — the area under 1/x from 1 out to the input.',
    example: String.raw`\int \frac{dx}{x} = \ln|x| + C`,
    confusion: 'It is not an abbreviation of “line”, and ln x is not log x times n. It is one symbol naming one specific logarithm.',
    whyLink: 'log-integral',
  },
  {
    id: 'euler-number', category: 'operators', symbol: String.raw`e`, name: 'Euler’s number', say: '“ee”, the letter — never “eee” or “exp”',
    means: 'The point where the running area under 1/x first reaches exactly 1, so e ≈ 2.718282.',
    example: String.raw`\int_1^{e} \frac{dx}{x} = 1`,
    confusion: 'It was not chosen for convenience and it is not a variable. The area condition pins it down; nothing else could be the base.',
    whyLink: 'log-integral',
  },
  {
    id: 'integral', category: 'operators', symbol: String.raw`\int`, name: 'Integral sign', say: '“integral”',
    means: 'A stretched S from the Latin summa: add infinitely thin pieces.',
    example: String.raw`\int_0^2 f(x)\,dx`,
    confusion: 'It is not a special division sign or bracket. It is the same adding idea as Σ after the pieces shrink.',
    whyLink: 'riemann-sum',
  },
  {
    id: 'sigma', category: 'operators', symbol: String.raw`\sum`, name: 'Sigma / summation', say: '“sum from … to …”',
    means: 'Uppercase Greek S: add the listed terms between the starting and ending indices.',
    example: String.raw`\sum_{i=1}^{n} a_i`,
    confusion: 'Σ and ∫ are not unrelated systems. They are the discrete and limiting stages of the same adding process.',
    whyLink: 'riemann-sum',
  },
  {
    id: 'limit', category: 'operators', symbol: String.raw`\lim_{x\to a}`, name: 'Limit', say: '“the limit as x approaches a”',
    means: 'The value the outputs approach while x moves as close to a as needed.',
    example: String.raw`\lim_{x\to 1}\frac{x^2-1}{x-1}=2`,
    confusion: 'x → a does not mean “plug in a.” The function can have no value at a while the limit still exists.',
    whyLink: 'limits',
  },
  {
    id: 'leibniz-derivative', category: 'operators', symbol: String.raw`\frac{d}{dx}`, name: 'Leibniz derivative notation', say: '“dee by dee ex”',
    means: 'An operator asking for the rate of change with respect to x.',
    example: String.raw`\frac{d}{dx}[x^2]=2x`,
    confusion: 'It is not an ordinary fraction, although its fraction-like behavior can help organize the chain rule.',
    whyLink: 'derivative',
  },
  {
    id: 'prime', category: 'operators', symbol: String.raw`f'`, name: 'Lagrange derivative notation', say: '“eff prime”',
    means: 'The derivative function that returns the instantaneous rate at each input.',
    example: String.raw`f'(2)=4`,
    confusion: 'f′(x) is a new function; it becomes one number only after an input such as x = 2 is specified.',
    whyLink: 'derivative',
  },
  {
    id: 'partial', category: 'operators', symbol: String.raw`\partial`, name: 'Partial derivative', say: '“partial”',
    means: 'A derivative with respect to one variable while the other variables are held fixed.',
    example: String.raw`\frac{\partial f}{\partial x}`,
    confusion: 'It is not a decorative curly d. It signals that the function depends on more than one input.',
  },

  {
    id: 'delta-x', category: 'change', symbol: String.raw`\Delta x`, name: 'Finite change in x', say: '“delta ex”',
    means: 'A real, measurable width between two x-values.',
    example: String.raw`\Delta x=\frac{b-a}{n}`,
    confusion: 'Δx is a finite interval you can still measure. It has not yet been sent toward zero.',
    whyLink: 'riemann-sum',
  },
  {
    id: 'dx', category: 'change', symbol: String.raw`dx`, name: 'Differential of x', say: '“dee ex”',
    means: 'What Δx becomes in the limiting process; it names the integration variable and carries width units.',
    example: String.raw`\int v(t)\,dt`,
    confusion: 'dx is not decoration and it does not mean “times x.” Changing dx to dt changes which variable is being accumulated.',
    whyLink: 'riemann-sum',
  },
  {
    id: 'epsilon-delta-pair', category: 'change', symbol: String.raw`\varepsilon,\delta`, name: 'Epsilon–delta pair', say: '“epsilon and delta”',
    means: 'ε sets an output challenge; δ answers with a small enough input distance.',
    example: String.raw`0<|x-a|<\delta\Rightarrow |f(x)-L|<\varepsilon`,
    confusion: 'They are not two tiny numbers chosen at random: ε is chosen first, and δ must respond to that exact challenge.',
    whyLink: 'epsilon-delta',
  },
  {
    id: 'approaches', category: 'change', symbol: String.raw`\to`, name: 'Approaches', say: '“approaches” or “goes to”',
    means: 'A quantity can be made arbitrarily close to a target.',
    example: String.raw`x\to a`,
    confusion: 'The arrow does not mean equals. x may keep changing and may never actually take the target value.',
    whyLink: 'limits',
  },

  {
    id: 'approximately', category: 'relations', symbol: String.raw`\approx`, name: 'Approximately equal', say: '“is approximately equal to”',
    means: 'Two values are close at the stated precision but are not exactly equal.',
    example: String.raw`\pi\approx3.14159`,
    confusion: '≈ is not permission to replace = everywhere; an approximation carries rounding or estimation error.',
  },
  {
    id: 'less-equal', category: 'relations', symbol: String.raw`\le`, name: 'Less than or equal to', say: '“is less than or equal to”',
    means: 'The left side may be smaller than the right side or exactly the same.',
    example: String.raw`R_n\le A\le L_n`,
    confusion: 'The equality bar matters: the boundary value is included, unlike with the strict symbol <.',
    whyLink: 'riemann-sum',
  },
  {
    id: 'element-of', category: 'relations', symbol: String.raw`\in`, name: 'Element of', say: '“is an element of” or “is in”',
    means: 'The object on the left belongs to the set on the right.',
    example: String.raw`x\in[0,2]`,
    confusion: '∈ does not mean two expressions are equal; it states membership in a collection of allowed values.',
  },
  {
    id: 'implies', category: 'relations', symbol: String.raw`\Rightarrow`, name: 'Implies', say: '“implies”',
    means: 'If the statement on the left is true, the statement on the right must follow.',
    example: String.raw`f'(x)>0\Rightarrow f\text{ increases}`,
    confusion: 'A ⇒ B does not automatically give B ⇒ A. Reversing an implication requires a separate argument.',
  },
  {
    id: 'iff', category: 'relations', symbol: String.raw`\Longleftrightarrow`, name: 'If and only if', say: '“if and only if”',
    means: 'Each statement implies the other; both directions are true.',
    example: String.raw`x=0\Longleftrightarrow |x|=0`,
    confusion: '⟺ is stronger than ⇒ because it promises both directions, not just a one-way consequence.',
  },
  {
    id: 'therefore', category: 'relations', symbol: String.raw`\therefore`, name: 'Therefore', say: '“therefore”',
    means: 'The next statement is the conclusion supported by what came before.',
    example: String.raw`L_n-R_n\to0\;\therefore\;A\text{ is unique}`,
    confusion: '∴ does not create a conclusion by itself; the preceding steps still have to logically justify it.',
  },
  {
    id: 'absolute-value', category: 'relations', symbol: String.raw`|x|`, name: 'Absolute value', say: '“the absolute value of x”',
    means: 'The distance from x to zero on the number line.',
    example: String.raw`|-3|=3`,
    confusion: 'It does not mean “erase the minus sign.” Distance explains why |x| is nonnegative for every x.',
  },
  {
    id: 'infinity', category: 'relations', symbol: String.raw`\infty`, name: 'Infinity', say: '“infinity”',
    means: 'Unbounded growth: values can exceed every fixed finite bound.',
    example: String.raw`n\to\infty`,
    confusion: '∞ is not a number you can substitute and calculate with like 7; it describes unbounded behavior.',
    whyLink: 'limits',
  },

  {
    id: 'inverse-function', category: 'structure', symbol: String.raw`f^{-1}`, name: 'Inverse function', say: '“eff inverse”',
    means: 'A function that reverses the input–output action of f.',
    example: String.raw`f^{-1}(f(x))=x`,
    confusion: 'f⁻¹ is not 1/f. A negative-one superscript on a function names its inverse, not a reciprocal.',
  },
  {
    id: 'nth-derivative', category: 'structure', symbol: String.raw`f^{(n)}`, name: 'Nth derivative', say: '“the nth derivative of eff”',
    means: 'The result of differentiating f repeatedly n times.',
    example: String.raw`f^{(3)}=f'''`,
    confusion: 'Parenthesized (n) counts derivatives; it does not raise the function value to the nth power.',
    whyLink: 'derivative',
  },
  {
    id: 'intervals', category: 'structure', symbol: String.raw`[a,b]\quad(a,b)`, name: 'Closed and open intervals', say: '“the closed interval a to b; the open interval a to b”',
    means: 'Square brackets include endpoints; parentheses exclude endpoints.',
    example: String.raw`x\in[0,1]\quad\text{but}\quad x\in(0,1)`,
    confusion: '(a,b) can also name a coordinate point. The surrounding context tells interval from ordered pair.',
  },
  {
    id: 'bounds-and-indices', category: 'structure', symbol: String.raw`\int_a^b\quad\sum_{i=1}^{n}`, name: 'Bounds and indices', say: '“integral from a to b; sum from i equals one to n”',
    means: 'Lower marks show where to start; upper marks show where to stop or approach.',
    example: String.raw`\int_0^2 f(x)\,dx\quad\sum_{i=1}^{4}a_i`,
    confusion: 'The small symbols are instructions, not exponents: they set the interval or index range for the operation.',
    whyLink: 'riemann-sum',
  },
  {
    id: 'piecewise', category: 'structure', symbol: String.raw`\begin{cases}x,&x<0\\x^2,&x\ge0\end{cases}`, name: 'Piecewise definition', say: '“f of x equals … when … and … when …”',
    means: 'One function uses different rules on different parts of its domain.',
    example: String.raw`f(x)=\begin{cases}x,&x<0\\x^2,&x\ge0\end{cases}`,
    confusion: 'The brace does not mean choose whichever rule you prefer; each condition determines exactly which rule applies.',
    whyLink: 'limits',
  },

  {
    id: 'greek-theta', category: 'greek', symbol: String.raw`\theta`, name: 'Theta', say: '“THAY-tuh”',
    means: 'A Greek letter often used for an angle.', example: String.raw`\theta=\frac{\pi}{3}`,
    confusion: 'θ is a variable, not the digit zero. In trigonometry it usually measures an angle in radians.', whyLink: 'unit-circle',
  },
  {
    id: 'greek-pi', category: 'greek', symbol: String.raw`\pi`, name: 'Pi', say: '“pie”',
    means: 'The circle constant: circumference divided by diameter.', example: String.raw`2\pi\text{ radians}`,
    confusion: 'π is an exact irrational number, not exactly 3.14; 3.14 is only a rounded approximation.', whyLink: 'unit-circle',
  },
  {
    id: 'greek-epsilon', category: 'greek', symbol: String.raw`\varepsilon`, name: 'Epsilon', say: '“EP-sih-lon”',
    means: 'A Greek letter commonly used for a small allowed output error.', example: String.raw`|f(x)-L|<\varepsilon`,
    confusion: 'ε is not the Latin letter e and it does not automatically mean one fixed tiny number.', whyLink: 'epsilon-delta',
  },
  {
    id: 'greek-delta', category: 'greek', symbol: String.raw`\delta`, name: 'Lowercase delta', say: '“DEL-tuh”',
    means: 'A Greek letter commonly used for a small allowed input distance.', example: String.raw`|x-a|<\delta`,
    confusion: 'Lowercase δ is a chosen distance, not the differential d and not the finite-change symbol Δ.', whyLink: 'epsilon-delta',
  },
  {
    id: 'greek-capital-delta', category: 'greek', symbol: String.raw`\Delta`, name: 'Capital delta', say: '“DEL-tuh”',
    means: 'A Greek letter used for a finite change between two measured values.', example: String.raw`\Delta y=f(x+\Delta x)-f(x)`,
    confusion: 'Δ is not merely a triangle decoration; it names a finite before-to-after change.', whyLink: 'derivative',
  },
  {
    id: 'greek-capital-sigma', category: 'greek', symbol: String.raw`\Sigma`, name: 'Capital sigma', say: '“SIG-muh”',
    means: 'Uppercase Greek S, used as the summation operator.', example: String.raw`\Sigma\;\longrightarrow\;\int`,
    confusion: 'Σ is not the Latin letter E. Its S-shape is a reminder that it means sum.', whyLink: 'riemann-sum',
  },
  {
    id: 'greek-lambda', category: 'greek', symbol: String.raw`\lambda`, name: 'Lambda', say: '“LAM-duh”',
    means: 'A Greek letter often used for a parameter, wavelength, or eigenvalue.', example: String.raw`f_\lambda(x)`,
    confusion: 'λ is a variable whose meaning comes from the problem; it is not an upside-down y with a fixed value.',
  },
  {
    id: 'greek-phi', category: 'greek', symbol: String.raw`\phi\;\varphi`, name: 'Phi', say: '“fie” or “fee,” depending on convention',
    means: 'A Greek letter often used for an angle or a function.', example: String.raw`\phi=\phi(t)`,
    confusion: 'ϕ and φ are two common printed forms of the same letter, not two different operations.',
  },
];

const SYMBOL_SEARCH_ALIASES: Readonly<Record<string, string>> = {
  integral: '∫',
  sigma: 'Σ',
  limit: 'lim',
  'leibniz-derivative': 'd/dx',
  prime: 'f′',
  partial: '∂',
  'delta-x': 'Δx',
  dx: 'dx',
  'epsilon-delta-pair': 'ε δ ε/δ',
  approaches: '→',
  approximately: '≈',
  'less-equal': '≤',
  'element-of': '∈',
  implies: '⇒',
  iff: '⟺ ⇔',
  therefore: '∴',
  'absolute-value': '|x|',
  infinity: '∞',
  'inverse-function': 'f⁻¹',
  'nth-derivative': 'f⁽ⁿ⁾',
  intervals: '[a,b] (a,b)',
  'bounds-and-indices': '∫ₐᵇ Σ',
  piecewise: '{',
  'greek-theta': 'θ',
  'greek-pi': 'π',
  'greek-epsilon': 'ε',
  'greek-delta': 'δ',
  'greek-capital-delta': 'Δ',
  'greek-capital-sigma': 'Σ',
  'greek-lambda': 'λ',
  'greek-phi': 'φ ϕ',
};

export function searchNotationEntries(
  query: string,
  category: 'all' | NotationCategory = 'all',
): readonly NotationEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return NOTATION_ENTRIES.filter((entry) => category === 'all' || entry.category === category)
    .filter((entry) => {
      if (!needle) return true;
      return [entry.symbol, SYMBOL_SEARCH_ALIASES[entry.id] ?? '', entry.name, entry.say, entry.means, entry.example, entry.confusion]
        .join(' ')
        .toLocaleLowerCase()
        .includes(needle);
    });
}
