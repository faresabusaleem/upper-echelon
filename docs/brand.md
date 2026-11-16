# Upper Echelon · Brand system

A secret society, quiet and exclusive. Dark, monochrome and cinematic; one restrained metallic
accent; type that feels engraved rather than printed. Mysterious and elegant, never costume.

## 1. The mark

The logo from the original project is an engraving of a human head divided by the three planes of
anatomy: **sagittal** (left from right), **coronal** (front from back) and **transverse** (above from
below). It is not an occult figure; it is a diagram of looking at the mind from more than one side.
That reading drives the whole system.

| Asset | Where | File |
|---|---|---|
| **The Plate**: the full engraving, traced to vectors from the original JPG with potrace | Landing stage, closing section, share images, 404 | `brand/mark-engraving.svg`, `public/brand/engraving-ivory.svg`, `engraving-gold.svg`, `.png` |
| **The Planes**: a reduced geometric mark built from 3D coordinates (yaw −20°, pitch 22°) with hidden lines removed behind the head | Wordmark, favicon, app icons, empty states, Initiation | `brand/mark-planes*.svg`, `src/components/brand/mark.tsx` |
| **The Planes, 16 px**: coronal and transverse planes and the head only | `favicon.ico` 16 px frame | generated |
| Original raster (reference only) | — | `brand/source/upper-echelon-logo-original.jpg` |

Rebuild everything with `npm run brand:build` (`scripts/build-mark.mjs` then `scripts/build-icons.mjs`);
`scripts/trace-logo.mjs` re-traces the engraving.

**Lit planes.** The Planes can light one plane in gold. The Initiation lights the sagittal plane for
*Name* (who you are), the coronal for *Interests* (what you face) and the transverse for *Seal*
(where you stand). Use this device only to signal progress through three steps.

**Clear space** equals the radius of the head circle on every side. **Minimum size**: 16 px for the
reduced favicon mark, 24 px for the full Planes, 160 px wide for the Plate.

**Never** rotate the mark, add glows or gradients, outline it in a frame, place it on a busy
photograph, or combine it with eyes, pyramids, pentagrams or any occult symbol.

**Wordmark.** The Planes plus “Upper Echelon” in Cormorant Garamond Regular. In the landing hero the
name is set in lowercase light at 9.6vw as a monument; elsewhere it stays in title case.

## 2. Colour

One ground, one ink, one accent. The accent is **antique gold**.

**Why gold, not silver.** In a monochrome interface a silver accent is indistinguishable from neutral
text: it cannot mark what is clickable, what is earned or where you stand. A muted, warm gold is the
single point of light in a dark room, like gilt on the edge of an old book. It is used sparingly: the
primary action, progress, the active plane, tier numerals, and nothing else.

| Token | Hex | Use | Contrast on ground |
|---|---|---|---|
| `ground` | `#0b0b0a` | Page background (slightly warm black) | — |
| `sunk` | `#070706` | Recessed fields, code blocks | — |
| `raised` | `#121211` | Raised panels, alternate rows | — |
| `panel` / `panel-2` / `panel-3` | `#181816` / `#20201d` / `#2a2a26` | Inputs, chips, tone steps | — |
| `ink` | `#edeae3` | Running text, headings | 16.4 : 1 |
| `ink-2` | `#cfcac0` | Secondary text | 12.1 : 1 |
| `muted` | `#a39f96` | Notes, metadata | 7.5 : 1 |
| `faint` | `#868279` | Placeholders, disabled | 5.1 : 1 |
| `gold` | `#c2a15f` | The accent | 8.0 : 1 (ground text on gold: 8.0 : 1) |
| `gold-bright` / `gold-deep` | `#d6bb80` / `#9e8350` | Hover, pressed | — |
| `gold-wash` | `#1d1912` | Highlighted panels (today’s challenge, your row) | — |
| `danger` / `danger-wash` | `#d98473` / `#231512` | Errors, removal | 7.0 : 1 |
| `ok` / `ok-wash` | `#a3bd98` / `#141b13` | Success, solved | 9.6 : 1 |

All text pairs meet WCAG 2.2 AA (4.5 : 1) in the dark theme, also on the raised and panel surfaces
(muted on panel 6.7 : 1, faint on panel 4.6 : 1); the *High contrast* option in settings
switches to pure black and brighter text.

**Profile themes** (unlocked by tier) change only the accent and the banner wash on a member’s own
profile: Pewter I, Bronze II, Silver III, Gold IV, Platinum V, Obsidian VI.

**Never**: gradients, neon, glowing borders, violet or indigo, cream-and-terracotta.

## 3. Typography

