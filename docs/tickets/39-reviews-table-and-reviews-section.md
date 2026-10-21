# 39 — Reviews table and read-only Reviews section

**What to build:** Every destination page (including Foods & Dine-ins) and every accommodation page has a Reviews section below the existing details. It shows the average rating as stars with the number of reviews, or "No reviews yet", and lists the reviews newest first with the reviewer's display name, stars, text and date. Logged-out visitors see a "Log in to write a review" link that comes back to this page after login.

**Blocked by:** 38

**Status:** done

- [x] The `reviews` table exists in Supabase as a numbered SQL file, with the columns from the spec, ratings limited to 1–5, comments limited to 500 characters, and one review per account per place
- [x] Row Level Security is on, with policies: anyone may read; only a logged-in traveler may add, and only with their own account; only the author may edit or delete
- [x] The team has run the SQL in the Supabase dashboard
- [x] Destination and accommodation pages show "No reviews yet" when a place has no reviews
- [x] With a test review added through the dashboard, the page shows the average, the count and the review
- [x] Email addresses never appear on the page
- [x] Logged out: "Log in to write a review" goes to the login page and comes back
- [x] Works on the live URL

**Check notes (2026-10-21):** SQL run by the team. A logged-out attempt to add a review straight through Supabase's API is refused ("permission denied for table reviews"); logged-out reading works. Public review data holds only the display name, stars, comment and dates, never an email. The "Log in to write a review" link goes to /login with this page as ?next=, which returns there after login (tested in ticket 38).
