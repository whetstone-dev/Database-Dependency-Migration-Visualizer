# Viewer refinement

Applied the globally installed emil-design-eng skill to the offline viewer. The viewer's frequent graph actions remain immediate. Optional pointer tab transitions use 160ms opacity/transform with a strong ease-out, and reduced-motion users receive no movement.

| Before | After | Why |
|---|---|---|
| No press state | Subtle 120ms button feedback, disabled for keyboard/reduced motion | Pointer feedback without slowing keyboard work |
| 13px mobile inputs | 16px mobile inputs and 44px controls | Avoid mobile focus zoom and small touch targets |
| Empty graph after failed search | Explicit no-results guidance | Explain how to recover |
| Column label only | Owner.column label and full detail/title | Distinguish repeated id/email names |
| Secondary touch may reset drag | Guard active pointer capture and cancel safely | Preserve drag continuity |

Browser automation covers desktop/mobile interaction and reduced-motion preferences. Screenshots document actual rendered state. No physical-device testing or PNG export is claimed.
