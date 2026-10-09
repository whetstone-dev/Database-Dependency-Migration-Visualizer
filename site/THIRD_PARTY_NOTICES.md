# Webpage third-party notices

The repository's MIT license does not replace dependency licenses. This webpage bundles runtime dependencies and the following application-specific source adaptations.

## React Bits

Author: David Haz. Official repository: <https://github.com/DavidHDev/react-bits>.

All selected files came from commit `d86fccbd477786f94ca7eb891fbe0ec039d3cd3b`. The complete **MIT + Commons Clause License Condition v1.0** is retained in [licenses/react-bits-LICENSE.md](licenses/react-bits-LICENSE.md). Copyright (c) 2026 David Haz. These adaptations are embedded in this application. They are not offered as a standalone component library or reusable component package. The Commons Clause restricts selling, sublicensing or redistributing the components themselves, including bundles and ports.

| Application file                         | Official source at the pinned commit                                                                                                                                              | Original downloaded SHA-256                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `src/components/react-bits/BlurText.tsx` | [TextAnimations/BlurText/BlurText.tsx](https://github.com/DavidHDev/react-bits/blob/d86fccbd477786f94ca7eb891fbe0ec039d3cd3b/src/ts-default/TextAnimations/BlurText/BlurText.tsx) | `476b92e3ec7fee9fdcee177333c1a687106e23767152d663c390355f488ed6f5` |
| `src/components/react-bits/DotGrid.tsx`  | [Backgrounds/DotGrid/DotGrid.tsx](https://github.com/DavidHDev/react-bits/blob/d86fccbd477786f94ca7eb891fbe0ec039d3cd3b/src/ts-default/Backgrounds/DotGrid/DotGrid.tsx)           | `c1440e84a4d4ad33223fae8a2ef2179e9eb7af2775d9ce1c10aef01da100fe95` |
| `src/components/react-bits/Magnet.tsx`   | [Animations/Magnet/Magnet.tsx](https://github.com/DavidHDev/react-bits/blob/d86fccbd477786f94ca7eb891fbe0ec039d3cd3b/src/ts-default/Animations/Magnet/Magnet.tsx)                 | `17227417dc61cf1cf02b88c7a291607de3eedfd4714ab642078c5ebf102f586f` |

Local adaptations use accessible text semantics, disable movement for reduced motion, use a static dot pattern on touch, draw the canvas only on demand, suspend drawing and inertia offscreen, clean up GSAP tweens, and keep focused buttons steady. The retained BlurText adaptation is no longer imported by the page. Styling is scoped to this webpage.

## Runtime libraries and fonts

Next.js 16.4.0 is MIT licensed. Its complete [license](licenses/next-LICENSE.md) is retained with this static export. Build-time prerendering does not add a hosted server to this website.

| Dependency                         | Pinned version                     | License / retained notice                                                                                                                                             |
| ---------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| React, React DOM                   | 19.3.0                             | MIT, [React license](licenses/react-LICENSE), [React DOM license](licenses/react-dom-LICENSE)                                                                         |
| GSAP, ScrollTrigger, InertiaPlugin | 3.15.0                             | [GSAP Standard License](https://gsap.com/standard-license/), not MIT. Package header license notice retained in [licenses/gsap-NOTICE.txt](licenses/gsap-NOTICE.txt). |
| Lenis                              | 1.3.26                             | MIT, [license](licenses/lenis-LICENSE)                                                                                                                                |
| Motion                             | 14.0.0                             | MIT, [license](licenses/motion-LICENSE.md)                                                                                                                            |
| Archivo variable font              | @fontsource-variable/archivo 5.3.0 | SIL Open Font License 1.1, [license](licenses/archivo-LICENSE)                                                                                                        |
| IBM Plex Mono font                 | @fontsource/ibm-plex-mono 5.3.0    | SIL Open Font License 1.1, [license](licenses/ibm-plex-mono-LICENSE)                                                                                                  |

TypeScript is a build dependency and retains its upstream license in its npm package. Exact dependency integrity and transitive versions are recorded in `pnpm-lock.yaml`. Fonts and runtime assets are bundled locally, with no runtime CDN or external font request.
