

# Plan: Fix Explore Country Filter + Expand CSV Import for Matchmaking Parity

## Overview

Three changes: (1) Replace hardcoded 3-country filter on Explore page with full 48-country searchable dropdown, (2) Expand CSV import to support all matchmaking-relevant fields that `AddFighterDialog` supports, (3) Remove hardcoded `country: "UK"` default from CSV import.

---

## Change 1: Explore Page Country Filter

**File**: `src/pages/Explore.tsx` (lines 426-434)

Replace the hardcoded `<Select>` with 3 countries (UK/USA/AUS) with the `SearchableCountrySelect` component using `includeAll={true}`. This gives the full 48-country list with search filtering, matching every other country dropdown on the platform.

---

## Change 2: CSV Import — Full Field Parity with AddFighterDialog

**File**: `src/components/coach/ImportFightersDialog.tsx`

Currently the CSV only supports 7 columns: `first_name, last_name, email, weight_class, wins, losses, draws`. The `AddFighterDialog` supports 16 fields. The CSV needs to support all fields that affect matchmaking and fighter display.

### New optional CSV columns (all optional, only `first_name` + `last_name` remain required):

| Column | Maps to DB field | Validation |
|--------|-----------------|------------|
| `country` | `country` | Must be valid 48-code enum, no default |
| `discipline` | `discipline` | Free text (Boxing, Muay Thai, MMA, etc.) |
| `style` | `style` | Must be valid fighting_style enum |
| `stance` | `stance` | Orthodox, Southpaw, or Switch |
| `date_of_birth` | `date_of_birth` | ISO format YYYY-MM-DD |
| `height_cm` | `height` | Integer |
| `reach_cm` | `reach` | Integer |
| `walk_around_weight_kg` | `walk_around_weight_kg` | Numeric |
| `amateur_wins` | `amateur_wins` | Integer, default 0 |
| `amateur_losses` | `amateur_losses` | Integer, default 0 |
| `amateur_draws` | `amateur_draws` | Integer, default 0 |

### Specific changes in ImportFightersDialog.tsx:

1. **Expand `ALL_HEADERS`** to include all new columns
2. **Expand `ImportRow` interface** with new fields
3. **Update CSV parsing/mapping** to extract new fields from raw rows
4. **Update validation** — validate `country` against `ALL_COUNTRIES` codes, validate `style` against enum, validate `stance` against allowed values
5. **Remove `country: "UK"` hardcode** (line 207) — use CSV-provided country or omit entirely
6. **Remove `weight_class` fallback to "lightweight"** (line 196/202) — if no weight class provided and action is "create", mark as error requiring weight_class
7. **Update the insert query** to include all new fields
8. **Update preview table** to show country and discipline columns
9. **Update the CSV template display** to show a comprehensive example with new columns
10. **Import `ALL_COUNTRIES`** from `src/lib/countries.ts` for country validation

### Insert query will become:
```typescript
{
  name: `${pr.row.first_name} ${pr.row.last_name}`,
  email: pr.row.email || null,
  weight_class: wc,
  country: pr.row.country || undefined,  // no default
  discipline: pr.row.discipline || null,
  style: validStyle || null,
  stance: pr.row.stance || null,
  date_of_birth: pr.row.date_of_birth || null,
  height: parseInt(pr.row.height_cm) || null,
  reach: parseInt(pr.row.reach_cm) || null,
  walk_around_weight_kg: parseFloat(pr.row.walk_around_weight_kg) || null,
  record_wins: parseInt(pr.row.wins) || 0,
  record_losses: parseInt(pr.row.losses) || 0,
  record_draws: parseInt(pr.row.draws) || 0,
  amateur_wins: parseInt(pr.row.amateur_wins) || 0,
  amateur_losses: parseInt(pr.row.amateur_losses) || 0,
  amateur_draws: parseInt(pr.row.amateur_draws) || 0,
  created_by_coach_id: coachId,
}
```

---

## What stays unchanged

All routing, RLS policies, authentication, matchmaking algorithm, proposal/notification flows, ManageFighterTitles, all other components, existing gym link logic in the CSV import, email-based duplicate detection.

