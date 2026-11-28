// A place's "About" text on its page (destinations and accommodations).
// Team request 2026-11-28: keep the paragraphs ("stanzas") the admin typed
// on /admin/places, and use the full width of the page's main column
// instead of a narrow 68-character block.
//   - An empty line between two pieces of text starts a new paragraph.
//   - A single line break inside a paragraph stays a line break.
//   - Extra empty lines and spaces at the ends are ignored, so a stray
//     Enter never shows as a big gap.
// The text is shown as text, never as HTML, so nothing typed in the admin
// form can add links or scripts to the page.

export function descriptionParagraphs(description: string): string[] {
  return description
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.replace(/^\n+|\s+$/g, "").replace(/^[ \t]+/, ""))
    .filter((paragraph) => paragraph !== "");
}

export function PlaceDescription({ description }: { description: string }) {
  return (
    <div className="space-y-5 text-lg leading-relaxed text-white/90">
      {descriptionParagraphs(description).map((paragraph, index) => (
        // whitespace-pre-line keeps single line breaks; wrap-break-word
        // stops one very long word from pushing the page sideways.
        <p key={index} className="wrap-break-word whitespace-pre-line">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
