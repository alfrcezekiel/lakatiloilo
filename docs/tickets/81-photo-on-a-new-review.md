# 81 — A photo on a new review

**What to build:** The review form gets "Add a photo": one photo (JPG, PNG or WebP, up to 2 MB), with a preview and a Remove button before posting. The photo shows under the review text, and clicking it opens it larger. Deleting a review deletes its photo too. Photos are kept in a new review-photos Supabase Storage bucket, in a folder named after the traveler's user id, and the review remembers where its photo is in a new photo_path column. The upload goes through the backend as the logged-in traveler, so the Storage policies decide.

**Blocked by:** None

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] A numbered SQL file adds photo_path to reviews (the writer may set it, like the stars and comment), creates the review-photos bucket (anyone may view; a traveler may upload, replace or delete only in their own folder; 2 MB and JPG/PNG/WebP only). The team has run it in the Supabase SQL Editor
- [x] POST /v1/reviews accepts one photo and saves it as the logged-in traveler; a photo over 2 MB, or not JPG/PNG/WebP, is refused with "Please choose a JPG, PNG or WebP photo up to 2 MB."
- [x] GET /v1/reviews gives each review its photo's address
- [x] The form shows a preview and a Remove button before posting
- [x] The photo shows under the review to everyone; clicking it opens it larger, and Escape closes it
- [x] Deleting a review deletes its photo from Storage
- [x] Uploading into someone else's folder is refused by Storage, not just hidden in the page
- [x] No service_role or sb_secret_ key is used anywhere
- [x] Works on the live URL

**Progress (2026-11-02):** supabase/sql/027-review-photos.sql (run by the team, "it worked") adds reviews.photo_path (the writer may set or clear it), a check in the reviews trigger that refuses a photo_path outside the writer's own folder, the public review-photos bucket (2 MB, JPG/PNG/WebP only) and four Storage policies: anyone may view; a logged-in traveler may upload, replace or delete only in their own folder ("<user id>/…").

Backend: a ReviewPhotos service checks a photo (at most 2 MB, and really a JPG, PNG or WebP by its first bytes, not its name), uploads it as the logged-in traveler (their login is sent to Storage, so the Storage policies decide; publishable key only) under a new random name in their folder, and deletes photos the same way. POST /v1/reviews accepts JSON as before, or form fields plus one optional "photo" file; the photo is checked before anything is saved, uploaded, and saved with the review; if saving the review fails, the photo is deleted again. Deleting a review deletes its photo. Every review the backend sends now has photo_url (its public address) instead of photo_path. A file over 4 MB is stopped by the upload handling and answered with the same friendly message (PhotoTooLargeFilter). No new package: multer comes with @nestjs/platform-express.

Website: the review form (new reviews) has "Add a photo (optional)": a preview with "Remove photo"; the browser refuses a wrong type or over 2 MB with "Please choose a JPG, PNG or WebP photo up to 2 MB." before uploading. With a photo the review is sent as form data. Under a review, its photo shows (described as "Photo from <name>'s review"); clicking opens it larger in a pop-up (dim background, Close, Escape, or clicking the background).

Checked:
- curl against the local backend: with a photo and no login 401; a text file named .jpg 400 with the photo message; a 3 MB PNG 400 with the photo message; a 5 MB file 400 with the photo message (after the filter); a good PNG with a fake login 401; rating 9 as a form field 400; reviews sent as JSON still work; GET reviews has photo_url and no photo_path.
- The "photo must be yours" check, as a traveler through the backend's own login in a rolled-back transaction: setting my review's photo to a file in my folder worked; to a file in someone else's folder was refused ("That photo is not yours"); clearing it worked; changing someone else's review changed nothing.
- Browser with a pretend login and pretend backend answers (one preview tab; nothing sent to Supabase): the form showed "Add a photo"; a PDF showed the photo message; a PNG showed a preview and Remove; Remove cleared it; posting sent form data with place_type, place_id, rating "4", comment and the photo; the review appeared with its photo; a review's photo opened larger (about twice the size, keyboard inside) and the real Escape key closed it.
- Backend type-check, website type-check, lint and `npm run build` pass. No service_role or sb_secret_ key in the code.

Not checked yet: the Storage policies themselves (the backend's database login has no access to Storage, which is as it should be); a check to paste into the Supabase SQL Editor was given to the team. Also not checked: a real upload with a real login, the photo being removed from Storage when its review is deleted, and the live URL (not pushed yet).

**Storage rules checked by the team (2026-11-02), in the Supabase SQL Editor inside a rolled-back transaction:** the first check script failed at its own step 3 because Supabase blocks plain SQL deletes of Storage files ("Direct deletion from storage tables is not allowed. Use the Storage API instead."), which is a guard on Supabase's side, not a problem with 027. The corrected script passed every line: a traveler can upload into their own folder (PASS 1) but not into another traveler's (PASS 2); a logged-out visitor can see a photo (PASS 3) but cannot upload (PASS 4); the delete and replace policies are for logged-in travelers and check the review-photos bucket and the traveler's own folder (PASS 5 and 6, read back from pg_policies). Deleting through the Storage service is checked by deleting a review with a photo on localhost.

**Checked by the team on localhost (2026-11-02):** with a real login, posting a review with a photo works and the photo opens larger; a PDF or a photo over 2 MB shows the photo message; deleting the review removes its photo from Storage (review-photos, own folder). "Works on the live URL" stays open until ticket 81 is pushed and checked there.

**Confirmed by the team (2026-11-02):** checked on the live URL and marked done.
