// "smooth" glides the page; "auto" jumps straight there. Travelers who turn
// on their device's "reduce motion" setting get the jump, so nothing slides.
export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

export function scrollToSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: scrollBehavior() });
  }
}
