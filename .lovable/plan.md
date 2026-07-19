Two changes on the landing hero:

1. Fix the left-edge light seam that appears at certain zoom levels (50%, 100%, 110%; not 67%).
   - Investigate `src/components/landing/HeroSection.tsx`, `src/pages/Index.tsx`, `src/components/Header.tsx`, and global CSS to pinpoint the element causing the seam.
   - Likely causes to check in order: (a) an unintended left-anchored decorative element mirroring the right-side Scroll hint, (b) hero background image not overscanning past the viewport, causing a sub-pixel edge at fractional zoom, (c) root/page wrapper margin/padding exposing the `html` background.
   - Apply the smallest targeted fix (overscan hero background by ~1px, or normalize the root wrapper), keeping hero design, logo size, spacing, and background image unchanged.
   - Verify at 50%, 67%, 100%, 110% zoom that the left edge stays dark with no vertical light sliver.

2. Make the right-side "Scroll" hint more visible.
   - In `src/components/landing/HeroSection.tsx`, increase the opacity of the vertical "Scroll" text and the bouncing `ChevronDown` icon so it is clearly visible against the hero background, while still reading as a subtle hint (not a primary CTA).
   - Keep position, size, animation, and layout unchanged.