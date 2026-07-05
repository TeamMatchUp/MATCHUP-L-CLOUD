## Round 4 — Hero cleanup + Explore card hierarchy rebuild

### 1. HeroSection (`src/components/landing/HeroSection.tsx`)
- **Remove `<HeroLiveNetwork />`** entirely (delete the import + JSX block). Also delete `src/components/landing/HeroLiveNetwork.tsx`.
- **Remove headline** "WHERE FIGHTS GET MADE." Keep only the subline: *"Fighters, coaches and promoters are already matching. Don't get left off the card."* Promote it visually (slightly larger, foreground text, tighter tracking) so it stands as the tagline.
- **Resize MatchUp logo** — drop from `clamp(72px, 9vw, 120px)` down to `clamp(56px, 6vw, 88px)` so it visually balances the headline cap-height instead of dwarfing it. Tighten the gap between logo and text (`gap-4 sm:gap-6`).
- Keep GDPR trust line + CTA row as-is.

### 2. Shared "haze" placeholder component (new `src/components/HazePlaceholder.tsx`)
Replaces the `NetworkBackground` + MU icon watermark used on every Explore card whenever no user image is uploaded.

- Full-bleed CSS radial + linear gradient blending the site's gold `#e8a020` and destructive red `#ef4444` over the base `#080a0d` — soft blurred blobs, no logo, no dots, no network lines.
- Signature: `<HazePlaceholder className="absolute inset-0" />` — a single div with layered `background-image` gradients + subtle grain.
- Used by all three card types below.

### 3. Fighter cards — Explore `FightersDirectory` (rebuild inside `src/pages/Explore.tsx`)
Reference: uploaded profile card mock (haze banner, avatar over-hang, name + follow inline, stacked meta).

New hierarchy, no more full-hero portrait:

```
┌───────────────────────────────────┐
│  [Haze banner strip · 72px]       │  ← HazePlaceholder (gold+red)
│    ○ 56px avatar (overlaps -24px) │
├───────────────────────────────────┤
│  Fighter Name    ● Avail  [Follow]│  ← name row, active dot + follow right
│  🇬🇧 United Kingdom               │  ← flag + country
│  Muay Thai                        │  ← martial art (style)
│                                   │
│  Stance · Weight · Age · 12-2-0   │  ← compact stat strip
│  View Profile →                   │
└───────────────────────────────────┘
```

Details:
- Grid density up: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3` (was `2 / lg:3`). Card min-height ≈ 220px vs current ~380px.
- Avatar: 56px circle, left aligned, sitting on the haze strip. Ring in `rgba(232,160,32,0.4)`.
- Name row: name left; right side hosts **active-status dot** (green `#22c55e` when `available === true`, muted otherwise) + **Follow button** (only if `showFollow`) on the same baseline. Active dot has a tooltip "Available".
- Flag + country name row.
- Martial art / style row (`STYLE_LABELS[fighter.style]`).
- Stat strip: `Stance · Weight class · Age · Record` — computed:
  - stance from `fighter_profiles.stance` (already selected via `*`)
  - weight from `WEIGHT_CLASS_LABELS`
  - age from `date_of_birth` if present else `—`
  - record `w-l-d` from `fighter._record`
- Remove: gym name, titles badge, win-rate KPI, big portrait area. (Keeps card compact.)
- Footer: same "View Profile →" chevron pill, shrunk.

### 4. Gym cards — Explore `GymsDirectory`
Match fighter-card layout exactly. Reuses `HazePlaceholder`.

- If `gym.banner_image` present → show it as banner. Else → haze banner (no logo, no network).
- **Avatar = coach avatar** (left side, 56px circle). Fetch via new join step in the gyms query: pull `coach_id`, then `profiles.avatar_url` for that user id. Fallback: gym `logo_url`, else initials. Only shown when gym is `claimed`.
- Gym name below/next to avatar (same row layout as fighter: name left, right side reserved for `Verified` pill if `claimed`).
- Location row (`city, country`).
- Fighters count row: `Users icon · N fighters registered`.
- `View Details →` footer.
- Same 3-4 column density; remove big 180px hero with logo watermark and discipline tag overlay.

### 5. Event cards — Explore `EventsDirectory`
Same skeleton as gym card.

- If `event.banner_image` present → banner. Else → haze banner.
- **Avatar = event organiser avatar**, left, 56px. Fetch via new step: collect `organiser_id`s, join `profiles.avatar_url` + `full_name`.
- Event title on name row. Right side of that row: **ticket-stump icon** (`Ticket` from lucide) in gold when the event has active tickets available (reuse the existing active-ticket logic already inside the card). Tooltip: "Tickets available". Hidden otherwise.
- Date + time row (`Calendar` + `new Date(event.date)` formatted with time).
- Location row (`MapPin` + city/venue).
- Optional MAIN EVENT badge kept but demoted to a single 11px tag.
- `View Event →` footer.

### 6. Data fetching updates (Explore queries)
Add lightweight joins so avatars are available without extra round-trips per card:

- `explore-gyms` query: after fetching gyms, collect `coach_id`s, fetch `profiles(id, avatar_url, full_name)`, attach as `_coachAvatar` / `_coachName` on each gym row.
- `explore-events` query: same pattern with `organiser_id`.
- Fighters query already resolves `_avatar`; add `stance` + `date_of_birth` to the select (they exist on `fighter_profiles`).

No DB migrations, no RLS changes, no new tables.

### Technical notes
- All colour values pulled from the existing `EX` token map already in `Explore.tsx`.
- `HazePlaceholder` is pure CSS — no images, no canvas — so it renders instantly and is reused across the three card types.
- Follow-button interaction lifted out of the current image overlay position into the name-row so it lives with the identity block. Click-through preventDefault preserved.
- Grid gains a `xl:grid-cols-4` breakpoint on desktop ≥1280px to use the extra room now that cards are ~40% shorter.
- No changes to routing, RLS, matchmaking, or auth.

### Files touched
- Edit: `src/components/landing/HeroSection.tsx`
- Delete: `src/components/landing/HeroLiveNetwork.tsx`
- Create: `src/components/HazePlaceholder.tsx`
- Edit: `src/pages/Explore.tsx` (queries + `EventsDirectory` + `GymsDirectory` + `FighterCard`)
