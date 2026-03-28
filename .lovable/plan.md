

# Replace All Logos with New SVG Brand Assets

## Overview
Copy the four uploaded SVG logos into the project and update every component that references the old logo files to use the new ones. The white versions display on dark backgrounds (dark theme, dark cards), the black versions on light backgrounds (light theme).

## Asset Mapping

| Uploaded File | Purpose | Destination |
|---|---|---|
| MATCH_HARD_FI_3.svg | Full logo (icon + text), white | src/assets/logo-full-white.svg |
| MATCH_HARD_FI_6.svg | Full logo (icon + text), black | src/assets/logo-full-black.svg |
| MATCH_HARD_FI_1.svg | Icon only, white | src/assets/icon-white.svg |
| MATCH_HARD_FI_5.svg | Icon only, black | src/assets/icon-black.svg |

## Files to Edit

### 1. Copy assets
Copy all four SVGs from `user-uploads://` to `src/assets/`.

### 2. Update `src/components/AppLogo.tsx`
- Import `logo-full-white.svg` and `logo-full-black.svg` instead of the old `.png`/`.webp` files
- Dark theme uses the white logo; light theme uses the black logo
- Keep the same component API (className, alt props)

### 3. Create `src/components/AppIcon.tsx` (new)
- A small component similar to AppLogo but renders the icon-only SVGs
- Dark theme uses white icon; light theme uses black icon
- Used wherever the standalone icon appears

### 4. Update icon usage in pages
- **`src/pages/Fighters.tsx`** and **`src/pages/Events.tsx`**: Replace `icon-gold.webp` import with the new `AppIcon` component or direct SVG import

### 5. Update favicon
- Copy the black icon SVG to `public/icon.svg` and update `index.html` to reference it (replacing the current `/icon.png`)

### 6. No other files need changes
The AppLogo component is already used consistently across Header, Footer, DashboardSidebar, Auth, Onboarding, Feedback, and AuthErrorBoundary — updating the component updates all of them automatically.

### 7. Clean up old assets
Remove the now-unused files from `src/assets/`: `logo-full-dark.png`, `logo-full.webp`, `icon-gold.webp`, `icon.png`, `logo.png`.

## Technical Notes
- SVGs imported via Vite are resolved as URL strings by default, so the `<img src={...}>` pattern in AppLogo continues to work
- The theme detection via `useTheme()` from `next-themes` remains unchanged

