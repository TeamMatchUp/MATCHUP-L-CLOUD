

# Plan: Expand Country Enum and Searchable Dropdowns Sitewide

## What we're doing

The database `country_code` enum currently only has 3 values (UK, USA, AUS). We need to expand it to 48 countries and update all 12 files that use country dropdowns to use the full list with search filtering.

## Step 1 — Database Migration

Run a migration to add 45 new values to the `country_code` enum:

```sql
ALTER TYPE country_code ADD VALUE IF NOT EXISTS 'IE';
ALTER TYPE country_code ADD VALUE IF NOT EXISTS 'FR';
-- ... all 45 additional codes
```

## Step 2 — Create shared country utility

Create `src/lib/countries.ts` exporting `ALL_COUNTRIES` array (the same 48-entry list currently duplicated in `CreateFighterProfileForm.tsx`) and a `getCountryLabel(code)` helper.

## Step 3 — Update all 12 files using country dropdowns

Replace `Constants.public.Enums.country_code` references with the shared `ALL_COUNTRIES` list and add a search `<Input>` inside each `<SelectContent>` for filtering.

Files to update:
1. `src/components/coach/EditFighterDialog.tsx`
2. `src/components/coach/AddFighterDialog.tsx`
3. `src/components/fighter/CreateFighterProfileForm.tsx` — import from shared util instead of local array
4. `src/components/fighter/EditableProfilePanel.tsx`
5. `src/components/gym/EditGymDialog.tsx`
6. `src/components/gym/AddFighterToGymDialog.tsx`
7. `src/components/organiser/EditEventDialog.tsx`
8. `src/components/organiser/FighterSearchPanel.tsx`
9. `src/components/organiser/FighterSearchDropdown.tsx`
10. `src/pages/organiser/CreateEvent.tsx`
11. `src/pages/RegisterGym.tsx`
12. `src/pages/GymOwnerDashboard.tsx`
13. `src/components/dashboard/DashboardGyms.tsx`

Each dropdown will show `"{code} — {label}"` with a text input at the top for filtering. The `FlagIcon` component already handles all ISO2 codes, so flags will work automatically for all 48 countries.

## Step 4 — Update FlagIcon mapping

Add any missing enum codes to the `COUNTRY_NAME_TO_ISO2` map in `FlagIcon.tsx` (e.g. ensure all 48 codes resolve correctly — most already do via the `resolveCode` fallback).

## What stays unchanged

All routing, RLS policies, authentication, matchmaking, proposals, notifications, existing data (UK/USA/AUS values remain valid).

