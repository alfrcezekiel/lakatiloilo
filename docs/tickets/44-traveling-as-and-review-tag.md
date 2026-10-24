# 44 — "I'm traveling as" at sign-up, tag on reviews

**What to build:** At sign-up, the traveler picks one of Local Ilonggo, Visitor from PH or Foreign tourist. It is saved on their account. Each review they write shows it as a small tag after their name, for example "Juan · Local Ilonggo".

**Blocked by:** None

**Status:** in progress (022 ran in Supabase on 2026-10-23; tested by the team on localhost; not pushed yet)

- [x] Sign up mode shows the three "I'm traveling as" choices; signing up without picking one shows a clear message
- [ ] The choice is saved on the Supabase account, next to the display name
- [x] The reviews table gains a traveler_type column ("local", "domestic", "foreign" or empty), filled in by the database from the account, never from the browser. The change is a new numbered file in the SQL folder
- [ ] Reviews show the tag after the reviewer's name; reviews from older accounts without a traveler type show no tag
- [x] Row Level Security on reviews is unchanged and still on
- [ ] Works on the live URL