| Role | Face | Notes |
|---|---|---|
| Display | **Cormorant Garamond** 300–600 | Headlines, names, the wordmark. Sharp wedge serifs echo the engraving’s fine line. Tracking −0.015 to −0.045em. |
| Text | **Instrument Sans** (variable) | Running text, UI. Precise, slightly narrow, calm at 15–17 px. |
| Figures | **IBM Plex Mono** 400–500 | Only numbers that matter: scores, timers, ranks, counts. Tabular figures. Never for labels or prose. |

Fluid scale (`src/app/globals.css`): display-xl `clamp(3.25rem, 9.5vw, 9.5rem)`, display-l
`clamp(2.5rem, 5.4vw, 5rem)`, display-m `clamp(2rem, 3.4vw, 3.25rem)`, display-s
`clamp(1.625rem, 2.2vw, 2.125rem)`, lede `clamp(1.19rem, 1.5vw, 1.44rem)`, body 17 px, small 15 px,
micro 13 px. Headlines never run past two lines; text measures stay between 45 and 75 characters.

## 4. Space, shape, surface

- **Spacing** on a 4 px base; page gutter `clamp(1rem, 3.2vw, 2.5rem)`; sections 96–200 px apart.
- **Corners are square.** Buttons, panels, inputs and images are all square. The only round things are
  avatars (cameos) and the Aim Trainer’s targets.
- **Surfaces separate by tone steps**, not lines or shadows. Thin rules appear only in data tables and
  form fields. Shadows are reserved for things that truly float: menus, dialogs, the cookie notice.
- **Grain**: a fine animated noise at 4.5% opacity over everything; members can turn it off.

## 5. Motion

Slow and deliberate. Tokens: `--dur-1` 160 ms (feedback), `--dur-2` 420 ms (transitions),
`--dur-3` 900 ms (entrances), `--dur-4` 1600 ms (cinematic); easing `cubic-bezier(0.22, 1, 0.36, 1)`.

- **Signature move**: the giant lowercase wordmark settles (scales to 0.93 and dims) as the first screen
  scrolls away, on a scroll-driven timeline.
- **The stage**: the fixed picture crossfades over 1.4 s to the photograph of the section in view, and
  drifts slowly (26 s scale and pan).
- **Entrances**: headings, text and pictures rise 24 px with opacity, staggered by 80 ms, once.
- **Feedback**: every button presses down 1 px and scales to 0.985.
- Only `transform` and `opacity` animate. `prefers-reduced-motion` and the member’s *Reduce motion*
  setting keep all content and drop all travel. Nothing is hidden if script fails.

## 6. Imagery

Archive photographs of the world of measurement and argument, treated identically: monochrome,
blacks lifted slightly, 4:5 portrait crops, square corners.

| Section | Picture | Licence |
|---|---|---|
| The Arena | Hipp chronoscope, c. 1890 (Museum of Science and Industry, Chicago), by Daderot | CC0 |
| The Directory | Card file at Indiana State Library, by Rhododendrites | CC BY-SA 4.0 |
| The Forum | Head of Socrates, Palazzo Massimo alle Terme, by Livioandronico2013 | CC BY-SA 4.0 |
| The ladder | Spiral staircase in the Vatican Museums, by Wilfredor | CC0 |

Sources and credits: `brand/archive/credits.json`; on-page credits in the landing footer. Adapted
CC BY-SA images are shared under the same licence. Member images are re-encoded to WebP without
metadata.

## 7. Voice

Short, measured, confident. Second person; no exclamation marks; no emoji; no hype.

- **Yes:** “You were not invited by accident.” “Wait for gold. Then strike.” “This door does not open.”
  “You are moving faster than the house allows.”
- **No:** “Unlock your genius!”, “🚀”, “Oops! Something went wrong :(”, “AI-powered”.

Errors say what happened and what to do. Empty states invite one action. Nothing claims members,
statistics or endorsements that do not exist.

## 8. Components

`src/components/ui`: Button (primary gold, secondary tone, quiet, danger, link; sm/md/lg; square),
Field/Input/Textarea/Select/Checkbox, Avatar (cameo or initials), TierMark (Roman numeral in gold,
optional name), StaffMark, Notice (info, success, warning, error), Empty (mark at rest + one line),
Skeleton (slow tone pulse, never shimmer), Progress, Dialog (native `<dialog>`), line icons drawn on a
24 px grid with 1.5 px square-capped strokes.

## 9. Icons and share images

`public/icons`: `favicon.ico` (16/32/48), `icon.svg`, `apple-touch-icon.png` (180), `icon-192.png`,
`icon-512.png`, `icon-maskable-512.png` (80% safe zone). Share images are generated per page at
1200×630: the site (`/opengraph-image`), each thread (`/api/og/thread/[id]`) and each member
(`/api/og/member/[username]`): the title in Cormorant on the left, the Plate on a raised panel on the
right, one line of gold.
