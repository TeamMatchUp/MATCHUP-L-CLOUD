## What I found

All four uploaders (Account avatar, Fighter photo, Gym/event banner, Gym gallery) call `supabase.storage.from(...).upload(...)`. The storage RLS INSERT policies require the caller to own the target entity — you upload to `${entityId}/…` for gym/event, and to `${auth.uid()}/…` for avatars.

For the currently signed-in test account (`gym_owner`), I could not find any gym with `coach_id = auth.uid()` — only a draft event `london`. So any gym banner or gym gallery upload from that account will correctly be blocked by RLS ("new row violates row-level security"), because no gym in the DB actually belongs to them.

That's the most likely cause for the gym-side failures. The banner/avatar policies themselves are correct. But a couple of gaps are worth closing at the same time:

1. **`gyms` INSERT policy** has no `with_check`, so a coach can currently create a gym with someone else's `coach_id`. Uploads then fail because the row's owner doesn't match auth. We should force `coach_id = auth.uid()` on insert.
2. **Uploader error toasts** currently swallow the real Supabase message on the banner/avatar paths, so it's hard for you (and me) to tell which RLS check tripped. We should surface `error.message` in every red toast.
3. **Avatar upload in Account Settings** doesn't set a `contentType`, so an iPhone HEIC file would silently break in the browser. Force a jpg/png/webp filter on file pick and set an explicit `contentType`.
4. **Event-images bucket** is restricted to `image/jpeg|png|webp`. The banner uploader already sends jpeg (correct). No change needed — just noting so the filter matches.

## Plan

**A. Tighten gym insert (migration)**
- Recreate `gyms` INSERT policy with `WITH CHECK (auth.uid() = coach_id)` so a newly-created gym is always owned by the caller and subsequent uploads to `${gymId}/…` pass RLS.

**B. Surface real upload errors (frontend, no behaviour change on success)**
- `src/components/BannerImageUpload.tsx`: change the "Upload failed" toast to include `error.message`.
- `src/components/fighter/EditableProfilePanel.tsx`: same for the avatar upload toast.
- `src/pages/AccountSettings.tsx`: already surfaces `uploadError.message` — no change.
- `src/components/gym/GymGalleryManager.tsx`: already surfaces `e.message` — no change.

**C. Account Settings avatar hardening**
- Restrict the file input to `image/jpeg,image/png,image/webp`.
- Pass `contentType: file.type` on `.upload(...)`.
- Reject HEIC with a clear toast telling the user to convert to JPG/PNG.

**D. Verification pass (no code changes, just checks)**
- Confirm signed-in user has: at least one `gyms` row where `coach_id = auth.uid()` before testing gym banner/gallery, and at least one `events` row where `organiser_id = auth.uid()` before testing event banner. If a test user has neither, uploads will correctly be blocked — this is expected RLS behaviour, not a bug.
- After the fixes, retry each of the four upload types; the improved toasts will name the exact failing check if any remain.

## Explicitly out of scope

- No changes to storage bucket public/private state (all three buckets are already public with sensible size/mime limits).
- No changes to the existing storage RLS policies (they correctly accept `${entityId}/…` paths via `split_part(name,'/',1)`).
- No re-architecture of the uploaders — same crop/preview/UX flow.

## Files touched

- `supabase/migrations/*` — one migration to replace the `gyms` INSERT policy.
- `src/components/BannerImageUpload.tsx` — include `error.message` in the failure toast.
- `src/components/fighter/EditableProfilePanel.tsx` — include upload error message in the toast.
- `src/pages/AccountSettings.tsx` — restrict avatar accept types, set `contentType`, friendly HEIC message.
