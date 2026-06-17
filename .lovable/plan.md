# Plan — New MATCHUP landing page (Obsidian Gold)

Replace the current home page entirely with a single new page composed of self-contained section components. No routing changes, no auth/algorithm changes.

## File changes

**Replace contents of:**
- `src/pages/Index.tsx` — render only the new `LandingHeader` + new sections + new `LandingFooter`. Do not reuse the existing `<Header>` or `<Footer>` so the landing page can have its own transparent-on-load header and its own footer markup without affecting authenticated app pages.

**New files (all under `src/components/landing-v2/`** to avoid touching the old `src/components/landing/` files still used elsewhere if any):
- `LandingHeader.tsx` — fixed header (transparent → blurred dark after 40px scroll), logo left, Log In + Get Started right, hamburger + full-screen overlay below 900px.
- `HeroSection.tsx` — full viewport height, constellation `<canvas>` background + radial fade overlay, badge, two-line animated headline ("The right match." white / "Every time." gold), subtext, two buttons, caption.
- `ConstellationCanvas.tsx` — standalone canvas component. Explicitly `width: 100%; height: 100%` in CSS, internal `canvas.width/height = parent rect * devicePixelRatio` on mount + resize, requestAnimationFrame draw loop. Honours `prefers-reduced-motion`: renders one static frame, skips RAF.
- `ProblemSection.tsx` — gold label, heading ("Combat sports" white + "deserves better." muted), subtext, four hairline-bordered rows (icon box · title · vertical divider · description), one placeholder screenshot block with `{/* TODO: replace with real app screenshot */}` comment.
- `WhoItsForSection.tsx` — gold label, heading "Smarter matches. Better fights.", four pill tabs (Fighters/Coaches/Gyms/Promoters), single content panel (charcoal card, two-column → single column <900px) with icon+heading+description left and three feature rows right, plus placeholder screenshot block + TODO comment in each panel.
- `HowItWorksSection.tsx` — gold label, heading, subtext, vertical accordion of six numbered steps. Only one open at a time, step 1 open by default. Chevron rotates 180° via CSS transition. Expansion uses max-height transition (no layout jump). Content matches spec exactly.
- `CtaBand.tsx` — centred rounded card, gold-tinted gradient + soft gold glow shadow, heading ("Every fight starts here." — first part white, second muted), subtext, gold pill button "Create Your Free Account" → `/auth?mode=signup`.
- `LandingFooter.tsx` — hairline top border, 4 cols (collapse 2 then 1), bottom centred copyright.
- `useScrollReveal.ts` (hook) — IntersectionObserver-based reveal. Adds `data-revealed="true"` when in view; CSS handles fade + translateY. Disabled when `prefers-reduced-motion: reduce`.

## Routing wiring

- Logo, "Log In" → `/auth`
- "Get Started", "Start Matching", "Create Your Free Account" → `/auth?mode=signup`
- "See how it works" → smooth scroll to `#how-it-works` anchor on the HowItWorks section
- Footer links: Events → `/events`, Fighters → `/fighters`, Gyms → `/gyms`, Register Gym → `/register-gym`, Create Event → `/organiser/create-event`, Terms → `/terms`, Privacy → `/privacy`, Contact → `/contact`

All via React Router `<Link>` (internal). No new routes added.

## Design system compliance

- Page bg `#080a0d`, card surface `#111318`, raised `#181c24`, hover `#1e2330`
- Gold accent `#e8a020` only — never orange
- Text `#e8eaf0` / secondary `#8b909e` / muted `#555b6b`
- Headings Bebas Neue (already loaded in project), body Inter
- No borders on cards/inputs in default state — hairlines only where the spec explicitly calls for them (problem rows, accordion rows, footer top, inactive tab pills). Hairline = `1px solid rgba(255,255,255,0.06)` or `rgba(232,160,32,0.18)` for gold-tinted.
- Depth via shadows per project spec.

## Animations

- Headline lines: CSS keyframes, mask-clip + translateY, staggered delays (0ms / 120ms). Subtext fades at 350ms, buttons at 500ms.
- Scroll reveals: `opacity 0 → 1`, `translateY(16px → 0)`, `0.6s ease-out`, triggered by `useScrollReveal`.
- Accordion: `max-height` + `opacity` transition (0.3s ease), chevron `rotate(180deg)` transition (0.2s ease).
- Header bg: `transition: background 0.25s ease, backdrop-filter 0.25s ease, box-shadow 0.25s ease`.
- All transforms/animations gated by a single `prefers-reduced-motion` media query in section-level CSS; canvas component skips RAF entirely under reduced motion.

## Responsiveness

- Sections max-width `1200px` default; `@media (min-width: 1600px)` bumps to `1440px`.
- Single-column collapse at `<900px` for: header right side (hamburger replaces "Log In"), Who It's For two-column panel, footer column grid, problem rows (icon stays inline, description wraps).
- `html, body { overflow-x: hidden; }` confirmed in global CSS; section containers use `padding-inline` not negative margins to guarantee zero horizontal scroll at 375/390px.
- Hamburger overlay: `position: fixed; inset: 0; background: #080a0d; z-index: 60;`, X button top-right, stacked centred Log In + Get Started.

## Out of scope

- No changes to existing `src/components/landing/*` files (left in place, just unused by `/`).
- No changes to `src/components/Header.tsx` / `Footer.tsx` (still used by other pages).
- No route additions, no auth changes, no schema/RLS work.
- Real product screenshots not added — placeholder blocks with TODO comments only.

## Acceptance

- `/` renders the new landing page; no references to "AI-Powered" or "Three Sides. One Platform." anywhere on it.
- Header transparent at top, blurs + hairline after 40px scroll; hamburger only below 900px.
- Hero canvas visibly fills the hero (verified by inspection — `width:100%; height:100%` set).
- Four tabs swap content instantly without scroll jump.
- Accordion: only one step open, step 1 default open, chevron rotates.
- All four CTAs route correctly (`/auth` or `/auth?mode=signup`).
- No horizontal scroll at 375px and 390px viewports.
- Reduced-motion users see static canvas frame and no entrance transforms.
