# Landing Page Redesign — Final Copy Locked

## 1. HeroSection (`HeroSection.tsx`)
- Eyebrow: `AI-DRIVEN MATCHMAKING · VERIFIED FIGHTER DATABASE · FIGHT CARD BUILDER`
- Headline: **MATCH EASY, / FIGHT HARD** (gold glow on line 2)
- Sub-tagline: `PROMOTE. MATCHUP. DONE. IT'S THAT SIMPLE…`
- Primary CTA: `CREATE FREE ACCOUNT` (gold pill, dominant)
- Secondary: `Explore MatchUp` as low-weight text link
- Social proof strip: `JOIN 850+ FIGHTERS · 340+ COACHES · 96% MATCH RATE` + 5–6 grayscale partner name placeholders
- Trust microcopy: `🔒 Your fighter data is private by default · GDPR compliant · You control visibility`
- Mobile: CTA full-width, ≥48px, stacked

## 2. UpcomingFightsTicker (new)
- Two rows autoscrolling left via CSS keyframes (60s / 90s), pause on hover, respects `prefers-reduced-motion`
- Row 1: next 8 `event_fight_slots` joined with `events` as pill chips
- Row 2: 6–8 static sponsor name placeholders

## 3. FeatureShowcase (new `FeatureShowcase.tsx`) — scroll-animated, alternating layout, browser-framed screenshots with hover-lift

Intro heading (kept from existing `ThreeSidesSection` styling, no cards): **THREE SIDES. ONE PLATFORM.**

### Section A — FOR FIGHTERS
**YOUR CAREER, ONE COMMAND CENTRE.**
> Every offer, callout and contract lands in your Action Centre. Accept a bout in two taps, keep your record verified, and match efficiently from the Matchup network.

- Verified record & fight history with live automated analytics
- Match offers straight to your inbox
- Availability toggle — one switch

CTA: `Explore fighters →`
Screenshot: fighter dashboard (Action Centre)

### Section B — FOR COACHES
**RUN THE GYM. / GROW THE ROSTER.**
> Find new members authentically. Approve join requests, track roster analytics and gym views, and manage every fighter's calendar from a single overview. Your fighters deserve better than WhatsApp and Facebook to grow their career.

- Advertise to the whole Matchup network
- All-in-one fighter matchmaking
- Fighter performance analytics
- Integrated events calendar

CTA: `Explore gyms →`
Screenshot: coach roster / gym dashboard

### Section C — FOR ORGANISERS
**BUILD CARDS / THAT SELL OUT.**
> The old saying of "who you know" just got a whole lot easier — search the entire Matchup network of verified fighters either manually or with SmartMatchup. Send and track offers, confirm bouts and publish your event cards to the platform.

- Effortless matchmaking with detailed analytics
- Fight proposal tracker
- One-click event publishing
- Ticket sales integration

CTA: `Explore events →`
Screenshot: fight card builder

Each showcase uses `<BrowserFrame>` (traffic-light dots, subtle border, drop shadow), Framer Motion `whileInView` with staggered children, hover lift `translateY(-6px) scale(1.01)` + gold-tinted glow.

## 4. "Top fighters actively seeking a match" strip
- Rename existing "fighters looking for a dance partner" section heading to **TOP FIGHTERS ACTIVELY SEEKING A MATCH**
- No other structural changes to that block

## 5. PlatformStatsStrip — unchanged, subline updated
- New subline under stats: `Be a part of our network today.`

## 6. HowItWorksSection — unchanged

## 7. FinalCtaSection (new)
- Headline: `YOUR NEXT FIGHT IS THREE CLICKS AWAY.`
- Single glowing gold CTA: `CREATE FREE ACCOUNT`

## 8. `src/pages/Index.tsx` assembly order
1. HeroSection
2. UpcomingFightsTicker
3. FeatureShowcase (intro + 3 sections)
4. Top Fighters Actively Seeking a Match strip
5. PlatformStatsStrip (with new subline)
6. HowItWorksSection
7. FinalCtaSection
8. `<Footer />`

## Technical notes
- No new dependencies (framer-motion already present)
- No backend / RLS / schema / route changes
- Ticker reads existing `event_fight_slots` + `events`
- Screenshots captured with Playwright at 1280×800, saved to `src/assets/landing/`, imported as ES6
- Verify with Playwright at 1280×1800 and 390×2000

## Out of scope
- Header, routing, auth
- Real sponsor logos, testimonials, Verified-Athlete badge (deferred until assets provided)
