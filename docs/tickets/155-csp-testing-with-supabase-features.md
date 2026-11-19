# 155 — CSP testing with Supabase features

**What to build:** Test the CSP report-only mode to ensure it does not block Supabase Realtime (live updates arrive), review photos load from Supabase Storage, place photos load from Supabase Storage and Wikimedia, and Next.js scripts and styles work correctly. Adjust the policy if needed.

**Blocked by:** 154

**Status:** todo

- [ ] Supabase Realtime live updates still arrive (test by adding a review in another tab)
- [ ] Review photos load from Supabase Storage
- [ ] Place photos load from Supabase Storage
- [ ] Wikimedia images load on the home page
- [ ] Next.js scripts and styles work correctly
- [ ] The admin dashboard functions correctly
- [ ] No CSP violations are reported in the browser console for legitimate features
- [ ] If violations occur, the policy is adjusted and tested again
- [ ] Works on the live URL
