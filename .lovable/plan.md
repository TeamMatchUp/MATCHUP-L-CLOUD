## Landing Page — Round 3 Edits

### 1. HeroSection (`src/components/landing/HeroSection.tsx`)
- **Logo placement**: replace the centered `AppIcon` shield above the headline with a horizontal lockup — MatchUp shield sits **to the left of** the headline. On mobile it stacks above (same size as now).
- **Remove** the `AI-DRIVEN MATCHMAKING · VERIFIED FIGHTER DATABASE · FIGHT CARD BUILDER` eyebrow line entirely.
- **Remove** the gym-name partner strip (`Iron Circle Gym`, `Apex MMA`, etc.) and the `PARTNERS` constant.
- **Replace copy**:
  - Old sub-tagline `PROMOTE. MATCHUP. DONE. IT'S THAT SIMPLE…` → new block under the main hero title:
    - Line 1 (heading weight): `Where fights get made.`
    - Line 2 (subline, muted): `Fighters, coaches and promoters are already matching. Don't get left off the card.`
- **CTA**: unchanged (`Create free account` + `or explore MatchUp →`).
- **Rotating KPI network** (replaces flat counter row + partner strip):
  - Four live counters queried from Supabase on mount:
    - `Fighters` — `count` of `fighter_profiles`
    - `Coaches` — `count` of `user_roles` where `role = 'coach'`
    - `Organisers` — `count` of `user_roles` where `role = 'organiser'`
    - `Hours saved` — derived: `confirmed event_fight_slots × 4`
  - Rendered as a **rotating network animation**: 4 stat-pill nodes on a slow orbit ring (~40s) around a central MU dot with faint connecting lines. Respects `prefers-reduced-motion` (falls back to static row).
  - Gold accent nodes on `#080a0d`, no borders, shadow only.
- **Keep** the GDPR trust microcopy.

### 2. TopFightersSeekingSection — card redesign (image 2 reference)
Replicate the reference card exactly:
```
┌──────────────────────────────────────┐
│  ⬤ Initials         [ AVAILABLE ]    │  ← 56px circle avatar, pill top-right
│                                       │
│  Fighter Name                         │  ← Inter semibold 18px
│  "Nickname"                           │  ← gold italic 14px
│  🇬🇧 City · Discipline                │  ← flag emoji + muted 13px
│                                       │
│  ─────────────────────────────────    │  ← subtle inset divider
│  14–2–0    8     Lightweight          │  ← 3-col stat row
│  RECORD    KOS   CLASS                │  ← uppercase micro-labels
└──────────────────────────────────────┘
```
- Card surface `#111318`, no border, design-system shadow, hover lift + faint gold glow.
- Country **flag emoji** (via existing `FlagIcon`) rendered inline before the city.
- Add KO count by querying `fights` (`method ILIKE '%ko%'` or `%tko%`, `result = 'win'`) batched for the 4 fighters.
- Include nickname if present on `fighter_profiles`.
- Available badge: green pill top-right, glass background `rgba(0,0,0,0.6)` blur.

**Sitewide rollout** of this card style:
- Extract shared `<FighterCard />` at `src/components/fighter/FighterCard.tsx` — flag emoji included by default.
- Refactor existing fighter card usages:
  - `src/components/landing/FeaturedFightersSection.tsx`
  - `src/pages/Fighters.tsx`
  - `src/pages/Explore.tsx` fighter tab
  - `src/components/dashboard/DashboardRoster.tsx`
- Behaviour, props, data shape preserved — only visual layout swapped.

### 3. PlatformStatsStrip — replace with banner style + scroll reveal (image 1)
Rewrite `src/components/landing/PlatformStatsStrip.tsx`:
- Full-width dark band, thin hairline shadow top + bottom (inset, not border).
- Four evenly-spaced stats, centered:
  - `12,400+  VERIFIED FIGHTERS`
  - `850+  GYMS & ACADEMIES`
  - `340+  EVENTS PUBLISHED`
  - `96%  BOUTS CONFIRMED ON TIME`
- Numbers: Bebas Neue, gold `#e8a020`, ~clamp(2rem, 4vw, 3rem). Labels: Inter uppercase micro, muted, letter-spacing 0.18em.
- **Scroll reveal animation** — Framer Motion `whileInView`, container fades + rises (`y: 30 → 0`, 0.6s ease-out), children stagger (0.08s each) so the four stats animate in sequence — same register as `FeatureShowcase` reveals for page consistency. Respects `prefers-reduced-motion`.
- **Remove** the `Be a part of our network today.` subline entirely.
- Values remain live-queried (existing behaviour) with the four labels above.

### 4. HowItWorksSection — collapse & restyle
Edit `src/components/landing/HowItWorksSection.tsx`:
- All accordion items start **collapsed** by default (omit `defaultValue`).
- Restyle to match landing card system:
  - Items = `#111318` cards, no border, design-system shadow, gap between items (not a bordered accordion group).
  - Trigger row: Bebas Neue heading + gold chevron.
  - Expanded body uses same type scale as `FeatureShowcase`.
  - Remove any non-gold accents.
- Step content and copy unchanged.

### 5. Scope guardrails
- No backend / RLS / schema changes.
- Only add read-only `.select('*', { count: 'exact', head: true })` for hero counters.
- No routing, auth, or header changes.
- Verify with Playwright at 1280×1800 and 390×2000 after implementation.

### Files touched
- edit `src/components/landing/HeroSection.tsx`
- edit `src/components/landing/TopFightersSeekingSection.tsx`
- edit `src/components/landing/PlatformStatsStrip.tsx`
- edit `src/components/landing/HowItWorksSection.tsx`
- edit `src/components/landing/FeaturedFightersSection.tsx`
- edit `src/pages/Fighters.tsx`, `src/pages/Explore.tsx`, `src/components/dashboard/DashboardRoster.tsx`
- new `src/components/fighter/FighterCard.tsx`
- new `src/components/landing/HeroLiveNetwork.tsx`
