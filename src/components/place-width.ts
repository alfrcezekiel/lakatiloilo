// How wide the destination and accommodation pages are (team request
// 2026-11-22): the full width of the window, with side padding that grows
// with the screen so nothing touches the edge. Every band of the page (nav,
// photo, facts, tabs, body, loading skeleton) uses it, so their left and
// right edges line up. Its own file so both the server parts
// (PlaceDetail.tsx) and the browser parts (PlaceDetailClient.tsx) can use it.
export const pageWidth = "w-full px-4 sm:px-6 lg:px-10 2xl:px-16";
