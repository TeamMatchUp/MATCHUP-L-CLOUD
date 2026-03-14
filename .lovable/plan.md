

# Implementation Plan — Confirmed

You've confirmed the 14-step mobile-first design system overhaul. I'm currently in plan mode and will now switch to implementation mode to execute all steps in order.

## Execution order

1. **`src/index.css`** — Add `--mu-*` tokens, override shadcn variables, remove `.dark` block, add global component classes
2. **`tailwind.config.ts`** — Extend with `mu` colors, border radii, font sizes
3. **`src/App.tsx` / `ThemeProvider.tsx`** — Force dark-only theme
4. **`src/components/ui/*`** — Remove `dark:` variants, fix hardcoded colors
5. **`src/components/Header.tsx`** — Mobile top nav restyle
6. **`src/components/dashboard/DashboardSidebar.tsx`** — Sidebar/drawer restyle
7. **New: `src/components/BottomTabBar.tsx`** — Bottom tab bar for authenticated pages
8. **`src/pages/Dashboard.tsx`** — Overview page restyle
9. **`src/components/dashboard/DashboardOverview.tsx` + `EventCalendar.tsx`** — Calendar and overview restyle
10. **`src/pages/Events.tsx`** — Events page restyle
11. **`src/pages/EventDetail.tsx`** — Detail page restyle
12. **`src/pages/organiser/CreateEvent.tsx`** — Form restyle
13. **`src/components/landing/HowItWorksSection.tsx`** — How it works restyle
14. **Final audit** — Grep for remaining ALL CAPS, hardcoded colors, `dark:` variants

Each step will be a separate commit with a report of what changed.

