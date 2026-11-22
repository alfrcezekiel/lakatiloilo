# 166 — Change or remove a review's video, and videos for admins

**What to build:** Editing a review can replace or remove its video. The
Lakat Iloilo team sees review videos in the admin Reviews and Reports
screens, so they can moderate them, and hiding, deleting, restoring and
deleting for good treat a video like the review's photos.

**Blocked by:** 165

**Status:** todo

- [ ] Editing a review shows its video with Remove and Replace; removing
      deletes the file; replacing deletes the old file
- [ ] Only the review's writer can change or remove it (API tests: 401,
      403, 404)
- [ ] The admin Reviews and Reports screens show the video, with the same
      play button and no autoplay
- [ ] Hiding a review hides its video for travelers; showing it again
      brings it back
- [ ] Deleting a review sends its video to the Trash with it; Restore
      brings it back; Delete for good removes the file from Storage
- [ ] Works on the live URL
