# Fix Share Event on Organiser Manage Event hub

**File:** `src/pages/organiser/EventManager.tsx`

Currently the "Share Event" button (line 309) silently copies the URL to clipboard with no visible feedback — appears broken.

## Changes

1. **Install** `qrcode.react` (no QR lib currently in `package.json`).

2. **Add a `ShareEventModal` component** rendered inside `EventManager`, controlled by new state `const [showShare, setShowShare] = useState(false)`.

3. **Wire the button**: change the `Share Event` `GhostButton`'s `onClick` to `() => setShowShare(true)` (remove the silent clipboard call).

4. **Modal contents** (entirely client-rendered):
   - Header: "Share Event" title + close (X) button.
   - Centred QR code via `<QRCodeSVG value={publicUrl} size={220} bgColor="#111318" fgColor="#e8eaf0" level="M" includeMargin={false} />` where `publicUrl = ${window.location.origin}/events/${id}`.
   - Helper text: "Scan to open the public event page".
   - Read-only input pre-filled with `publicUrl` + a "Copy Link" button next to it. Clicking copies via `navigator.clipboard.writeText`, swaps button label to "Copied!" for ~1.5s, and shows a toast (existing `useToast` is already imported in the file if available — otherwise use sonner which is used elsewhere).

5. **Styling — matches existing modal pattern in this codebase:**
   - Fixed overlay: `background: rgba(0,0,0,0.75)`, `backdropFilter: blur(12px)`, click-to-close.
   - Modal panel: `background: #111318`, `borderRadius: 16`, `width: min(90vw, 960px)`, `maxHeight: 88vh`, `overflowY: auto`, `padding: 28`, **no border**, shadow `0 8px 32px rgba(0,0,0,0.6), 0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)`.
   - QR wrapper: white-on-dark works fine, optionally wrap QR in a `#181c24` rounded inset card (`borderRadius: 12, padding: 16`) for contrast.
   - Title: Bebas Neue, gold accent on second word ("Share Ev<span gold>ent</span>") consistent with the rest of the dashboard.
   - Input/button: gold focus glow on input (no border default); Copy button uses the existing `GoldButton` component already in this file.

## Out of scope
No backend, no routing changes, no changes to the public `/events/:id` page.
