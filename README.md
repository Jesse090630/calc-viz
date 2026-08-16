# Calculus Visual Engine

A step-through **derivation player** for calculus — not a calculator.

Existing tools (GeoGebra, Desmos 3D, volume calculators) show you the *result*: type a function,
get a number and a 3D picture. None of them show you where the formula **came from**, and none of
them let you stop halfway and drag the thing you are confused about.

That gap is this project. Each concept is a **derivation chain** of 6–8 steps. You press → and the
geometry and the symbols change together, one step at a time.

```
2D region  →  one thin rectangle  →  sweep it around the axis  →  a cylindrical shell
          →  label r, h, Δx  →  unroll it into a slab  →  many shells  →  Δx → 0  →  ∫
```

## Status

| Phase | | |
|---|---|---|
| 0 | Environment | ✅ done |
| 1 | Math core (pure functions + tests) | ✅ done |
| 2 | Chain engine | ✅ done |
| 3–4 | Scene layer (Three.js + camera presets) | ✅ done |
| 5 | Shell Method — flagship chain | ✅ done |
| 6 | Verification & polish | 🔶 screenshot loop in place |
| 7 | 5 more concepts | ⬜ next |

## Getting started

```bash
npm install
npm run check     # tsc --noEmit && vitest run   ← run this before every commit
npm run dev       # http://localhost:5173
```

## Project rules

Read [`CLAUDE.md`](./CLAUDE.md) before changing anything. The short version:

1. `src/math/` is pure — no React, no Three.js, no anything renderable. Enforced by
   `src/math/architecture.test.ts`, not by good intentions.
2. No bare formulas in components. If you are typing `2 * Math.PI * x`, you are in the wrong file.
3. `src/engine/` must not know that "shells" exist. It is concept-agnostic.

## Verification

Mathematical claims in this repo are cross-checked by at least two independent paths before they
are trusted. See [`docs/VERIFICATION/`](./docs/VERIFICATION/).

## License

MIT
