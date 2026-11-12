# 125 — Helpful likes: who marked it, and Remove

**What to build:** On the Reviews screen, a review's or reply's "N Helpful" opens the list of travelers who marked it (display names only, never emails), each with Remove. Removing a like lowers the count on the site at once and removes its notification.

**Blocked by:** 124

**Status:** done

- [x] A numbered SQL file lets admins delete any like and adds an admin-only function that answers the display names of the travelers who liked one review or reply; the team has run it
- [x] An admin opens the list for a review and for a reply and removes a like; the count drops on the place page and the notification is gone
- [x] A traveler cannot read who liked something or remove someone else's like (refused by the database)
- [x] No email address appears in any answer
- [x] Works on the live URL

## Progress (2026-11-10)

- `supabase/sql/053-admins-see-and-remove-likes.sql`: admins may delete any review or reply like (new delete policies asking `is_admin()`); `admin_likers(kind, id)` answers user_id, display name and when, newest first, and refuses anyone who is not an admin. The team ran it ("it worked").
- Proved in a rolled-back transaction through the backend's login (nothing kept): a traveler asking `admin_likers` was refused (42501); a traveler removing someone else's like changed 0 rows; the admin listed a review's 4 likers and a reply's 2 (columns only user_id, display_name, created_at; no "@" in any name); a wrong kind was refused; the admin removed a review like and a reply like, and each one's notification went from 1 to 0 (read as the person it was for).
- Backend: `GET /v1/admin/reviews/:id/likes`, `GET /v1/admin/replies/:id/likes` (404 unknown), `DELETE …/likes/:userId` → `{ helpful_count, message }` (404 "That Helpful mark is already gone."). Checked through the compiled code on real data (rolled back): 4 likers, no "@" in the whole answer; Remove → count 3; removing again → 404. curl: 401 without a login and with a fake one.
- Frontend (`AdminLikes.tsx`): on review cards and on every reply, "N Helpful" is a button (aria-expanded) that opens who marked it, newest first, each name linking to their profile, with **Remove**. After Remove the name leaves the list, the count drops at once, a line says so, and the review and reply counts are asked again. "0 Helpful" stays plain text. No pop-up for Remove (it only takes away one mark; Undo comes in ticket 127).
- Checked in the browser with the team's admin login (only opening the lists, nothing removed): 17 review cards with a Helpful button; one opened with "Bella" and Remove; in "Show replies (8)", 4 replies with marks; one opened with "joshua" and "Gehleeyaaa"; no "@" anywhere.
- `npx tsc`, eslint, backend `tsc --noEmit` and `npm run build` pass.

**Change (2026-11-11, team report):** "when I remove the helpful like in admin reviews and reviews replies it doesn't synchronize when I like in traveler's side … it doesn't synchronize on realtime the helpful like in admin." Root cause: the Reviews screen did not listen to Realtime at all yet (that was ticket 126), so a traveler's new mark only showed after a reload. Fixed by building ticket 126 now (see there), and the waits after a change are shorter: 0.2 s instead of 0.5 s on the dashboard and on the place pages. The place pages already listened for likes being added and removed (review_likes, reply_likes; deletions are announced: publication has delete on, checked).

**Fix (2026-11-11, team report with screenshot):** on Iloilo Esplanade, after the admin removed Gehleeyaaa's mark and Gehleeyaaa marked it again, the dashboard listed two names under "1 Helpful" while the place page said 2. Root cause: after Remove, the "N Helpful" button kept its own number ("show 1 while the review says 2"); when the traveler's new mark brought the review's count back to 2, the button took it for the old number and kept showing 1. Fixed in `AdminLikes.tsx`: no kept number; while the list is open the button counts the names in it, closed it shows the review's or reply's own count, both fresh from the backend on every Realtime ring. Checked in the browser (only opening lists): 6 review lists, each button number equal to its names; Iloilo Esplanade "tryyy" now "2 Helpful" with Gehleeyaaa and Fric Dev, the same as the place page.

- Team check (2026-11-11, localhost): removing a like is reflected on the destination's place page by itself, and the notification count goes down with it.
- Team check (2026-11-11, localhost): "ticked the tickets boxes of 125 and 126."
- **Not yet checked:** the live URL.
