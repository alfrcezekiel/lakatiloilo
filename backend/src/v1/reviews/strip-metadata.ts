// Removing hidden metadata from a photo WITHOUT re-compressing it (code
// review 2026-11-23). photo-webp.ts keeps a photo exactly as uploaded when
// WebP would not be smaller, and keeps WebP uploads as they are; before this,
// those copies kept everything a camera writes, a phone's GPS location
// included. These functions cut those parts out of the file and leave the
// picture itself untouched, byte for byte:
//
// - JPG: drops the Exif and XMP sections (APP1: camera, GPS), IPTC (APP13)
//   and comments; keeps the colour profile (APP2), JFIF (APP0) and Adobe's
//   colour note (APP14). A photo taken sideways gets back a tiny Exif with
//   only its orientation, so it still shows upright.
// - PNG: drops eXIf and the text chunks (tEXt, zTXt, iTXt) and the time;
//   keeps the colour chunks.
// - WebP: drops the EXIF and XMP chunks and clears their flags.
//
// Anything it does not understand is returned unchanged; photo-webp.ts
// checks the type from the file's first bytes before calling these.

const JPEG_DROP = new Set([0xe1, 0xed, 0xfe]); // APP1 (Exif, XMP), APP13 (IPTC), COM

export function stripJpeg(buffer: Buffer, orientation: number | undefined): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
  const segments: { marker: number; bytes: Buffer }[] = [];
  let i = 2;
  while (i + 4 <= buffer.length && buffer[i] === 0xff) {
    const marker = buffer[i + 1];
    // Start of scan: the picture itself follows; it is copied untouched.
    if (marker === 0xda) break;
    const length = buffer.readUInt16BE(i + 2);
    if (length < 2 || i + 2 + length > buffer.length) return buffer;
    if (!JPEG_DROP.has(marker)) segments.push({ marker, bytes: buffer.subarray(i, i + 2 + length) });
    i += 2 + length;
  }
  // A photo taken sideways keeps its orientation, alone, right after JFIF
  // (APP0) when there is one, otherwise first.
  if (orientation && orientation > 1) {
    const at = segments[0]?.marker === 0xe0 ? 1 : 0;
    segments.splice(at, 0, { marker: 0xe1, bytes: orientationOnlyExif(orientation) });
  }
  return Buffer.concat([buffer.subarray(0, 2), ...segments.map((s) => s.bytes), buffer.subarray(i)]);
}

// An APP1 Exif segment holding one entry: Orientation (tag 0x0112).
function orientationOnlyExif(orientation: number): Buffer {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF, IFD0 at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, // Orientation, SHORT, count 1
    0x00, orientation & 0xff, 0x00, 0x00, // value
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff]);
  const header = Buffer.from([0xff, 0xe1, 0x00, 0x00]);
  header.writeUInt16BE(body.length + 2, 2);
  return Buffer.concat([header, body]);
}

const PNG_DROP = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);

export function stripPng(buffer: Buffer): Buffer {
  if (buffer.length < 8) return buffer;
  const kept: Buffer[] = [buffer.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(i);
    const end = i + 12 + length;
    if (end > buffer.length) return buffer;
    const type = buffer.toString('latin1', i + 4, i + 8);
    if (!PNG_DROP.has(type)) kept.push(buffer.subarray(i, end));
    i = end;
    if (type === 'IEND') break;
  }
  return Buffer.concat(kept);
}

export function stripWebp(buffer: Buffer): Buffer {
  if (buffer.length < 12 || buffer.toString('latin1', 0, 4) !== 'RIFF' || buffer.toString('latin1', 8, 12) !== 'WEBP') {
    return buffer;
  }
  const kept: Buffer[] = [];
  let i = 12;
  while (i + 8 <= buffer.length) {
    const type = buffer.toString('latin1', i, i + 4);
    const size = buffer.readUInt32LE(i + 4);
    const end = i + 8 + size + (size % 2); // chunks are padded to an even length
    if (end > buffer.length + 1) return buffer;
    const chunk = Buffer.from(buffer.subarray(i, Math.min(end, buffer.length)));
    if (type === 'VP8X') chunk[8] &= ~0x0c; // no Exif (0x08) or XMP (0x04) any more
    if (type !== 'EXIF' && type !== 'XMP ') kept.push(chunk);
    i = end;
  }
  const body = Buffer.concat(kept);
  const header = Buffer.from('RIFF0000WEBP', 'latin1');
  header.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([header, body]);
}
