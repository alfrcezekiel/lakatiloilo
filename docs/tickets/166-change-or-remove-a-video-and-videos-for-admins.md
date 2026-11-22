# 166 — Change or remove a review's video, and videos for admins

**What to build:** Editing a review can replace or remove its video. The
Lakat Iloilo team sees review videos in the admin Reviews and Reports
screens, so they can moderate them, and hiding, deleting, restoring and
deleting for good treat a video like the review's photos.

**Blocked by:** 165

**Status:** in progress (the team confirmed it on localhost on 2026-11-22, the video thumbnail included; waiting for the live URL check)

- [x] Editing a review shows its video with Remove and Replace; removing
      deletes the file; replacing deletes the old file
- [x] Only the review's writer can change or remove it (API tests: 401,
      and 404 for someone else's review, like the other review routes)
- [x] The admin Reviews and Reports screens show the video, with the same
      play button and no autoplay
- [x] Hiding a review hides its video for travelers; showing it again
      brings it back
- [x] Deleting a review sends its video to the Trash with it; Restore
      brings it back; Delete for good removes the file from Storage
- [x] **(added 2026-11-22)** A review deleted for good after 30 days in the
      Trash (the Trash's automatic cleanup) also has its video file removed
      from Storage
- [ ] Works on the live URL

**Change (2026-11-22, found while building):** the Trash's 30-day cleanup
(062) deletes reviews for good whenever an admin opens the Trash, and
removes their photo files, but knows nothing about videos, so a video
file would stay in Storage for ever. Reviews in the Trash can't be read by
anyone, admins included (060), so the backend can't see their videos
either. supabase/sql/066 adds one read-only, admin-only function listing
the videos of reviews in the Trash; the backend asks it just before and
just after any delete for good and removes the files of the reviews that
are gone. Nothing in 062 changes. Check 15 now also checks 066.

**Progress (2026-11-22):** built; the team confirmed every box on localhost
the same day (all but the live URL, which waits for the push).

- supabase/sql/066 was run by the team and check 15 answered "No rows
  returned".
- Edit form: a saved video shows with Replace video and Remove video.
  Remove marks it ("The video will be removed when you save.", with Keep
  the video to undo); Save removes it (DELETE /v1/reviews/:id/video, from
  165) and deletes the file. Replace uploads the new one on Save and the
  backend deletes the old file. Only the writer can do either (165's API
  tests: 401, 404).
- Admin Reviews and Reports: both answers carry video_url, and both
  screens show the video with the same player (no autoplay, loads only
  on play).
- Hiding, Trash and Restore, checked in the SQL: hiding only sets
  hidden_at, and every traveler read leaves hidden reviews out, so the
  video goes with the review; the Trash and Restore only set and clear
  trashed_at, and a place's reviews get trashed_at too (061), so the video
  stays with its review and comes back on Restore.
- Delete for good and the 30-day cleanup: the Trash's videos (066) are
  listed before and after, in the same transaction, and the files of the
  reviews that are gone are deleted as the admin. 5 API tests: a review
  removes only its own video, a place removes its reviews' videos, a reply
  removes none, the 30-day cleanup removes only the expired ones, nothing
  deleted removes nothing.
- 5 component tests for the picker and player (saved video with Replace
  and Remove; Remove then Keep the video; no autoplay, preload none).
- curl on the running backend: admin Reviews, Reports, Trash and Delete
  for good refuse no login and a fake login (401); public reviews 200.
- Backend: types, lint, 69 unit and 223 API tests. Website: types, lint,
  148 tests and the build pass.
- **Not checked:** the edit form and the admin screens with the team's
  real logins (the team checks on localhost), and the live URL.

**Fix (2026-11-22, team report):** on /admin/reviews (and /admin/reports) a
review's video did not show. Two causes: the edit form screenshot was an
old tab (its "Your review has a video." text was already gone from the
code; a hard refresh shows Replace and Remove), and a real bug — on both
admin screens the video sat inside the "has photos" check, so a review
with a video and no photos showed nothing. Now one shared piece
(AdminReviewMedia) shows the photos and the video each on its own, and a
"Video" tag beside Visible / Hidden and the reports tells the team at a
glance that a review has a video. 4 component tests, the first of which
is the reported case (a video and no photos).

**Change (2026-11-22, team request): a thumbnail on review videos.** The
player shows the video's own first frame instead of a black box. Once the
video is near the screen (within 300 px) the browser loads only its
details and first frame ("#t=0.1", which also makes Safari on an iPhone
draw it); videos further down load nothing; the whole video loads only on
play. No upload or database change. Used in the review, the edit form's
saved video and both admin screens.

- Real Chrome at 1280 and 375 px, with pretend answers: at the top of the
  page 0 video requests; after scrolling to the reviews 1, the first
  frame showed (a teal frame with a yellow square), paused at 0:00, no
  autoplay, no CSP errors.
- Tests: a pretend IntersectionObserver (test/mocks, jsdom has none) that
  fires only when a test scrolls; the player tests check both "far: no
  src, preload none" and "near: #t=0.1, preload metadata". 153 website
  tests pass.

**Code review (2026-11-23):** the lines above that say the video "loads
only on play" or "preload none" describe it before the thumbnail change:
now it loads its first frame once near the screen, and the whole video
only on play. Also fixed: a replaced video no longer keeps an old "can't
play" message; video addresses and file deletes come from one shared place
in the backend; a video that uploaded but could not be attached is deleted
again.
