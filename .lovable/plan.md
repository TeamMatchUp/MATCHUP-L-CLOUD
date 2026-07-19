## Scope

Only `src/components/landing/HeroSection.tsx` and one new asset. Everything below the hero (ticker, feature showcase, etc.) stays untouched.

## Asset

- Upload `user-uploads://Fighters_coaches_and_promoters_are_already_matching._Don_t_get_left_off_the_card..png` via `lovable-assets create` → `src/assets/hero-horizon.png.asset.json`. Import the pointer JSON in `HeroSection.tsx`.

## HeroSection.tsx changes

1. **Background**: Wrap the `<section>` with an inline style that layers the horizon PNG at `background: url(...) center bottom / cover no-repeat, #000`. The image already fades from black at top → navy → amber at bottom, so no extra gradient needed. Scope strictly to the hero `<section>` — nothing bleeds into the ticker below.

2. **Lockup markup**: Replace the current flex column (icon stacked over stacked headline with comma + `text-gold-glow`) with a single flex row:
   ```
   <div class="flex items-center justify-center gap-[0.35em]">
     <span>MATCH EASY</span>
     <AppIcon />
     <span>FIGHT HARD</span>
   </div>
   ```
   - Both words: same `font-heading`, weight 800, `text-foreground` (white), `letterSpacing 0.01em`, `fontSize: clamp(2.25rem, 6vw, 4.75rem)`, `lineHeight: 1`. No comma. No `text-gold-glow` class on "FIGHT HARD".
   - Shield: sized to cap-height. Use `h-[0.82em]` (cap-height ≈ 70–75% of font-size for Bebas-style display faces; 0.82em visually matches the reference at the target scale) with `w-auto`, and `alignSelf: center` inside an `items-center` row. Because both text spans have `line-height: 1`, centering on line-box == centering on cap-height, eliminating the sag.
   - Equal spacing: single `gap-[0.35em]` on the flex row applies identically to both sides of the shield.

3. **Mobile**: On very narrow widths the row could overflow. Keep it single-row down to ~360px by relying on the `clamp()` min of 2.25rem and `gap-[0.25em] sm:gap-[0.35em]`. Do NOT stack vertically on mobile — the user asked for a single horizontal lockup. Verify at 375px viewport that the row fits (2.25rem × ~10 chars per word + shield + gaps ≈ fits within container padding).

4. **Unchanged**: subhead paragraph, CTA button block, auth-conditional links.

## ASCII target

```
[  MATCH EASY  ⛨  FIGHT HARD  ]
   Fighters, coaches and promoters ...
        [ Create free account ]
```
Backdrop: dark navy top → amber horizon at bottom edge of hero, hard cutoff at section end.

## Out of scope

Header, ticker, FeatureShowcase, and everything below the hero remain untouched.
