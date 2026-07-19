## A1 fix (only change)

File: `src/components/landing/HeroSection.tsx`, line 60.

Current shield wrapper:
```tsx
<span className="inline-flex items-center leading-none shrink-0 -mx-[0.15em]" style={{ height: "4em" }}>
```

Change to a small **positive** horizontal margin so there is a deliberate, symmetric gap (~one character-space) between the shield and each word, instead of the current zero gap:

```tsx
<span className="inline-flex items-center leading-none shrink-0 mx-[0.12em]" style={{ height: "4em" }}>
```

- Uses `mx-[0.12em]` (equal on both sides → gaps stay visually equal).
- Reversing sign of the previous `-mx-[0.15em]` gives back roughly one glyph of breathing room without reintroducing the old oversized padding, because the SVG viewBox itself was already tightened in the prior pass.
- No structural/layout change; `flex items-center justify-center gap-[0.005em]` on the `<h1>` stays as-is.

I'll confirm the resulting value in the reply once applied.

## Verification of the other items (B/C etc.)

You asked for per-item verification with evidence. That's a substantial pass (Playwright runs against the live preview with an authenticated minor test account for C2/C3/C6, DB reads for C0/B2, on-page inspection for B1/B4/B5/B6/B7, and pasting the current `RecordAccuracyPolicy.tsx` copy for B3). I have not started that yet because you said "don't make further changes."

Two options — tell me which:

1. **Do the A1 tweak now, then run the full verification pass** and report each item individually with screenshots / DB output / pasted code. No other code changes unless verification uncovers a real bug (in which case I'll flag first, not fix silently).
2. **A1 tweak only right now**, verification deferred to a follow-up turn.

Default if you don't specify: option 1.