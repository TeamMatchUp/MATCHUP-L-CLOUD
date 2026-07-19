I’ll update the organiser fight-card flow so clicking **Add Fight → Add Suggested Fight** opens the new simple 3-step matching experience instead of the older dense suggestions panel shown in your screenshot.

Plan:
1. **Wire the correct matchmaking route**
   - Fix any stale links that still point to `/matchmaking/:eventId` so they use the active route: `/events/:eventId/matchmaking`.

2. **Replace the modal’s old Suggested Fight panel**
   - In the Add Fight modal, change **Add Suggested Fight** to launch the simplified 3-step matching screen for the current event.
   - Keep the other options unchanged: Add Fight Manually, Add Open Slot, Add Non-Member Fighter.

3. **Keep event context intact**
   - Pass the current event ID through so the 3-step matcher filters and confirms fights against the correct event.
   - Preserve the existing fight-card confirmation behaviour after a suggested match is accepted.

4. **Verify the flow**
   - Open an organiser event fight card.
   - Click **Add Fight**.
   - Click **Add Suggested Fight**.
   - Confirm the first visible screen is **Step 1 of 3** rather than the old slider-heavy Suggested Fights panel.