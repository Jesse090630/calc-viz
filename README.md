# Calculus Visual Engine

### → **[calcviz.netlify.app](https://calcviz.netlify.app)**

**Where do these formulas come from?**

Every tool I could find for solids of revolution — GeoGebra, Desmos 3D, half a dozen "volume
calculators" — does the same thing: you type a function, it shows you the finished solid and the
answer. None of them show you *where the formula came from*, and none of them let you stop halfway
and drag the thing you're confused about.

That gap is this project.

Each topic is a **derivation chain**: 8–9 steps you walk through with the arrow keys. Every step
moves the geometry and the algebra *at the same time*, and every step answers one question — how
did the previous step turn into this one?

```
2D region → one thin rectangle → sweep it around the axis → a cylindrical shell
          → label r, h, Δx → unroll it into a flat slab → many shells → Δx → 0 → ∫
```

By step 8 the formula `V = 2π∫x·f(x)dx` isn't something you memorised. It's a description of
something you just watched happen.

---

## What's in it

| Topic | The question it answers | |
|---|---|---|
| [Riemann Sums → the Integral](https://calcviz.netlify.app/#/riemann-sum) | Why does adding rectangles become an integral sign? | 8 steps |
| [Shell Method](https://calcviz.netlify.app/#/shell-method) | Why is there a `2πx` in the integral? | 9 steps |
| [Disk Method](https://calcviz.netlify.app/#/disk-method) | How am I supposed to know which method to use? | 8 steps |
| [Secant → Tangent](https://calcviz.netlify.app/#/derivative) | What does it mean for two points to "become" one? | 8 steps |
| [Left and Right Limits](https://calcviz.netlify.app/#/limits) | If there is no value there, what is the limit describing? | 7 steps |
| [The Unit Circle and sin/cos](https://calcviz.netlify.app/#/unit-circle) | Why does going around a circle produce a wave? | 7 steps |

The Riemann, Shell, and Disk chains also accept your own explicit function and interval: each one
recompiles a step-by-step midpoint derivation with an independently checked numerical integral,
while rejecting undefined, divergent, or geometrically invalid inputs before they enter the scene.
Verified presets and “Try this” examples provide a low-friction starting point before students edit
the expression themselves.

Three things in here I haven't seen taught anywhere else, all of which fell out of building it:

**The squeeze is the proof, not the picture.** Riemann sums are usually motivated by "the
rectangles fit better and better", which is a feeling, not an argument. For a decreasing `f` the
left sum always overestimates and the right sum always underestimates, so the true area is
*trapped*. The width of that trap is exactly `(f(a) − f(b))·Δx` — proportional to `Δx`, therefore
forced to zero. There is only one number left in the middle. (Riemann, steps 5–7.)

**`2πrhΔx` is not an approximation.** Textbooks introduce the shell formula as an estimate. With
`r` measured at the *middle* of the shell it is exactly equal to the true ring volume
`π(R²−r²)h` — an identity, not an estimate. The only thing being approximated in the Shell Method
is treating the height as constant across the thickness. (Step 5b.)

**The same solid, sliced two ways, converges differently.** The Shell Method's midpoint sum
carries an `O(n⁻²)` error. The Disk Method's is *exact for every n*, down to n = 2, even though a
stack of 2 disks visibly looks nothing like the solid. Slicing decides what you end up
integrating: vertical strips give a cubic, horizontal ones give something linear, and the midpoint
rule is exact on straight lines. The method is a consequence of the cut, not a rule to memorise.
(Disk, steps 5b–6.)

**A sine wave is a carried coordinate.** On the unit circle, radians make the angle equal to
distance walked along the arc. Carry the moving point's vertical coordinate sideways without
changing its height and the sine wave is forced to appear; carry the horizontal coordinate and
the same motion gives cosine. A second lap lands on the same trace because the point has returned
to the same places in the same order. (Unit Circle, steps 2–7.)

---

## Running it

```bash
npm install
npm run check     # tsc --noEmit && vitest run   ← run before every commit
npm run dev       # http://localhost:5173
npm run shots     # build + screenshot every step of every chain
```

## How it's built

Three layers, and the boundaries between them are enforced by tests rather than by discipline:

```
engine/    the derivation-chain state machine — knows nothing about calculus
  ↑
scene/     Three.js primitives — knows nothing about which concept it's drawing
  ↑
math/      pure functions — imports no renderer at all, so correctness is unit-testable
```

`Stage` is **data, not code**. A concept is an array of stage objects plus a small scene file.
Adding the Disk Method — a whole second topic — changed `src/engine/` by exactly zero lines, and
added zero new geometry: a disk turns out to be a shell with `rIn = 0`, stacked along the axis
instead of standing on it.

There is one Three.js scene throughout. What looks like a "2D view" is just the `front` camera
preset — FOV 18°, pulled back until it's nearly orthographic — so there's no seam when a flat
region becomes a solid. You're always looking at the same object in the same space.

## How the numbers are checked

Nothing on screen is hard-coded, and no single derivation is trusted on its own.

- **Two independent paths for every quantity.** Shell's closed form is checked against adaptive
  Simpson quadrature *and* against the Disk Method integrating over the other variable. All three
  give `8π`.
- **The geometry is unit-tested, not eyeballed.** The shell surface's vertex function lives in
  `src/math/` and imports nothing from Three.js, so "arc length is preserved while unrolling" and
  "the outer wall stays at radius `rOut` through the whole sweep" are assertions, not impressions.
  When the slab says its edge is `2πr` long, that's been proven, not drawn to look right.
- **Mutation testing.** Deliberately broken versions — midpoint rule swapped for left endpoint, a
  factor of 2 dropped, an antiderivative coefficient wrong — are all caught by the suite. A green
  test run that can't fail is worth nothing.
- **Screenshot review.** A headless-Chromium harness walks every step of every chain and captures
  it. This caught three real bugs while all 135 unit tests were passing: a camera aimed at the
  wrong point so the top of the curve sat off-screen, z-fighting on the sample rectangle, and a
  flattened slab clipped by the viewport.

`npm run check` is also the deploy gate — if the maths fails, the site doesn't ship.

## Stack

React 19 · Vite · TypeScript (strict) · Three.js + react-three-fiber · KaTeX · mathjs · Zustand ·
Tailwind · Vitest · Playwright

## License

MIT
