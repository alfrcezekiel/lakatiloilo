# 165 — Add a video to a review

**What to build:** A logged-in traveler can add one video to their review —
MP4, MOV or WebM, up to 50 MB and 60 seconds — and everyone sees it in the
review behind a play button. The video is stored exactly as uploaded, so
its quality stays the same. It goes straight from the browser into the
traveler's own Storage folder (the upload rule change agreed on
2026-11-22), and the backend then attaches it to the review.

**Blocked by:** 162

**Status:** done (the team confirmed it works on the live site, 2026-11-22)

- [x] A numbered SQL file adds video_path to reviews and the review-videos
      bucket with Row Level Security policies: anyone may view; a traveler
      may upload, replace or delete only in their own folder; only MP4, MOV
      or WebM up to 50 MB. The team runs it in the Supabase SQL Editor and
      confirms before the rest is built
- [x] Add a video sits beside Add photos; a too-big, too-long or wrong-type
      file gets "Please choose an MP4, MOV or WebM video up to 50 MB and 60
      seconds." and nothing is uploaded
- [x] A progress bar shows while it uploads; the review's other parts save
      even if the video fails, with a plain message saying so
- [x] The backend refuses a video outside the traveler's own folder, of the
      wrong type or over 50 MB, and refuses another traveler's review
      (API tests: no login 401, bad file or folder 400, not their review or
      no such review 404 — like the other review routes, so nobody learns
      whether someone else's review exists)
- [x] The uploaded file is byte-for-byte the one chosen (same size)
- [x] The video shows with the review's photos: it never plays by itself,
      loads only when pressed (changed 2026-11-22: it now shows its own first
      frame as a thumbnail once near the screen, see ticket 166), plays
      inside the page on a phone, and shows
      "This video can't play in this browser." if it can't play
- [x] The With photos & videos chip includes reviews with a video
- [x] The site's security rules allow video only from our own Supabase
      project; no other video source is allowed
- [x] The frontend rules file records the one exception: the browser's
      Supabase library may upload a review video to the traveler's own
      folder, nothing else
- [x] Works on the live URL, on a laptop and a phone

**Progress (2026-11-22):** built; the team confirmed a real video review on
localhost the same day (every box but the live URL, which waits for the
push).

- supabase/sql/065 (video_path, the review-videos bucket, five Storage
  rules, the own-folder trigger) was run by the team; the read-only check
  supabase/checks/15 answered "No rows returned".
- Backend: ReviewVideosService attaches and removes, as the traveler
  (Storage policies and Row Level Security decide); review answers carry
  video_url (the storage path stays private); deleting a review deletes
  its video file. curl on the running backend: no login 401, a refused
  login 401, a bad id 404.
- API tests (pretend Supabase and transaction, nothing hosted): the new
  routes in the refusal lists (401, 401, 404); another traveler's folder
  and a made-up path 400; MP4, MOV and WebM attach; replacing deletes the
  old file; missing file 404; over 50 MB or wrong type 400 and the file
  deleted; someone else's review 404 with nothing saved; removing works.
  Backend: 69 unit and 218 API tests pass.
- Website: Add a video beside Add photos (checks type, size and, when the
  browser can read it, length at once: "Checking your video…"), a preview
  and Remove video; on save, a progress bar while it uploads straight to
  the traveler's own folder, then the backend attaches it; if that fails
  the review stays saved and the form says why. The review shows the
  video with a play button. The With photos & videos chip counts it.
- Security rules (CSP): media-src now allows our own Supabase project and
  blob: (the preview); without it every video would be blocked. Test added.
- .claude/rules/frontend.md records the one exception (review video
  upload to the traveler's own folder only).
- Real Chrome, with pretend answers (no login, nothing uploaded to the
  hosted project): a 2-second WebM on a review under the real CSP — no CSP
  errors, nothing downloaded before play, preload none, no autoplay,
  plays inside the page, played 1.5 s with no error after pressing play;
  the review shows under With photos & videos.
- Website: types, lint, 143 tests and the build pass.
- **Not checked:** a real upload with the team's login (the team tests on
  localhost), an iPhone MOV on Safari and Chrome, and the live URL.
  Ticket 166 adds changing or removing a saved video in the form.

**Live check (2026-11-22):** the team confirmed this ticket on the live
site the same day it was pushed (commit d2db292), so the "Not checked: the
live URL" lines above are answered.
