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
  // Line by line: a line that is empty or only spaces ends a paragraph
  // (code review 2026-11-28: splitting on "\n\n" alone let a line of only
  // spaces leave a gap at the top of the next paragraph).
  const paragraphs: string[] = [];
  let lines: string[] = [];
  for (const line of description.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "") {
      if (lines.length > 0) paragraphs.push(lines.join("\n"));
      lines = [];
    } else {
      lines.push(line.trim());
    }
  }
  if (lines.length > 0) paragraphs.push(lines.join("\n"));
  return paragraphs;
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
