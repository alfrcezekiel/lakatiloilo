# 34 — Home page loading state with Featured and Trending skeletons

**What to build:** The home page fetches its places from the NestJS backend in the browser, so the requests show in the Network tab. While those requests are in flight, the hero text and chips appear straight away and the Featured and Trending cards show skeleton cards the same size as the real ones. When the places arrive, the real cards take their place with no jump. If the backend can't be reached, the skeletons disappear and the existing "We couldn't load places" message shows.

**Blocked by:** 33

**Status:** done

- [x] The home page loads places in the browser (the server-side fetching experiment is removed)
- [x] The Network tab shows the requests to the NestJS backend for destinations and accommodations
- [x] The hero text and chips appear before the places arrive
- [x] Featured and Trending show skeleton cards while loading, then the real cards with no layout jump
- [x] With the backend unreachable, the skeletons disappear and the error message shows
- [ ] Works on the live URL
