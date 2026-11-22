# 164 — Photos saved as WebP

**What to build:** Every JPG or PNG photo uploaded — a traveler's review
photos and, in /admin, a new place's photo, its extra photos and a
replaced photo — is saved as a smaller WebP that looks the same. Nothing
changes on screen. The backend gets the image library sharp (agreed by the
team on 2026-11-22).

**Blocked by:** None

**Status:** todo

- [x] A JPG or PNG uploaded through each of the four uploads is stored as
      WebP, with the same width and height
- [x] It looks the same as the original side by side (a PNG with
      see-through parts stays lossless)
- [x] If the WebP would be bigger, the photo is kept as uploaded, so a
      photo never grows; a WebP upload is kept as it is
- [x] The photo's orientation is kept (a phone photo taken upright stays
      upright) and its hidden metadata, including GPS location, is removed
- [x] The stored limit and the message are unchanged (at most 2 MB; "Please
      choose a JPG, PNG or WebP photo up to 2 MB."); a wrong file, or one
      that can't be made to fit, gets that message
- [x] **(change 2026-11-22)** A JPG, PNG or WebP over 2 MB, in the review
      form and in /admin (new place, extra photos, replaced photo), is made
      smaller in the browser first and then uploads, instead of being
      refused
- [x] API tests cover a JPG, a PNG and a WebP for the review and admin
      uploads, with fakes, never the hosted database
- [x] The before and after file sizes of three sample photos are written in
      this ticket's progress note
- [ ] Works on the live URL

**Progress (2026-11-22):** built; the team confirmed it on localhost the
same day, including photos over 2 MB (every box but the live URL, which
waits for the push).

- sharp 0.34.5 added to the backend (agreed by the team). One small
  converter is used by the two upload functions every route goes through
  (review photos; /admin new place, extra photos and replaced photo), so
  no upload can skip it.
- Settings: same width and height; photos at WebP quality 90 with smart
  colour subsampling; a PNG with see-through parts lossless (every visible
  pixel identical; the hidden colour under fully transparent pixels may
  change, which never shows); turned upright from the camera's orientation
  note; only the colour profile kept, GPS and camera details dropped.
- When WebP would not be smaller (a JPG already squeezed hard, for example
  busy detail at JPG quality 30: 19.5 KB as JPG, 59.6 KB as WebP), the
  photo is kept exactly as uploaded, with its metadata, as before this
  ticket. docs/SPEC.md now says so.
- **Sizes measured** (the project's only real image, the 1920 × 1080 splash
  artwork, and the same image saved the way a camera and a phone would;
  same width and height after; PSNR is a quality score, above 40 dB the
  eye can't tell them apart):

  | Uploaded | Before | After (WebP) | Smaller | PSNR |
  |---|---|---|---|---|
  | PNG artwork | 2,196 KB | 150 KB | 93 % | 40.1 dB |
  | Camera JPG (quality 92) | 295 KB | 146 KB | 50 % | 43.5 dB |
  | Phone JPG (quality 85) | 178 KB | 127 KB | 29 % | 44.4 dB |

  About a third of a second per photo. The team should also try three of
  their own phone photos on localhost.
- Tests: 6 converter tests next to the code (JPG smaller with the same
  size in pixels; a sideways phone photo turned upright with its GPS
  dropped; see-through PNG lossless; PNG photo smaller; squeezed JPG kept;
  WebP kept) and 7 upload tests in backend/test/api with the pretend
  Supabase (review and /admin uploads of JPG and PNG saved as .webp in the
  right folder; WebP kept byte for byte; a fake "photo" and a file over
  2 MB refused with the usual message, nothing saved). They test the two
  upload functions every route uses, not the HTTP routes themselves.
- The running backend reloaded with sharp; curl: an upload without a login
  is still refused with 401 "Please log in, then try again."
- Backend: types, lint, 69 unit and 203 API tests pass. Website: types and
  lint pass.
- **Not checked:** a real upload on localhost (needs the team's login) and
  the live URL. Vercel installs sharp's Linux build itself on the next
  backend deploy.

**Change (2026-11-22, team request):** the team could not upload their own
photos, which were over 2 MB. Now a JPG, PNG or WebP over 2 MB is made
smaller **in the browser** before it is uploaded, and the message "Please
choose a JPG, PNG or WebP photo up to 2 MB." stays exactly as it was.

- Why in the browser: every upload passes through Vercel, which refuses
  any request over 4.5 MB, and phone photos are often 3 to 8 MB, so a big
  photo would never reach the backend. The browser's own canvas does it;
  no new library.
- Order of tries: full width and height at WebP quality 0.92 (looks the
  same), then 0.85, then 0.8, then smaller pictures (3840, 3200, 2560 and
  finally 2048 px on the long side), until it is at most 2 MB. Files over
  40 MB are refused at once (a phone could run out of memory), and
  photos over 16 million pixels are drawn at that size (the most an
  iPhone's canvas holds). A file that isn't a JPG, PNG or WebP, can't be
  read, or still doesn't fit gets the usual message.
- Safari versions that can't save WebP from a canvas save a JPG at the same
  quality; the backend then makes it WebP (the converter above).
- The three pickers show "Making your photo smaller…" while it works.
- Checked in real Chrome with the helper itself (on a blank page: our own
  security rules rightly block test scripts on the site):

  | Chosen | Before | After | Size in pixels | Quality |
  |---|---|---|---|---|
  | Splash PNG | 2.14 MB | 205 KB WebP | 1920 × 1080, unchanged | 39.9 dB |
  | Phone-style JPG (heavy grain) | 4.73 MB | 1.40 MB WebP | 4032 × 3024, unchanged | 35.6 dB* |
  | Large PNG | 7.26 MB | 321 KB WebP | 2400 × 1800, unchanged | 41.8 dB |

  All three passed the backend's 2 MB check and were stored as sent.
  *The phone-style test photo has heavy random grain added on purpose;
  grain is what compression smooths, so its score is lower, but a 100 %
  crop side by side looks the same. The phone photo took about 7 seconds
  (three tries) in headless Chrome.
- 8 new unit tests (small photos untouched; quality lowered before size;
  Safari fallback named .jpg; nothing fits → message; wrong type, over
  40 MB, unreadable → message; sizes never enlarge and stay within a
  phone's canvas, which caught a rounding slip that could go 216 pixels
  over).
- Website: types, lint, 134 tests and the build pass.
- **Not checked:** the pickers themselves with the team's login (the team
  checks on localhost), real iPhone Safari, and the live URL.

